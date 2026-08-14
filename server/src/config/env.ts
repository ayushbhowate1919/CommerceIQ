import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '..', '.env') });

export const environment = {
  mongoUri: process.env.MONGODB_URI,
};
