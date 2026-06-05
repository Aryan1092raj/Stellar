"use client";
import React, { useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import Chatbot from "@/components/Chatbot";
import { Coins, Heart, FileText, CheckCircle, Wallet, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const Map = nextDynamic(() => import("@/components/Map"), { ssr: false });

export default function DashboardOverview() {
  const { user } = useAuth();
  const { connected, balance, walletInfo } = useWallet();
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // We can show some default stats
  return (
    <div className="flex flex-col space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-[32px] font-normal tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="text-[14px] text-body">
            Welcome back, <span className="font-semibold text-ink">{user?.email}</span>
          </p>
        </div>
        <Link href="/dashboard/donate">
          <Button className="bg-primary hover:bg-primary-active text-on-primary">
            New Donation <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted tracking-wider uppercase">Wallet Balance</p>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                {connected ? `${balance} XLM` : "0.00 XLM"}
              </h3>
              <p className="text-xs text-muted">Stellar Testnet</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted tracking-wider uppercase">Total Donated</p>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                480.00 XLM
              </h3>
              <p className="text-xs text-semantic-up font-semibold">↑ 100% Verified</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Heart className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted tracking-wider uppercase">Supported NGOs</p>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                3 Campaigns
              </h3>
              <p className="text-xs text-muted">Verified registry</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted tracking-wider uppercase">Proof of Work Uploads</p>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                12 Reports
              </h3>
              <p className="text-xs text-muted">Linked to IPFS</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Info split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map Card */}
        <Card className="lg:col-span-8 overflow-hidden h-[450px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Impact Tracking Map</CardTitle>
            <CardDescription>
              Select pins to inspect verified field donations and milestones on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative min-h-[300px]">
            <ErrorBoundary label="Map could not load">
              <Map onSelect={(latlng: { lat: number; lng: number }) => setSelectedLatLng(latlng)} />
            </ErrorBoundary>
            
            {/* Custom styled legend overlay card */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-canvas/90 border border-hairline p-4 rounded-xl shadow-soft max-w-xs w-max space-y-2.5 backdrop-blur-md">
              <h4 className="text-[12px] font-bold text-ink uppercase tracking-wider">Legend</h4>
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#00C851" }} />
                  <span className="text-body font-medium">Donation Points</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#0066FF" }} />
                  <span className="text-body font-medium">NGO Milestones</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#94a3b8" }} />
                  <span className="text-body font-medium">Other Verified Projects</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Point/Quick Action Card */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Point Inspector</CardTitle>
            <CardDescription>
              Interactive geo-coordinate inspector.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-4">
            {selectedLatLng ? (
              <div className="space-y-4 bg-surface-soft p-4 rounded-xl border border-hairline">
                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-muted uppercase">Latitude</span>
                  <span className="font-mono text-sm text-ink">{selectedLatLng.lat.toFixed(6)}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-muted uppercase">Longitude</span>
                  <span className="font-mono text-sm text-ink">{selectedLatLng.lng.toFixed(6)}</span>
                </div>
                <Link href={`/dashboard/donate?lat=${selectedLatLng.lat}&lng=${selectedLatLng.lng}`} className="w-full">
                  <Button className="w-full text-xs font-semibold">
                    Donate at this location
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center text-body py-8 text-sm flex flex-col items-center justify-center space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <CompassIcon className="h-5 w-5" />
                </div>
                <p>Click a marker on the map or select coordinates to populate details.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Chatbot />
    </div>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
