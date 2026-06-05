import React from "react";
import DashboardShell from "@/components/layout/DashboardShell";

export const metadata = {
  title: "Dashboard — GeoLedger",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
