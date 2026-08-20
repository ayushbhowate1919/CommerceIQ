import mongoose from 'mongoose';
import { environment } from './env.js';

export type DatabaseStatus = 'connected' | 'disconnected';

export function getDatabaseStatus(): DatabaseStatus {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export async function connectDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!environment.mongoUri) {
    console.warn('MongoDB connection skipped: MONGODB_URI is not configured.');
    return false;
  }

  try {
    await mongoose.connect(environment.mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    console.error(`MongoDB connection failed: ${message}`);
    return false;
  }
}

mongoose.connection.on('error', (error: Error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});
