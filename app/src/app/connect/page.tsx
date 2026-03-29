"use client";
import { useState } from "react";
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

const API_BASE = "https://app-tykooeths-projects.vercel.app";

function buildClaudePrompt(wallet: string, sessionId: string) {
  return `# TermSheet — Claude Integration Config
# Paste this as your Claude Project system prompt or conversation starter.

WALLET_ADDRESS="${wallet}"
SESSION_ID="${sessionId}"
API_ENDPOINT="${API_BASE}/api/chat"
SETTLE_ENDPOINT="${API_BASE}/api/settle"
AVAILABLE_VCS=["garry-tan","marc-andreessen","chamath-palihapitiya","peter-thiel","david-sacks","sam-altman","naval-ravikant","balaji-srinivasan","ben-horowitz","roelof-botha","zhu-xiaohu","neil-shen","kai-fu-lee"]

---

You are a startup pitch agent connected to TermSheet, an AI-powered VC platform.
Your job: pitch the founder's startup to VCs via the API above on their behalf.

HOW TO PITCH:
POST ${API_BASE}/api/chat
Body: { "sharkId": "<vc-id>", "sessionId": "${sessionId}", "roundNumber": <n>, "messages": [{"role":"user","content":"<message>"}] }

WALLET FOR PAYOUT: ${wallet}
If a VC returns "decision":"ACCEPT", call the settle endpoint immediately:
POST ${API_BASE}/api/settle
Body: { "sessionId": "${sessionId}", "sharkId": "<vc-id>", "founderWallet": "${wallet}" }

VCs available (13 total — you can pitch up to 10 simultaneously):
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
- kai-fu-lee — Sinovation, $6,500 USDC, threshold: 70/100

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
  const [copied, setCopied] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);

  const prompt = account ? buildClaudePrompt(account.address, sessionId) : "";

  const mcpConfig = account
    ? JSON.stringify(
        {
          mcpServers: {
            termsheet: {
              command: "npx",
              args: ["-y", "@termsheet/mcp-server"],
              env: {
                TERMSHEET_WALLET: account.address,
                TERMSHEET_SESSION: sessionId,
                TERMSHEET_API: API_BASE,
              },
            },
          },
        },
        null,
        2
      )
    : "";

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMcp = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
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
              What is this?
            </div>
            After connecting your wallet, you get a <strong>personal integration code</strong>.<br />
            Copy it → paste into Claude → Claude pitches your startup to VCs <strong>on your behalf</strong>.<br />
            If a VC accepts, USDC goes directly to <strong>your wallet</strong>. No manual steps.
          </div>

          {/* Step 1: Sign in */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                background: account ? "green" : "#000080", color: "white",
                textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0,
              }}>
                {account ? "✓" : "1"}
              </span>
              Connect Wallet
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
                  <ConnectButton
                    client={client}
                    wallets={wallets}
                    chain={base}
                    connectButton={{ label: "Connect Wallet to Get Code" }}
                  />
                )}
                <span style={{ fontSize: 11, color: "#888" }}>← required to generate your code</span>
              </div>
            )}
          </div>

          {/* Step 2: Copy Claude prompt */}
          {account && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#000080", color: "white", textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0 }}>2</span>
                  Copy your Claude integration code
                </div>

                <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
                  Paste this into <strong>Claude.ai → Projects → System Prompt</strong>, or start any Claude conversation with it.
                </div>

                <div style={{ position: "relative" }}>
                  <textarea
                    readOnly
                    value={prompt}
                    style={{
                      width: "100%",
                      height: 200,
                      fontFamily: "var(--font-pixel)",
                      fontSize: 10,
                      padding: 8,
                      background: "#000",
                      color: "#00ff88",
                      border: "2px inset #888",
                      resize: "none",
                      lineHeight: 1.5,
                    }}
                  />
                  <button
                    className="win95-btn"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      fontSize: 11,
                      padding: "2px 10px",
                      fontWeight: "bold",
                      background: copied ? "#00aa00" : undefined,
                      color: copied ? "white" : undefined,
                    }}
                    onClick={copyPrompt}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Step 3: Paste into Claude */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#000080", color: "white", textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0 }}>3</span>
                  Paste into Claude and say:
                </div>

                <div className="inset-box" style={{ padding: 10, fontFamily: "var(--font-pixel)", fontSize: 12, lineHeight: 1.8 }}>
                  <div style={{ color: "#666", fontSize: 10, marginBottom: 4 }}>Example message to Claude after pasting the config:</div>
                  <div style={{ color: "#000" }}>
                    &quot;I&apos;m building [your startup]. Help me pitch to Garry Tan. Start the session.&quot;
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#888", marginTop: 8, lineHeight: 1.6 }}>
                  Claude will use your wallet address <code style={{ background: "#eee", padding: "0 3px" }}>{account.address.slice(0, 8)}...</code> for the session.
                  If a VC accepts, USDC is sent on-chain automatically — no further action needed.
                </div>
              </div>

              {/* MCP config (advanced) */}
              <div>
                <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#888", color: "white", textAlign: "center", lineHeight: "20px", fontSize: 11, flexShrink: 0 }}>⚙</span>
                  Advanced: MCP Server config
                  <span style={{ fontSize: 10, color: "#888", fontWeight: "normal" }}>(for Claude Code / Claude Desktop)</span>
                </div>

                <div style={{ position: "relative" }}>
                  <textarea
                    readOnly
                    value={mcpConfig}
                    style={{
                      width: "100%",
                      height: 120,
                      fontFamily: "var(--font-pixel)",
                      fontSize: 10,
                      padding: 8,
                      background: "#111",
                      color: "#aaaaff",
                      border: "2px inset #888",
                      resize: "none",
                      lineHeight: 1.4,
                    }}
                  />
                  <button
                    className="win95-btn"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      fontSize: 11,
                      padding: "2px 10px",
                      background: copiedMcp ? "#00aa00" : undefined,
                      color: copiedMcp ? "white" : undefined,
                    }}
                    onClick={copyMcp}
                  >
                    {copiedMcp ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                  Add to your <code style={{ background: "#eee", padding: "0 3px" }}>claude_desktop_config.json</code> or Claude Code settings. MCP server package coming soon.
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>← Back</button></Link>
            <Link href="/arena"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>⚡ Arena Mode</button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
