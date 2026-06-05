"use client";
export const dynamic = 'force-dynamic';
import nextDynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Tabs from '../components/Tabs';
import DonationFlow from '../components/DonationFlow';
import NGOSection from '../components/NGOSection';
import ProjectSection from '../components/ProjectSection';
import EvidenceUpload from '../components/EvidenceUpload';
import NGODashboard from '../components/NGODashboard';
import TransactionHistory from '../components/TransactionHistory';
import SidebarHeader from '../components/SidebarHeader';
import WalletStatus from '../components/WalletStatus';
import Chatbot from '../components/Chatbot';
import { getRole } from '../lib/auth';
import ErrorBoundary from '../components/ErrorBoundary';

const Map = nextDynamic(() => import('../components/Map'), { ssr: false });

function getClientContractConfig() {
  return {
    donation:
      process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT ||
      process.env.NEXT_PUBLIC_DONATION_REGISTRY_CONTRACT_ID,
    ngo: process.env.NEXT_PUBLIC_NGO_VERIFICATION_CONTRACT_ID,
    escrow: process.env.NEXT_PUBLIC_IMPACT_ESCROW_CONTRACT_ID,
    token:
      process.env.NEXT_PUBLIC_TOKEN_MANAGER_CONTRACT_ID ||
      process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ||
      process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID,
  };
}

export default function Home() {
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(true);
  useEffect(() => { setRole(getRole()); }, []);

  const donateTab = (
    <ErrorBoundary label="Donation flow could not load">
      <DonationFlow selectedLatLng={selectedLatLng} />
    </ErrorBoundary>
  );
  const ngosTab = (<NGOSection />);
  const ngoDashboardTab = (<NGODashboard />);
  const historyTab = (<TransactionHistory />);
  const contractsTab = (<ContractsPanel />);

  return (
    <div className={`app-container layout ${mapOpen ? '' : 'map-collapsed'}`}>
      <aside className="sidebar-new">
        <SidebarHeader />
        <ErrorBoundary label="Wallet connection could not load">
          <WalletStatus />
        </ErrorBoundary>
        <Tabs
          tabs={
            role === 'ngo' 
              ? [
                  { id: 'dashboard', title: '📊 Dashboard', content: ngoDashboardTab },
                  { id: 'ngos', title: 'NGOs', content: ngosTab },
                  { id: 'history', title: '📜 History', content: historyTab },
                  { id: 'contracts', title: 'Contracts', content: contractsTab },
                ]
              : [
                  { id: 'donate', title: 'Donate', content: donateTab },
                  { id: 'ngos', title: 'NGOs', content: ngosTab },
                  { id: 'history', title: '📜 History', content: historyTab },
                  { id: 'contracts', title: 'Contracts', content: contractsTab },
                ]
          }
        />
      </aside>
      <main className="map-container" style={{ flex: 1 }}>
        <ErrorBoundary label="Map could not load">
          <Map onSelect={(latlng: { lat: number; lng: number }) => setSelectedLatLng(latlng)} />
        </ErrorBoundary>
        <div className="map-overlay">
          <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight:600 }}>Legend</h4>
          <div className="legend-item"><div className="legend-color" style={{ background:'#00C851' }}></div><span>Donations</span></div>
          <div className="legend-item"><div className="legend-color" style={{ background:'#0066FF' }}></div><span>NGO Projects</span></div>
          <div className="legend-item"><div className="legend-color" style={{ background:'#94a3b8' }}></div><span>Verified</span></div>
        </div>
      </main>
      <div className="mobile-toggle-bar">
        <div style={{ fontSize:12, color:'var(--muted)' }}>Map</div>
        <button className="btn" onClick={() => setMapOpen(v => !v)}>{mapOpen ? 'Hide' : 'Show'} Map</button>
      </div>
      <Chatbot />
    </div>
  );
}

function ContractsStatus() {
  const { donation: d, ngo: n, escrow: i, token: t } = getClientContractConfig();
  const ok = d && n && i && t;
  return (
    <div style={{ fontSize: 12, padding: 8, border: '1px dashed #ddd' }}>
      <div style={{ fontWeight: 600 }}>Contracts</div>
      <div>Donation: {d ? 'set' : 'missing'}</div>
      <div>NGO: {n ? 'set' : 'missing'}</div>
      <div>Escrow: {i ? 'set' : 'missing'}</div>
      <div>Token: {t ? 'set' : 'missing'}</div>
      {!ok && <div style={{ color: 'orange' }}>Run scripts/deploy_contracts.sh</div>}
    </div>
  );
}

function ContractsPanel() {
  const { donation: d, ngo: n, escrow: i, token: t } = getClientContractConfig();
  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Smart Contracts</h3>
      <div className="contracts-grid">
        <div className="contract-card">
          <div style={{ fontWeight:600, marginBottom:8 }}>Donation Contract</div>
          <div className={`contract-status ${d ? 'status-deployed':'status-missing'}`}>{d?'Deployed':'Missing'}</div>
          {d && <div className="contract-actions"><button className="btn-small" onClick={() => navigator.clipboard.writeText(d)}>Copy ID</button></div>}
        </div>
        <div className="contract-card">
          <div style={{ fontWeight:600, marginBottom:8 }}>NGO Registry</div>
          <div className={`contract-status ${n ? 'status-deployed':'status-missing'}`}>{n?'Deployed':'Missing'}</div>
          {n && <div className="contract-actions"><button className="btn-small" onClick={() => navigator.clipboard.writeText(n)}>Copy ID</button></div>}
        </div>
        <div className="contract-card">
          <div style={{ fontWeight:600, marginBottom:8 }}>Token Contract</div>
          <div className={`contract-status ${t ? 'status-deployed':'status-missing'}`}>{t?'Deployed':'Missing'}</div>
          {t && <div className="contract-actions"><button className="btn-small" onClick={() => navigator.clipboard.writeText(t)}>Copy ID</button></div>}
        </div>
        <div className="contract-card">
          <div style={{ fontWeight:600, marginBottom:8 }}>Escrow Contract</div>
          <div className={`contract-status ${i ? 'status-deployed':'status-missing'}`}>{i?'Deployed':'Missing'}</div>
          {i && <div className="contract-actions"><button className="btn-small" onClick={() => navigator.clipboard.writeText(i)}>Copy ID</button></div>}
        </div>
      </div>
      <button className="deploy-btn" onClick={() => alert('Run scripts/deploy_contracts.sh')}>Deploy All Contracts</button>
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gray-600)' }}>
        Run: ./scripts/deploy_contracts.sh
      </div>
    </div>
  );
}
