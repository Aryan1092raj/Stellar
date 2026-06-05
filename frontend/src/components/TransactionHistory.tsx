"use client";
import React, { useState, useEffect } from "react";
import { listDonations } from "../lib/api/client";
import { loadWalletInfo } from "../lib/stellar/wallet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
  Search,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "donation" | "receive" | "send" | "payment";
  amount: string;
  asset: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
  from?: string;
  to?: string;
  memo?: string;
  hash?: string;
  fee?: string;
}

interface HorizonPaymentRecord {
  id: string;
  created_at: string;
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  starting_balance?: string;
  asset_type?: string;
  asset_code?: string;
  successful?: boolean;
  transaction_hash?: string;
  fee_charged?: string;
  memo?: string;
  funder?: string;
  account?: string;
}

interface HorizonPaymentsResponse {
  _embedded?: {
    records?: HorizonPaymentRecord[];
  };
}

interface DonationApiRecord {
  donor_public_key: string;
  created_at: string;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "donation" | "payment">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    const walletInfo = loadWalletInfo();
    if (!walletInfo) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const horizonUrl =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "TESTNET"
          ? "https://horizon-testnet.stellar.org"
          : "https://horizon.stellar.org";

      const response = await fetch(
        `${horizonUrl}/accounts/${walletInfo.publicKey}/payments?order=desc&limit=50`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = (await response.json()) as HorizonPaymentsResponse;
      const donations = await listDonations().catch(() => [] as DonationApiRecord[]);

      const stellarTxs: Transaction[] = (data._embedded?.records || [])
        .filter(
          (record) =>
            record.type === "payment" ||
            record.type === "create_account" ||
            record.type === "path_payment_strict_receive"
        )
        .map((record) => {
          const isReceive = record.to === walletInfo.publicKey;
          const isDonation = donations.some(
            (d) =>
              d.donor_public_key === walletInfo.publicKey &&
              new Date(d.created_at).getTime() - new Date(record.created_at).getTime() < 60000
          );

          return {
            id: record.id,
            type: isDonation ? "donation" : isReceive ? "receive" : "send",
            amount: record.amount || record.starting_balance || "0",
            asset: record.asset_type === "native" ? "XLM" : record.asset_code,
            timestamp: record.created_at,
            status: record.successful ? "success" : "failed",
            from: record.from || record.funder,
            to: record.to || record.account,
            hash: record.transaction_hash,
            fee: record.fee_charged,
            memo: record.memo,
          } as Transaction;
        });

      setTransactions(stellarTxs);
    } catch (err: unknown) {
      console.error("Error loading transactions:", err);
      setError(err instanceof Error ? err.message : "Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedKey(hash);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "donation") return tx.type === "donation";
    if (filter === "payment") return tx.type === "send" || tx.type === "receive";
    return true;
  });

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const walletInfo = loadWalletInfo();
  const myAddress = walletInfo?.publicKey || "";

  return (
    <div className="shadow-soft border border-hairline w-full bg-canvas rounded-xl p-6">
      <div className="pb-4 border-b border-hairline flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h3 className="text-[18px] font-semibold leading-tight tracking-tight text-ink">Stellar Transactions</h3>
          <p className="text-[14px] text-body">Permanent cryptographically audited ledger updates.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Tabs value={filter} onValueChange={(val) => setFilter(val as any)}>
            <TabsList className="h-10">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="donation">Donations</TabsTrigger>
              <TabsTrigger value="payment">Payments</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={loadTransactions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      <div className="p-0">
        {loading && (
          <div className="py-20 text-center text-xs text-muted font-semibold animate-pulse">
            ⏳ Syncing chronological account actions from Horizon...
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-xs font-semibold text-semantic-down bg-semantic-down/5 border border-dashed border-semantic-down/20 m-4 rounded-xl">
            {error}
          </div>
        )}

        {!loading && !error && filteredTransactions.length === 0 && (
          <div className="py-20 text-center text-sm text-muted flex flex-col items-center justify-center space-y-2">
            <Search className="h-8 w-8 text-muted/50 mb-2" />
            <p className="font-semibold text-ink">No transactions recorded</p>
            <p className="text-xs">Your blockchain actions will be displayed here in real time.</p>
          </div>
        )}

        {!loading && !error && filteredTransactions.length > 0 && (
          <div className="divide-y divide-hairline">
            {filteredTransactions.map((tx) => {
              // Inlined details computation
              let iconElement = <ArrowUpRight className="h-4 w-4 text-ink" />;
              let labelText = "Stellar Interaction";
              let badgeColor = "text-ink bg-surface-strong";

              if (tx.type === "donation") {
                iconElement = <Heart className="h-4 w-4 text-semantic-up" />;
                labelText = "On-Chain Donation";
                badgeColor = "text-semantic-up bg-semantic-up/10";
              } else if (tx.type === "receive") {
                iconElement = <ArrowDownLeft className="h-4 w-4 text-semantic-up" />;
                labelText = "Payment Received";
                badgeColor = "text-semantic-up bg-semantic-up/10";
              } else if (tx.type === "send") {
                iconElement = <ArrowUpRight className="h-4 w-4 text-ink" />;
                labelText = "Payment Sent";
                badgeColor = "text-ink bg-surface-strong";
              }

              return (
                <div
                  key={tx.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-5 hover:bg-surface-soft transition-colors"
                >
                  <div className="flex items-start md:items-center space-x-4">
                    <div className={`p-2 rounded-xl shrink-0 ${badgeColor}`}>
                      {iconElement}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-ink leading-none">
                        {labelText}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted">
                        {tx.from && tx.from !== myAddress && (
                          <span>From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                        )}
                        {tx.to && tx.to !== myAddress && (
                          <span>To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                        )}
                        <span className="flex items-center space-x-1 text-muted">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(tx.timestamp)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-hairline-soft">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-base font-semibold text-ink">
                        {tx.type === "receive" ? "+" : "-"}{parseFloat(tx.amount).toFixed(2)}{" "}
                        <span className="text-xs text-muted font-sans font-semibold">{tx.asset}</span>
                      </span>
                      {tx.fee && (
                        <span className="text-[10px] text-muted font-mono">
                          Fee: {parseFloat(tx.fee).toFixed(5)} XLM
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {tx.hash && (
                        <>
                          <a
                            href={`${
                              process.env.NEXT_PUBLIC_STELLAR_NETWORK === "TESTNET"
                                ? "https://stellar.expert/explorer/testnet"
                                : "https://stellar.expert/explorer/public"
                            }/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors shrink-0"
                            title="Verify on Explorer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted hover:text-ink shrink-0"
                            onClick={() => handleCopy(tx.hash!)}
                          >
                            {copiedKey === tx.hash ? (
                              <Check className="h-4 w-4 text-semantic-up" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
