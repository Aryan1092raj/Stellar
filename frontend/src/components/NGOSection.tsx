"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { listNGOs, createNGO, NGOItem } from "../lib/api/client";
import NGODetailsModal from "./NGODetailsModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, ExternalLink, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ngoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  wallet_address: z.string().min(10, "Address must be at least 10 characters"),
  sector: z.string().optional(),
});

export default function NGOSection() {
  const { user } = useAuth();
  const isDonor = user?.role === "donor";
  const [ngos, setNgos] = useState<NGOItem[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ name: string; wallet_address: string; sector?: string }>({
    name: "",
    wallet_address: "",
    sector: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState<NGOItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  async function load() {
    try {
      const data = await listNGOs();
      setNgos(data);
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = ngoSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      await createNGO(parsed.data as { name: string; wallet_address: string; sector?: string });
      setForm({ name: "", wallet_address: "", sector: "" });
      load();
    } catch {
      setErrors(["NGO Registration failed"]);
    } finally {
      setLoading(false);
    }
  }

  function emitNGOSelection(ngo: NGOItem) {
    setSelectedNGO(ngo);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("select-ngo", {
          detail: {
            id: ngo.id,
            name: ngo.name,
            sector: ngo.sector ?? null,
            wallet_address: ngo.wallet_address,
          },
        })
      );
    }
  }

  function openNGODetails(ngo: NGOItem) {
    setSelectedNGO(ngo);
    setShowDetailsModal(true);
  }

  const filtered = ngos.filter(
    (n) =>
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      (n.sector || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
      {/* NGO directory list */}
      <div className={`${isDonor ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col space-y-6`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
          <Input
            placeholder="Search by name or sector..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ngo) => (
            <Card
              key={ngo.id}
              className={`hover:shadow-soft duration-200 cursor-pointer border flex flex-col justify-between ${
                selectedNGO?.id === ngo.id ? "border-primary bg-primary/5" : "border-hairline"
              }`}
              onClick={() => emitNGOSelection(ngo)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-surface-strong text-ink rounded-lg shrink-0">
                      <Building2 className="h-4 w-4 text-muted" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-ink leading-tight">{ngo.name}</h4>
                      {ngo.sector && (
                        <span className="text-[11px] font-semibold text-muted tracking-wide">
                          {ngo.sector}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={ngo.verification_status === "verified" ? "success" : "default"}>
                    {ngo.verification_status === "verified" ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 flex justify-between items-center">
                <span className="font-mono text-xs text-muted">
                  {ngo.wallet_address.slice(0, 6)}...{ngo.wallet_address.slice(-6)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold hover:bg-primary/10 hover:text-primary flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openNGODetails(ngo);
                  }}
                >
                  <span>Inspection</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-muted font-medium bg-surface-soft rounded-xl border border-hairline-soft">
              No verified NGOs match your search query.
            </div>
          )}
        </div>
      </div>

      {/* Side Forms */}
      {!isDonor && (
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <Card id="ngo-registration">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Register NGO</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Onboard a new organization onto the Stellar Soroban verification registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="ngo-name" className="text-xs font-semibold">NGO Name</Label>
                  <Input
                    id="ngo-name"
                    placeholder="Organization Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="ngo-address" className="text-xs font-semibold">Wallet Address</Label>
                  <Input
                    id="ngo-address"
                    placeholder="G..."
                    value={form.wallet_address}
                    onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="ngo-sector" className="text-xs font-semibold">Sector</Label>
                  <Input
                    id="ngo-sector"
                    placeholder="Education, Health, etc. (optional)"
                    value={form.sector || ""}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full font-semibold">
                  {loading ? "Registering..." : "Register Organization"}
                </Button>
              </form>

              {errors.length > 0 && (
                <div className="mt-3 text-xs font-semibold text-semantic-down bg-semantic-down/5 p-3 rounded-lg border border-semantic-down/20">
                  {errors.join(", ")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <NGODetailsModal
        ngo={selectedNGO}
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}
