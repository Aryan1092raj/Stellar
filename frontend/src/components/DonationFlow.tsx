"use client";
import { useMemo, useState, useEffect } from "react";
import TransactionModal from "./TransactionModal";
import { buildDonationTx, submitTx } from "../lib/stellar";
import { useFreighter } from "../hooks/useFreighter";
import { confirmDonation, listNGOs, NGOItem } from "../lib/api/client";
import { apiRoutes } from "../lib/api/routes";
import DonorFeed from "./DonorFeed";
import { latestWorkUpdateForNGO, StoredWorkUpdate } from "../lib/workUpdates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Coins, Flame, Heart, HeartHandshake } from "lucide-react";

const INR_PRESETS = [100, 500, 1000, 5000];
const FALLBACK_INR_PER_XLM = 38;

type SelectedNGODetail = {
  id: number;
  name?: string;
  sector?: string | null;
  wallet_address?: string;
  project_id?: number;
};

type DonationReceipt = {
  donationId: number;
  amount: number;
  ngoName: string;
  timestamp: string;
};

type WorkUpdateEventDetail = {
  donationId: number;
  update: StoredWorkUpdate;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Transaction failed";
}

function impactMessage(sector?: string | null) {
  const normalized = (sector || "").toLowerCase();
  if (normalized.includes("education")) {
    return "₹500 sponsors a child's education for one month";
  }
  if (normalized.includes("health")) {
    return "₹500 provides basic healthcare to 2 families";
  }
  if (normalized.includes("environment")) {
    return "₹500 plants 10 trees";
  }
  if (normalized.includes("child")) {
    return "₹500 feeds 5 children for a week";
  }
  return "₹500 directly supports this NGO's mission";
}

