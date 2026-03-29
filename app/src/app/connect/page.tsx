"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { base } from "thirdweb/chains";

const wallets = [
  inAppWallet({ auth: { options: ["email", "x"] } }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://app-tykooeths-projects.vercel.app";

const BUNDLES = [
  { id: "starter", label: "Starter", credits: 5, price: "$3.99", description: "5 pitches" },
  { id: "growth", label: "Growth", credits: 15, price: "$9.99", description: "15 pitches · best value" },
  { id: "founder", label: "Founder", credits: 40, price: "$19.99", description: "40 pitches" },
];

function buildClaudePrompt(wallet: string, sessionId: string, pitchToken?: string) {
  const tokenLine = pitchToken
    ? `PITCH_TOKEN="${pitchToken}"  # Include as: x-pitch-token header on every /api/chat request\n`
    : `# No pitch token yet — buy credits at ${API_BASE}/connect to get one\n`;

  return `# TermSheet — Claude Code Integration
${tokenLine}
WALLET_ADDRESS="${wallet}"
SESSION_ID="${sessionId}"
API_ENDPOINT="${API_BASE}/api/chat"

---

You are a startup pitch agent connected to TermSheet, an AI-powered VC platform.
Your job: pitch the founder's startup to VCs via the API above on their behalf.

HOW TO PITCH:
POST ${API_BASE}/api/chat
Headers: { "x-pitch-token": PITCH_TOKEN }
Body: { "sharkId": "<vc-id>", "sessionId": "${sessionId}", "roundNumber": <n>, "messages": [{"role":"user","content":"<message>"}] }

PAYOUT IS AUTOMATIC — when a VC returns "decision":"ACCEPT", the platform sends USDC to ${wallet} automatically.
DO NOT call any payment or settle endpoints. Just pitch.

VCs available (13 total):
- garry-tan — YC, $5,000 USDC, threshold: 68/100
- marc-andreessen — a16z, $10,000 USDC, threshold: 78/100
- chamath-palihapitiya — Social Capital, $8,000 USDC, threshold: 73/100
- peter-thiel — Founders Fund, $15,000 USDC, threshold: 80/100
- david-sacks — Craft Ventures, $6,000 USDC, threshold: 68/100
- sam-altman — OpenAI/Hydrazine, $12,000 USDC, threshold: 82/100
- naval-ravikant — AngelList, $4,000 USDC, threshold: 70/100
- balaji-srinivasan — Network State, $7,000 USDC, threshold: 76/100
- ben-horowitz — a16z, $8,000 USDC, threshold: 72/100
- roelof-botha — Sequoia, $9,000 USDC, threshold: 76/100
- zhu-xiaohu — GSR Ventures, $6,000 USDC, threshold: 68/100
- neil-shen — Sequoia China, $12,000 USDC, threshold: 82/100
- anna-fang — ZhenFund, $7,000 USDC, threshold: 72/100

STRATEGY: Pick up to 10 VCs to pitch simultaneously. Start with lower-threshold VCs (garry-tan, david-sacks, zhu-xiaohu at 68). Ask the founder to describe their startup, then craft compelling answers. Keep messages under 400 words. Score rises with each round — aim for 3+ rounds before expecting acceptance.

CRITICAL — NO FABRICATION:
- NEVER make up, guess, or fabricate any startup data (name, metrics, revenue, users, team, market size, etc.).
- ALWAYS ask the founder for real information before pitching. Do not proceed until you have real details.
- If a VC asks a question you don't have the answer to, pause and ask the founder — do not invent an answer.
- Only use information the founder has explicitly provided. If details are missing, ask follow-up questions.`;
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

  // Pitch token from URL (after Stripe redirect) or localStorage
  const [pitchToken, setPitchToken] = useState<string | null>(null);
  const [tokenCredits, setTokenCredits] = useState<number | null>(null);
  const [selectedBundle, setSelectedBundle] = useState("growth");
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    // Check URL params for token from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("pitch_token");
    const urlCredits = params.get("credits");
    if (urlToken) {
      setPitchToken(urlToken);
      setTokenCredits(urlCredits ? parseInt(urlCredits, 10) : null);
      localStorage.setItem("termsheet-pitch-token", urlToken);
      // Clean URL
      window.history.replaceState({}, "", "/connect");
      return;
    }
    // Check localStorage
    const stored = localStorage.getItem("termsheet-pitch-token");
    if (stored) {
      setPitchToken(stored);
      // Fetch live credit balance
      fetch(`/api/credits?token=${stored}`)
        .then((r) => r.json())
        .then((d) => { if (d.credits !== undefined) setTokenCredits(d.credits); })
        .catch(() => {});
    }
  }, []);

  const buyCredits = async () => {
    setBuying(true);
    try {
      const res = await fetch("/api/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: selectedBundle, walletAddress: account?.address }),
      });
      const data = await res.json();
      if (data.devMode) {
        // Dev mode — token issued instantly
        setPitchToken(data.token);
        setTokenCredits(data.credits);
        localStorage.setItem("termsheet-pitch-token", data.token);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout");
      }
    } catch {
      alert("Network error — try again");
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

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyToken = () => {
    if (!pitchToken) return;
    navigator.clipboard.writeText(pitchToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8, overflow: "auto" }}>
      <div className="win95-window" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="win95-title-bar">
          <span>🔌 Connect Claude to TermSheet</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {/* Concept explanation */}
          <div className="inset-box" style={{ padding: 10, marginBottom: 16, fontSize: 11, lineHeight: 1.7 }}>
            <div style={{ fontWeight: "bold", marginBottom: 4, fontFamily: "var(--font-pixel)", fontSize: 13 }}>
              How it works
            </div>
            Buy pitch credits → get a <code style={{ background: "#ddd", padding: "0 3px" }}>PITCH_TOKEN</code> →
            paste into Claude Code → Claude pitches 13 VCs simultaneously on your behalf.<br />
            When a VC accepts, <strong>USDC transfers to your wallet automatically</strong>. Claude never touches payment APIs.
          </div>

          {/* Step 1: Connect wallet */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                background: account ? "green" : "#000080", color: "white",
                textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0,
              }}>
                {account ? "✓" : "1"}
              </span>
              Connect Wallet <span style={{ fontSize: 10, fontWeight: "normal", color: "#888" }}>(for USDC payouts)</span>
            </div>
            {account ? (
              <div className="inset-box" style={{ padding: 8, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "green", fontWeight: "bold" }}>✓ Connected:</span>
                <span style={{ fontFamily: "var(--font-pixel)", fontSize: 12 }}>
                  {account.address.slice(0, 10)}...{account.address.slice(-6)}
                </span>
                <span style={{ fontSize: 10, color: "#888" }}>· USDC payouts go here</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {client && (
                  <ConnectButton client={client} wallets={wallets} chain={base}
                    connectButton={{ label: "Connect Wallet" }} />
                )}
                <span style={{ fontSize: 11, color: "#888" }}>← required for USDC payouts</span>
              </div>
            )}
          </div>

          {/* Step 2: Buy credits / show existing token */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                background: pitchToken ? "green" : "#000080", color: "white",
                textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0,
              }}>
                {pitchToken ? "✓" : "2"}
              </span>
              Get Pitch Credits
            </div>

            {pitchToken ? (
              // Token exists — show it
              <div>
                <div className="inset-box" style={{ padding: 10, background: "#001100", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>
                    Your PITCH_TOKEN{tokenCredits !== null ? ` · ${tokenCredits} credits remaining` : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <code style={{
                      flex: 1,
                      fontFamily: "var(--font-pixel)",
                      fontSize: 11,
                      color: "#00ff88",
                      wordBreak: "break-all",
                    }}>
                      {pitchToken}
                    </code>
                    <button className="win95-btn" style={{ fontSize: 10, padding: "2px 8px", flexShrink: 0,
                      background: copiedToken ? "#00aa00" : undefined, color: copiedToken ? "white" : undefined }}
                      onClick={copyToken}>
                      {copiedToken ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 6, lineHeight: 1.6 }}>
                  For Claude Code: <code style={{ background: "#eee", padding: "1px 4px" }}>export TERMSHEET_TOKEN={pitchToken}</code><br />
                  Or set as env var in your project&apos;s <code style={{ background: "#eee", padding: "1px 4px" }}>.env</code> file.
                </div>
                <button className="win95-btn" style={{ fontSize: 10, padding: "2px 8px", color: "#888" }}
                  onClick={clearToken}>
                  Clear token (buy new)
                </button>
              </div>
            ) : (
              // Buy credits UI
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {BUNDLES.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBundle(b.id)}
                      style={{
                        flex: 1,
                        padding: 8,
                        border: selectedBundle === b.id ? "2px solid #000080" : "2px solid #888",
                        background: selectedBundle === b.id ? "#dde" : "#eee",
                        cursor: "pointer",
                        textAlign: "center",
                        fontSize: 11,
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 2 }}>{b.label}</div>
                      <div style={{ fontFamily: "var(--font-pixel)", fontSize: 16, color: "green", marginBottom: 2 }}>{b.price}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{b.description}</div>
                    </div>
                  ))}
                </div>
                <button
                  className="win95-btn"
                  style={{ width: "100%", fontWeight: "bold", fontSize: 12, padding: "6px 0", background: "#ffff00" }}
                  onClick={buyCredits}
                  disabled={buying}
                >
                  {buying ? "Redirecting..." : `Buy ${BUNDLES.find((b) => b.id === selectedBundle)?.label} Pack →`}
                </button>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                  After purchase you&apos;ll get a <code style={{ background: "#eee", padding: "0 3px" }}>PITCH_TOKEN</code> to use with Claude Code.
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Copy Claude Code config */}
          {account && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#000080", color: "white", textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0 }}>3</span>
                Copy your Claude Code config
              </div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
                Paste into <strong>Claude.ai → Projects → System Prompt</strong>, or start a Claude Code session with it.
              </div>
              <div style={{ position: "relative" }}>
                <textarea
                  readOnly
                  value={prompt}
                  style={{
                    width: "100%", height: 200,
                    fontFamily: "var(--font-pixel)", fontSize: 10,
                    padding: 8, background: "#000", color: "#00ff88",
                    border: "2px inset #888", resize: "none", lineHeight: 1.5,
                  }}
                />
                <button
                  className="win95-btn"
                  style={{
                    position: "absolute", top: 6, right: 6,
                    fontSize: 11, padding: "2px 10px", fontWeight: "bold",
                    background: copied ? "#00aa00" : undefined,
                    color: copied ? "white" : undefined,
                  }}
                  onClick={copyPrompt}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* How it works for Claude Code */}
          <div className="inset-box" style={{ padding: 10, marginBottom: 16, fontSize: 11, lineHeight: 1.7 }}>
            <div style={{ fontWeight: "bold", marginBottom: 6, fontFamily: "var(--font-pixel)", fontSize: 12 }}>
              For Claude Code users
            </div>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", lineHeight: 2 }}>
              1. Set env var: <code style={{ background: "#ddd", padding: "0 4px" }}>export TERMSHEET_TOKEN=pt_xxx</code><br />
              2. Every pitch call includes header: <code style={{ background: "#ddd", padding: "0 4px" }}>x-pitch-token: $TERMSHEET_TOKEN</code><br />
              3. Each completed pitch deducts 1 credit — no wallet popup, no Stripe redirect.<br />
              4. When a VC accepts, USDC goes to your wallet automatically.
            </div>
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
