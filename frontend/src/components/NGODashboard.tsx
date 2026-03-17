"use client";
import { useState, useEffect } from 'react';
import { getRole } from '../lib/auth';

interface Donation {
  id: number;
  donor_public_key: string;
  amount: number;
  status: string;
  created_at: string;
  evidence_url?: string;
  ngo_id: number;
}

interface WorkUpdate {
  id?: number;
  donation_id: number;
  title: string;
  description: string;
  image_url?: string;
  progress_percentage: number;
  created_at?: string;
}

export default function NGODashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
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
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    setRole(getRole());
  }, []);

  // Load donations for this NGO
  useEffect(() => {
    async function loadDonations() {
      try {
        const res = await fetch('/api/donations', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDonations(data);
          const total = data.reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);
          setTotalReceived(total);
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

  async function uploadWorkUpdate() {
    if (!newUpdate.title || !newUpdate.description || newUpdate.donation_id === 0) {
      return;
    }

    setUploadStatus('uploading');
    try {
      // Upload to evidence API
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/evidence/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: (() => {
          const form = new FormData();
          const blob = new Blob([JSON.stringify({
            title: newUpdate.title,
            description: newUpdate.description,
            image_url: newUpdate.image_url,
            progress_percentage: newUpdate.progress_percentage,
            timestamp: new Date().toISOString(),
          })], { type: 'application/json' });
          form.append('file', blob, 'update.json');
          return form;
        })(),
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const evidenceData = await res.json();

      // Update donation with evidence URL
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/donations/${newUpdate.donation_id}/evidence`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ evidence_url: evidenceData.url }),
      });

      if (updateRes.ok) {
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
        const reloadRes = await fetch('/api/donations', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          setDonations(data);
        }

        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
      }
    } catch (err) {
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
                  placeholder="Describe the work completed, impact achieved, and any challenges..."
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
