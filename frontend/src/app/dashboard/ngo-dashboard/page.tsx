"use client";
import React from "react";
import NGODashboard from "@/components/NGODashboard";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function NGODashboardPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-[32px] font-normal tracking-tight text-ink">
          NGO Campaign Manager
        </h1>
        <p className="text-[14px] text-body">
          Manage your verified campaigns, register coordinates, and upload milestone evidence.
        </p>
      </div>

      <ErrorBoundary label="NGO Dashboard could not load">
        <NGODashboard />
      </ErrorBoundary>
    </div>
  );
}
