import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function seedDemoAdmin() {
  await mongoose.connect(MONGODB_URI);

  const username = 'owner';
  const email = 'owner@demo.com';
  const password = 'owner123';

  let user = await User.findOne({ username });
  if (!user) {
    user = new User({
      username,
      email,
      password,
  firstName: 'Demo',
  lastName: 'Owner',
  role: 'store_owner',
      language: 'en',
      isActive: true,
    });
    await user.save();
  console.log('Demo store owner user created.');
  } else {
    user.email = email;
  user.password = password;
  user.firstName = 'Demo';
  user.lastName = 'Owner';
  user.role = 'store_owner';
    user.language = 'en';
    user.isActive = true;
    await user.save();
  console.log('Demo store owner user updated.');
  }

  await mongoose.disconnect();
}

seedDemoAdmin().catch((err) => {
  console.error('Error seeding demo admin:', err);
  process.exit(1);
});
