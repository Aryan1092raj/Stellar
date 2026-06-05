"use client";
import React, { useState } from "react";
import { sendOtp, verifyOtp } from "../lib/auth";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

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

  async function handleSendOtp() {
    if (!email.includes("@")) {
      setMessage("Enter a valid email address");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await sendOtp(email);
      setMessage("OTP sent to your email");
      setStep("verify");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-canvas border border-hairline p-8 rounded-xl max-w-md w-full relative shadow-soft">
        <button
          className="absolute right-4 top-4 rounded-full opacity-70 hover:opacity-100 p-1 hover:bg-surface-soft"
          onClick={() => onClose?.()}
        >
          <X className="h-5 w-5 text-ink" />
        </button>

        {step === "choose" && (
          <div className="flex flex-col space-y-6">
            <div>
              <h3 className="text-[20px] font-semibold text-ink">Sign in as {role === "ngo" ? "NGO" : "Donor"}</h3>
              <p className="text-sm text-body mt-1">Select your preferred login method.</p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button onClick={handleGoogleLogin} disabled={loading || googleLoading} variant="outline" className="w-full h-12">
                Continue with Google
              </Button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-hairline"></div>
                <span className="flex-shrink mx-3 text-muted text-xs font-semibold uppercase">or</span>
                <div className="flex-grow border-t border-hairline"></div>
              </div>
              <Button onClick={() => setStep("email")} disabled={loading || googleLoading} className="w-full h-12">
                Continue with Email
              </Button>
            </div>

            {(message || googleError) && (
              <div className="text-xs font-semibold text-center text-semantic-down mt-2">
                {message || googleError}
              </div>
            )}
          </div>
        )}

        {step === "email" && (
          <div className="flex flex-col space-y-6">
            <div>
              <h3 className="text-[20px] font-semibold text-ink">Enter your email</h3>
              <p className="text-sm text-body mt-1">We will send a one-time code to this address.</p>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="modal-email">Email address</Label>
                <Input
                  id="modal-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleSendOtp} disabled={loading} className="flex-1">
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
                <Button onClick={() => setStep("choose")} variant="outline" disabled={loading}>
                  Back
                </Button>
              </div>
            </div>

            {message && <div className="text-xs text-center text-semantic-down font-semibold">{message}</div>}
          </div>
        )}

        {step === "verify" && (
          <div className="flex flex-col space-y-6">
            <div>
              <h3 className="text-[20px] font-semibold text-ink">Enter verification code</h3>
              <p className="text-sm text-body mt-1">Check your inbox for the 6-digit code.</p>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="modal-code">One-time code</Label>
                <Input
                  id="modal-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleVerifyOtp} disabled={loading} className="flex-1">
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                <Button onClick={() => setStep("email")} variant="outline" disabled={loading}>
                  Back
                </Button>
              </div>
            </div>

            {message && <div className="text-xs text-center text-semantic-down font-semibold">{message}</div>}
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col space-y-4 text-center">
            <h3 className="text-[20px] font-semibold text-semantic-up">{message || "Signed in successfully"}</h3>
            <p className="text-sm text-body">Redirecting you to the platform...</p>
            <Button onClick={() => onClose?.()} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
