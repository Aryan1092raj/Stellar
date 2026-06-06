"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Heart,
  Users,
  Compass,
} from "lucide-react";
import { listNGOs } from "@/lib/api/client";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [featuredNgos, setFeaturedNgos] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const list = await listNGOs();
        // Take first 3 verified NGOs or fall back to mock
        setFeaturedNgos(list.slice(0, 3));
      } catch (err) {
        console.error("Failed to load featured NGOs:", err);
      }
    }
    loadFeatured();
  }, []);

  const fallbackNgos = [
    {
      id: "ngo-1",
      name: "Global Green Canopy",
      sector: "Environment",
      description: "Reforesting critical equatorial biomes and uploading transparent satellite verification data.",
      verified: true,
    },
    {
      id: "ngo-2",
      name: "Horizon Wells",
      sector: "Clean Water",
      description: "Providing solar-powered water pumps to arid regions with automated flow sensor logging on-chain.",
      verified: true,
    },
    {
      id: "ngo-3",
      name: "Soroban Learn Labs",
      sector: "Education",
      description: "Delivering open-source digital literacy curriculums with micro-incentives paid directly to learners.",
      verified: true,
    },
  ];

  const displayNgos = featuredNgos.length > 0 ? featuredNgos : fallbackNgos;

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* 1. Hero Band (Dark) */}
      <div className="bg-surface-dark text-on-dark flex flex-col w-full relative overflow-hidden pb-12">
        <Navbar onDark={true} />
        
        <div className="max-w-[1200px] mx-auto px-6 pt-16 md:pt-28 pb-20 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 flex flex-col space-y-6">
            <Badge variant="outline-on-dark" className="w-fit text-[11px] font-bold tracking-widest uppercase">
              Decentralized Trust Protocol
            </Badge>
            <h1 className="font-sans text-[44px] md:text-[80px] font-normal tracking-mega leading-[1.0] text-on-dark">
              Transparent Giving on Stellar
            </h1>
            <p className="text-[16px] md:text-[18px] text-on-dark-soft font-normal max-w-lg leading-relaxed">
              GeoLedger connects donors directly with verified NGOs, leveraging Soroban smart contracts and real-time geolocated impact proof to eliminate intermediaries.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/login/donor">
                <Button size="cta" className="bg-primary hover:bg-primary-active text-on-primary">
                  Start Donating
                </Button>
              </Link>
              <Link href="/login/ngo">
                <Button size="cta" variant="outline-on-dark">
                  Register as NGO
                </Button>
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 relative flex justify-center items-center h-[300px] md:h-[450px]">
            {/* Visual layered mockup stack */}
            <div className="absolute top-8 left-4 w-72 bg-surface-dark-elevated border border-neutral-800 rounded-xl p-6 shadow-2xl transform -rotate-6 transition-all hover:rotate-0 hover:z-10 duration-300">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-on-dark-soft tracking-wider uppercase">Live Activity</span>
                <span className="h-2 w-2 rounded-full bg-semantic-up animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Campaign funded</span>
                  <span className="font-mono text-primary font-bold">1,250 XLM</span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[75%]" />
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">Tx hash: GAH3...9K21</div>
              </div>
            </div>

            <div className="absolute bottom-8 right-4 w-72 bg-canvas border border-hairline rounded-xl p-6 shadow-2xl transform rotate-6 transition-all hover:rotate-0 hover:z-10 duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Impact Verified</h4>
                  <p className="text-[11px] text-muted">Geolocated Proof</p>
                </div>
              </div>
              <p className="text-xs text-body">
                "Water pump operational in East Province. Flow rate verified on-chain."
              </p>
              <div className="mt-4 flex justify-between items-center text-[10px] font-semibold text-primary">
                <span>View IPFS Evidence</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stats Band (Light) */}
      <div className="bg-canvas py-16 md:py-24 border-b border-hairline w-full px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center space-y-1.5">
            <span className="font-mono text-[36px] md:text-[52px] font-medium text-ink tracking-tight">
              120K+
            </span>
            <span className="text-[13px] md:text-[14px] text-body uppercase tracking-wider font-semibold">
              XLM Transacted
            </span>
          </div>
          <div className="flex flex-col items-center text-center space-y-1.5">
            <span className="font-mono text-[36px] md:text-[52px] font-medium text-ink tracking-tight">
              45+
            </span>
            <span className="text-[13px] md:text-[14px] text-body uppercase tracking-wider font-semibold">
              Verified NGOs
            </span>
          </div>
          <div className="flex flex-col items-center text-center space-y-1.5">
            <span className="font-mono text-[36px] md:text-[52px] font-medium text-ink tracking-tight">
              1,850
            </span>
            <span className="text-[13px] md:text-[14px] text-body uppercase tracking-wider font-semibold">
              Proof Records
            </span>
          </div>
          <div className="flex flex-col items-center text-center space-y-1.5">
            <span className="font-mono text-[36px] md:text-[52px] font-medium text-ink tracking-tight text-primary">
              100%
            </span>
            <span className="text-[13px] md:text-[14px] text-body uppercase tracking-wider font-semibold">
              On-Chain Auditable
            </span>
          </div>
        </div>
      </div>

      {/* 3. How It Works (Light) */}
      <div id="how-it-works" className="bg-surface-soft py-20 md:py-32 border-b border-hairline w-full px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <Badge variant="primary" className="text-[11px] font-bold tracking-widest uppercase">
              Step-by-Step
            </Badge>
            <h2 className="font-sans text-[32px] md:text-[52px] font-normal tracking-lg leading-[1.1] text-ink">
              Trust Built on Public Ledger
            </h2>
            <p className="text-[15px] md:text-[16px] text-body leading-relaxed">
              Every step from onboarding to project milestone verification is cryptographically secured.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-soft duration-300">
              <CardContent className="pt-8 flex flex-col space-y-4">
                <div className="p-3 bg-primary/10 text-primary w-fit rounded-xl">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-[18px] font-semibold text-ink">1. Discover verified NGOs</h3>
                <p className="text-body text-[14px] leading-relaxed">
                  Browse a curated directory of NGOs validated through our verification smart contract on the Stellar testnet.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-soft duration-300">
              <CardContent className="pt-8 flex flex-col space-y-4">
                <div className="p-3 bg-primary/10 text-primary w-fit rounded-xl">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-[18px] font-semibold text-ink">2. Micro-donations in XLM</h3>
                <p className="text-body text-[14px] leading-relaxed">
                  Connect Freighter or Albedo wallet to execute Soroban smart contract operations with minimal friction.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-soft duration-300">
              <CardContent className="pt-8 flex flex-col space-y-4">
                <div className="p-3 bg-primary/10 text-primary w-fit rounded-xl">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="text-[18px] font-semibold text-ink">3. Geolocated Impact Tracking</h3>
                <p className="text-body text-[14px] leading-relaxed">
                  NGOs upload cryptographic evidence linked directly to exact GPS coordinates on our interactive dashboard map.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 4. Featured NGOs (Light Canvas) */}
      <div id="ngos" className="bg-canvas py-20 md:py-32 border-b border-hairline w-full px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0">
            <div className="space-y-4">
              <Badge variant="primary" className="text-[11px] font-bold tracking-widest uppercase">
                Transparency Champions
              </Badge>
              <h2 className="font-sans text-[32px] md:text-[52px] font-normal tracking-lg leading-[1.1] text-ink">
                Featured Verified Partners
              </h2>
            </div>
            <Link href="/login/donor">
              <Button variant="outline" className="flex items-center space-x-2">
                <span>View Directory</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {displayNgos.map((ngo, index) => (
              <Card key={ngo.id || index} className="flex flex-col justify-between hover:shadow-soft duration-300">
                <CardContent className="pt-8 flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge variant="default" className="bg-surface-strong text-ink rounded-pill">
                      {ngo.sector || "General"}
                    </Badge>
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <h3 className="text-[18px] font-semibold text-ink">{ngo.name}</h3>
                  <p className="text-body text-[14px] leading-relaxed">
                    {ngo.description || "Active community NGO raising funds on Stellar for transparency."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Technology Band (Dark) */}
      <div id="tech" className="bg-surface-dark text-on-dark py-20 md:py-32 w-full px-6">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6 flex flex-col space-y-6">
            <Badge variant="outline-on-dark" className="w-fit text-[11px] font-bold tracking-widest uppercase">
              Architecture Stack
            </Badge>
            <h2 className="font-sans text-[32px] md:text-[52px] font-normal tracking-lg leading-[1.1]">
              Engineered for Auditability
            </h2>
            <p className="text-on-dark-soft text-[16px] leading-relaxed">
              We leverage modern blockchain primitives to verify operations rather than trusting financial reports.
            </p>
            <ul className="space-y-4 text-on-dark-soft text-[14px]">
              <li className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <span><strong>Stellar Network Ledger</strong> — low fees, fast settlement</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <span><strong>Soroban Contracts</strong> — sandboxed WASM runtime for program logic</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <span><strong>IPFS Evidence Links</strong> — immutable storage for proof reports</span>
              </li>
            </ul>
          </div>
          <div className="md:col-span-6 bg-surface-dark-elevated border border-neutral-800 p-8 rounded-xl space-y-4">
            <div className="flex items-center space-x-2 text-[13px] font-mono text-primary font-bold">
              <span>soroban_contract.rs</span>
            </div>
            <pre className="text-xs text-on-dark-soft font-mono overflow-x-auto bg-black/30 p-4 rounded-lg leading-relaxed">
{`#[contractimpl]
impl GeoLedger {
    pub fn donate(env: Env, donor: Address, ngo: Address, amount: i128) {
        donor.require_auth();
        // Transfer native XLM token
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&donor, &ngo, &amount);
        
        // Log event for geolocation mapping
        env.events().publish((symbol_short!("donated"), donor, ngo), amount);
    }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* 6. CTA Pre-footer Band (Dark) */}
      <div className="bg-surface-dark text-on-dark border-t border-neutral-800 py-20 md:py-32 w-full px-6 text-center">
        <div className="max-w-[800px] mx-auto flex flex-col items-center space-y-8">
          <Badge variant="outline-on-dark" className="text-[11px] font-bold tracking-widest uppercase">
            Get Started
          </Badge>
          <h2 className="font-sans text-[36px] md:text-[52px] font-normal tracking-md leading-[1.0]">
            Take Control of Your Giving
          </h2>
          <p className="text-[16px] text-on-dark-soft max-w-md leading-relaxed">
            Create an account in seconds to begin funding verified geolocated micro-projects globally.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login/donor">
              <Button size="cta" className="bg-primary hover:bg-primary-active text-on-primary">
                Join as Donor
              </Button>
            </Link>
            <Link href="/login/ngo">
              <Button size="cta" variant="outline-on-dark">
                Join as NGO
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 7. Footer */}
      <Footer />
    </div>
  );
}
