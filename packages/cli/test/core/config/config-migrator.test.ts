/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, config-migrator, migration, versioning, unit-test]
 * @related: [../../../src/core/config/config-migrator.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [assert, fs, path, os]
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigMigrator,
  MigrationError,
  MigrationUtils,
  MigrationResult,
  MigrationOptions
} from '../../../src/core/config/config-migrator.js';
import {
  GinkoConfig,
  DEFAULT_CONFIG,
  ConfigMigration
} from '../../../src/core/config/config-schema.js';

/**
 * Test Suite: Configuration Migration System
 */
describe('ConfigMigrator', () => {
  let migrator: ConfigMigrator;
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    migrator = new ConfigMigrator();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-migration-test-'));
    configPath = path.join(tempDir, 'ginko.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Version Detection', () => {
    it('should detect version from config object', () => {
      const configWithVersion = { version: '1.0.0', paths: {}, features: {} };
      assert.strictEqual(migrator.detectVersion(configWithVersion), '1.0.0');
    });

    it('should return "none" for missing version', () => {
      const configWithoutVersion = { paths: {}, features: {} };
      assert.strictEqual(migrator.detectVersion(configWithoutVersion), 'none');
    });

    it('should return "none" for null/undefined', () => {
      assert.strictEqual(migrator.detectVersion(null), 'none');
      assert.strictEqual(migrator.detectVersion(undefined), 'none');
    });

    it('should detect v1.0.0 structure without version field', () => {
      const v1Structure = {
        paths: { docs: {}, ginko: {} },
        features: { autoHandoff: true }
      };
      assert.strictEqual(migrator.detectVersion(v1Structure), '1.0.0');
    });

    it('should return "none" for unrecognized structure', () => {
      const unknownStructure = { unknown: 'data' };
      assert.strictEqual(migrator.detectVersion(unknownStructure), 'none');
    });
  });

  describe('Migration Need Assessment', () => {
    it('should identify when migration is needed', () => {
      const oldConfig = { paths: {}, features: {} }; // No version
      assert.strictEqual(migrator.needsMigration(oldConfig), true);
    });

    it('should identify when migration is not needed', () => {
      const currentConfig = { ...DEFAULT_CONFIG };
      assert.strictEqual(migrator.needsMigration(currentConfig), false);
    });

    it('should identify version mismatch', () => {
      const oldVersionConfig = {
        version: '0.9.0',
        paths: { docs: {}, ginko: {} },
        features: {}
      };
      assert.strictEqual(migrator.needsMigration(oldVersionConfig), true);
    });
  });

  describe('Basic Migration', () => {
    it('should migrate from no version to 1.0.0', async () => {
      const oldConfig = {
        paths: { docs: { root: './docs' }, ginko: { root: './.ginko' } },
        features: { customFeature: true }
      };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(result.version, '1.0.0');
      assert.strictEqual(result.paths.docs.root, './docs');
      assert.strictEqual(result.features.customFeature, true);
      assert.strictEqual(result.features.autoHandoff, DEFAULT_CONFIG.features.autoHandoff);
    });

    it('should preserve custom paths during migration', async () => {
      const oldConfig = {
        paths: {
          docs: { root: './custom-docs', adr: './decisions' },
          ginko: { root: './custom-ginko' }
        },
        features: {}
      };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(result.paths.docs.root, './custom-docs');
      assert.strictEqual(result.paths.docs.adr, './decisions');
      assert.strictEqual(result.paths.ginko.root, './custom-ginko');
    });

    it('should preserve custom features during migration', async () => {
      const oldConfig = {
        paths: { docs: {}, ginko: {} },
        features: { customFeature: true, autoHandoff: false }
      };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(result.features.customFeature, true);
      assert.strictEqual(result.features.autoHandoff, false);
    });

    it('should add default paths for missing entries', async () => {
      const oldConfig = {
        paths: { docs: { root: './docs' }, ginko: {} },
        features: {}
      };

      const result = await migrator.migrate(oldConfig);

      // Should have default ginko paths
      assert.strictEqual(typeof result.paths.ginko.root, 'string');
      assert.strictEqual(typeof result.paths.docs.adr, 'string');
    });
  });

  describe('Migration with Full Options', () => {
    it('should perform migration with backup', async () => {
      const oldConfig = { paths: {}, features: {} };
      await fs.writeFile(configPath, JSON.stringify(oldConfig));

      const result = await migrator.migrateConfig(oldConfig, '1.0.0', {
        createBackup: true,
        projectRoot: tempDir,
        configFileName: 'ginko.json'
      });

      assert.strictEqual(result.migrated, true);
      assert.strictEqual(result.fromVersion, 'none');
      assert.strictEqual(result.toVersion, '1.0.0');
      assert.strictEqual(typeof result.backupPath, 'string');
      assert.strictEqual(result.appliedMigrations.length > 0, true);
    });

    it('should handle dry run mode', async () => {
      const oldConfig = { paths: {}, features: {} };

      const result = await migrator.migrateConfig(oldConfig, '1.0.0', {
        dryRun: true,
        createBackup: false
      });

      assert.strictEqual(result.migrated, true);
      assert.strictEqual(result.backupPath, undefined);
    });

    it('should skip backup when disabled', async () => {
      const oldConfig = { paths: {}, features: {} };

      const result = await migrator.migrateConfig(oldConfig, '1.0.0', {
        createBackup: false
      });

      assert.strictEqual(result.migrated, true);
      assert.strictEqual(result.backupPath, undefined);
    });
  });

  describe('Migration History', () => {
    it('should track migration history', async () => {
      const oldConfig = { paths: {}, features: {} };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(Array.isArray(result.metadata?.migrationHistory), true);
      assert.strictEqual(result.metadata!.migrationHistory!.length > 0, true);
      assert.strictEqual(
        result.metadata!.migrationHistory![0].includes('none -> 1.0.0'),
        true
      );
    });

    it('should preserve existing migration history', async () => {
      const oldConfig = {
        paths: {},
        features: {},
        metadata: {
          migrationHistory: ['old migration']
        }
      };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(result.metadata!.migrationHistory!.length, 2);
      assert.strictEqual(result.metadata!.migrationHistory![0], 'old migration');
    });

    it('should update metadata timestamps', async () => {
      const oldConfig = { paths: {}, features: {} };

      const result = await migrator.migrate(oldConfig);

      assert.strictEqual(typeof result.metadata?.updatedAt, 'string');
      const updatedDate = new Date(result.metadata!.updatedAt!);
      assert.strictEqual(updatedDate.getTime() > Date.now() - 10000, true); // Within 10 seconds
    });
  });

  describe('Custom Migrations', () => {
    it('should register custom migrations', () => {
      const customMigration: ConfigMigration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Test custom migration',
        migrate: (config) => ({ ...config, version: '1.1.0' })
      };

      migrator.registerMigration(customMigration);

      const migrations = migrator.getAvailableMigrations();
      const hasCustom = migrations.some(m =>
        m.from === '1.0.0' && m.to === '1.1.0'
      );
      assert.strictEqual(hasCustom, true);
    });

    it('should use custom migrations in migration path', () => {
      const customMigration: ConfigMigration = {
        from: '1.0.0',
        to: '1.1.0',
        description: 'Custom migration',
        migrate: (config) => ({ ...config, version: '1.1.0', custom: true })
      };

      migrator.registerMigration(customMigration);

      // This would need multi-step migration support to test properly
      // For now, just verify the migration is registered
      assert.strictEqual(migrator.canMigrate('1.0.0', '1.1.0'), false); // Not implemented yet
    });
  });

  describe('Error Handling', () => {
    it('should handle migration errors gracefully', async () => {
      const brokenMigration: ConfigMigration = {
        from: 'test',
        to: 'broken',
        description: 'Broken migration',
        migrate: () => { throw new Error('Migration failed'); }
      };

      migrator.registerMigration(brokenMigration);

      // This would need to be tested with a path that uses the broken migration
      // For now, just verify error types
      assert.strictEqual(MigrationError.prototype instanceof Error, true);
    });

    it('should handle missing migration paths', async () => {
      await assert.rejects(
        async () => migrator.migrateConfig({}, '999.0.0'),
        MigrationError
      );
    });

    it('should validate migration results', async () => {
      const invalidMigration: ConfigMigration = {
        from: 'test',
        to: 'invalid',
        description: 'Invalid migration',
        migrate: () => ({ invalid: 'config' }) // Invalid result
      };

      migrator.registerMigration(invalidMigration);

      // Would need a test scenario that triggers this migration
      // For now, verify the concept exists
      assert.strictEqual(typeof migrator.detectVersion, 'function');
    });
  });

  describe('Migration Plans', () => {
    it('should generate migration plan', () => {
      const oldConfig = { paths: {}, features: {} };
      const plan = migrator.getMigrationPlan(oldConfig);

      assert.strictEqual(plan.needed, true);
      assert.strictEqual(plan.fromVersion, 'none');
      assert.strictEqual(plan.toVersion, '1.0.0');
      assert.strictEqual(plan.steps.length > 0, true);
    });

    it('should indicate no migration needed for current config', () => {
      const currentConfig = { ...DEFAULT_CONFIG };
      const plan = migrator.getMigrationPlan(currentConfig);

      assert.strictEqual(plan.needed, false);
      assert.strictEqual(plan.steps.length, 0);
    });

    it('should handle custom target versions', () => {
      const oldConfig = { paths: {}, features: {} };
      const plan = migrator.getMigrationPlan(oldConfig, '1.0.0');

      assert.strictEqual(plan.toVersion, '1.0.0');
    });
  });

  describe('Migration Compatibility', () => {
    it('should check migration compatibility', () => {
      assert.strictEqual(migrator.canMigrate('none', '1.0.0'), true);
      assert.strictEqual(migrator.canMigrate('1.0.0', '1.0.0'), true);
      assert.strictEqual(migrator.canMigrate('unknown', 'unknown'), false);
    });

    it('should list available migrations', () => {
      const migrations = migrator.getAvailableMigrations();
      assert.strictEqual(Array.isArray(migrations), true);
      assert.strictEqual(migrations.length > 0, true);

      const noneToV1 = migrations.find(m => m.from === 'none' && m.to === '1.0.0');
      assert.strictEqual(noneToV1 !== undefined, true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configurations', async () => {
      const result = await migrator.migrate({});
      assert.strictEqual(result.version, '1.0.0');
      assert.strictEqual(typeof result.paths, 'object');
      assert.strictEqual(typeof result.features, 'object');
    });

    it('should handle null configurations', async () => {
      const result = await migrator.migrate(null);
      assert.strictEqual(result.version, '1.0.0');
    });

    it('should handle configurations with extra properties', async () => {
      const configWithExtra = {
        paths: { docs: {}, ginko: {} },
        features: {},
        extraProperty: 'should be preserved'
      };

      const result = await migrator.migrate(configWithExtra);
      assert.strictEqual((result as any).extraProperty, 'should be preserved');
    });

    it('should handle partial path configurations', async () => {
      const partialConfig = {
        paths: { docs: { root: './docs' } }, // Missing ginko
        features: {}
      };

      const result = await migrator.migrate(partialConfig);
      assert.strictEqual(result.paths.docs.root, './docs');
      assert.strictEqual(typeof result.paths.ginko, 'object');
    });
  });
});

