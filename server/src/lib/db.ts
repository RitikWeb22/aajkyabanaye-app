import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from '../config/env.js';

// Configure DNS to resolve MongoDB Atlas SRV records across local ISP/Windows DNS resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom dns set is disallowed
}

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose | null> {
  if (isConnected) {
    return mongoose;
  }

  if (!env.mongoUri) {
    console.warn('⚠️ MONGODB_URL is not provided in environment. Database connection skipped.');
    return null;
  }

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    isConnected = conn.connection.readyState === 1;
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
