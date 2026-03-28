"use client";
import { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

type Tab = "investor" | "founder";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("investor");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);

  const startScan = () => {
    setScanning(true);
    setScanResults([]);
    const data = [
      "C:\\portfolio\\fund_a.dat ... OK",
      "C:\\portfolio\\term_sheet_001.xls ... OK",
      "C:\\pitches\\incoming_01.exe ... [REVIEWING]",
      "C:\\pitches\\incoming_02.exe ... [REVIEWING]",
      "C:\\finance\\burn_rate.xls ... [WARNING: HIGH]",
      "C:\\deals\\completed_01.log ... OK",
      "C:\\deals\\completed_02.log ... OK",
      "C:\\deals\\completed_03.log ... OK",
      "C:\\deals\\completed_04.log ... OK",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= data.length) {
        clearInterval(interval);
        setScanning(false);
        setScanResults((prev) => [...prev, "", "SCAN COMPLETE. 2 items require attention."]);
        return;
      }
      setScanResults((prev) => [...prev, data[i]]);
      i++;
    }, 500);
  };

  return (
    <AuthGuard>
    <div style={{ display: "flex", height: "calc(100vh - 30px)" }}>
      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="win95-title-bar">
            <span>Control Panel — Dashboard</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div className="sys-btn">_</div>
              <div className="sys-btn">□</div>
              <div className="sys-btn"><Link href="/" style={{ color: "black", textDecoration: "none" }}>X</Link></div>
            </div>
          </div>

          {/* Mode toggle toolbar */}
          <div style={{ display: "flex", gap: 6, padding: "4px 8px", borderBottom: "1px solid var(--win-border-dark)", alignItems: "center" }}>
            <span style={{ fontSize: 11 }}>View as:</span>
            <button
              className="win95-btn"
              style={{ fontSize: 11, fontWeight: tab === "investor" ? "bold" : "normal" }}
              onClick={() => setTab("investor")}
            >
              💰 Investor
            </button>
            <button
              className="win95-btn"
              style={{ fontSize: 11, fontWeight: tab === "founder" ? "bold" : "normal" }}
              onClick={() => setTab("founder")}
            >
              🚀 Founder
            </button>
            <div style={{ marginLeft: "auto" }}>
              <Link href="/"><button className="win95-btn" style={{ fontSize: 11 }}>← Back to Shark Tank</button></Link>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
              {(tab === "investor"
                ? [
                    { label: "Total Staked", value: "$23,000" },
                    { label: "Active Sheets", value: "2" },
                    { label: "Pending Pitches", value: "8" },
                    { label: "Deals Completed", value: "4" },
                  ]
                : [
                    { label: "Pitches Sent", value: "4" },
                    { label: "Under Review", value: "2" },
                    { label: "Accepted", value: "1" },
                    { label: "Total Raised", value: "$5,000" },
                  ]
              ).map((s) => (
                <div key={s.label} className="inset-box" style={{ textAlign: "center", padding: 6 }}>
                  <div style={{ fontFamily: "var(--font-pixel)", fontSize: 20, color: "green" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {tab === "investor" ? (
              <>
                <p style={{ fontWeight: "bold", fontSize: 12, marginBottom: 4 }}>My Term Sheets:</p>
                <div className="inset-box" style={{ background: "white", marginBottom: 10 }}>
                  {[
                    { amount: 10000, sector: "DeFi", stage: "Pre-seed", pitches: 5, status: "ACTIVE" },
                    { amount: 5000, sector: "AI + Web3", stage: "Seed", pitches: 3, status: "ACTIVE" },
                    { amount: 8000, sector: "Infra", stage: "Pre-seed", pitches: 0, status: "PAUSED" },
                  ].map((sheet, i) => (
                    <div key={i} style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr 80px 80px 80px",
                      padding: "3px 4px",
                      borderBottom: "1px solid #eee",
                      background: i % 2 === 0 ? "white" : "#f0f0f0",
                      fontSize: 11,
                      alignItems: "center",
                    }}>
                      <span style={{ fontFamily: "var(--font-pixel)", fontSize: 14, color: "green", fontWeight: "bold" }}>${sheet.amount.toLocaleString()}</span>
                      <span>{sheet.sector}</span>
                      <span>{sheet.stage}</span>
                      <span>{sheet.pitches} pitches</span>
                      <span style={{ color: sheet.status === "ACTIVE" ? "green" : "orange", fontWeight: "bold", fontSize: 10 }}>
                        [{sheet.status}]
                      </span>
                    </div>
                  ))}
                </div>
                <button className="win95-btn" style={{ fontSize: 11 }}>+ New Term Sheet</button>

                <p style={{ fontWeight: "bold", fontSize: 12, marginBottom: 4, marginTop: 12 }}>Incoming Pitches:</p>
                <div className="inset-box" style={{
                  fontFamily: "var(--font-pixel)", fontSize: 13,
                  background: "black", color: "lime", padding: 6,
                }}>
                  {[
                    { founder: "0xAlice", project: "LiquidSwap", pitch: "Next-gen AMM on Base", time: "2h ago" },
                    { founder: "0xBob", project: "ChainML", pitch: "Decentralized ML marketplace", time: "5h ago" },
                    { founder: "0xCarol", project: "ZKAuth", pitch: "ZK-proof auth layer", time: "1d ago" },
                  ].map((p, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      [NEW] {p.project} by {p.founder} — &quot;{p.pitch}&quot; <span style={{ color: "#555" }}>({p.time})</span>
                    </div>
                  ))}
                  <div className="blink">█</div>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontWeight: "bold", fontSize: 12, marginBottom: 4 }}>Pitch Log:</p>
                <div className="inset-box" style={{
                  fontFamily: "var(--font-pixel)", fontSize: 13,
                  background: "black", color: "lime", padding: 6,
                }}>
                  {[
                    { shark: "Alex Wang", amount: 10000, status: "REVIEWING", time: "2 days ago" },
                    { shark: "Sarah Kim", amount: 5000, status: "ACCEPTED", time: "5 days ago" },
                    { shark: "David Liu", amount: 25000, status: "REJECTED", time: "1 week ago" },
                    { shark: "James Chen", amount: 15000, status: "REVIEWING", time: "1 day ago" },
                  ].map((p, i) => (
                    <div key={i} style={{ marginBottom: 3 }}>
                      <span style={{ color: p.status === "ACCEPTED" ? "lime" : p.status === "REJECTED" ? "red" : "yellow" }}>
                        [{p.status}]
                      </span>
                      {" "}{p.shark} — <span style={{ color: "#ff00ff" }}>${p.amount.toLocaleString()}</span> — {p.time}
                    </div>
                  ))}
                  <div className="blink" style={{ marginTop: 2 }}>█</div>
                </div>
              </>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
            <div className="status-bar-segment" style={{ flex: 2, fontSize: 11 }}>
              {tab === "investor" ? "All systems operational" : "1 accepted | 2 reviewing | 1 rejected"}
            </div>
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              Mode: {tab.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Scanner */}
      <div style={{ width: 280, padding: "8px 8px 8px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="win95-window" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="win95-title-bar" style={{ fontSize: 11 }}>
            <span>System Scanner</span>
            <div style={{ display: "flex", gap: 2 }}><div className="sys-btn">X</div></div>
          </div>
          <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32,
                background: "black",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                {scanning && (
                  <div style={{
                    position: "absolute", width: "100%", height: 2,
                    background: "lime",
                    animation: "scan 2s linear infinite",
                  }} />
                )}
              </div>
              <div style={{ fontSize: 11 }}>
                <strong>Portfolio Diagnostics</strong><br />
                <span style={{ color: "#666" }}>Check system integrity</span>
              </div>
            </div>

            <div className="inset-box" style={{
              fontFamily: "var(--font-pixel)", fontSize: 12,
              flex: 1, overflowY: "auto", background: "white",
            }}>
              {scanResults.length === 0 && <span style={{ color: "#999" }}>Click Start Scan...</span>}
              {scanResults.map((line, i) => (
                <div key={i} style={{ color: line.includes("WARNING") || line.includes("REVIEWING") ? "red" : "black" }}>
                  {line}
                </div>
              ))}
              {scanning && <span className="blink">█</span>}
            </div>

            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <button className="win95-btn" style={{ fontSize: 11 }} onClick={startScan} disabled={scanning}>
                {scanning ? "Scanning..." : "Start Scan"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2 }}>
            <div className="status-bar-segment" style={{ fontSize: 10 }}>
              {scanning ? "Scanning..." : scanResults.length > 0 ? "Done" : "Ready"}
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
