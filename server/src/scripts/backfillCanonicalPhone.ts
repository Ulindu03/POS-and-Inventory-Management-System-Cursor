import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import { Customer } from '../models/Customer.model';

// Simple re-use of normalize logic (duplicated minimal logic to avoid importing private fn)
function normalizePhone(raw?: string){
  if(!raw) return undefined;
  const digits = String(raw).replace(/\D/g,'');
  if(!digits) return undefined;
  if(digits.length === 11 && digits.startsWith('94')) return '0'+digits.slice(2);
  if(digits.length === 10 && digits.startsWith('0')) return digits;
  return digits;
}

(async () => {
  try {
    await connectDB();
    const cursor = Customer.find({ $or: [ { canonicalPhone: { $exists: false } }, { canonicalPhone: null }, { canonicalPhone: '' } ] }).cursor();
    let processed = 0; let updated = 0;
    for await (const doc of cursor) {
      processed++;
      if(doc.phone){
        const norm = normalizePhone(doc.phone);
        if(norm && doc.canonicalPhone !== norm){
          (doc as any).canonicalPhone = norm;
          await doc.save();
          updated++;
        }
      }
    }
    console.log(`Backfill complete. Processed=${processed} Updated=${updated}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch(e){
    console.error('Backfill failed', e);
    process.exit(1);
  }
})();
