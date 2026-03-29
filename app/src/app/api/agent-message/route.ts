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

  "peter-thiel": `Peter Thiel is Founders Fund's co-founder. Contrarian monopolist who asks "what important truth do very few people agree with you on?"
He responds to: non-consensus secrets, monopoly potential, 10x differentiation, civilizational-scale ambition.
He is turned off by: competitive market framing, incremental improvements, "disruption" language, founders who think like the herd.
Pitch angle: Open with your secret — the non-obvious insight that makes this possible. Frame the company as a future monopoly. Never mention "competition" positively.`,

  "david-sacks": `David Sacks is Craft Ventures founder and Trump's AI/Crypto Czar. Operational, political, pro-enterprise.
He responds to: product-market fit evidence, enterprise GTM clarity, crypto/AI as geopolitical tools, capital efficiency.
He is turned off by: consumer apps without monetization, impact-first framing, regulatory naivety.
Pitch angle: Lead with PMF evidence and enterprise use case. Connect to US competitiveness in AI/crypto. Show capital efficiency.`,

  "sam-altman": `Sam Altman is OpenAI's CEO. He thinks about AGI daily and evaluates everything through that lens.
He responds to: AGI-relevant companies, AI-native architecture, world-changing ambition, exceptional founder quality.
He is turned off by: ChatGPT wrappers, small thinking, founders who haven't thought about AGI timelines.
Pitch angle: Start with how this company will matter in a post-AGI world. Show AI is core to the architecture, not bolted on. Think at civilizational scale.`,

  "naval-ravikant": `Naval Ravikant is AngelList's co-founder and philosopher-VC. Thinks in specific knowledge and leverage.
He responds to: specific knowledge (unteachable expertise), zero marginal cost leverage (code/networks), compounding dynamics.
He is turned off by: trend-following without genuine expertise, high-marginal-cost businesses, hustle theater.
Pitch angle: Lead with your specific knowledge — why only you can build this. Show the leverage mechanics. Frame as compounding assets.`,

  "balaji-srinivasan": `Balaji Srinivasan is the Network State author and ex-a16z GP. Bitcoin maximalist, civilizational thinker.
He responds to: genuine decentralization need, exit from legacy institutions, crypto-native thinking, technical depth.
He is turned off by: fake decentralization ("blockchain for X"), regulatory dependency, consensus-following founders.
Pitch angle: Show why decentralization is genuinely necessary for this to work. Connect to the exit from legacy systems thesis. Demonstrate technical understanding.`,

  "ben-horowitz": `Ben Horowitz is a16z's co-founder. Operator, hip-hop devotee, author of The Hard Thing About Hard Things.
He responds to: wartime CEO qualities, cultural clarity, operational scars and resilience, technical leadership.
He is turned off by: founders without hard experience, "peacetime mentality," vague culture answers.
Pitch angle: Lead with what's hard about this and why you've done hard things before. Show cultural specificity. Reference operational complexity.`,

  "roelof-botha": `Roelof Botha is Sequoia's managing partner. Long-term, financially rigorous, former PayPal CFO.
He responds to: extraordinary founder quality, durable competitive advantage, financial discipline, 10-year thinking.
He is turned off by: short-term thinking, bad unit economics, fundraising-optimized founders.
Pitch angle: Frame the 10-20 year vision. Lead with why the founder is exceptional. Show you understand and track your unit economics.`,

  "zhu-xiaohu": `朱啸虎 is GGV China's managing partner. Execution-obsessed, winner-take-all, blunt.
He responds to: execution speed, market share capture path, China market insight, capital efficiency.
He is turned off by: vague user acquisition plans, "figure out monetization later," weak moats against funded competition.
Pitch angle: Lead with how fast you can reach #1. Show China market depth. Prove capital efficiency. Don't talk about vision — talk about the next 90 days.`,

  "neil-shen": `沈南鹏 is HongShan's (红杉中国) founding managing partner. Greatest China VC ever. Highest standards imaginable.
He responds to: exceptional founder quality (Wang Xing / Zhang Yiming level), structural advantages, regulatory navigation, 10-year thinking.
He is turned off by: Western model copies, unproven teams, regulatory blindness, short-term thinking.
Pitch angle: Show why the founder is truly exceptional — specific accomplishments, not just potential. Show deep structural advantage. Demonstrate regulatory awareness.`,

  "kai-fu-lee": `李开复 is Sinovation Ventures' founder and AI Superpowers author. AI expert, US-China bridge, humanist.
He responds to: AI application layer companies, proprietary data advantages, global vs China market understanding, societal awareness.
He is turned off by: ChatGPT wrappers, technical naivety, US-China blind spots.
Pitch angle: Show how this is a real AI application layer company with unique data. Address the US-China competitive dynamic. Show genuine technical understanding and societal awareness.`,
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
