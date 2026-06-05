"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "./Navbar";
import {
  LayoutDashboard,
  Coins,
  Building2,
  History,
  FileCode,
  ClipboardList,
} from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Redirect if not authenticated (should be handled by layout/middleware, but safe check here too)
  React.useEffect(() => {
    // If auth state is resolved and user is not logged in, redirect to login page
    // Note: useAuth parses stored user on mount.
    const stored = localStorage.getItem("geoledger-auth");
    if (!stored) {
      router.push("/login/donor");
    }
  }, [router]);

  const navItems = user?.role === "ngo"
    ? [
        {
          href: "/dashboard",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          href: "/dashboard/ngo-dashboard",
          label: "NGO Dashboard",
          icon: ClipboardList,
        },
        {
          href: "/dashboard/contracts",
          label: "Contracts Info",
          icon: FileCode,
        },
      ]
    : [
        {
          href: "/dashboard",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          href: "/dashboard/donate",
          label: "Donate",
          icon: Coins,
        },
        {
          href: "/dashboard/ngos",
          label: "Verified NGOs",
          icon: Building2,
        },
        {
          href: "/dashboard/history",
          label: "Impact History",
          icon: History,
        },
        {
          href: "/dashboard/contracts",
          label: "Contracts Info",
          icon: FileCode,
        },
      ];

  return (
    <div className="flex flex-col min-h-screen bg-surface-soft">
      {/* Shared Navbar */}
      <Navbar />

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-canvas border-r border-hairline sticky top-16 h-[calc(100vh-64px)] py-6 px-4 shrink-0">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-pill text-[14px] font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-body hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer context */}
          <div className="mt-auto p-4 bg-surface-soft rounded-xl border border-hairline-soft">
            <div className="text-xs font-semibold text-muted tracking-wide uppercase">
              Role
            </div>
            <div className="text-sm font-bold text-ink mt-0.5 capitalize">
              {user?.role || "Donor"} Account
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-canvas border-t border-hairline flex items-center justify-around z-30 px-2 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-full space-y-1 transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold tracking-tight truncate max-w-full">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
