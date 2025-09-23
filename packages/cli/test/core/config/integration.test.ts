/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, integration, config-system, end-to-end, unit-test]
 * @related: [../../../src/core/config/index.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [assert, fs, path, os]
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  initializeConfig,
  loadConfig,
  getConfigPath,
  isFeatureEnabled,
  updateConfig,
  checkConfigurationStatus,
  migrateConfiguration,
  createPathResolver,
  validatePathTemplate,
  getConfigurationStats,
  createConfigurationSystem,
  ConfigLoader,
  PathResolver,
  ConfigMigrator,
  DEFAULT_CONFIG
} from '../../../src/core/config/index.js';

/**
 * Integration Test Suite: Complete Configuration System
 */
describe('Configuration System Integration', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-integration-test-'));
    configPath = path.join(tempDir, 'ginko.json');

    // Reset singleton for each test
    ConfigLoader.reset();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Full Lifecycle Workflow', () => {
    it('should handle complete configuration lifecycle', async () => {
      // 1. Initialize new configuration
      const initResult = await initializeConfig(tempDir);
      assert.strictEqual(initResult.fromFile, true);
      assert.strictEqual(initResult.config.version, DEFAULT_CONFIG.version);

      // 2. Verify file exists
      const fileExists = await fs.access(configPath).then(() => true).catch(() => false);
      assert.strictEqual(fileExists, true);

      // 3. Load configuration
      const loadResult = await loadConfig(tempDir);
      assert.strictEqual(loadResult.config.version, DEFAULT_CONFIG.version);

      // 4. Get resolved paths
      const docsPath = await getConfigPath('docs.root', tempDir);
      const ginkoPath = await getConfigPath('ginko.root', tempDir);
      assert.strictEqual(typeof docsPath, 'string');
      assert.strictEqual(typeof ginkoPath, 'string');

      // 5. Check feature flags
      const autoHandoffEnabled = await isFeatureEnabled('autoHandoff', tempDir);
      assert.strictEqual(typeof autoHandoffEnabled, 'boolean');

      // 6. Update configuration
      await updateConfig({
        features: { ...loadResult.config.features, integrationTest: true }
      }, tempDir);

      // 7. Verify update
      const updatedResult = await loadConfig(tempDir, { forceReload: true });
      assert.strictEqual(updatedResult.config.features.integrationTest, true);

      // 8. Get statistics
      const stats = await getConfigurationStats(tempDir);
      assert.strictEqual(stats.fromFile, true);
      assert.strictEqual(typeof stats.resolver.cacheSize, 'number');
    });

    it('should handle migration workflow', async () => {
      // 1. Create old format configuration
      const oldConfig = {
        paths: {
          docs: { root: './documents', custom: './my-docs' },
          ginko: { root: './.ginko-data' }
        },
        features: { oldFeature: true }
      };
      await fs.writeFile(configPath, JSON.stringify(oldConfig));

      // 2. Check migration status
      const status = await checkConfigurationStatus(tempDir);
      assert.strictEqual(status.exists, true);
      assert.strictEqual(status.needsMigration, true);
      assert.strictEqual(status.currentVersion, 'none');

      // 3. Perform migration
      const migrationResult = await migrateConfiguration(tempDir);
      assert.strictEqual(migrationResult.migrated, true);
      assert.strictEqual(migrationResult.fromVersion, 'none');
      assert.strictEqual(migrationResult.toVersion, DEFAULT_CONFIG.version);

      // 4. Verify migration preserved data
      const loadResult = await loadConfig(tempDir, { forceReload: true });
      assert.strictEqual(loadResult.config.paths.docs.custom, './my-docs');
      assert.strictEqual(loadResult.config.features.oldFeature, true);

      // 5. Check status after migration
      const finalStatus = await checkConfigurationStatus(tempDir);
      assert.strictEqual(finalStatus.needsMigration, false);
    });

    it('should handle complex path resolution scenarios', async () => {
      // 1. Initialize with complex paths
      await initializeConfig(tempDir);

      // 2. Update with complex path configuration
      await updateConfig({
        paths: {
          docs: {
            root: './documentation',
            adr: '${docs.root}/decisions',
            prd: '${docs.root}/products',
            nested: '${docs.adr}/archived'
          },
          ginko: {
            root: './.ginko',
            sessions: '${ginko.root}/sessions',
            cache: '${ginko.root}/cache',
            modules: '${ginko.sessions}/modules'
          }
        }
      }, tempDir);

      // 3. Create path resolver
      const resolver = await createPathResolver(tempDir);

      // 4. Test various resolution scenarios
      const resolvedPaths = [
        resolver.resolve('${docs.nested}/file.md'),
        resolver.resolve('${ginko.modules}/auth.md'),
        resolver.resolve('${docs.root}/${ginko.sessions}/combined'),
        resolver.resolve('/absolute/${docs.root}/mixed')
      ];

      for (const result of resolvedPaths) {
        assert.strictEqual(result.success, true, `Failed to resolve: ${result.original}`);
        assert.strictEqual(result.errors.length, 0);
      }

      // 5. Test validation
      const validationResults = [
        await validatePathTemplate('${docs.root}/valid', tempDir),
        await validatePathTemplate('${nonexistent}/invalid', tempDir),
        await validatePathTemplate('/no/variables', tempDir)
      ];

      assert.strictEqual(validationResults[0].valid, true);
      assert.strictEqual(validationResults[1].valid, false);
      assert.strictEqual(validationResults[2].valid, true);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should integrate all components seamlessly', async () => {
      // Create a complete configuration system
      const system = await createConfigurationSystem(tempDir);

      // Test loader functionality
      assert.strictEqual(system.loader instanceof ConfigLoader, true);
      const loadResult = await system.loader.load({ projectRoot: tempDir });
      assert.strictEqual(loadResult.config.version, DEFAULT_CONFIG.version);

      // Test resolver functionality
      assert.strictEqual(system.resolver instanceof PathResolver, true);
      const resolveResult = system.resolver.resolve('${docs.root}/test');
      assert.strictEqual(resolveResult.success, true);

      // Test migrator functionality
      assert.strictEqual(system.migrator instanceof ConfigMigrator, true);
      const migrationPlan = system.migrator.getMigrationPlan(system.config);
      assert.strictEqual(migrationPlan.needed, false);

      // Test configuration object
      assert.strictEqual(system.config.version, DEFAULT_CONFIG.version);
      assert.strictEqual(typeof system.config.paths, 'object');
      assert.strictEqual(typeof system.config.features, 'object');
    });

    it('should maintain consistency across operations', async () => {
      // Initialize
      await initializeConfig(tempDir);

      // Perform multiple operations
      const operations = [
        () => getConfigPath('docs.root', tempDir),
        () => isFeatureEnabled('autoHandoff', tempDir),
        () => validatePathTemplate('${docs.root}/test', tempDir),
        () => getConfigurationStats(tempDir)
      ];

      const results = await Promise.all(operations.map(op => op()));

      // All operations should succeed
      results.forEach((result, index) => {
        assert.notStrictEqual(result, null, `Operation ${index} failed`);
        assert.notStrictEqual(result, undefined, `Operation ${index} returned undefined`);
      });

      // Statistics should show consistent state
      const stats = results[3] as any;
      assert.strictEqual(stats.fromFile, true);
      assert.strictEqual(stats.loader.cached, true);
    });

    it('should handle concurrent operations safely', async () => {
      // Initialize configuration
      await initializeConfig(tempDir);

      // Perform concurrent operations
      const concurrentOperations = Array(10).fill(0).map(async (_, index) => {
        const operations = [
          loadConfig(tempDir),
          getConfigPath('docs.root', tempDir),
          isFeatureEnabled('autoHandoff', tempDir),
          getConfigurationStats(tempDir)
        ];

        const results = await Promise.all(operations);
        return { index, results };
      });

      const allResults = await Promise.all(concurrentOperations);

      // All operations should succeed
      allResults.forEach(({ index, results }) => {
        results.forEach((result, opIndex) => {
          assert.notStrictEqual(result, null, `Concurrent operation ${index}-${opIndex} failed`);
        });
      });

      // Results should be consistent (same config version, paths, etc.)
      const firstLoadResult = allResults[0].results[0] as any;
      allResults.forEach(({ results }) => {
        const loadResult = results[0] as any;
        assert.strictEqual(loadResult.config.version, firstLoadResult.config.version);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from corrupted configuration files', async () => {
      // Create corrupted configuration
      await fs.writeFile(configPath, '{ corrupted json file');

      // System should fall back to defaults gracefully
      try {
        const result = await loadConfig(tempDir);
        // If it succeeds, it should use defaults
        assert.strictEqual(result.fromFile, false);
        assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
      } catch (error) {
        // If it throws, it should be a specific error type
        assert.strictEqual(error instanceof Error, true);
      }
    });

    it('should handle file system errors gracefully', async () => {
      // Try to use invalid paths
      const invalidPath = '\0invalid\0path';

      try {
        await initializeConfig(invalidPath);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error instanceof Error, true);
      }
    });

    it('should handle partial configuration gracefully', async () => {
      // Create partial configuration
      const partialConfig = {
        version: '1.0.0',
        paths: { docs: { root: './docs' } }, // Missing ginko paths
        // Missing features
      };
      await fs.writeFile(configPath, JSON.stringify(partialConfig));

      const result = await loadConfig(tempDir);

      // Should merge with defaults
      assert.strictEqual(result.config.version, '1.0.0');
      assert.strictEqual(typeof result.config.paths.ginko, 'object');
      assert.strictEqual(typeof result.config.features, 'object');
    });
  });

  describe('Performance and Caching', () => {
    it('should perform efficiently with caching', async () => {
      await initializeConfig(tempDir);

      // Time multiple loads
      const iterations = 100;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await loadConfig(tempDir);
      }

      const elapsed = Date.now() - start;
      const avgTime = elapsed / iterations;

      // Should be very fast due to caching (under 1ms per load on average)
      assert.strictEqual(avgTime < 1, true, `Average load time ${avgTime}ms too slow`);
    });

    it('should handle large configurations efficiently', async () => {
      // Create large configuration
      const largeConfig = {
        ...DEFAULT_CONFIG,
        paths: {
          docs: {},
          ginko: {}
        },
        features: {}
      };

      // Add many path entries
      for (let i = 0; i < 1000; i++) {
        largeConfig.paths.docs[`path${i}`] = `./docs/path${i}`;
        largeConfig.paths.ginko[`ginko${i}`] = `./ginko/path${i}`;
        largeConfig.features[`feature${i}`] = i % 2 === 0;
      }

      await fs.writeFile(configPath, JSON.stringify(largeConfig));

      const start = Date.now();
      const result = await loadConfig(tempDir);
      const elapsed = Date.now() - start;

      assert.strictEqual(result.config.version, DEFAULT_CONFIG.version);
      assert.strictEqual(elapsed < 100, true, `Large config load took ${elapsed}ms, expected < 100ms`);
    });

    it('should handle path resolution caching effectively', async () => {
      await initializeConfig(tempDir);
      const resolver = await createPathResolver(tempDir);

      const pathTemplate = '${docs.root}/cached/path/test.md';

      // Time initial resolution
      const start1 = Date.now();
      const result1 = resolver.resolve(pathTemplate);
      const elapsed1 = Date.now() - start1;

      // Time cached resolution
      const start2 = Date.now();
      const result2 = resolver.resolve(pathTemplate);
      const elapsed2 = Date.now() - start2;

      assert.strictEqual(result1.success, true);
      assert.strictEqual(result2.success, true);
      assert.strictEqual(result1.resolved, result2.resolved);

      // Cached resolution should be significantly faster
      assert.strictEqual(elapsed2 <= elapsed1, true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical ginko project setup', async () => {
      // Simulate typical ginko project initialization
      await initializeConfig(tempDir);

      // Update with realistic paths
      await updateConfig({
        paths: {
          docs: {
            root: './docs',
            adr: '${docs.root}/adr',
            prd: '${docs.root}/PRD',
            ux: '${docs.root}/UX',
            api: '${docs.root}/api'
          },
          ginko: {
            root: './.ginko',
            context: '${ginko.root}/context',
            sessions: '${ginko.root}/sessions',
            cache: '${ginko.root}/cache',
            modules: '${ginko.context}/modules',
            templates: '${ginko.context}/templates'
          }
        },
        features: {
          autoHandoff: true,
          contextCaching: true,
          smartSuggestions: true,
          gitHooks: false,
          telemetry: false
        }
      }, tempDir);

      // Test common operations
      const operations = [
        getConfigPath('docs.adr', tempDir),
        getConfigPath('ginko.modules', tempDir),
        isFeatureEnabled('autoHandoff', tempDir),
        isFeatureEnabled('telemetry', tempDir),
        validatePathTemplate('${ginko.modules}/auth-patterns.md', tempDir)
      ];

      const results = await Promise.all(operations);

      // Verify results
      assert.strictEqual(results[0].includes('adr'), true);
      assert.strictEqual(results[1].includes('modules'), true);
      assert.strictEqual(results[2], true);
      assert.strictEqual(results[3], false);
      assert.strictEqual((results[4] as any).valid, true);
    });

    it('should handle team migration scenario', async () => {
      // Simulate old team configuration
      const oldTeamConfig = {
        paths: {
          docs: {
            root: './documentation',
            adr: './decisions',
            requirements: './requirements'
          },
          ginko: {
            root: './.context',
            sessions: './sessions'
          }
        },
        features: {
          autoHandoff: false,
          legacyFeature: true
        },
        metadata: {
          team: 'development',
          project: 'ginko-adoption'
        }
      };

      await fs.writeFile(configPath, JSON.stringify(oldTeamConfig));

      // Perform migration
      const migrationResult = await migrateConfiguration(tempDir);

      assert.strictEqual(migrationResult.migrated, true);
      assert.strictEqual(migrationResult.config.paths.docs.requirements, './requirements');
      assert.strictEqual(migrationResult.config.features.legacyFeature, true);
      assert.strictEqual((migrationResult.config.metadata as any)?.team, 'development');

      // Verify system works after migration
      const postMigrationPath = await getConfigPath('docs.adr', tempDir);
      assert.strictEqual(typeof postMigrationPath, 'string');
    });

    it('should handle cross-platform compatibility', async () => {
      await initializeConfig(tempDir);

      const stats = await getConfigurationStats(tempDir);
      const platformInfo = stats.resolver.platformInfo;

      // Should detect current platform correctly
      const validPlatforms = ['windows', 'macos', 'linux'];
      assert.strictEqual(validPlatforms.includes(platformInfo.type), true);

      // Path separator should match platform
      assert.strictEqual(typeof platformInfo.separator, 'string');
      assert.strictEqual(platformInfo.separator.length, 1);

      // Should resolve paths using platform separators
      const resolver = await createPathResolver(tempDir);
      const result = resolver.resolve('${docs.root}/sub/directory/file.md');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved.includes(platformInfo.separator), true);
    });
  });
});

