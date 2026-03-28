"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setTime(`${h}:${m} ${ampm}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { href: "/", label: "Shark Tank", taskLabel: "Shark Tank" },
    { href: "/dashboard", label: "Dashboard", taskLabel: "Dashboard" },
  ];

  return (
    <nav className="win95-taskbar">
      {/* Start Button */}
      <button className="win95-btn" style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: "bold", padding: "0 8px" }}>
        <svg viewBox="0 0 16 16" width="16" height="16">
          <rect width="7" height="7" fill="red" />
          <rect x="8" width="7" height="7" fill="green" />
          <rect y="8" width="7" height="7" fill="blue" />
          <rect x="8" y="8" width="7" height="7" fill="yellow" />
        </svg>
        Start
      </button>

      <div style={{ borderLeft: "2px solid var(--win-border-dark)", borderRight: "1px solid var(--win-border-light)", margin: "0 4px", height: "100%" }} />

      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <div className={`task-item ${pathname === item.href ? "task-item-active" : ""}`}>
            {item.taskLabel}
          </div>
        </Link>
      ))}

      {/* System Tray */}
      <div
        style={{
          marginLeft: "auto",
          borderTop: "2px solid var(--win-border-dark)",
          borderLeft: "2px solid var(--win-border-dark)",
          borderRight: "2px solid var(--win-border-light)",
          borderBottom: "2px solid var(--win-border-light)",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--win-bg)",
        }}
      >
        <span style={{ fontFamily: "var(--font-pixel)", color: "lime", background: "black", padding: "0 4px", fontSize: 14 }}>
          ON
        </span>
        <span style={{ fontSize: 11 }}>{time}</span>
      </div>
    </nav>
  );
}
