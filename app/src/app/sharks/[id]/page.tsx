"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

interface Message {
  role: "system" | "user";
  content: string;
  attachments?: string[];
}

export default function SharkProfile({ params }: { params: { id: string } }) {
  const shark = sharks.find((s) => s.id === params.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

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

  // Personalized responses based on investor personality
  const getResponses = () => {
    if (shark.id === "garry-tan") return [
      `Alright, I'm listening. But skip the buzzwords — what have you actually BUILT? Show me the product. I'm a designer and engineer, I can tell if it's real.`,
      `OK, interesting. Who are your users? Have you talked to them? I don't care about TAM slides — I care about whether real humans want this thing.`,
      `What's your unfair advantage? Why can YOUR team win this? I back ambitious misfits — tell me why you're the misfit who sees something nobody else does.`,
      `Good. I can work with this. How much are you raising and what's the burn? I want to see you move FAST — YC companies grow 10-20% weekly. Can you?`,
      `I've heard enough. Let me think about whether the timing is right — "the most powerful startups emerge when factors converge to make NOW the perfect time." Drop your deck and I'll review.`,
    ];
    if (shark.id === "marc-andreessen") return [
      `Software is eating the world. AI is eating software. So tell me — what part of the world is YOUR software eating? And please, think BIGGER than you're probably thinking.`,
      `OK, but is this a MASSIVE market? I don't fund incremental improvements. I fund companies that "invade existing industries with impunity." Convince me this is that.`,
      `Who are the incumbents you're destroying? "No one should expect building a new high-growth company in an established industry to be easy. It's brutally difficult." Why can you do it?`,
      `What's the technology moat? I co-built the web browser — I know what real technical depth looks like. Show me something that was IMPOSSIBLE two years ago.`,
      `Interesting. This could be big. Send me the deck, your GitHub, and anything that shows technical depth. I want to believe. IT'S TIME TO BUILD.`,
    ];
    // Chamath
    return [
      `Alright, here's how this works. I'm going to ask you hard questions and I want honest answers. No VC-speak. What problem are you solving and WHY should I care?`,
      `Numbers. I want numbers. What are your unit economics? Customer acquisition cost? LTV? "Your job as a smart investor is to separate facts from fiction and noise." Show me facts.`,
      `"Valuable companies take decades to build." What's your 10-year vision? I don't care about your exit strategy — I care about whether this compounds.`,
      `Here's the hard ugly truth most VCs won't tell you: most startups fail because they chase hype instead of solving real problems. Tell me why yours is different.`,
      `OK. You've got my attention. But remember — "fast money returns completely decay long-term thinking." I invest in compounders. Send me everything and let me dig into the data.`,
    ];
  };

  const startPitch = () => {
    setStarted(true);
    const intros: Record<string, string> = {
      "garry-tan": `Welcome to YC's virtual pitch room. I'm Garry.\n\n"Don't tell me there are too few good ideas. Go outside — there's a billion problems to solve."\n\nSo what's YOUR billion-dollar problem? Tell me what you're building. Drop files anytime.`,
      "marc-andreessen": `You've entered the a16z pitch chamber. I'm Marc.\n\n"It's time to build."\n\nI want to hear about technology that changes everything. What are you building, and why does the world need it NOW? Attach your deck whenever.`,
      "chamath-palihapitiya": `Social Capital pitch session. I'm Chamath.\n\nFair warning: I'm going to be blunt. "People are unhappy because they're chasing the wrong things." I hope you're not.\n\nWhat are you building and what real human problem does it solve? Files welcome anytime.`,
    };
    setMessages([
      { role: "system", content: intros[shark.id] || `Pitch session with ${shark.name}. What are you building?` },
    ]);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const responses = getResponses();
      const userMsgCount = messages.filter((m) => m.role === "user").length;
      const idx = Math.min(userMsgCount, responses.length - 1);
      setMessages((prev) => [...prev, { role: "system", content: responses[idx] }]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileDrop = () => {
    const fileName = "pitch_deck_v3.pdf";
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📎 Attached: ${fileName}`, attachments: [fileName] },
    ]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Received ${fileName}. I'll include this in your pitch package. Anything else to add?` },
      ]);
    }, 600);
  };

  return (
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
              <div style={{
                width: 48, height: 48,
                background: "#808080",
                border: "inset 2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}>
                {shark.avatar}
              </div>
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

        {/* Term Sheet */}
        <div className="win95-window" style={{ flex: 1 }}>
          <div className="win95-title-bar" style={{ fontSize: 11 }}>
            <span>Term Sheet</span>
          </div>
          <div style={{ padding: 8 }}>
            {([
              { label: "Staked", value: `$${shark.stakedAmount.toLocaleString()}`, color: "green" as const, big: true },
              { label: "Valuation", value: shark.valuationRange, color: "" as const, big: false },
              { label: "Deal Type", value: shark.dealType, color: "" as const, big: false },
              { label: "Stage", value: shark.stage, color: "" as const, big: false },
              { label: "Sectors", value: shark.sectors.join(", "), color: "" as const, big: false },
            ]).map((item) => (
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

            {/* Track record */}
            <div style={{ marginTop: 8, fontSize: 10, color: "#666", marginBottom: 8 }}>
              {shark.dealsCompleted} deals · {shark.successRate}% success
            </div>

            {/* Quotes */}
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
                <p style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>
                  You&apos;ll have a conversation to describe your project.
                  <br />
                  No forms — just talk naturally and attach files.
                  <br />
                  If {shark.name} accepts, ${shark.stakedAmount.toLocaleString()} goes to your wallet.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button className="win95-btn" style={{ fontWeight: "bold", fontSize: 13, padding: "6px 20px" }} onClick={startPitch}>
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
                      color: msg.role === "system" ? "cyan" : "yellow",
                      fontWeight: "bold",
                    }}>
                      {msg.role === "system" ? "SYSTEM" : "YOU"}:
                    </span>
                    <br />
                    <span style={{
                      color: msg.role === "system" ? "lime" : "white",
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </span>
                  </div>
                ))}
                <span className="blink" style={{ color: "lime" }}>█</span>
              </div>

              {/* Input area */}
              <div style={{ padding: 4, display: "flex", gap: 4, alignItems: "flex-end" }}>
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
                  style={{ flex: 1, resize: "none", height: 36, fontFamily: "inherit", fontSize: 12 }}
                />
                <button
                  className="win95-btn"
                  style={{ fontSize: 11, padding: "4px 12px", fontWeight: "bold", flexShrink: 0 }}
                  onClick={sendMessage}
                >
                  Send →
                </button>
              </div>
            </>
          )}

          {/* Status */}
          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
            <div className="status-bar-segment" style={{ fontSize: 11, flex: 1 }}>
              {started ? `${messages.filter(m => m.role === "user").length} message(s) sent` : "Ready"}
            </div>
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              Prize: ${shark.stakedAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
