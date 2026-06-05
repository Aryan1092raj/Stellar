"use client";
import Link from 'next/link';
import AuthForm from '../../../components/AuthForm';

export default function NgoLogin() {
  return (
    <div className="auth-split-page ngo-auth-page">
      <section className="auth-hero-panel">
        <div className="auth-hero-glow" />
        <div className="auth-hero-content">
          <div className="auth-brand-mark">GeoLedger NGOs</div>
          <h1>Make Impact, Build Trust</h1>
          <p>
            Manage verified blockchain donations, publish IPFS evidence, and
            show donors how each campaign turns funding into field progress.
          </p>
          <div className="auth-stat-grid" aria-label="NGO platform stats">
            <div className="auth-floating-stat stat-one">
              <span>50+</span>
              <small>verified NGOs</small>
            </div>
            <div className="auth-floating-stat stat-two">
              <span>100%</span>
              <small>on-chain trace</small>
            </div>
            <div className="auth-floating-stat stat-three">
              <span>IPFS</span>
              <small>evidence ready</small>
            </div>
          </div>
        </div>
      </section>
      <main className="auth-form-panel">
        <AuthForm role="ngo" />
        <div className="ngo-register-cta">
          <span>New organization?</span>
          <Link href="/#ngo-registration">Register your NGO</Link>
        </div>
      </main>
    </div>
  );
}
