import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.graph import create_graph, get_system_prompt
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.enums import MessageRole, SessionStatus
from app.models.schemas import ChatRequest, ChatResponse, RateLimitStatus
from app.models.tables import Message, Session

router = APIRouter()

graph = create_graph()

# ── Rate-limit constants ────────────────────────────────────────────────────
MAX_ROUNDS = 8          # real user messages (excludes bootstrap prompt)
MAX_INPUT_TOKENS = 500
SESSION_SECONDS = 5 * 60  # 5 minutes


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~1 token per 3.5 chars."""
    return -(-len(text) // 3)


def _week_start() -> datetime:
    """Return the start of the current ISO week (Monday 00:00 UTC)."""
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


async def _resolve_session(
    db: AsyncSession, user_id: str, shark_id: str, session_id: str | None
) -> Session | None:
    """Look up session by ID first, then fall back to weekly lookup."""
    if session_id:
        stmt = select(Session).where(
            Session.id == uuid.UUID(session_id),
            Session.user_id == uuid.UUID(user_id),  # ensure ownership
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            return session

    # Fall back: find this week's session for the user + investor
    stmt = (
        select(Session)
        .where(
            Session.user_id == uuid.UUID(user_id),
            Session.investor_id == shark_id,
            Session.created_at >= _week_start(),
        )
        .order_by(Session.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _count_user_rounds(db: AsyncSession, session_id: uuid.UUID) -> int:
    """Count real user messages in a session (excludes the bootstrap prompt)."""
    stmt = (
        select(func.count())
        .select_from(Message)
        .where(
            Message.session_id == session_id,
            Message.role == MessageRole.USER,
        )
    )
    result = await db.execute(stmt)
    total = result.scalar() or 0
    # The first "user" message is the bootstrap prompt (investor intro request),
    # not a real user round — subtract 1, floor at 0.
    return max(total - 1, 0)


def _session_expired(session: Session) -> bool:
    now = datetime.now(timezone.utc)
    created = session.created_at
    # Handle naive datetimes (SQLite dev) by assuming UTC
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return (now - created).total_seconds() > SESSION_SECONDS


# ── Health ──────────────────────────────────────────────────────────────────
@router.get("/health")
async def health():
    return {"status": "ok"}


# ── Me ──────────────────────────────────────────────────────────────────────
@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's info from Supabase JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


# ── Rate-limit check ───────────────────────────────────────────────────────
@router.get("/rate-limit/{shark_id}", response_model=RateLimitStatus)
async def check_rate_limit(
    shark_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if the user can pitch this investor this week."""
    user_id = user["sub"]
    session = await _resolve_session(db, user_id, shark_id, None)

    if session is None:
        return RateLimitStatus(allowed=True, rounds_used=0, rounds_max=MAX_ROUNDS)

    rounds_used = await _count_user_rounds(db, session.id)

    # Compute time_left from session created_at
    created = session.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - created).total_seconds()
    time_left = max(int(SESSION_SECONDS - elapsed), 0)

    ended = (
        session.status != SessionStatus.IN_PROGRESS
        or rounds_used >= MAX_ROUNDS
        or time_left == 0
    )

    return RateLimitStatus(
        allowed=not ended,
        blocked=ended,
        rounds_used=rounds_used,
        rounds_max=MAX_ROUNDS,
        time_left=time_left,
        session_id=str(session.id),
    )


# ── Chat ────────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["sub"]

    # ── Token limit on the latest user message ──────────────────────────
    user_messages = [m for m in request.messages if m["role"] == "user"]
    if user_messages:
        latest_text = user_messages[-1]["content"]
        if _estimate_tokens(latest_text) > MAX_INPUT_TOKENS:
            raise HTTPException(
                status_code=422,
                detail=f"Message exceeds {MAX_INPUT_TOKENS} token limit.",
            )

    # ── Resolve or create session ───────────────────────────────────────
    is_new_session = False
    session = await _resolve_session(
        db, user_id, request.shark_id, request.session_id
    )

    if session is not None:
        # Enforce limits on existing session
        rounds_used = await _count_user_rounds(db, session.id)

        if session.status != SessionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=429,
                detail="This pitch session has ended. Come back next week.",
            )
        if rounds_used >= MAX_ROUNDS:
            session.status = SessionStatus.PENDING
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail=f"Round limit reached ({MAX_ROUNDS}). Session ended.",
            )
        if _session_expired(session):
            session.status = SessionStatus.PENDING
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Session time expired (5 min). Come back next week.",
            )
    else:
        # First pitch this week → create session
        session = Session(
            user_id=uuid.UUID(user_id),
            investor_id=request.shark_id,
            status=SessionStatus.IN_PROGRESS,
        )
        db.add(session)
        await db.flush()
        is_new_session = True

    # ── Persist the latest user message ─────────────────────────────────
    if user_messages:
        db.add(
            Message(
                session_id=session.id,
                role=MessageRole.USER,
                content=user_messages[-1]["content"],
            )
        )

    # ── Invoke LLM ──────────────────────────────────────────────────────
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    system_prompt = get_system_prompt(request.shark_id)
    lc_messages = [SystemMessage(content=system_prompt)]
    for msg in request.messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        else:
            lc_messages.append(AIMessage(content=msg["content"]))

    result = graph.invoke(
        {"messages": lc_messages},
        config=config,
    )
    reply = result["messages"][-1].content

    # ── Persist assistant reply ─────────────────────────────────────────
    db.add(
        Message(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=reply,
        )
    )
    await db.commit()

    return ChatResponse(
        reply=reply,
        session_id=str(session.id),
        thread_id=thread_id,
    )
