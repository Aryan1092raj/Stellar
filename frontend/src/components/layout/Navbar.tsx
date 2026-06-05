"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu, LogOut, LayoutDashboard, Wallet, User, Globe } from "lucide-react";
import {
  connectWallet,
  hasFreighter,
  hasXBull,
  hasAlbedo,
  WalletType,
} from "@/lib/stellar/wallet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NavbarProps {
  onDark?: boolean;
}

export default function Navbar({ onDark = false }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { connected, walletInfo, balance, setWalletInfo, disconnect } = useWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    (async () => {
      const wallets: WalletType[] = [];
      if (await hasFreighter()) wallets.push("freighter");
      if (hasXBull()) wallets.push("xbull");
      if (hasAlbedo()) wallets.push("albedo");
      setAvailableWallets(wallets);
    })();
  }, []);

  const handleWalletConnect = async (type: WalletType) => {
    setConnecting(true);
    setWalletError("");
    try {
      const info = await connectWallet(type);
      setWalletInfo(info);
      setShowWalletModal(false);
    } catch (err: any) {
      setWalletError(err.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const navLinks = isAuthenticated
    ? user?.role === "ngo"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/ngo-dashboard", label: "NGO Panel" },
        ]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/donate", label: "Donate" },
          { href: "/dashboard/ngos", label: "NGOs" },
          { href: "/dashboard/history", label: "History" },
        ]
    : [
        { href: "/", label: "Home" },
        { href: "/#how-it-works", label: "How it Works" },
        { href: "/#ngos", label: "Featured NGOs" },
        { href: "/#tech", label: "Technology" },
      ];

  const themeClasses = onDark
    ? "bg-surface-dark text-on-dark border-b border-neutral-800"
    : "bg-canvas text-ink border-b border-hairline";

  const brandLogoColor = onDark ? "#ffffff" : "#0052ff";

  return (
    <header className={`h-16 ${themeClasses} sticky top-0 z-40 transition-colors w-full px-6 flex items-center justify-between`}>
      {/* Brand logo & wordmark */}
      <div className="flex items-center space-x-8">
        <Link href="/" className="flex items-center space-x-2.5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke={brandLogoColor} strokeWidth="3.5" />
            <path
              d="M8 12H16M12 8V16"
              stroke={brandLogoColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-sans font-semibold tracking-tight text-[20px] select-none">
            GeoLedger
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[14px] font-medium transition-colors hover:text-primary ${
                pathname === link.href
                  ? "text-primary"
                  : onDark
                  ? "text-on-dark-soft"
                  : "text-body"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right nav buttons */}
      <div className="hidden md:flex items-center space-x-4">
        {/* Wallet connection pill */}
        {connected && walletInfo ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={onDark ? "outline-on-dark" : "outline"}
                className="font-mono text-xs flex items-center space-x-2"
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span>{balance} XLM</span>
                <span className="text-muted-soft">|</span>
                <span>{truncateAddress(walletInfo.publicKey)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-mono text-xs text-muted">
                {walletInfo.publicKey}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => disconnect()} className="text-semantic-down">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Disconnect</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant={onDark ? "outline-on-dark" : "outline"}
            onClick={() => setShowWalletModal(true)}
            className="flex items-center space-x-2"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </Button>
        )}

        {/* User status */}
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold uppercase">
                    {user.email.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem className="text-muted truncate font-medium">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="text-semantic-down">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-3">
            <Link href="/login/donor">
              <Button variant="ghost" className={onDark ? "text-on-dark hover:bg-neutral-800" : "text-ink"}>
                Sign In
              </Button>
            </Link>
            <Link href="/login/donor">
              <Button className="bg-primary text-on-primary hover:bg-primary-active">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile nav trigger */}
      <div className="md:hidden flex items-center space-x-3">
        {connected && walletInfo && (
          <span className="font-mono text-xs text-primary font-semibold mr-1">
            {truncateAddress(walletInfo.publicKey)}
          </span>
        )}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className={onDark ? "text-on-dark" : "text-ink"}>
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] flex flex-col justify-between">
            <div className="flex flex-col space-y-6 mt-8">
              <div className="flex items-center space-x-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="#0052ff" strokeWidth="3.5" />
                </svg>
                <span className="font-sans font-bold text-lg text-ink">GeoLedger</span>
              </div>
              <Separator />
              <nav className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[16px] font-semibold text-body hover:text-primary transition-colors py-1"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex flex-col space-y-4 mb-8">
              {!connected && (
                <Button
                  className="w-full justify-center"
                  onClick={() => setShowWalletModal(true)}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 p-2 bg-surface-soft rounded-md">
                    <User className="h-5 w-5 text-muted" />
                    <span className="text-sm font-semibold truncate text-ink">{user?.email || ""}</span>
                  </div>
                  <Button variant="outline" className="w-full justify-center text-semantic-down" onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link href="/login/donor" className="w-full">
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login/donor" className="w-full">
                    <Button className="w-full justify-center">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Wallet selector modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {availableWallets.includes("freighter") ? (
              <Button
                variant="outline"
                className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
                onClick={() => handleWalletConnect("freighter")}
                disabled={connecting}
              >
                <span className="flex items-center space-x-3">
                  <span className="text-xl">🚀</span>
                  <span>Freighter Wallet</span>
                </span>
                <span className="text-xs text-muted">Detected</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink opacity-50"
                asChild
              >
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full"
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">🚀</span>
                    <span>Freighter Wallet</span>
                  </span>
                  <span className="text-xs text-primary hover:underline">Install</span>
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
              onClick={() => handleWalletConnect("xbull")}
              disabled={connecting}
            >
              <span className="flex items-center space-x-3">
                <span className="text-xl">🐂</span>
                <span>xBull Wallet</span>
              </span>
              <span className="text-xs text-muted">Web/Extension</span>
            </Button>

            <Button
              variant="outline"
              className="justify-between h-14 rounded-xl border border-hairline p-4 text-left font-sans text-md font-semibold text-ink"
              onClick={() => handleWalletConnect("albedo")}
              disabled={connecting}
            >
              <span className="flex items-center space-x-3">
                <span className="text-xl">⭐</span>
                <span>Albedo</span>
              </span>
              <span className="text-xs text-muted">Web login</span>
            </Button>
          </div>
          {walletError && (
            <div className="text-xs text-semantic-down font-semibold mt-2 text-center">
              {walletError}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
