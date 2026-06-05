export interface DonationInput {
  donor_public_key: string;
  amount: number;
  ngo_id: number;
  project_id?: number;
  donor_location: { lat: number; lng: number };
}

export interface Donation {
  id: number;
  donor_public_key: string;
  amount: number;
  ngo_id: number;
  project_id?: number | null;
  donor_lat: number;
  donor_lng: number;
  recipient_lat?: number | null;
  recipient_lng?: number | null;
  status: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

// NGO Types & API
export interface NGOItem {
  id: number;
  name: string;
  wallet_address: string;
  verification_status: 'pending' | 'verified' | 'rejected' | string;
  sector?: string | null;
  source?: string | null;
  source_id?: string | null;
  email?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  registration_number?: string | null;
  type_of_ngo?: string | null;
}

async function listFallbackNGOs(): Promise<NGOItem[]> {
  const res = await fetch('/data/curated-india-ngos.json');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function listNGOs(): Promise<NGOItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/ngos`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // The static curated list keeps local demos usable when the backend is offline.
  }

  const fallback = await listFallbackNGOs();
  if (fallback.length > 0) return fallback;
  throw new Error('ngos-list-failed');
}

export async function createNGO(input: { name: string; wallet_address: string; sector?: string }): Promise<NGOItem> {
  const res = await fetch(`${API_BASE}/api/ngos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getToken() ? `Bearer ${getToken()}` : '',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('ngos-create-failed');
  return res.json();
}

export async function createDonation(input: DonationInput): Promise<Donation> {
  const res = await fetch(`${API_BASE}/api/donations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: getToken() ? `Bearer ${getToken()}` : '' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('donation-failed');
  return res.json();
}

export async function listDonations(): Promise<Donation[]> {
  const res = await fetch(`${API_BASE}/api/donations`, {
    headers: { Authorization: getToken() ? `Bearer ${getToken()}` : '' },
  });
  if (!res.ok) throw new Error('list-failed');
  return res.json();
}
