import { Resend } from 'resend';

const OTP_FROM = process.env.RESEND_FROM || 'GeoLedger <onboarding@resend.dev>';

export async function sendOtpEmail(to: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: OTP_FROM,
    to,
    subject: `${code} - your GeoLedger login code`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#1a1a1a">Your login code</h2>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;padding:24px 0">
          ${code}
        </div>
        <p style="color:#666">Expires in 10 minutes. If you didn't request this, ignore it.</p>
        <p style="color:#999;font-size:12px">GeoLedger - Transparent donations on Stellar</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Email failed: ${error.message}`);
  }
}
