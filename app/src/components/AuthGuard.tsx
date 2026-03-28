"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 30px)" }}>
        <div className="win95-window" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-pixel)", fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
