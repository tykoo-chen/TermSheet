"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, ConnectButton, TransactionButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { prepareContractCall, getContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { base } from "thirdweb/chains";

const wallets = [
  inAppWallet({ auth: { options: ["email", "x"] } }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://app-tykooeths-projects.vercel.app";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PLATFORM_WALLET =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET || "0x0000000000000000000000000000000000000001";

// USDC deposit options
const USDC_OPTIONS = [
  { usdc: 5, credits: 5, label: "$5 USDC → 5 credits" },
  { usdc: 10, credits: 12, label: "$10 USDC → 12 credits (+20% bonus)" },
  { usdc: 25, credits: 38, label: "$25 USDC → 38 credits (+50% bonus)" },
];

const STRIPE_BUNDLES = [
  { id: "starter", label: "Starter", credits: 5, price: "$3.99", description: "5 pitches" },
  { id: "growth", label: "Growth", credits: 15, price: "$9.99", description: "15 pitches" },
  { id: "founder", label: "Founder", credits: 40, price: "$19.99", description: "40 pitches" },
];

function buildUsdcDeposit(amountUsdc: number) {
  if (!client) throw new Error("Thirdweb client not configured");
  const usdcContract = getContract({ client, chain: base, address: USDC_BASE });
  return prepareContractCall({
    contract: usdcContract,
    method: "function transfer(address to, uint256 amount) returns (bool)",
    params: [PLATFORM_WALLET as `0x${string}`, BigInt(Math.round(amountUsdc * 1_000_000))],
  });
}

function buildClaudePrompt(wallet: string, sessionId: string, pitchToken?: string) {
  const tokenValue = pitchToken ?? "<get-token-from-termsheet-connect-page>";

  return `# TermSheet Pitch Task

## API Config
Endpoint:  POST ${API_BASE}/api/chat
Header:    x-pitch-token: ${tokenValue}
Session:   ${sessionId}
Wallet:    ${wallet}

## Request body format
\`\`\`json
{
  "sharkId": "<vc-id>",
  "sessionId": "${sessionId}",
  "roundNumber": 1,
  "messages": [{ "role": "user", "content": "<pitch text>" }]
}
\`\`\`
For round 2+, append the VC's reply to messages before sending the next round.

## Task
Please pitch my startup to all VCs simultaneously by making POST requests to the endpoint above.
Keep pitching each VC until their response includes "decision": "ACCEPT" or "decision": "REJECT" (takes 3–5 rounds).
Each message should be under 400 words and tailored to that VC's focus.

## VCs to pitch
garry-tan · marc-andreessen · chamath-palihapitiya · peter-thiel
david-sacks · sam-altman · naval-ravikant · balaji-srinivasan
ben-horowitz · roelof-botha · zhu-xiaohu · neil-shen · anna-fang

## My startup
<!-- Fill this in before running -->
Name:
One-liner:
Problem:
Solution:
Traction:
Ask:

## Notes
- Check remaining credits: GET ${API_BASE}/api/credits?token=${tokenValue}
- When a VC accepts, USDC payout goes to ${wallet} automatically
- Never fabricate startup details — ask the founder if anything is unclear`;
}

export default function ConnectPage() {
  const account = useActiveAccount();
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const key = "termsheet-connect-session";
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(key, id);
      return id;
    }
    return "xxxx-xxxx-xxxx-xxxx";
  });

  const [pitchToken, setPitchToken] = useState<string | null>(null);
  const [tokenCredits, setTokenCredits] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<"usdc" | "card">("usdc");
  const [selectedUsdc, setSelectedUsdc] = useState(10);
  const [selectedBundle, setSelectedBundle] = useState("growth");
  const [buying, setBuying] = useState(false);
  const [depositPending, setDepositPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [downloadedMd, setDownloadedMd] = useState(false);

  const downloadClaudeMd = () => {
    const content = buildClaudePrompt(account?.address ?? "0xYOUR_WALLET", sessionId, pitchToken ?? undefined);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedMd(true);
    setTimeout(() => setDownloadedMd(false), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("pitch_token");
    const urlCredits = params.get("credits");
    if (urlToken) {
      setPitchToken(urlToken);
      setTokenCredits(urlCredits ? parseInt(urlCredits, 10) : null);
      localStorage.setItem("termsheet-pitch-token", urlToken);
      window.history.replaceState({}, "", "/connect");
      return;
    }
    const stored = localStorage.getItem("termsheet-pitch-token");
    if (stored) {
      setPitchToken(stored);
      fetch(`/api/credits?token=${stored}`)
        .then((r) => r.json())
        .then((d) => { if (d.credits !== undefined) setTokenCredits(d.credits); })
        .catch(() => {});
    }
  }, []);

  // Called after USDC TransactionButton confirms on-chain
  const handleUsdcConfirmed = async (txHash: string) => {
    setDepositPending(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, walletAddress: account?.address }),
      });
      const data = await res.json();
      if (data.token) {
        setPitchToken(data.token);
        setTokenCredits(data.credits);
        localStorage.setItem("termsheet-pitch-token", data.token);
      } else {
        alert(data.error || "Deposit verification failed");
      }
    } catch {
      alert("Network error verifying deposit");
    } finally {
      setDepositPending(false);
    }
  };

  const buyWithStripe = async () => {
    setBuying(true);
    try {
      const res = await fetch("/api/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: selectedBundle, walletAddress: account?.address }),
      });
      const data = await res.json();
      if (data.devMode) {
        setPitchToken(data.token);
        setTokenCredits(data.credits);
        localStorage.setItem("termsheet-pitch-token", data.token);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout");
      }
    } catch {
      alert("Network error");
    } finally {
      setBuying(false);
    }
  };

  const clearToken = () => {
    setPitchToken(null);
    setTokenCredits(null);
    localStorage.removeItem("termsheet-pitch-token");
  };

  const prompt = account ? buildClaudePrompt(account.address, sessionId, pitchToken ?? undefined) : "";

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8, overflow: "auto" }}>
      <div className="win95-window" style={{ maxWidth: 780, margin: "0 auto" }}>
        <div className="win95-title-bar">
          <span>🔌 API Access — Connect Your Agent to TermSheet</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {/* Explanation */}
          <div className="inset-box" style={{ padding: 10, marginBottom: 16, fontSize: 11, lineHeight: 1.8 }}>
            <div style={{ fontWeight: "bold", fontFamily: "var(--font-pixel)", fontSize: 13, marginBottom: 4 }}>
              Bring your own agent — Claude Code, OpenAI, LangChain, or anything
            </div>
            <strong>1.</strong> Connect wallet (for USDC payouts) &nbsp;→&nbsp;
            <strong>2.</strong> Pre-fund with USDC or card &nbsp;→&nbsp;
            <strong>3.</strong> Get a <code style={{ background: "#ddd", padding: "0 3px" }}>PITCH_TOKEN</code> &nbsp;→&nbsp;
            <strong>4.</strong> Your agent pitches all VCs with one header.<br />
            When a VC accepts → USDC goes to your wallet automatically. <strong>No per-pitch payment friction.</strong>
          </div>

          {/* Step 1 — Wallet */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                background: account ? "green" : "#000080", color: "white",
                textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0,
              }}>
                {account ? "✓" : "1"}
              </span>
              Connect Wallet <span style={{ fontSize: 10, fontWeight: "normal", color: "#888" }}>(USDC payouts go here)</span>
            </div>
            {account ? (
              <div className="inset-box" style={{ padding: 8, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "green", fontWeight: "bold" }}>✓</span>
                <span style={{ fontFamily: "var(--font-pixel)", fontSize: 12 }}>
                  {account.address.slice(0, 10)}...{account.address.slice(-6)}
                </span>
                <span style={{ fontSize: 10, color: "#888" }}>· Base network</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {client && (
                  <ConnectButton client={client} wallets={wallets} chain={base}
                    connectButton={{ label: "Connect Wallet →" }} />
                )}
                <span style={{ fontSize: 10, color: "#888" }}>Email, MetaMask, Coinbase, or WalletConnect</span>
              </div>
            )}
          </div>

          {/* Step 2 — Buy Credits */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                background: pitchToken ? "green" : "#000080", color: "white",
                textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0,
              }}>
                {pitchToken ? "✓" : "2"}
              </span>
              Pre-fund Credits
            </div>

            {pitchToken ? (
              <div>
                <div className="inset-box" style={{ padding: 10, background: "#001100", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>
                    PITCH_TOKEN {tokenCredits !== null ? `· ${tokenCredits} credit${tokenCredits !== 1 ? "s" : ""} remaining` : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <code style={{ flex: 1, fontFamily: "var(--font-pixel)", fontSize: 11, color: "#00ff88", wordBreak: "break-all" }}>
                      {pitchToken}
                    </code>
                    <button className="win95-btn"
                      style={{ fontSize: 10, padding: "2px 8px", flexShrink: 0, background: copiedToken ? "#00aa00" : undefined, color: copiedToken ? "white" : undefined }}
                      onClick={() => { navigator.clipboard.writeText(pitchToken!); setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000); }}>
                      {copiedToken ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.8, marginBottom: 6 }}>
                  <code style={{ background: "#eee", padding: "1px 4px" }}>export TERMSHEET_TOKEN={pitchToken}</code><br />
                  API header: <code style={{ background: "#eee", padding: "1px 4px" }}>x-pitch-token: {pitchToken.slice(0, 20)}...</code>
                </div>
                <button className="win95-btn" style={{ fontSize: 10, padding: "2px 8px", color: "#888" }} onClick={clearToken}>
                  Clear token
                </button>
              </div>
            ) : (
              <div>
                {/* Payment method toggle */}
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                  {[
                    { id: "usdc", label: "🔷 USDC (on-chain)" },
                    { id: "card", label: "💳 Card (Stripe)" },
                  ].map((m) => (
                    <button key={m.id} className="win95-btn"
                      style={{ fontSize: 11, padding: "3px 12px", fontWeight: payMethod === m.id ? "bold" : "normal",
                        background: payMethod === m.id ? "#000080" : undefined, color: payMethod === m.id ? "white" : undefined }}
                      onClick={() => setPayMethod(m.id as "usdc" | "card")}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {payMethod === "usdc" ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 8, lineHeight: 1.5 }}>
                      Transfer USDC on Base → get pitch credits instantly. Wallet popup opens to confirm.
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {USDC_OPTIONS.map((opt) => (
                        <div key={opt.usdc}
                          onClick={() => setSelectedUsdc(opt.usdc)}
                          style={{ flex: 1, padding: "8px 6px", border: selectedUsdc === opt.usdc ? "2px solid #000080" : "2px solid #888",
                            background: selectedUsdc === opt.usdc ? "#dde" : "#eee", cursor: "pointer", textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 15, color: "green", fontWeight: "bold" }}>${opt.usdc}</div>
                          <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{opt.credits} credits</div>
                        </div>
                      ))}
                    </div>
                    {depositPending ? (
                      <div style={{ padding: 8, background: "#ffffcc", border: "1px solid #cc9", fontSize: 11, textAlign: "center" }}>
                        ⏳ Verifying deposit on-chain...
                      </div>
                    ) : PLATFORM_WALLET === "0x0000000000000000000000000000000000000001" ? (
                      // Dev mode — plain button, no real on-chain tx required
                      <button className="win95-btn"
                        style={{ width: "100%", fontWeight: "bold", fontSize: 13, padding: "8px 0", cursor: "pointer",
                          fontFamily: "inherit", background: "#ffff00" }}
                        onClick={async () => {
                          setDepositPending(true);
                          try {
                            const res = await fetch("/api/deposit", { method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ txHash: "0x" + "0".repeat(64), walletAddress: account?.address ?? "0xdev" }) });
                            const d = await res.json();
                            if (d.token) { setPitchToken(d.token); setTokenCredits(d.credits);
                              localStorage.setItem("termsheet-pitch-token", d.token); }
                            else alert(d.error || "Failed");
                          } finally { setDepositPending(false); }
                        }}>
                        ⚡ Get {USDC_OPTIONS.find(o => o.usdc === selectedUsdc)?.credits} Test Credits (Dev Mode)
                      </button>
                    ) : account && client ? (
                      <TransactionButton
                        transaction={() => buildUsdcDeposit(selectedUsdc)}
                        onTransactionConfirmed={(receipt) => handleUsdcConfirmed(receipt.transactionHash)}
                        onError={(err) => console.error("USDC deposit failed:", err)}
                        style={{ width: "100%", fontWeight: "bold", fontSize: 13, padding: "8px 0", cursor: "pointer",
                          fontFamily: "inherit", background: "#ffff00", border: "2px outset #888" }}
                      >
                        Deposit ${selectedUsdc} USDC → Get {USDC_OPTIONS.find(o => o.usdc === selectedUsdc)?.credits} Credits →
                      </TransactionButton>
                    ) : (
                      <div style={{ fontSize: 11, color: "#888", padding: 8, textAlign: "center" }}>
                        ↑ Connect wallet above to deposit USDC
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      {STRIPE_BUNDLES.map((b) => (
                        <div key={b.id} onClick={() => setSelectedBundle(b.id)}
                          style={{ flex: 1, padding: 8, border: selectedBundle === b.id ? "2px solid #000080" : "2px solid #888",
                            background: selectedBundle === b.id ? "#dde" : "#eee", cursor: "pointer", textAlign: "center" }}>
                          <div style={{ fontWeight: "bold", fontSize: 12 }}>{b.label}</div>
                          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 16, color: "green" }}>{b.price}</div>
                          <div style={{ fontSize: 10, color: "#555" }}>{b.description}</div>
                        </div>
                      ))}
                    </div>
                    <button className="win95-btn"
                      style={{ width: "100%", fontWeight: "bold", fontSize: 12, padding: "6px 0", background: "#ffff00" }}
                      onClick={buyWithStripe} disabled={buying}>
                      {buying ? "Redirecting to Stripe..." : `Pay with Card →`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3 — Copy config / Download CLAUDE.md */}
          {account && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#000080", color: "white",
                  textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0 }}>3</span>
                Set up your agent
                <span style={{ fontSize: 10, fontWeight: "normal", color: "#888" }}>(Claude Code, OpenAI, LangChain, or any agent)</span>
              </div>

              {/* CLAUDE.md callout */}
              <div className="inset-box" style={{ padding: 10, marginBottom: 10, background: "#001a00", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: "#00ff88", fontFamily: "var(--font-pixel)", fontSize: 11, fontWeight: "bold", marginBottom: 3 }}>
                    Recommended: CLAUDE.md
                  </div>
                  <div style={{ color: "#aaa", fontSize: 10, lineHeight: 1.6 }}>
                    Drop <code style={{ background: "#333", padding: "0 3px" }}>CLAUDE.md</code> in your project root.
                    Claude Code reads it as trusted project config — no injection warnings, no approval prompts.
                    Fill in the &quot;My startup&quot; section, then run: <code style={{ background: "#333", padding: "0 3px" }}>claude &quot;pitch my startup per CLAUDE.md&quot;</code>
                  </div>
                </div>
                <button className="win95-btn"
                  style={{ fontSize: 11, padding: "5px 14px", fontWeight: "bold", whiteSpace: "nowrap",
                    background: downloadedMd ? "#005500" : "#ffff00", color: downloadedMd ? "#00ff88" : "#000" }}
                  onClick={downloadClaudeMd}>
                  {downloadedMd ? "✓ Downloaded!" : "⬇ Download CLAUDE.md"}
                </button>
              </div>

              {/* Raw prompt fallback */}
              <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>Or copy raw prompt (for non-Claude-Code agents):</div>
              <div style={{ position: "relative" }}>
                <textarea readOnly value={prompt}
                  style={{ width: "100%", height: 200, fontFamily: "var(--font-pixel)", fontSize: 10,
                    padding: 8, background: "#000", color: "#00ff88", border: "2px inset #888", resize: "none", lineHeight: 1.5 }} />
                <button className="win95-btn"
                  style={{ position: "absolute", top: 6, right: 6, fontSize: 11, padding: "2px 10px", fontWeight: "bold",
                    background: copied ? "#00aa00" : undefined, color: copied ? "white" : undefined }}
                  onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* API reference */}
          <div className="inset-box" style={{ padding: 10, fontSize: 10, lineHeight: 1.9, color: "#444", marginBottom: 14 }}>
            <div style={{ fontWeight: "bold", marginBottom: 4, fontSize: 11 }}>API Reference</div>
            <div>Pitch endpoint: <code style={{ background: "#ddd", padding: "0 3px" }}>POST {API_BASE}/api/chat</code></div>
            <div>Header: <code style={{ background: "#ddd", padding: "0 3px" }}>x-pitch-token: YOUR_TOKEN</code></div>
            <div>Check balance: <code style={{ background: "#ddd", padding: "0 3px" }}>GET {API_BASE}/api/credits?token=YOUR_TOKEN</code></div>
            <div>Webhook status: <code style={{ background: "#ddd", padding: "0 3px" }}>GET {API_BASE}/api/arena-status?sessionId=ID</code></div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>← Back</button></Link>
            <Link href="/arena"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>⚡ Arena Mode</button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
