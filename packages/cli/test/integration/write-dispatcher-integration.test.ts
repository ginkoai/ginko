/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-02
 * @tags: [test, integration, write-dispatcher, dual-write, adr-041]
 * @related: [write-dispatcher.ts, graph-adapter.ts, local-adapter.ts, dispatcher-logger.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  WriteDispatcher,
  initializeDispatcher,
  type KnowledgeDocument,
} from '../../src/lib/write-dispatcher/write-dispatcher.js';
import { GraphAdapter } from '../../src/lib/write-dispatcher/adapters/graph-adapter.js';
import { LocalAdapter } from '../../src/lib/write-dispatcher/adapters/local-adapter.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('WriteDispatcher Integration Tests', () => {
  let tempDir: string;
  let ginkoDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let dispatcher: WriteDispatcher;
  let sampleDocument: KnowledgeDocument;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dispatcher-integration-'));
    tempDir = await fs.realpath(tempDir);
    ginkoDir = path.join(tempDir, '.ginko');
    await fs.ensureDir(ginkoDir);

    // Change to temp directory
    process.chdir(tempDir);

    // Reset environment
    delete process.env.GINKO_GRAPH_ENABLED;
    delete process.env.GINKO_DUAL_WRITE;
    delete process.env.GINKO_GRAPH_API_URL;
    delete process.env.GINKO_GRAPH_TOKEN;
    delete process.env.GINKO_GRAPH_ID;

    // Clear fetch mock
    (global.fetch as jest.Mock).mockReset();

    // Create sample document
    sampleDocument = {
      type: 'LogEntry',
      id: 'log_001',
      title: 'Test Log Entry',
      content: 'Test log content for integration testing',
      data: {},
      metadata: {
        userEmail: 'test@example.com',
        category: 'feature',
        impact: 'medium',
        timestamp: new Date().toISOString(),
      },
    };
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up temp directory
    await fs.remove(tempDir);

    jest.restoreAllMocks();
  });

  describe('Dual-Write Mode - Both Adapters Enabled', () => {
    beforeEach(() => {
      // Enable both adapters
      process.env.GINKO_GRAPH_ENABLED = 'true';
      process.env.GINKO_DUAL_WRITE = 'true';
      process.env.GINKO_GRAPH_API_URL = 'https://test-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'test_token';
      process.env.GINKO_GRAPH_ID = 'test_graph';

      // Mock successful graph API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'LogEntry',
          graphId: 'test_graph',
          created: true,
        }),
      });

      // Create dispatcher with both adapters
      dispatcher = new WriteDispatcher({
        primaryAdapter: 'graph',
        dualWrite: true,
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);
    });

    it('should write to both graph and local filesystem', async () => {
      const result = await dispatcher.dispatch(sampleDocument);

      // Primary adapter (graph) result returned
      expect(result.source).toBe('graph');
      expect(result.id).toBe('node_123');

      // Verify graph API was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.ginko.ai/api/v1/graph/nodes',
        expect.any(Object)
      );

      // Verify local file was written
      const logPath = path.join(
        ginkoDir,
        'sessions',
        'test-at-example-com',
        'current-session-log.md'
      );
      const fileExists = await fs.pathExists(logPath);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(logPath, 'utf-8');
      expect(content).toContain('Test log content');
    });

    it('should write ADR to both destinations', async () => {
      const adrDoc: KnowledgeDocument = {
        type: 'ADR',
        id: 'adr_042',
        title: 'Use JWT Authentication',
        content: '# ADR-042\n\nDecision...',
        data: { number: 42 },
        metadata: {
          status: 'proposed',
          tags: ['auth'],
        },
      };

      const result = await dispatcher.dispatch(adrDoc);

      expect(result.source).toBe('graph');

      // Verify local ADR file created
      const adrPath = path.join(tempDir, 'docs', 'adr', 'ADR-042-use-jwt-authentication.md');
      const fileExists = await fs.pathExists(adrPath);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(adrPath, 'utf-8');
      expect(content).toContain('status: proposed');
      expect(content).toContain('Decision...');
    });
  });

  describe('Dual-Write Mode - Partial Failures', () => {
    beforeEach(() => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      process.env.GINKO_DUAL_WRITE = 'true';
      process.env.GINKO_GRAPH_API_URL = 'https://test-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'test_token';
      process.env.GINKO_GRAPH_ID = 'test_graph';

      dispatcher = new WriteDispatcher({
        primaryAdapter: 'graph',
        dualWrite: true,
      });
    });

    it('should succeed when graph succeeds and local fails', async () => {
      // Graph succeeds
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'LogEntry',
          graphId: 'test_graph',
          created: true,
        }),
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      // Local adapter that will fail (invalid ginko dir)
      const localAdapter = new LocalAdapter({
        ginkoDir: '/invalid/path/that/does/not/exist',
      });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);

      // Mock console.warn to verify warning is logged
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should succeed despite local failure
      const result = await dispatcher.dispatch(sampleDocument);

      expect(result.source).toBe('graph');
      expect(result.id).toBe('node_123');

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Secondary adapter 'local' failed")
      );

      consoleWarnSpy.mockRestore();
    });

    it('should fail when graph fails even if local succeeds', async () => {
      // Graph fails
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);

      // Should fail because primary (graph) failed
      await expect(dispatcher.dispatch(sampleDocument)).rejects.toThrow(
        "Primary adapter 'graph' failed"
      );

      // Local file should NOT be created since write failed
      // (Actually, it might be created due to concurrent execution,
      // but the operation should still throw)
    });
  });

  describe('Environment Configuration Scenarios', () => {
    it('should work with graph-only mode (no dual-write)', async () => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      process.env.GINKO_DUAL_WRITE = 'false';
      process.env.GINKO_GRAPH_API_URL = 'https://test-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'test_token';
      process.env.GINKO_GRAPH_ID = 'test_graph';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'LogEntry',
          graphId: 'test_graph',
          created: true,
        }),
      });

      dispatcher = new WriteDispatcher({
        primaryAdapter: 'graph',
        dualWrite: false,
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);

      const result = await dispatcher.dispatch(sampleDocument);

      expect(result.source).toBe('graph');

      // Local file should NOT exist (adapter disabled)
      const logPath = path.join(
        ginkoDir,
        'sessions',
        'test-at-example-com',
        'current-session-log.md'
      );
      const fileExists = await fs.pathExists(logPath);
      expect(fileExists).toBe(false);
    });

    it('should work with local-only mode (graph disabled)', async () => {
      process.env.GINKO_GRAPH_ENABLED = 'false';
      process.env.GINKO_DUAL_WRITE = 'true';

      dispatcher = new WriteDispatcher({
        primaryAdapter: 'local', // Switch to local as primary when graph disabled
        dualWrite: true,
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: 'https://test-api.ginko.ai',
        bearerToken: 'test_token',
        graphId: 'test_graph',
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);

      const result = await dispatcher.dispatch(sampleDocument);

      expect(result.source).toBe('local');
      expect(result.path).toBeDefined();

      // Graph API should NOT be called
      expect(global.fetch).not.toHaveBeenCalled();

      // Local file should exist
      const logPath = path.join(
        ginkoDir,
        'sessions',
        'test-at-example-com',
        'current-session-log.md'
      );
      const fileExists = await fs.pathExists(logPath);
      expect(fileExists).toBe(true);
    });

    it('should fail when neither adapter is enabled', async () => {
      process.env.GINKO_GRAPH_ENABLED = 'false';
      process.env.GINKO_DUAL_WRITE = 'false';

      dispatcher = new WriteDispatcher({
        primaryAdapter: 'graph',
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: 'https://test-api.ginko.ai',
        bearerToken: 'test_token',
        graphId: 'test_graph',
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);

      await expect(dispatcher.dispatch(sampleDocument)).rejects.toThrow(
        'No enabled adapters available for write dispatch'
      );
    });
  });

  describe('Global Dispatcher Initialization', () => {
    it('should initialize and use global dispatcher', async () => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      process.env.GINKO_DUAL_WRITE = 'true';
      process.env.GINKO_GRAPH_API_URL = 'https://test-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'test_token';
      process.env.GINKO_GRAPH_ID = 'test_graph';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'LogEntry',
          graphId: 'test_graph',
          created: true,
        }),
      });

      // Initialize global dispatcher
      const globalDispatcher = initializeDispatcher({
        primaryAdapter: 'graph',
        dualWrite: true,
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      globalDispatcher.registerAdapter(graphAdapter);
      globalDispatcher.registerAdapter(localAdapter);

      const result = await globalDispatcher.dispatch(sampleDocument);

      expect(result.source).toBe('graph');
    });
  });

  describe('Data Consistency Validation', () => {
    beforeEach(() => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      process.env.GINKO_DUAL_WRITE = 'true';
      process.env.GINKO_GRAPH_API_URL = 'https://test-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'test_token';
      process.env.GINKO_GRAPH_ID = 'test_graph';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'Pattern',
          graphId: 'test_graph',
          created: true,
        }),
      });

      dispatcher = new WriteDispatcher({
        primaryAdapter: 'graph',
        dualWrite: true,
      });

      const graphAdapter = new GraphAdapter({
        apiUrl: process.env.GINKO_GRAPH_API_URL!,
        bearerToken: process.env.GINKO_GRAPH_TOKEN!,
        graphId: process.env.GINKO_GRAPH_ID!,
      });

      const localAdapter = new LocalAdapter({ ginkoDir });

      dispatcher.registerAdapter(graphAdapter);
      dispatcher.registerAdapter(localAdapter);
    });

    it('should ensure same document data sent to both adapters', async () => {
      const patternDoc: KnowledgeDocument = {
        type: 'Pattern',
        id: 'pattern_001',
        title: 'Repository Pattern',
        content: '# Repository Pattern\n\nUse repositories for data access...',
        data: {
          domain: 'architecture',
          complexity: 'medium',
        },
        metadata: {
          tags: ['architecture', 'data-access'],
          category: 'pattern',
        },
      };

      await dispatcher.dispatch(patternDoc);

      // Verify graph received correct data
      const graphCall = (global.fetch as jest.Mock).mock.calls[0];
      const graphPayload = JSON.parse(graphCall[1].body);

      expect(graphPayload.data.title).toBe('Repository Pattern');
      expect(graphPayload.data.domain).toBe('architecture');
      expect(graphPayload.data.tags).toEqual(['architecture', 'data-access']);

      // Verify local file contains correct data
      const patternPath = path.join(
        ginkoDir,
        'archive',
        'patterns',
        'repository-pattern.md'
      );
      const fileContent = await fs.readFile(patternPath, 'utf-8');

      expect(fileContent).toContain('Repository Pattern');
      expect(fileContent).toContain('category: pattern');
      expect(fileContent).toContain('  - architecture');
      expect(fileContent).toContain('  - data-access');
    });
  });
});
