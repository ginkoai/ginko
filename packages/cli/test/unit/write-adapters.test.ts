/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-02
 * @tags: [test, unit, adapters, graph-adapter, local-adapter, adr-041]
 * @related: [graph-adapter.ts, local-adapter.ts, write-dispatcher.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra, node-fetch]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  GraphAdapter,
  createGraphAdapterFromEnv,
  type GraphAdapterConfig,
} from '../../src/lib/write-dispatcher/adapters/graph-adapter.js';
import {
  LocalAdapter,
  createLocalAdapterFromEnv,
  type LocalAdapterConfig,
} from '../../src/lib/write-dispatcher/adapters/local-adapter.js';
import type { KnowledgeDocument } from '../../src/lib/write-dispatcher/write-dispatcher.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('GraphAdapter', () => {
  let adapter: GraphAdapter;
  let sampleDocument: KnowledgeDocument;
  const mockConfig: GraphAdapterConfig = {
    apiUrl: 'https://test-api.ginko.ai',
    bearerToken: 'test_token_123',
    graphId: 'test_graph_id',
    timeout: 5000,
  };

  beforeEach(() => {
    // Reset environment
    delete process.env.GINKO_GRAPH_ENABLED;
    delete process.env.GINKO_GRAPH_API_URL;
    delete process.env.GINKO_GRAPH_TOKEN;
    delete process.env.GINKO_GRAPH_ID;

    // Clear fetch mock
    (global.fetch as jest.Mock).mockReset();

    // Create adapter
    adapter = new GraphAdapter(mockConfig);

    // Create sample document
    sampleDocument = {
      type: 'ADR',
      id: 'adr_042',
      title: 'Use JWT Authentication',
      content: '# ADR-042: Use JWT Authentication\n\nDecision to use JWT...',
      data: {
        number: 42,
        status: 'proposed',
      },
      metadata: {
        tags: ['auth', 'security'],
        status: 'proposed',
        impact: 'high',
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should create adapter with valid config', () => {
      expect(adapter).toBeInstanceOf(GraphAdapter);
      expect(adapter.name).toBe('graph');
    });

    it('should use default timeout if not provided', () => {
      const a = new GraphAdapter({
        apiUrl: 'https://test.com',
        bearerToken: 'token',
        graphId: 'id',
      });
      expect(a).toBeInstanceOf(GraphAdapter);
    });

    it('should expose config via getConfig', () => {
      const config = adapter.getConfig();
      expect(config.apiUrl).toBe('https://test-api.ginko.ai');
      expect(config.graphId).toBe('test_graph_id');
      expect(config.hasToken).toBe(true);
    });
  });

  describe('enabled() check', () => {
    it('should be disabled when GINKO_GRAPH_ENABLED not set', () => {
      expect(adapter.enabled()).toBe(false);
    });

    it('should be disabled when GINKO_GRAPH_ENABLED is false', () => {
      process.env.GINKO_GRAPH_ENABLED = 'false';
      expect(adapter.enabled()).toBe(false);
    });

    it('should be disabled when bearer token is missing', () => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      const a = new GraphAdapter({
        apiUrl: 'https://test.com',
        bearerToken: '',
        graphId: 'test',
      });
      expect(a.enabled()).toBe(false);
    });

    it('should be disabled when graph ID is missing', () => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      const a = new GraphAdapter({
        apiUrl: 'https://test.com',
        bearerToken: 'token',
        graphId: '',
      });
      expect(a.enabled()).toBe(false);
    });

    it('should be enabled when all requirements met', () => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
      expect(adapter.enabled()).toBe(true);
    });
  });

  describe('write() - success scenarios', () => {
    beforeEach(() => {
      process.env.GINKO_GRAPH_ENABLED = 'true';

      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          nodeId: 'node_123',
          label: 'ADR',
          graphId: 'test_graph_id',
          created: true,
        }),
      });
    });

    it('should write document successfully', async () => {
      const result = await adapter.write(sampleDocument);

      expect(result).toBeDefined();
      expect(result.source).toBe('graph');
      expect(result.id).toBe('node_123');
      expect(result.timestamp).toBeDefined();
    });

    it('should call API with correct payload', async () => {
      await adapter.write(sampleDocument);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.ginko.ai/api/v1/graph/nodes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token_123',
          }),
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.graphId).toBe('test_graph_id');
      expect(requestBody.label).toBe('ADR');
      expect(requestBody.data.id).toBe('adr_042');
      expect(requestBody.data.title).toBe('Use JWT Authentication');
      expect(requestBody.data.tags).toEqual(['auth', 'security']);
    });

    it('should map document metadata correctly', async () => {
      await adapter.write(sampleDocument);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.data.status).toBe('proposed');
      expect(requestBody.data.impact).toBe('high');
      expect(requestBody.data.tags).toEqual(['auth', 'security']);
    });
  });

  describe('write() - error scenarios', () => {
    beforeEach(() => {
      process.env.GINKO_GRAPH_ENABLED = 'true';
    });

    it('should throw error when adapter not enabled', async () => {
      process.env.GINKO_GRAPH_ENABLED = 'false';

      await expect(adapter.write(sampleDocument)).rejects.toThrow(
        'GraphAdapter is not enabled'
      );
    });

    it('should throw error on HTTP error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(adapter.write(sampleDocument)).rejects.toThrow(
        'GraphAdapter write failed: HTTP 500: Internal Server Error'
      );
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(adapter.write(sampleDocument)).rejects.toThrow(
        'GraphAdapter write failed: Network error'
      );
    });

    it('should handle timeout', async () => {
      // Mock fetch that respects abort signal
      (global.fetch as jest.Mock).mockImplementation(
        (_url: string, options: any) => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ nodeId: 'test', label: 'ADR', graphId: 'test', created: true }),
              });
            }, 5000);

            // Listen for abort signal
            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('The operation was aborted'));
              });
            }
          });
        }
      );

      const quickAdapter = new GraphAdapter({
        ...mockConfig,
        timeout: 100, // Very short timeout
      });

      await expect(quickAdapter.write(sampleDocument)).rejects.toThrow();
    }, 2000);
  });

  describe('createGraphAdapterFromEnv()', () => {
    it('should create adapter from environment variables', () => {
      process.env.GINKO_GRAPH_API_URL = 'https://env-api.ginko.ai';
      process.env.GINKO_GRAPH_TOKEN = 'env_token';
      process.env.GINKO_GRAPH_ID = 'env_graph';
      process.env.GINKO_GRAPH_TIMEOUT = '15000';

      const envAdapter = createGraphAdapterFromEnv();

      const config = envAdapter.getConfig();
      expect(config.apiUrl).toBe('https://env-api.ginko.ai');
      expect(config.graphId).toBe('env_graph');
      expect(config.hasToken).toBe(true);
    });

    it('should use defaults when env vars not set', () => {
      const envAdapter = createGraphAdapterFromEnv();

      const config = envAdapter.getConfig();
      expect(config.apiUrl).toBe('https://mcp.ginko.ai');
      expect(config.graphId).toBe('');
    });
  });
});

