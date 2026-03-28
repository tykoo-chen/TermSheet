import { NextRequest, NextResponse } from "next/server";
import { approvedSessions } from "../chat/route";
import { sharks } from "@/lib/mock-data";

// Thirdweb Engine: USDC contract on Base mainnet
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN = "base";

// Per-shark server wallet addresses (funded with USDC, managed via Thirdweb Engine MPC)
const sharkWallets: Record<string, string | undefined> = {
  "garry-tan": process.env.WALLET_GARRY_TAN,
  "marc-andreessen": process.env.WALLET_MARC_ANDREESSEN,
  "chamath-palihapitiya": process.env.WALLET_CHAMATH,
};

// USDC has 6 decimals
function toUsdcUnits(dollars: number): string {
  return (dollars * 1_000_000).toString();
}

async function transferUsdc(
  fromWallet: string,
  toWallet: string,
  amountUsd: number
): Promise<{ txHash: string }> {
  const engineUrl = process.env.THIRDWEB_ENGINE_URL;
  const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

  if (!engineUrl || !accessToken) {
    throw new Error("Thirdweb Engine not configured");
  }

  const res = await fetch(
    `${engineUrl}/contract/${BASE_CHAIN}/${USDC_BASE}/erc20/transfer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-backend-wallet-address": fromWallet,
      },
      body: JSON.stringify({
        toAddress: toWallet,
        amount: toUsdcUnits(amountUsd),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Engine transfer failed: ${err}`);
  }

  const data = await res.json();
  // Engine returns queueId; poll for txHash or return queueId as reference
  return { txHash: data.result?.queueId ?? data.result?.transactionHash ?? "queued" };
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, founderWallet, sharkId } = await req.json();

    // Validate inputs
    if (!sessionId || !founderWallet || !sharkId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate wallet address format (basic EVM check)
    if (!/^0x[0-9a-fA-F]{40}$/.test(founderWallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // Verify the session was actually approved by AI (server-side check)
    const session = approvedSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "No approved session found" }, { status: 403 });
    }
    if (session.sharkId !== sharkId) {
      return NextResponse.json({ error: "Session/shark mismatch" }, { status: 403 });
    }

    // Expire sessions older than 30 minutes
    if (Date.now() - session.approvedAt > 30 * 60 * 1000) {
      approvedSessions.delete(sessionId);
      return NextResponse.json({ error: "Session expired" }, { status: 403 });
    }

    const shark = sharks.find((s) => s.id === sharkId);
    if (!shark) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const fromWallet = sharkWallets[sharkId];
    if (!fromWallet) {
      return NextResponse.json({ error: "Shark wallet not configured" }, { status: 500 });
    }

    // Execute on-chain USDC transfer
    const { txHash } = await transferUsdc(fromWallet, founderWallet, shark.stakedAmount);

    // Consume session so it can't be claimed twice
    approvedSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      txHash,
      amount: shark.stakedAmount,
      founderWallet,
      chain: BASE_CHAIN,
    });
  } catch (error) {
    console.error("Settle API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
