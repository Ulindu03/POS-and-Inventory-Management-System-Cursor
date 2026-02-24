import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

async function main() {
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  
  console.log('Testing SMTP with user:', user);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection VERIFIED - transporter is ready');
  } catch (err: any) {
    console.error('❌ SMTP VERIFY FAILED:', err.message, err.code);
    process.exit(1);
  }
  
  try {
    const info = await transporter.sendMail({
      from: `VoltZone POS <${user}>`,
      to: user, // send test email to ourselves
      subject: 'VoltZone POS - SMTP Test',
      text: 'If you see this, SMTP is working correctly.',
      html: '<h2>VoltZone SMTP Test</h2><p>If you see this, SMTP email sending is working correctly.</p>',
    });
    console.log('✅ Test email SENT:', info.messageId);
  } catch (err: any) {
    console.error('❌ Test email FAILED:', err.message, err.code);
  }
  
  process.exit(0);
}
main();
