import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  // Check customers with email
  const Customer = mongoose.connection.collection('customers');
  const custWithEmail = await Customer.findOne({ email: { $exists: true, $ne: '' } });
  console.log('=== CUSTOMER WITH EMAIL ===');
  console.log(JSON.stringify(custWithEmail, null, 2));
  
  // Check Settings notifications
  const Settings = mongoose.connection.collection('settings');
  const settings = await Settings.findOne({});
  console.log('\n=== SETTINGS NOTIFICATIONS ===');
  console.log(JSON.stringify(settings?.notifications, null, 2));
  
  // Check EMAIL_PROVIDER env
  console.log('\n=== EMAIL_PROVIDER ===');
  console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
  
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
