/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, config-loader, singleton, caching, unit-test]
 * @related: [../../../src/core/config/config-loader.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [assert, fs, path, os]
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigLoader,
  ConfigLoadError,
  ConfigLoaderUtils,
  LoaderOptions,
  LoadResult
} from '../../../src/core/config/config-loader.js';
import {
  GinkoConfig,
  DEFAULT_CONFIG,
  ConfigValidationError
} from '../../../src/core/config/config-schema.js';

/**
 * Test Suite: Configuration Loader
 */
describe('ConfigLoader', () => {
  let tempDir: string;
  let testConfigPath: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-test-'));
    testConfigPath = path.join(tempDir, 'ginko.json');

    // Reset singleton for each test
    ConfigLoader.reset();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const loader1 = ConfigLoader.getInstance();
      const loader2 = ConfigLoader.getInstance();
      assert.strictEqual(loader1, loader2);
    });

    it('should reset properly', () => {
      const loader1 = ConfigLoader.getInstance();
      ConfigLoader.reset();
      const loader2 = ConfigLoader.getInstance();
      assert.notStrictEqual(loader1, loader2);
    });
  });

  describe('Loading from File', () => {
    it('should load valid configuration file', async () => {
      const testConfig: GinkoConfig = {
        ...DEFAULT_CONFIG,
        features: { ...DEFAULT_CONFIG.features, testFeature: true }
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      assert.strictEqual(result.fromFile, true);
      assert.strictEqual(result.config.features.testFeature, true);
      assert.strictEqual(result.warnings.length, 0);
    });

    it('should handle missing configuration file gracefully', async () => {
      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      assert.strictEqual(result.fromFile, false);
      assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
      assert.strictEqual(result.warnings.length > 0, true);
      assert.strictEqual(result.warnings[0].includes('Configuration file not found'), true);
    });

    it('should handle invalid JSON', async () => {
      await fs.writeFile(testConfigPath, '{ invalid json }');

      const loader = ConfigLoader.getInstance();

      await assert.rejects(
        async () => loader.load({ projectRoot: tempDir }),
        ConfigLoadError
      );
    });

    it('should handle validation errors based on strictness', async () => {
      const invalidConfig = { version: 'invalid', paths: {}, features: {} };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const loader = ConfigLoader.getInstance();

      // Strict validation should throw
      await assert.rejects(
        async () => loader.load({ projectRoot: tempDir, validation: 'strict' }),
        ConfigValidationError
      );

      // Loose validation should warn
      const result = await loader.load({
        projectRoot: tempDir,
        validation: 'loose',
        forceReload: true
      });
      assert.strictEqual(result.warnings.length > 0, true);
    });

    it('should skip validation when requested', async () => {
      const invalidConfig = { version: 'invalid' };
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({
        projectRoot: tempDir,
        validation: 'none'
      });

      // Should not fail validation
      assert.strictEqual(result.fromFile, true);
    });
  });

  describe('Configuration Merging', () => {
    it('should merge user config with defaults', async () => {
      const partialConfig = {
        version: '1.0.0',
        paths: {
          docs: { custom: './custom-docs' },
          ginko: { custom: './custom-ginko' }
        },
        features: { customFeature: true }
      };

      await fs.writeFile(testConfigPath, JSON.stringify(partialConfig));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      // Should have defaults
      assert.strictEqual(result.config.paths.docs.root, DEFAULT_CONFIG.paths.docs.root);
      assert.strictEqual(result.config.features.autoHandoff, DEFAULT_CONFIG.features.autoHandoff);

      // Should have user customizations
      assert.strictEqual(result.config.paths.docs.custom, './custom-docs');
      assert.strictEqual(result.config.features.customFeature, true);
    });
  });

  describe('Platform Detection', () => {
    it('should detect platform configuration', async () => {
      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      assert.strictEqual(typeof result.config.platform?.type, 'string');
      assert.strictEqual(typeof result.config.platform?.shell, 'string');
      assert.strictEqual(typeof result.config.platform?.homeDirectory, 'string');
    });

    it('should preserve user platform configuration', async () => {
      const configWithPlatform = {
        ...DEFAULT_CONFIG,
        platform: {
          type: 'linux' as const,
          shell: 'bash' as const,
          pathSeparator: '/' as const,
          homeDirectory: '/custom/home'
        }
      };

      await fs.writeFile(testConfigPath, JSON.stringify(configWithPlatform));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      assert.strictEqual(result.config.platform?.homeDirectory, '/custom/home');
    });
  });

  describe('Caching', () => {
    it('should cache loaded configuration', async () => {
      const testConfig = { ...DEFAULT_CONFIG };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const loader = ConfigLoader.getInstance();

      const result1 = await loader.load({ projectRoot: tempDir });
      const result2 = await loader.load({ projectRoot: tempDir });

      // Should be same object (cached)
      assert.strictEqual(result1, result2);
    });

    it('should force reload when requested', async () => {
      const testConfig = { ...DEFAULT_CONFIG, features: { test: true } };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const loader = ConfigLoader.getInstance();

      const result1 = await loader.load({ projectRoot: tempDir });

      // Modify file
      const modifiedConfig = { ...testConfig, features: { test: false } };
      await fs.writeFile(testConfigPath, JSON.stringify(modifiedConfig));

      // Load without force reload - should get cached version
      const result2 = await loader.load({ projectRoot: tempDir });
      assert.strictEqual(result1, result2);

      // Load with force reload - should get new version
      const result3 = await loader.load({ projectRoot: tempDir, forceReload: true });
      assert.notStrictEqual(result1, result3);
      assert.strictEqual(result3.config.features.test, false);
    });

    it('should invalidate cache manually', async () => {
      const loader = ConfigLoader.getInstance();
      await loader.load({ projectRoot: tempDir });

      const stats1 = loader.getStats();
      assert.strictEqual(stats1.cached, true);

      loader.invalidateCache();

      const stats2 = loader.getStats();
      assert.strictEqual(stats2.cached, false);
    });
  });

  describe('Migration Support', () => {
    it('should trigger migration for old config', async () => {
      const oldConfig = {
        // No version = needs migration
        paths: { docs: {}, ginko: {} },
        features: {}
      };

      await fs.writeFile(testConfigPath, JSON.stringify(oldConfig));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({
        projectRoot: tempDir,
        autoMigrate: true
      });

      assert.strictEqual(result.migrated, true);
      assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
    });

    it('should skip migration when disabled', async () => {
      const oldConfig = { paths: {}, features: {} };
      await fs.writeFile(testConfigPath, JSON.stringify(oldConfig));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({
        projectRoot: tempDir,
        autoMigrate: false
      });

      assert.strictEqual(result.migrated, false);
    });
  });

  describe('Saving Configuration', () => {
    it('should save configuration to file', async () => {
      const loader = ConfigLoader.getInstance();
      const testConfig: GinkoConfig = {
        ...DEFAULT_CONFIG,
        features: { ...DEFAULT_CONFIG.features, testSave: true }
      };

      await loader.save(testConfig, { projectRoot: tempDir });

      // Verify file was created
      const exists = await loader.exists({ projectRoot: tempDir });
      assert.strictEqual(exists, true);

      // Verify content
      const content = await fs.readFile(testConfigPath, 'utf-8');
      const parsed = JSON.parse(content);
      assert.strictEqual(parsed.features.testSave, true);
    });

    it('should update metadata on save', async () => {
      const loader = ConfigLoader.getInstance();
      const testConfig: GinkoConfig = { ...DEFAULT_CONFIG };

      await loader.save(testConfig, { projectRoot: tempDir });

      const content = await fs.readFile(testConfigPath, 'utf-8');
      const parsed = JSON.parse(content);

      assert.strictEqual(typeof parsed.metadata.updatedAt, 'string');
      assert.strictEqual(typeof parsed.metadata.updatedBy, 'string');
    });

    it('should validate before saving', async () => {
      const loader = ConfigLoader.getInstance();
      const invalidConfig = {} as GinkoConfig; // Invalid config

      await assert.rejects(
        async () => loader.save(invalidConfig, { projectRoot: tempDir }),
        ConfigValidationError
      );
    });

    it('should clear cache after save', async () => {
      const loader = ConfigLoader.getInstance();

      // Load and cache
      await loader.load({ projectRoot: tempDir });
      assert.strictEqual(loader.getStats().cached, true);

      // Save should clear cache
      await loader.save(DEFAULT_CONFIG, { projectRoot: tempDir });
      assert.strictEqual(loader.getStats().cached, false);
    });
  });

  describe('Initialization', () => {
    it('should initialize new configuration', async () => {
      const loader = ConfigLoader.getInstance();
      const result = await loader.initialize({ projectRoot: tempDir });

      assert.strictEqual(result.fromFile, true);
      assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);

      // Verify file exists
      const exists = await loader.exists({ projectRoot: tempDir });
      assert.strictEqual(exists, true);
    });

    it('should not overwrite existing configuration', async () => {
      // Create existing file
      await fs.writeFile(testConfigPath, '{}');

      const loader = ConfigLoader.getInstance();

      await assert.rejects(
        async () => loader.initialize({ projectRoot: tempDir }),
        ConfigLoadError
      );
    });
  });

  describe('Path Resolution Integration', () => {
    it('should create working path resolver', async () => {
      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      const resolved = result.resolver.resolve('${docs.root}/test');
      assert.strictEqual(resolved.success, true);
      assert.strictEqual(resolved.resolved.includes('docs'), true);
    });

    it('should resolve paths with custom configuration', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        paths: {
          docs: { root: './custom-docs', adr: '${docs.root}/decisions' },
          ginko: { root: './custom-ginko' }
        }
      };

      await fs.writeFile(testConfigPath, JSON.stringify(customConfig));

      const loader = ConfigLoader.getInstance();
      const result = await loader.load({ projectRoot: tempDir });

      const resolved = result.resolver.resolve('${docs.adr}/test.md');
      assert.strictEqual(resolved.success, true);
      assert.strictEqual(resolved.resolved.includes('custom-docs'), true);
      assert.strictEqual(resolved.resolved.includes('decisions'), true);
    });
  });

  describe('Error Handling', () => {
    it('should handle directory creation failure', async () => {
      // Try to save to read-only location (this might not work on all systems)
      const loader = ConfigLoader.getInstance();

      // Use invalid path
      const invalidPath = '\0invalid';

      await assert.rejects(
        async () => loader.save(DEFAULT_CONFIG, {
          projectRoot: invalidPath,
          configFileName: 'ginko.json'
        }),
        ConfigLoadError
      );
    });

    it('should handle concurrent loading', async () => {
      const loader = ConfigLoader.getInstance();

      // Start multiple loads concurrently
      const promises = Array(5).fill(0).map(() =>
        loader.load({ projectRoot: tempDir })
      );

      const results = await Promise.all(promises);

      // All should get the same result
      results.forEach(result => {
        assert.strictEqual(result, results[0]);
      });
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const loader = ConfigLoader.getInstance();

      // Initially no cache
      const stats1 = loader.getStats();
      assert.strictEqual(stats1.cached, false);

      // After loading
      const result = await loader.load({ projectRoot: tempDir });
      const stats2 = loader.getStats();

      assert.strictEqual(stats2.cached, true);
      assert.strictEqual(stats2.fromFile, result.fromFile);
      assert.strictEqual(typeof stats2.loadedAt, 'object');
    });
  });
});

