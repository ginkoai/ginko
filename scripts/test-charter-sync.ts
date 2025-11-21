/**
 * Test charter sync endpoint end-to-end
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
const BEARER_TOKEN = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
const GRAPH_ID = process.env.GINKO_GRAPH_ID || 'gin_1762125961056_dg4bsd';
const CHARTER_PATH = path.join(process.cwd(), 'docs/PROJECT-CHARTER.md');

async function testCharterSync() {
  console.log('Testing charter sync endpoint...');
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Graph ID: ${GRAPH_ID}`);
  console.log(`  Token: ${BEARER_TOKEN.substring(0, 8)}...`);

  // Read charter content
  if (!fs.existsSync(CHARTER_PATH)) {
    throw new Error(`Charter file not found: ${CHARTER_PATH}`);
  }

  const charterContent = fs.readFileSync(CHARTER_PATH, 'utf-8');
  console.log(`  Charter size: ${charterContent.length} bytes\n`);

  // Make API request
  console.log('Making POST request to /api/v1/charter/sync...');
  const response = await fetch(`${API_URL}/api/v1/charter/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      graphId: GRAPH_ID,
      charterContent,
    }),
  });

  console.log(`Response status: ${response.status} ${response.statusText}\n`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${errorText}`);
  }

  const result = await response.json();
  console.log('✓ Charter sync successful!\n');
  console.log('Result:', JSON.stringify(result, null, 2));

  return result;
}

testCharterSync()
  .then(() => {
    console.log('\n✓ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  });
