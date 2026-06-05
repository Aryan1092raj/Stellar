"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal, ExternalLink } from "lucide-react";

function getClientContractConfig() {
  return {
    donation:
      process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT ||
      process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID,
    ngo: process.env.NEXT_PUBLIC_NGO_VERIFICATION_CONTRACT_ID,
    escrow: process.env.NEXT_PUBLIC_IMPACT_ESCROW_CONTRACT_ID,
    token:
      process.env.NEXT_PUBLIC_TOKEN_MANAGER_CONTRACT_ID ||
      process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ||
      process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID,
  };
}

export default function ContractsPage() {
  const contracts = getClientContractConfig();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const list = [
    {
      id: "donation",
      name: "Donation Registry Contract",
      value: contracts.donation,
      desc: "Manages individual donation events, storing donor identities, target NGOs, coordinates, and amount states on-chain.",
    },
    {
      id: "ngo",
      name: "NGO Registry Contract",
      value: contracts.ngo,
      desc: "Handles identity verification and public key registration for approved non-governmental organizations.",
    },
    {
      id: "token",
      name: "Token Manager Contract",
      value: contracts.token,
      desc: "Oversees native XLM or custom token configurations utilized throughout the GeoLedger settlement layer.",
    },
    {
      id: "escrow",
      name: "Impact Escrow Contract",
      value: contracts.escrow,
      desc: "Locks campaign donations, releasing funds programmatically only upon verified milestone evidence approvals.",
    },
  ];

  const allDeployed = list.every((item) => !!item.value);

  return (
    <div className="flex flex-col space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-[32px] font-normal tracking-tight text-ink">
            Smart Contracts
          </h1>
          <p className="text-[14px] text-body">
            Soroban smart contracts running on the Stellar testnet sandbox.
          </p>
        </div>
        {!allDeployed && (
          <Badge variant="warning" className="w-fit">
            Action Required: Run Deployment Scripts
          </Badge>
        )}
      </div>

      {/* Grid of contracts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {list.map((item) => (
          <Card key={item.id} className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
                <Badge variant={item.value ? "success" : "destructive"}>
                  {item.value ? "Deployed" : "Missing"}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                {item.desc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.value ? (
                <div className="flex flex-col space-y-2">
                  <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Contract ID
                  </div>
                  <div className="flex items-center space-x-2 bg-surface-soft p-3 rounded-lg border border-hairline font-mono text-xs text-ink overflow-x-auto justify-between">
                    <span className="truncate pr-4 select-all">{item.value}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted hover:text-ink shrink-0"
                      onClick={() => handleCopy(item.id, item.value || "")}
                    >
                      {copiedKey === item.id ? (
                        <Check className="h-3.5 w-3.5 text-semantic-up" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${item.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <span>View on Stellar Expert</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="bg-semantic-down/5 border border-semantic-down/20 p-4 rounded-lg text-xs text-semantic-down font-medium">
                  Contract address is not found in environment variables. Deploy using shell scripts.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deployment CLI block */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-md">Soroban Deployment Guide</CardTitle>
              <CardDescription>
                How to initialize and deploy these contracts locally or to Testnet.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-body leading-relaxed">
            Ensure you have the Stellar CLI and Cargo installed. Navigate to the project root and execute the build pipeline:
          </p>
          <div className="bg-surface-dark-elevated text-on-dark font-mono text-xs p-4 rounded-lg overflow-x-auto leading-relaxed border border-neutral-800">
            <div><span className="text-primary"># 1. Build contract WASM binaries</span></div>
            <div>cargo build --target wasm32-unknown-unknown --release</div>
            <br />
            <div><span className="text-primary"># 2. Run automated contract deployment pipeline</span></div>
            <div>./scripts/deploy_contracts.sh</div>
          </div>
          <p className="text-xs text-muted">
            The shell script deploys the binaries, registers hashes, and outputs environment variables that populate this dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