/**
 * ConfigLoaderUtils Tests
 */
describe('ConfigLoaderUtils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-utils-test-'));
    ConfigLoader.reset();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('quickLoad', () => {
    it('should load configuration quickly', async () => {
      const config = await ConfigLoaderUtils.quickLoad(tempDir);
      assert.strictEqual(config.version, DEFAULT_CONFIG.version);
    });
  });

  describe('getResolvedPath', () => {
    it('should resolve path from configuration', async () => {
      const path = await ConfigLoaderUtils.getResolvedPath('docs.root', tempDir);
      assert.strictEqual(typeof path, 'string');
      assert.strictEqual(path.includes('docs'), true);
    });

    it('should handle invalid path keys', async () => {
      await assert.rejects(
        async () => ConfigLoaderUtils.getResolvedPath('invalid', tempDir),
        Error
      );

      await assert.rejects(
        async () => ConfigLoaderUtils.getResolvedPath('invalid.path', tempDir),
        Error
      );
    });
  });

  describe('isFeatureEnabled', () => {
    it('should check feature flags', async () => {
      const enabled = await ConfigLoaderUtils.isFeatureEnabled('autoHandoff', tempDir);
      assert.strictEqual(typeof enabled, 'boolean');
    });

    it('should return false for unknown features', async () => {
      const enabled = await ConfigLoaderUtils.isFeatureEnabled('unknownFeature', tempDir);
      assert.strictEqual(enabled, false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration values', async () => {
      // Create initial config file
      const testConfigPath = path.join(tempDir, 'ginko.json');
      await fs.writeFile(testConfigPath, JSON.stringify(DEFAULT_CONFIG));

      await ConfigLoaderUtils.updateConfig({
        features: { testUpdate: true }
      }, tempDir);

      // Verify update
      const content = await fs.readFile(testConfigPath, 'utf-8');
      const config = JSON.parse(content);
      assert.strictEqual(config.features.testUpdate, true);
    });
  });
});

