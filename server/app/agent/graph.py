"""LangGraph agent for TermSheet."""

from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app.core.config import get_settings

# Investor-specific prompts
from prompt.garry.system import SYSTEM_PROMPT as GARRY_PROMPT
from prompt.marc.system import SYSTEM_PROMPT as MARC_PROMPT
from prompt.chamath.system import SYSTEM_PROMPT as CHAMATH_PROMPT

INVESTOR_PROMPTS = {
    "garry-tan": GARRY_PROMPT,
    "marc-andreessen": MARC_PROMPT,
    "chamath-palihapitiya": CHAMATH_PROMPT,
}

FALLBACK_PROMPT = """You are the TermSheet AI assistant.
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
            model="grok-4-1-fast-reasoning",
            xai_api_key=settings.xai_api_key,
            streaming=True,
        )

    # default: openai
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        streaming=True,
    )


def get_system_prompt(shark_id: str) -> str:
    return INVESTOR_PROMPTS.get(shark_id, FALLBACK_PROMPT)


def create_graph():
    llm = _build_llm()

    def chatbot(state: AgentState) -> AgentState:
        response = llm.invoke(state["messages"])
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("chatbot", chatbot)
    graph.add_edge(START, "chatbot")
    graph.add_edge("chatbot", END)

    return graph.compile()
