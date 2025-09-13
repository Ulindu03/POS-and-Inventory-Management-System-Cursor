// Quick test script to verify email functionality
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing email configuration...');
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('MAIL_FROM_EMAIL:', process.env.MAIL_FROM_EMAIL);
const TEST_EMAIL = process.env.TEST_EMAIL || 'voltzone003@gmail.com';

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('❌ Email configuration missing. Please set environment variables.');
  process.exit(1);
}

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful');

    const fromName = process.env.MAIL_FROM_NAME || 'VoltZone POS';
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
    
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: TEST_EMAIL,
      subject: 'VoltZone POS - Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from VoltZone POS system.</p>',
      text: 'Test Email\n\nThis is a test email from VoltZone POS system.'
    });

    console.log('✅ Test email sent successfully:', info.messageId);
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    if (error.code === 'EAUTH') {
      console.log('Authentication failed. Check your Gmail app password.');
    }
  }
}

testEmail();
