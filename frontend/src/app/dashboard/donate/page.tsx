"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DonationFlow from "@/components/DonationFlow";
import ErrorBoundary from "@/components/ErrorBoundary";

function DonateContent() {
  const searchParams = useSearchParams();
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  const selectedLatLng =
    latStr && lngStr
      ? { lat: parseFloat(latStr), lng: parseFloat(lngStr) }
      : undefined;

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-[32px] font-normal tracking-tight text-ink">
          Send Donation
        </h1>
        <p className="text-[14px] text-body">
          Deploy XLM micro-donations directly to Soroban registry smart contracts.
        </p>
      </div>

      <ErrorBoundary label="Donation flow could not load">
        <DonationFlow selectedLatLng={selectedLatLng} />
      </ErrorBoundary>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-xs text-muted font-semibold animate-pulse">
        ⏳ Loading donation parameters...
      </div>
    }>
      <DonateContent />
    </Suspense>
  );
}