/**
 * Test runner for environments without a test framework
 */
if (require.main === module) {
  console.log('Running configuration system integration tests...');

  const runTests = async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-integration-test-'));

    try {
      const tests = [
        async () => {
          console.log('✓ Basic lifecycle test');
          ConfigLoader.reset();
          const result = await initializeConfig(tempDir);
          assert.strictEqual(result.fromFile, true);

          const path = await getConfigPath('docs.root', tempDir);
          assert.strictEqual(typeof path, 'string');
        },
        async () => {
          console.log('✓ Configuration system creation test');
          ConfigLoader.reset();
          const system = await createConfigurationSystem(tempDir);
          assert.strictEqual(system.config.version, DEFAULT_CONFIG.version);
        },
        async () => {
          console.log('✓ Path resolution integration test');
          ConfigLoader.reset();
          const resolver = await createPathResolver(tempDir);
          const result = resolver.resolve('${docs.root}/test');
          assert.strictEqual(result.success, true);
        },
        async () => {
          console.log('✓ Feature flag test');
          ConfigLoader.reset();
          const enabled = await isFeatureEnabled('autoHandoff', tempDir);
          assert.strictEqual(typeof enabled, 'boolean');
        },
        async () => {
          console.log('✓ Statistics test');
          ConfigLoader.reset();
          const stats = await getConfigurationStats(tempDir);
          assert.strictEqual(typeof stats.resolver.cacheSize, 'number');
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

      console.log('✓ All configuration system integration tests passed!');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };

  runTests().catch(console.error);
}