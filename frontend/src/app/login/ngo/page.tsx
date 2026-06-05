"use client";
import React from "react";
import AuthForm from "../../../components/AuthForm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NgoLogin() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-canvas">
      {/* Hero Panel (Left on Desktop) */}
      <section className="hidden md:flex flex-col md:w-[45%] bg-surface-dark text-on-dark p-12 justify-between relative overflow-hidden border-r border-neutral-900">
        {/* Subtle geometric glowing grid pattern with a green tint for NGOs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-surface-dark to-surface-dark pointer-events-none" />

        {/* Wordmark logo */}
        <Link href="/" className="flex items-center space-x-2.5 z-10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#05b169" strokeWidth="4" />
          </svg>
          <span className="font-sans font-semibold text-lg text-on-dark select-none">
            GeoLedger <span className="text-xs text-semantic-up uppercase font-bold tracking-wider ml-1">NGOs</span>
          </span>
        </Link>

        {/* Hero copy */}
        <div className="flex flex-col space-y-6 z-10 max-w-md my-auto">
          <Badge variant="outline-on-dark" className="w-fit text-[11px] font-bold tracking-widest uppercase border-semantic-up text-semantic-up">
            Organization Portal
          </Badge>
          <h1 className="font-sans text-[44px] leading-tight font-normal tracking-lg">
            Make Impact, Build Trust
          </h1>
          <p className="text-[15px] text-on-dark-soft leading-relaxed font-normal">
            Manage verified blockchain campaigns, publish IPFS evidence files, geolocate field coordinates, and prove milestones directly to your global supporters.
          </p>

          {/* Floating stat items */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-800">
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">50+</span>
              <span className="text-xs text-on-dark-soft mt-0.5">Verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">100%</span>
              <span className="text-xs text-on-dark-soft mt-0.5">Traceable</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xl font-bold text-on-dark">IPFS</span>
              <span className="text-xs text-on-dark-soft mt-0.5">Evidence</span>
            </div>
          </div>
        </div>

        {/* Legal notice footer */}
        <div className="z-10 text-[11px] text-on-dark-soft/40 max-w-sm">
          Soroban smart contract interactions require verified registration.
        </div>
      </section>

      {/* Form Panel (Right on Desktop) */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 bg-canvas relative">
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
              <circle cx="12" cy="12" r="10" stroke="#05b169" strokeWidth="4" />
            </svg>
            <span className="font-sans font-bold text-md text-ink">GeoLedger NGOs</span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <AuthForm role="ngo" />
          
          <div className="mt-8 pt-6 border-t border-hairline flex items-center justify-between text-sm">
            <span className="text-body font-medium">New organization?</span>
            <Link href="/#ngos">
              <Button variant="tertiary" className="text-sm font-semibold p-0">
                Register your NGO
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
