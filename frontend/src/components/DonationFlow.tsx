'use client';
import { useState, useEffect } from 'react';
import TransactionModal from './TransactionModal';
import { authFetch } from '../lib/auth';
import { recordDonationOnChain } from '../lib/soroban/contracts';
import { listNGOs, NGOItem } from '../lib/api/client';

export default function DonationFlow({ selectedLatLng }: { selectedLatLng?: { lat: number; lng: number } }) {
  const [amount, setAmount] = useState(10);
  const [ngoId, setNgoId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const [status, setStatus] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'error'>('idle');
  const [showModal, setShowModal] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const [ngos, setNgos] = useState<NGOItem[]>([]);
  const [loadingNgos, setLoadingNgos] = useState(false);

  // ===== ✅ CORE SUBMIT FLOW (END-TO-END SAFE) =====
  const submit = async () => {
    setShowModal(true);
    setError(undefined);

    try {
      setStatus('signing');

      // ✅ Enforce wallet connection (real donor identity)
      const walletPublicKey = localStorage.getItem('wallet_public_key');
      if (!walletPublicKey) {
        throw new Error('Wallet not connected');
      }

      if (!ngoId) throw new Error('Select an NGO first');
      if (!selectedLatLng) throw new Error('Select your location on the map');

      // ✅ 1. Record ON-CHAIN FIRST (SOURCE OF TRUTH)
      const onchain = await recordDonationOnChain({
        contractId: process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID || '',
        donor: walletPublicKey,
        amount,
        ngo_id: ngoId,
        donor_lat: selectedLatLng.lat,
        donor_lon: selectedLatLng.lng,
      });

      if (!onchain?.txHash) {
        throw new Error('Blockchain transaction failed');
      }

      setTxHash(onchain.txHash);
      setStatus('submitted');

      // ✅ 2. Persist OFF-CHAIN using SECURE AUTH FETCH
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/donations`,
        {
          method: 'POST',
          body: JSON.stringify({
            donor_public_key: walletPublicKey,
            amount,
            ngo_id: ngoId,
            project_id: projectId ?? undefined,
            donor_location: selectedLatLng,
            chain_create_tx: onchain.txHash,
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Backend rejected donation');
      }

      setStatus('confirmed');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'tx-error');
      setStatus('error');
    }
  };

  // ✅ NGO selection from external UI
  useEffect(() => {
    function handler(e: Event) {
      const detail: any = (e as CustomEvent).detail;
      if (detail && typeof detail.id === 'number') {
        setNgoId(detail.id);
        if (detail.project_id) setProjectId(detail.project_id);
      }
    }
    window.addEventListener('select-ngo', handler as any);
    return () => window.removeEventListener('select-ngo', handler as any);
  }, []);

  // ✅ Load NGOs on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingNgos(true);
        const data = await listNGOs();
        setNgos(data);
        if (data.length > 0) setNgoId(data[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingNgos(false);
      }
    })();
  }, []);

  const ready = Boolean(ngoId && amount > 0 && selectedLatLng);

  return (
    <div className="stack">
      <div className="section-header">
        <div className="section-icon">💝</div>
        <div>
          <h3 className="section-title">Make a Donation</h3>
          <p className="section-subtitle">Support verified NGOs with transparent blockchain donations</p>
        </div>
      </div>

      <div className="donation-form">
        {/* ✅ NGO SELECT */}
        <div className="form-group">
          <label>
            <span className="label-icon">🏢</span>
            <span>Select NGO Organization</span>
          </label>

          <select
            className="form-control"
            value={ngoId || ''}
            onChange={(e) => setNgoId(parseInt(e.target.value))}
            disabled={loadingNgos}
          >
            {loadingNgos && <option>Loading NGOs...</option>}
            {!loadingNgos &&
              ngos.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
          </select>
        </div>

        {/* ✅ AMOUNT */}
        <div className="form-group">
          <label>
            <span className="label-icon">💰</span>
            <span>Donation Amount</span>
          </label>

          <input
            className="form-control"
            type="number"
            min={1}
            step={0.1}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
          />
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
        <button className="donate-btn" onClick={submit} disabled={!ready || status !== 'idle'}>
          {status === 'idle'
            ? 'Make Donation'
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
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
