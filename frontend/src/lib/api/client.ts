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
}

export async function listNGOs(): Promise<NGOItem[]> {
  const res = await fetch(`${API_BASE}/api/ngos`);
  if (!res.ok) throw new Error('ngos-list-failed');
  return res.json();
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
