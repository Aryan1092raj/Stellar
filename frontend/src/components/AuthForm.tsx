"use client";
import { useState } from "react";
import { sendOtp, verifyOtp } from "../lib/auth";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.94v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.05l3.02-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .94 4.95l3.02 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function AuthForm({ role }: { role: "donor" | "ngo" }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth(role);
  const title = role === "ngo" ? "NGO Login" : "Donor Login";
  const subtitle = role === "ngo"
    ? "Access your campaigns, evidence uploads, and donor updates."
    : "Sign in to fund verified progress with transparent Stellar records.";

  async function handleSendOtp() {
    setLoading(true);
    setError("");
    try {
      await sendOtp(email);
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError("");
    try {
      const success = await verifyOtp(email, otp, role);

      if (success) {
        window.location.href = "/";
      } else {
        setError("Invalid OTP");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      await loginWithGoogle();
      window.location.href = "/";
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Google login failed");
    }
  }

  return (
    <div className="auth-form">
      <div className="auth-form-heading">
        <div className="auth-kicker">{role === "ngo" ? "Organization access" : "Supporter access"}</div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {step === "email" ? (
        <>
          <button
            className="google-auth-btn"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            type="button"
          >
            <GoogleLogo />
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>
          <div className="auth-divider">or</div>
          <label className="auth-field">
            <span>Email address</span>
            <input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="auth-primary-btn" onClick={handleSendOtp} disabled={loading || !email} type="button">
            {loading ? "Sending..." : "Send OTP"}
          </button>
          {(googleError || error) && <p className="auth-error">{googleError || error}</p>}
        </>
      ) : (
        <>
          <label className="auth-field">
            <span>One-time password</span>
            <input
              placeholder="Enter OTP"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </label>
          <button className="auth-primary-btn" onClick={handleVerifyOtp} disabled={loading || !otp} type="button">
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button className="auth-link-btn" onClick={() => setStep("email")} type="button">
            Use another email
          </button>
          {error && <p className="auth-error">{error}</p>}
        </>
      )}
      <style jsx>{`
        .google-auth-btn {
          align-items: center;
          background: #fff;
          border: 1px solid #dadce0;
          border-radius: 8px;
          color: #202124;
          display: flex;
          font-weight: 600;
          gap: 10px;
          justify-content: center;
          min-height: 42px;
          width: 100%;
        }
        .google-auth-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        .auth-divider {
          align-items: center;
          color: #6b7280;
          display: flex;
          font-size: 13px;
          gap: 10px;
          margin: 12px 0;
        }
        .auth-divider::before,
        .auth-divider::after {
          background: #e5e7eb;
          content: "";
          flex: 1;
          height: 1px;
        }
        .auth-error {
          color: #b91c1c;
          font-size: 13px;
          margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}
