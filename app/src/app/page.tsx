"use client";
import { useState } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";
import AuthGuard from "@/components/AuthGuard";

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
    <AuthGuard>
    <div style={{ display: "flex", height: "calc(100vh - 30px)" }}>
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

          {/* Toolbar — search + filter only */}
          <div style={{ display: "flex", gap: 6, padding: "4px 6px", borderBottom: "1px solid var(--win-border-dark)", alignItems: "center" }}>
            <span style={{ fontSize: 11 }}>Find:</span>
            <input
              className="inset-input"
              type="text"
              placeholder="Search investors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180 }}
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
              {filtered.length} investor(s)
            </span>
            <Link href="/dashboard">
              <button className="win95-btn" style={{ fontSize: 10, padding: "2px 8px" }}>📊 Dashboard</button>
            </Link>
          </div>

          {/* Shark Grid — fixed height cards */}
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {filtered.map((shark) => (
                <Link key={shark.id} href={`/sharks/${shark.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="win95-window" style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{
                      background: "var(--title-bg-active)",
                      color: "white",
                      padding: "2px 6px",
                      margin: 2,
                      fontSize: 11,
                      fontWeight: "bold",
                    }}>
                      {shark.name}
                    </div>
                    <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Amount */}
                      <div style={{
                        fontFamily: "var(--font-pixel)",
                        fontSize: 22,
                        color: "green",
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}>
                        ${shark.stakedAmount.toLocaleString()}
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 11, color: "#444", marginBottom: 6, lineHeight: 1.3, minHeight: 28 }}>
                        {shark.title}
                      </div>

                      {/* Tags — fixed area */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6, minHeight: 22 }}>
                        {shark.sectors.slice(0, 2).map((s) => (
                          <span key={s} style={{ fontSize: 9, padding: "1px 4px", background: "#e0e0e0", border: "1px solid var(--win-border-dark)" }}>
                            {s}
                          </span>
                        ))}
                        <span style={{ fontSize: 9, padding: "1px 4px", background: "#ffffcc", border: "1px solid #cc9" }}>
                          {shark.stage}
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 6 }}>
                        <span>{shark.dealsCompleted} deals</span>
                        <span>{shark.successRate}%</span>
                      </div>

                      {/* CTA — pushed to bottom */}
                      <div style={{ marginTop: "auto" }}>
                        <button className="win95-btn" style={{ width: "100%", fontSize: 11, fontWeight: "bold" }}>
                          Pitch Me →
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#666", fontSize: 12 }}>
                No investors match your search.
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
            <div className="status-bar-segment" style={{ flex: 3, fontSize: 11 }}>
              Select an investor to start your pitch
            </div>
            <div className="status-bar-segment" style={{ fontSize: 11 }}>
              ${sharks.reduce((a, s) => a + s.stakedAmount, 0).toLocaleString()} staked
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
