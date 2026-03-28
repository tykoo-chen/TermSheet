"use client";

interface Win95WindowProps {
  title: string;
  children: React.ReactNode;
  menuItems?: string[];
  statusText?: string;
  className?: string;
}

export default function Win95Window({ title, children, menuItems, statusText, className = "" }: Win95WindowProps) {
  return (
    <div className={`win95-window ${className}`} style={{ display: "flex", flexDirection: "column" }}>
      {/* Title Bar */}
      <div className="win95-title-bar">
        <span>{title}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <div className="sys-btn">_</div>
          <div className="sys-btn">□</div>
          <div className="sys-btn">X</div>
        </div>
      </div>

      {/* Menu Bar */}
      {menuItems && (
        <div style={{ display: "flex", padding: "2px 4px", borderBottom: "1px solid var(--win-border-dark)", marginBottom: 2 }}>
          {menuItems.map((item) => (
            <span
              key={item}
              style={{ padding: "2px 6px", cursor: "pointer", fontSize: 12 }}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 8, flexGrow: 1, overflow: "auto" }}>
        {children}
      </div>

      {/* Status Bar */}
      {statusText && (
        <div style={{ borderTop: "1px solid var(--win-border-dark)", padding: "2px 4px", margin: 2, display: "flex", gap: 10 }}>
          <div className="status-bar-segment" style={{ flexGrow: 1, fontSize: 11 }}>
            {statusText}
          </div>
        </div>
      )}
    </div>
  );
}
