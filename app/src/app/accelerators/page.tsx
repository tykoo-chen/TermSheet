"use client";
import { useState } from "react";
import Link from "next/link";
import { accelerators } from "@/lib/accelerator-data";

const allFocus = ["All", ...Array.from(new Set(accelerators.flatMap((a) => a.focus)))];

export default function AcceleratorsPage() {
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState("All");

  const filtered = accelerators.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.tagline.toLowerCase().includes(search.toLowerCase())) return false;
    if (focus !== "All" && !a.focus.includes(focus)) return false;
    return true;
  });

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8 }}>
      <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="win95-title-bar">
          <span>TermSheet — Accelerator Programs</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <div className="sys-btn">X</div>
          </div>
        </div>

        {/* Banner row */}
        <div style={{ padding: "4px 8px", background: "#000080", display: "flex", alignItems: "center", gap: 8, borderBottom: "2px solid var(--win-border-dark)", flexWrap: "wrap" }}>
          <span style={{ color: "white", fontFamily: "var(--font-pixel)", fontSize: 11, letterSpacing: 1 }}>🚀 TOP GLOBAL ACCELERATORS</span>
          <div style={{ width: 1, background: "#4444aa", alignSelf: "stretch", margin: "0 4px" }} />
          <span style={{ color: "#aaf", fontFamily: "var(--font-pixel)", fontSize: 11 }}>Find the right program for your startup</span>
          <Link href="/" style={{ marginLeft: "auto" }}>
            <button className="win95-btn" style={{ fontWeight: "bold", fontSize: 11, padding: "1px 10px", background: "#00ff88" }}>
              ← Back to VCs
            </button>
          </Link>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 6, padding: "4px 6px", borderBottom: "1px solid var(--win-border-dark)", alignItems: "center" }}>
          <span style={{ fontSize: 11 }}>Find:</span>
          <input
            className="inset-input"
            type="text"
            placeholder="Search accelerators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 180 }}
          />
          <span style={{ fontSize: 11, marginLeft: 8 }}>Focus:</span>
          <select
            className="inset-input"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            style={{ padding: 2 }}
          >
            {allFocus.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, marginLeft: "auto", color: "#666" }}>
            {filtered.length} program(s) · {accelerators.reduce((a, p) => a + p.totalFunded, 0).toLocaleString()}+ companies funded
          </span>
        </div>

        {/* Accelerator Cards */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {filtered.map((acc) => (
              <Link key={acc.id} href={`/accelerators/${acc.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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
                    <span>{acc.name}</span>
                    <span style={{ fontFamily: "var(--font-pixel)", fontSize: 14, color: "#aaffaa" }}>
                      {acc.fundingOffered}
                    </span>
                  </div>
                  <div style={{ padding: 10, flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        style={{ width: 200, height: 200, borderRadius: 6, border: "3px inset", objectFit: "contain", background: "white", padding: 8, margin: "0 auto" }}
                      />
                    </div>

                    {/* Funding + Tagline */}
                    <div style={{ textAlign: "center", marginBottom: 6 }}>
                      <div style={{ fontFamily: "var(--font-pixel)", fontSize: 24, color: "green", fontWeight: "bold" }}>
                        {acc.fundingOffered}
                      </div>
                      <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{acc.tagline}</div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                      {acc.focus.slice(0, 4).map((f) => (
                        <span key={f} style={{ fontSize: 10, padding: "1px 6px", background: "#e0e0e0", border: "1px solid var(--win-border-dark)" }}>
                          {f}
                        </span>
                      ))}
                      <span style={{ fontSize: 10, padding: "1px 6px", background: "#ffffcc", border: "1px solid #cc9" }}>
                        {acc.stage}
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
                      {acc.thesis}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 8, padding: "0 2px" }}>
                      <span>{acc.totalFunded}+ funded</span>
                      <span>{acc.equity} equity</span>
                      <span>{acc.duration}</span>
                    </div>

                    {/* Quote */}
                    <div style={{ fontSize: 10, fontStyle: "italic", color: "#555", marginBottom: 8, lineHeight: 1.3 }}>
                      &ldquo;{acc.quote}&rdquo;
                    </div>

                    {/* CTA */}
                    <button className="win95-btn" style={{ width: "100%", fontSize: 12, fontWeight: "bold", padding: "5px 0" }}>
                      View Program →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#666", fontSize: 12 }}>
              No accelerators match your search.
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2 }}>
          <div className="status-bar-segment" style={{ fontSize: 11 }}>
            Select an accelerator to view program details
          </div>
        </div>
      </div>
    </div>
  );
}
