"use client";
import { useState } from "react";
import Link from "next/link";
import Win95Window from "@/components/Win95Window";
import { sharks } from "@/lib/mock-data";

const sectors = ["All", "DeFi", "AI + Web3", "Infrastructure", "Consumer", "Gaming", "Social", "RWA", "Payments", "Dev Tools", "ZK"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");

  const filtered = sharks.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (sector !== "All" && !s.sectors.includes(sector)) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 30px)" }}>
      {/* Left: Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="win95-title-bar">
            <span>TermSheet — Who do you want to pitch?</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div className="sys-btn">_</div>
              <div className="sys-btn">□</div>
              <div className="sys-btn">X</div>
            </div>
          </div>

          {/* Menu */}
          <div style={{ display: "flex", padding: "2px 4px", borderBottom: "1px solid var(--win-border-dark)" }}>
            <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>File</span>
            <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>Edit</span>
            <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>View</span>
            <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>Investors</span>
            <span style={{ padding: "2px 6px", fontSize: 12, cursor: "pointer" }}>Help</span>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: 4, padding: "4px 6px", borderBottom: "1px solid var(--win-border-dark)", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11 }}>Find:</span>
            <input
              className="inset-input"
              type="text"
              placeholder="Search investors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 160 }}
            />
            <span style={{ fontSize: 11, marginLeft: 8 }}>Sector:</span>
            <select
              className="inset-input"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              style={{ padding: 2 }}
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, marginLeft: "auto", color: "#666" }}>
              {filtered.length} investor(s) found
            </span>
          </div>

          {/* Shark Grid */}
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {filtered.map((shark) => (
                <Link key={shark.id} href={`/sharks/${shark.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="win95-window" style={{
                    cursor: "pointer",
                    transition: "box-shadow 0.1s",
                  }}>
                    <div style={{
                      background: "var(--title-bg-active)",
                      color: "white",
                      padding: "2px 4px",
                      margin: 2,
                      fontSize: 11,
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                    }}>
                      <span>{shark.name}</span>
                      <span style={{ opacity: 0.7 }}>★</span>
                    </div>
                    <div style={{ padding: 8 }}>
                      {/* Avatar + Amount */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <div style={{
                          width: 36, height: 36,
                          background: "#808080",
                          border: "inset 2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}>
                          {shark.avatar}
                        </div>
                        <div>
                          <div style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: 20,
                            color: "green",
                            fontWeight: "bold",
                            lineHeight: 1,
                          }}>
                            ${shark.stakedAmount.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 10, color: "#666" }}>staked</div>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ fontSize: 10, color: "#444", marginBottom: 6, lineHeight: 1.4 }}>
                        {shark.title}
                      </div>

                      {/* Tags */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
                        {shark.sectors.map((s) => (
                          <span key={s} style={{
                            fontSize: 9,
                            padding: "1px 4px",
                            background: "#e0e0e0",
                            border: "1px solid var(--win-border-dark)",
                          }}>
                            {s}
                          </span>
                        ))}
                        <span style={{
                          fontSize: 9,
                          padding: "1px 4px",
                          background: "#ffffcc",
                          border: "1px solid #cc9",
                        }}>
                          {shark.stage}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 6 }}>
                        <span>{shark.dealsCompleted} deals</span>
                        <span>{shark.successRate}% success</span>
                      </div>

                      {/* CTA */}
                      <button className="win95-btn" style={{ width: "100%", fontSize: 11, fontWeight: "bold" }}>
                        Pitch Me →
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#666", fontSize: 12 }}>
                No investors match your search. Try different filters.
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
            <div className="status-bar-segment" style={{ flex: 3, fontSize: 11 }}>
              Select an investor to start your pitch
            </div>
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              Total: ${sharks.reduce((a, s) => a + s.stakedAmount, 0).toLocaleString()} staked
            </div>
          </div>
        </div>
      </div>

      {/* Right: System Info Sidebar */}
      <div style={{ width: 200, padding: "8px 8px 8px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Quick Stats */}
        <div className="win95-window">
          <div className="win95-title-bar" style={{ fontSize: 11 }}>
            <span>System Info</span>
          </div>
          <div style={{ padding: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Active Sheets:</span><span style={{ fontWeight: "bold" }}>42</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Total Staked:</span><span style={{ fontWeight: "bold", color: "green" }}>$456K</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>Deals Done:</span><span style={{ fontWeight: "bold" }}>89</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Avg Time:</span><span style={{ fontWeight: "bold" }}>3.2 days</span>
            </div>
          </div>
        </div>

        {/* Dashboard link */}
        <Link href="/dashboard">
          <button className="win95-btn" style={{ width: "100%", fontSize: 11 }}>
            📊 Open Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
