import nodemailer from 'nodemailer';

// IMPORTANT: Do NOT snapshot env vars at import time (dotenv might load later).
// Always read them dynamically so the service works even if .env loads after imports.
function env() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'voltzone003@gmail.com',
    enableEthereal: process.env.ENABLE_ETHEREAL_FALLBACK === 'true',
  } as const;
}

let transporter: nodemailer.Transporter | null = null; // real SMTP transporter (Gmail or custom)
let etherealReady: Promise<void> | null = null; // lazily create Ethereal test account if needed
let transporterVerified = false; // track if we've verified the connection

// Build or return the current SMTP transporter.
function getTransporter() {
  if (transporter) return transporter;
  const { host, port, user, pass } = env();
  
  console.log('[email] Creating transporter with config:', {
    host: host || '(gmail service)',
    port,
    user: user ? user.substring(0, 5) + '***' : 'NOT SET',
    pass: pass ? '***set***' : 'NOT SET',
  });
  
  if (!user || !pass) {
    console.warn('[email] SMTP user or pass not configured');
    return null;
  }
  
  try {
    // Check if it's Gmail (either by service shortcut or explicit host)
    const isGmail = !host || host.includes('gmail');
    
    if (isGmail) {
      // Use Gmail service for better compatibility
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      console.log('[email] Created Gmail transporter');
    } else {
      // Generic SMTP with proper TLS settings
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: { user, pass },
        tls: {
          // Don't fail on invalid certs (some SMTP servers have self-signed)
          rejectUnauthorized: false,
        },
      });
      console.log('[email] Created custom SMTP transporter for', host);
    }
    
    // Verify transporter in background (don't block)
    if (!transporterVerified) {
      transporter.verify()
        .then(() => {
          transporterVerified = true;
          console.log('[email] SMTP connection verified successfully');
        })
        .catch((err) => {
          console.error('[email] SMTP verification failed:', err.message);
          // Don't null out transporter - let send attempts show the real error
        });
    }
  } catch (e) {
    console.error('[email] transporter creation failed', e);
    return null;
  }
  return transporter;
}

// Send a standard password reset link email.
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const t = getTransporter();
  const { from } = env();
  if (!t) {
    console.error('[email] Cannot send password reset - SMTP not configured');
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    console.log('[email] Sending password reset email to:', to);
    const info = await t.sendMail({
      from,
      to,
      subject: 'VoltZone POS - Password Reset',
      html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    });
    console.log('[email] Password reset email sent:', info.messageId);
    return { ok: true, id: info.messageId };
  } catch (err: any) {
    console.error('[email] Password reset email failed:', err.message, err.code);
    return { ok: false, error: err?.message || 'send failed' };
  }
}

// Send the login OTP to the user's email. If real SMTP is not configured and
// Ethereal fallback is enabled, we create a temporary Ethereal inbox and return a preview link.
export async function sendOtpEmail(to: string, otp: string) {
  const t = getTransporter();
  const { from, enableEthereal } = env();
  if (!t) {
    if (!enableEthereal) {
      // eslint-disable-next-line no-console
      console.warn('[email] SMTP not configured and Ethereal fallback disabled.');
      return { ok: false, error: 'SMTP not configured' };
    }
    etherealReady ??= nodemailer.createTestAccount().then(acc => {
        transporter = nodemailer.createTransport({
          host: acc.smtp.host,
            port: acc.smtp.port,
            secure: acc.smtp.secure,
            auth: { user: acc.user, pass: acc.pass },
        });
        // eslint-disable-next-line no-console
        console.log('[email] Using Ethereal test account', acc.user);
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn('[email] Ethereal account creation failed', err);
      });
    await etherealReady;
    if (!transporter) {
      console.warn('[email] SMTP not configured and Ethereal fallback failed. OTP:', otp);
      return { ok: false, error: 'SMTP not configured' };
    }
  }
  try {
    const active = (transporter || t);
    if (!active) {
      console.error('[email] No transporter available for OTP email');
      return { ok: false, error: 'no transporter available' };
    }
    console.log('[email] Sending OTP email to:', to);
    const info = await active.sendMail({
      from,
      to,
      subject: 'VoltZone POS Store Owner Login OTP',
      html: `<p>Your one-time password (OTP) is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:4px;">${otp}</p><p>This code expires in 5 minutes. If you did not request it, ignore this email.</p>`
    });
    const preview = nodemailer.getTestMessageUrl(info) || undefined;
    console.log('[email] OTP email sent successfully:', info.messageId);
    return { ok: true, id: info.messageId, preview, fallbackUsed: !t };
  } catch (err:any) {
    console.error('[email] OTP send failed:', err.message, err.code, err.response);
    return { ok: false, error: err?.message || 'send failed' };
  }
}

