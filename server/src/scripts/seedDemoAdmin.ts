import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function seedDemoAdmin() {
  await mongoose.connect(MONGODB_URI);

  const username = 'admin';
  const email = 'admin@demo.com';
  const password = 'admin123';

  let user = await User.findOne({ username });
  if (!user) {
    user = new User({
      username,
      email,
      password,
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'admin',
      language: 'en',
      isActive: true,
    });
    await user.save();
    console.log('Demo admin user created.');
  } else {
    user.email = email;
    user.password = password;
    user.firstName = 'Demo';
    user.lastName = 'Admin';
    user.role = 'admin';
    user.language = 'en';
    user.isActive = true;
    await user.save();
    console.log('Demo admin user updated.');
  }

  await mongoose.disconnect();
}

seedDemoAdmin().catch((err) => {
  console.error('Error seeding demo admin:', err);
  process.exit(1);
});
