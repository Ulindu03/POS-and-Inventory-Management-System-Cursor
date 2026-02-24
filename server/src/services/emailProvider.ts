import nodemailer from 'nodemailer';
import { sendViaResend, isResendConfigured } from './resendProvider';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getFromHeader() {
  const fromName = process.env.MAIL_FROM_NAME || 'VoltZone POS';
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.EMAIL_FROM || 'no-reply@voltzone.lk';
  return `${fromName} <${fromEmail}>`;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  
  if (!user || !pass) {
    console.warn('[emailProvider] SMTP credentials not configured');
    return null;
  }
  
  try {
    // Check if it's Gmail
    const isGmail = !host || host.includes('gmail');
    
    const smtpHost = isGmail ? 'smtp.gmail.com' : host!;
    const smtpPortFinal = isGmail ? 587 : smtpPort;
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPortFinal,
      secure: smtpPortFinal === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      dnsOptions: { family: 4 },
    } as any);
    console.log('[emailProvider] Created SMTP transporter for', smtpHost, 'port', smtpPortFinal);
    return cachedTransporter;
  } catch (err) {
    console.error('[emailProvider] Failed to create transporter:', err);
    return null;
  }
}

export async function sendEmailRaw(p: SendParams) {
  const provider = process.env.EMAIL_PROVIDER || 'log';
  console.log('[emailProvider] provider:', provider, 'Resend:', isResendConfigured(), 'SMTP:', !!process.env.SMTP_USER);
  
  if (provider !== 'smtp' && provider !== 'resend') {
    console.log('[emailProvider:log] Would send email:', p.subject, 'to:', p.to);
    return;
  }
  
  // ── Try Resend first (HTTP-based, works everywhere) ──
  if (isResendConfigured()) {
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
      console.warn('[emailProvider] Resend failed:', result.error, '— falling back to SMTP');
    }
  }
  
  // ── Fallback: SMTP ──
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[emailProvider] Cannot send - no transporter available');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: getFromHeader(),
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text
    });
    console.log('[emailProvider] Email sent via SMTP:', info.messageId);
  } catch (err: any) {
    console.error('[emailProvider] SMTP send failed:', err.message, err.code);
    throw err;
  }
}


