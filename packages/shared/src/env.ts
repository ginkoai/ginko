import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

export function validateEnv() {
  const required = ['POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'SUPABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}