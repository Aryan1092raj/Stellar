import React from "react";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "About",
      links: [
        { label: "Company", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
        { label: "Security", href: "#" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "NGO Directory", href: "#" },
        { label: "Campaigns", href: "#" },
        { label: "Donation Flow", href: "#" },
        { label: "Stellar Integration", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help Center", href: "#" },
        { label: "Stellar Expert", href: "https://stellar.expert", external: true },
        { label: "Soroban Docs", href: "https://soroban.stellar.org", external: true },
        { label: "Status", href: "#" },
      ],
    },
    {
      title: "Developers",
      links: [
        { label: "API Reference", href: "#" },
        { label: "Stellar Contracts", href: "#" },
        { label: "GitHub", href: "https://github.com", external: true },
        { label: "Documentation", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Cookie Policy", href: "#" },
        { label: "Disclosures", href: "#" },
      ],
    },
    {
      title: "Social",
      links: [
        { label: "Twitter / X", href: "#" },
        { label: "Discord", href: "#" },
        { label: "LinkedIn", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-canvas border-t border-hairline pt-16 pb-8 w-full px-6 md:px-12">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-6 gap-8">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col space-y-4">
            <h4 className="text-[14px] font-bold text-ink tracking-tight uppercase">
              {section.title}
            </h4>
            <ul className="flex flex-col space-y-2.5">
              {section.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-body hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[14px] text-body hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto mt-16 pt-8 border-t border-hairline-soft flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* Brand name */}
        <div className="flex items-center space-x-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#0052ff" strokeWidth="4" />
          </svg>
          <span className="font-sans font-semibold text-sm text-ink tracking-tight">
            © {currentYear} GeoLedger Platform. All rights reserved.
          </span>
        </div>

        {/* Legal disclosures */}
        <div className="text-[11px] text-muted text-center md:text-right max-w-md leading-relaxed">
          GeoLedger is a decentralized, non-custodial donation protocol built on the Stellar blockchain network.
          Digital assets and Soroban smart contract interactions involve high degree of technical risk.
        </div>
      </div>
    </footer>
  );
}
