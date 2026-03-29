"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

interface Message { role: "user" | "assistant"; content: string; }

interface VCState {
  sharkId: string;
  name: string;
  avatar: string;
  messages: Message[];
  agentTyping: boolean;  // agent generating next message
  vcTyping: boolean;     // VC AI responding
  score: number;
  decision: "PENDING" | "ACCEPT" | "REJECT";
  sessionId: string;
  roundNumber: number;
  stakedAmount: number;
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

const TICKER_MSGS = [
  "agent scanning Garry's portfolio for angles...",
  "crafting YC-optimized pitch language...",
  "Marc responds to bold contrarian takes",
  "Chamath wants unit economics, not hype",
  "agent adapting message tone per VC...",
  "3 independent conversations running",
  "settlement confirmed — $5,000 USDC on Base",
  "agent detected weak point — pivoting angle",
  "Garry: 'show me what you've built'",
];

const DELAY_BETWEEN_ROUNDS = 2500; // ms between agent rounds

export default function ArenaPage() {
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");

  // Startup info form
  const [startupName, setStartupName] = useState("");
  const [startupDesc, setStartupDesc] = useState("");
  const [traction, setTraction] = useState("");
  const [team, setTeam] = useState("");

  const [vcStates, setVcStates] = useState<VCState[]>([]);
  const [ticker, setTicker] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const chatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const runningRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => { setTicker((t) => (t + 1) % TICKER_MSGS.length); setTickerVisible(true); }, 300);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    chatRefs.current.forEach((ref) => { if (ref) ref.scrollTop = ref.scrollHeight; });
  }, [vcStates]);

  const updateVC = useCallback((sharkId: string, patch: Partial<VCState>) => {
    setVcStates((prev) => prev.map((vc) => vc.sharkId === sharkId ? { ...vc, ...patch } : vc));
  }, []);

  const startupInfo = `
Company: ${startupName}
What it does: ${startupDesc}
Traction: ${traction || "Early stage, pre-launch"}
Team: ${team || "Solo founder"}
`.trim();

  // One VC's agent loop — runs autonomously until ACCEPT/REJECT or 8 rounds
  const runVCAgent = useCallback(async (sharkId: string, sessionId: string) => {
    const MAX_ROUNDS = 8;
    let round = 0;
    let history: Message[] = [];
    let currentDecision: "PENDING" | "ACCEPT" | "REJECT" = "PENDING";

    while (round < MAX_ROUNDS && currentDecision === "PENDING" && runningRef.current) {
      // Step 1: Agent generates tailored message for this VC
      updateVC(sharkId, { agentTyping: true });
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

      let agentMessage = "";
      try {
        const res = await fetch("/api/agent-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharkId, startupInfo, conversationHistory: history, roundNumber: round }),
        });
        const data = await res.json();
        agentMessage = data.message;
      } catch {
        agentMessage = `${startupName} is solving a critical problem in the market. Here's why now is the right time...`;
      }

      // Add agent message to UI
      const userMsg: Message = { role: "user", content: agentMessage };
      history = [...history, userMsg];
      updateVC(sharkId, {
        agentTyping: false,
        vcTyping: true,
        messages: [...history],
        roundNumber: round + 1,
      });

      // Step 2: VC AI responds
      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sharkId,
            sessionId,
            roundNumber: round + 1,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        const vcReply = data.reply || "Tell me more.";
        const assistantMsg: Message = { role: "assistant", content: vcReply };
        history = [...history, assistantMsg];

        currentDecision = data.decision ?? "PENDING";
        const newScore = typeof data.score === "number" ? data.score : 0;

        updateVC(sharkId, {
          vcTyping: false,
          messages: [...history],
          score: newScore,
          decision: currentDecision,
        });
      } catch {
        updateVC(sharkId, { vcTyping: false });
      }

      round++;

      // Pause between rounds to feel natural
      if (currentDecision === "PENDING" && round < MAX_ROUNDS) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));
      }
    }

    // If no decision after max rounds, mark as REJECT
    if (currentDecision === "PENDING") {
      updateVC(sharkId, { decision: "REJECT" });
    }
  }, [startupInfo, startupName, updateVC]);

  const launchAgent = async () => {
    if (!startupName.trim() || !startupDesc.trim()) return;

    runningRef.current = true;

    const initialStates: VCState[] = sharks.map((s) => ({
      sharkId: s.id,
      name: s.name,
      avatar: s.avatar,
      messages: [],
      agentTyping: false,
      vcTyping: false,
      score: 0,
      decision: "PENDING",
      sessionId: crypto.randomUUID(),
      roundNumber: 0,
      stakedAmount: s.stakedAmount,
    }));
    setVcStates(initialStates);
    setPhase("running");

    // Launch all 3 agent loops simultaneously — staggered start for visual effect
    initialStates.forEach((vc, i) => {
      setTimeout(() => runVCAgent(vc.sharkId, vc.sessionId), i * 800);
    });
  };

  const stopAgent = () => { runningRef.current = false; setPhase("done"); };

  const acceptCount = vcStates.filter((v) => v.decision === "ACCEPT").length;
  const pendingCount = vcStates.filter((v) => v.decision === "PENDING").length;

  return (
    <div style={{ height: "calc(100vh - 30px)", display: "flex", flexDirection: "column", padding: 6, gap: 4, background: "#000" }}>

      {/* Ticker */}
      <div style={{ background: "#000080", padding: "2px 10px", fontSize: 10, color: "white", fontFamily: "var(--font-pixel)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, height: 18, overflow: "hidden" }}>
        <span style={{ color: "yellow", flexShrink: 0 }}>LIVE ●</span>
        <span style={{ opacity: tickerVisible ? 1 : 0, transition: "opacity 0.3s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {phase === "running" ? TICKER_MSGS[ticker] : "Agent ready — fill startup info to launch"}
        </span>
        <span style={{ marginLeft: "auto", flexShrink: 0, color: "#aaf" }}>
          {phase === "running" ? `${acceptCount} accepted · ${pendingCount} active` : "TermSheet Arena"}
        </span>
      </div>

      {/* Header */}
      <div className="win95-window" style={{ flexShrink: 0 }}>
        <div className="win95-title-bar">
          <span>⚡ TermSheet Arena — AI Agent Pitch Sessions</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>
        <div style={{ padding: "3px 8px", fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 8 }}>
          {phase === "form"
            ? "Your AI agent pitches all 3 VCs simultaneously with tailored messages for each."
            : phase === "running"
            ? "Agent running — 3 independent conversations, each message crafted for that VC."
            : "Sessions complete."}
          <Link href="/" style={{ marginLeft: "auto" }}>
            <button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px" }}>← Back</button>
          </Link>
          {phase === "running" && (
            <button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px", color: "red" }} onClick={stopAgent}>■ Stop</button>
          )}
        </div>
      </div>

      {phase === "form" ? (
        /* ── STARTUP FORM ── */
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="win95-window" style={{ width: 520 }}>
            <div className="win95-title-bar"><span>🚀 Startup Brief — Agent will use this to pitch all 3 VCs</span></div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>Company name *</label>
                <input className="inset-input" value={startupName} onChange={(e) => setStartupName(e.target.value)}
                  placeholder="e.g. Acme AI" style={{ width: "100%", fontSize: 12, padding: "3px 6px" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>What you&apos;re building *</label>
                <textarea className="inset-input" value={startupDesc} onChange={(e) => setStartupDesc(e.target.value)}
                  placeholder="e.g. AI agent that automates tax filing for freelancers — $400B market, 10x cheaper than accountants"
                  style={{ width: "100%", fontSize: 12, padding: "3px 6px", height: 70, resize: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>Traction / numbers</label>
                <input className="inset-input" value={traction} onChange={(e) => setTraction(e.target.value)}
                  placeholder="e.g. 500 beta users, $8K MRR, 15% WoW growth"
                  style={{ width: "100%", fontSize: 12, padding: "3px 6px" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>Team</label>
                <input className="inset-input" value={team} onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Ex-Google engineer + ex-Stripe PM, 2 founders"
                  style={{ width: "100%", fontSize: 12, padding: "3px 6px" }} />
              </div>
              <div className="inset-box" style={{ fontSize: 10, padding: 8, marginBottom: 16, color: "#555", lineHeight: 1.6 }}>
                ⚡ Agent will generate <strong>different messages for each VC</strong> based on their investment thesis.<br />
                Garry gets builder-focused pitch · Marc gets contrarian disruption angle · Chamath gets unit economics
              </div>
              <button
                className="win95-btn"
                style={{ width: "100%", fontWeight: "bold", fontSize: 14, padding: "8px 0", background: "#000080", color: "white", border: "2px outset #4444ff", opacity: (!startupName.trim() || !startupDesc.trim()) ? 0.5 : 1 }}
                onClick={launchAgent}
                disabled={!startupName.trim() || !startupDesc.trim()}
              >
                ⚡ Launch Agent — Pitch All 3 VCs
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── 3 VC WINDOWS ── */
        <div style={{ flex: 1, display: "flex", gap: 5, minHeight: 0 }}>
          {vcStates.map((vc, i) => {
            const borderColor = vc.decision === "ACCEPT" ? "lime" : vc.decision === "REJECT" ? "#660000" : "#999";
            const titleBg = vc.decision === "ACCEPT" ? "#006600" : vc.decision === "REJECT" ? "#660000" : undefined;
            return (
              <div key={vc.sharkId} className="win95-window"
                style={{ flex: 1, display: "flex", flexDirection: "column", border: `2px solid ${borderColor}`, transition: "border-color 0.4s" }}>

                <div className="win95-title-bar" style={{ fontSize: 11, flexShrink: 0, background: titleBg }}>
                  <span>{vc.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {(vc.agentTyping || vc.vcTyping) && (
                      <span className="blink" style={{ fontSize: 9, color: vc.agentTyping ? "yellow" : "cyan", fontFamily: "var(--font-pixel)" }}>
                        {vc.agentTyping ? "AGENT" : "VC"}
                      </span>
                    )}
                    {vc.decision === "ACCEPT" && <span style={{ fontSize: 9, color: "lime", fontWeight: "bold" }}>✓ IN</span>}
                    {vc.decision === "REJECT" && <span style={{ fontSize: 9, color: "#ff4444", fontWeight: "bold" }}>✗ PASS</span>}
                  </div>
                </div>

                {/* VC info */}
                <div style={{ padding: "4px 8px", borderBottom: "1px solid #555", display: "flex", gap: 8, alignItems: "center", flexShrink: 0, background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 2, border: "1px inset #888", overflow: "hidden", flexShrink: 0, background: "#555" }}>
                    <img src={vc.avatar} alt={vc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-dark)" }}>{vc.name}</div>
                    <ScoreBar score={vc.score} />
                  </div>
                  <div style={{ fontSize: 10, color: "lime", fontFamily: "var(--font-pixel)", fontWeight: "bold", flexShrink: 0 }}>
                    ${vc.stakedAmount.toLocaleString()}
                  </div>
                </div>

                {/* Chat */}
                <div ref={(el) => { chatRefs.current[i] = el; }} className="inset-box"
                  style={{ flex: 1, margin: 4, overflow: "auto", background: "#000", fontFamily: "var(--font-pixel)", fontSize: 11, padding: 6, minHeight: 0, lineHeight: 1.5 }}>
                  {vc.messages.map((msg, mi) => (
                    <div key={mi} style={{ marginBottom: 8 }}>
                      <span style={{ color: msg.role === "user" ? "#ffff00" : "#00ffff", fontWeight: "bold", fontSize: 9, letterSpacing: 1 }}>
                        {msg.role === "user" ? "AGENT" : vc.name.split(" ")[0].toUpperCase()}:
                      </span>
                      <br />
                      <span style={{ color: msg.role === "user" ? "#ffcc44" : "#00ff88", whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                  {vc.agentTyping && (
                    <div style={{ color: "#ffff00", fontSize: 10 }}><span className="blink">▌</span> <span style={{ opacity: 0.6 }}>agent crafting message...</span></div>
                  )}
                  {vc.vcTyping && (
                    <div style={{ color: "#00ffff", fontSize: 10 }}><span className="blink">▌</span></div>
                  )}
                  {vc.decision === "ACCEPT" && (
                    <div style={{ marginTop: 10, padding: 6, border: "1px solid lime", background: "#001a00", textAlign: "center" }}>
                      <div style={{ color: "lime", fontSize: 10, marginBottom: 6, fontWeight: "bold" }}>── ACCEPTED ──</div>
                      <button className="win95-btn" style={{ fontSize: 10, padding: "3px 12px", fontWeight: "bold" }}>
                        Claim ${vc.stakedAmount.toLocaleString()} USDC →
                      </button>
                    </div>
                  )}
                  {vc.decision === "REJECT" && (
                    <div style={{ marginTop: 8, padding: 4, border: "1px solid #660000", fontSize: 10, color: "#ff4444" }}>── PASSED ──</div>
                  )}
                  {vc.messages.length === 0 && !vc.agentTyping && (
                    <span style={{ color: "#333" }}>— agent starting in {i * 0.8}s —</span>
                  )}
                  <span className="blink" style={{ color: "#111" }}>█</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
