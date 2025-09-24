import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function migrate() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const res = await User.updateMany({ role: 'admin' }, { $set: { role: 'store_owner' } });
  console.log(`Migrated ${res.modifiedCount} user(s) from admin to store_owner`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
