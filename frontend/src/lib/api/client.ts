import { authFetch } from '../auth';
import { apiRoutes } from './routes';
import type {
  ChatMessage,
  ChatResponse,
  ConfirmDonationInput,
  CreateProjectInput,
  Donation,
  DonationInput,
  EvidenceConfirmInput,
  EvidenceConfirmResponse,
  EvidencePrepareResponse,
  ImpactVerifyConfirmResponse,
  ImpactVerifyPrepareResponse,
  NGOItem,
  ProjectItem,
} from './types';

export type {
  ChatMessage,
  ChatResponse,
  ConfirmDonationInput,
  CreateProjectInput,
  Donation,
  DonationInput,
  EvidenceConfirmInput,
  EvidenceConfirmResponse,
  EvidencePrepareResponse,
  ImpactVerifyConfirmResponse,
  ImpactVerifyPrepareResponse,
  NGOItem,
  ProjectItem,
} from './types';

async function readJson<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || data?.message || fallbackError;
    throw new Error(message);
  }
  return data as T;
}

async function listFallbackNGOs(): Promise<NGOItem[]> {
  const res = await fetch('/data/curated-india-ngos.json');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function mergeNGOs(primary: NGOItem[], fallback: NGOItem[]) {
  const merged = new Map<string, NGOItem>();

  for (const ngo of fallback) {
    merged.set(ngo.source_id || ngo.name.toLowerCase(), ngo);
  }

  for (const ngo of primary) {
    merged.set(ngo.source_id || ngo.name.toLowerCase(), ngo);
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listNGOs(): Promise<NGOItem[]> {
  let backend: NGOItem[] = [];

  try {
    const res = await fetch(apiRoutes.ngos.list);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) backend = data;
    }
  } catch {
    // The static curated list keeps local demos usable when the backend is offline.
  }

  const fallback = await listFallbackNGOs();
  const merged = mergeNGOs(backend, fallback);
  if (merged.length > 0) return merged;
  throw new Error('ngos-list-failed');
}

export async function createNGO(input: { name: string; wallet_address: string; sector?: string }): Promise<NGOItem> {
  const res = await authFetch(apiRoutes.ngos.create, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<NGOItem>(res, 'ngos-create-failed');
}

export async function createDonation(input: DonationInput): Promise<Donation> {
  const res = await authFetch(apiRoutes.donations.create, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<Donation>(res, 'donation-failed');
}

export async function confirmDonation(input: ConfirmDonationInput): Promise<Donation> {
  const res = await authFetch(apiRoutes.donations.confirm, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<Donation>(res, 'donation-confirm-failed');
}

export async function listDonations(): Promise<Donation[]> {
  const res = await authFetch(apiRoutes.donations.list);
  return readJson<Donation[]>(res, 'donations-list-failed');
}

export async function listProjects(): Promise<ProjectItem[]> {
  const res = await fetch(apiRoutes.projects.list);
  return readJson<ProjectItem[]>(res, 'projects-list-failed');
}

export async function createProject(input: CreateProjectInput): Promise<ProjectItem> {
  const res = await authFetch(apiRoutes.projects.create, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<ProjectItem>(res, 'project-create-failed');
}

export async function prepareEvidence(form: FormData): Promise<EvidencePrepareResponse> {
  const res = await authFetch(apiRoutes.evidence.prepare, {
    method: 'POST',
    body: form,
  });
  return readJson<EvidencePrepareResponse>(res, 'evidence-prepare-failed');
}

export async function confirmEvidence(input: EvidenceConfirmInput): Promise<EvidenceConfirmResponse> {
  const res = await authFetch(apiRoutes.evidence.confirm, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readJson<EvidenceConfirmResponse>(res, 'evidence-confirm-failed');
}

export async function prepareImpactVerification(donationId: number | string): Promise<ImpactVerifyPrepareResponse> {
  const res = await authFetch(apiRoutes.donations.verifyPrepare(donationId), { method: 'POST' });
  return readJson<ImpactVerifyPrepareResponse>(res, 'impact-verify-prepare-failed');
}

export async function confirmImpactVerification(
  donationId: number | string,
  txHash: string
): Promise<ImpactVerifyConfirmResponse> {
  const res = await authFetch(apiRoutes.donations.verifyConfirm(donationId), {
    method: 'POST',
    body: JSON.stringify({ txHash }),
  });
  return readJson<ImpactVerifyConfirmResponse>(res, 'impact-verify-confirm-failed');
}

export async function getChatSuggestions(): Promise<string[]> {
  const res = await fetch(apiRoutes.chat.suggestions);
  const data = await readJson<{ suggestions?: string[] }>(res, 'chat-suggestions-failed');
  return data.suggestions || [];
}

export async function sendChatMessage(message: string, conversationHistory: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(apiRoutes.chat.message, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory }),
  });
  return readJson<ChatResponse>(res, 'chat-message-failed');
}
