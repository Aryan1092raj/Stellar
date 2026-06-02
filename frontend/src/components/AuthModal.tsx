"use client";
import React, { useState } from "react";
import { sendOtp, verifyOtp } from "../lib/auth";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

type Props = {
  onClose?: () => void;
  role?: "donor" | "ngo";
};

export default function AuthModal({ onClose, role = "donor" }: Props) {
  const [step, setStep] = useState<"choose" | "email" | "verify" | "done">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { loginWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth(role);

  // ✅ SEND OTP
  async function handleSendOtp() {
    if (!email.includes("@")) {
      setMessage("Enter a valid email address");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await sendOtp(email);

      setMessage("OTP sent to your email");

      setStep("verify");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // ✅ VERIFY OTP
  async function handleVerifyOtp() {
    if (!email || !code) {
      setMessage("Enter the OTP");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const ok = await verifyOtp(email, code, role);

      if (!ok) throw new Error("Invalid OTP");

      setStep("done");
      setMessage("✅ Login successful");

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setMessage(null);
    try {
      await loginWithGoogle();
      setStep("done");
      setMessage("Login successful");

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Google login failed");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="modal-close" onClick={() => onClose?.()}>
          ×
        </button>

        {/* ✅ STEP 1 */}
        {step === "choose" && (
          <div>
            <h3>Sign in as {role === "ngo" ? "NGO" : "Donor"}</h3>
            <div className="auth-stack">
              <button className="google-btn" onClick={handleGoogleLogin} disabled={loading || googleLoading}>
                <GoogleLogo />
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>
              <div className="auth-divider">or</div>
              <button className="btn" onClick={() => setStep("email")} disabled={loading || googleLoading}>
                Continue with email
              </button>
            </div>
            {(message || googleError) && <div style={{ marginTop: 8, fontSize: 13 }}>{message || googleError}</div>}
          </div>
        )}

        {/* ✅ STEP 2 */}
        {step === "email" && (
          <div>
            <h3>Enter your email</h3>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={handleSendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
              <button className="btn" onClick={() => setStep("choose")} disabled={loading}>
                Back
              </button>
            </div>

            {message && <div style={{ marginTop: 8, fontSize: 13 }}>{message}</div>}
          </div>
        )}

        {/* ✅ STEP 3 */}
        {step === "verify" && (
          <div>
            <h3>Enter verification code</h3>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
            />

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button className="btn" onClick={() => setStep("email")} disabled={loading}>
                Back
              </button>
            </div>

            {message && <div style={{ marginTop: 8, fontSize: 13 }}>{message}</div>}
          </div>
        )}

        {/* ✅ STEP 4 */}
        {step === "done" && (
          <div>
            <h3>✅ Signed in successfully</h3>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => onClose?.()}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          z-index: 9999;
        }
        .modal {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          min-width: 320px;
          position: relative;
        }
        .modal-close {
          position: absolute;
          right: 12px;
          top: 8px;
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
        }
        .auth-stack {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }
        .google-btn {
          align-items: center;
          background: #fff;
          border: 1px solid #dadce0;
          border-radius: 6px;
          color: #202124;
          display: flex;
          font-weight: 600;
          gap: 10px;
          justify-content: center;
          min-height: 40px;
          padding: 8px 14px;
          width: 100%;
        }
        .google-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        .auth-divider {
          align-items: center;
          color: #6b7280;
          display: flex;
          font-size: 13px;
          gap: 10px;
        }
        .auth-divider::before,
        .auth-divider::after {
          background: #e5e7eb;
          content: "";
          flex: 1;
          height: 1px;
        }
        input {
          width: 100%;
          padding: 8px;
          margin-top: 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
        }
        .btn {
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          background: #2563eb;
          color: white;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

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