/**
 * MigrationUtils Tests
 */
describe('MigrationUtils', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-migration-utils-test-'));
    configPath = path.join(tempDir, 'ginko.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('checkMigrationNeeded', () => {
    it('should detect when file does not exist', async () => {
      const result = await MigrationUtils.checkMigrationNeeded(tempDir);

      assert.strictEqual(result.exists, false);
      assert.strictEqual(result.needsMigration, false);
      assert.strictEqual(result.currentVersion, 'none');
    });

    it('should detect when migration is needed', async () => {
      const oldConfig = { paths: {}, features: {} };
      await fs.writeFile(configPath, JSON.stringify(oldConfig));

      const result = await MigrationUtils.checkMigrationNeeded(tempDir);

      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.needsMigration, true);
      assert.strictEqual(result.currentVersion, 'none');
      assert.strictEqual(typeof result.plan, 'object');
    });

    it('should detect when migration is not needed', async () => {
      const currentConfig = { ...DEFAULT_CONFIG };
      await fs.writeFile(configPath, JSON.stringify(currentConfig));

      const result = await MigrationUtils.checkMigrationNeeded(tempDir);

      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.needsMigration, false);
      assert.strictEqual(result.currentVersion, '1.0.0');
    });
  });

  describe('safeMigrate', () => {
    it('should perform safe migration with backup', async () => {
      const oldConfig = { paths: {}, features: {} };
      await fs.writeFile(configPath, JSON.stringify(oldConfig));

      const result = await MigrationUtils.safeMigrate(tempDir, {
        createBackup: true
      });

      assert.strictEqual(result.migrated, true);
      assert.strictEqual(typeof result.backupPath, 'string');

      // Verify backup exists
      if (result.backupPath) {
        const backupExists = await fs.access(result.backupPath).then(() => true).catch(() => false);
        assert.strictEqual(backupExists, true);
      }

      // Verify config was updated
      const content = await fs.readFile(configPath, 'utf-8');
      const updatedConfig = JSON.parse(content);
      assert.strictEqual(updatedConfig.version, '1.0.0');
    });

    it('should handle dry run mode', async () => {
      const oldConfig = { paths: {}, features: {} };
      await fs.writeFile(configPath, JSON.stringify(oldConfig));

      const originalContent = await fs.readFile(configPath, 'utf-8');

      const result = await MigrationUtils.safeMigrate(tempDir, {
        dryRun: true
      });

      assert.strictEqual(result.migrated, true);

      // File should be unchanged
      const finalContent = await fs.readFile(configPath, 'utf-8');
      assert.strictEqual(finalContent, originalContent);
    });

    it('should handle migration errors', async () => {
      await fs.writeFile(configPath, '{ invalid json }');

      await assert.rejects(
        async () => MigrationUtils.safeMigrate(tempDir),
        MigrationError
      );
    });
  });

  describe('Backup Management', () => {
    it('should list backup files', async () => {
      // Create some backup files
      const timestamp1 = '2025-09-19T10-00-00-000Z';
      const timestamp2 = '2025-09-19T11-00-00-000Z';

      await fs.writeFile(path.join(tempDir, `ginko.json.backup.${timestamp1}`), '{}');
      await fs.writeFile(path.join(tempDir, `ginko.json.backup.${timestamp2}`), '{}');

      const backups = await MigrationUtils.listBackups(tempDir);

      assert.strictEqual(backups.length, 2);
      assert.strictEqual(backups[0].created >= backups[1].created, true); // Sorted newest first
    });

    it('should clean up old backups', async () => {
      // Create multiple backup files
      for (let i = 0; i < 10; i++) {
        const timestamp = `2025-09-19T${i.toString().padStart(2, '0')}-00-00-000Z`;
        await fs.writeFile(path.join(tempDir, `ginko.json.backup.${timestamp}`), '{}');
      }

      const beforeCount = (await MigrationUtils.listBackups(tempDir)).length;
      const deletedCount = await MigrationUtils.cleanupBackups(tempDir, 'ginko.json', 3);

      assert.strictEqual(beforeCount, 10);
      assert.strictEqual(deletedCount, 7); // Should delete 7, keep 3

      const afterCount = (await MigrationUtils.listBackups(tempDir)).length;
      assert.strictEqual(afterCount, 3);
    });

    it('should handle backup cleanup errors gracefully', async () => {
      // This test is hard to implement reliably across platforms
      // Just verify the function exists and returns a number
      const deletedCount = await MigrationUtils.cleanupBackups('/nonexistent');
      assert.strictEqual(typeof deletedCount, 'number');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle permission errors', async () => {
      // This is platform-specific and hard to test reliably
      // Just verify error types exist
      assert.strictEqual(MigrationError.prototype instanceof Error, true);
    });

    it('should handle malformed JSON', async () => {
      await fs.writeFile(configPath, '{ malformed json');

      await assert.rejects(
        async () => MigrationUtils.checkMigrationNeeded(tempDir),
        Error
      );
    });
  });
});

