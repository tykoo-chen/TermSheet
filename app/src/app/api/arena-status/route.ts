import { NextRequest, NextResponse } from "next/server";
import { arenaSessions } from "@/lib/arena-sessions";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "missing sessionId" }, { status: 400 });

  const session = arenaSessions.get(sessionId);
  if (!session) return NextResponse.json({ vcs: {} });

  return NextResponse.json({ vcs: session.vcs });
}
