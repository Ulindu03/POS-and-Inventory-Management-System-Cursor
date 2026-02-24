/**
 * General email sender — uses Resend HTTP API exclusively.
 * Called by notify.service for sale receipts and other transactional emails.
 */
import { sendViaResend, isResendConfigured } from './resendProvider';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getFromHeader() {
  const fromName = process.env.MAIL_FROM_NAME || 'VoltZone POS';
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  return `${fromName} <${fromEmail}>`;
}

export async function sendEmailRaw(p: SendParams) {
  const provider = process.env.EMAIL_PROVIDER || 'log';
  console.log('[emailProvider] provider:', provider, 'Resend configured:', isResendConfigured());

  // If provider is not set to an active mode, just log
  if (provider !== 'resend' && provider !== 'smtp') {
    console.log('[emailProvider:log] Would send email:', p.subject, 'to:', p.to);
    return;
  }

  // Send via Resend
  if (!isResendConfigured()) {
    console.error('[emailProvider] Resend not configured — set RESEND_API_KEY');
    return;
  }

  const result = await sendViaResend({
    from: getFromHeader(),
    to: p.to,
    subject: p.subject,
    html: p.html,
    text: p.text,
  });

  if (result) {
    if (result.ok) {
      console.log('[emailProvider] Sent via Resend:', result.id);
      return;
    }
    console.error('[emailProvider] Resend failed:', result.error);
  }
}


