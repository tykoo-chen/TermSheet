"use client";
import { useState } from "react";
import Link from "next/link";
import { sharks } from "@/lib/mock-data";

const allSectors = ["All", ...Array.from(new Set(sharks.flatMap((s) => s.sectors)))];

export default function Home() {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");

  const filtered = sharks.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (sector !== "All" && !s.sectors.includes(sector)) return false;
    return true;
  });

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8 }}>
      <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="win95-title-bar">
          <span>TermSheet — Who do you want to pitch?</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn">X</div>
          </div>
        </div>

        {/* Toolbar */}
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
            {allSectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, marginLeft: "auto", color: "#666" }}>
            {filtered.length} investor(s) · ${sharks.reduce((a, s) => a + s.stakedAmount, 0).toLocaleString()} staked
          </span>
        </div>

        {/* Investor Cards — larger, more content */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {filtered.map((shark) => (
              <Link key={shark.id} href={`/sharks/${shark.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="win95-window" style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{
                    background: "var(--title-bg-active)",
                    color: "white",
                    padding: "3px 6px",
                    margin: 2,
                    fontSize: 12,
                    fontWeight: "bold",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span>{shark.name}</span>
                    <span style={{ fontFamily: "var(--font-pixel)", fontSize: 14, color: "#aaffaa" }}>
                      ${shark.stakedAmount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ padding: 10, flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Large Avatar */}
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <img
                        src={shark.avatar}
                        alt={shark.name}
                        style={{ width: 200, height: 200, borderRadius: 6, border: "3px inset", objectFit: "cover", margin: "0 auto" }}
                      />
                    </div>

                    {/* Staked + Title */}
                    <div style={{ textAlign: "center", marginBottom: 6 }}>
                      <div style={{ fontFamily: "var(--font-pixel)", fontSize: 24, color: "green", fontWeight: "bold" }}>
                        ${shark.stakedAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{shark.title}</div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                      {shark.sectors.map((s) => (
                        <span key={s} style={{ fontSize: 10, padding: "1px 6px", background: "#e0e0e0", border: "1px solid var(--win-border-dark)" }}>
                          {s}
                        </span>
                      ))}
                      <span style={{ fontSize: 10, padding: "1px 6px", background: "#ffffcc", border: "1px solid #cc9" }}>
                        {shark.stage}
                      </span>
                    </div>

                    {/* Thesis */}
                    <div className="inset-box" style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: 13,
                      padding: 6,
                      lineHeight: 1.4,
                      flex: 1,
                      marginBottom: 8,
                      overflow: "auto",
                    }}>
                      {shark.thesis}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 8, padding: "0 2px" }}>
                      <span>{shark.dealsCompleted}+ deals</span>
                      <span>{shark.successRate}% success</span>
                      <span>{shark.dealType}</span>
                    </div>

                    {/* Quote */}
                    <div style={{ fontSize: 10, fontStyle: "italic", color: "#555", marginBottom: 8, lineHeight: 1.3 }}>
                      &ldquo;{shark.quotes[0]}&rdquo;
                    </div>

                    {/* CTA */}
                    <button className="win95-btn" style={{ width: "100%", fontSize: 12, fontWeight: "bold", padding: "5px 0" }}>
                      Pitch Me →
                    </button>
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
        <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2 }}>
          <div className="status-bar-segment" style={{ fontSize: 11 }}>
            Select an investor to start your pitch
          </div>
        </div>
      </div>
    </div>
  );
}
