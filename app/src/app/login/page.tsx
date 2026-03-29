"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (isSignUp) {
      setSuccess("Check your email to confirm your account.");
    } else {
      router.push("/");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 30px)" }}>
      <div className="win95-window" style={{ width: 360 }}>
        <div className="win95-title-bar">
          <span>{isSignUp ? "Sign Up — TermSheet" : "Log In — TermSheet"}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <div className="sys-btn">X</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          {/* Icon row */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>🔐</span>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              {isSignUp ? "Create your account to start pitching" : "Enter your credentials to continue"}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Email:</label>
            <input
              className="inset-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "4px 6px" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Password:</label>
            <input
              className="inset-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", padding: "4px 6px" }}
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ fontSize: 11, color: "red", marginBottom: 8, padding: "4px 6px", background: "#fff0f0", border: "1px solid red" }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div style={{ fontSize: 11, color: "green", marginBottom: 8, padding: "4px 6px", background: "#f0fff0", border: "1px solid green" }}>
              ✓ {success}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="win95-btn"
              type="submit"
              disabled={loading}
              style={{ flex: 1, fontWeight: "bold", padding: "4px 0" }}
            >
              {loading ? "..." : isSignUp ? "Sign Up" : "Log In"}
            </button>
          </div>

          {/* Toggle */}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11 }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
              style={{ color: "blue", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 11 }}
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
