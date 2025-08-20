import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    // Get connection string from .env file
    const connectionString = process.env.MONGODB_URI || '';
    
    if (!connectionString) {
      throw new Error('MongoDB connection string is missing!');
    }

    // Connect to MongoDB
    await mongoose.connect(connectionString);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📦 Database: voltzone_pos');
    console.log('🔗 Host: MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1); // Stop the server if can't connect to database
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected');
});

// Handle app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed through app termination');
  process.exit(0);
});

export default connectDB;