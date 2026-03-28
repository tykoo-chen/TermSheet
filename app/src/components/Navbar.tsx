"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { base } from "thirdweb/chains";

const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "x"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
];

export default function Navbar() {
  const pathname = usePathname();
  const account = useActiveAccount();
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
          padding: "0 6px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--win-bg)",
        }}
      >
        {client && (
          <ConnectButton
            client={client}
            wallets={wallets}
            chain={base}
            connectButton={{
              label: "Sign In",
              style: {
                fontSize: 11,
                padding: "2px 10px",
                height: 22,
                minWidth: 0,
                fontFamily: "inherit",
              },
            }}
            detailsButton={{
              render: () => (
                <button
                  className="win95-btn"
                  style={{ fontSize: 11, padding: "2px 8px", height: 22, minWidth: 0, fontFamily: "inherit", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {account
                    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                    : "Wallet"}
                </button>
              ),
            }}
          />
        )}
        <span style={{ fontFamily: "var(--font-pixel)", color: "lime", background: "black", padding: "0 4px", fontSize: 14 }}>
          ON
        </span>
        <span style={{ fontSize: 11 }}>{time}</span>
      </div>
    </nav>
  );
}
