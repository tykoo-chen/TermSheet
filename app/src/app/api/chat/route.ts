import { NextRequest, NextResponse } from "next/server";
import { sharks } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    const { messages, sharkId } = await req.json();

    const shark = sharks.find((s) => s.id === sharkId);
    if (!shark) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Build system prompt from investor personality
    const systemPrompt = `${shark.personality}

CONTEXT:
- You are on a platform called TermSheet where you have staked $${shark.stakedAmount.toLocaleString()} of real capital.
- A founder is pitching you right now through a chat interface.
- If you like the pitch, the money goes to the founder. If not, you keep it.
- Stay in character at all times. Be concise — respond in 2-4 sentences max.
- Ask pointed follow-up questions based on your personality.
- Reference your real quotes and beliefs naturally when relevant.
- Never break character or say you are an AI.`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok API error:", response.status, errText);
      return NextResponse.json(
        { error: `Grok API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "...";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
