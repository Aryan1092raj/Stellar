"use client";
import React from "react";
import TransactionHistory from "@/components/TransactionHistory";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function HistoryPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-[32px] font-normal tracking-tight text-ink">
          Impact & Transaction Ledger
        </h1>
        <p className="text-[14px] text-body">
          Permanent chronological log of all donations, proof signatures, and escrow releases.
        </p>
      </div>

      <ErrorBoundary label="Transaction history could not load">
        <TransactionHistory />
      </ErrorBoundary>
    </div>
  );
}
