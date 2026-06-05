"use client";
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { listNGOs, createNGO, NGOItem } from '../lib/api/client';
import NGODetailsModal from './NGODetailsModal';

const ngoSchema = z.object({ name: z.string().min(2), wallet_address: z.string().min(10), sector: z.string().optional() });

export default function NGOSection() {
  const [ngos, setNgos] = useState<NGOItem[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ name: string; wallet_address: string; sector?: string }>({ name: '', wallet_address: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState<NGOItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  async function load() {
    try { const data = await listNGOs(); setNgos(data); } catch {}
  }
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = ngoSchema.safeParse(form);
    if (!parsed.success) { setErrors(parsed.error.issues.map(i => i.message)); return; }
    setErrors([]); setLoading(true);
  try { await createNGO(parsed.data as { name: string; wallet_address: string; sector?: string }); setForm({ name: '', wallet_address: '' }); load(); }
    catch { setErrors(['failed']); }
    finally { setLoading(false); }
  }

  function emitNGOSelection(ngo: NGOItem) {
    setSelectedNGO(ngo);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('select-ngo', {
        detail: {
          id: ngo.id,
          name: ngo.name,
          sector: ngo.sector ?? null,
          wallet_address: ngo.wallet_address,
        },
      }));
    }
  }

  function openNGODetails(ngo: NGOItem) {
    setSelectedNGO(ngo);
    setShowDetailsModal(true);
  }

  const filtered = ngos.filter(n => n.name.toLowerCase().includes(query.toLowerCase()) || (n.sector||'').toLowerCase().includes(query.toLowerCase()));
  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, NGOItem[]>>((acc, ngo) => {
      const sector = ngo.sector || 'Other';
      acc[sector] = acc[sector] || [];
      acc[sector].push(ngo);
      return acc;
    }, {});
  }, [filtered]);

  return <div className="stack">
    <h3>Verified NGOs</h3>
    <input className="search-input" placeholder="Search by name or sector" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="select-wrapper">
      <select
        className="form-control"
        value={selectedNGO?.id ?? ''}
        onChange={(e) => {
          const ngo = ngos.find((n) => n.id === Number(e.target.value));
          if (ngo) emitNGOSelection(ngo);
        }}
      >
        <option value="">Choose an NGO</option>
        {Object.entries(grouped).map(([sector, items]) => (
          <optgroup key={sector} label={sector}>
            {items.map((ngo) => (
              <option key={ngo.id} value={ngo.id}>
                {ngo.name} - {ngo.sector || 'Other'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
    {filtered.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No NGOs match your search.</div>}
    {selectedNGO && (
      <div className="ngo-card">
        <div className="ngo-card-header">
          <div className="ngo-name">{selectedNGO.name}</div>
          <button
            className="view-details-btn"
            onClick={() => openNGODetails(selectedNGO)}
            title="View donations and updates"
          >
            View
          </button>
        </div>
        {selectedNGO.sector && <div className="ngo-sector">{selectedNGO.sector}</div>}
        <div className="ngo-impact" title={selectedNGO.wallet_address}>
          {selectedNGO.wallet_address.slice(0,6)}...{selectedNGO.wallet_address.slice(-6)}
        </div>
        <div style={{ marginTop:8 }}>
          <span className={`badge ${selectedNGO.verification_status==='verified' ? 'verified':'pending'}`}>{selectedNGO.verification_status}</span>
        </div>
      </div>
    )}
    <div id="ngo-registration" style={{ marginTop: 8, padding: 12, background: 'var(--gray-100)', borderRadius: 8 }}>
      <h4 style={{ marginBottom: 8 }}>NGO Registration</h4>
      <form onSubmit={submit} className="stack">
        <input className="form-control" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input className="form-control" placeholder="Wallet Address" value={form.wallet_address} onChange={e => setForm(f => ({ ...f, wallet_address: e.target.value }))} />
        <input className="form-control" placeholder="Sector (optional)" value={form.sector || ''} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
        <button className="connect-btn" disabled={loading} type="submit">Register NGO</button>
      </form>
      {errors.length > 0 && <div style={{ color: 'crimson', fontSize: 12, marginTop: 6 }}>{errors.join(', ')}</div>}
    </div>
    
    <NGODetailsModal 
      ngo={selectedNGO} 
      open={showDetailsModal} 
      onClose={() => setShowDetailsModal(false)} 
    />
  </div>;
}
