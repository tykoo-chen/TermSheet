import uuid

from fastapi import APIRouter, Depends
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.agent.graph import create_graph, get_system_prompt
from app.core.auth import get_current_user
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter()

graph = create_graph()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's info from Supabase JWT."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    # Build system prompt for the specific investor
    system_prompt = get_system_prompt(request.shark_id)

    # Convert frontend messages to LangChain format
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
    return ChatResponse(reply=reply, thread_id=thread_id)
