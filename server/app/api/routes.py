import uuid

from fastapi import APIRouter
from langchain_core.messages import HumanMessage

from app.agent.graph import create_graph
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter()

graph = create_graph()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    result = graph.invoke(
        {"messages": [HumanMessage(content=request.message)]},
        config=config,
    )

    reply = result["messages"][-1].content
    return ChatResponse(reply=reply, thread_id=thread_id)
