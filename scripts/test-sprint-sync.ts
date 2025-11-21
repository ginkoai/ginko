/**
 * Test sprint sync end-to-end (TASK-2)
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
const BEARER_TOKEN = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
const GRAPH_ID = process.env.GINKO_GRAPH_ID || 'gin_1762125961056_dg4bsd';
// Navigate to project root (scripts is at root level)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SPRINT_PATH = path.join(PROJECT_ROOT, 'docs/sprints/SPRINT-2025-12-graph-infrastructure.md');

async function testSprintSync() {
  console.log('Testing sprint sync endpoint...');
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Graph ID: ${GRAPH_ID}`);
  console.log(`  Token: ${BEARER_TOKEN.substring(0, 8)}...`);

  // Read sprint content
  if (!fs.existsSync(SPRINT_PATH)) {
    throw new Error(`Sprint file not found: ${SPRINT_PATH}`);
  }

  const sprintContent = fs.readFileSync(SPRINT_PATH, 'utf-8');
  console.log(`  Sprint size: ${sprintContent.length} bytes\n`);

  // Make API request
  console.log('Making POST request to /api/v1/sprint/sync...');
  const response = await fetch(`${API_URL}/api/v1/sprint/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      graphId: GRAPH_ID,
      sprintContent,
    }),
  });

  console.log(`Response status: ${response.status} ${response.statusText}\n`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${errorText}`);
  }

  const result = await response.json();
  console.log('✓ Sprint sync successful!\n');
  console.log('Result:', JSON.stringify(result, null, 2));

  // Test GET /api/v1/sprint/active
  console.log('\nTesting GET /api/v1/sprint/active...');
  const activeResponse = await fetch(
    `${API_URL}/api/v1/sprint/active?graphId=${GRAPH_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    }
  );

  console.log(`Response status: ${activeResponse.status} ${activeResponse.statusText}\n`);

  if (!activeResponse.ok) {
    const errorText = await activeResponse.text();
    throw new Error(`Active sprint request failed: ${errorText}`);
  }

  const activeResult = await activeResponse.json();
  console.log('✓ Active sprint retrieved!\n');
  console.log('Active Sprint:', JSON.stringify(activeResult, null, 2));

  return { sync: result, active: activeResult };
}

testSprintSync()
  .then(() => {
    console.log('\n✓ All tests complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
