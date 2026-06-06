"use client";
import React, { useState } from "react";
import Link from "next/link";
import { sendOtp, verifyOtp } from "../lib/auth";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.05l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .94 4.95l3.02 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
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

  const title = role === "ngo" ? "Organization Portal" : "Donor Portal";
  const subtitle =
    role === "ngo"
      ? "Access campaigns, publish proof of work, and track funding."
      : "Access your dashboard, fund campaigns, and view verification maps.";

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
        setError("Invalid OTP code. Please try again.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
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
    <div className="w-full max-w-md mx-auto flex flex-col space-y-6">
      <Link
        href="/"
        className="text-xs font-semibold text-muted hover:text-primary transition-colors flex items-center space-x-1 w-fit"
      >
        <span>← Back to Home</span>
      </Link>
      <div className="flex flex-col space-y-2 text-left">
        <span className="text-[12px] font-bold tracking-widest text-primary uppercase">
          {role === "ngo" ? "Verified NGOs Only" : "Individual Supporter"}
        </span>
        <h2 className="text-[24px] md:text-[32px] font-normal tracking-tight text-ink leading-tight">
          {title}
        </h2>
        <p className="text-[14px] text-body">{subtitle}</p>
      </div>

      {step === "email" ? (
        <div className="flex flex-col space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full h-12 flex items-center justify-center space-x-3 text-ink font-semibold rounded-md border border-hairline hover:bg-surface-soft"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            type="button"
          >
            <GoogleLogo />
            <span>{googleLoading ? "Connecting..." : "Continue with Google"}</span>
          </Button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-hairline"></div>
            <span className="flex-shrink mx-4 text-muted text-xs font-semibold uppercase">Or email</span>
            <div className="flex-grow border-t border-hairline"></div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="email" className="text-[13px] font-semibold text-ink">
              Email address
            </Label>
            <Input
              id="email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12"
            />
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={loading || !email}
            type="button"
            className="w-full h-12 bg-primary hover:bg-primary-active text-on-primary font-semibold rounded-pill"
          >
            {loading ? "Sending..." : "Send OTP"}
          </Button>

          {(googleError || error) && (
            <p className="text-xs text-semantic-down font-semibold text-center mt-1">
              {googleError || error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col space-y-4 pt-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="otp" className="text-[13px] font-semibold text-ink">
              One-time code
            </Label>
            <Input
              id="otp"
              placeholder="Enter 6-digit code"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              className="h-12"
            />
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={loading || !otp}
            type="button"
            className="w-full h-12 bg-primary hover:bg-primary-active text-on-primary font-semibold rounded-pill"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setStep("email")}
            type="button"
            className="text-primary hover:underline text-xs"
          >
            Use another email
          </Button>

          {error && (
            <p className="text-xs text-semantic-down font-semibold text-center mt-1">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="text-center pt-4 border-t border-hairline">
        <Link
          href={role === "ngo" ? "/login/donor" : "/login/ngo"}
          className="text-xs text-primary font-semibold hover:underline"
        >
          {role === "ngo" ? "Switch to Donor Login" : "Are you an NGO? Sign in here"}
        </Link>
      </div>
    </div>
  );
}
