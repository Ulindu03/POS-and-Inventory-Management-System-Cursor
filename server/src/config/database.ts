import mongoose from 'mongoose';
// Note: dotenv is loaded in server entry. Do not load here to avoid duplicate logs.

const connectDB = async () => {
  try {
    // Get connection string from .env file
    const connectionString = process.env.MONGODB_URI || '';
    
    if (!connectionString) {
      throw new Error('MongoDB connection string is missing!');
    }

    // Connect to MongoDB
    await mongoose.connect(connectionString);
    const dbName = mongoose.connection.name || (mongoose.connection as any).db?.databaseName || '(unknown)';
    console.log(`✅ MongoDB connected (db: ${dbName})`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1); // Stop the server if can't connect to database
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose ready');
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
  console.log('📴 MongoDB connection closed');
  process.exit(0);
});

export default connectDB;