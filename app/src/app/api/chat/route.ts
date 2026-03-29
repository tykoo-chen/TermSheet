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
  "peter-thiel": {
    threshold: 80,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- The Secret (0-30 pts): Does the founder have a non-consensus insight that is both true and important? This is the most important question.
- Monopoly potential (0-25 pts): Can this become the only company doing what it does? Network effects, proprietary tech, switching costs?
- Definite optimism (0-20 pts): Does the founder have a specific, concrete vision — not vague optimism?
- 10x advantage (0-15 pts): Is this 10x better than alternatives, not just marginally better?
- Counter-mimetic courage (0-10 pts): Is the founder willing to hold an unpopular position? Do they think for themselves?
THRESHOLD: Commit (ACCEPT) only if total score >= 80/100
HARD REJECTS (immediately REJECT):
- "Our market is competitive" — competitive markets are structurally bad
- Incremental improvement, not a genuine secret
- Founders who can't state what important truth almost no one agrees with them on`,
    hardRejectPrompt: "",
  },
  "david-sacks": {
    threshold: 68,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- Product-market fit evidence (0-30 pts): Real usage data, NPS, retention. Not just "people love it."
- Enterprise GTM clarity (0-25 pts): Who is the buyer, what's the sales cycle, what's the ACV?
- Category definition (0-20 pts): Are they defining a new category or fighting in a crowded one?
- Capital efficiency (0-15 pts): Burn to growth ratio. Path to $100M ARR without burning $500M.
- Political/regulatory awareness (0-10 pts): Do they understand the regulatory landscape, especially for AI/crypto?
THRESHOLD: Commit (ACCEPT) only if total score >= 68/100
HARD REJECTS:
- Consumer apps with no clear monetization path
- Founders who use "impact" as a substitute for a business model`,
    hardRejectPrompt: "",
  },
  "sam-altman": {
    threshold: 82,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- AGI relevance (0-30 pts): Will this company matter in a world with AGI? Or will AGI make it obsolete?
- AI-native architecture (0-25 pts): Is AI a core architectural choice or a bolted-on feature?
- World-changing ambition (0-20 pts): Is the TAM "all human activity in this domain"? Thinking small is disqualifying.
- Technical credibility (0-15 pts): Can the founder explain how the technology actually works?
- Exceptional founder quality (0-10 pts): Is this person one of the best in the world at what they do?
THRESHOLD: Commit (ACCEPT) only if total score >= 82/100
HARD REJECTS:
- "We use ChatGPT API" as the core technical moat
- Small ambition in a domain that matters
- Founders who haven't thought seriously about AGI timelines`,
    hardRejectPrompt: "",
  },
  "naval-ravikant": {
    threshold: 70,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- Specific knowledge (0-30 pts): Does the founder have knowledge that can't be trained for? Is there genuine founder-market fit?
- Zero marginal cost leverage (0-25 pts): Does the product use code/networks/media as leverage? No marginal cost of replication?
- Compounding dynamics (0-20 pts): Does the business get better over time without proportional cost?
- Authentic curiosity (0-15 pts): Is the founder genuinely curious about this, or chasing a trend?
- Judgment quality (0-10 pts): Does the founder demonstrate clear, independent thinking?
THRESHOLD: Commit (ACCEPT) only if total score >= 70/100
HARD REJECTS:
- Trend-following without genuine specific knowledge
- High marginal cost businesses that don't leverage technology`,
    hardRejectPrompt: "",
  },
  "balaji-srinivasan": {
    threshold: 76,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- Decentralization necessity (0-30 pts): Is decentralization actually necessary for this to work? Or is it a gimmick?
- Exit from legacy systems (0-25 pts): Does this create an alternative to an existing institution, or just improve it?
- Technical depth (0-20 pts): Does the founder understand cryptography, consensus mechanisms, and network design?
- Global optionality (0-15 pts): Can this work across jurisdictions? Is it resistant to any single government's interference?
- Original thinking (0-10 pts): Has the founder read deeply and arrived at non-consensus conclusions?
THRESHOLD: Commit (ACCEPT) only if total score >= 76/100
HARD REJECTS:
- "Blockchain for X" without genuine need for decentralization
- Founders who defer to regulators as the source of truth on what's possible`,
    hardRejectPrompt: "",
  },
  "ben-horowitz": {
    threshold: 72,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- Wartime CEO potential (0-30 pts): Has the founder shown they can make hard decisions under pressure? Do they have scars?
- Cultural clarity (0-25 pts): Can the founder articulate their culture precisely? Not "we're collaborative" — something specific and defensible.
- Operational depth (0-20 pts): Does the founder understand the operational complexity of what they're building?
- Technical leadership (0-15 pts): Can they lead engineers, or just manage them?
- Hard thing resilience (0-10 pts): Have they done something genuinely hard before? Failed and recovered?
THRESHOLD: Commit (ACCEPT) only if total score >= 72/100
HARD REJECTS:
- Founders who think culture is about perks
- Founders who've never faced real adversity`,
    hardRejectPrompt: "",
  },
  "roelof-botha": {
    threshold: 76,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- Founder extraordinariness (0-30 pts): Is this an exceptional human, not just a good entrepreneur?
- Durable competitive advantage (0-25 pts): What is the moat and how does it deepen over 10 years?
- Financial discipline (0-20 pts): Do they understand and track their unit economics? Is the model structurally sound?
- Market timing (0-15 pts): Is this the right moment? What changed recently to make this possible?
- Long-term vision (0-10 pts): Can they articulate where the world will be in 20 years and how they get there?
THRESHOLD: Commit (ACCEPT) only if total score >= 76/100
HARD REJECTS:
- Founders who optimize for fundraising rather than product
- Business models with structurally bad unit economics`,
    hardRejectPrompt: "",
  },
  "zhu-xiaohu": {
    threshold: 68,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- 执行速度 Execution velocity (0-30 pts): Can this team move faster than anyone in the China market? Evidence of speed?
- 市场份额路径 Market share path (0-25 pts): Clear path to #1 in target segment within 18 months?
- 本土化深度 China market insight (0-20 pts): Do they deeply understand how Chinese users behave differently?
- 资本效率 Capital efficiency (0-15 pts): Burn-to-growth ratio. Can they win without burning endless cash?
- 护城河 Moat against funded competition (0-10 pts): What happens when a well-capitalized competitor enters?
THRESHOLD: Commit (ACCEPT) only if total score >= 68/100
HARD REJECTS:
- No clear user acquisition plan for first 100K users
- "We'll figure out monetization later" with no structural advantage`,
    hardRejectPrompt: "",
  },
  "neil-shen": {
    threshold: 82,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- 创始人质量 Exceptional founder quality (0-30 pts): Is this founder at the level of Wang Xing, Zhang Yiming, Huang Zheng? Truly exceptional?
- 结构性优势 Structural advantage (0-25 pts): Data moat, network effects, supply chain depth — something that compounds over years?
- 监管适应性 Regulatory navigation (0-20 pts): Do they understand China's regulatory environment deeply?
- 市场规模 Market size in China (0-15 pts): Is the addressable market genuinely massive in China specifically?
- 10年视角 10-year thinking (0-10 pts): Are they building for the next decade, not just the next round?
THRESHOLD: Commit (ACCEPT) only if total score >= 82/100
HARD REJECTS:
- Copying Western model without genuine China adaptation
- Teams without demonstrated execution history`,
    hardRejectPrompt: "",
  },
  "anna-fang": {
    threshold: 72,
    criteriaPrompt: `
INTERNAL SCORING (never reveal the score — stay in character):
- 创始人质量 Founder quality (0-30 pts): Do they have the 4L qualities — Learning capacity, relevant experience, Leadership/influence, fundraising capacity? Are they "100 points in one thing"?
- 团队化学反应 Team chemistry (0-25 pts): Is the co-founding team genuinely complementary with real chemistry? Or is it a marriage of convenience?
- 执行证明 Execution evidence (0-20 pts): Have they shipped? Talked to real customers? Done the unglamorous work? Evidence of hustle?
- 结构性护城河 Structural moat (0-15 pts): Is there a compounding advantage — data, network, brand, supply chain — not just first-mover?
- 真实热情 Authentic passion (0-10 pts): Are they building this because they deeply care, or because it's a hot trend?
THRESHOLD: Commit (ACCEPT) only if total score >= 72/100
HARD REJECTS:
- Co-founders with visible conflict or misaligned incentives — this is the #1 startup killer
- Trend-chasers without domain expertise who can't explain why only they can build this
- Founders who optimize for fundraising conversations rather than product and customers`,
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
- NEVER fabricate or assume any information about the founder's startup. Only evaluate based on what the founder has explicitly stated. If you need more details, ask — do not fill in the blanks yourself.
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
      parsed = { reply: raw, score: 0, decision: "PENDING", reject_reason: undefined };
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
