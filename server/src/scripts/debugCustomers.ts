import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import { Customer } from '../models/Customer.model';

(async () => {
  try {
    await connectDB();
    const customers = await Customer.find({}).select('name phone canonicalPhone customerCode').limit(10);
    console.log('=== All customers in database ===');
    customers.forEach(c => {
      console.log(`${c.name} | phone: "${c.phone}" | canonical: "${c.canonicalPhone}" | code: ${c.customerCode}`);
    });
    
    // Specifically look for phone containing 772987904
    const phoneSearch = await Customer.find({ 
      $or: [
        { phone: { $regex: '772987904' } },
        { canonicalPhone: { $regex: '772987904' } }
      ]
    }).select('name phone canonicalPhone');
    
    console.log('\n=== Customers matching 772987904 ===');
    phoneSearch.forEach(c => {
      console.log(`${c.name} | phone: "${c.phone}" | canonical: "${c.canonicalPhone}"`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Debug failed', e);
    process.exit(1);
  }
})();
