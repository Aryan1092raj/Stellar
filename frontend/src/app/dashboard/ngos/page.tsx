"use client";
import React from "react";
import NGOSection from "@/components/NGOSection";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function NGOsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-[32px] font-normal tracking-tight text-ink">
          Verified Organizations
        </h1>
        <p className="text-[14px] text-body">
          Explore organizations registered on the Stellar network with geolocated proof tracking.
        </p>
      </div>

      <ErrorBoundary label="NGO directory could not load">
        <NGOSection />
      </ErrorBoundary>
    </div>
  );
}