describe('LocalAdapter', () => {
  let adapter: LocalAdapter;
  let tempDir: string;
  let ginkoDir: string;
  let sampleDocument: KnowledgeDocument;

  beforeEach(async () => {
    // Reset environment
    delete process.env.GINKO_DUAL_WRITE;

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-adapter-test-'));
    tempDir = await fs.realpath(tempDir);
    ginkoDir = path.join(tempDir, '.ginko');

    // Create .ginko directory structure
    await fs.ensureDir(ginkoDir);

    // Change to temp directory so relative paths work
    process.chdir(tempDir);

    // Create adapter
    adapter = new LocalAdapter({ ginkoDir });

    // Create sample document
    sampleDocument = {
      type: 'ADR',
      id: 'adr_042',
      title: 'Use JWT Authentication',
      content: '# ADR-042: Use JWT Authentication\n\nDecision to use JWT...',
      data: {
        number: 42,
      },
      metadata: {
        tags: ['auth', 'security'],
        status: 'proposed',
        date: '2025-11-02',
      },
    };
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('constructor and configuration', () => {
    it('should create adapter with valid config', () => {
      expect(adapter).toBeInstanceOf(LocalAdapter);
      expect(adapter.name).toBe('local');
    });

    it('should use default archive directory', () => {
      expect(adapter).toBeInstanceOf(LocalAdapter);
    });

    it('should accept custom archive directory', () => {
      const customAdapter = new LocalAdapter({
        ginkoDir,
        archiveDir: path.join(ginkoDir, 'custom-archive'),
      });
      expect(customAdapter).toBeInstanceOf(LocalAdapter);
    });
  });

  describe('enabled() check', () => {
    it('should be disabled when GINKO_DUAL_WRITE not set', () => {
      expect(adapter.enabled()).toBe(false);
    });

    it('should be disabled when GINKO_DUAL_WRITE is false', () => {
      process.env.GINKO_DUAL_WRITE = 'false';
      expect(adapter.enabled()).toBe(false);
    });

    it('should be enabled when GINKO_DUAL_WRITE is true', () => {
      process.env.GINKO_DUAL_WRITE = 'true';
      expect(adapter.enabled()).toBe(true);
    });
  });

  describe('write() - ADR documents', () => {
    beforeEach(() => {
      process.env.GINKO_DUAL_WRITE = 'true';
    });

    it('should write ADR to docs/adr/', async () => {
      const result = await adapter.write(sampleDocument);

      expect(result).toBeDefined();
      expect(result.source).toBe('local');
      expect(result.path).toContain('docs/adr/ADR-042-use-jwt-authentication.md');
      expect(result.timestamp).toBeDefined();

      // Verify file exists
      const fileExists = await fs.pathExists(result.path!);
      expect(fileExists).toBe(true);

      // Verify content
      const content = await fs.readFile(result.path!, 'utf-8');
      expect(content).toContain('status: proposed');
      expect(content).toContain('Use JWT Authentication');
    });

    it('should include frontmatter with metadata', async () => {
      const result = await adapter.write(sampleDocument);
      const content = await fs.readFile(result.path!, 'utf-8');

      expect(content).toContain('---');
      expect(content).toContain('status: proposed');
      expect(content).toContain('date: 2025-11-02');
      expect(content).toContain('tags:');
      expect(content).toContain('  - auth');
      expect(content).toContain('  - security');
    });
  });

  describe('write() - PRD documents', () => {
    beforeEach(() => {
      process.env.GINKO_DUAL_WRITE = 'true';
    });

    it('should write PRD to docs/PRD/', async () => {
      const prdDoc: KnowledgeDocument = {
        type: 'PRD',
        id: 'prd_001',
        title: 'User Dashboard Feature',
        content: '# PRD-001: User Dashboard\n\nProduct requirements...',
        data: { number: 1 },
        metadata: { status: 'draft' },
      };

      const result = await adapter.write(prdDoc);

      expect(result.path).toContain('docs/PRD/PRD-001-user-dashboard-feature.md');

      const fileExists = await fs.pathExists(result.path!);
      expect(fileExists).toBe(true);
    });
  });

  describe('write() - Pattern documents', () => {
    beforeEach(() => {
      process.env.GINKO_DUAL_WRITE = 'true';
    });

    it('should write Pattern to archive/patterns/', async () => {
      const patternDoc: KnowledgeDocument = {
        type: 'Pattern',
        id: 'pattern_001',
        title: 'Repository Pattern',
        content: 'Use repository pattern for data access...',
        data: {},
        metadata: { category: 'pattern' },
      };

      const result = await adapter.write(patternDoc);

      expect(result.path).toContain('.ginko/archive/patterns/repository-pattern.md');

      const fileExists = await fs.pathExists(result.path!);
      expect(fileExists).toBe(true);
    });
  });

  describe('write() - LogEntry documents', () => {
    beforeEach(() => {
      process.env.GINKO_DUAL_WRITE = 'true';
    });

    it('should append LogEntry to session log', async () => {
      const logDoc: KnowledgeDocument = {
        type: 'LogEntry',
        id: 'log_001',
        title: 'Fixed auth bug',
        content: 'Fixed authentication timeout issue',
        data: {},
        metadata: {
          userEmail: 'test@example.com',
          category: 'fix',
          impact: 'high',
          timestamp: '2025-11-02T14:30:00Z',
          files: ['src/auth/login.ts:42'],
        },
      };

      const result = await adapter.write(logDoc);

      expect(result.path).toContain('.ginko/sessions/test-at-example-com/current-session-log.md');

      const fileExists = await fs.pathExists(result.path!);
      expect(fileExists).toBe(true);

      // Verify content format
      const content = await fs.readFile(result.path!, 'utf-8');
      expect(content).toContain('### ');
      expect(content).toContain('[fix]');
      expect(content).toContain('Fixed authentication timeout issue');
      expect(content).toContain('Files: src/auth/login.ts:42');
      expect(content).toContain('Impact: high');
    });

    it('should append multiple log entries', async () => {
      const logDoc1: KnowledgeDocument = {
        type: 'LogEntry',
        id: 'log_001',
        title: 'First entry',
        content: 'First log entry',
        data: {},
        metadata: { userEmail: 'test@example.com', category: 'feature' },
      };

      const logDoc2: KnowledgeDocument = {
        type: 'LogEntry',
        id: 'log_002',
        title: 'Second entry',
        content: 'Second log entry',
        data: {},
        metadata: { userEmail: 'test@example.com', category: 'fix' },
      };

      await adapter.write(logDoc1);
      const result = await adapter.write(logDoc2);

      const content = await fs.readFile(result.path!, 'utf-8');
      expect(content).toContain('First log entry');
      expect(content).toContain('Second log entry');
    });
  });

  describe('write() - error scenarios', () => {
    it('should throw error when adapter not enabled', async () => {
      process.env.GINKO_DUAL_WRITE = 'false';

      await expect(adapter.write(sampleDocument)).rejects.toThrow(
        'LocalAdapter is not enabled'
      );
    });

    it('should throw error for unsupported document type', async () => {
      process.env.GINKO_DUAL_WRITE = 'true';

      const invalidDoc: any = {
        type: 'UnsupportedType',
        id: 'test',
        title: 'Test',
        content: 'Test',
        data: {},
      };

      await expect(adapter.write(invalidDoc)).rejects.toThrow(
        'LocalAdapter write failed'
      );
    });
  });

  describe('createLocalAdapterFromEnv()', () => {
    it('should create adapter from ginko directory', async () => {
      const envAdapter = await createLocalAdapterFromEnv(ginkoDir);
      expect(envAdapter).toBeInstanceOf(LocalAdapter);
      expect(envAdapter.name).toBe('local');
    });
  });
});
