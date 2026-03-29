import { NextRequest, NextResponse } from "next/server";
import { deductCredits, getAccount } from "@/lib/pitch-credits";
import { arenaSessions } from "@/lib/arena-sessions";

export async function POST(req: NextRequest) {
  try {
    const { token, amount, sessionIds } = await req.json();

    if (!token || typeof amount !== "number" || amount < 1) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    // Dev mode — no token required
    const account = getAccount(token);
    if (!account) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const updated = deductCredits(token, amount);
    if (!updated) {
      return NextResponse.json(
        { error: "Insufficient credits", credits: account.credits, required: amount },
        { status: 402 }
      );
    }

    // Mark all provided session IDs as pre-paid so /api/chat won't charge again
    if (Array.isArray(sessionIds)) {
      for (const sid of sessionIds) {
        const existing = arenaSessions.get(sid);
        if (existing) {
          existing.prepaid = true;
        } else {
          arenaSessions.set(sid, {
            sessionId: sid,
            vcs: {},
            createdAt: Date.now(),
            prepaid: true,
          });
        }
      }
    }

    return NextResponse.json({ success: true, creditsRemaining: updated.credits });
  } catch (err) {
    console.error("deduct-credits error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