// Send the password reset OTP (step 1 of the new reset flow)
export async function sendResetOtpEmail(to: string, otp: string) {
  const t = getTransporter();
  const { from, enableEthereal } = env();
  if (!t) {
    if (!enableEthereal) {
      console.warn('[email] SMTP not configured and Ethereal fallback disabled. (reset OTP)');
      return { ok: false, error: 'SMTP not configured' };
    }
    etherealReady ??= nodemailer.createTestAccount().then(acc => {
        transporter = nodemailer.createTransport({
          host: acc.smtp.host,
            port: acc.smtp.port,
            secure: acc.smtp.secure,
            auth: { user: acc.user, pass: acc.pass },
        });
        console.log('[email] Using Ethereal test account', acc.user);
      }).catch(err => {
        console.warn('[email] Ethereal account creation failed', err);
      });
    await etherealReady;
    if (!transporter) {
      console.warn('[email] SMTP not configured and Ethereal fallback failed. Reset OTP:', otp);
      return { ok: false, error: 'SMTP not configured' };
    }
  }
  try {
    const active = (transporter || t);
    if (!active) return { ok: false, error: 'no transporter available' };
    const info = await active.sendMail({
      from,
      to,
      subject: 'VoltZone POS - Password Reset Code',
      html: `<p>Your password reset verification code is:</p><p style="font-size:22px;font-weight:bold;letter-spacing:4px;">${otp}</p><p>This code expires in 10 minutes.</p>`
    });
    const preview = nodemailer.getTestMessageUrl(info) || undefined;
    return { ok: true, id: info.messageId, preview, fallbackUsed: !t };
  } catch (err: any) {
    console.error('[email] reset OTP send failed', err);
    return { ok: false, error: err?.message || 'send failed' };
  }
}

// Whether real SMTP credentials are configured
export function isSmtpConfigured() {
  const { user, pass } = env();
  // Only need user and pass - host is optional (defaults to Gmail service)
  return Boolean(user && pass);
}

// Reset transporter to force re-creation (useful for config changes)
export function resetTransporter() {
  transporter = null;
  transporterVerified = false;
  console.log('[email] Transporter reset - will be re-created on next use');
}

// Verify SMTP connectivity
export async function verifySmtpConnection() {
  // Reset and recreate transporter for fresh verification
  resetTransporter();
  const t = getTransporter();
  const { host, user } = env();
  if (!t) return { ok: false, error: 'Transporter not created - check SMTP_USER and SMTP_PASS' };
  try {
    await t.verify();
    return { ok: true, host: host || 'gmail-service', user };
  } catch (err:any) {
    return { ok: false, error: err?.message || 'verify failed', code: err?.code, host: host || 'gmail-service', user };
  }
}

// Basic diagnostics to help debug SMTP configuration
export function smtpDiagnostics() {
  const { host, port, user, pass, from } = env();
  return {
    hasUser: Boolean(user),
    hasPass: Boolean(pass),
    hasHost: Boolean(host),
    usingGmailService: !host || host.includes('gmail'),
    port,
    fromMatchesUser: from ? from === user : null,
    emailFrom: from,
    transporterCreated: transporter !== null,
    transporterVerified,
  };
}
