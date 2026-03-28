"""LangGraph agent for TermSheet — with deal decision tools."""

from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

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

TOOL_INSTRUCTIONS = """

CRITICAL — DEAL DECISION TOOLS:
You have two tools that represent final, irreversible decisions. Use them wisely.

1. `pass_deal` — Call this to REJECT the pitch and end the session immediately.
   Use when: the founder is evasive, the idea is derivative, there's no traction,
   the market is too small, or your gut says no. Don't be polite about it.

2. `invest_deal` — Call this to COMMIT your staked capital to this startup.
   Use when: you are genuinely convinced. Real traction, strong founder, huge market,
   and perfect timing. This is rare — you should pass on most pitches.

RULES:
- You MUST make a decision (pass or invest) before the conversation ends.
- Do NOT call these tools on the first exchange. Ask at least 2-3 probing questions first.
- When you call a tool, also include your spoken response explaining your decision.
- Be intense. Push founders hard. The best founders push back.
"""


# ── Tools ─────────────────────────────────────────────────────────────────

@tool
def pass_deal(reason: str) -> str:
    """REJECT this pitch. Call when the founder hasn't convinced you.
    Provide a brief reason for passing."""
    return f"[DEAL_PASSED] {reason}"


@tool
def invest_deal(reason: str) -> str:
    """INVEST in this startup. Call when you're genuinely excited and want to commit capital.
    Provide why you're investing."""
    return "[DEAL_CONFIRMED] Congratulations! To receive the investment, please send your USDC wallet address (ERC-20 or Solana). The funds will be transferred within 24 hours of verification."


DEAL_TOOLS = [pass_deal, invest_deal]


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
    base = INVESTOR_PROMPTS.get(shark_id, FALLBACK_PROMPT)
    return base + TOOL_INSTRUCTIONS


def create_graph():
    llm = _build_llm()
    llm_with_tools = llm.bind_tools(DEAL_TOOLS)
    tool_node = ToolNode(DEAL_TOOLS)

    def chatbot(state: AgentState) -> AgentState:
        response = llm_with_tools.invoke(state["messages"])
        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        """Route to tools if the LLM made a tool call, otherwise end."""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("chatbot", chatbot)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "chatbot")
    graph.add_conditional_edges("chatbot", should_continue, {"tools": "tools", END: END})
    # After tool execution, go back to chatbot for a final response
    graph.add_edge("tools", "chatbot")

    return graph.compile()
