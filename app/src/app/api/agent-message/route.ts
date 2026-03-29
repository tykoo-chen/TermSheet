import { NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY;

// VC-specific pitch angle guidance for the agent
const VC_ANGLES: Record<string, string> = {
  "garry-tan": `Garry Tan is YC's CEO. He loves technical founders who build, hates all-talk founders.
He responds to: concrete traction numbers, technical depth, "why now" timing, AI-native products.
He is turned off by: vague market claims, "we just need marketing", no customer conversations.
Pitch angle: Lead with what you've built, show you've talked to users, emphasize why this moment is unique for this idea.`,

  "marc-andreessen": `Marc Andreessen is a16z's co-founder. Extreme techno-optimist, hates "safetyism".
He responds to: massive market disruption, bold contrarian takes, deep technical moats, "software eating X" narratives.
He is turned off by: incremental improvements, anything that sounds timid or risk-averse.
Pitch angle: Frame this as a once-in-a-generation paradigm shift. Be bold. Reference history of software disruption.`,

  "chamath-palihapitiya": `Chamath is Social Capital's founder. Data-driven, blunt, contrarian VC critic.
He responds to: unit economics clarity, structural problems being solved, compounding value, immigrant hustle.
He is turned off by: hype without numbers, "Uber for X" analogies, no path to profitability.
Pitch angle: Lead with data. Show you understand the unit economics cold. Frame as fixing a broken structural problem.`,
};

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ message: "I'm ready to pitch. Tell me about yourself." });
  }

  const { sharkId, startupInfo, conversationHistory, roundNumber } = await req.json();

  const vcAngle = VC_ANGLES[sharkId] || "Be compelling and specific.";

  const isOpening = roundNumber === 0 || conversationHistory.length === 0;

  const systemPrompt = `You are an AI pitch agent for a startup founder. Your job is to craft the perfect pitch message to a specific VC investor.

STARTUP INFO:
${startupInfo}

VC PROFILE & HOW TO PITCH THEM:
${vcAngle}

RULES:
- Write ONLY the founder's next message. Do not include any preamble, labels, or explanations.
- Be specific to THIS VC's known interests. Do not send generic pitches.
- Keep it under 150 words.
- ${isOpening ? "This is the opening message. Introduce the startup compellingly." : "This is a follow-up. React to the VC's last response and advance the pitch."}
- Sound like a confident, prepared founder — not like an AI.
- Never mention you are an AI agent.`;

  const messages = isOpening
    ? [{ role: "user" as const, content: "Write the opening pitch message for this VC." }]
    : [
        ...conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: "Based on the VC's last response, write the founder's next reply to advance the pitch.",
        },
      ];

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 250,
      }),
    });

    const data = await res.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "Tell me more about your product.";
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ message: "We're solving a real problem with strong traction. Let me show you the numbers." });
  }
}
