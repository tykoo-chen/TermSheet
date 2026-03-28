"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
}

export default function SharkProfile({ params }: { params: { id: string } }) {
  const shark = sharks.find((s) => s.id === params.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  const startPitch = async () => {
    setStarted(true);
    setLoading(true);

    // Get the investor's opening line from Grok
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharkId: shark.id,
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
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for Grok (convert "assistant" display role to API format)
      const apiMessages = newMessages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharkId: shark.id,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "..." }]);
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
    const fileName = "pitch_deck_v3.pdf";
    const userMsg: Message = { role: "user", content: `📎 Attached: ${fileName}`, attachments: [fileName] };
    setMessages((prev) => [...prev, userMsg]);
    // Tell the AI about the file
    setLoading(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharkId: shark.id,
        messages: [...messages, userMsg].map((m) => ({
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Got it." }]);
      })
      .catch(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: "File received. Continue your pitch." }]);
      })
      .finally(() => setLoading(false));
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
                {loading && <span style={{ color: "cyan" }}>typing</span>}
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
              {loading ? `${shark.name} is thinking...` : started ? `${messages.filter(m => m.role === "user").length} message(s) sent` : "Ready"}
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
