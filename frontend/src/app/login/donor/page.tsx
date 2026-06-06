"use client";
import React from "react";
import AuthForm from "../../../components/AuthForm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DonorLogin() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-canvas">
      {/* Hero Panel (Left on Desktop) */}
      <section className="hidden md:flex flex-col md:w-[45%] bg-surface-dark text-on-dark p-12 justify-between relative overflow-hidden border-r border-neutral-900">
        {/* Subtle geometric glowing grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/40 via-surface-dark to-surface-dark pointer-events-none" />

        {/* Wordmark logo */}
        <Link href="/" className="flex items-center space-x-2.5 z-10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="4" />
          </svg>
          <span className="font-sans font-semibold text-lg text-on-dark select-none">
            GeoLedger
          </span>
        </Link>

        {/* Hero copy */}
        <div className="flex flex-col space-y-6 z-10 max-w-md my-auto">
          <Badge variant="outline-on-dark" className="w-fit text-[11px] font-bold tracking-widest uppercase">
            Supporter Portal
          </Badge>
          <h1 className="font-sans text-[44px] leading-tight font-normal tracking-lg">
            Donate For Good
          </h1>
          <p className="text-[15px] text-on-dark-soft leading-relaxed font-normal">
            Send blockchain-transparent donations directly to verified NGOs, track milestones in real time, and keep an immutable Stellar ledger of your impact.
          </p>

          {/* Floating stat items */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-800">
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">₹2.4M</span>
              <span className="text-xs text-on-dark-soft mt-0.5">Donated</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">143</span>
              <span className="text-xs text-on-dark-soft mt-0.5">NGOs</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">1.9K+</span>
              <span className="text-xs text-on-dark-soft mt-0.5">Records</span>
            </div>
          </div>
        </div>

        {/* Legal notice footer */}
        <div className="z-10 text-[11px] text-on-dark-soft/40 max-w-sm">
          Stellar testnet sandbox environment. Digital asset interactions are simulated.
        </div>
      </section>

      {/* Form Panel (Right on Desktop) */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 bg-canvas">
        {/* Mobile Header */}
        <div className="md:hidden w-full max-w-md mb-8 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="#0052ff" strokeWidth="4" />
            </svg>
            <span className="font-sans font-bold text-md text-ink">GeoLedger</span>
          </Link>
        </div>

        <AuthForm role="donor" />
      </main>
    </div>
  );
}
