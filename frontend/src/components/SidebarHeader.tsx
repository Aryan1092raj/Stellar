"use client";
import React, { useEffect, useState } from "react";
import { getRole, logout } from "../lib/auth";
import Modal from "./Modal";
import AuthForm from "./AuthForm";
import AuthModal from "./AuthModal";
import { Button } from "@/components/ui/button";
import { Building, User, LogOut } from "lucide-react";

export default function SidebarHeader() {
  const [role, setRole] = useState<string | null>(null);
  const [showDonor, setShowDonor] = useState(false);
  const [showNgo, setShowNgo] = useState(false);

  useEffect(() => {
    setRole(getRole());
  }, []);

  return (
    <div className="p-4 border-b border-hairline bg-canvas">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2.5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#0052ff" strokeWidth="4" />
          </svg>
          <div>
            <h1 className="text-md font-bold text-ink leading-tight">GeoLedger</h1>
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              Stellar Trust Protocol
            </div>
          </div>
        </div>

        <div className="pt-2">
          {!role ? (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowDonor(true)} className="text-xs">
                Donor Login
              </Button>
              <Button size="sm" onClick={() => setShowNgo(true)} className="text-xs">
                NGO Login
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-surface-soft p-3 rounded-lg border border-hairline-soft">
              <div className="flex items-center space-x-2">
                {role === "donor" ? (
                  <User className="h-4 w-4 text-primary" />
                ) : (
                  <Building className="h-4 w-4 text-semantic-up" />
                )}
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted uppercase tracking-wider font-bold">Role</span>
                  <span className="text-xs font-bold text-ink capitalize">{role}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-semantic-down">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={showDonor} onClose={() => setShowDonor(false)} title="Donor Login">
        <AuthModal onClose={() => setShowDonor(false)} />
      </Modal>
      <Modal open={showNgo} onClose={() => setShowNgo(false)} title="NGO Login">
        <AuthForm role="ngo" />
      </Modal>
    </div>
  );
}
