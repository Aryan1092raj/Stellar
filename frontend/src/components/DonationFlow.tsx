'use client';
import { useMemo, useState, useEffect } from 'react';
import TransactionModal from './TransactionModal';
import { buildDonationTx, submitTx } from '../lib/stellar';
import { useFreighter } from '../hooks/useFreighter';
import { confirmDonation, listNGOs, NGOItem } from '../lib/api/client';
import { apiRoutes } from '../lib/api/routes';
import DonorFeed from './DonorFeed';
import { latestWorkUpdateForNGO, StoredWorkUpdate } from '../lib/workUpdates';

const INR_PRESETS = [100, 500, 1000, 5000];
const FALLBACK_INR_PER_XLM = 38; // ~₹38/XLM as of mid-2026 fallback

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
  return error instanceof Error ? error.message : 'tx-error';
}

function impactMessage(sector?: string | null) {
  const normalized = (sector || '').toLowerCase();

  if (normalized.includes('education')) {
    return "Rs. 500 sponsors a child's education for one month";
  }
  if (normalized.includes('health')) {
    return 'Rs. 500 provides basic healthcare to 2 families';
  }
  if (normalized.includes('environment')) {
    return 'Rs. 500 plants 10 trees';
  }
  if (normalized.includes('child')) {
    return 'Rs. 500 feeds 5 children for a week';
  }
  return "Rs. 500 directly supports this NGO's mission";
}

export default function DonationFlow({ selectedLatLng }: { selectedLatLng?: { lat: number; lng: number } }) {
  const [amountInr, setAmountInr] = useState(500);
  const [inrPerXlm, setInrPerXlm] = useState(FALLBACK_INR_PER_XLM);
  const [ngoId, setNgoId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedNgo, setSelectedNgo] = useState<NGOItem | null>(null);

  const [status, setStatus] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'error'>('idle');
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
      setStatus('signing');

      // ✅ Enforce wallet connection (real donor identity)
      const walletPublicKey = publicKey || (await connect());

      if (!ngoId || !selectedNgo) throw new Error('Select an NGO first');
      if (!selectedLatLng) throw new Error('Select your location on the map');

      // ✅ 1. Build and sign the real Soroban transaction
      const xdr = await buildDonationTx({
        donorPublicKey: walletPublicKey,
        amountXLM,
        ngoId,
        projectId,
        donorLat: selectedLatLng.lat,
        donorLon: selectedLatLng.lng,
      });
      const signedXdr = await sign(xdr);

      // ✅ 2. Submit ON-CHAIN FIRST (SOURCE OF TRUTH)
      setStatus('submitted');
      const confirmedTxHash = await submitTx(signedXdr);
      setTxHash(confirmedTxHash);

      // ✅ 3. Persist OFF-CHAIN using SECURE AUTH FETCH
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
      setStatus('confirmed');
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e));
      setStatus('error');
    }
  };

  const submit = () => submitXlmWalletDonation();

  // ✅ NGO selection from external UI
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<SelectedNGODetail>).detail;
      if (detail && typeof detail.id === 'number') {
        setNgoId(detail.id);
        const matched = ngos.find((ngo) => ngo.id === detail.id);
        setSelectedNgo(matched || {
          id: detail.id,
          name: detail.name || 'Selected NGO',
          sector: detail.sector ?? null,
          wallet_address: detail.wallet_address || '',
          verification_status: 'verified',
        });
        if (detail.project_id) setProjectId(detail.project_id);
      }
    }
    window.addEventListener('select-ngo', handler);
    return () => window.removeEventListener('select-ngo', handler);
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

    window.addEventListener('work-update-posted', handleWorkUpdate);
    return () => window.removeEventListener('work-update-posted', handleWorkUpdate);
  }, [selectedNgo]);

  // ✅ Load NGOs on mount
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
        // CoinGecko free API — no key needed
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
  const processing = status === 'signing' || status === 'submitted';

  return (
    <div className="stack">
      <DonorFeed />
      <div className="section-header">
        <div className="section-icon">💝</div>
        <div>
          <h3 className="section-title">Make a Donation</h3>
          <p className="section-subtitle">Support verified NGOs with transparent blockchain donations</p>
        </div>
      </div>

      <div className="donation-form">
        {/* ✅ NGO SELECTION */}
        <div className="form-group">
          <label>
            <span className="label-icon">🏢</span>
            <span>Selected NGO</span>
          </label>
          <div className={`location-preview ${selectedNgo ? 'selected' : ''}`}>
            {selectedNgo ? `Selected: ${selectedNgo.name}` : 'Choose an NGO from the NGO tab'}
          </div>
          {selectedNgo && <div className="form-hint">{impactMessage(selectedNgo.sector)}</div>}
        </div>

        {selectedNgo && latestUpdate && (
          <div className="work-update-preview">
            {latestUpdate.image_url && (
              <img src={latestUpdate.image_url} alt="" />
            )}
            <div className="work-update-preview-body">
              <div className="work-update-preview-topline">
                <span>Latest work update</span>
                <b>{latestUpdate.progress_percentage}%</b>
              </div>
              <h4>{latestUpdate.title}</h4>
              <p>{latestUpdate.description}</p>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${Math.min(latestUpdate.progress_percentage, 100)}%` }}></div>
              </div>
              <small>Your donation unlocks when this NGO posts their next update.</small>
            </div>
          </div>
        )}

        {/* ✅ AMOUNT */}
        <div className="form-group">
          <label>
            <span className="label-icon">💰</span>
            <span>Donation Amount</span>
          </label>

          <div className="amount-input-enhanced">
            <div className="amount-quick-select">
              {INR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={amountInr === preset ? 'active' : ''}
                  onClick={() => setAmountInr(preset)}
                  type="button"
                >
                  Rs. {preset}
                </button>
              ))}
            </div>
            <div className="amount-input-wrapper">
              <span className="currency-badge">INR</span>
              <input
                className="form-control amount-field"
                type="number"
                min={1}
                step={100}
                value={amountInr}
                onChange={(e) => setAmountInr(Number(e.target.value))}
              />
            </div>
            <div className="form-hint">
              Approx. {amountXLM.toFixed(2)} XLM at Rs. {inrPerXlm.toFixed(2)} / XLM
            </div>
          </div>
        </div>

        {/* ✅ LOCATION */}
        <div className="form-group">
          <label>
            <span className="label-icon">📍</span>
            <span>Your Location</span>
          </label>

          <div className={`location-preview ${selectedLatLng ? 'selected' : ''}`}>
            {selectedLatLng
              ? `${selectedLatLng.lat.toFixed(4)}, ${selectedLatLng.lng.toFixed(4)}`
              : 'Click on the map'}
          </div>
        </div>

        {/* ✅ SUBMIT */}
        <button className="donate-btn" onClick={submit} disabled={!ready || processing}>
          {status === 'idle'
            ? connected
              ? latestUpdate
                ? 'Fund This Progress'
                : 'Make XLM Donation'
              : 'Connect Freighter & Donate'
            : status === 'signing'
            ? 'Signing...'
            : 'Processing...'}
        </button>

        {/* ✅ STATUS */}
        <div className={`status status-${status}`}>
          {status === 'idle' && 'Ready'}
          {status === 'signing' && 'Awaiting wallet signature'}
          {status === 'submitted' && 'Waiting for confirmation'}
          {status === 'confirmed' && 'Donation successful ✅'}
          {status === 'error' && (error || 'Error')}
        </div>
      </div>

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
