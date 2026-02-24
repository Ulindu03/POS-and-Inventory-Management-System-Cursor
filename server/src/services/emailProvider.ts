import nodemailer from 'nodemailer';

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
      // Force IPv4 — Render and many hosts lack IPv6 connectivity
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
  const hasCreds = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  console.log('[emailProvider] provider:', provider, 'SMTP configured:', hasCreds, 'to:', p.to);
  
  // If provider is not explicitly 'smtp' but SMTP creds are present, auto-upgrade
  const useSmtp = provider === 'smtp' || hasCreds;
  
  if (!useSmtp) {
    console.log('[emailProvider:log] Would send email:', p.subject, 'to:', p.to);
    return;
  }
  
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[emailProvider] Cannot send - no transporter available (check SMTP_USER/SMTP_PASS)');
    throw new Error('SMTP transporter not available');
  }
  
  try {
    const info = await transporter.sendMail({
      from: getFromHeader(),
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text
    });
    console.log('[emailProvider] Email sent successfully:', info.messageId, 'to:', p.to);
  } catch (err: any) {
    console.error('[emailProvider] Send FAILED:', err.message, err.code, 'to:', p.to);
    throw err;
  }
}