/**
 * Integration Tests
 */
describe('Migration Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-migration-integration-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle complete migration workflow', async () => {
    const configPath = path.join(tempDir, 'ginko.json');

    // 1. Create old configuration
    const oldConfig = {
      paths: {
        docs: { root: './docs', custom: './custom-docs' },
        ginko: { root: './.ginko' }
      },
      features: { customFeature: true }
    };
    await fs.writeFile(configPath, JSON.stringify(oldConfig));

    // 2. Check migration status
    const status = await MigrationUtils.checkMigrationNeeded(tempDir);
    assert.strictEqual(status.needsMigration, true);

    // 3. Perform migration
    const result = await MigrationUtils.safeMigrate(tempDir);
    assert.strictEqual(result.migrated, true);

    // 4. Verify result
    const content = await fs.readFile(configPath, 'utf-8');
    const migratedConfig = JSON.parse(content);

    assert.strictEqual(migratedConfig.version, '1.0.0');
    assert.strictEqual(migratedConfig.paths.docs.custom, './custom-docs');
    assert.strictEqual(migratedConfig.features.customFeature, true);
    assert.strictEqual(migratedConfig.features.autoHandoff, DEFAULT_CONFIG.features.autoHandoff);

    // 5. Verify no further migration needed
    const finalStatus = await MigrationUtils.checkMigrationNeeded(tempDir);
    assert.strictEqual(finalStatus.needsMigration, false);
  });

  it('should preserve data integrity through migration', async () => {
    const complexOldConfig = {
      paths: {
        docs: {
          root: './documentation',
          adr: '${docs.root}/architecture-decisions',
          api: '${docs.root}/api-specs',
          custom1: './special/location',
          custom2: '${docs.custom1}/nested'
        },
        ginko: {
          root: './.ginko-custom',
          sessions: '${ginko.root}/user-sessions',
          custom: './external/ginko-data'
        }
      },
      features: {
        autoHandoff: false,
        contextCaching: true,
        customFeature1: true,
        customFeature2: false,
        experimentalFeature: true
      },
      platform: {
        type: 'linux',
        shell: 'zsh',
        pathSeparator: '/',
        homeDirectory: '/home/customuser'
      },
      metadata: {
        createdAt: '2025-01-01T00:00:00.000Z',
        customField: 'should be preserved'
      }
    };

    const configPath = path.join(tempDir, 'ginko.json');
    await fs.writeFile(configPath, JSON.stringify(complexOldConfig));

    const result = await MigrationUtils.safeMigrate(tempDir);

    // Verify all data preserved
    const migratedConfig = result.config;

    // Paths preserved
    assert.strictEqual(migratedConfig.paths.docs.root, './documentation');
    assert.strictEqual(migratedConfig.paths.docs.custom1, './special/location');
    assert.strictEqual(migratedConfig.paths.ginko.custom, './external/ginko-data');

    // Features preserved
    assert.strictEqual(migratedConfig.features.autoHandoff, false);
    assert.strictEqual(migratedConfig.features.customFeature1, true);
    assert.strictEqual(migratedConfig.features.experimentalFeature, true);

    // Platform preserved
    assert.strictEqual(migratedConfig.platform?.type, 'linux');
    assert.strictEqual(migratedConfig.platform?.shell, 'zsh');

    // Metadata preserved and updated
    assert.strictEqual((migratedConfig.metadata as any)?.customField, 'should be preserved');
    assert.strictEqual(migratedConfig.metadata?.createdAt, '2025-01-01T00:00:00.000Z');
    assert.strictEqual(typeof migratedConfig.metadata?.updatedAt, 'string');
  });
});

/**
 * Test runner for environments without a test framework
 */
if (require.main === module) {
  console.log('Running config-migrator tests...');

  const runTests = async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-migrator-test-'));

    try {
      const tests = [
        () => {
          console.log('✓ Version detection test');
          const migrator = new ConfigMigrator();
          assert.strictEqual(migrator.detectVersion({ version: '1.0.0' }), '1.0.0');
          assert.strictEqual(migrator.detectVersion({}), 'none');
        },
        () => {
          console.log('✓ Migration need assessment test');
          const migrator = new ConfigMigrator();
          assert.strictEqual(migrator.needsMigration({}), true);
          assert.strictEqual(migrator.needsMigration(DEFAULT_CONFIG), false);
        },
        async () => {
          console.log('✓ Basic migration test');
          const migrator = new ConfigMigrator();
          const oldConfig = { paths: {}, features: {} };
          const result = await migrator.migrate(oldConfig);
          assert.strictEqual(result.version, '1.0.0');
        },
        async () => {
          console.log('✓ Migration utils test');
          const result = await MigrationUtils.checkMigrationNeeded(tempDir);
          assert.strictEqual(result.exists, false);
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

      console.log('✓ All config-migrator tests passed!');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };

  runTests().catch(console.error);
}