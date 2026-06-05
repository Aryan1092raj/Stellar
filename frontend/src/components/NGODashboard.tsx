"use client";
import { useState, useEffect } from 'react';
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
} from '../lib/api/client';
import { getRole } from '../lib/auth';
import { submitTx } from '../lib/stellar';
import { useFreighter } from '../hooks/useFreighter';
import {
  createNotificationFromUpdate,
  saveDonorNotification,
  saveStoredWorkUpdate,
  StoredWorkUpdate,
} from '../lib/workUpdates';

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
  const [updates, setUpdates] = useState<WorkUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState<WorkUpdate>({
    donation_id: 0,
    title: '',
    description: '',
    image_url: '',
    progress_percentage: 0,
  });
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [campaignError, setCampaignError] = useState('');
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    title: '',
    description: '',
    target_amount: '',
    sector: '',
    cover_image_url: '',
    deadline: '',
    ngo_id: '',
  });
  const [totalReceived, setTotalReceived] = useState(0);
  const { publicKey, connect, sign } = useFreighter();

  useEffect(() => {
    setRole(getRole());
  }, []);

  // Load donations for this NGO
  useEffect(() => {
    async function loadDonations() {
      try {
        const data = await listDonations();
        setDonations(data);
        const total = data.reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);
        setTotalReceived(total);
        const inferredNgoId = data.find((donation: Donation) => donation.ngo_id)?.ngo_id;
        if (inferredNgoId) {
          setCampaignForm((current) => current.ngo_id ? current : { ...current, ngo_id: String(inferredNgoId) });
        }
      } catch (err) {
        console.error('Failed to load donations:', err);
      }
    }
    if (role === 'ngo') {
      loadDonations();
      const interval = setInterval(loadDonations, 15000);
      return () => clearInterval(interval);
    }
  }, [role]);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        setCampaigns(await listProjects());
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      }
    }

    if (role === 'ngo') {
      loadCampaigns();
      const interval = setInterval(loadCampaigns, 15000);
      return () => clearInterval(interval);
    }
  }, [role]);

  async function createCampaign() {
    const ngoId = Number(campaignForm.ngo_id);
    const targetAmount = Number(campaignForm.target_amount);

    if (!campaignForm.title || !campaignForm.description || !Number.isInteger(ngoId) || ngoId <= 0 || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setCampaignStatus('error');
      setCampaignError('Add a title, description, NGO ID, and positive target amount.');
      return;
    }

    setCampaignStatus('saving');
    setCampaignError('');
    try {
      const walletPublicKey = publicKey || await connect();
      if (!walletPublicKey) throw new Error('Connect Freighter before creating a campaign');

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
        title: '',
        description: '',
        target_amount: '',
        sector: '',
        cover_image_url: '',
        deadline: '',
        ngo_id: String(ngoId),
      });
      setCampaignStatus('success');
      setTimeout(() => setCampaignStatus('idle'), 2500);
    } catch (err) {
      setCampaignStatus('error');
      setCampaignError(err instanceof Error ? err.message : 'Campaign could not be created');
      setTimeout(() => setCampaignStatus('idle'), 3500);
    }
  }

  async function uploadWorkUpdate() {
    if (!newUpdate.title || !newUpdate.description || newUpdate.donation_id === 0) {
      return;
    }

    setUploadStatus('uploading');
    try {
      const walletPublicKey = publicKey || await connect();
      if (!walletPublicKey) throw new Error('Connect Freighter before signing');

      const form = new FormData();
      const blob = new Blob([JSON.stringify({
        title: newUpdate.title,
        description: newUpdate.description,
        image_url: newUpdate.image_url,
        progress_percentage: newUpdate.progress_percentage,
        timestamp: new Date().toISOString(),
      })], { type: 'application/json' });
      form.append('file', blob, 'update.json');
      form.append('donation_id', String(newUpdate.donation_id));
      
      const evidenceData = await prepareEvidence(form);
      if (!evidenceData.xdr || !evidenceData.ipfsCid) throw new Error('Evidence preparation did not return XDR');

      const signedEvidenceXdr = await sign(evidenceData.xdr);
      const evidenceTxHash = await submitTx(signedEvidenceXdr);

      await confirmEvidence({
        donationId: newUpdate.donation_id,
        ipfsCid: evidenceData.ipfsCid,
        txHash: evidenceTxHash,
      });

      const verifyPrepare = await prepareImpactVerification(newUpdate.donation_id);
      if (!verifyPrepare.xdr) throw new Error('Impact verification preparation did not return XDR');

      const signedVerifyXdr = await sign(verifyPrepare.xdr);
      const verifyTxHash = await submitTx(signedVerifyXdr);

      await confirmImpactVerification(newUpdate.donation_id, verifyTxHash);

      {
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
        window.dispatchEvent(new CustomEvent('work-update-posted', {
          detail: {
            donationId: newUpdate.donation_id,
            update: postedUpdate,
          },
        }));
        setUploadStatus('success');
        setNewUpdate({
          donation_id: 0,
          title: '',
          description: '',
          image_url: '',
          progress_percentage: 0,
        });
        setSelectedDonation(null);
        
        // Reload donations
        setDonations(await listDonations());

        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }

  function selectDonationForUpdate(donationId: number) {
    setSelectedDonation(donationId);
    setNewUpdate({ ...newUpdate, donation_id: donationId });
  }

  if (role !== 'ngo') {
    return (
      <div className="ngo-dashboard-empty">
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>NGO Dashboard</h3>
          <p>Please log in as an NGO to access your dashboard</p>
        </div>
      </div>
    );
  }

  const pendingDonations = donations.filter(d => !d.evidence_url);
  const completedDonations = donations.filter(d => d.evidence_url);
  const knownNgoIds = new Set(donations.map((donation) => donation.ngo_id).filter(Boolean));
  const selectedCampaignNgoId = Number(campaignForm.ngo_id);
  const visibleCampaigns = campaigns.filter((campaign) => {
    if (knownNgoIds.size > 0) return knownNgoIds.has(campaign.ngo_id);
    if (Number.isInteger(selectedCampaignNgoId) && selectedCampaignNgoId > 0) return campaign.ngo_id === selectedCampaignNgoId;
    return true;
  });
  const receivedForCampaign = (campaign: CampaignProject) => donations
    .filter((donation) => donation.project_id === campaign.id)
    .reduce((sum, donation) => sum + Number(donation.amount), 0);
  const totalCampaignTarget = visibleCampaigns.reduce((sum, campaign) => sum + Number(campaign.target_amount || 0), 0);
  const totalCampaignReceived = visibleCampaigns.reduce((sum, campaign) => sum + receivedForCampaign(campaign), 0);
  const remainingCampaignFunding = Math.max(totalCampaignTarget - totalCampaignReceived, 0);

  return (
    <div className="ngo-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Total Received</div>
              <div className="stat-value">{totalReceived.toFixed(2)} XLM</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Donations</div>
              <div className="stat-value">{donations.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-label">Pending Updates</div>
              <div className="stat-value">{pendingDonations.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="campaign-section">
          <div className="section-header">
            <div className="section-icon">+</div>
            <div>
              <h3 className="section-title">Create Campaign</h3>
              <p className="section-subtitle">Define a funding target donors can track by project</p>
            </div>
          </div>

          <div className="campaign-form-grid">
            <label className="form-group">
              <span>Campaign title</span>
              <input
                className="form-control"
                placeholder="Clean water for village schools"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Target amount in XLM</span>
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                placeholder="2500"
                value={campaignForm.target_amount}
                onChange={(e) => setCampaignForm({ ...campaignForm, target_amount: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Project category</span>
              <input
                className="form-control"
                placeholder="Education, Health, Environment"
                value={campaignForm.sector}
                onChange={(e) => setCampaignForm({ ...campaignForm, sector: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Deadline</span>
              <input
                className="form-control"
                type="date"
                value={campaignForm.deadline}
                onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
              />
            </label>
            <label className="form-group campaign-form-wide">
              <span>Description</span>
              <textarea
                className="form-control evidence-textarea"
                placeholder="Explain the field work, milestones, and expected impact."
                rows={3}
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Cover image URL</span>
              <input
                className="form-control"
                placeholder="https://example.com/campaign.jpg"
                value={campaignForm.cover_image_url}
                onChange={(e) => setCampaignForm({ ...campaignForm, cover_image_url: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>NGO ID</span>
              <input
                className="form-control"
                type="number"
                min="1"
                placeholder="Auto-filled from donations"
                value={campaignForm.ngo_id}
                onChange={(e) => setCampaignForm({ ...campaignForm, ngo_id: e.target.value })}
              />
            </label>
          </div>

          <button
            className="upload-work-btn"
            onClick={createCampaign}
            disabled={campaignStatus === 'saving'}
            type="button"
          >
            {campaignStatus === 'saving' ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
          {campaignStatus !== 'idle' && (
            <div className={`status-enhanced status-${campaignStatus === 'success' ? 'success' : campaignStatus === 'error' ? 'error' : 'uploading'}`}>
              <div className="status-message">
                {campaignStatus === 'success' && 'Campaign created successfully.'}
                {campaignStatus === 'saving' && 'Saving campaign...'}
                {campaignStatus === 'error' && (campaignError || 'Campaign could not be created.')}
              </div>
            </div>
          )}
        </div>

        <div className="funding-overview">
          <div className="funding-summary">
            <div>
              <span>Total Target</span>
              <strong>{totalCampaignTarget.toFixed(2)} XLM</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{totalCampaignReceived.toFixed(2)} XLM</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{remainingCampaignFunding.toFixed(2)} XLM</strong>
            </div>
          </div>
          <div className="campaign-cards">
            {visibleCampaigns.map((campaign) => {
              const received = receivedForCampaign(campaign);
              const target = Number(campaign.target_amount || 0);
              const progress = target > 0 ? Math.min((received / target) * 100, 100) : 0;
              const complete = target > 0 && received >= target;
              return (
                <article className="campaign-card" key={campaign.id}>
                  {campaign.cover_image_url && (
                    <img className="campaign-cover" src={campaign.cover_image_url} alt="" />
                  )}
                  <div className="campaign-card-body">
                    <div className="campaign-card-header">
                      <div>
                        <h4>{campaign.name}</h4>
                        {campaign.sector && <span>{campaign.sector}</span>}
                      </div>
                      {complete && <b>Campaign Complete</b>}
                    </div>
                    {campaign.description && <p>{campaign.description}</p>}
                    <div className="campaign-progress-row">
                      <span>{received.toFixed(2)} / {target.toFixed(2)} XLM</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                    {campaign.deadline && (
                      <small>Deadline: {new Date(campaign.deadline).toLocaleDateString()}</small>
                    )}
                  </div>
                </article>
              );
            })}
            {visibleCampaigns.length === 0 && (
              <div className="empty-state-small">
                <p>No active campaigns yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Work Update Form */}
        <div className="work-update-section">
          <div className="section-header">
            <div className="section-icon">📤</div>
            <div>
              <h3 className="section-title">Upload Work Progress</h3>
              <p className="section-subtitle">Share updates with your donors</p>
            </div>
          </div>

          {selectedDonation === null ? (
            <div className="select-donation-prompt">
              <p>👇 Select a donation below to upload progress</p>
            </div>
          ) : (
            <div className="update-form">
              <div className="form-group">
                <label>
                  <span className="label-icon">📝</span>
                  <span>Update Title</span>
                </label>
                <input
                  className="form-control"
                  placeholder="e.g., Water well construction - Week 1"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">📄</span>
                  <span>Description</span>
                </label>
                <textarea
                  className="form-control evidence-textarea"
                  placeholder="Describe the work completed, impact achieved, and challenges..."
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">🖼️</span>
                  <span>Image/Photo URL (optional)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="https://example.com/photo.jpg"
                  value={newUpdate.image_url}
                  onChange={(e) => setNewUpdate({ ...newUpdate, image_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="label-icon">📊</span>
                  <span>Progress: {newUpdate.progress_percentage}%</span>
                </label>
                <input
                  type="range"
                  className="progress-slider"
                  min="0"
                  max="100"
                  step="5"
                  value={newUpdate.progress_percentage}
                  onChange={(e) => setNewUpdate({ ...newUpdate, progress_percentage: parseInt(e.target.value) })}
                />
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${newUpdate.progress_percentage}%` }}></div>
                </div>
              </div>

              <button
                className="upload-work-btn"
                onClick={uploadWorkUpdate}
                disabled={uploadStatus === 'uploading' || !newUpdate.title || !newUpdate.description}
              >
                <span className="btn-content">
                  <span className="btn-icon">{uploadStatus === 'uploading' ? '⏳' : '🚀'}</span>
                  <span className="btn-text">
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Work Update'}
                  </span>
                </span>
              </button>

              {uploadStatus !== 'idle' && (
                <div className={`status-enhanced status-${uploadStatus}`}>
                  <div className="status-icon-container">
                    {uploadStatus === 'uploading' && '⏳'}
                    {uploadStatus === 'success' && '✅'}
                    {uploadStatus === 'error' && '❌'}
                  </div>
                  <div className="status-message">
                    {uploadStatus === 'uploading' && 'Uploading work progress to IPFS...'}
                    {uploadStatus === 'success' && 'Work update uploaded successfully! Donors can now see your progress.'}
                    {uploadStatus === 'error' && 'Upload failed. Please try again.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Donations List */}
        <div className="donations-section">
          <h4 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 700 }}>Your Donations</h4>
          
          {pendingDonations.length > 0 && (
            <>
              <div className="donations-subsection-title">⏳ Pending Updates ({pendingDonations.length})</div>
              <div className="donations-grid">
                {pendingDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className={`donation-card ${selectedDonation === donation.id ? 'selected' : ''}`}
                    onClick={() => selectDonationForUpdate(donation.id)}
                  >
                    <div className="donation-header">
                      <div className="donation-id">#{donation.id}</div>
                      <div className="donation-amount">{donation.amount} XLM</div>
                    </div>
                    <div className="donation-donor">
                      From: {donation.donor_public_key.slice(0, 6)}...{donation.donor_public_key.slice(-4)}
                    </div>
                    <div className="donation-date">
                      {new Date(donation.created_at).toLocaleDateString()}
                    </div>
                    <div className="donation-status">
                      <span className="status-badge status-pending">No update yet</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {completedDonations.length > 0 && (
            <>
              <div className="donations-subsection-title" style={{ marginTop: 20 }}>✅ Updated ({completedDonations.length})</div>
              <div className="donations-grid">
                {completedDonations.map((donation) => (
                  <div key={donation.id} className="donation-card completed">
                    <div className="donation-header">
                      <div className="donation-id">#{donation.id}</div>
                      <div className="donation-amount">{donation.amount} XLM</div>
                    </div>
                    <div className="donation-donor">
                      From: {donation.donor_public_key.slice(0, 6)}...{donation.donor_public_key.slice(-4)}
                    </div>
                    <div className="donation-date">
                      {new Date(donation.created_at).toLocaleDateString()}
                    </div>
                    <div className="donation-status">
                      <span className="status-badge status-completed">✓ Updated</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {donations.length === 0 && (
            <div className="empty-state-small">
              <div className="empty-icon">📭</div>
              <p>No donations received yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