/**
 * Integration Tests
 */
describe('ConfigLoader Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-integration-'));
    ConfigLoader.reset();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should work with complex configuration workflow', async () => {
    const loader = ConfigLoader.getInstance();

    // 1. Initialize new configuration
    const initResult = await loader.initialize({ projectRoot: tempDir });
    assert.strictEqual(initResult.fromFile, true);

    // 2. Load and verify
    const loadResult = await loader.load({ projectRoot: tempDir, forceReload: true });
    assert.strictEqual(loadResult.config.version, DEFAULT_CONFIG.version);

    // 3. Update configuration
    const updatedConfig = {
      ...loadResult.config,
      features: { ...loadResult.config.features, integrationTest: true }
    };
    await loader.save(updatedConfig, { projectRoot: tempDir });

    // 4. Reload and verify update
    const finalResult = await loader.load({ projectRoot: tempDir, forceReload: true });
    assert.strictEqual(finalResult.config.features.integrationTest, true);

    // 5. Test path resolution
    const resolved = finalResult.resolver.resolve('${ginko.root}/test');
    assert.strictEqual(resolved.success, true);
  });

  it('should handle migration workflow', async () => {
    // Create old format config
    const oldConfig = {
      paths: { docs: { root: './docs' }, ginko: { root: './.ginko' } },
      features: { oldFeature: true }
    };

    const configPath = path.join(tempDir, 'ginko.json');
    await fs.writeFile(configPath, JSON.stringify(oldConfig));

    const loader = ConfigLoader.getInstance();
    const result = await loader.load({
      projectRoot: tempDir,
      autoMigrate: true
    });

    assert.strictEqual(result.migrated, true);
    assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
    assert.strictEqual(result.config.features.oldFeature, true);
  });
});

