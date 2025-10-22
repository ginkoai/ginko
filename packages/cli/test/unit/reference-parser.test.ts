/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-22
 * @tags: [test, references, parsing, task-010]
 * @related: [../../src/utils/reference-parser.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import { jest } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  extractReferences,
  resolveReference,
  validateReferences,
  getReferencedContent,
  getReferenceChain,
  formatReferenceChain,
  getBacklinks,
  clearResolvedPathCache,
  getReferencesFromFile,
  Reference,
  ResolvedReference
} from '../../src/utils/reference-parser.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('glob', () => {
  const mockGlob = jest.fn();
  return {
    __esModule: true,
    default: mockGlob
  };
});
jest.mock('../../src/utils/config-loader.js');

const mockFs = fs as jest.Mocked<typeof fs>;

// Import mocked modules after jest.mock
import glob from 'glob';
import * as configLoader from '../../src/utils/config-loader.js';

const mockGlob = glob as jest.MockedFunction<any>;
const mockResolveProjectPath = configLoader.resolveProjectPath as jest.MockedFunction<typeof configLoader.resolveProjectPath>;
const mockLoadProjectConfig = configLoader.loadProjectConfig as jest.MockedFunction<typeof configLoader.loadProjectConfig>;

// Cast fs methods to more permissive types for testing
const mockReadFile = mockFs.readFile as unknown as jest.MockedFunction<(path: string, encoding: string) => Promise<string>>;

