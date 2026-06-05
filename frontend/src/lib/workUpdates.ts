export type StoredWorkUpdate = {
  donation_id: number;
  ngo_id?: number | null;
  title: string;
  description: string;
  image_url?: string;
  progress_percentage: number;
  created_at: string;
};

export type DonorNotification = {
  id: string;
  donation_id: number;
  ngo_id?: number | null;
  title: string;
  message: string;
  created_at: string;
  read?: boolean;
};

const WORK_UPDATES_KEY = 'geoledger_work_updates';
const DONOR_NOTIFICATIONS_KEY = 'geoledger_donor_notifications';

function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function readStoredWorkUpdates() {
  return readJsonArray<StoredWorkUpdate>(WORK_UPDATES_KEY);
}

export function saveStoredWorkUpdate(update: StoredWorkUpdate) {
  const updates = readStoredWorkUpdates()
    .filter((item) => !(item.donation_id === update.donation_id && item.created_at === update.created_at));
  writeJsonArray(WORK_UPDATES_KEY, [update, ...updates].slice(0, 80));
}

export function latestWorkUpdateForNGO(ngoId: number) {
  return readStoredWorkUpdates()
    .filter((update) => update.ngo_id === ngoId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] || null;
}

export function readDonorNotifications() {
  return readJsonArray<DonorNotification>(DONOR_NOTIFICATIONS_KEY);
}

export function saveDonorNotification(notification: DonorNotification) {
  const notifications = readDonorNotifications().filter((item) => item.id !== notification.id);
  writeJsonArray(DONOR_NOTIFICATIONS_KEY, [notification, ...notifications].slice(0, 20));
}

export function createNotificationFromUpdate(update: StoredWorkUpdate): DonorNotification {
  return {
    id: `${update.donation_id}-${Date.parse(update.created_at)}`,
    donation_id: update.donation_id,
    ngo_id: update.ngo_id,
    title: update.title,
    message: 'An NGO you supported just posted an update - your next donation is now unlocked.',
    created_at: update.created_at,
    read: false,
  };
}
