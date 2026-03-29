"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";
import type { ArenaVCSession } from "@/lib/arena-sessions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://app-tykooeths-projects.vercel.app";

interface Message { role: "user" | "assistant"; content: string; }

interface VCState {
  sharkId: string;
  name: string;
  avatar: string;
  messages: Message[];
  agentTyping: boolean;
  vcTyping: boolean;
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

const DELAY_BETWEEN_ROUNDS = 2500;

function VCWindow({
  vc, chatRef, emptyLabel, agentLabel = "AGENT",
}: {
  vc: VCState;
  chatRef: (el: HTMLDivElement | null) => void;
  emptyLabel?: string;
  agentLabel?: string;
}) {
  const borderColor = vc.decision === "ACCEPT" ? "lime" : vc.decision === "REJECT" ? "#660000" : "#999";
  const titleBg = vc.decision === "ACCEPT" ? "#006600" : vc.decision === "REJECT" ? "#660000" : undefined;
  return (
    <div className="win95-window" style={{ flex: 1, display: "flex", flexDirection: "column", border: `2px solid ${borderColor}`, transition: "border-color 0.4s" }}>
      <div className="win95-title-bar" style={{ fontSize: 11, flexShrink: 0, background: titleBg }}>
        <span>{vc.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {(vc.agentTyping || vc.vcTyping) && (
            <span className="blink" style={{ fontSize: 9, color: vc.agentTyping ? "yellow" : "cyan", fontFamily: "var(--font-pixel)" }}>
              {vc.agentTyping ? agentLabel : "VC"}
            </span>
          )}
          {vc.decision === "ACCEPT" && <span style={{ fontSize: 9, color: "lime", fontWeight: "bold" }}>✓ IN</span>}
          {vc.decision === "REJECT" && <span style={{ fontSize: 9, color: "#ff4444", fontWeight: "bold" }}>✗ PASS</span>}
        </div>
      </div>
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
      <div ref={chatRef} className="inset-box"
        style={{ flex: 1, margin: 4, overflow: "auto", background: "#000", fontFamily: "var(--font-pixel)", fontSize: 11, padding: 6, minHeight: 0, lineHeight: 1.5 }}>
        {vc.messages.map((msg, mi) => (
          <div key={mi} style={{ marginBottom: 8 }}>
            <span style={{ color: msg.role === "user" ? "#ffff00" : "#00ffff", fontWeight: "bold", fontSize: 9, letterSpacing: 1 }}>
              {msg.role === "user" ? agentLabel : vc.name.split(" ")[0].toUpperCase()}:
            </span>
            <br />
            <span style={{ color: msg.role === "user" ? "#ffcc44" : "#00ff88", whiteSpace: "pre-wrap" }}>
              {msg.content}
            </span>
          </div>
        ))}
        {vc.agentTyping && (
          <div style={{ color: "#ffff00", fontSize: 10 }}><span className="blink">▌</span> <span style={{ opacity: 0.6 }}>crafting message...</span></div>
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
          <span style={{ color: "#333" }}>{emptyLabel ?? "— waiting —"}</span>
        )}
        <span className="blink" style={{ color: "#111" }}>█</span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [mode, setMode] = useState<"builtin" | "external">("builtin");

  // ── Built-in agent state ────────────────────────────────────────────────
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");
  const [startupName, setStartupName] = useState("");
  const [startupDesc, setStartupDesc] = useState("");
  const [traction, setTraction] = useState("");
  const [team, setTeam] = useState("");
  const [vcStates, setVcStates] = useState<VCState[]>([]);
  const runningRef = useRef(false);

  // ── External agent state ────────────────────────────────────────────────
  const [extSessionId, setExtSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const key = "termsheet-arena-session";
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id = crypto.randomUUID();
      localStorage.setItem(key, id);
      return id;
    }
    return "xxxx-xxxx-xxxx-xxxx";
  });
  const [extVCStates, setExtVCStates] = useState<VCState[]>(() =>
    sharks.map((s) => ({
      sharkId: s.id, name: s.name, avatar: s.avatar, messages: [],
      agentTyping: false, vcTyping: false, score: 0, decision: "PENDING",
      sessionId: "", roundNumber: 0, stakedAmount: s.stakedAmount,
    }))
  );
  const [copied, setCopied] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);

