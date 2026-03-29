import { NextRequest, NextResponse } from "next/server";
import { generatePitchToken, pitchAccounts } from "@/lib/pitch-credits";

const BASE_RPC = "https://mainnet.base.org";
const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
// ERC-20 Transfer(address indexed from, address indexed to, uint256 value) topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Track used tx hashes to prevent double-spend
const g = globalThis as Record<string, unknown>;
const usedTxHashes: Set<string> = (g.__usedDepositTxHashes as Set<string>) ?? (g.__usedDepositTxHashes = new Set());

export async function POST(req: NextRequest) {
  try {
    const { txHash, walletAddress } = await req.json();

    if (!txHash || typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
    }

    // Prevent double-spend
    if (usedTxHashes.has(txHash.toLowerCase())) {
      return NextResponse.json({ error: "Transaction already used" }, { status: 409 });
    }

    const platformWallet = (
      process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
      process.env.PLATFORM_WALLET ||
      ""
    ).toLowerCase();

    // Dev mode: no platform wallet configured — issue tokens immediately
    if (!platformWallet || platformWallet === "0x0000000000000000000000000000000000000001") {
      const credits = 10; // default dev grant
      const token = generatePitchToken();
      pitchAccounts.set(token, {
        token, credits, walletAddress,
        createdAt: Date.now(), usedCredits: 0, status: "active",
      });
      return NextResponse.json({ token, credits, devMode: true });
    }

    // Fetch tx receipt from Base mainnet
    const rpcRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const rpcData = await rpcRes.json();
    const receipt = rpcData.result;

    if (!receipt) {
      return NextResponse.json({ error: "Transaction not found — may still be pending" }, { status: 400 });
    }
    if (receipt.status !== "0x1") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // Parse USDC Transfer logs to find amount sent to platform wallet
    let usdcUnits = BigInt(0);
    for (const log of receipt.logs ?? []) {
      if (
        log.address?.toLowerCase() === USDC_BASE &&
        log.topics?.[0] === TRANSFER_TOPIC &&
        log.topics?.[2]?.toLowerCase().includes(platformWallet.slice(2))
      ) {
        try {
          usdcUnits = BigInt(log.data);
        } catch {
          // ignore
        }
      }
    }

    if (usdcUnits === BigInt(0)) {
      return NextResponse.json(
        { error: "No USDC transfer to platform wallet found in this transaction" },
        { status: 400 }
      );
    }

    // USDC has 6 decimals. 1 credit = $1 USDC. Bonus for larger deposits.
    const dollars = Number(usdcUnits) / 1_000_000;
    let credits: number;
    if (dollars >= 25) credits = Math.floor(dollars * 1.5); // 50% bonus
    else if (dollars >= 10) credits = Math.floor(dollars * 1.2); // 20% bonus
    else credits = Math.floor(dollars); // 1:1

    if (credits < 1) {
      return NextResponse.json({ error: "Minimum deposit is $1 USDC" }, { status: 400 });
    }

    // Mark tx as used
    usedTxHashes.add(txHash.toLowerCase());

    // Issue token
    const token = generatePitchToken();
    pitchAccounts.set(token, {
      token,
      credits,
      walletAddress: walletAddress ?? receipt.from,
      createdAt: Date.now(),
      usedCredits: 0,
      status: "active",
    });

    return NextResponse.json({ token, credits, dollars: dollars.toFixed(2) });
  } catch (err) {
    console.error("Deposit API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
