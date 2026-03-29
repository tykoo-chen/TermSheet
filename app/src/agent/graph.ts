/**
 * LangGraph agent for TermSheet — Node.js port of server/app/agent/graph.py
 *
 * Architecture: START → chatbot → END
 * Direct 1:1 port of the Python LangGraph agent.
 */

import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";

// ── LLM builder ─────────────────────────────────────────────────────────────

function buildLLM() {
  const provider = (process.env.LLM_PROVIDER || "xai").toLowerCase();

  if (provider === "xai") {
    return new ChatOpenAI({
      model: process.env.LLM_MODEL || "grok-3-mini-fast",
      apiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: "https://api.x.ai/v1" },
      temperature: 0.8,
      maxTokens: 500,
      streaming: true,
    });
  }

  // Default: OpenAI
  return new ChatOpenAI({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.8,
    maxTokens: 500,
    streaming: true,
  });
}

// ── Graph construction ──────────────────────────────────────────────────────

export function createGraph() {
  const llm = buildLLM();

  async function chatbot(state: typeof MessagesAnnotation.State) {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("chatbot", chatbot)
    .addEdge(START, "chatbot")
    .addEdge("chatbot", END);

  return graph.compile();
}

// Singleton graph instance (reused across requests)
let _graph: ReturnType<typeof createGraph> | null = null;

export function getGraph() {
  if (!_graph) {
    _graph = createGraph();
  }
  return _graph;
}
