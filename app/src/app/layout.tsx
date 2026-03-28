import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BootScreen from "@/components/BootScreen";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TermSheet — ARE YOU READY TO PITCH?",
  description: "Hack the funding. Shark Tank on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <BootScreen>
            <div className="crt-overlay" />
            <div className="crt-flicker" />
            <div style={{ paddingBottom: 30, minHeight: "100vh" }}>
              {children}
            </div>
            <Navbar />
          </BootScreen>
        </Providers>
      </body>
    </html>
  );
}
