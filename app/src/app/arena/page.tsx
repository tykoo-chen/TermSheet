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
  title: string;
  messages: Message[];
  loading: boolean;
  score: number;
  decision: "PENDING" | "ACCEPT" | "REJECT";
  sessionId: string;
  roundNumber: number;
  stakedAmount: number;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "lime" : score >= 45 ? "yellow" : "red";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ flex: 1, height: 6, background: "#222", border: "1px inset #555" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: "bold", minWidth: 18 }}>{score}</span>
    </div>
  );
}

const PANEL_SHARKS = sharks; // all 3

export default function ArenaPage() {
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [vcStates, setVcStates] = useState<VCState[]>([]);
  const chatRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Init VC states
  useEffect(() => {
    setVcStates(
      PANEL_SHARKS.map((s) => ({
        sharkId: s.id,
        name: s.name,
        avatar: s.avatar,
        title: s.title,
        messages: [],
        loading: false,
        score: 0,
        decision: "PENDING",
        sessionId: crypto.randomUUID(),
        roundNumber: 0,
        stakedAmount: s.stakedAmount,
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
    // Fire intro message to all VCs simultaneously
    setVcStates((prev) => prev.map((vc) => ({ ...vc, loading: true })));

    await Promise.allSettled(
      PANEL_SHARKS.map(async (shark, i) => {
        const vc = vcStates[i] || { sessionId: crypto.randomUUID(), roundNumber: 0 };
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sharkId: shark.id,
              sessionId: vc.sessionId,
              roundNumber: 0,
              messages: [
                {
                  role: "user",
                  content:
                    "A founder has just walked into a multi-VC panel room. You and two other VCs are here. Briefly introduce yourself in-character (1-2 sentences max) and signal you're ready to hear the pitch.",
                },
              ],
            }),
          });
          const data = await res.json();
          updateVC(shark.id, {
            messages: [{ role: "assistant", content: data.reply || "Ready." }],
            loading: false,
            score: data.score ?? 0,
          });
        } catch {
          updateVC(shark.id, {
            messages: [{ role: "assistant", content: "Ready to hear your pitch." }],
            loading: false,
          });
        }
      })
    );
  };

  const sendToAll = async () => {
    const trimmed = input.trim();
    if (!trimmed || vcStates.some((v) => v.loading)) return;
    setInput("");

    // Add user message to all, set loading
    setVcStates((prev) =>
      prev.map((vc) => ({
        ...vc,
        messages: [...vc.messages, { role: "user" as const, content: trimmed }],
        loading: true,
        roundNumber: vc.roundNumber + 1,
      }))
    );

    // Fire all 3 requests simultaneously
    await Promise.allSettled(
      vcStates.map(async (vc) => {
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
              { role: "assistant", content: "Connection error." },
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

  const anyLoading = vcStates.some((v) => v.loading);
  const acceptCount = vcStates.filter((v) => v.decision === "ACCEPT").length;
  const rejectCount = vcStates.filter((v) => v.decision === "REJECT").length;
  const dealReached = acceptCount >= 2;

  const decisionBg = (d: "PENDING" | "ACCEPT" | "REJECT") =>
    d === "ACCEPT" ? "#003300" : d === "REJECT" ? "#1a0000" : "transparent";
  const decisionBorder = (d: "PENDING" | "ACCEPT" | "REJECT") =>
    d === "ACCEPT" ? "2px solid lime" : d === "REJECT" ? "2px solid red" : "2px solid #444";

  return (
    <div style={{ height: "calc(100vh - 30px)", display: "flex", flexDirection: "column", padding: 6, gap: 6 }}>

      {/* Header */}
      <div className="win95-window" style={{ flexShrink: 0 }}>
        <div className="win95-title-bar">
          <span>⚡ TermSheet Arena — Pitch to All VCs Simultaneously</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>
        <div style={{ padding: "4px 8px", display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
          <span style={{ color: "#666" }}>
            Pitch to all 3 investors at once. Need <strong>2/3</strong> to accept for a deal.
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-pixel)", fontSize: 11 }}>
            ✓ {acceptCount} accepted · ✗ {rejectCount} rejected
          </span>
          {dealReached && (
            <span className="blink" style={{ color: "lime", fontWeight: "bold", fontFamily: "var(--font-pixel)" }}>
              🎉 DEAL REACHED
            </span>
          )}
          <Link href="/"><button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px" }}>← Back</button></Link>
        </div>
      </div>

      {/* 3 VC Windows */}
      <div style={{ flex: 1, display: "flex", gap: 6, minHeight: 0 }}>
        {vcStates.map((vc, i) => (
          <div
            key={vc.sharkId}
            className="win95-window"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              border: decisionBorder(vc.decision),
              background: decisionBg(vc.decision),
            }}
          >
            {/* Title bar */}
            <div className="win95-title-bar" style={{ fontSize: 11, flexShrink: 0 }}>
              <span>{vc.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {vc.decision === "ACCEPT" && (
                  <span style={{ fontSize: 10, color: "lime", fontWeight: "bold" }}>✓ IN</span>
                )}
                {vc.decision === "REJECT" && (
                  <span style={{ fontSize: 10, color: "red", fontWeight: "bold" }}>✗ PASS</span>
                )}
              </div>
            </div>

            {/* VC header */}
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #ccc", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 2, border: "2px inset", background: "#888", flexShrink: 0, overflow: "hidden" }}>
                <img src={vc.avatar} alt={vc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vc.name}</div>
                <ScoreBar score={vc.score} />
              </div>
              <div style={{ fontSize: 10, color: "green", fontWeight: "bold", flexShrink: 0 }}>
                ${vc.stakedAmount.toLocaleString()}
              </div>
            </div>

            {/* Chat messages */}
            <div
              ref={(el) => { chatRefs.current[i] = el; }}
              className="inset-box"
              style={{
                flex: 1,
                margin: 4,
                overflow: "auto",
                background: "black",
                fontFamily: "var(--font-pixel)",
                fontSize: 12,
                padding: 6,
                minHeight: 0,
              }}
            >
              {!started ? (
                <span style={{ color: "#555" }}>Waiting to start...</span>
              ) : (
                <>
                  {vc.messages.map((msg, mi) => (
                    <div key={mi} style={{ marginBottom: 6 }}>
                      <span style={{ color: msg.role === "user" ? "yellow" : "cyan", fontWeight: "bold", fontSize: 10 }}>
                        {msg.role === "user" ? "YOU" : vc.name.split(" ")[0].toUpperCase()}:
                      </span>
                      <br />
                      <span style={{ color: msg.role === "user" ? "white" : "lime", whiteSpace: "pre-wrap", fontSize: 11 }}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                  {vc.loading && (
                    <div style={{ color: "cyan", fontSize: 11 }}>
                      <span className="blink">{vc.name.split(" ")[0]} is typing...</span>
                    </div>
                  )}
                  {vc.decision === "ACCEPT" && (
                    <div style={{ marginTop: 8, padding: 4, border: "1px solid lime", fontSize: 10, color: "lime" }}>
                      ── DEAL ACCEPTED ──
                    </div>
                  )}
                  {vc.decision === "REJECT" && (
                    <div style={{ marginTop: 8, padding: 4, border: "1px solid red", fontSize: 10, color: "red" }}>
                      ── PASSED ──
                    </div>
                  )}
                  <span className="blink" style={{ color: "#333" }}>█</span>
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
            <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
              <button
                className="win95-btn"
                style={{ fontSize: 13, fontWeight: "bold", padding: "8px 32px" }}
                onClick={startArena}
              >
                ⚡ Enter the Arena →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <textarea
                  className="inset-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={anyLoading ? "VCs are responding..." : "Pitch to all 3 simultaneously... (Enter to send)"}
                  disabled={anyLoading}
                  style={{
                    width: "100%",
                    resize: "none",
                    height: 40,
                    fontFamily: "inherit",
                    fontSize: 12,
                    opacity: anyLoading ? 0.6 : 1,
                  }}
                />
                <div style={{ fontSize: 10, color: "#888" }}>
                  {anyLoading
                    ? `⏳ ${vcStates.filter((v) => v.loading).map((v) => v.name.split(" ")[0]).join(", ")} responding...`
                    : "Your message broadcasts to all 3 VCs at once · Enter to send"}
                </div>
              </div>
              <button
                className="win95-btn"
                style={{ fontSize: 12, fontWeight: "bold", padding: "8px 16px", flexShrink: 0, opacity: anyLoading ? 0.5 : 1 }}
                onClick={sendToAll}
                disabled={anyLoading || !input.trim()}
              >
                Send to All →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
