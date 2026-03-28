import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, SystemMessage
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.graph import create_graph, get_system_prompt
from app.core.auth import get_current_user
from app.core.database import get_db, async_session
from app.models.enums import MessageRole, SessionStatus
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    MessageOut,
    RateLimitStatus,
    StartSessionRequest,
    StartSessionResponse,
)
from app.models.tables import Message, Session

router = APIRouter()

graph = create_graph()

# ── Rate-limit constants ────────────────────────────────────────────────────
MAX_ROUNDS = 8          # real user messages per session
MAX_INPUT_TOKENS = 500
SESSION_SECONDS = 5 * 60  # 5 minutes


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~1 token per 4 chars (matches frontend)."""
    return -(-len(text) // 4)


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
    """Count user messages in a session."""
    stmt = (
        select(func.count())
        .select_from(Message)
        .where(
            Message.session_id == session_id,
            Message.role == MessageRole.USER,
        )
    )
    result = await db.execute(stmt)
    return result.scalar() or 0


def _session_time_left(session: Session) -> int:
    """Seconds remaining in the session. 0 means expired."""
    now = datetime.now(timezone.utc)
    created = session.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return max(int(SESSION_SECONDS - (now - created).total_seconds()), 0)


def _session_expired(session: Session) -> bool:
    return _session_time_left(session) == 0


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
    time_left = _session_time_left(session)

    ended = (
        session.status != SessionStatus.IN_PROGRESS
        or rounds_used >= MAX_ROUNDS
        or time_left == 0
    )

    # Persist PENDING so DB status stays consistent with computed state
    if ended and session.status == SessionStatus.IN_PROGRESS:
        session.status = SessionStatus.PENDING
        await db.commit()

    return RateLimitStatus(
        allowed=not ended,
        blocked=ended,
        rounds_used=rounds_used,
        rounds_max=MAX_ROUNDS,
        time_left=time_left,
        session_id=str(session.id),
    )


# ── Session start ─────────────────────────────────────────────────────────
@router.post("/session/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create (or resume) a session eagerly when the user clicks Start Pitch."""
    user_id = user["sub"]
    session = await _resolve_session(db, user_id, request.shark_id, None)

    if session is not None:
        rounds_used = await _count_user_rounds(db, session.id)
        time_left = _session_time_left(session)

        if session.status != SessionStatus.IN_PROGRESS or time_left == 0 or rounds_used >= MAX_ROUNDS:
            if session.status == SessionStatus.IN_PROGRESS:
                session.status = SessionStatus.PENDING
                await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Already pitched this investor this week.",
            )

        return StartSessionResponse(
            session_id=str(session.id),
            time_left=time_left,
            rounds_used=rounds_used,
            rounds_max=MAX_ROUNDS,
        )

    # First pitch this week → create session now (not on first message)
    session = Session(
        user_id=uuid.UUID(user_id),
        investor_id=request.shark_id,
        status=SessionStatus.IN_PROGRESS,
    )
    db.add(session)
    try:
        await db.commit()
    except IntegrityError:
        # Race condition: another request already created a session — use it
        await db.rollback()
        session = await _resolve_session(db, user_id, request.shark_id, None)
        if session is None:
            raise HTTPException(status_code=409, detail="Please retry.")
        return StartSessionResponse(
            session_id=str(session.id),
            time_left=_session_time_left(session),
            rounds_used=await _count_user_rounds(db, session.id),
            rounds_max=MAX_ROUNDS,
        )

    return StartSessionResponse(
        session_id=str(session.id),
        time_left=SESSION_SECONDS,
        rounds_used=0,
        rounds_max=MAX_ROUNDS,
    )


# ── Session messages ──────────────────────────────────────────────────────
@router.get("/session/{session_id}/messages", response_model=list[MessageOut])
async def get_session_messages(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the message history for a session (for frontend restoration)."""
    user_id = user["sub"]
    stmt = select(Session).where(
        Session.id == uuid.UUID(session_id),
        Session.user_id == uuid.UUID(user_id),
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    stmt = (
        select(Message)
        .where(Message.session_id == session.id)
        .order_by(Message.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return [
        MessageOut(role=msg.role.value, content=msg.content)
        for msg in messages
    ]


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

    # ── Resolve session (must exist via /session/start) ─────────────────
    session = await _resolve_session(
        db, user_id, request.shark_id, request.session_id
    )

    if session is None:
        raise HTTPException(status_code=404, detail="No active session. Call /session/start first.")

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


# ── Streaming Chat (SSE) ──────────────────────────────────────────────────
@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE endpoint that streams LLM tokens as they are generated."""
    user_id = user["sub"]

    # ── Token limit ──────────────────────────────────────────────────────
    user_messages = [m for m in request.messages if m["role"] == "user"]
    if user_messages:
        latest_text = user_messages[-1]["content"]
        if _estimate_tokens(latest_text) > MAX_INPUT_TOKENS:
            raise HTTPException(
                status_code=422,
                detail=f"Message exceeds {MAX_INPUT_TOKENS} token limit.",
            )

    # ── Resolve session (must exist via /session/start) ─────────────────
    session = await _resolve_session(
        db, user_id, request.shark_id, request.session_id
    )

    if session is None:
        raise HTTPException(status_code=404, detail="No active session. Call /session/start first.")

    rounds_used = await _count_user_rounds(db, session.id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(status_code=429, detail="Session ended.")
    if rounds_used >= MAX_ROUNDS:
        session.status = SessionStatus.PENDING
        await db.commit()
        raise HTTPException(status_code=429, detail="Round limit reached.")
    if _session_expired(session):
        session.status = SessionStatus.PENDING
        await db.commit()
        raise HTTPException(status_code=429, detail="Session time expired.")

    # ── Persist user message ─────────────────────────────────────────────
    if user_messages:
        db.add(
            Message(
                session_id=session.id,
                role=MessageRole.USER,
                content=user_messages[-1]["content"],
            )
        )
    await db.commit()

    # Capture IDs before the generator (db session will be closed)
    session_id_str = str(session.id)
    thread_id = request.thread_id or str(uuid.uuid4())

    # ── Build LangChain messages ─────────────────────────────────────────
    system_prompt = get_system_prompt(request.shark_id)
    lc_messages = [SystemMessage(content=system_prompt)]
    for msg in request.messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        else:
            lc_messages.append(AIMessage(content=msg["content"]))

    async def event_generator():
        full_reply = []
        config = {"configurable": {"thread_id": thread_id}}

        async for chunk, metadata in graph.astream(
            {"messages": lc_messages},
            config=config,
            stream_mode="messages",
        ):
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                full_reply.append(chunk.content)
                yield f"data: {json.dumps({'token': chunk.content})}\n\n"

        # Send final event with metadata
        reply = "".join(full_reply)
        yield f"data: {json.dumps({'done': True, 'session_id': session_id_str, 'thread_id': thread_id})}\n\n"

        # Persist assistant reply (use a new db session since the original is closed)
        async with async_session() as db2:
            db2.add(
                Message(
                    session_id=uuid.UUID(session_id_str),
                    role=MessageRole.ASSISTANT,
                    content=reply,
                )
            )
            await db2.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
