import mongoose from 'mongoose';
import logger from '../utils/cloudwatchLogger.js';

const connectDB = async () => {
  // Reuse existing connection in serverless / lambda warm instances
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const connStr = process.env.MONGODB_URI;
  
  if (!connStr || connStr.includes('user:password@cluster0.mongodb.net')) {
    logger.error('❌ [MongoDB Atlas Error]: MONGODB_URI is not set or contains placeholder credentials in environment.');
    console.error('📌 Please set your real MongoDB Atlas connection string in environment (e.g. MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.../petly)');
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    return null;
  }

  try {
    const conn = await mongoose.connect(connStr);
    logger.info(`✅ [MongoDB Atlas Connected]: Host -> ${conn.connection.host} | DB -> ${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`❌ [MongoDB Atlas Connection Failed]: ${error.message}`);
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    return null;
  }
};

export default connectDB;
