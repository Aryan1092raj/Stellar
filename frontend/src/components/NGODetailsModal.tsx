"use client";
import { useState, useEffect } from 'react';
import { listDonations, type Donation } from '../lib/api/client';
import Modal from './Modal';

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
      // Fetch all donations
      const allDonations = await listDonations();
      const ngoDonations = allDonations.filter((d) => d.ngo_id === ngo.id && d.status !== 'failed');
      setDonations(ngoDonations);

      // Parse evidence URLs to get work updates
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
                  title: 'Work Update',
                  description: text,
                  progress_percentage: 100,
                  timestamp: donation.created_at,
                };
              }
            }
          } catch (err) {
            console.error('Failed to fetch evidence:', err);
          }
        }
      }
      setWorkUpdates(updates);
    } catch (err) {
      console.error('Failed to load NGO data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!ngo) return null;

  const totalDonations = donations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
  const donationsWithUpdates = donations.filter(d => d.evidence_url).length;

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="ngo-details-modal">
        {/* NGO Header */}
        <div className="ngo-details-header">
          <div className="ngo-icon">🏢</div>
          <div className="ngo-info">
            <h2 className="ngo-details-title">{ngo.name}</h2>
            {ngo.sector && <div className="ngo-details-sector">{ngo.sector}</div>}
            <div className="ngo-details-wallet">
              <span className="wallet-icon">👛</span>
              <span className="wallet-address">{ngo.wallet_address}</span>
            </div>
            <div className="ngo-verification-badge">
              <span className={`badge ${ngo.verification_status === 'verified' ? 'verified' : 'pending'}`}>
                {ngo.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="ngo-stats-grid">
          <div className="ngo-stat">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Total Received</div>
            <div className="stat-value">{totalDonations.toFixed(2)} XLM</div>
          </div>
          <div className="ngo-stat">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Donations</div>
            <div className="stat-value">{donations.length}</div>
          </div>
          <div className="ngo-stat">
            <div className="stat-icon">📝</div>
            <div className="stat-label">Updates</div>
            <div className="stat-value">{donationsWithUpdates}</div>
          </div>
        </div>

        {/* Donations & Work Updates */}
        <div className="ngo-work-updates">
          <h3 className="updates-title">Work Progress & Updates</h3>
          
          {loading && (
            <div className="loading-state">
              <div className="spinner">⏳</div>
              <p>Loading updates...</p>
            </div>
          )}

          {!loading && donations.length === 0 && (
            <div className="empty-state-small">
              <div className="empty-icon">📭</div>
              <p>No donations to this NGO yet</p>
            </div>
          )}

          {!loading && donations.length > 0 && (
            <div className="updates-timeline">
              {donations.map((donation) => {
                const update = workUpdates[donation.id];
                return (
                  <div key={donation.id} className={`timeline-item ${update ? 'has-update' : ''}`}>
                    <div className="timeline-marker">
                      {update ? '✅' : '⏳'}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <div className="timeline-title">
                          Donation #{donation.id} - {donation.amount} XLM
                        </div>
                        <div className="timeline-date">
                          {new Date(donation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {update ? (
                        <div className="work-update-card">
                          <div className="update-header">
                            <h4>{update.title}</h4>
                            <div className="progress-badge">
                              {update.progress_percentage}% Complete
                            </div>
                          </div>
                          <p className="update-description">{update.description}</p>
                          {update.image_url && (
                            <div className="update-image-container">
                              <img src={update.image_url} alt={update.title} className="update-image" />
                            </div>
                          )}
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar" 
                              style={{ width: `${update.progress_percentage}%` }}
                            ></div>
                          </div>
                          <div className="update-timestamp">
                            Updated: {new Date(update.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <div className="no-update-card">
                          <p>⏳ Waiting for NGO to upload work progress</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
