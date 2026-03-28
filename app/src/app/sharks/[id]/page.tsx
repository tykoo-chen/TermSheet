"use client";
import { useState } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

export default function SharkProfile({ params }: { params: { id: string } }) {
  const shark = sharks.find((s) => s.id === params.id);
  const [activeTab, setActiveTab] = useState(1);

  if (!shark) {
    return (
      <div style={{ height: "calc(100vh - 30px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="win95-window" style={{ width: 320 }}>
          <div className="win95-title-bar">
            <span>Error</span>
            <div style={{ display: "flex", gap: 2 }}><div className="sys-btn">X</div></div>
          </div>
          <div style={{ padding: 16, textAlign: "center" }}>
            <p style={{ fontSize: 12, marginBottom: 12 }}>Target not found in database.</p>
            <Link href="/"><button className="win95-btn">OK</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8 }}>
      <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="win95-title-bar">
          <span>Target Properties — {shark.name} — Pitch Session</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
          </div>
        </div>

        {/* Menu bar */}
        <div style={{ display: "flex", padding: "2px 4px", borderBottom: "1px solid var(--win-border-dark)" }}>
          <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>File</span>
          <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>View</span>
          <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>Investor</span>
          <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>Help</span>
          <div style={{ marginLeft: "auto", padding: "2px 6px" }}>
            <Link href="/" style={{ fontSize: 11, color: "blue", textDecoration: "underline" }}>
              ← Back to Shark Tank
            </Link>
          </div>
        </div>

        {/* Scrollable content: 3 sections stacked */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {/* ═══════ SECTION 1: INVESTOR PROFILE ═══════ */}
          <div className="win95-window" style={{ marginBottom: 8 }}>
            <div style={{ background: "var(--title-bg-active)", color: "white", padding: "2px 6px", margin: 2, fontSize: 11, fontWeight: "bold" }}>
              Section 1: Investor Profile
            </div>
            <div style={{ padding: 10 }}>
              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--win-border-light)", marginBottom: 0 }}>
                {["General", "Financials", "Track Record"].map((tab, i) => (
                  <div
                    key={tab}
                    className={`win95-tab ${activeTab === i + 1 ? "win95-tab-active" : ""}`}
                    onClick={() => setActiveTab(i + 1)}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div style={{
                border: "2px solid",
                borderColor: "var(--win-border-light) var(--win-border-black) var(--win-border-black) var(--win-border-light)",
                padding: 10,
              }}>
                {/* Tab 1: General */}
                {activeTab === 1 && (
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{
                      width: 56, height: 56,
                      background: "#808080",
                      border: "inset 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      flexShrink: 0,
                    }}>
                      {shark.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: "bold", fontSize: 14 }}>{shark.name}</span>
                        <span style={{ fontSize: 10, color: "#666" }}>{shark.title}</span>
                      </div>
                      <hr style={{ border: "none", borderTop: "1px solid var(--win-border-dark)", borderBottom: "1px solid var(--win-border-light)", marginBottom: 6 }} />
                      <table style={{ fontSize: 12 }}>
                        <tbody>
                          <tr><td style={{ textAlign: "right", paddingRight: 8, color: "#666", whiteSpace: "nowrap" }}>Sectors:</td><td>{shark.sectors.join(", ")}</td></tr>
                          <tr><td style={{ textAlign: "right", paddingRight: 8, color: "#666" }}>Stage:</td><td style={{ fontWeight: "bold" }}>{shark.stage}</td></tr>
                          <tr><td style={{ textAlign: "right", paddingRight: 8, color: "#666" }}>Status:</td><td className="blink" style={{ fontWeight: "bold", color: "green" }}>AWAITING PITCH</td></tr>
                        </tbody>
                      </table>
                      <div className="inset-box" style={{ fontFamily: "var(--font-pixel)", fontSize: 13, padding: 6, marginTop: 8 }}>
                        <strong>THESIS:</strong> {shark.thesis}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Financials */}
                {activeTab === 2 && (
                  <div className="inset-box" style={{
                    fontFamily: "var(--font-pixel)",
                    background: "black",
                    color: "lime",
                    fontSize: 14,
                    padding: 8,
                  }}>
                    Staked: ${shark.stakedAmount.toLocaleString()} [ON-CHAIN VERIFIED]<br />
                    Total Deployed: ${shark.totalDeployed.toLocaleString()} [LIFETIME]<br />
                    Valuation Range: {shark.valuationRange}<br />
                    Deal Type: {shark.dealType}<br />
                    Escrow: 0x1a2b...ef89 [BASE L2]
                  </div>
                )}

                {/* Tab 3: Track Record */}
                {activeTab === 3 && (
                  <div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12 }}>
                      <span>Deals: <strong>{shark.dealsCompleted}</strong></span>
                      <span>Success: <strong>{shark.successRate}%</strong></span>
                      <span>Deployed: <strong>${(shark.totalDeployed / 1000).toFixed(0)}K</strong></span>
                    </div>
                    <div className="inset-box" style={{ background: "white" }}>
                      {[
                        { project: "LiquidSwap", amount: 10000, date: "Mar 2026" },
                        { project: "ZKBridge", amount: 8000, date: "Feb 2026" },
                        { project: "NeuralDAO", amount: 5000, date: "Jan 2026" },
                      ].map((deal) => (
                        <div key={deal.project} style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                          <span>✔ {deal.project}</span>
                          <span style={{ color: "green", fontFamily: "var(--font-pixel)", fontSize: 14 }}>${deal.amount.toLocaleString()}</span>
                          <span style={{ color: "#888" }}>{deal.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ SECTION 2: TERM SHEET ═══════ */}
          <div className="win95-window" style={{ marginBottom: 8 }}>
            <div style={{ background: "var(--title-bg-active)", color: "white", padding: "2px 6px", margin: 2, fontSize: 11, fontWeight: "bold" }}>
              Section 2: Term Sheet — ${shark.stakedAmount.toLocaleString()} Available
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { label: "Check Size", value: `$${shark.stakedAmount.toLocaleString()}`, highlight: true },
                  { label: "Valuation Range", value: shark.valuationRange, highlight: false },
                  { label: "Deal Type", value: shark.dealType, highlight: false },
                  { label: "Stage", value: shark.stage, highlight: false },
                  { label: "Sectors", value: shark.sectors.join(", "), highlight: false },
                  { label: "Joined", value: shark.joinedDate, highlight: false },
                ].map((item) => (
                  <div key={item.label} className="inset-box" style={{ padding: 6, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{item.label}</div>
                    <div style={{
                      fontSize: item.highlight ? 18 : 12,
                      fontWeight: "bold",
                      fontFamily: item.highlight ? "var(--font-pixel)" : "inherit",
                      color: item.highlight ? "green" : "var(--text-dark)",
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="inset-box" style={{ marginTop: 8, fontSize: 10, padding: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "green", fontWeight: "bold" }}>✓ On-Chain Verified</span>
                <span style={{ color: "#888" }}>|</span>
                <span style={{ color: "#888", fontFamily: "var(--font-pixel)", fontSize: 12 }}>Escrow: 0x1a2b...ef89</span>
                <span style={{ color: "#888" }}>|</span>
                <span style={{ color: "#888" }}>Base L2</span>
              </div>
            </div>
          </div>

          {/* ═══════ SECTION 3: SUBMIT YOUR PITCH ═══════ */}
          <div className="win95-window">
            <div style={{ background: "#800000", color: "white", padding: "2px 6px", margin: 2, fontSize: 11, fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚠ Section 3: Submit Your Pitch</span>
              <span style={{ fontFamily: "var(--font-pixel)", color: "yellow", fontSize: 14 }}>
                Prize: ${shark.stakedAmount.toLocaleString()}
              </span>
            </div>
            <div style={{ padding: 10 }}>
              <p style={{ fontSize: 12, marginBottom: 10, color: "#444" }}>
                Fill out the fields below to submit your pitch to <strong>{shark.name}</strong>. If accepted, ${shark.stakedAmount.toLocaleString()} will be released from escrow directly to your wallet.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Project Name:</label>
                  <input className="inset-input" type="text" placeholder="Your project name" style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Website:</label>
                  <input className="inset-input" type="text" placeholder="https://" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Vertical:</label>
                  <select className="inset-input" style={{ width: "100%", padding: 2 }}>
                    <option>DeFi / Financial Infrastructure</option>
                    <option>AI + Web3</option>
                    <option>Consumer / Social</option>
                    <option>Gaming / Entertainment</option>
                    <option>Infrastructure / Dev Tools</option>
                    <option>RWA / Payments</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Stage:</label>
                  <select className="inset-input" style={{ width: "100%", padding: 2 }}>
                    <option>Idea / Pre-product</option>
                    <option>MVP / Beta</option>
                    <option>Live product with users</option>
                    <option>Revenue generating</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Elevator Pitch (max 280 chars):</label>
                <textarea className="inset-input" rows={3} maxLength={280} style={{ width: "100%", resize: "none", fontFamily: "inherit", fontSize: 12 }} placeholder="Describe your project in one paragraph..." />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>GitHub URL:</label>
                  <input className="inset-input" type="text" placeholder="https://github.com/..." style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Twitter / X:</label>
                  <input className="inset-input" type="text" placeholder="@yourhandle" style={{ width: "100%" }} />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 11, marginBottom: 2, fontWeight: "bold" }}>Attachments:</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <div className="inset-box" style={{ textAlign: "center", padding: 12, cursor: "pointer", fontSize: 11, color: "#666" }}>
                    📄 Pitch Deck<br /><span style={{ fontSize: 9 }}>.pdf / .ppt</span>
                  </div>
                  <div className="inset-box" style={{ textAlign: "center", padding: 12, cursor: "pointer", fontSize: 11, color: "#666" }}>
                    📊 Financials<br /><span style={{ fontSize: 9 }}>.xls / .csv</span>
                  </div>
                  <div className="inset-box" style={{ textAlign: "center", padding: 12, cursor: "pointer", fontSize: 11, color: "#666" }}>
                    📎 Other<br /><span style={{ fontSize: 9 }}>any file</span>
                  </div>
                </div>
              </div>

              {/* Wallet info */}
              <div className="inset-box" style={{ padding: 6, marginBottom: 10, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: "bold" }}>Your Wallet:</span>
                <span style={{ fontFamily: "var(--font-pixel)", fontSize: 13 }}>Not connected</span>
                <button className="win95-btn" style={{ fontSize: 10, padding: "2px 8px", marginLeft: "auto" }}>
                  Connect Wallet
                </button>
              </div>

              {/* Submit */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Link href="/"><button className="win95-btn" style={{ fontSize: 12, padding: "4px 16px" }}>Cancel</button></Link>
                <button
                  className="win95-btn"
                  style={{ fontSize: 12, fontWeight: "bold", padding: "4px 20px" }}
                  onClick={() => alert("Pitch submitted! (Backend not yet connected — Supabase integration coming soon)")}
                >
                  Submit Pitch →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
          <div className="status-bar-segment" style={{ flex: 2, fontSize: 11 }}>
            {shark.dealsCompleted} deals | {shark.successRate}% success | Staked: ${shark.stakedAmount.toLocaleString()}
          </div>
          <div className="status-bar-segment" style={{ fontSize: 11 }}>
            Status: OPEN
          </div>
        </div>
      </div>
    </div>
  );
}
