"use client";
import { useState, useEffect } from "react";
import {
  confirmEvidence,
  confirmImpactVerification,
  createProject,
  listDonations,
  listProjects,
  prepareEvidence,
  prepareImpactVerification,
  type Donation,
  type ProjectItem,
} from "../lib/api/client";
import { getRole } from "../lib/auth";
import { submitTx } from "../lib/stellar";
import { useFreighter } from "../hooks/useFreighter";
import {
  createNotificationFromUpdate,
  saveDonorNotification,
  saveStoredWorkUpdate,
  StoredWorkUpdate,
} from "../lib/workUpdates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Coins, LayoutList, CheckCircle2, AlertCircle, PlusCircle, ArrowUpRight, Upload, Sparkles } from "lucide-react";

interface WorkUpdate {
  id?: number;
  donation_id: number;
  title: string;
  description: string;
  image_url?: string;
  progress_percentage: number;
  created_at?: string;
}

type CampaignProject = ProjectItem;

type CampaignForm = {
  title: string;
  description: string;
  target_amount: string;
  sector: string;
  cover_image_url: string;
  deadline: string;
  ngo_id: string;
};

export default function NGODashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignProject[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<number | null>(null);
  const [newUpdate, setNewUpdate] = useState<WorkUpdate>({
    donation_id: 0,
    title: "",
    description: "",
    image_url: "",
    progress_percentage: 0,
  });
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [campaignStatus, setCampaignStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [campaignError, setCampaignError] = useState("");
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    title: "",
    description: "",
    target_amount: "",
    sector: "",
    cover_image_url: "",
    deadline: "",
    ngo_id: "",
  });
  const [totalReceived, setTotalReceived] = useState(0);
  const { publicKey, connect, sign } = useFreighter();

  useEffect(() => {
    setRole(getRole());
  }, []);

  // Load donations
  useEffect(() => {
    async function loadDonations() {
      try {
        const data = await listDonations();
        setDonations(data);
        const total = data.reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);
        setTotalReceived(total);
        const inferredNgoId = data.find((donation: Donation) => donation.ngo_id)?.ngo_id;
        if (inferredNgoId) {
          setCampaignForm((current) =>
            current.ngo_id ? current : { ...current, ngo_id: String(inferredNgoId) }
          );
        }
      } catch (err) {
        console.error("Failed to load donations:", err);
      }
    }
    if (role === "ngo") {
      loadDonations();
      const interval = setInterval(loadDonations, 15000);
      return () => clearInterval(interval);
    }
  }, [role]);

  // Load campaigns
  useEffect(() => {
    async function loadCampaigns() {
      try {
        setCampaigns(await listProjects());
      } catch (err) {
        console.error("Failed to load campaigns:", err);
      }
    }
    if (role === "ngo") {
      loadCampaigns();
      const interval = setInterval(loadCampaigns, 15000);
      return () => clearInterval(interval);
    }
  }, [role]);

  async function createCampaign() {
    const ngoId = Number(campaignForm.ngo_id);
    const targetAmount = Number(campaignForm.target_amount);

    if (
      !campaignForm.title ||
      !campaignForm.description ||
      !Number.isInteger(ngoId) ||
      ngoId <= 0 ||
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      setCampaignStatus("error");
      setCampaignError("Please complete all required fields and set positive target amount.");
      return;
    }

    setCampaignStatus("saving");
    setCampaignError("");
    try {
      const walletPublicKey = publicKey || (await connect());
      if (!walletPublicKey) throw new Error("Connect wallet before creating campaign");

      const created = await createProject({
        name: campaignForm.title,
        description: campaignForm.description,
        ngo_id: ngoId,
        target_amount: targetAmount,
        sector: campaignForm.sector || undefined,
        cover_image_url: campaignForm.cover_image_url || undefined,
        deadline: campaignForm.deadline || undefined,
      });

      setCampaigns((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setCampaignForm({
        title: "",
        description: "",
        target_amount: "",
        sector: "",
        cover_image_url: "",
        deadline: "",
        ngo_id: String(ngoId),
      });
      setCampaignStatus("success");
      setTimeout(() => setCampaignStatus("idle"), 2500);
    } catch (err) {
      setCampaignStatus("error");
      setCampaignError(err instanceof Error ? err.message : "Campaign could not be created");
      setTimeout(() => setCampaignStatus("idle"), 3500);
    }
  }

  async function uploadWorkUpdate() {
    if (!newUpdate.title || !newUpdate.description || newUpdate.donation_id === 0) {
      return;
    }

    setUploadStatus("uploading");
    try {
      const walletPublicKey = publicKey || (await connect());
      if (!walletPublicKey) throw new Error("Connect wallet before signing update");

      const form = new FormData();
      const blob = new Blob(
        [
          JSON.stringify({
            title: newUpdate.title,
            description: newUpdate.description,
            image_url: newUpdate.image_url,
            progress_percentage: newUpdate.progress_percentage,
            timestamp: new Date().toISOString(),
          }),
        ],
        { type: "application/json" }
      );
      form.append("file", blob, "update.json");
      form.append("donation_id", String(newUpdate.donation_id));

      const evidenceData = await prepareEvidence(form);
      if (!evidenceData.xdr || !evidenceData.ipfsCid)
        throw new Error("Evidence compilation did not return transaction payload");

      const signedEvidenceXdr = await sign(evidenceData.xdr);
      const evidenceTxHash = await submitTx(signedEvidenceXdr);

      await confirmEvidence({
        donationId: newUpdate.donation_id,
        ipfsCid: evidenceData.ipfsCid,
        txHash: evidenceTxHash,
      });

      const verifyPrepare = await prepareImpactVerification(newUpdate.donation_id);
      if (!verifyPrepare.xdr) throw new Error("Verification compilation did not return transaction payload");

      const signedVerifyXdr = await sign(verifyPrepare.xdr);
      const verifyTxHash = await submitTx(signedVerifyXdr);

      await confirmImpactVerification(newUpdate.donation_id, verifyTxHash);

      const postedAt = new Date().toISOString();
      const donation = donations.find((item) => item.id === newUpdate.donation_id);
      const postedUpdate: StoredWorkUpdate = {
        donation_id: newUpdate.donation_id,
        ngo_id: donation?.ngo_id ?? null,
        title: newUpdate.title,
        description: newUpdate.description,
        image_url: newUpdate.image_url,
        progress_percentage: newUpdate.progress_percentage,
        created_at: postedAt,
      };

      saveStoredWorkUpdate(postedUpdate);
      saveDonorNotification(createNotificationFromUpdate(postedUpdate));

      window.dispatchEvent(
        new CustomEvent("work-update-posted", {
          detail: {
            donationId: newUpdate.donation_id,
            update: postedUpdate,
          },
        })
      );

      setUploadStatus("success");
      setNewUpdate({
        donation_id: 0,
        title: "",
        description: "",
        image_url: "",
        progress_percentage: 0,
      });
      setSelectedDonation(null);

      // Reload donations
      setDonations(await listDonations());
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch {
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  }

  function selectDonationForUpdate(donationId: number) {
    setSelectedDonation(donationId);
    setNewUpdate((curr) => ({ ...curr, donation_id: donationId }));
  }

  if (role !== "ngo") {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
        <Building className="h-12 w-12 text-muted animate-pulse" />
        <h3 className="text-lg font-semibold text-ink">NGO Dashboard Only</h3>
        <p className="text-sm text-body max-w-sm">
          Please log in as an NGO organization helper to access campaign management and evidence uploading pipelines.
        </p>
      </div>
    );
  }

  const pendingDonations = donations.filter((d) => !d.evidence_url);
  const completedDonations = donations.filter((d) => d.evidence_url);
  const knownNgoIds = new Set(donations.map((donation) => donation.ngo_id).filter(Boolean));
  const selectedCampaignNgoId = Number(campaignForm.ngo_id);

  const visibleCampaigns = campaigns.filter((campaign) => {
    if (knownNgoIds.size > 0) return knownNgoIds.has(campaign.ngo_id);
    if (Number.isInteger(selectedCampaignNgoId) && selectedCampaignNgoId > 0)
      return campaign.ngo_id === selectedCampaignNgoId;
    return true;
  });

  const receivedForCampaign = (campaign: CampaignProject) =>
    donations
      .filter((donation) => donation.project_id === campaign.id)
      .reduce((sum, donation) => sum + Number(donation.amount), 0);

  const totalCampaignTarget = visibleCampaigns.reduce(
    (sum, campaign) => sum + Number(campaign.target_amount || 0),
    0
  );
  const totalCampaignReceived = visibleCampaigns.reduce(
    (sum, campaign) => sum + receivedForCampaign(campaign),
    0
  );
  const remainingCampaignFunding = Math.max(totalCampaignTarget - totalCampaignReceived, 0);

  return (
    <div className="flex flex-col space-y-8 pb-12">
      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-canvas border border-hairline shadow-soft">
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Total Received</span>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                {totalReceived.toFixed(2)} <span className="text-xs text-muted font-sans font-semibold">XLM</span>
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-canvas border border-hairline shadow-soft">
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Campaign Donations</span>
              <h3 className="font-mono text-2xl font-semibold text-ink">
                {donations.length}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <LayoutList className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-canvas border border-hairline shadow-soft">
          <CardContent className="pt-6 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Pending updates</span>
              <h3 className="font-mono text-2xl font-semibold text-ink text-amber-500">
                {pendingDonations.length}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* NGO Campaigns panel */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Launch Campaign</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Launch a targeted fundraising campaign that links directly to Soroban registry milestones.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-title" className="text-xs font-semibold">Campaign Title</Label>
                  <Input
                    id="camp-title"
                    placeholder="Reforestation or Clean Water wells"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-target" className="text-xs font-semibold">Target (XLM)</Label>
                  <Input
                    id="camp-target"
                    type="number"
                    min="1"
                    placeholder="2500"
                    value={campaignForm.target_amount}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_amount: e.target.value })}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-sector" className="text-xs font-semibold">Sector Category</Label>
                  <Input
                    id="camp-sector"
                    placeholder="Education, Health, Environment"
                    value={campaignForm.sector}
                    onChange={(e) => setCampaignForm({ ...campaignForm, sector: e.target.value })}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-deadline" className="text-xs font-semibold">Deadline</Label>
                  <Input
                    id="camp-deadline"
                    type="date"
                    value={campaignForm.deadline}
                    onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col space-y-1.5">
                  <Label htmlFor="camp-desc" className="text-xs font-semibold">Campaign Details</Label>
                  <Textarea
                    id="camp-desc"
                    placeholder="Describe milestones, coordinates, and exact expected outcomes."
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-img" className="text-xs font-semibold">Cover Image URL</Label>
                  <Input
                    id="camp-img"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={campaignForm.cover_image_url}
                    onChange={(e) => setCampaignForm({ ...campaignForm, cover_image_url: e.target.value })}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="camp-ngo-id" className="text-xs font-semibold">NGO Identifier</Label>
                  <Input
                    id="camp-ngo-id"
                    type="number"
                    value={campaignForm.ngo_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, ngo_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col space-y-3">
                <Button
                  onClick={createCampaign}
                  disabled={campaignStatus === "saving"}
                  className="w-full font-semibold rounded-pill h-11"
                >
                  {campaignStatus === "saving" ? "Publishing on Stellar..." : "Launch Campaign"}
                </Button>

                {campaignStatus !== "idle" && (
                  <div className={`p-3 rounded-lg text-xs font-semibold text-center border ${
                    campaignStatus === "success"
                      ? "bg-emerald-500/5 border-emerald-500/20 text-semantic-up"
                      : campaignStatus === "error"
                      ? "bg-red-500/5 border-red-500/20 text-semantic-down"
                      : "bg-primary/5 border-primary/20 text-primary animate-pulse"
                  }`}>
                    {campaignStatus === "success" && "✅ Campaign active and live on blockchain registry."}
                    {campaignStatus === "saving" && "⛓️ Broadcasting project registration..."}
                    {campaignStatus === "error" && `❌ Error: ${campaignError}`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns List */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-ink flex items-center space-x-2">
              <span>Active Campaigns</span>
              <Badge variant="outline" className="font-mono text-xs">{visibleCampaigns.length}</Badge>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleCampaigns.map((campaign) => {
                const received = receivedForCampaign(campaign);
                const target = Number(campaign.target_amount || 0);
                const progress = target > 0 ? Math.min((received / target) * 100, 100) : 0;
                const complete = target > 0 && received >= target;

                return (
                  <Card key={campaign.id} className="overflow-hidden flex flex-col hover:shadow-soft duration-200">
                    {campaign.cover_image_url && (
                      <div className="h-32 overflow-hidden border-b border-hairline">
                        <img
                          className="w-full object-cover"
                          src={campaign.cover_image_url}
                          alt={campaign.name}
                        />
                      </div>
                    )}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-ink leading-snug">{campaign.name}</h4>
                          {complete && <Badge variant="success">Completed</Badge>}
                        </div>
                        {campaign.sector && (
                          <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
                            {campaign.sector}
                          </span>
                        )}
                        {campaign.description && (
                          <p className="text-xs text-body line-clamp-2 mt-2 leading-relaxed">
                            {campaign.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-hairline-soft">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="font-mono">{received.toFixed(2)} / {target.toFixed(2)} XLM</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} />
                        {campaign.deadline && (
                          <p className="text-[10px] text-muted pt-1">
                            Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {visibleCampaigns.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-muted font-medium bg-canvas border border-hairline rounded-xl shadow-soft">
                  No active campaigns found. Register your first program above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidence uploading and list of donations */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Upload panel */}
          <Card>
            <CardHeader className="pb-4 border-b border-hairline">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Upload Evidence</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Publish geolocated evidence and milestone updates onto IPFS to release escrow.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedDonation === null ? (
                <div className="py-8 text-center text-xs text-muted font-semibold bg-surface-soft border border-dashed border-hairline rounded-xl">
                  👇 Click on a pending donation card below to load the uploader.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <span className="text-xs font-semibold text-primary">Selected Donation #{selectedDonation}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted font-semibold" onClick={() => setSelectedDonation(null)}>
                      Clear
                    </Button>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="up-title" className="text-xs font-semibold">Milestone Title</Label>
                    <Input
                      id="up-title"
                      placeholder="e.g. Well Construction Complete"
                      value={newUpdate.title}
                      onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="up-desc" className="text-xs font-semibold">Evidence Details</Label>
                    <Textarea
                      id="up-desc"
                      placeholder="Specify work details, GPS verification and telemetry readings..."
                      value={newUpdate.description}
                      onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="up-img" className="text-xs font-semibold">Photo Link (Optional)</Label>
                    <Input
                      id="up-img"
                      placeholder="https://ipfs.io/ipfs/..."
                      value={newUpdate.image_url}
                      onChange={(e) => setNewUpdate({ ...newUpdate, image_url: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <Label>Milestone Progress</Label>
                      <span>{newUpdate.progress_percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newUpdate.progress_percentage}
                      onChange={(e) => setNewUpdate({ ...newUpdate, progress_percentage: parseInt(e.target.value) })}
                      className="w-full accent-primary bg-surface-strong h-1 rounded-lg cursor-pointer"
                    />
                    <Progress value={newUpdate.progress_percentage} />
                  </div>

                  <div className="pt-2 flex flex-col space-y-3">
                    <Button
                      onClick={uploadWorkUpdate}
                      disabled={uploadStatus === "uploading" || !newUpdate.title || !newUpdate.description}
                      className="w-full h-11 font-semibold rounded-pill"
                    >
                      {uploadStatus === "uploading" ? "Publishing to IPFS..." : "Upload Evidence"}
                    </Button>

                    {uploadStatus !== "idle" && (
                      <div className={`p-3 rounded-lg text-xs font-semibold text-center border ${
                        uploadStatus === "success"
                          ? "bg-emerald-500/5 border-emerald-500/20 text-semantic-up"
                          : uploadStatus === "error"
                          ? "bg-red-500/5 border-red-500/20 text-semantic-down"
                          : "bg-primary/5 border-primary/20 text-primary animate-pulse"
                      }`}>
                        {uploadStatus === "uploading" && "⛓️ Syncing updates with IPFS gateway..."}
                        {uploadStatus === "success" && "✅ Milestones updated. Escrow released."}
                        {uploadStatus === "error" && "❌ Failed to submit updates. Try again."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incoming Donations registry */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-ink flex items-center space-x-2">
              <span>Incoming Donations</span>
              <Badge variant="outline" className="font-mono text-xs">{donations.length}</Badge>
            </h4>

            {pendingDonations.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  ⏳ Awaiting Evidence ({pendingDonations.length})
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {pendingDonations.map((donation) => (
                    <Card
                      key={donation.id}
                      onClick={() => selectDonationForUpdate(donation.id)}
                      className={`cursor-pointer hover:shadow-soft border transition-all duration-150 ${
                        selectedDonation === donation.id ? "border-primary bg-primary/5" : "border-hairline"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-ink">Donation #{donation.id}</span>
                          <span className="font-mono font-bold text-xs">{donation.amount} XLM</span>
                        </div>
                        <p className="text-[11px] text-muted truncate">
                          Donor: {donation.donor_public_key.slice(0, 6)}...{donation.donor_public_key.slice(-4)}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted">
                          <span>{new Date(donation.created_at).toLocaleDateString()}</span>
                          <Badge variant="default" className="text-[9px] bg-amber-500/10 text-amber-500">
                            Awaiting Update
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {completedDonations.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-semantic-up">
                  ✅ Updates Uploaded ({completedDonations.length})
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {completedDonations.map((donation) => (
                    <Card key={donation.id} className="border-hairline bg-surface-soft opacity-80">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-ink">Donation #{donation.id}</span>
                          <span className="font-mono font-bold text-xs">{donation.amount} XLM</span>
                        </div>
                        <p className="text-[11px] text-muted truncate">
                          Donor: {donation.donor_public_key.slice(0, 6)}...{donation.donor_public_key.slice(-4)}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted">
                          <span>{new Date(donation.created_at).toLocaleDateString()}</span>
                          <Badge variant="success" className="text-[9px]">
                            Verified Update
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {donations.length === 0 && (
              <div className="py-12 text-center text-xs text-muted font-medium bg-canvas border border-hairline rounded-xl">
                No donations received on-chain yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Building(props: React.SVGProps<SVGSVGElement>) {
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
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="16" />
      <line x1="15" y1="22" x2="15" y2="16" />
      <line x1="9" y1="16" x2="15" y2="16" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M9 6h.01" />
      <path d="M15 6h.01" />
    </svg>
  );
}
