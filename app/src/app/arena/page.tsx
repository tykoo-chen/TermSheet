"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VCState {
  sharkId: string;
  name: string;
  avatar: string;
  messages: Message[];
  loading: boolean;
  score: number;
  decision: "PENDING" | "ACCEPT" | "REJECT";
  sessionId: string;
  roundNumber: number;
  stakedAmount: number;
  settled: boolean;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#00ff00" : score >= 45 ? "#ffff00" : "#ff4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ flex: 1, height: 5, background: "#111", border: "1px solid #333" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: "bold", minWidth: 16, textAlign: "right" }}>{score}</span>
    </div>
  );
}

// Ticker messages to simulate platform activity
const TICKER_MSGS = [
  "founder @0xab12 just entered Garry's room",
  "Marc accepted a $10K deal — AI infra, pre-seed",
  "Chamath: \"show me the unit economics\"",
  "new pitch session started",
  "Garry just rejected a SaaS clone",
  "settlement confirmed — $5,000 USDC on Base",
  "3 founders waiting in queue",
  "Marc is typing...",
  "YC batch W26 — 47% AI companies",
  "Chamath: \"I've seen this before — pass\"",
];

export default function ArenaPage() {
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [vcStates, setVcStates] = useState<VCState[]>([]);
  const [ticker, setTicker] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const chatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate ticker every 4s
  useEffect(() => {
    const id = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setTicker((t) => (t + 1) % TICKER_MSGS.length);
        setTickerVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Init VC states
  useEffect(() => {
    setVcStates(
      sharks.map((s) => ({
        sharkId: s.id,
        name: s.name,
        avatar: s.avatar,
        messages: [],
        loading: false,
        score: 0,
        decision: "PENDING",
        sessionId: crypto.randomUUID(),
        roundNumber: 0,
        stakedAmount: s.stakedAmount,
        settled: false,
      }))
    );
  }, []);

  // Auto-scroll each chat
  useEffect(() => {
    chatRefs.current.forEach((ref) => {
      if (ref) ref.scrollTop = ref.scrollHeight;
    });
  }, [vcStates]);

  const updateVC = useCallback((sharkId: string, patch: Partial<VCState>) => {
    setVcStates((prev) =>
      prev.map((vc) => (vc.sharkId === sharkId ? { ...vc, ...patch } : vc))
    );
  }, []);

  const startArena = async () => {
    setStarted(true);
    setVcStates((prev) => prev.map((vc) => ({ ...vc, loading: true })));

    await Promise.allSettled(
      sharks.map(async (shark, i) => {
        const sessionId = vcStates[i]?.sessionId || crypto.randomUUID();
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sharkId: shark.id,
              sessionId,
              roundNumber: 0,
              messages: [
                {
                  role: "user",
                  content:
                    "A founder just entered your pitch room. Welcome them in character — very briefly (1 sentence). Ask what they're building.",
                },
              ],
            }),
          });
          const data = await res.json();
          updateVC(shark.id, {
            messages: [{ role: "assistant", content: data.reply || "What are you building?" }],
            loading: false,
            score: data.score ?? 0,
          });
        } catch {
          updateVC(shark.id, {
            messages: [{ role: "assistant", content: "What are you building?" }],
            loading: false,
          });
        }
      })
    );
  };

  const sendToAll = async () => {
    const trimmed = input.trim();
    if (!trimmed || vcStates.every((v) => v.loading)) return;
    setInput("");

    const snapshot = vcStates;
    setVcStates((prev) =>
      prev.map((vc) =>
        vc.decision === "PENDING"
          ? {
              ...vc,
              messages: [...vc.messages, { role: "user" as const, content: trimmed }],
              loading: true,
              roundNumber: vc.roundNumber + 1,
            }
          : vc
      )
    );

    await Promise.allSettled(
      snapshot
        .filter((vc) => vc.decision === "PENDING")
        .map(async (vc) => {
          const nextMessages = [
            ...vc.messages,
            { role: "user" as const, content: trimmed },
          ].map((m) => ({ role: m.role, content: m.content }));

          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sharkId: vc.sharkId,
                sessionId: vc.sessionId,
                roundNumber: vc.roundNumber + 1,
                messages: nextMessages,
              }),
            });
            const data = await res.json();
            updateVC(vc.sharkId, {
              messages: [
                ...vc.messages,
                { role: "user", content: trimmed },
                { role: "assistant", content: data.reply || "..." },
              ],
              loading: false,
              score: typeof data.score === "number" ? data.score : vc.score,
              decision: data.decision ?? vc.decision,
            });
          } catch {
            updateVC(vc.sharkId, {
              messages: [
                ...vc.messages,
                { role: "user", content: trimmed },
                { role: "assistant", content: "Network error." },
              ],
              loading: false,
            });
          }
        })
    );
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendToAll();
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name);
    let content = `📎 Attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (isText && file.size < 40000) {
      const text = await file.text();
      content = `📎 Attached: ${file.name}\n\n${text.slice(0, 1500)}`;
    }
    setInput((prev) => (prev ? prev + "\n" + content : content));
  };

  const anyLoading = vcStates.some((v) => v.loading && v.decision === "PENDING");
  const activeCount = vcStates.filter((v) => v.decision === "PENDING").length;
  const acceptCount = vcStates.filter((v) => v.decision === "ACCEPT").length;

  const windowBorderColor = (d: "PENDING" | "ACCEPT" | "REJECT") =>
    d === "ACCEPT" ? "lime" : d === "REJECT" ? "#660000" : "#999";

  const windowBg = (d: "PENDING" | "ACCEPT" | "REJECT") =>
    d === "REJECT" ? "#0a0000" : "var(--win-bg)";

  return (
    <div
      style={{
        height: "calc(100vh - 30px)",
        display: "flex",
        flexDirection: "column",
        padding: 6,
        gap: 4,
        background: "#000",
      }}
    >
      {/* Ticker tape */}
      <div
        style={{
          background: "#000080",
          padding: "2px 10px",
          fontSize: 10,
          color: "white",
          fontFamily: "var(--font-pixel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          height: 18,
          overflow: "hidden",
        }}
      >
        <span style={{ color: "yellow", flexShrink: 0 }}>LIVE ●</span>
        <span
          style={{
            opacity: tickerVisible ? 1 : 0,
            transition: "opacity 0.3s",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {TICKER_MSGS[ticker]}
        </span>
        <span style={{ marginLeft: "auto", flexShrink: 0, color: "#aaf" }}>
          {acceptCount > 0 ? `${acceptCount} accepted · ` : ""}{activeCount} active sessions
        </span>
      </div>

      {/* Header */}
      <div className="win95-window" style={{ flexShrink: 0 }}>
        <div className="win95-title-bar">
          <span>⚡ TermSheet Arena — Simultaneous Pitch Sessions</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>
        <div style={{ padding: "3px 8px", display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
          <span style={{ color: "#555" }}>
            One message → delivered to all 3 VCs at once. Each conversation is independent.
          </span>
          <Link href="/" style={{ marginLeft: "auto" }}>
            <button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px" }}>← Back</button>
          </Link>
        </div>
      </div>

      {/* 3 VC Windows */}
      <div style={{ flex: 1, display: "flex", gap: 5, minHeight: 0 }}>
        {vcStates.map((vc, i) => (
          <div
            key={vc.sharkId}
            className="win95-window"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              border: `2px solid ${windowBorderColor(vc.decision)}`,
              background: windowBg(vc.decision),
              position: "relative",
              transition: "border-color 0.4s",
            }}
          >
            {/* ACCEPT glow overlay */}
            {vc.decision === "ACCEPT" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "3px solid lime",
                  pointerEvents: "none",
                  zIndex: 10,
                  boxShadow: "inset 0 0 20px rgba(0,255,0,0.15)",
                }}
              />
            )}

            {/* Title bar */}
            <div
              className="win95-title-bar"
              style={{
                fontSize: 11,
                flexShrink: 0,
                background: vc.decision === "ACCEPT"
                  ? "#006600"
                  : vc.decision === "REJECT"
                  ? "#660000"
                  : undefined,
              }}
            >
              <span>{vc.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {vc.loading && (
                  <span
                    className="blink"
                    style={{ fontSize: 9, color: "cyan", fontFamily: "var(--font-pixel)" }}
                  >
                    TYPING
                  </span>
                )}
                {vc.decision === "ACCEPT" && (
                  <span style={{ fontSize: 9, color: "lime", fontWeight: "bold" }}>✓ IN</span>
                )}
                {vc.decision === "REJECT" && (
                  <span style={{ fontSize: 9, color: "#ff4444", fontWeight: "bold" }}>✗ PASS</span>
                )}
              </div>
            </div>

            {/* VC info strip */}
            <div
              style={{
                padding: "4px 8px",
                borderBottom: "1px solid #555",
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexShrink: 0,
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 2,
                  border: "1px inset #888",
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#555",
                }}
              >
                <img
                  src={vc.avatar}
                  alt={vc.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text-dark)",
                  }}
                >
                  {vc.name}
                </div>
                <ScoreBar score={vc.score} />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "lime",
                  fontFamily: "var(--font-pixel)",
                  fontWeight: "bold",
                  flexShrink: 0,
                }}
              >
                ${vc.stakedAmount.toLocaleString()}
              </div>
            </div>

            {/* Chat area */}
            <div
              ref={(el) => { chatRefs.current[i] = el; }}
              className="inset-box"
              style={{
                flex: 1,
                margin: 4,
                overflow: "auto",
                background: "#000",
                fontFamily: "var(--font-pixel)",
                fontSize: 11,
                padding: 6,
                minHeight: 0,
                lineHeight: 1.5,
              }}
            >
              {!started ? (
                <span style={{ color: "#333" }}>— awaiting session start —</span>
              ) : (
                <>
                  {vc.messages.map((msg, mi) => (
                    <div key={mi} style={{ marginBottom: 8 }}>
                      <span
                        style={{
                          color: msg.role === "user" ? "#ffff00" : "#00ffff",
                          fontWeight: "bold",
                          fontSize: 9,
                          letterSpacing: 1,
                        }}
                      >
                        {msg.role === "user" ? "YOU" : vc.name.split(" ")[0].toUpperCase()}:
                      </span>
                      <br />
                      <span
                        style={{
                          color: msg.role === "user" ? "#fff" : "#00ff88",
                          whiteSpace: "pre-wrap",
                          fontSize: 11,
                        }}
                      >
                        {msg.content}
                      </span>
                    </div>
                  ))}
                  {vc.loading && (
                    <div style={{ color: "#00ffff", fontSize: 10 }}>
                      <span className="blink">▌</span>
                    </div>
                  )}
                  {vc.decision === "ACCEPT" && !vc.settled && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 6,
                        border: "1px solid lime",
                        background: "#001a00",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "lime", fontSize: 10, marginBottom: 6, fontWeight: "bold" }}>
                        ── ACCEPTED ──
                      </div>
                      <button
                        className="win95-btn"
                        style={{ fontSize: 10, padding: "3px 12px", fontWeight: "bold" }}
                        onClick={() => updateVC(vc.sharkId, { settled: true })}
                      >
                        Claim ${vc.stakedAmount.toLocaleString()} USDC →
                      </button>
                    </div>
                  )}
                  {vc.decision === "ACCEPT" && vc.settled && (
                    <div style={{ marginTop: 8, color: "lime", fontSize: 10, fontWeight: "bold" }}>
                      ✓ Settlement initiated
                    </div>
                  )}
                  {vc.decision === "REJECT" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 4,
                        border: "1px solid #660000",
                        fontSize: 10,
                        color: "#ff4444",
                      }}
                    >
                      ── PASSED ──
                    </div>
                  )}
                  <span className="blink" style={{ color: "#111" }}>█</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shared input */}
      <div className="win95-window" style={{ flexShrink: 0 }}>
        <div style={{ padding: "4px 6px" }}>
          {!started ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <button
                className="win95-btn"
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  padding: "8px 40px",
                  background: "#000080",
                  color: "white",
                  border: "2px outset #4444ff",
                }}
                onClick={startArena}
              >
                ⚡ Start Simultaneous Pitch
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.txt,.md,.csv,.json,.doc,.docx"
                onChange={handleFileChange}
              />
              <button
                className="win95-btn"
                style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                onClick={handleFileClick}
                title="Attach file"
              >
                📎
              </button>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <textarea
                  className="inset-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={
                    anyLoading
                      ? "VCs are responding..."
                      : activeCount === 0
                      ? "All sessions concluded."
                      : `Message broadcasts to ${activeCount} active VC${activeCount > 1 ? "s" : ""} · Enter to send`
                  }
                  disabled={anyLoading || activeCount === 0}
                  style={{
                    width: "100%",
                    resize: "none",
                    height: 38,
                    fontFamily: "inherit",
                    fontSize: 12,
                    opacity: anyLoading ? 0.7 : 1,
                  }}
                />
                <div style={{ fontSize: 10, color: "#888", display: "flex", gap: 8 }}>
                  {vcStates.map((vc) => (
                    <span key={vc.sharkId} style={{ color: vc.decision === "ACCEPT" ? "lime" : vc.decision === "REJECT" ? "#ff4444" : vc.loading ? "cyan" : "#555" }}>
                      {vc.loading ? "▌" : vc.decision === "ACCEPT" ? "✓" : vc.decision === "REJECT" ? "✗" : "○"} {vc.name.split(" ")[0]}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="win95-btn"
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  padding: "8px 14px",
                  flexShrink: 0,
                  opacity: anyLoading || !input.trim() || activeCount === 0 ? 0.4 : 1,
                }}
                onClick={sendToAll}
                disabled={anyLoading || !input.trim() || activeCount === 0}
              >
                Broadcast →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
