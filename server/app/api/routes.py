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

# ── Rate-limit constants (mirrored from frontend) ──────────────────────────
MAX_ROUNDS = 8
MAX_INPUT_TOKENS = 500
SESSION_SECONDS = 5 * 60  # 5 minutes


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~1 token per 3.5 chars."""
    return -(-len(text) // 3)  # ceil division by ~3.5 approximated as 3


def _week_start() -> datetime:
    """Return the start of the current ISO week (Monday 00:00 UTC)."""
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


async def _get_weekly_session(
    db: AsyncSession, user_id: str, shark_id: str
) -> Session | None:
    """Find an existing session for this user+investor created this week."""
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
    """Check if the user can pitch this investor (weekly limit)."""
    user_id = user["sub"]
    session = await _get_weekly_session(db, user_id, shark_id)

    if session is None:
        return RateLimitStatus(allowed=True, rounds_used=0, rounds_max=MAX_ROUNDS)

    # Count user messages in this session
    stmt = (
        select(func.count())
        .select_from(Message)
        .where(
            Message.session_id == session.id,
            Message.role == MessageRole.USER,
        )
    )
    result = await db.execute(stmt)
    rounds_used = result.scalar() or 0

    session_ended = (
        session.status != SessionStatus.IN_PROGRESS
        or rounds_used >= MAX_ROUNDS
        or (datetime.now(timezone.utc) - session.created_at).total_seconds()
        > SESSION_SECONDS
    )

    return RateLimitStatus(
        allowed=not session_ended or rounds_used == 0,
        blocked=session_ended and rounds_used > 0,
        rounds_used=rounds_used,
        rounds_max=MAX_ROUNDS,
        session_id=str(session.id) if session else None,
    )


# ── Chat ────────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["sub"]

    # ── Token limit check ───────────────────────────────────────────────
    user_messages = [m for m in request.messages if m["role"] == "user"]
    if user_messages:
        latest_user_msg = user_messages[-1]["content"]
        if _estimate_tokens(latest_user_msg) > MAX_INPUT_TOKENS:
            raise HTTPException(
                status_code=422,
                detail=f"Message exceeds {MAX_INPUT_TOKENS} token limit.",
            )

    # ── Weekly rate limit ───────────────────────────────────────────────
    session = await _get_weekly_session(db, user_id, request.shark_id)

    if session is not None:
        # Count existing user rounds
        stmt = (
            select(func.count())
            .select_from(Message)
            .where(
                Message.session_id == session.id,
                Message.role == MessageRole.USER,
            )
        )
        result = await db.execute(stmt)
        rounds_used = result.scalar() or 0

        # Check if session has expired
        elapsed = (
            datetime.now(timezone.utc) - session.created_at
        ).total_seconds()

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
        if elapsed > SESSION_SECONDS:
            session.status = SessionStatus.PENDING
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Session time expired (5 min). Come back next week.",
            )
    else:
        # First message this week → create session
        session = Session(
            user_id=uuid.UUID(user_id),
            investor_id=request.shark_id,
            status=SessionStatus.IN_PROGRESS,
        )
        db.add(session)
        await db.flush()  # get session.id

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

    return ChatResponse(reply=reply, thread_id=thread_id)
