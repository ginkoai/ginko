#!/usr/bin/env node

/**
 * Generate a test API key for local development
 * This creates a user and API key directly in the database
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function generateTestApiKey() {
  console.log('🔑 Generating Test API Key for Ginko');
  console.log('=====================================');
  
  // Generate API key components
  const randomBytes = crypto.randomBytes(32);
  const keySecret = randomBytes.toString('base64url');
  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const fullKey = `cmcp_sk_${environment}_${keySecret}`;
  const prefix = keySecret.substring(0, 8);
  
  // Hash for storage (would be stored in DB in real scenario)
  const keyHash = await bcrypt.hash(fullKey, 12);
  
  console.log('\n✅ Generated API Key:');
  console.log(`   ${fullKey}`);
  console.log('\n📝 Key Details:');
  console.log(`   Prefix: ${prefix}...`);
  console.log(`   Environment: ${environment}`);
  console.log(`   Hash: ${keyHash.substring(0, 20)}...`);
  
  console.log('\n🚀 To use this key:');
  console.log('1. Set environment variable:');
  console.log(`   export GINKO_API_KEY="${fullKey}"`);
  console.log('\n2. Or add to .env file:');
  console.log(`   GINKO_API_KEY=${fullKey}`);
  console.log('\n3. Test with curl:');
  console.log(`   curl -X POST http://localhost:3031/api/mcp/tools/list \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "Authorization: Bearer ${fullKey}"`);
  
  console.log('\n⚠️  Note: This is a test key for local development.');
  console.log('   In production, keys should be generated via the dashboard.');
}

generateTestApiKey().catch(console.error);