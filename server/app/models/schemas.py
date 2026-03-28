from pydantic import BaseModel


class ChatRequest(BaseModel):
    shark_id: str
    messages: list[dict]  # [{"role": "user"|"assistant", "content": "..."}]
    session_id: str | None = None
    thread_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    thread_id: str


class RateLimitStatus(BaseModel):
    allowed: bool
    blocked: bool = False
    rounds_used: int = 0
    rounds_max: int = 8
    time_left: int = 300  # seconds remaining in session
    session_id: str | None = None


class StartSessionRequest(BaseModel):
    shark_id: str


class StartSessionResponse(BaseModel):
    session_id: str
    time_left: int
    rounds_used: int
    rounds_max: int


class MessageOut(BaseModel):
    role: str
    content: str
