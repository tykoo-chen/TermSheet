"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "Shark Tank", taskLabel: "Shark Tank" },
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

      <div style={{ borderLeft: "1px solid var(--win-border-dark)", borderRight: "1px solid var(--win-border-mid)", margin: "0 4px", height: "100%" }} />

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
          boxShadow: "inset -1px -1px var(--win-border-mid), inset 1px 1px var(--btn-shadow)",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {user ? (
          <>
            <span style={{ fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="win95-btn"
              style={{ fontSize: 9, padding: "1px 6px" }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login">
            <span style={{ fontSize: 10, color: "blue", textDecoration: "underline", cursor: "pointer" }}>
              Log In
            </span>
          </Link>
        )}
        <span style={{ fontFamily: "var(--font-pixel)", color: "lime", background: "black", padding: "0 4px", fontSize: 14 }}>
          {user ? "ON" : "OFF"}
        </span>
        <span style={{ fontSize: 11 }}>{time}</span>
      </div>
    </nav>
  );
}
