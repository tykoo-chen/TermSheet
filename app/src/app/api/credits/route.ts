import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/pitch-credits";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-pitch-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  const account = getAccount(token);
  if (!account) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.json({
    credits: account.credits,
    usedCredits: account.usedCredits,
    status: account.status,
    walletAddress: account.walletAddress ?? null,
    createdAt: account.createdAt,
  });
}
