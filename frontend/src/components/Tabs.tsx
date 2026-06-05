"use client";
import React, { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Tab = { id: string; title: string; content: ReactNode };

export default function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial || tabs[0]?.id || "");
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex border-b border-hairline overflow-x-auto whitespace-nowrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
              active === t.id
                ? "border-primary text-primary"
                : "border-transparent text-body hover:text-ink"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {tabs.map((t) => (
          <div key={t.id} className={active === t.id ? "block" : "hidden"}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
