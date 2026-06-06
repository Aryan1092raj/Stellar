"use client";
import { useState, useEffect } from "react";
import { listDonations, type Donation } from "../lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Layers, FileCheck, Building, Clock, MapPin } from "lucide-react";

interface NGO {
  id: number;
  name: string;
  wallet_address: string;
  sector?: string | null;
  verification_status: string;
}

interface WorkUpdate {
  title: string;
  description: string;
  image_url?: string;
  progress_percentage: number;
  timestamp: string;
}

interface Props {
  ngo: NGO | null;
  open: boolean;
  onClose: () => void;
}

export default function NGODetailsModal({ ngo, open, onClose }: Props) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [workUpdates, setWorkUpdates] = useState<{ [key: number]: WorkUpdate }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ngo) {
      loadNGOData();
    }
  }, [open, ngo]);

  async function loadNGOData() {
    if (!ngo) return;
    setLoading(true);
    try {
      const allDonations = await listDonations();
      const ngoDonations = allDonations.filter(
        (d) => d.ngo_id === ngo.id && d.status !== "failed"
      );
      setDonations(ngoDonations);

      const updates: { [key: number]: WorkUpdate } = {};
      for (const donation of ngoDonations) {
        if (donation.evidence_url) {
          try {
            const evidenceRes = await fetch(donation.evidence_url);
            if (evidenceRes.ok) {
              const text = await evidenceRes.text();
              try {
                const parsed = JSON.parse(text);
                updates[donation.id] = parsed;
              } catch {
                updates[donation.id] = {
                  title: "Work Update",
                  description: text,
                  progress_percentage: 100,
                  timestamp: donation.created_at,
                };
              }
            }
          } catch (err) {
            console.error("Failed to fetch evidence:", err);
          }
        }
      }
      setWorkUpdates(updates);
    } catch (err) {
      console.error("Failed to load NGO data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!ngo) return null;

  const totalDonations = donations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
  const donationsWithUpdates = donations.filter((d) => d.evidence_url).length;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="pb-4 border-b border-hairline">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Building className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-xl md:text-2xl font-normal tracking-tight text-ink">
                {ngo.name}
              </DialogTitle>
              {ngo.sector && (
                <span className="inline-block text-xs font-semibold text-muted tracking-wider uppercase">
                  {ngo.sector}
                </span>
              )}
              <div className="flex items-center space-x-2 pt-1 font-mono text-xs text-muted">
                <span>{ngo.wallet_address}</span>
              </div>
              <div className="pt-2">
                <Badge variant={ngo.verification_status === "verified" ? "success" : "default"}>
                  {ngo.verification_status === "verified" ? "Verified" : "Pending Approval"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 py-6 border-b border-hairline">
          <div className="bg-surface-soft p-4 rounded-xl border border-hairline-soft flex flex-col justify-between">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Total Received</span>
            <span className="font-mono text-md md:text-lg font-semibold text-ink mt-1">
              {totalDonations.toFixed(2)} <span className="text-xs text-muted font-sans font-semibold">XLM</span>
            </span>
          </div>

          <div className="bg-surface-soft p-4 rounded-xl border border-hairline-soft flex flex-col justify-between">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Donations</span>
            <span className="font-mono text-md md:text-lg font-semibold text-ink mt-1">
              {donations.length}
            </span>
          </div>

          <div className="bg-surface-soft p-4 rounded-xl border border-hairline-soft flex flex-col justify-between">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Milestones</span>
            <span className="font-mono text-md md:text-lg font-semibold text-ink mt-1">
              {donationsWithUpdates}
            </span>
          </div>
        </div>

        {/* Work updates timeline */}
        <div className="space-y-6 pt-6">
          <h3 className="text-md font-semibold text-ink">Work Progress & Verification Log</h3>

          {loading && (
            <div className="py-8 text-center text-xs text-muted font-semibold animate-pulse">
              ⏳ Synchronizing data from Stellar & IPFS gateways...
            </div>
          )}

          {!loading && donations.length === 0 && (
            <div className="py-12 text-center text-sm text-muted bg-surface-soft rounded-xl border border-dashed border-hairline">
              No transactions recorded for this organization yet.
            </div>
          )}

          {!loading && donations.length > 0 && (
            <div className="relative border-l border-hairline pl-6 ml-3 space-y-8">
              {donations.map((donation) => {
                const update = workUpdates[donation.id];
                return (
                  <div key={donation.id} className="relative">
                    {/* Circle marker */}
                    <div className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-4 bg-canvas ${
                      update ? "border-emerald-500" : "border-amber-500"
                    }`} />

                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-xs text-muted">
                        <span className="font-semibold text-ink">
                          Donation #{donation.id} - <span className="font-mono">{donation.amount} XLM</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(donation.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {update ? (
                        <Card className="shadow-none border border-hairline hover:shadow-soft duration-200">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-bold text-ink leading-tight">{update.title}</h4>
                              <Badge variant="success" className="font-mono text-[10px]">
                                {update.progress_percentage}% Verified
                              </Badge>
                            </div>
                            <p className="text-xs text-body leading-relaxed">{update.description}</p>
                            {update.image_url && (
                              <div className="overflow-hidden rounded-lg border border-hairline max-h-48">
                                <img
                                  src={update.image_url}
                                  alt={update.title}
                                  className="w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="w-full bg-hairline h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-semantic-up h-full"
                                style={{ width: `${update.progress_percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted pt-1">
                              <span>IPFS Evidence Hash available</span>
                              <span className="font-semibold text-primary select-all">
                                {donation.evidence_url?.split("/").pop() || "N/A"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="p-4 rounded-xl border border-hairline border-dashed bg-amber-500/5 text-amber-600 text-xs font-semibold flex items-center space-x-2">
                          <span>⏳ Awaiting geolocated photo and flow telemetry evidence report...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
