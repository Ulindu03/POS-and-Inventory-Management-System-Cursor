import nodemailer from 'nodemailer';

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const fromName = process.env.MAIL_FROM_NAME || 'VoltZone POS';
const fromEmail = process.env.MAIL_FROM_EMAIL || (process.env.EMAIL_FROM || 'no-reply@voltzone.lk');

function fromHeader() {
  return `${fromName} <${fromEmail}>`;
}

export async function sendEmailRaw(p: SendParams) {
  const provider = process.env.EMAIL_PROVIDER || 'log';
  console.log('[email:debug] provider:', provider, 'SMTP_HOST:', process.env.SMTP_HOST, 'SMTP_USER:', process.env.SMTP_USER);
  if (provider !== 'smtp') {
    console.log('[email:log]', p.subject, p.to);
    return;
  }
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transporter.sendMail({
    from: fromHeader(),
    to: p.to,
    subject: p.subject,
    html: p.html,
    text: p.text
  });
}


