"use client";
import AuthForm from '../../../components/AuthForm';

export default function DonorLogin() {
  return (
    <div className="auth-split-page donor-auth-page">
      <section className="auth-hero-panel">
        <div className="auth-hero-glow" />
        <div className="auth-hero-content">
          <div className="auth-brand-mark">GeoLedger</div>
          <h1>Donate For Good</h1>
          <p>
            Send blockchain-transparent donations to verified NGOs, track every
            update, and keep a permanent Stellar record of your impact.
          </p>
          <div className="auth-stat-grid" aria-label="Donation platform stats">
            <div className="auth-floating-stat stat-one">
              <span>₹2.4M</span>
              <small>donated</small>
            </div>
            <div className="auth-floating-stat stat-two">
              <span>143</span>
              <small>NGOs supported</small>
            </div>
            <div className="auth-floating-stat stat-three">
              <span>1,920</span>
              <small>impact records</small>
            </div>
          </div>
        </div>
      </section>
      <main className="auth-form-panel">
        <AuthForm role="donor" />
      </main>
    </div>
  );
}
