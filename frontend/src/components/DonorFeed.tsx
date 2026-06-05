"use client";
import { useEffect, useState } from 'react';
import {
  createNotificationFromUpdate,
  DonorNotification,
  readDonorNotifications,
  saveDonorNotification,
  StoredWorkUpdate,
} from '../lib/workUpdates';

type WorkUpdateEventDetail = {
  donationId: number;
  update: StoredWorkUpdate;
};

export default function DonorFeed() {
  const [notification, setNotification] = useState<DonorNotification | null>(null);

  useEffect(() => {
    setNotification(readDonorNotifications()[0] || null);

    function handleWorkUpdate(event: Event) {
      const detail = (event as CustomEvent<WorkUpdateEventDetail>).detail;
      if (!detail?.update) return;
      const next = createNotificationFromUpdate(detail.update);
      saveDonorNotification(next);
      setNotification(next);
    }

    window.addEventListener('work-update-posted', handleWorkUpdate);
    return () => window.removeEventListener('work-update-posted', handleWorkUpdate);
  }, []);

  if (!notification) return null;

  return (
    <div className="donor-feed-banner">
      <div>
        <strong>{notification.message}</strong>
        <span>{notification.title}</span>
      </div>
      <button type="button" onClick={() => setNotification(null)} aria-label="Dismiss notification">
        Dismiss
      </button>
    </div>
  );
}
