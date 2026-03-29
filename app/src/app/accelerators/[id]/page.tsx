"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { accelerators } from "@/lib/accelerator-data";

export default function AcceleratorDetailPage() {
  const { id } = useParams();
  const acc = accelerators.find((a) => a.id === id);

  if (!acc) {
    return (
      <div style={{ height: "calc(100vh - 30px)", padding: 8 }}>
        <div className="win95-window" style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 20, marginBottom: 16 }}>404 — Accelerator Not Found</div>
            <Link href="/accelerators">
              <button className="win95-btn">← Back to Accelerators</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 30px)", padding: 8, overflow: "auto" }}>
      <div className="win95-window" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        <div className="win95-title-bar">
          <span>{acc.name} — Program Details</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">_</div>
            <div className="sys-btn">□</div>
            <Link href="/accelerators"><div className="sys-btn">X</div></Link>
          </div>
        </div>

        <div style={{ padding: 12, flex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 auto" }}>
              <img
                src={acc.avatar}
                alt={acc.name}
                style={{ width: 200, height: 200, border: "3px inset", borderRadius: 6, objectFit: "contain", background: "white", padding: 8 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: 22, fontWeight: "bold", marginBottom: 4 }}>{acc.name}</div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{acc.tagline}</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 10 }}>
                {acc.focus.map((f) => (
                  <span key={f} style={{ fontSize: 10, padding: "1px 6px", background: "#e0e0e0", border: "1px solid var(--win-border-dark)" }}>
                    {f}
                  </span>
                ))}
                <span style={{ fontSize: 10, padding: "1px 6px", background: "#ffffcc", border: "1px solid #cc9" }}>
                  {acc.stage}
                </span>
              </div>

              {/* Key stats grid */}
              <div className="inset-box" style={{ padding: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 10 }}>
                <div><span style={{ color: "#666" }}>Funding:</span> <strong>{acc.fundingOffered}</strong></div>
                <div><span style={{ color: "#666" }}>Equity:</span> <strong>{acc.equity}</strong></div>
                <div><span style={{ color: "#666" }}>Duration:</span> <strong>{acc.duration}</strong></div>
                <div><span style={{ color: "#666" }}>Batch Size:</span> <strong>{acc.batchSize}</strong></div>
                <div><span style={{ color: "#666" }}>Programs/yr:</span> <strong>{acc.programsPerYear}x/year</strong></div>
                <div><span style={{ color: "#666" }}>Location:</span> <strong style={{ fontSize: 10 }}>{acc.location}</strong></div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <a href={`https://${acc.website}`} target="_blank" rel="noopener noreferrer">
                  <button className="win95-btn" style={{ fontSize: 11, padding: "2px 10px" }}>
                    🌐 Website
                  </button>
                </a>
                <a href={acc.applyUrl} target="_blank" rel="noopener noreferrer">
                  <button className="win95-btn" style={{ fontSize: 11, padding: "2px 10px", fontWeight: "bold", background: "yellow" }}>
                    Apply Now →
                  </button>
                </a>
              </div>
            </div>
          </div>

          {/* Thesis */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 13, fontWeight: "bold", marginBottom: 4, borderBottom: "2px solid var(--win-border-dark)", paddingBottom: 2 }}>
              INVESTMENT THESIS
            </div>
            <div className="inset-box" style={{ padding: 8, fontFamily: "var(--font-pixel)", fontSize: 13, lineHeight: 1.5 }}>
              {acc.thesis}
            </div>
          </div>

          {/* Notable Portfolio */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 13, fontWeight: "bold", marginBottom: 4, borderBottom: "2px solid var(--win-border-dark)", paddingBottom: 2 }}>
              NOTABLE PORTFOLIO
            </div>
            <div className="inset-box" style={{ padding: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {acc.notablePortfolio.map((co) => (
                <span key={co} style={{ fontSize: 11, padding: "2px 8px", background: "#d0d0d0", border: "1px solid var(--win-border-dark)", fontWeight: "bold" }}>
                  {co}
                </span>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div style={{ marginBottom: 12 }}>
            <div className="inset-box" style={{ padding: 10, fontFamily: "var(--font-pixel)", fontSize: 15, fontStyle: "italic", color: "#333", textAlign: "center", lineHeight: 1.5 }}>
              &ldquo;{acc.quote}&rdquo;
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Link href="/accelerators">
              <button className="win95-btn" style={{ fontSize: 11, padding: "2px 10px" }}>
                ← All Accelerators
              </button>
            </Link>
            <span style={{ fontSize: 10, color: "#888" }}>{acc.totalFunded}+ companies funded</span>
            <a href={acc.applyUrl} target="_blank" rel="noopener noreferrer">
              <button className="win95-btn" style={{ fontSize: 12, fontWeight: "bold", padding: "4px 16px", background: "yellow" }}>
                Apply Now →
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
