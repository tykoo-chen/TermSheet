"""LangGraph agent for TermSheet."""

from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app.core.config import get_settings

SYSTEM_PROMPT = """You are the TermSheet AI assistant.
You help investors discover startups and help founders craft pitches.
You can answer questions about term sheets, investment stages, and the fundraising process.
Be concise and helpful."""


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


def _build_llm():
    """Build the LLM based on the configured provider."""
    settings = get_settings()
    provider = settings.llm_provider.lower()

    if provider == "xai":
        from langchain_xai import ChatXAI

        return ChatXAI(
            model="grok-3-latest",
            xai_api_key=settings.xai_api_key,
        )

    # default: openai
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
    )


def create_graph():
    llm = _build_llm()

    def chatbot(state: AgentState) -> AgentState:
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
        response = llm.invoke(messages)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("chatbot", chatbot)
    graph.add_edge(START, "chatbot")
    graph.add_edge("chatbot", END)

    return graph.compile()