/**
 * Test runner for environments without a test framework
 */
if (require.main === module) {
  console.log('Running config-loader tests...');

  const runTests = async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-test-'));

    try {
      const tests = [
        async () => {
          console.log('✓ Singleton pattern test');
          ConfigLoader.reset();
          const loader1 = ConfigLoader.getInstance();
          const loader2 = ConfigLoader.getInstance();
          assert.strictEqual(loader1, loader2);
        },
        async () => {
          console.log('✓ Load default configuration test');
          ConfigLoader.reset();
          const loader = ConfigLoader.getInstance();
          const result = await loader.load({ projectRoot: tempDir });
          assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
        },
        async () => {
          console.log('✓ Save configuration test');
          ConfigLoader.reset();
          const loader = ConfigLoader.getInstance();
          await loader.save(DEFAULT_CONFIG, { projectRoot: tempDir });
          const exists = await loader.exists({ projectRoot: tempDir });
          assert.strictEqual(exists, true);
        },
        async () => {
          console.log('✓ Utils quick load test');
          ConfigLoader.reset();
          const config = await ConfigLoaderUtils.quickLoad(tempDir);
          assert.strictEqual(config.version, DEFAULT_CONFIG.version);
        }
      ];

      for (const test of tests) {
        try {
          await test();
        } catch (error) {
          console.error('✗ Test failed:', error);
          process.exit(1);
        }
      }

      console.log('✓ All config-loader tests passed!');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };

  runTests().catch(console.error);
}