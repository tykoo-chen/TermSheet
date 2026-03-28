"use client";
import { useState, useEffect } from "react";

export default function BootScreen({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);
  const [dead, setDead] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("termsheet-booted") === "1") {
      setBooted(true);
    }
    setMounted(true);
  }, []);

  const handleBoot = () => {
    sessionStorage.setItem("termsheet-booted", "1");
    setBooted(true);
  };

  // Prevent hydration mismatch — render nothing until client is mounted
  if (!mounted) {
    return <div style={{ background: "var(--os-bg)", height: "100vh" }} />;
  }

  if (dead) {
    return (
      <>
        <div className="crt-overlay" />
        <div className="crt-flicker" />
        <div style={{
          background: "var(--os-bg)",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div className="win95-window" style={{ width: 400, padding: 0 }}>
            <div className="win95-title-bar">
              <span>termsheet.exe - Application Error</span>
              <div style={{ display: "flex", gap: 2 }}>
                <div className="sys-btn">X</div>
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <svg viewBox="0 0 32 32" width="32" height="32" style={{ flexShrink: 0 }}>
                <circle cx="16" cy="16" r="14" fill="red" stroke="#800" />
                <path d="M11 11l10 10M21 11l-10 10" stroke="white" strokeWidth="3" />
              </svg>
              <div>
                <p style={{ fontSize: 12, marginBottom: 12 }}>
                  The connection has been terminated by the user.
                  <br /><br />
                  Press OK to exit.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "0 16px 16px" }}>
              <button className="win95-btn" style={{ width: 80 }} onClick={() => setDead(false)}>OK</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!booted) {
    return (
      <>
        <div className="crt-overlay" />
        <div className="crt-flicker" />
        <div style={{
          background: "var(--os-bg)",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div className="win95-window" style={{ width: 460 }}>
            <div className="win95-title-bar">
              <span>TermSheet v1.0 - System Startup</span>
              <div style={{ display: "flex", gap: 2 }}>
                <div className="sys-btn">_</div>
                <div className="sys-btn">□</div>
                <div className="sys-btn">X</div>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              {/* Icon + Message */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
                <svg viewBox="0 0 32 32" width="48" height="48" style={{ flexShrink: 0 }}>
                  <path d="M16 2L2 30h28L16 2z" fill="yellow" stroke="#000" strokeWidth="1" />
                  <path d="M15 10h2v10h-2zM15 24h2v2h-2z" fill="#000" />
                </svg>
                <div>
                  <p style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: 28,
                    color: "var(--text-dark)",
                    lineHeight: 1.3,
                    marginBottom: 8,
                  }}>
                    ARE YOU READY<br />TO PITCH?
                  </p>
                  <p style={{ fontSize: 12, color: "#444" }}>
                    TermSheet will initialize the funding mainframe.
                    <br />
                    Investors have staked real capital. This is not a drill.
                  </p>
                </div>
              </div>

              {/* Separator */}
              <hr style={{ border: "none", borderTop: "1px solid var(--win-border-dark)", borderBottom: "1px solid var(--win-border-light)", marginBottom: 16 }} />

              {/* Terminal preview */}
              <div className="inset-box" style={{
                background: "black",
                color: "lime",
                fontFamily: "var(--font-pixel)",
                fontSize: 13,
                padding: 6,
                height: 58,
                marginBottom: 16,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}>
                C:\&gt; loading shark_tank.dat ...<br />
                C:\&gt; 42 active term sheets found<br />
                C:\&gt; total staked: $456,000<span className="blink">█</span>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  className="win95-btn"
                  style={{ width: 120, fontWeight: "bold", fontSize: 13, padding: "6px 12px" }}
                  onClick={handleBoot}
                >
                  YES
                </button>
                <button
                  className="win95-btn"
                  style={{ width: 120, fontSize: 13, padding: "6px 12px" }}
                  onClick={() => setDead(true)}
                >
                  NO
                </button>
              </div>
            </div>
            {/* Status bar */}
            <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 6px", margin: 2, display: "flex" }}>
              <div className="status-bar-segment" style={{ flexGrow: 1, fontSize: 11 }}>
                Ready to connect to funding mainframe...
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
