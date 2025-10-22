/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-22
 * @tags: [test, unit, config-loader, adr-037, two-tier]
 * @related: [config-loader.ts, config.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  loadProjectConfig,
  loadLocalConfig,
  resolveProjectPath,
  getAllPaths,
  validateConfiguration,
  invalidateConfigCache,
  getProjectRoot
} from '../../src/utils/config-loader.js';
import { GinkoConfig, LocalConfig, DEFAULT_GINKO_CONFIG } from '../../src/types/config.js';

describe('config-loader', () => {
  let tempDir: string;
  let projectRoot: string;
  let ginkoDir: string;
  let originalCwd: string;

  const mockGinkoConfig: GinkoConfig = {
    ...DEFAULT_GINKO_CONFIG,
    project: {
      name: 'TestProject',
      type: 'single'
    },
    paths: {
      docs: 'docs',
      sprints: 'docs/sprints',
      currentSprint: 'docs/sprints/CURRENT-SPRINT.md',
      prds: 'docs/PRD',
      adrs: 'docs/adr',
      sessions: '.ginko/sessions',
      context: '.ginko/context/modules'
    }
  };

  const mockLocalConfig: LocalConfig = {
    projectRoot: '',  // Will be set to tempDir
    userEmail: 'test@example.com',
    userSlug: 'test-at-example-com',
    workMode: 'think-build'
  };

  beforeEach(async () => {
    // Save original CWD
    originalCwd = process.cwd();

    // Create temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-loader-test-'));
    // Resolve realpath to handle macOS /var vs /private/var symlink
    tempDir = await fs.realpath(tempDir);
    projectRoot = tempDir;
    ginkoDir = path.join(tempDir, '.ginko');

    // Create .ginko directory
    await fs.ensureDir(ginkoDir);
    await fs.ensureDir(path.join(ginkoDir, 'sessions'));
    await fs.ensureDir(path.join(ginkoDir, 'context', 'modules'));

    // Change to temp directory so findGinkoRoot finds the test directory
    process.chdir(tempDir);

    // Clear config cache before each test
    invalidateConfigCache();

    // Update mockLocalConfig with actual temp directory
    mockLocalConfig.projectRoot = tempDir;
  });

  afterEach(async () => {
    // Restore original CWD
    process.chdir(originalCwd);

    // Cleanup temp directory
    await fs.remove(tempDir);
    invalidateConfigCache();
  });

  describe('loadProjectConfig', () => {
    it('should load ginko.json from project root', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);

      const config = await loadProjectConfig();

      expect(config).toEqual(mockGinkoConfig);
      expect(config.project.name).toBe('TestProject');
      expect(config.paths.currentSprint).toBe('docs/sprints/CURRENT-SPRINT.md');
    });

    it('should return default config if ginko.json does not exist', async () => {
      // ginko.json doesn't exist, but .ginko directory does
      const config = await loadProjectConfig();

      expect(config.paths).toEqual(DEFAULT_GINKO_CONFIG.paths);
      expect(config.project.name).toContain('config-loader-test-');
    });

    it('should validate ginko.json structure', async () => {
      // Write invalid config (missing required fields)
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), { version: '1.0' });

      await expect(loadProjectConfig()).rejects.toThrow('Invalid ginko.json structure');
    });

    it('should cache config for subsequent calls', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);

      const config1 = await loadProjectConfig();
      const config2 = await loadProjectConfig();

      expect(config1).toEqual(config2);
      // Both should return same object reference (cached)
      expect(config1).toBe(config2);
    });

    it('should reload after cache invalidation', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);

      const config1 = await loadProjectConfig();
      invalidateConfigCache();
      const config2 = await loadProjectConfig();

      expect(config1).toEqual(config2);
    });
  });

  describe('loadLocalConfig', () => {
    it('should load local.json from .ginko directory', async () => {
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      const config = await loadLocalConfig();

      expect(config).toEqual(mockLocalConfig);
      expect(config.projectRoot).toBe(tempDir);
      expect(config.userEmail).toBe('test@example.com');
      expect(config.userSlug).toBe('test-at-example-com');
    });

    it('should create local.json if it does not exist', async () => {
      const config = await loadLocalConfig();

      // Use path.resolve to normalize paths (handles /var vs /private/var on macOS)
      expect(path.resolve(config.projectRoot)).toBe(path.resolve(tempDir));
      expect(config.userSlug).toMatch(/-at-/);

      // Verify file was created
      const localJsonPath = path.join(ginkoDir, 'local.json');
      expect(await fs.pathExists(localJsonPath)).toBe(true);

      const fileContent = await fs.readJSON(localJsonPath);
      expect(path.resolve(fileContent.projectRoot)).toBe(path.resolve(tempDir));
    });

    it('should validate local.json structure', async () => {
      // Write invalid config (missing required fields)
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), { projectRoot: tempDir });

      await expect(loadLocalConfig()).rejects.toThrow('Invalid local.json structure');
    });

    it('should cache config for subsequent calls', async () => {
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      const config1 = await loadLocalConfig();
      const config2 = await loadLocalConfig();

      expect(config1).toEqual(config2);
      expect(config1).toBe(config2);
    });
  });

  describe('resolveProjectPath', () => {
    beforeEach(async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);
    });

    it('should resolve path key to absolute path', async () => {
      const absolutePath = await resolveProjectPath('currentSprint');

      expect(absolutePath).toBe(
        path.resolve(tempDir, 'docs/sprints/CURRENT-SPRINT.md')
      );
      expect(path.isAbsolute(absolutePath)).toBe(true);
    });

    it('should resolve relative path directly', async () => {
      const absolutePath = await resolveProjectPath('custom/path/file.md');

      expect(absolutePath).toBe(
        path.resolve(tempDir, 'custom/path/file.md')
      );
      expect(path.isAbsolute(absolutePath)).toBe(true);
    });

    it('should handle Windows-style paths correctly', async () => {
      const absolutePath = await resolveProjectPath('docs\\sprints\\file.md');

      // Node's path.resolve normalizes path separators
      expect(absolutePath).toContain('docs');
      expect(absolutePath).toContain('sprints');
      expect(absolutePath).toContain('file.md');
      expect(path.isAbsolute(absolutePath)).toBe(true);
    });

    it('should resolve nested path keys', async () => {
      const absolutePath = await resolveProjectPath('sessions');

      expect(absolutePath).toBe(
        path.resolve(tempDir, '.ginko/sessions')
      );
    });

    it('should handle paths with .. (parent directory)', async () => {
      const absolutePath = await resolveProjectPath('docs/../test.md');

      expect(absolutePath).toBe(path.resolve(tempDir, 'test.md'));
    });
  });

  describe('getAllPaths', () => {
    beforeEach(async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);
    });

    it('should return all configured paths as absolute', async () => {
      const allPaths = await getAllPaths();

      expect(allPaths.docs).toBe(path.resolve(tempDir, 'docs'));
      expect(allPaths.sprints).toBe(path.resolve(tempDir, 'docs/sprints'));
      expect(allPaths.currentSprint).toBe(
        path.resolve(tempDir, 'docs/sprints/CURRENT-SPRINT.md')
      );
      expect(allPaths.sessions).toBe(path.resolve(tempDir, '.ginko/sessions'));

      // All should be absolute
      Object.values(allPaths).forEach(p => {
        expect(path.isAbsolute(p)).toBe(true);
      });
    });

    it('should contain all path keys from config', async () => {
      const allPaths = await getAllPaths();

      expect(Object.keys(allPaths)).toEqual(
        expect.arrayContaining(['docs', 'sprints', 'currentSprint', 'prds', 'adrs', 'sessions'])
      );
    });
  });

  describe('validateConfiguration', () => {
    it('should return valid when configs are correct', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      // Create required paths
      await fs.ensureDir(path.join(tempDir, '.ginko/sessions'));
      await fs.ensureDir(path.join(tempDir, '.ginko/context/modules'));

      const result = await validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return warnings for missing paths', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      // Remove the paths that were created in beforeEach
      await fs.remove(path.join(tempDir, '.ginko/sessions'));
      await fs.remove(path.join(tempDir, '.ginko/context'));

      const result = await validateConfiguration();

      expect(result.valid).toBe(true); // Still valid, just warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('does not exist');
    });

    it('should return errors if config loading fails', async () => {
      // Don't create any config files and no .ginko directory
      await fs.remove(ginkoDir);

      const result = await validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('invalidateConfigCache', () => {
    it('should clear cache forcing reload on next call', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);

      const config1 = await loadProjectConfig();
      invalidateConfigCache();

      // Modify config file
      const updatedConfig = { ...mockGinkoConfig, project: { ...mockGinkoConfig.project, name: 'UpdatedProject' } };
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), updatedConfig);

      const config2 = await loadProjectConfig();

      expect(config1.project.name).toBe('TestProject');
      expect(config2.project.name).toBe('UpdatedProject');
    });
  });

  describe('getProjectRoot', () => {
    it('should return project root path', async () => {
      const root = await getProjectRoot();

      expect(path.resolve(root)).toBe(path.resolve(tempDir));
      expect(path.isAbsolute(root)).toBe(true);
    });

    it('should throw error if not in ginko project', async () => {
      // Remove .ginko directory
      await fs.remove(ginkoDir);
      invalidateConfigCache();

      await expect(getProjectRoot()).rejects.toThrow('Ginko not initialized');
    });

    it('should use cached value on subsequent calls', async () => {
      const root1 = await getProjectRoot();
      const root2 = await getProjectRoot();

      expect(root1).toBe(root2);
      expect(path.resolve(root1)).toBe(path.resolve(tempDir));
    });
  });

  describe('cross-platform path resolution', () => {
    beforeEach(async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);
    });

    it('should handle forward slashes on all platforms', async () => {
      const absolutePath = await resolveProjectPath('docs/sprints/file.md');

      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath).toContain('docs');
      expect(absolutePath).toContain('sprints');
      expect(absolutePath).toContain('file.md');
    });

    it('should handle backslashes on all platforms', async () => {
      const absolutePath = await resolveProjectPath('docs\\sprints\\file.md');

      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath).toContain('docs');
      expect(absolutePath).toContain('sprints');
      expect(absolutePath).toContain('file.md');
    });

    it('should produce absolute paths with platform-correct separators', async () => {
      const absolutePath = await resolveProjectPath('sessions');

      // Verify it's an absolute path
      expect(path.isAbsolute(absolutePath)).toBe(true);

      // Verify it uses platform-appropriate separators
      const expected = path.resolve(tempDir, '.ginko/sessions');
      expect(absolutePath).toBe(expected);
    });

    it('should handle mixed separators', async () => {
      const absolutePath = await resolveProjectPath('docs/sub\\folder/file.md');

      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath).toContain('docs');
      expect(absolutePath).toContain('folder');
      expect(absolutePath).toContain('file.md');
    });
  });

  describe('performance - config caching', () => {
    it('should load configs quickly with caching', async () => {
      await fs.writeJSON(path.join(tempDir, 'ginko.json'), mockGinkoConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      // First call - loads from disk
      await loadProjectConfig();
      await loadLocalConfig();

      // Second call - should use cache
      const startTime = Date.now();
      await loadProjectConfig();
      await loadLocalConfig();
      await getAllPaths();
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10); // Should be nearly instant with cache
    });
  });

  describe('backward compatibility', () => {
    it('should work when only .ginko directory exists (no ginko.json)', async () => {
      // Don't create ginko.json
      const config = await loadProjectConfig();

      expect(config.paths).toEqual(DEFAULT_GINKO_CONFIG.paths);
    });

    it('should create local.json automatically if missing', async () => {
      // Don't create local.json
      const config = await loadLocalConfig();

      expect(path.resolve(config.projectRoot)).toBe(path.resolve(tempDir));

      // Verify file was created
      const localJsonPath = path.join(ginkoDir, 'local.json');
      expect(await fs.pathExists(localJsonPath)).toBe(true);
    });

    it('should handle projects with custom directory structures', async () => {
      const customConfig: GinkoConfig = {
        ...DEFAULT_GINKO_CONFIG,
        project: { name: 'CustomProject', type: 'monorepo' },
        paths: {
          documentation: 'documentation',
          sprints: 'documentation/planning/sprints',
          currentSprint: 'documentation/planning/sprints/CURRENT.md',
          prds: 'documentation/requirements',
          adrs: 'documentation/decisions',
          sessions: '.context/sessions',
          context: '.context/modules'
        }
      };

      await fs.writeJSON(path.join(tempDir, 'ginko.json'), customConfig);
      await fs.writeJSON(path.join(ginkoDir, 'local.json'), mockLocalConfig);

      const allPaths = await getAllPaths();

      expect(allPaths.documentation).toBe(path.resolve(tempDir, 'documentation'));
      expect(allPaths.prds).toBe(path.resolve(tempDir, 'documentation/requirements'));
      expect(allPaths.sessions).toBe(path.resolve(tempDir, '.context/sessions'));
    });
  });
});
