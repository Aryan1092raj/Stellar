import "./globals.css";
import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/contexts/WalletContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "GeoLedger — Transparent Giving on Stellar",
  description: "GeoLedger is an institutional-grade transparent donation platform built on the Stellar blockchain, providing real-time geolocated impact tracking and proof of work.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-canvas text-ink min-h-screen flex flex-col">
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