  // ── Bring Your Agent: token + CLAUDE.md ────────────────────────────────
  const [pitchToken, setPitchToken] = useState<string | null>(null);
  const [tokenCredits, setTokenCredits] = useState<number | null>(null);
  const [downloadedMd, setDownloadedMd] = useState(false);
  const [showApiRef, setShowApiRef] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("termsheet-pitch-token");
    if (stored) {
      setPitchToken(stored);
      fetch(`/api/credits?token=${stored}`)
        .then((r) => r.json())
        .then((d) => { if (d.credits !== undefined) setTokenCredits(d.credits); })
        .catch(() => {});
    }
  }, []);

  const downloadClaudeMd = () => {
    const token = pitchToken ?? "<get-token-from-termsheet.xyz/connect>";
    const content = `# TermSheet Pitch Task

## API Config
Endpoint:  POST ${API_BASE}/api/chat
Header:    x-pitch-token: ${token}
Session:   ${extSessionId}

## Request body format
\`\`\`json
{
  "sharkId": "<vc-id>",
  "sessionId": "${extSessionId}",
  "roundNumber": 1,
  "messages": [{ "role": "user", "content": "<pitch text>" }]
}
\`\`\`
For round 2+, append the VC's reply to messages before sending the next round.

## Task
Please pitch my startup to all ${sharks.length} VCs simultaneously by making POST requests to the endpoint above.
Keep pitching each VC until their response includes "decision": "ACCEPT" or "decision": "REJECT" (takes 3–5 rounds).
Each message should be under 400 words and tailored to that VC's focus.

## VCs to pitch
${sharks.map(s => s.id).join(" · ")}

## My startup
<!-- Fill this in before running -->
Name:
One-liner:
Problem:
Solution:
Traction:
Ask:

## Notes
- Check remaining credits: GET ${API_BASE}/api/credits?token=${token}
- When a VC accepts, USDC payout goes to your wallet automatically
- Never fabricate startup details — ask the founder if anything is unclear`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "CLAUDE.md";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setDownloadedMd(true);
    setTimeout(() => setDownloadedMd(false), 3000);
  };

  // ── Shared ──────────────────────────────────────────────────────────────
  const [ticker, setTicker] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const chatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const extChatRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  useEffect(() => {
    extChatRefs.current.forEach((ref) => { if (ref) ref.scrollTop = ref.scrollHeight; });
  }, [extVCStates]);

  // ── Poll external session ───────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "external") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/arena-status?sessionId=${extSessionId}`);
        const data = await res.json() as { vcs: Record<string, ArenaVCSession> };
        setExtVCStates((prev) =>
          prev.map((vc) => {
            const remote = data.vcs[vc.sharkId];
            if (!remote) return vc;
            return {
              ...vc,
              messages: remote.messages.map((m) => ({ role: m.role, content: m.content })),
              score: remote.score,
              decision: remote.decision,
              roundNumber: remote.roundNumber,
            };
          })
        );
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [mode, extSessionId]);

  // ── Built-in agent helpers ──────────────────────────────────────────────
  const updateVC = useCallback((sharkId: string, patch: Partial<VCState>) => {
    setVcStates((prev) => prev.map((vc) => vc.sharkId === sharkId ? { ...vc, ...patch } : vc));
  }, []);

  const startupInfo = `Company: ${startupName}\nWhat it does: ${startupDesc}\nTraction: ${traction || "Early stage"}\nTeam: ${team || "Solo founder"}`.trim();

  const runVCAgent = useCallback(async (sharkId: string, sessionId: string) => {
    const MAX_ROUNDS = 8;
    let round = 0;
    let history: Message[] = [];
    let currentDecision: "PENDING" | "ACCEPT" | "REJECT" = "PENDING";

    while (round < MAX_ROUNDS && currentDecision === "PENDING" && runningRef.current) {
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
        agentMessage = `${startupName} is solving a critical problem. Here is why now is the right time...`;
      }

      const userMsg: Message = { role: "user", content: agentMessage };
      history = [...history, userMsg];
      updateVC(sharkId, { agentTyping: false, vcTyping: true, messages: [...history], roundNumber: round + 1 });

      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharkId, sessionId, roundNumber: round + 1, messages: history.map((m) => ({ role: m.role, content: m.content })) }),
        });
        const data = await res.json();
        const vcReply = data.reply || "Tell me more.";
        const assistantMsg: Message = { role: "assistant", content: vcReply };
        history = [...history, assistantMsg];
        currentDecision = data.decision ?? "PENDING";
        updateVC(sharkId, { vcTyping: false, messages: [...history], score: typeof data.score === "number" ? data.score : 0, decision: currentDecision });
      } catch {
        updateVC(sharkId, { vcTyping: false });
      }

      round++;
      if (currentDecision === "PENDING" && round < MAX_ROUNDS) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));
      }
    }
    if (currentDecision === "PENDING") updateVC(sharkId, { decision: "REJECT" });
  }, [startupInfo, startupName, updateVC]);

  const launchAgent = () => {
    if (!startupName.trim() || !startupDesc.trim()) return;
    runningRef.current = true;
    const initial: VCState[] = sharks.map((s) => ({
      sharkId: s.id, name: s.name, avatar: s.avatar, messages: [],
      agentTyping: false, vcTyping: false, score: 0, decision: "PENDING",
      sessionId: crypto.randomUUID(), roundNumber: 0, stakedAmount: s.stakedAmount,
    }));
    setVcStates(initial);
    setPhase("running");
    initial.forEach((vc, i) => setTimeout(() => runVCAgent(vc.sharkId, vc.sessionId), i * 800));
  };

  const stopAgent = () => { runningRef.current = false; setPhase("done"); };

  const regenerateSession = () => {
    const id = crypto.randomUUID();
    localStorage.setItem("termsheet-arena-session", id);
    setExtSessionId(id);
    setExtVCStates(sharks.map((s) => ({
      sharkId: s.id, name: s.name, avatar: s.avatar, messages: [],
      agentTyping: false, vcTyping: false, score: 0, decision: "PENDING",
      sessionId: "", roundNumber: 0, stakedAmount: s.stakedAmount,
    })));
  };

  const webhookUrl = `${API_BASE}/api/arena-webhook`;

  const examplePayload = `// Send once per VC — your agent does the pitching
const VCS = ${JSON.stringify(sharks.map(s => s.id))};
const SESSION_ID = "${extSessionId}";

for (const sharkId of VCS) {
  const res = await fetch("${webhookUrl}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      sharkId,
      message: yourAgent.pitch(sharkId), // your agent generates the message
    }),
  });
  const { vcMessage, score, decision } = await res.json();
  // call again with follow-up until decision !== "PENDING"
}`;

  const acceptCount = vcStates.filter((v) => v.decision === "ACCEPT").length;
  const pendingCount = vcStates.filter((v) => v.decision === "PENDING").length;
  const extActivity = extVCStates.reduce((a, v) => a + v.messages.length, 0);

  return (
    <div style={{ height: "calc(100vh - 30px)", display: "flex", flexDirection: "column", padding: 6, gap: 4, background: "#000" }}>

      {/* Ticker */}
      <div style={{ background: "#000080", padding: "2px 10px", fontSize: 10, color: "white", fontFamily: "var(--font-pixel)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, height: 18, overflow: "hidden" }}>
        <span style={{ color: "yellow", flexShrink: 0 }}>LIVE ●</span>
        <span style={{ opacity: tickerVisible ? 1 : 0, transition: "opacity 0.3s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {mode === "external"
            ? extActivity > 0 ? `${extActivity} messages exchanged · session ${extSessionId.slice(0, 8)}` : "Waiting for your agent to connect..."
            : phase === "running" ? TICKER_MSGS[ticker] : "Agent ready — fill startup info to launch"}
        </span>
        <span style={{ marginLeft: "auto", flexShrink: 0, color: "#aaf" }}>
          {mode === "builtin" && phase === "running" ? `${acceptCount} accepted · ${pendingCount} active` : "TermSheet Arena"}
        </span>
      </div>

      {/* Header + mode tabs */}
      <div className="win95-window" style={{ flexShrink: 0 }}>
        <div className="win95-title-bar">
          <span>⚡ TermSheet Arena — AI Agent Pitch Sessions</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "3px 8px", gap: 6, borderBottom: "1px solid #aaa" }}>
          {/* Mode tabs */}
          <button
            className="win95-btn"
            style={{ fontSize: 11, padding: "1px 12px", fontWeight: mode === "builtin" ? "bold" : "normal", background: mode === "builtin" ? "#000080" : undefined, color: mode === "builtin" ? "white" : undefined }}
            onClick={() => setMode("builtin")}
          >
            Auto Pitch
          </button>
          <button
            className="win95-btn"
            style={{ fontSize: 11, padding: "1px 12px", fontWeight: mode === "external" ? "bold" : "normal", background: mode === "external" ? "#000080" : undefined, color: mode === "external" ? "white" : undefined }}
            onClick={() => setMode("external")}
          >
            Bring Your Agent →
          </button>
          <Link href="/" style={{ marginLeft: "auto" }}>
            <button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px" }}>← Back</button>
          </Link>
          {mode === "builtin" && phase === "running" && (
            <button className="win95-btn" style={{ fontSize: 10, padding: "1px 8px", color: "red" }} onClick={stopAgent}>■ Stop</button>
          )}
        </div>
      </div>

      {/* ── BUILTIN MODE ── */}
      {mode === "builtin" && (
        phase === "form" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="win95-window" style={{ width: 520 }}>
              <div className="win95-title-bar"><span>🚀 Startup Brief — Agent will pitch all {sharks.length} VCs simultaneously</span></div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>Company name *</label>
                  <input className="inset-input" value={startupName} onChange={(e) => setStartupName(e.target.value)}
                    placeholder="e.g. Acme AI" style={{ width: "100%", fontSize: 12, padding: "3px 6px" }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 3 }}>What you&apos;re building *</label>
                  <textarea className="inset-input" value={startupDesc} onChange={(e) => setStartupDesc(e.target.value)}
                    placeholder="e.g. AI agent that automates tax filing for freelancers"
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
                    placeholder="e.g. Ex-Google engineer + ex-Stripe PM"
                    style={{ width: "100%", fontSize: 12, padding: "3px 6px" }} />
                </div>
                <div className="inset-box" style={{ fontSize: 10, padding: 8, marginBottom: 16, color: "#555", lineHeight: 1.6 }}>
                  ⚡ Agent generates <strong>tailored messages per VC</strong> — each investor gets a pitch calibrated to their thesis and scoring criteria
                </div>
                <button
                  className="win95-btn"
                  style={{ width: "100%", fontWeight: "bold", fontSize: 14, padding: "8px 0", background: "#000080", color: "white", border: "2px outset #4444ff", opacity: (!startupName.trim() || !startupDesc.trim()) ? 0.5 : 1 }}
                  onClick={launchAgent}
                  disabled={!startupName.trim() || !startupDesc.trim()}
                >
                  ⚡ Launch Agent — Pitch All {sharks.length} VCs
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", gap: 5, minHeight: 0 }}>
            {vcStates.map((vc, i) => (
              <VCWindow key={vc.sharkId} vc={vc} chatRef={(el) => { chatRefs.current[i] = el; }}
                emptyLabel={`— agent starting in ${(i * 0.8).toFixed(1)}s —`} />
            ))}
          </div>
        )
      )}

      {/* ── EXTERNAL MODE ── */}
      {mode === "external" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minHeight: 0 }}>

          {/* 3-step setup bar */}
          <div className="win95-window" style={{ flexShrink: 0 }}>
            <div className="win95-title-bar"><span>🔌 Bring Your Agent — {pitchToken ? "ready to pitch" : "3 steps to go live"}</span></div>
            <div style={{ padding: 10, display: "flex", gap: 8, alignItems: "stretch" }}>

              {/* Step 1 — Token */}
              <div style={{ flex: 1, padding: 8, border: pitchToken ? "2px solid lime" : "2px solid #888",
                background: pitchToken ? "#001a00" : "#eee", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: "bold", color: pitchToken ? "lime" : "#000" }}>
                  {pitchToken ? "✓ Step 1" : "Step 1"} · Credits
                </div>
                {pitchToken ? (
                  <div>
                    <div style={{ fontSize: 10, color: "#aaffaa" }}>
                      {tokenCredits !== null ? `${tokenCredits} credit${tokenCredits !== 1 ? "s" : ""} remaining` : "Token active"}
                    </div>
                    <code style={{ fontSize: 9, color: "#00ff88", wordBreak: "break-all", fontFamily: "var(--font-pixel)" }}>
                      {pitchToken.slice(0, 20)}...
                    </code>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 10, color: "#555" }}>Get a pitch token to start</div>
                    <Link href="/connect">
                      <button className="win95-btn" style={{ fontSize: 10, padding: "3px 10px", background: "#ffff00", fontWeight: "bold" }}>
                        Get Credits →
                      </button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Step 2 — Run your agent */}
              <div style={{ flex: 2, padding: 8, border: "2px solid #888", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: "bold" }}>Step 2 · Run Your Agent</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="win95-btn"
                    style={{ fontSize: 10, padding: "3px 10px", fontWeight: "bold",
                      background: downloadedMd ? "#005500" : "#ffff00", color: downloadedMd ? "#00ff88" : "#000" }}
                    onClick={downloadClaudeMd}>
                    {downloadedMd ? "✓ CLAUDE.md" : "⬇ CLAUDE.md"}
                  </button>
                  <div style={{ fontSize: 9, color: "#555", lineHeight: 1.5 }}>
                    Drop in project root, fill startup info,<br />
                    then: <code style={{ background: "#ddd", padding: "0 3px" }}>claude &quot;pitch per CLAUDE.md&quot;</code>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "#888" }}>
                  Or use any HTTP agent — see API ref below ↓
                </div>
              </div>

              {/* Step 3 — Monitor */}
              <div style={{ flex: 1.2, padding: 8, border: extActivity > 0 ? "2px solid lime" : "2px solid #888",
                background: extActivity > 0 ? "#001a00" : "#eee", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: "bold", color: extActivity > 0 ? "lime" : "#000" }}>
                  {extActivity > 0 ? "✓ Step 3" : "Step 3"} · Live Monitor
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <code style={{ fontSize: 9, background: extActivity > 0 ? "#002200" : "#ddd", color: extActivity > 0 ? "#aaffaa" : "#333",
                    padding: "1px 4px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {extSessionId.slice(0, 16)}...
                  </code>
                  <button className="win95-btn" style={{ fontSize: 9, padding: "1px 5px", flexShrink: 0 }}
                    title="New session" onClick={regenerateSession}>↺</button>
                </div>
                {extActivity > 0
                  ? <div style={{ fontSize: 9, color: "lime" }}>● {extActivity} messages · {sharks.length} VCs</div>
                  : <div style={{ fontSize: 9, color: "#888" }}>Watching for messages...</div>
                }
              </div>
            </div>

            {/* API Reference — collapsible */}
            <div style={{ borderTop: "1px solid #aaa" }}>
              <button
                className="win95-btn"
                style={{ width: "100%", fontSize: 10, padding: "3px 12px", textAlign: "left", border: "none", borderRadius: 0,
                  background: showApiRef ? "#ddd" : undefined, color: "#444" }}
                onClick={() => setShowApiRef(v => !v)}>
                {showApiRef ? "▲" : "▼"} API reference — for non-Claude-Code agents
              </button>
              {showApiRef && (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                    <span style={{ fontWeight: "bold", flexShrink: 0 }}>Endpoint:</span>
                    <code style={{ background: "#000", color: "#00ff88", padding: "2px 8px", fontFamily: "var(--font-pixel)",
                      fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px inset #555" }}>
                      POST {webhookUrl}
                    </code>
                    <button className="win95-btn"
                      style={{ fontSize: 10, padding: "1px 10px", flexShrink: 0, background: copied ? "#00aa00" : undefined, color: copied ? "white" : undefined }}
                      onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      {copied ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <pre style={{ background: "#111", color: "#aaffaa", fontSize: 10, padding: 8, margin: 0,
                      border: "1px inset #555", overflowX: "auto", lineHeight: 1.5, fontFamily: "var(--font-pixel)" }}>
                      {examplePayload}
                    </pre>
                    <button className="win95-btn"
                      style={{ position: "absolute", top: 4, right: 4, fontSize: 10, padding: "1px 8px",
                        background: copiedExample ? "#00aa00" : undefined, color: copiedExample ? "white" : undefined }}
                      onClick={() => { navigator.clipboard.writeText(examplePayload); setCopiedExample(true); setTimeout(() => setCopiedExample(false), 2000); }}>
                      {copiedExample ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VC windows — live monitor */}
          <div style={{ flex: 1, display: "flex", gap: 5, minHeight: 0 }}>
            {extVCStates.map((vc, i) => (
              <VCWindow key={vc.sharkId} vc={vc} chatRef={(el) => { extChatRefs.current[i] = el; }}
                emptyLabel="— waiting for your agent —" agentLabel="YOUR AGENT" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
