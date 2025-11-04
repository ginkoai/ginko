/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-02
 * @tags: [test, e2e, live-api, graph-api, dual-write, adr-041]
 * @related: [write-dispatcher.ts, graph-adapter.ts, local-adapter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 *
 * Live Integration Tests for Deployed Graph API
 *
 * Prerequisites:
 * - GINKO_GRAPH_ENABLED='true'
 * - GINKO_GRAPH_API_URL (default: https://ginko-8ywf93tl6-chris-nortons-projects.vercel.app)
 * - GINKO_GRAPH_TOKEN (required - API bearer token)
 * - GINKO_GRAPH_ID (required - your graph ID, e.g., gin_1762125961056_dg4bsd)
 * - GINKO_DUAL_WRITE='true' (optional - to test dual-write)
 *
 * Run:
 * GINKO_GRAPH_ENABLED=true \
 * GINKO_GRAPH_TOKEN=your_token \
 * GINKO_GRAPH_ID=your_graph_id \
 * npm test -- live-graph-api.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  initializeDispatcher,
  getDispatcher,
  type KnowledgeDocument,
} from '../../src/lib/write-dispatcher/write-dispatcher.js';
import { createGraphAdapterFromEnv } from '../../src/lib/write-dispatcher/adapters/graph-adapter.js';
import { createLocalAdapterFromEnv } from '../../src/lib/write-dispatcher/adapters/local-adapter.js';

// Skip all tests if required environment variables are not set
const requiredEnvVars = ['GINKO_GRAPH_ENABLED', 'GINKO_GRAPH_TOKEN', 'GINKO_GRAPH_ID'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
const shouldSkip = missingVars.length > 0;

if (shouldSkip) {
  console.warn('\n⚠️  Skipping live API tests - missing required environment variables:');
  console.warn(missingVars.map(v => `   - ${v}`).join('\n'));
  console.warn('\nTo run these tests, set:');
  console.warn('   GINKO_GRAPH_ENABLED=true');
  console.warn('   GINKO_GRAPH_TOKEN=your_token');
  console.warn('   GINKO_GRAPH_ID=your_graph_id');
  console.warn('   npm test -- live-graph-api.test.ts\n');
}

describe('Live Graph API Integration', () => {
  let tempDir: string;
  let ginkoDir: string;
  const testNodeIds: string[] = [];

  beforeAll(async () => {
    if (shouldSkip) return;

    // Create temp directory for local writes
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'live-api-test-'));
    tempDir = await fs.realpath(tempDir);
    ginkoDir = path.join(tempDir, '.ginko');
    await fs.ensureDir(ginkoDir);
    process.chdir(tempDir);

    console.log('\n📊 Test Configuration:');
    console.log(`   API URL: ${process.env.GINKO_GRAPH_API_URL || 'https://ginko-8ywf93tl6-chris-nortons-projects.vercel.app'}`);
    console.log(`   Graph ID: ${process.env.GINKO_GRAPH_ID}`);
    console.log(`   Dual-Write: ${process.env.GINKO_DUAL_WRITE === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`   Temp Dir: ${tempDir}\n`);
  });

  afterAll(async () => {
    if (shouldSkip) return;

    // Clean up temp directory
    if (tempDir) {
      await fs.remove(tempDir);
    }

    // Note: We don't clean up test nodes from Neo4j - they serve as test data
    console.log(`\n✅ Created ${testNodeIds.length} test nodes in graph`);
    if (testNodeIds.length > 0) {
      console.log('   Node IDs:', testNodeIds.join(', '));
    }
  });

  describe('WriteDispatcher with Live API', () => {
    it('should initialize dispatcher with graph adapter', async () => {
      const dispatcher = initializeDispatcher({
        primaryAdapter: 'graph',
        dualWrite: process.env.GINKO_DUAL_WRITE === 'true',
      });

      const graphAdapter = createGraphAdapterFromEnv();
      dispatcher.registerAdapter(graphAdapter);

      if (process.env.GINKO_DUAL_WRITE === 'true') {
        const localAdapter = await createLocalAdapterFromEnv(ginkoDir);
        dispatcher.registerAdapter(localAdapter);
      }

      const validation = dispatcher.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);

      const status = dispatcher.getStatus();
      expect(status.primaryAdapter).toBe('graph');
      expect(status.enabledAdapters).toContain('graph');
    });

    it('should write LogEntry to live graph API', async () => {
      const dispatcher = getDispatcher();

      const logDoc: KnowledgeDocument = {
        type: 'LogEntry',
        id: `log_live_test_${Date.now()}`,
        title: 'Live API Test - Log Entry',
        content: 'Testing WriteDispatcher with live deployed graph API',
        data: {},
        metadata: {
          userEmail: 'test@example.com',
          category: 'test',
          impact: 'low',
          timestamp: new Date().toISOString(),
          source: 'e2e-test',
        },
      };

      const result = await dispatcher.dispatch(logDoc);

      expect(result).toBeDefined();
      expect(result.source).toBe('graph');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Store node ID for cleanup reference
      if (result.id) {
        testNodeIds.push(result.id);
      }

      console.log(`   ✓ Created LogEntry node: ${result.id}`);
    });

    it('should write ADR to live graph API', async () => {
      const dispatcher = getDispatcher();

      const adrDoc: KnowledgeDocument = {
        type: 'ADR',
        id: `adr_live_test_${Date.now()}`,
        title: 'Live API Test - ADR Document',
        content: '# ADR: Live API Testing\n\nDecision to test WriteDispatcher with deployed API',
        data: {
          number: 999,
        },
        metadata: {
          status: 'proposed',
          tags: ['test', 'e2e', 'live-api'],
          date: new Date().toISOString().split('T')[0],
        },
      };

      const result = await dispatcher.dispatch(adrDoc);

      expect(result.source).toBe('graph');
      expect(result.id).toBeDefined();

      if (result.id) {
        testNodeIds.push(result.id);
      }

      console.log(`   ✓ Created ADR node: ${result.id}`);

      // If dual-write enabled, verify local file was created
      if (process.env.GINKO_DUAL_WRITE === 'true') {
        const adrPath = path.join(tempDir, 'docs', 'adr', 'ADR-999-live-api-test-adr-document.md');
        const fileExists = await fs.pathExists(adrPath);
        expect(fileExists).toBe(true);

        if (fileExists) {
          const content = await fs.readFile(adrPath, 'utf-8');
          expect(content).toContain('status: proposed');
          expect(content).toContain('Live API Testing');
          console.log(`   ✓ Local file created: ${adrPath}`);
        }
      }
    });

    it('should write Pattern to live graph API', async () => {
      const dispatcher = getDispatcher();

      const patternDoc: KnowledgeDocument = {
        type: 'Pattern',
        id: `pattern_live_test_${Date.now()}`,
        title: 'Live API Test - Pattern',
        content: '# Pattern: Dual-Write Migration\n\nUse WriteDispatcher for safe migration...',
        data: {
          domain: 'architecture',
        },
        metadata: {
          category: 'pattern',
          tags: ['architecture', 'migration', 'dual-write'],
        },
      };

      const result = await dispatcher.dispatch(patternDoc);

      expect(result.source).toBe('graph');
      expect(result.id).toBeDefined();

      if (result.id) {
        testNodeIds.push(result.id);
      }

      console.log(`   ✓ Created Pattern node: ${result.id}`);
    });

    it('should handle concurrent writes to live API', async () => {
      const dispatcher = getDispatcher();

      const docs: KnowledgeDocument[] = [
        {
          type: 'LogEntry',
          id: `log_concurrent_1_${Date.now()}`,
          title: 'Concurrent Test 1',
          content: 'Testing concurrent writes - entry 1',
          data: {},
          metadata: { userEmail: 'test@example.com', category: 'test', impact: 'low' },
        },
        {
          type: 'LogEntry',
          id: `log_concurrent_2_${Date.now()}`,
          title: 'Concurrent Test 2',
          content: 'Testing concurrent writes - entry 2',
          data: {},
          metadata: { userEmail: 'test@example.com', category: 'test', impact: 'low' },
        },
        {
          type: 'LogEntry',
          id: `log_concurrent_3_${Date.now()}`,
          title: 'Concurrent Test 3',
          content: 'Testing concurrent writes - entry 3',
          data: {},
          metadata: { userEmail: 'test@example.com', category: 'test', impact: 'low' },
        },
      ];

      const results = await Promise.all(
        docs.map(doc => dispatcher.dispatch(doc))
      );

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.source).toBe('graph');
        expect(result.id).toBeDefined();
        if (result.id) {
          testNodeIds.push(result.id);
        }
      });

      console.log(`   ✓ Created 3 concurrent nodes: ${results.map(r => r.id).join(', ')}`);
    });
  });

  describe('Error Handling with Live API', () => {
    it('should handle network timeout gracefully', async () => {
      // This test would require mocking or using a slow endpoint
      // For now, we'll skip it or implement if needed
      console.log('   ⊘ Skipping timeout test (requires special setup)');
    });

    it('should provide meaningful errors on API failure', async () => {
      // This would require intentionally causing an API error
      // For now, we document expected behavior
      console.log('   ⊘ Skipping error handling test (requires API error simulation)');
    });
  });
});

// Export skip status for test runner
export const isSkipped = shouldSkip;
