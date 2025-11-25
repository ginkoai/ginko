/**
 * Graph Rebuild Script
 *
 * Rebuilds the Ginko knowledge graph from filesystem data after
 * Neo4j free tier instance was paused/removed.
 *
 * Usage: npx tsx scripts/rebuild-graph.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { config, validateConfig } from './lib/config';

validateConfig();

const API_BASE = `${config.api.baseUrl}/api/v1`;
const GRAPH_ID = config.graph.id;
const BEARER_TOKEN = config.api.bearerToken;

interface SyncResult {
  type: string;
  success: boolean;
  nodes?: number;
  relationships?: number;
  error?: string;
}

async function syncCharter(): Promise<SyncResult> {
  console.log('\n📜 Syncing Charter...');

  const charterPath = path.join(process.cwd(), 'docs/PROJECT-CHARTER.md');
  if (!fs.existsSync(charterPath)) {
    return { type: 'Charter', success: false, error: 'Charter file not found' };
  }

  const charterContent = fs.readFileSync(charterPath, 'utf-8');

  const response = await fetch(`${API_BASE}/charter/sync`, {
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

  if (!response.ok) {
    const error = await response.text();
    return { type: 'Charter', success: false, error };
  }

  const result = await response.json();
  console.log(`   ✓ Created ${result.nodes} nodes, ${result.relationships} relationships`);
  return { type: 'Charter', success: true, nodes: result.nodes, relationships: result.relationships };
}

async function syncSprint(sprintPath: string): Promise<SyncResult> {
  const sprintName = path.basename(sprintPath);

  if (!fs.existsSync(sprintPath)) {
    return { type: `Sprint: ${sprintName}`, success: false, error: 'File not found' };
  }

  const sprintContent = fs.readFileSync(sprintPath, 'utf-8');

  const response = await fetch(`${API_BASE}/sprint/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      graphId: GRAPH_ID,
      sprintContent,
      sprintPath,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { type: `Sprint: ${sprintName}`, success: false, error };
  }

  const result = await response.json();
  return {
    type: `Sprint: ${sprintName}`,
    success: true,
    nodes: result.nodes || result.nodesCreated,
    relationships: result.relationships || result.relationshipsCreated
  };
}

async function syncAllSprints(): Promise<SyncResult[]> {
  console.log('\n🏃 Syncing Sprints...');

  const sprintsDir = path.join(process.cwd(), 'docs/sprints');
  if (!fs.existsSync(sprintsDir)) {
    return [{ type: 'Sprints', success: false, error: 'Sprints directory not found' }];
  }

  const sprintFiles = fs.readdirSync(sprintsDir)
    .filter(f => f.endsWith('.md') && f.startsWith('SPRINT-'))
    .map(f => path.join(sprintsDir, f));

  console.log(`   Found ${sprintFiles.length} sprint files`);

  const results: SyncResult[] = [];
  for (const sprintFile of sprintFiles) {
    const result = await syncSprint(sprintFile);
    if (result.success) {
      console.log(`   ✓ ${path.basename(sprintFile)}: ${result.nodes} nodes, ${result.relationships} rels`);
    } else {
      console.log(`   ✗ ${path.basename(sprintFile)}: ${result.error}`);
    }
    results.push(result);
  }

  return results;
}

async function checkGraphStatus(): Promise<void> {
  console.log('\n📊 Current Graph Status:');

  const labels = ['Project', 'Charter', 'Epic', 'Sprint', 'Task', 'ADR', 'Pattern', 'Gotcha', 'Event'];

  for (const label of labels) {
    const response = await fetch(
      `${API_BASE}/graph/nodes?graphId=${GRAPH_ID}&labels=${label}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`   ${label}: ${data.total} nodes`);
    }
  }
}

async function main() {
  console.log('🔄 Ginko Graph Rebuild');
  console.log('='.repeat(50));
  console.log(`Graph ID: ${GRAPH_ID}`);

  // Check initial state
  await checkGraphStatus();

  // Sync Charter
  const charterResult = await syncCharter();

  // Sync Sprints
  const sprintResults = await syncAllSprints();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Rebuild Summary:');

  const allResults = [charterResult, ...sprintResults];
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);

  console.log(`   ✓ Successful: ${successful.length}`);
  console.log(`   ✗ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n   Failed items:');
    failed.forEach(f => console.log(`   - ${f.type}: ${f.error}`));
  }

  const totalNodes = successful.reduce((sum, r) => sum + (r.nodes || 0), 0);
  const totalRels = successful.reduce((sum, r) => sum + (r.relationships || 0), 0);
  console.log(`\n   Total created: ${totalNodes} nodes, ${totalRels} relationships`);

  // Check final state
  console.log('\n📊 Final Graph Status:');
  await checkGraphStatus();
}

main().catch(console.error);
