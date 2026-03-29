import { NextRequest, NextResponse } from "next/server";
import { arenaSessions, ArenaSession } from "@/lib/arena-sessions";

const VALID_SHARKS = ["garry-tan", "marc-andreessen", "chamath-palihapitiya"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });

  const { sessionId, sharkId, message } = body as {
    sessionId?: string;
    sharkId?: string;
    message?: string;
  };

  if (!sessionId || typeof sessionId !== "string")
    return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
  if (!sharkId || !VALID_SHARKS.includes(sharkId))
    return NextResponse.json({ error: "invalid sharkId, use: " + VALID_SHARKS.join(", ") }, { status: 400 });
  if (!message || typeof message !== "string" || message.trim().length === 0)
    return NextResponse.json({ error: "missing message" }, { status: 400 });

  // Initialize session if needed
  const session: ArenaSession = arenaSessions.get(sessionId) ?? {
    sessionId,
    vcs: {},
    createdAt: Date.now(),
  };

  if (!session.vcs[sharkId]) {
    session.vcs[sharkId] = {
      sharkId,
      messages: [],
      score: 0,
      decision: "PENDING",
      roundNumber: 0,
    };
  }

  const vc = session.vcs[sharkId];

  if (vc.decision !== "PENDING") {
    return NextResponse.json({
      error: `This VC has already made a decision: ${vc.decision}`,
      decision: vc.decision,
    }, { status: 400 });
  }

  // Add user message
  vc.messages.push({ role: "user", content: message.trim(), ts: Date.now() });
  vc.roundNumber++;

  arenaSessions.set(sessionId, session);

  // Forward to /api/chat
  const origin = req.nextUrl.origin;
  try {
    const chatRes = await fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharkId,
        sessionId: `arena-ext-${sessionId}`,
        roundNumber: vc.roundNumber,
        messages: vc.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const chatData = await chatRes.json();
    const vcReply: string = chatData.reply ?? "Interesting. Tell me more.";
    const score: number = typeof chatData.score === "number" ? chatData.score : vc.score;
    const decision: "PENDING" | "ACCEPT" | "REJECT" = chatData.decision ?? "PENDING";

    vc.messages.push({ role: "assistant", content: vcReply, ts: Date.now() });
    vc.score = score;
    vc.decision = decision;
    arenaSessions.set(sessionId, session);

    return NextResponse.json({ vcMessage: vcReply, score, decision });
  } catch {
    return NextResponse.json({ error: "VC is unavailable right now" }, { status: 502 });
  }
}
