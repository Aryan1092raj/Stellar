"use client";
import { useEffect, useState } from "react";
import {
  createNotificationFromUpdate,
  DonorNotification,
  readDonorNotifications,
  saveDonorNotification,
  StoredWorkUpdate,
} from "../lib/workUpdates";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    window.addEventListener("work-update-posted", handleWorkUpdate);
    return () => window.removeEventListener("work-update-posted", handleWorkUpdate);
  }, []);

  if (!notification) return null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between shadow-soft mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex flex-col space-y-0.5">
          <strong className="text-sm font-semibold text-ink leading-tight">
            {notification.message}
          </strong>
          <span className="text-xs text-body">
            {notification.title}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setNotification(null)}
        className="h-8 w-8 text-muted hover:text-ink hover:bg-surface-strong shrink-0 rounded-full"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
