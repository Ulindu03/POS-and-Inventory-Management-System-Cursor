import { Settings } from '../models/Settings.model';

async function getFlags() {
  const s = await Settings.findOne();
  return {
    email: Boolean(s?.notifications?.email?.enabled),
    sms: Boolean(s?.notifications?.sms?.enabled),
  };
}

export async function sendEmail(subject: string, to: string, text: string) {
  const { email } = await getFlags();
  if (!email) return false;
  // TODO: integrate provider (e.g., SendGrid/SES)
  console.log(`[email] to=${to} subject=${subject} text=${text}`);
  return true;
}

export async function sendSMS(to: string, text: string) {
  const { sms } = await getFlags();
  if (!sms) return false;
  // TODO: integrate provider (e.g., Twilio)
  console.log(`[sms] to=${to} text=${text}`);
  return true;
}
