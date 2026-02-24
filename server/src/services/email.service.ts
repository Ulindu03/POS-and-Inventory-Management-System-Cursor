/**
 * Email service — uses Resend HTTP API exclusively.
 * SMTP/nodemailer has been removed. Resend works on all hosts including
 * Render free tier which blocks outbound SMTP ports.
 */
import { sendViaResend, isResendConfigured } from './resendProvider';

function getFrom(): string {
  return process.env.EMAIL_FROM || 'onboarding@resend.dev';
}

// Send a standard password reset link email.
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = getFrom();
  const subject = 'VoltZone POS - Password Reset';
  const html = `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`;

  if (!isResendConfigured()) {
    console.warn('[email] Resend not configured — cannot send password reset');
    return { ok: false, error: 'No email provider configured (set RESEND_API_KEY)' };
  }

  console.log('[email] Sending password reset via Resend to:', to);
  const r = await sendViaResend({ from, to, subject, html });
  if (r?.ok) return { ok: true, id: r.id };
  console.warn('[email] Resend send skipped (free-tier limitation?):', r?.error?.message || r?.error);
  return { ok: false, error: r?.error || 'Resend send failed' };
}

// Send the login OTP to the user's email.
export async function sendOtpEmail(to: string, otp: string) {
  const from = getFrom();
  const subject = 'VoltZone POS Store Owner Login OTP';
  const html = `<p>Your one-time password (OTP) is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:4px;">${otp}</p><p>This code expires in 5 minutes. If you did not request it, ignore this email.</p>`;

  if (!isResendConfigured()) {
    console.warn('[email] Resend not configured — cannot send OTP');
    return { ok: false, error: 'No email provider configured (set RESEND_API_KEY)' };
  }

  console.log('[email] Sending OTP via Resend to:', to);
  const r = await sendViaResend({ from, to, subject, html });
  if (r?.ok) {
    console.log('[email] OTP sent via Resend:', r.id);
    return { ok: true, id: r.id };
  }
  console.warn('[email] Resend OTP delivery skipped (free-tier limitation?):', r?.error?.message || r?.error);
  return { ok: false, error: r?.error || 'Resend send failed' };
}

// Send the password reset OTP (step 1 of the new reset flow)
export async function sendResetOtpEmail(to: string, otp: string) {
  const from = getFrom();
  const subject = 'VoltZone POS - Password Reset Code';
  const html = `<p>Your password reset verification code is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:4px;">${otp}</p><p>This code expires in 10 minutes.</p>`;

  if (!isResendConfigured()) {
    console.warn('[email] Resend not configured — cannot send reset OTP');
    return { ok: false, error: 'No email provider configured (set RESEND_API_KEY)' };
  }

  console.log('[email] Sending reset OTP via Resend to:', to);
  const r = await sendViaResend({ from, to, subject, html });
  if (r?.ok) return { ok: true, id: r.id };
  console.warn('[email] Resend reset OTP delivery skipped (free-tier limitation?):', r?.error?.message || r?.error);
  return { ok: false, error: r?.error || 'Resend send failed' };
}

/** Whether Resend is configured (replaces old isSmtpConfigured) */
export function isEmailConfigured() {
  return isResendConfigured();
}

// Keep legacy name as alias so existing imports don't break
export const isSmtpConfigured = isEmailConfigured;

/** Diagnostics for the email provider */
export function emailDiagnostics() {
  return {
    provider: 'resend',
    configured: isResendConfigured(),
    from: getFrom(),
    apiKeySet: Boolean(process.env.RESEND_API_KEY),
  };
}