export default function DonationFlow({ selectedLatLng }: { selectedLatLng?: { lat: number; lng: number } }) {
  const [amountInr, setAmountInr] = useState(500);
  const [inrPerXlm, setInrPerXlm] = useState(FALLBACK_INR_PER_XLM);
  const [ngoId, setNgoId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedNgo, setSelectedNgo] = useState<NGOItem | null>(null);

  const [status, setStatus] = useState<"idle" | "signing" | "submitted" | "confirmed" | "error">("idle");
  const [showModal, setShowModal] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [latestUpdate, setLatestUpdate] = useState<StoredWorkUpdate | null>(null);
  const [donationReceipt, setDonationReceipt] = useState<DonationReceipt | undefined>();

  const [ngos, setNgos] = useState<NGOItem[]>([]);
  const { publicKey, connected, connect, sign } = useFreighter();
  
  const amountXLM = useMemo(() => {
    return amountInr > 0 ? amountInr / inrPerXlm : 0;
  }, [amountInr, inrPerXlm]);

  const submitXlmWalletDonation = async () => {
    setShowModal(true);
    setError(undefined);

    try {
      setStatus("signing");
      const walletPublicKey = publicKey || (await connect());
      if (!ngoId || !selectedNgo) throw new Error("Select an NGO first");
      if (!selectedLatLng) throw new Error("Select your location on the map first");

      const xdr = await buildDonationTx({
        donorPublicKey: walletPublicKey,
        amountXLM,
        ngoId,
        projectId,
        donorLat: selectedLatLng.lat,
        donorLon: selectedLatLng.lng,
      });
      const signedXdr = await sign(xdr);

      setStatus("submitted");
      const confirmedTxHash = await submitTx(signedXdr);
      setTxHash(confirmedTxHash);

      const savedDonation = await confirmDonation({
        donor_public_key: walletPublicKey,
        amount: amountXLM,
        ngo_id: ngoId,
        project_id: projectId ?? undefined,
        donor_location: selectedLatLng,
        txHash: confirmedTxHash,
      });
      
      setDonationReceipt({
        donationId: savedDonation.id,
        amount: amountXLM,
        ngoName: selectedNgo.name,
        timestamp: savedDonation.created_at || new Date().toISOString(),
      });
      setStatus("confirmed");
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e));
      setStatus("error");
    }
  };

  const submit = () => submitXlmWalletDonation();

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<SelectedNGODetail>).detail;
      if (detail && typeof detail.id === "number") {
        setNgoId(detail.id);
        const matched = ngos.find((ngo) => ngo.id === detail.id);
        setSelectedNgo(matched || {
          id: detail.id,
          name: detail.name || "Selected NGO",
          sector: detail.sector ?? null,
          wallet_address: detail.wallet_address || "",
          verification_status: "verified",
        });
        if (detail.project_id) setProjectId(detail.project_id);
      }
    }
    window.addEventListener("select-ngo", handler);
    return () => window.removeEventListener("select-ngo", handler);
  }, [ngos]);

  useEffect(() => {
    if (!selectedNgo) {
      setLatestUpdate(null);
      return;
    }
    const selectedNgoId = selectedNgo.id;
    setLatestUpdate(latestWorkUpdateForNGO(selectedNgo.id));

    function handleWorkUpdate(event: Event) {
      const detail = (event as CustomEvent<WorkUpdateEventDetail>).detail;
      if (detail?.update?.ngo_id === selectedNgoId) {
        setLatestUpdate(detail.update);
      }
    }

    window.addEventListener("work-update-posted", handleWorkUpdate);
    return () => window.removeEventListener("work-update-posted", handleWorkUpdate);
  }, [selectedNgo]);

  useEffect(() => {
    (async () => {
      try {
        const data = await listNGOs();
        setNgos(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRate() {
      try {
        const res = await fetch(apiRoutes.external.stellarPriceInr);
        if (!res.ok) return;
        const data = await res.json();
        const rate = Number(data?.stellar?.inr);
        if (!cancelled && Number.isFinite(rate) && rate > 0) {
          setInrPerXlm(rate);
        }
      } catch {
        // keep fallback
      }
    }
    loadRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = Boolean(ngoId && selectedNgo && amountXLM > 0 && selectedLatLng);
  const processing = status === "signing" || status === "submitted";

  return (
    <div className="flex flex-col space-y-6">
      <DonorFeed />

      <Card className="shadow-soft border border-hairline">
        <CardHeader className="pb-4 border-b border-hairline">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Fund Verified Campaign</CardTitle>
              <CardDescription>Support registered NGOs on-chain with instant geolocated settlement.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* NGO Selection status */}
          <div className="flex flex-col space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted">Selected Organization</Label>
            <select
              value={ngoId || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setNgoId(null);
                  setSelectedNgo(null);
                  setProjectId(null);
                } else {
                  const id = Number(val);
                  const matched = ngos.find((n) => n.id === id);
                  if (matched) {
                    setNgoId(id);
                    setSelectedNgo(matched);
                    setProjectId(null);
                  }
                }
              }}
              className="w-full h-12 px-4 rounded-xl border border-hairline bg-canvas text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm cursor-pointer"
            >
              <option value="">-- Select a Verified NGO --</option>
              {ngos.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.sector || "General"})
                </option>
              ))}
            </select>
            {selectedNgo && (
              <span className="text-xs text-primary font-medium">
                💡 {impactMessage(selectedNgo.sector)}
              </span>
            )}
          </div>

          {/* Active Work Update (If applicable) */}
          {selectedNgo && latestUpdate && (
            <div className="p-4 rounded-xl border border-hairline bg-surface-soft flex flex-col md:flex-row gap-4">
              {latestUpdate.image_url && (
                <img
                  src={latestUpdate.image_url}
                  alt={latestUpdate.title}
                  className="w-full md:w-32 h-24 object-cover rounded-lg shrink-0 border border-hairline"
                />
              )}
              <div className="flex-1 flex flex-col justify-between space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-muted uppercase tracking-wider">Latest Milestone</span>
                  <Badge variant="default" className="bg-surface-strong text-ink font-mono">
                    {latestUpdate.progress_percentage}% Done
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-ink leading-tight">{latestUpdate.title}</h4>
                <p className="text-xs text-body line-clamp-2">{latestUpdate.description}</p>
                <div className="w-full bg-hairline h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-semantic-up h-full transition-all duration-300"
                    style={{ width: `${Math.min(latestUpdate.progress_percentage, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted leading-tight">
                  Your funds are secured in escrow and unlock when the NGO submits verifiable progress reports.
                </p>
              </div>
            </div>
          )}

          {/* Amount presets and inputs */}
          <div className="flex flex-col space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted">Amount (INR)</Label>
            
            <div className="grid grid-cols-4 gap-2">
              {INR_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amountInr === preset ? "primary" : "secondary"}
                  onClick={() => setAmountInr(preset)}
                  className="rounded-lg text-xs font-semibold h-10"
                >
                  ₹{preset}
                </Button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={1}
                  step={100}
                  value={amountInr}
                  onChange={(e) => setAmountInr(Number(e.target.value))}
                  className="pl-12 h-12 text-[16px]"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">₹</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-medium text-muted">
              <span>Approx. {amountXLM.toFixed(2)} XLM</span>
              <span>Rate: ₹{inrPerXlm.toFixed(2)} / XLM</span>
            </div>
          </div>

          {/* Geolocation status */}
          <div className="flex flex-col space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted">Donor Location coordinates</Label>
            <div className={`flex items-center space-x-3 p-4 rounded-xl border ${
              selectedLatLng
                ? "bg-emerald-500/5 border-emerald-500/20 text-ink"
                : "bg-surface-soft border-hairline text-muted"
            }`}>
              <MapPin className={`h-5 w-5 ${selectedLatLng ? "text-semantic-up" : "text-muted"}`} />
              <span className="text-sm font-medium">
                {selectedLatLng
                  ? `Location Locked: ${selectedLatLng.lat.toFixed(6)}, ${selectedLatLng.lng.toFixed(6)}`
                  : "Please lock your coordinates by selecting a point on the map first."}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <Button
            onClick={submit}
            disabled={!ready || processing}
            className="w-full h-12 text-md font-semibold bg-primary hover:bg-primary-active text-on-primary rounded-pill pt-1.5"
          >
            {status === "idle"
              ? connected
                ? latestUpdate
                  ? "Fund Campaign Milestone"
                  : "Send XLM Donation"
                : "Connect Wallet & Send"
              : status === "signing"
              ? "Awaiting Wallet Approval..."
              : "Submitting to Stellar..."}
          </Button>

          {/* Status feedback banner */}
          {status !== "idle" && (
            <div className={`p-4 rounded-xl text-xs font-semibold text-center border ${
              status === "confirmed"
                ? "bg-emerald-500/5 border-emerald-500/20 text-semantic-up"
                : status === "error"
                ? "bg-red-500/5 border-red-500/20 text-semantic-down"
                : "bg-primary/5 border-primary/20 text-primary animate-pulse"
            }`}>
              {status === "signing" && "🔐 Awaiting signature inside Freighter / Albedo / xBull"}
              {status === "submitted" && "⛓️ Broadcasting transaction on Stellar testnet ledger..."}
              {status === "confirmed" && "✅ Donation confirmed successfully on-chain!"}
              {status === "error" && `❌ Error: ${error || "Transaction declined"}`}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        open={showModal}
        status={status}
        hash={txHash}
        error={error}
        receipt={donationReceipt}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
