"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  connectWallet,
  hasFreighter,
  hasXBull,
  hasAlbedo,
  WalletType,
  STELLAR_NETWORK,
} from "@/lib/stellar/wallet";
import { Wallet, LogOut, Copy, Check, Info } from "lucide-react";

export default function WalletStatus() {
  const { connected, walletInfo, balance, setWalletInfo, disconnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const wallets: WalletType[] = [];
      if (await hasFreighter()) wallets.push("freighter");
      if (hasXBull()) wallets.push("xbull");
      if (hasAlbedo()) wallets.push("albedo");
      setAvailableWallets(wallets);
    })();
  }, []);

  async function handleConnect(type: WalletType) {
    setConnecting(true);
    setError("");
    try {
      const info = await connectWallet(type);
      setWalletInfo(info);
      setShowWalletModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      console.error(err);
    } finally {
      setConnecting(false);
    }
  }

  const handleCopy = () => {
    if (walletInfo?.publicKey) {
      navigator.clipboard.writeText(walletInfo.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getWalletIcon = (type: WalletType) => {
    switch (type) {
      case "freighter": return "🚀";
      case "xbull": return "🐂";
      case "albedo": return "⭐";
      default: return "👛";
    }
  };

  return (
    <>
      <Card className="w-full shadow-soft border border-hairline overflow-hidden">
        <CardContent className="p-5">
          {!connected ? (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-surface-strong text-muted rounded-full">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Stellar Wallet</h4>
                  <p className="text-xs text-muted">Not connected</p>
                </div>
              </div>
              <Button onClick={() => setShowWalletModal(true)} className="w-full flex items-center justify-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getWalletIcon(walletInfo!.type)}</span>
                  <span className="text-sm font-bold text-ink capitalize">{walletInfo!.type}</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {STELLAR_NETWORK}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-surface-soft p-3 rounded-lg border border-hairline-soft">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Address</span>
                  <span className="font-mono text-xs text-ink truncate max-w-[150px]" title={walletInfo!.publicKey}>
                    {walletInfo!.publicKey}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted hover:text-ink shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-semantic-up" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Balance</span>
                  <span className="font-mono text-lg font-semibold text-ink">
                    {parseFloat(balance).toFixed(2)} <span className="text-xs font-semibold text-muted">XLM</span>
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-semantic-down hover:bg-semantic-down/5 rounded-full" onClick={disconnect}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-body">
            Choose a wallet to connect to GeoLedger. Make sure you have the wallet extension installed.
          </p>

          {error && (
            <div className="text-xs text-semantic-down font-semibold bg-semantic-down/5 border border-semantic-down/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid gap-3 py-2">
            <Button
              variant="outline"
              className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
              onClick={() => handleConnect("freighter")}
              disabled={connecting}
            >
              <span className="flex items-center space-x-3">
                <span className="text-xl">🚀</span>
                <span>Freighter</span>
              </span>
              <span className="text-xs text-muted">
                {availableWallets.includes("freighter") ? "Detected" : "Not installed"}
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
              onClick={() => handleConnect("xbull")}
              disabled={connecting || !availableWallets.includes("xbull")}
            >
              <span className="flex items-center space-x-3">
                <span className="text-xl">🐂</span>
                <span>xBull Wallet</span>
              </span>
              <span className="text-xs text-muted">
                {availableWallets.includes("xbull") ? "Detected" : "Not installed"}
              </span>
            </Button>

            <Button
              variant="outline"
              className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
              onClick={() => handleConnect("albedo")}
              disabled={connecting || !availableWallets.includes("albedo")}
            >
              <span className="flex items-center space-x-3">
                <span className="text-xl">⭐</span>
                <span>Albedo</span>
              </span>
              <span className="text-xs text-muted">
                {availableWallets.includes("albedo") ? "Detected" : "Not installed"}
              </span>
            </Button>
          </div>

          <div className="text-xs text-muted text-center pt-2 flex items-center justify-center space-x-1">
            <Info className="h-3 w-3" />
            <span>New to Stellar? Install Freighter extension to get started.</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
