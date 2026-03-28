"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";
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

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
}

const SESSION_SECONDS = 5 * 60;
const MAX_INPUT_TOKENS = 500;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function getWeekKey(sharkId: string): string {
  const now = new Date();
  const weekNum = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  return `termsheet-pitch-${sharkId}-week-${weekNum}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "lime" : score >= 45 ? "yellow" : "red";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 60, height: 8, background: "#333", border: "1px inset #666", borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: "bold" }}>{score}</span>
    </div>
  );
}

export default function SharkProfile({ params }: { params: { id: string } }) {
  const shark = sharks.find((s) => s.id === params.id);
  const account = useActiveAccount();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Session identity
  const sessionIdRef = useRef<string>("");
  const [roundNumber, setRoundNumber] = useState(0);

  // Rate limiting state
  const [blocked] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI scoring state
  const [score, setScore] = useState(0);
  const [decision, setDecision] = useState<"PENDING" | "ACCEPT" | "REJECT">("PENDING");
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  // Settlement modal state
  const [showSettle, setShowSettle] = useState(false);
  const [founderWallet, setFounderWallet] = useState("");
  const [settling, setSettling] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);

  const inputTokens = estimateTokens(input);
  const inputOverLimit = inputTokens > MAX_INPUT_TOKENS;

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, showSettle]);

  // Check weekly limit on mount (disabled for dev/testing)
  // useEffect(() => {
  //   if (!shark) return;
  //   const key = getWeekKey(shark.id);
  //   if (localStorage.getItem(key) === "1") {
  //     setBlocked(true);
  //   }
  // }, [shark]);

  // Countdown timer
  useEffect(() => {
    if (!started || sessionEnded) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setSessionEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [started, sessionEnded]);

  // Show settlement modal when AI accepts; auto-fill connected wallet
  useEffect(() => {
    if (decision === "ACCEPT") {
      clearInterval(timerRef.current!);
      setSessionEnded(true);
      if (account?.address) setFounderWallet(account.address);
      setShowSettle(true);
    }
    if (decision === "REJECT") {
      clearInterval(timerRef.current!);
      setSessionEnded(true);
    }
  }, [decision, account]);

  if (!shark) {
    return (
      <div style={{ height: "calc(100vh - 30px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="win95-window" style={{ width: 300 }}>
          <div className="win95-title-bar"><span>Error</span></div>
          <div style={{ padding: 16, textAlign: "center", fontSize: 12 }}>
            Investor not found.
            <br /><br />
            <Link href="/"><button className="win95-btn">OK</button></Link>
          </div>
        </div>
      </div>
    );
  }

  const startPitch = async () => {
    if (blocked) return;
    sessionIdRef.current = crypto.randomUUID();
    localStorage.setItem(getWeekKey(shark.id), "1");
    setStarted(true);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharkId: shark.id,
          sessionId: sessionIdRef.current,
          roundNumber: 0,
          messages: [
            { role: "user", content: "A founder has just entered your pitch room. Introduce yourself in character and ask them what they're building. Keep it to 2-3 sentences. Reference one of your famous quotes." },
          ],
        }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.reply || "What are you building? Tell me." }]);
    } catch {
      setMessages([{ role: "assistant", content: `Pitch session with ${shark.name}. What are you building?` }]);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || sessionEnded || inputOverLimit) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    const nextRound = roundNumber + 1;
    setRoundNumber(nextRound);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharkId: shark.id,
          sessionId: sessionIdRef.current,
          roundNumber: nextRound,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "..." }]);
      if (typeof data.score === "number") setScore(data.score);
      if (data.decision) setDecision(data.decision);
      if (data.rejectReason) setRejectReason(data.rejectReason);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileDrop = () => {
    if (sessionEnded) return;
    const fileName = "pitch_deck_v3.pdf";
    const userMsg: Message = { role: "user", content: `📎 Attached: ${fileName}`, attachments: [fileName] };
    const nextRound = roundNumber + 1;
    setRoundNumber(nextRound);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharkId: shark.id,
        sessionId: sessionIdRef.current,
        roundNumber: nextRound,
        messages: [...messages, userMsg].map((m) => ({
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Got it." }]);
        if (typeof data.score === "number") setScore(data.score);
        if (data.decision) setDecision(data.decision);
        if (data.rejectReason) setRejectReason(data.rejectReason);
      })
      .catch(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: "File received. Continue your pitch." }]);
      })
      .finally(() => setLoading(false));
  };

  const handleSettle = async () => {
    if (!founderWallet || settling) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(founderWallet)) {
      setSettleError("Invalid wallet address. Must be a valid 0x... EVM address.");
      return;
    }
    setSettling(true);
    setSettleError(null);
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          sharkId: shark.id,
          founderWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettleError(data.error || "Settlement failed.");
      } else {
        setTxHash(data.txHash);
      }
    } catch {
      setSettleError("Network error. Please try again.");
    }
    setSettling(false);
  };

  // --- Blocked: already pitched this week ---
  if (blocked) {
    return (
      <div style={{ height: "calc(100vh - 30px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
        <div className="win95-window" style={{ width: 420 }}>
          <div className="win95-title-bar">
            <span>Access Denied — Rate Limit</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <svg viewBox="0 0 32 32" width="40" height="40" style={{ flexShrink: 0 }}>
                <circle cx="16" cy="16" r="14" fill="red" stroke="#800" />
                <path d="M11 11l10 10M21 11l-10 10" stroke="white" strokeWidth="3" />
              </svg>
              <div>
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: 16, marginBottom: 8 }}>WEEKLY LIMIT REACHED</p>
                <p style={{ fontSize: 12, color: "#444", lineHeight: 1.6 }}>
                  You&apos;ve already pitched <strong>{shark.name}</strong> this week.<br />
                  Each investor allows <strong>1 pitch per week</strong>.<br /><br />
                  Come back next week to try again.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Link href="/"><button className="win95-btn" style={{ width: 120 }}>← Back</button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8, display: "flex", gap: 8 }}>
      {/* Left: Investor Info */}
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <div className="win95-window">
          <div className="win95-title-bar" style={{ fontSize: 11 }}>
            <span>{shark.name}</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
            </div>
          </div>
          <div style={{ padding: 8 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <img
                src={shark.avatar}
                alt={shark.name}
                style={{ width: 48, height: 48, borderRadius: 4, border: "2px inset", objectFit: "cover", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: "bold", fontSize: 13 }}>{shark.name}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{shark.title}</div>
                <div className="blink" style={{ fontSize: 10, color: "green", fontWeight: "bold", marginTop: 2 }}>
                  AWAITING PITCH
                </div>
              </div>
            </div>
            <div className="inset-box" style={{ fontFamily: "var(--font-pixel)", fontSize: 12, padding: 6, lineHeight: 1.4 }}>
              {shark.thesis}
            </div>
          </div>
        </div>

        <div className="win95-window" style={{ flex: 1 }}>
          <div className="win95-title-bar" style={{ fontSize: 11 }}>
            <span>Term Sheet</span>
          </div>
          <div style={{ padding: 8 }}>
            {(([
              { label: "Staked", value: `$${shark.stakedAmount.toLocaleString()}`, color: "green" as const, big: true },
              { label: "Valuation", value: shark.valuationRange, color: "" as const, big: false },
              { label: "Deal Type", value: shark.dealType, color: "" as const, big: false },
              { label: "Stage", value: shark.stage, color: "" as const, big: false },
              { label: "Sectors", value: shark.sectors.join(", "), color: "" as const, big: false },
            ] as { label: string; value: string; color: "green" | ""; big: boolean }[])).map((item) => (
              <div key={item.label} style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                borderBottom: "1px solid #ddd",
                fontSize: 11,
                alignItems: "center",
              }}>
                <span style={{ color: "#666" }}>{item.label}</span>
                <span style={{
                  fontWeight: "bold",
                  color: item.color || "var(--text-dark)",
                  fontFamily: item.big ? "var(--font-pixel)" : "inherit",
                  fontSize: item.big ? 16 : 11,
                }}>
                  {item.value}
                </span>
              </div>
            ))}

            <div className="inset-box" style={{ marginTop: 8, fontSize: 10, padding: 4 }}>
              <span style={{ color: "green", fontWeight: "bold" }}>✓ On-Chain Verified</span>
              {" · "}
              <span style={{ color: "#888", fontFamily: "var(--font-pixel)", fontSize: 11 }}>0x1a2b...ef89</span>
            </div>

            <div style={{ marginTop: 8, fontSize: 10, color: "#666", marginBottom: 8 }}>
              {shark.dealsCompleted} deals · {shark.successRate}% success
            </div>

            <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>Famous quotes:</div>
            <div className="inset-box" style={{ fontSize: 10, maxHeight: 120, overflowY: "auto", padding: 4, lineHeight: 1.4 }}>
              {shark.quotes.slice(0, 4).map((q, i) => (
                <div key={i} style={{ marginBottom: 4, fontStyle: "italic", color: "#444" }}>
                  &ldquo;{q}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="win95-window" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="win95-title-bar">
            <span>Pitch to {shark.name} — ${shark.stakedAmount.toLocaleString()} available</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div className="sys-btn">_</div>
              <div className="sys-btn">□</div>
              <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
            </div>
          </div>

          {!started ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ textAlign: "center", maxWidth: 360 }}>
                <svg viewBox="0 0 32 32" width="48" height="48" style={{ margin: "0 auto 12px" }}>
                  <path d="M16 2L2 30h28L16 2z" fill="yellow" stroke="#000" />
                  <path d="M15 10h2v10h-2zM15 24h2v2h-2z" fill="#000" />
                </svg>
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: 20, marginBottom: 8 }}>
                  Ready to pitch {shark.name}?
                </p>
                <p style={{ fontSize: 12, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>
                  You&apos;ll have a conversation to describe your project.<br />
                  No forms — just talk naturally and attach files.<br />
                  If {shark.name} accepts, ${shark.stakedAmount.toLocaleString()} USDC goes to your wallet.
                </p>
                <div className="inset-box" style={{ fontSize: 11, padding: 8, marginBottom: 16, textAlign: "left", lineHeight: 1.8 }}>
                  <div>⏱ <strong>Session limit:</strong> 5 minutes</div>
                  <div>📝 <strong>Per message:</strong> ~500 tokens (~375 words)</div>
                  <div>📅 <strong>Frequency:</strong> 1 pitch per investor per week</div>
                  <div>💰 <strong>Settlement:</strong> USDC on Base (on-chain)</div>
                </div>
                {!client || account ? (
                  <div>
                    {account && (
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 8, fontFamily: "var(--font-pixel)" }}>
                        ✓ Signed in as {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button className="win95-btn" style={{ fontWeight: "bold", fontSize: 13, padding: "6px 20px" }} onClick={startPitch}>
                        Start Pitch →
                      </button>
                      <Link href="/"><button className="win95-btn" style={{ fontSize: 13, padding: "6px 20px" }}>Back</button></Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 11, color: "#c00", marginBottom: 10, fontWeight: "bold" }}>
                      ⚠ Sign in to pitch and receive USDC if accepted
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                      <ConnectButton
                        client={client!}
                        wallets={wallets}
                        chain={base}
                        connectButton={{ label: "Sign In to Pitch →" }}
                      />
                    </div>
                    <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>Back</button></Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat messages */}
              <div
                ref={chatRef}
                className="inset-box"
                style={{
                  flex: 1,
                  margin: 4,
                  overflow: "auto",
                  background: "black",
                  fontFamily: "var(--font-pixel)",
                  fontSize: 14,
                  padding: 8,
                }}
              >
                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span style={{ color: msg.role === "user" ? "yellow" : "cyan", fontWeight: "bold" }}>
                      {msg.role === "user" ? "YOU" : shark.name.split(" ")[0].toUpperCase()}:
                    </span>
                    <br />
                    <span style={{ color: msg.role === "user" ? "white" : "lime", whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </span>
                  </div>
                ))}
                {loading && <span style={{ color: "cyan" }}>typing...</span>}
                {decision === "REJECT" && sessionEnded && (
                  <div style={{ marginTop: 12, padding: 8, border: "1px solid red", background: "#1a0000" }}>
                    <div style={{ color: "red", fontWeight: "bold", marginBottom: 4 }}>── PITCH REJECTED ──</div>
                    {rejectReason && <div style={{ color: "#ff6666", fontSize: 12 }}>{rejectReason}</div>}
                    <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>Come back next week to try again.</div>
                  </div>
                )}
                {decision !== "ACCEPT" && decision !== "REJECT" && sessionEnded && (
                  <div style={{ color: "red", marginTop: 8, fontWeight: "bold" }}>
                    ── TIME&apos;S UP ── Session ended. Come back next week.
                  </div>
                )}
                <span className="blink" style={{ color: "lime" }}>█</span>
              </div>

              {/* Input area */}
              {!sessionEnded ? (
                <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
                    <button
                      className="win95-btn"
                      style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                      onClick={handleFileDrop}
                      title="Attach a file"
                    >
                      📎
                    </button>
                    <textarea
                      className="inset-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your project... (Enter to send)"
                      style={{
                        flex: 1,
                        resize: "none",
                        height: 36,
                        fontFamily: "inherit",
                        fontSize: 12,
                        border: inputOverLimit ? "2px solid red" : undefined,
                      }}
                    />
                    <button
                      className="win95-btn"
                      style={{ fontSize: 11, padding: "4px 12px", fontWeight: "bold", flexShrink: 0, opacity: inputOverLimit ? 0.5 : 1 }}
                      onClick={sendMessage}
                      disabled={inputOverLimit}
                    >
                      Send →
                    </button>
                  </div>
                  {inputOverLimit && (
                    <div style={{ fontSize: 10, color: "red", paddingLeft: 4 }}>
                      ⚠ Message too long ({inputTokens} / {MAX_INPUT_TOKENS} tokens). Please shorten your message.
                    </div>
                  )}
                </div>
              ) : decision === "ACCEPT" ? (
                <div style={{ padding: 8, textAlign: "center" }}>
                  <button
                    className="win95-btn"
                    style={{ fontSize: 12, padding: "6px 20px", fontWeight: "bold", background: "#00aa00", color: "white" }}
                    onClick={() => setShowSettle(true)}
                  >
                    💰 Claim ${shark.stakedAmount.toLocaleString()} USDC →
                  </button>
                </div>
              ) : (
                <div style={{ padding: 8, textAlign: "center" }}>
                  <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "6px 20px" }}>← Back to Investors</button></Link>
                </div>
              )}
            </>
          )}

          {/* Status bar */}
          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 6, alignItems: "center" }}>
            <div className="status-bar-segment" style={{ fontSize: 11, flex: 1 }}>
              {!started
                ? "Ready"
                : decision === "ACCEPT"
                ? "✓ ACCEPTED — claim your USDC"
                : decision === "REJECT"
                ? "✗ Rejected"
                : sessionEnded
                ? "Session ended"
                : loading
                ? `${shark.name} is thinking...`
                : `Round ${roundNumber}`}
            </div>
            {started && score > 0 && (
              <div className="status-bar-segment" style={{ fontSize: 11 }}>
                <ScoreBar score={score} />
              </div>
            )}
            {started && !sessionEnded && (
              <div className="status-bar-segment" style={{
                fontSize: 11,
                color: timeLeft <= 60 ? "red" : "inherit",
                fontWeight: timeLeft <= 60 ? "bold" : "normal",
              }}>
                ⏱ {formatTime(timeLeft)}
              </div>
            )}
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              Prize: ${shark.stakedAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Modal */}
      {showSettle && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div className="win95-window" style={{ width: 440 }}>
            <div className="win95-title-bar">
              <span>💰 Claim Your USDC — Settlement</span>
              {!txHash && (
                <div style={{ display: "flex", gap: 2 }}>
                  <div className="sys-btn" style={{ cursor: "pointer" }} onClick={() => setShowSettle(false)}>X</div>
                </div>
              )}
            </div>
            <div style={{ padding: 20 }}>
              {!txHash ? (
                <>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                    <svg viewBox="0 0 32 32" width="40" height="40" style={{ flexShrink: 0 }}>
                      <circle cx="16" cy="16" r="14" fill="#00aa00" stroke="#006600" />
                      <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="3" fill="none" />
                    </svg>
                    <div>
                      <p style={{ fontFamily: "var(--font-pixel)", fontSize: 15, marginBottom: 6, color: "green" }}>
                        {shark.name} accepted your pitch!
                      </p>
                      <p style={{ fontSize: 12, color: "#444", lineHeight: 1.6 }}>
                        <strong>${shark.stakedAmount.toLocaleString()} USDC</strong> will be transferred on Base.<br />
                        Enter your wallet address to receive it on-chain.
                      </p>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 4, fontWeight: "bold" }}>
                      Your EVM Wallet Address (Base):
                    </label>
                    <input
                      className="inset-input"
                      value={founderWallet}
                      onChange={(e) => { setFounderWallet(e.target.value); setSettleError(null); }}
                      placeholder="0x..."
                      style={{ width: "100%", fontSize: 12, padding: "4px 6px", fontFamily: "var(--font-pixel)" }}
                    />
                    {settleError && (
                      <div style={{ fontSize: 11, color: "red", marginTop: 4 }}>⚠ {settleError}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>
                    Make sure this is your address on the <strong>Base</strong> network. USDC transfers are irreversible.
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button
                      className="win95-btn"
                      style={{ fontWeight: "bold", fontSize: 13, padding: "6px 24px", opacity: settling ? 0.6 : 1 }}
                      onClick={handleSettle}
                      disabled={settling || !founderWallet}
                    >
                      {settling ? "Sending..." : `Send $${shark.stakedAmount.toLocaleString()} USDC →`}
                    </button>
                    <button className="win95-btn" style={{ fontSize: 12, padding: "6px 16px" }} onClick={() => setShowSettle(false)} disabled={settling}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <svg viewBox="0 0 32 32" width="56" height="56" style={{ margin: "0 auto 12px" }}>
                    <circle cx="16" cy="16" r="14" fill="#00aa00" stroke="#006600" />
                    <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="3" fill="none" />
                  </svg>
                  <p style={{ fontFamily: "var(--font-pixel)", fontSize: 16, marginBottom: 8, color: "green" }}>
                    USDC SENT!
                  </p>
                  <p style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>
                    <strong>${shark.stakedAmount.toLocaleString()} USDC</strong> is on its way to your wallet.
                  </p>
                  <div className="inset-box" style={{ fontSize: 10, padding: 8, marginBottom: 12, wordBreak: "break-all", fontFamily: "var(--font-pixel)" }}>
                    Tx: {txHash}
                  </div>
                  <Link href="/">
                    <button className="win95-btn" style={{ fontSize: 12, padding: "6px 20px" }}>← Back to Investors</button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
