/**
 * Shared configuration for scripts
 *
 * Loads credentials from environment variables or .env file.
 * Usage: import { config } from './lib/config';
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env file if it exists
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

export const config = {
  // Neo4j Configuration
  neo4j: {
    uri: process.env.NEO4J_URI || 'neo4j+s://b475ee2d.databases.neo4j.io',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
  },

  // Ginko Graph Configuration
  graph: {
    id: process.env.GINKO_GRAPH_ID || 'gin_1762125961056_dg4bsd',
    apiUrl: process.env.GINKO_API_URL || 'https://app.ginkoai.com',
  },

  // Ginko API Configuration
  api: {
    bearerToken: process.env.GINKO_BEARER_TOKEN || '',
    baseUrl: process.env.GINKO_API_URL || 'https://app.ginkoai.com',
  },
};

// Validate required config
export function validateConfig() {
  const missing: string[] = [];

  if (!config.neo4j.password) missing.push('NEO4J_PASSWORD');
  if (!config.api.bearerToken) missing.push('GINKO_BEARER_TOKEN');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nMake sure .env file exists with these values, or set them in your environment.');
    process.exit(1);
  }
}

export default config;