describe('Reference Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResolvedPathCache();
  });

  describe('extractReferences', () => {
    it('should extract TASK references', () => {
      const text = 'Implementing TASK-006 and TASK-010 for the sprint';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        type: 'task',
        id: '006',
        rawText: 'TASK-006'
      });
      expect(refs[1]).toEqual({
        type: 'task',
        id: '010',
        rawText: 'TASK-010'
      });
    });

    it('should extract PRD references', () => {
      const text = 'Per PRD-009 specification';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        type: 'prd',
        id: '009',
        rawText: 'PRD-009'
      });
    });

    it('should extract ADR references', () => {
      const text = 'Following ADR-033 and ADR-037';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        type: 'adr',
        id: '033',
        rawText: 'ADR-033'
      });
      expect(refs[1]).toEqual({
        type: 'adr',
        id: '037',
        rawText: 'ADR-037'
      });
    });

    it('should extract FEATURE references', () => {
      const text = 'FEATURE-024 implementation';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        type: 'feature',
        id: '024',
        rawText: 'FEATURE-024'
      });
    });

    it('should extract SPRINT references', () => {
      const text = 'Part of SPRINT-2025-10-22-configuration-system';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        type: 'sprint',
        id: '2025-10-22-configuration-system',
        rawText: 'SPRINT-2025-10-22-configuration-system'
      });
    });

    it('should extract all reference types from mixed text', () => {
      const text = `
        Fixed TASK-006 per PRD-009 and ADR-033.
        Part of FEATURE-024 in SPRINT-2025-10-22-configuration-system.
      `;
      const refs = extractReferences(text);

      expect(refs).toHaveLength(5);
      expect(refs.map(r => r.type)).toEqual(['task', 'prd', 'adr', 'feature', 'sprint']);
    });

    it('should deduplicate references', () => {
      const text = 'TASK-006 is related to TASK-006 and also TASK-006';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0].rawText).toBe('TASK-006');
    });

    it('should not extract partial matches', () => {
      const text = 'Not a reference: TASK-ABC or PRD- or ADR-1';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(0);
    });

    it('should handle references at word boundaries', () => {
      const text = 'TASK-006.md file or (TASK-007) in parens';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(2);
      expect(refs.map(r => r.rawText)).toEqual(['TASK-006', 'TASK-007']);
    });

    it('should handle empty or null input', () => {
      expect(extractReferences('')).toEqual([]);
      expect(extractReferences('   ')).toEqual([]);
      expect(extractReferences('No references here')).toEqual([]);
    });

    it('should handle leading zeros in IDs', () => {
      const text = 'TASK-001, TASK-009, TASK-010';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(3);
      expect(refs.map(r => r.id)).toEqual(['001', '009', '010']);
    });
  });

  describe('resolveReference', () => {
    beforeEach(() => {
      mockLoadProjectConfig.mockResolvedValue({
        version: '1.0',
        project: { name: 'Test', type: 'single' },
        paths: {
          backlog: 'backlog',
          prds: 'docs/PRD',
          adrs: 'docs/adr',
          sprints: 'docs/sprints'
        },
        workMode: {
          default: 'think-build',
          documentationDepth: {
            'hack-ship': [],
            'think-build': [],
            'full-planning': []
          }
        },
        contextLoading: {
          progressive: true,
          maxDepth: 3,
          followReferences: true,
          priorityOrder: []
        }
      });
    });

    it('should resolve TASK reference to file path', async () => {
      const ref: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockResolveProjectPath.mockResolvedValue('/project/backlog');
      mockGlob.mockImplementation((pattern: string, callback: any) => {
        callback(null, ['/project/backlog/items/TASK-006.md']);
      });

      const resolved = await resolveReference(ref);

      expect(resolved).toEqual({
        type: 'task',
        id: '006',
        rawText: 'TASK-006',
        filePath: '/project/backlog/items/TASK-006.md',
        exists: true
      });
    });

    it('should resolve PRD reference with glob matching', async () => {
      const ref: Reference = { type: 'prd', id: '009', rawText: 'PRD-009' };

      mockResolveProjectPath.mockResolvedValue('/project/docs/PRD');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/docs/PRD/PRD-009-configuration-and-reference-system.md']));

      const resolved = await resolveReference(ref);

      expect(resolved).toEqual({
        type: 'prd',
        id: '009',
        rawText: 'PRD-009',
        filePath: '/project/docs/PRD/PRD-009-configuration-and-reference-system.md',
        exists: true
      });
    });

    it('should resolve ADR reference with glob matching', async () => {
      const ref: Reference = { type: 'adr', id: '033', rawText: 'ADR-033' };

      mockResolveProjectPath.mockResolvedValue('/project/docs/adr');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/docs/adr/ADR-033-context-pressure-mitigation-strategy.md']));

      const resolved = await resolveReference(ref);

      expect(resolved.exists).toBe(true);
      expect(resolved.filePath).toContain('ADR-033');
    });

    it('should handle non-existent references', async () => {
      const ref: Reference = { type: 'task', id: '999', rawText: 'TASK-999' };

      mockResolveProjectPath.mockResolvedValue('/project/backlog');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, []));

      const resolved = await resolveReference(ref);

      expect(resolved).toEqual({
        type: 'task',
        id: '999',
        rawText: 'TASK-999',
        filePath: null,
        exists: false
      });
    });

    it('should cache resolved paths', async () => {
      const ref: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockResolveProjectPath.mockResolvedValue('/project/backlog');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/backlog/items/TASK-006.md']));

      // First call
      await resolveReference(ref);

      // Second call should use cache
      await resolveReference(ref);

      // Should only call glob once due to caching
      expect(mockGlob).toHaveBeenCalledTimes(1);
    });

    it('should handle SPRINT references correctly', async () => {
      const ref: Reference = {
        type: 'sprint',
        id: '2025-10-22-configuration-system',
        rawText: 'SPRINT-2025-10-22-configuration-system'
      };

      mockResolveProjectPath.mockResolvedValue('/project/docs/sprints');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/docs/sprints/SPRINT-2025-10-22-configuration-system.md']));

      const resolved = await resolveReference(ref);

      expect(resolved.exists).toBe(true);
      expect(resolved.filePath).toContain('SPRINT-2025-10-22');
    });

    it('should handle config loading errors gracefully', async () => {
      const ref: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockLoadProjectConfig.mockRejectedValue(new Error('Config not found'));

      const resolved = await resolveReference(ref);

      expect(resolved.exists).toBe(false);
      expect(resolved.filePath).toBeNull();
    });
  });

  describe('validateReferences', () => {
    beforeEach(() => {
      mockLoadProjectConfig.mockResolvedValue({
        version: '1.0',
        project: { name: 'Test', type: 'single' },
        paths: {
          backlog: 'backlog',
          prds: 'docs/PRD',
          adrs: 'docs/adr',
          sprints: 'docs/sprints'
        },
        workMode: {
          default: 'think-build',
          documentationDepth: {
            'hack-ship': [],
            'think-build': [],
            'full-planning': []
          }
        },
        contextLoading: {
          progressive: true,
          maxDepth: 3,
          followReferences: true,
          priorityOrder: []
        }
      });
    });

    it('should separate valid and broken references', async () => {
      const refs: Reference[] = [
        { type: 'task', id: '006', rawText: 'TASK-006' },
        { type: 'task', id: '999', rawText: 'TASK-999' },
        { type: 'prd', id: '009', rawText: 'PRD-009' }
      ];

      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob
        .mockResolvedValueOnce(['/project/backlog/items/TASK-006.md'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['/project/docs/PRD/PRD-009.md']);

      const validation = await validateReferences(refs);

      expect(validation.valid).toHaveLength(2);
      expect(validation.broken).toHaveLength(1);
      expect(validation.broken[0].rawText).toBe('TASK-999');
    });

    it('should handle empty reference list', async () => {
      const validation = await validateReferences([]);

      expect(validation.valid).toEqual([]);
      expect(validation.broken).toEqual([]);
    });

    it('should validate all reference types', async () => {
      const refs: Reference[] = [
        { type: 'task', id: '006', rawText: 'TASK-006' },
        { type: 'prd', id: '009', rawText: 'PRD-009' },
        { type: 'adr', id: '033', rawText: 'ADR-033' },
        { type: 'feature', id: '024', rawText: 'FEATURE-024' },
        { type: 'sprint', id: '2025-10-22-test', rawText: 'SPRINT-2025-10-22-test' }
      ];

      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/file.md'])); // All exist

      const validation = await validateReferences(refs);

      expect(validation.valid).toHaveLength(5);
      expect(validation.broken).toHaveLength(0);
    });
  });

  describe('getReferencedContent', () => {
    it('should load content from resolved reference', async () => {
      const resolved: ResolvedReference = {
        type: 'task',
        id: '006',
        rawText: 'TASK-006',
        filePath: '/project/backlog/items/TASK-006.md',
        exists: true
      };

      mockReadFile.mockResolvedValue('# Task Content\n\nDescription here');

      const content = await getReferencedContent(resolved);

      expect(content).toBe('# Task Content\n\nDescription here');
      expect(mockReadFile).toHaveBeenCalledWith(
        '/project/backlog/items/TASK-006.md',
        'utf-8'
      );
    });

    it('should return null for non-existent reference', async () => {
      const resolved: ResolvedReference = {
        type: 'task',
        id: '999',
        rawText: 'TASK-999',
        filePath: null,
        exists: false
      };

      const content = await getReferencedContent(resolved);

      expect(content).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      const resolved: ResolvedReference = {
        type: 'task',
        id: '006',
        rawText: 'TASK-006',
        filePath: '/project/backlog/items/TASK-006.md',
        exists: true
      };

      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const content = await getReferencedContent(resolved);

      expect(content).toBeNull();
    });
  });

  describe('getReferenceChain', () => {
    beforeEach(() => {
      mockLoadProjectConfig.mockResolvedValue({
        version: '1.0',
        project: { name: 'Test', type: 'single' },
        paths: {
          backlog: 'backlog',
          prds: 'docs/PRD',
          adrs: 'docs/adr',
          sprints: 'docs/sprints'
        },
        workMode: {
          default: 'think-build',
          documentationDepth: {
            'hack-ship': [],
            'think-build': [],
            'full-planning': []
          }
        },
        contextLoading: {
          progressive: true,
          maxDepth: 3,
          followReferences: true,
          priorityOrder: []
        }
      });
    });

    it('should follow reference chain', async () => {
      const sourceRef: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      // Mock TASK-006 file
      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob
        .mockResolvedValueOnce(['/project/backlog/items/TASK-006.md'])
        .mockResolvedValueOnce(['/project/backlog/items/FEATURE-024.md'])
        .mockResolvedValueOnce(['/project/docs/PRD/PRD-009.md']);

      mockReadFile
        .mockResolvedValueOnce('TASK-006 is part of FEATURE-024')
        .mockResolvedValueOnce('FEATURE-024 implements PRD-009')
        .mockResolvedValueOnce('PRD-009 defines configuration system');

      const chain = await getReferenceChain(sourceRef, 3);

      expect(chain.source).toBe('TASK-006');
      expect(chain.chain.length).toBeGreaterThan(0);
      expect(chain.depth).toBeGreaterThan(0);
    });

    it('should respect maxDepth limit', async () => {
      const sourceRef: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/file.md']));
      mockReadFile.mockResolvedValue('References: TASK-007 PRD-009 ADR-033');

      const chain = await getReferenceChain(sourceRef, 1);

      expect(chain.depth).toBeLessThanOrEqual(1);
    });

    it('should detect circular references', async () => {
      const sourceRef: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob
        .mockResolvedValueOnce(['/project/backlog/items/TASK-006.md'])
        .mockResolvedValueOnce(['/project/backlog/items/TASK-007.md']);

      // Create circular reference: TASK-006 → TASK-007 → TASK-006
      mockReadFile
        .mockResolvedValueOnce('References TASK-007')
        .mockResolvedValueOnce('References TASK-006');

      const chain = await getReferenceChain(sourceRef, 5);

      // Should not infinite loop, should detect cycle
      expect(chain).toBeDefined();
      expect(chain.depth).toBeLessThan(5);
    });

    it('should handle references without further links', async () => {
      const sourceRef: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockResolveProjectPath.mockResolvedValue('/project');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/backlog/items/TASK-006.md']));
      mockReadFile.mockResolvedValueOnce('Simple task with no references');

      const chain = await getReferenceChain(sourceRef, 3);

      expect(chain.source).toBe('TASK-006');
      expect(chain.chain.length).toBe(1); // Only the source itself
    });
  });

  describe('formatReferenceChain', () => {
    it('should format chain with multiple references', () => {
      const chain = {
        source: 'TASK-006',
        chain: [
          {
            type: 'feature' as const,
            id: '024',
            rawText: 'FEATURE-024',
            filePath: '/path',
            exists: true
          },
          {
            type: 'prd' as const,
            id: '009',
            rawText: 'PRD-009',
            filePath: '/path',
            exists: true
          },
          {
            type: 'adr' as const,
            id: '037',
            rawText: 'ADR-037',
            filePath: '/path',
            exists: true
          }
        ],
        depth: 3
      };

      const formatted = formatReferenceChain(chain);

      expect(formatted).toBe('TASK-006 → FEATURE-024 → PRD-009 → ADR-037');
    });

    it('should format chain with single reference', () => {
      const chain = {
        source: 'TASK-006',
        chain: [],
        depth: 0
      };

      const formatted = formatReferenceChain(chain);

      expect(formatted).toBe('TASK-006');
    });
  });

  describe('getBacklinks', () => {
    beforeEach(() => {
      mockLoadProjectConfig.mockResolvedValue({
        version: '1.0',
        project: { name: 'Test', type: 'single' },
        paths: {
          backlog: 'backlog',
          prds: 'docs/PRD',
          adrs: 'docs/adr',
          sprints: 'docs/sprints',
          sessions: '.ginko/sessions'
        },
        workMode: {
          default: 'think-build',
          documentationDepth: {
            'hack-ship': [],
            'think-build': [],
            'full-planning': []
          }
        },
        contextLoading: {
          progressive: true,
          maxDepth: 3,
          followReferences: true,
          priorityOrder: []
        }
      });
    });

    it('should find backlinks to a reference', async () => {
      const targetRef: Reference = { type: 'prd', id: '009', rawText: 'PRD-009' };

      mockResolveProjectPath.mockResolvedValue('/project/docs');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, [
        '/project/backlog/items/TASK-006.md',
        '/project/backlog/items/TASK-010.md',
        '/project/docs/sprints/SPRINT-2025-10-22.md'
      ]));

      mockReadFile
        .mockResolvedValueOnce('Implements PRD-009 feature')
        .mockResolvedValueOnce('Also related to PRD-009')
        .mockResolvedValueOnce('No references here');

      const backlinks = await getBacklinks(targetRef);

      expect(backlinks).toHaveLength(2);
      expect(backlinks).toContain('/project/backlog/items/TASK-006.md');
      expect(backlinks).toContain('/project/backlog/items/TASK-010.md');
    });

    it('should handle no backlinks found', async () => {
      const targetRef: Reference = { type: 'prd', id: '999', rawText: 'PRD-999' };

      mockResolveProjectPath.mockResolvedValue('/project/docs');
      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/project/docs/file.md']));
      mockReadFile.mockResolvedValue('No references here');

      const backlinks = await getBacklinks(targetRef);

      expect(backlinks).toEqual([]);
    });

    it('should handle custom search paths', async () => {
      const targetRef: Reference = { type: 'task', id: '006', rawText: 'TASK-006' };

      mockGlob.mockImplementation((pattern: string, callback: any) => callback(null, ['/custom/path/doc.md']));
      mockReadFile.mockResolvedValue('References TASK-006');

      const backlinks = await getBacklinks(targetRef, ['/custom/path']);

      expect(backlinks).toHaveLength(1);
      expect(backlinks[0]).toBe('/custom/path/doc.md');
    });

    it('should handle errors gracefully', async () => {
      const targetRef: Reference = { type: 'prd', id: '009', rawText: 'PRD-009' };

      mockLoadProjectConfig.mockRejectedValue(new Error('Config error'));

      const backlinks = await getBacklinks(targetRef);

      expect(backlinks).toEqual([]);
    });
  });

  describe('getReferencesFromFile', () => {
    it('should extract references from file', async () => {
      mockReadFile.mockResolvedValue('Fixed TASK-006 per PRD-009');

      const refs = await getReferencesFromFile('/path/to/file.md');

      expect(refs).toHaveLength(2);
      expect(refs[0].rawText).toBe('TASK-006');
      expect(refs[1].rawText).toBe('PRD-009');
    });

    it('should handle file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const refs = await getReferencesFromFile('/path/to/missing.md');

      expect(refs).toEqual([]);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle references in various markdown formats', () => {
      const text = `
        # Heading with TASK-006

        - List item with PRD-009
        - Another with ADR-033

        > Quote with FEATURE-024

        \`\`\`
        Code block with TASK-007 (should be extracted)
        \`\`\`

        [Link to SPRINT-2025-10-22-test](./sprint.md)
      `;

      const refs = extractReferences(text);

      expect(refs.length).toBeGreaterThanOrEqual(5);
      expect(refs.some(r => r.rawText === 'TASK-006')).toBe(true);
      expect(refs.some(r => r.rawText === 'PRD-009')).toBe(true);
    });

    it('should handle case sensitivity correctly', () => {
      // Reference patterns are case-sensitive (TASK not task)
      const text = 'TASK-006 is valid but task-007 is not';
      const refs = extractReferences(text);

      expect(refs).toHaveLength(1);
      expect(refs[0].rawText).toBe('TASK-006');
    });

    it('should maintain extraction accuracy >99%', () => {
      // Test with 100 references
      const validRefs = Array.from({ length: 100 }, (_, i) =>
        `TASK-${String(i).padStart(3, '0')}`
      ).join(' ');

      const refs = extractReferences(validRefs);

      // Should extract all 100 references (>99% accuracy)
      expect(refs.length).toBe(100);
    });
  });
});
