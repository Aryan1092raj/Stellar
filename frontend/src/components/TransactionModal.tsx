"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, ShieldCheck, Heart, AlertTriangle, Info } from "lucide-react";

interface Props {
  open: boolean;
  status: "idle" | "signing" | "submitted" | "confirmed" | "error";
  hash?: string;
  error?: string;
  receipt?: {
    donationId: number;
    amount: number;
    ngoName: string;
    timestamp: string;
  };
  onClose: () => void;
}

export default function TransactionModal({ open, status, hash, error, receipt, onClose }: Props) {
  const explorerBase =
    process.env.NEXT_PUBLIC_STELLAR_EXPERT_BASE || "https://stellar.expert/explorer/testnet";
  const explorerUrl = hash ? `${explorerBase}/tx/${hash}` : undefined;
  const showImpactNft = status === "confirmed" && hash && receipt;

  const getStatusDetails = () => {
    switch (status) {
      case "signing":
        return {
          title: "Approving Transaction",
          desc: "Awaiting cryptographic key signature inside your wallet extension.",
          color: "text-primary",
        };
      case "submitted":
        return {
          title: "Submitting to Stellar",
          desc: "Broadcasting signed transaction envelopes to validators...",
          color: "text-primary animate-pulse",
        };
      case "confirmed":
        return {
          title: "Donation Complete",
          desc: "Transaction verified and recorded onto public ledger registry.",
          color: "text-semantic-up",
        };
      case "error":
        return {
          title: "Transaction Declined",
          desc: "The transaction was aborted or failed to broadcast.",
          color: "text-semantic-down",
        };
      default:
        return {
          title: "Initializing Transaction",
          desc: "Preparing details for on-chain broadcast...",
          color: "text-ink",
        };
    }
  };

  const details = getStatusDetails();

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle className={`text-[18px] font-semibold ${details.color}`}>
              {details.title}
            </DialogTitle>
            <Badge
              variant={
                status === "confirmed"
                  ? "success"
                  : status === "error"
                  ? "destructive"
                  : "default"
              }
              className="capitalize"
            >
              {status}
            </Badge>
          </div>
          <DialogDescription className="text-xs mt-1">
            {details.desc}
          </DialogDescription>
        </DialogHeader>

        {hash && (
          <div className="space-y-2 bg-surface-soft p-3 rounded-lg border border-hairline font-mono text-[11px] text-ink flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider font-sans">
              Transaction Hash
            </span>
            <span className="truncate select-all font-semibold">{hash}</span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center space-x-1 font-semibold pt-1 font-sans"
              >
                <span>View on Stellar Expert</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {showImpactNft && (
          <div className="bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-semantic-up" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Proof of Impact Record
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between text-xs border-b border-hairline-soft pb-2">
                <span className="text-muted font-medium">NGO Beneficiary</span>
                <span className="font-semibold text-ink">{receipt.ngoName}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-hairline-soft pb-2">
                <span className="text-muted font-medium">Donation ID</span>
                <span className="font-mono font-bold text-ink">#{receipt.donationId}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-hairline-soft pb-2">
                <span className="text-muted font-medium">Settlement Amount</span>
                <span className="font-mono font-bold text-ink">{receipt.amount.toFixed(2)} XLM</span>
              </div>
              <div className="flex justify-between text-xs pb-1">
                <span className="text-muted font-medium">Timestamp</span>
                <span className="text-ink font-semibold">
                  {new Date(receipt.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <Separator className="bg-primary/10" />

            <p className="text-[11px] text-muted leading-relaxed">
              This digital receipt is recorded permanently in the Soroban smart contract state, coupling your account with this geocoded impact event.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-semantic-down/5 border border-semantic-down/20 p-4 rounded-xl text-xs text-semantic-down font-semibold flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button onClick={onClose} className="w-full font-semibold rounded-pill h-11 mt-4">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
