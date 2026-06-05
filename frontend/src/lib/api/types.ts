export interface DonationInput {
  donor_public_key: string;
  amount: number;
  ngo_id: number;
  project_id?: number;
  donor_location: { lat: number; lng: number };
}

export interface ConfirmDonationInput extends DonationInput {
  txHash: string;
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
  chain_create_tx?: string | null;
  chain_verify_tx?: string | null;
  evidence_url?: string | null;
  evidence_cid?: string | null;
  evidence_tx?: string | null;
  tx_confirmed?: boolean;
  created_at: string;
}

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

export interface ProjectItem {
  id: number;
  name: string;
  description?: string | null;
  ngo_id: number;
  latitude?: number | null;
  longitude?: number | null;
  target_amount?: number | null;
  sector?: string | null;
  cover_image_url?: string | null;
  deadline?: string | null;
  created_at?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  ngo_id: number;
  latitude?: number;
  longitude?: number;
  target_amount?: number;
  sector?: string;
  cover_image_url?: string;
  deadline?: string;
}

export interface EvidencePrepareResponse {
  ipfsCid: string;
  cid?: string;
  xdr: string | null;
  ipfsUrl?: string;
  timestamp?: string;
}

export interface EvidenceConfirmInput {
  donationId: number | string;
  ipfsCid: string;
  txHash: string;
}

export interface EvidenceConfirmResponse {
  ok: boolean;
  ipfsCid?: string;
  txHash?: string;
  ipfsUrl?: string;
}

export interface ImpactVerifyPrepareResponse {
  xdr: string | null;
  evidenceCid?: string;
}

export interface ImpactVerifyConfirmResponse {
  ok: boolean;
  txHash: string;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model' | string;
  content: string;
}

export interface ChatResponse {
  response?: string;
  fallbackResponse?: string;
  timestamp?: string;
}
