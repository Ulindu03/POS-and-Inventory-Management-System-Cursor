/**
 * Resend HTTP email provider.
 * Uses Resend's REST API (HTTPS) instead of SMTP — works on Render free tier
 * and any host that blocks outbound SMTP ports (25/465/587).
 *
 * Set the env var  RESEND_API_KEY  to enable.
 * When not set, this module returns null and callers fall back to SMTP.
 */

import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client = new Resend(apiKey);
  console.log('[resend] Resend client initialised');
  return client;
}

export interface ResendSendParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via Resend HTTP API.
 * Returns `{ ok, id, error }`.
 * Returns `null` if Resend is not configured (so caller can fall back to SMTP).
 */
export async function sendViaResend(
  p: ResendSendParams,
): Promise<{ ok: boolean; id?: string; error?: string } | null> {
  const r = getClient();
  if (!r) return null; // not configured — caller should fall back

  try {
    // Resend only allows sending from verified domains.
    // On the free tier the only allowed sender is onboarding@resend.dev.
    // Override "from" unless the caller already uses a verified domain.
    const resendFrom = process.env.RESEND_FROM || 'VoltZone POS <onboarding@resend.dev>';

    const { data, error } = await r.emails.send({
      from: resendFrom,
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
    });

    if (error) {
      console.error('[resend] API error:', error);
      return { ok: false, error: error.message };
    }

    console.log('[resend] Email sent:', data?.id, 'to:', p.to);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error('[resend] Send failed:', err.message);
    return { ok: false, error: err?.message || 'resend send failed' };
  }
}

/** Quick check — is a Resend API key present? */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
