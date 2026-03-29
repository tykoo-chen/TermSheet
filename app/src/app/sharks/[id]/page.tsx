"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";
import { authFetch } from "@/lib/auth-fetch";
import AuthGuard from "@/components/AuthGuard";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
}

const MAX_ROUNDS = 8;
const MAX_INPUT_TOKENS = 500; // ~375 English words
const SESSION_SECONDS = 5 * 60; // 5 minutes — default for timer init

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SharkProfile({ params }: { params: { id: string } }) {
  const shark = sharks.find((s) => s.id === params.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Rate limiting state
  const [blocked, setBlocked] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [roundsUsed, setRoundsUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputTokens = estimateTokens(input);
  const inputOverLimit = inputTokens > MAX_INPUT_TOKENS;

  // Backend session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Deal outcome: null | "invest" | "pass"
  const [dealOutcome, setDealOutcome] = useState<string | null>(null);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Check weekly limit from backend on mount and restore session state
  useEffect(() => {
    if (!shark) return;
    const checkRateLimit = async () => {
      try {
        const res = await authFetch(`/api/rate-limit/${shark.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.blocked) {
          setBlocked(true);
          return;
        }
        if (data.session_id) {
          setSessionId(data.session_id);
          setRoundsUsed(data.rounds_used ?? 0);
          setTimeLeft(data.time_left ?? SESSION_SECONDS);
          if (data.allowed && data.rounds_used > 0) {
            // Restore conversation history from backend so LLM context is preserved
            try {
              const msgRes = await authFetch(`/api/session/${data.session_id}/messages`);
              if (msgRes.ok) {
                const dbMsgs: { role: string; content: string }[] = await msgRes.json();
                const restored: Message[] = [
                  { role: "assistant", content: shark.greeting },
                ];
                for (const m of dbMsgs) {
                  restored.push({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                  });
                }
                setMessages(restored);
              }
            } catch { /* message restore failed — start with greeting only */ }
            setStarted(true);
          }
        }
      } catch {
        // Backend unreachable — stay on pre-pitch screen (backend will enforce on start)
      }
    };
    checkRateLimit();
  }, [shark]);

  // Countdown timer (starts when pitch starts)
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

  // End session when rounds used up
  useEffect(() => {
    if (roundsUsed >= MAX_ROUNDS) {
      setSessionEnded(true);
      clearInterval(timerRef.current!);
    }
  }, [roundsUsed]);

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
    try {
      const res = await authFetch(`/api/session/start`, {
        method: "POST",
        body: JSON.stringify({ shark_id: shark.id }),
      });
      if (res.status === 429) {
        setBlocked(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setSessionId(data.session_id);
      setTimeLeft(data.time_left);
      setRoundsUsed(data.rounds_used);
    } catch {
      // Backend unreachable — don't start (session must exist server-side)
      return;
    }
    setStarted(true);
    setMessages([{ role: "assistant", content: shark.greeting }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || sessionEnded || inputOverLimit) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setRoundsUsed((r) => r + 1);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const res = await authFetch(`/api/chat/stream`, {
        method: "POST",
        body: JSON.stringify({
          shark_id: shark.id,
          session_id: sessionId,
          messages: apiMessages,
        }),
      });

      if (res.status === 429) {
        setSessionEnded(true);
        clearInterval(timerRef.current!);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Add empty assistant message, then stream tokens into it
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: last.content + data.token };
                  }
                  return updated;
                });
              }
              if (data.deal) {
                setDealOutcome(data.deal);
                setSessionEnded(true);
                clearInterval(timerRef.current!);
              }
              if (data.done && data.session_id) {
                setSessionId(data.session_id);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sessionEnded || !sessionId) return;
    e.target.value = ""; // reset input

    setUploading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📎 Uploading: ${file.name}...` },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await authFetch(`/api/session/${sessionId}/upload-video`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.content.startsWith("📎 Uploading:")) {
            updated[updated.length - 1] = {
              ...last,
              content: `📎 Upload failed: ${err.detail || "Unknown error"}`,
            };
          }
          return updated;
        });
        setUploading(false);
        return;
      }

      const data = await res.json();
      const duration = Math.round(data.duration_seconds || 0);

      // Replace uploading message with transcript preview
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findLastIndex((m) => m.content.startsWith("📎 Uploading:"));
        if (idx >= 0) {
          const preview = data.transcript.length > 200
            ? data.transcript.slice(0, 200) + "..."
            : data.transcript;
          updated[idx] = {
            role: "user",
            content: `📎 ${file.name} (${duration}s) — transcribed:\n${preview}`,
            attachments: [file.name],
          };
        }
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.content.startsWith("📎 Uploading:")) {
          updated[updated.length - 1] = {
            ...last,
            content: "📎 Upload failed: connection error.",
          };
        }
        return updated;
      });
    }
    setUploading(false);
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
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: 16, marginBottom: 8 }}>
                  WEEKLY LIMIT REACHED
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  You've already pitched <strong>{shark.name}</strong> this week.<br />
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
    <AuthGuard>
    <div style={{ height: "calc(100vh - 30px)", padding: 8, display: "flex", gap: 8 }}>
      {/* Left: Investor Info */}
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {/* Profile */}
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
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{shark.title}</div>
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

        {/* Term Sheet */}
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
                borderBottom: "1px solid var(--win-border-mid)",
                fontSize: 11,
                alignItems: "center",
              }}>
                <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
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
              <span style={{ color: "var(--text-disabled)", fontFamily: "var(--font-pixel)", fontSize: 11 }}>0x1a2b...ef89</span>
            </div>

            {/* Track record */}
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-secondary)", marginBottom: 8 }}>
              {shark.dealsCompleted} deals · {shark.successRate}% success
            </div>

            {/* Quotes */}
            <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>Famous quotes:</div>
            <div className="inset-box" style={{ fontSize: 10, maxHeight: 120, overflowY: "auto", padding: 4, lineHeight: 1.4 }}>
              {shark.quotes.slice(0, 4).map((q, i) => (
                <div key={i} style={{ marginBottom: 4, fontStyle: "italic", color: "var(--text-secondary)" }}>
                  &ldquo;{q}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Chat Pitch Interface */}
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
            /* Pre-pitch state */
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ textAlign: "center", maxWidth: 360 }}>
                <svg viewBox="0 0 32 32" width="48" height="48" style={{ margin: "0 auto 12px" }}>
                  <path d="M16 2L2 30h28L16 2z" fill="yellow" stroke="#000" />
                  <path d="M15 10h2v10h-2zM15 24h2v2h-2z" fill="#000" />
                </svg>
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: 20, marginBottom: 8 }}>
                  Ready to pitch {shark.name}?
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  You&apos;ll have a conversation to describe your project.<br />
                  No forms — just talk naturally and attach files.<br />
                  If {shark.name} accepts, ${shark.stakedAmount.toLocaleString()} goes to your wallet.
                </p>
                {/* Session limits info */}
                <div className="inset-box" style={{ fontSize: 11, padding: 8, marginBottom: 16, textAlign: "left", lineHeight: 1.8 }}>
                  <div>⏱ <strong>Session limit:</strong> 5 minutes</div>
                  <div>💬 <strong>Message rounds:</strong> {MAX_ROUNDS} max</div>
                  <div>📝 <strong>Per message:</strong> ~500 tokens (~375 words)</div>
                  <div>📅 <strong>Frequency:</strong> 1 pitch per investor per week</div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button className="win95-btn win95-btn-default" style={{ fontWeight: "bold", fontSize: 13, padding: "6px 20px" }} onClick={startPitch}>
                    Start Pitch →
                  </button>
                  <Link href="/"><button className="win95-btn" style={{ fontSize: 13, padding: "6px 20px" }}>Back</button></Link>
                </div>
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
                    <span style={{
                      color: msg.role === "user" ? "yellow" : "cyan",
                      fontWeight: "bold",
                    }}>
                      {msg.role === "user" ? "YOU" : shark.name.split(" ")[0].toUpperCase()}:
                    </span>
                    <br />
                    <span style={{
                      color: msg.role === "user" ? "white" : "lime",
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </span>
                  </div>
                ))}
                {loading && <span className="blink" style={{ color: "cyan" }}>▌ {shark.name.split(" ")[0]} is typing...</span>}
                {sessionEnded && (
                  <div style={{ marginTop: 12, fontWeight: "bold", padding: 4 }}>
                    {dealOutcome === "invest" ? (
                      <div style={{
                        color: "lime",
                        background: "#001a00",
                        padding: 8,
                        boxShadow: "inset -1px -1px #003300, inset 1px 1px lime, inset -2px -2px #001a00, inset 2px 2px #00aa00",
                      }}>
                        ═══ DEAL CONFIRMED ═══<br />
                        {shark.name} is investing ${shark.stakedAmount.toLocaleString()}!<br />
                        Send your USDC wallet address below to receive the funds.
                      </div>
                    ) : dealOutcome === "pass" ? (
                      <div style={{
                        color: "#ff6666",
                        background: "#1a0000",
                        padding: 8,
                        boxShadow: "inset -1px -1px #330000, inset 1px 1px #cc0000, inset -2px -2px #1a0000, inset 2px 2px #880000",
                      }}>
                        ═══ DEAL PASSED ═══<br />
                        {shark.name} has passed on your pitch. Come back next week.
                      </div>
                    ) : (
                      <div style={{
                        color: "#ff6666",
                        background: "#1a0000",
                        padding: 8,
                        boxShadow: "inset -1px -1px #330000, inset 1px 1px #cc0000, inset -2px -2px #1a0000, inset 2px 2px #880000",
                      }}>
                        ── SESSION ENDED ── Come back next week to pitch again.
                      </div>
                    )}
                  </div>
                )}
                <span className="blink" style={{ color: "lime" }}>█</span>
              </div>

              {/* Input area */}
              {!sessionEnded ? (
                <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,audio/*,.mp4,.mov,.webm,.m4a,.mp3,.wav,.ogg"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    <button
                      className="win95-btn"
                      style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || loading || sessionEnded}
                      title="Upload video/audio for transcription"
                    >
                      {uploading ? "⏳" : "📎"}
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
                        ...(inputOverLimit ? {
                          boxShadow: "inset -1px -1px var(--btn-highlight), inset 1px 1px red, inset -2px -2px var(--win-border-mid), inset 2px 2px red",
                        } : {}),
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
              ) : (
                <div style={{ padding: 8, textAlign: "center" }}>
                  <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "6px 20px" }}>← Back to Investors</button></Link>
                </div>
              )}
            </>
          )}

          {/* Status bar */}
          <div style={{ borderTop: "1px solid var(--win-border-dark)", borderBottom: "1px solid var(--win-border-mid)", padding: "2px 4px", margin: "0 1px 1px", display: "flex", gap: 6 }}>
            <div className="status-bar-segment" style={{ fontSize: 11, flex: 1 }}>
              {!started
                ? "Ready"
                : sessionEnded
                ? "Session ended"
                : loading
                ? `${shark.name} is thinking...`
                : `${messages.filter(m => m.role === "user").length} message(s) sent`}
            </div>
            {started && !sessionEnded && (
              <>
                <div className="status-bar-segment" style={{
                  fontSize: 11,
                  color: timeLeft <= 60 ? "red" : "inherit",
                  fontWeight: timeLeft <= 60 ? "bold" : "normal",
                }}>
                  ⏱ {formatTime(timeLeft)}
                </div>
                <div className="status-bar-segment" style={{
                  fontSize: 11,
                  color: roundsUsed >= MAX_ROUNDS - 2 ? "red" : "inherit",
                }}>
                  💬 {MAX_ROUNDS - roundsUsed} rounds left
                </div>
              </>
            )}
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              Prize: ${shark.stakedAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
