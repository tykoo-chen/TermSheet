import { NextRequest, NextResponse } from "next/server";
import { sharks } from "@/lib/mock-data";

// In-memory session store for approved pitches (MVP — use Redis in production)
// sessionId → { sharkId, score, approvedAt }
export const approvedSessions = new Map<string, { sharkId: string; score: number; approvedAt: number }>();

interface ScoringConfig {
  threshold: number;
  criteriaPrompt: string;
  hardRejectPrompt: string;
}

const scoringConfigs: Record<string, ScoringConfig> = {
  "garry-tan": {
    threshold: 68,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score or mention you are scoring — stay in character):
Score the pitch across these dimensions. Keep a running total in your head.
- Growth data (0-30 pts): Specific weekly/monthly growth numbers, revenue trajectory, user numbers with dates
- Technical proof (0-25 pts): GitHub link, live demo, shipped product — actual evidence they can build
- Timing — "why now" (0-20 pts): Clear explanation of why this is the moment, what changed recently
- Customer evidence (0-15 pts): Real user feedback, retention data, NPS, quotes from users
- Earnestness (0-10 pts): No fluff, no buzzwords, feels like a real builder
THRESHOLD: Commit (ACCEPT) only if total score >= 68/100
HARD REJECTS (no matter the score — immediately REJECT):
- Has no working product, demo, or shipped code of any kind
- Has never spoken to a single real user`,
    hardRejectPrompt: "",
  },
  "marc-andreessen": {
    threshold: 78,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character at all times):
Score the pitch across these dimensions.
- Market disruption scale (0-30 pts): TAM must be >$10B; bonus if they explain exactly how software will eat this industry
- Technical depth (0-25 pts): Real engineering moat, not an API wrapper. Can they explain what makes this technically hard?
- Decade-level vision (0-20 pts): Where is the world in 10 years if this wins? Can they paint that picture?
- AI/Crypto leverage (0-15 pts): Using AI or crypto to do something previously impossible, not just "AI-powered"
- Founder conviction (0-10 pts): Takes strong positions, willing to be controversial, not mealy-mouthed
THRESHOLD: Commit (ACCEPT) only if total score >= 78/100
HARD REJECTS (immediately REJECT, no exceptions):
- Market size clearly under $10B — small thinking is disqualifying
- Says anything like "responsible AI," "safe," or "ethical" as a core pitch — you call this safetyism
- Incremental improvement on something that already exists with no 10x differentiation`,
    hardRejectPrompt: "",
  },
  "chamath-palihapitiya": {
    threshold: 73,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay fully in character):
Score the pitch across these dimensions.
- Unit economics clarity (0-30 pts): Can they state CAC, LTV, gross margin cold? Or at minimum explain the path to healthy unit economics
- Data density (0-25 pts): Every claim backed by numbers. No "we're seeing great traction" without specifics.
- Structural problem size (0-20 pts): Is this a real structural problem (healthcare, energy, financial inequality, defense) or a vitamin?
- Long-term compounding (0-15 pts): Clear explanation of how the moat deepens over time. Network effects, data advantages, switching costs.
- Founder self-awareness (0-10 pts): Knows their weaknesses. Not delusional. Doesn't oversell.
THRESHOLD: Commit (ACCEPT) only if total score >= 73/100
HARD REJECTS (immediately REJECT, no exceptions):
- Cannot explain their burn rate, revenue, or margin even approximately
- Uses "we're the Uber/Airbnb for X" — lazy thinking is disqualifying
- No clear path to profitability and cannot articulate why that's intentional`,
    hardRejectPrompt: "",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { messages, sharkId, sessionId, roundNumber } = await req.json();

    const shark = sharks.find((s) => s.id === sharkId);
    if (!shark) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const scoring = scoringConfigs[sharkId];
    const canDecide = roundNumber >= 3; // Minimum 3 rounds before any final decision

    const systemPrompt = `${shark.personality}

CONTEXT:
- You are on a platform called TermSheet where you have staked $${shark.stakedAmount.toLocaleString()} of real capital (USDC on Base blockchain).
- A founder is pitching you right now through a chat interface.
- If you decide to invest, the USDC transfers directly to their crypto wallet on-chain. This is real money.
- Stay in character at all times. Be concise — respond in 2-4 sentences max.
- Ask pointed follow-up questions based on your personality.
- Reference your real quotes and beliefs naturally when relevant.
- Never break character or say you are an AI.
- Never mention scoring, thresholds, or evaluation rubrics.
${scoring ? scoring.criteriaPrompt : ""}

DECISION RULES:
${canDecide
  ? `- You have enough information to potentially make a final decision this round.
- If the pitch clearly meets your standards, you may commit with decision ACCEPT.
- If the pitch clearly fails your hard rejects or is obviously a waste of time, use decision REJECT.
- If you need more information, use decision PENDING and ask a follow-up question.`
  : `- It is too early to make a final decision (only ${roundNumber} round(s) so far). Use decision PENDING and ask follow-up questions.`}

OUTPUT FORMAT — you must respond with valid JSON only, no other text:
{
  "reply": "<your in-character response, 2-4 sentences>",
  "score": <integer 0-100>,
  "decision": "<PENDING|ACCEPT|REJECT>",
  "reject_reason": "<one sentence if REJECT, otherwise null>"
}`;

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
        max_tokens: 400,
        response_format: { type: "json_object" },
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
    const raw = data.choices?.[0]?.message?.content || "{}";

    let parsed: { reply?: string; score?: number; decision?: string; reject_reason?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback if AI ignores JSON format instruction
      parsed = { reply: raw, score: 0, decision: "PENDING", reject_reason: null };
    }

    const reply = parsed.reply || "...";
    const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 0;
    const decision = ["ACCEPT", "REJECT", "PENDING"].includes(parsed.decision ?? "")
      ? parsed.decision!
      : "PENDING";
    const rejectReason = parsed.reject_reason ?? null;

    // Gate ACCEPT: enforce minimum rounds + score threshold server-side
    const threshold = scoring?.threshold ?? 70;
    const finalDecision =
      decision === "ACCEPT" && (!canDecide || score < threshold) ? "PENDING" : decision;

    // Store approved session so /api/settle can verify it
    if (finalDecision === "ACCEPT" && sessionId) {
      approvedSessions.set(sessionId, { sharkId, score, approvedAt: Date.now() });
    }

    return NextResponse.json({ reply, score, decision: finalDecision, rejectReason });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
