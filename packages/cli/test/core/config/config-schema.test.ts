/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, config, schema, validation, unit-test]
 * @related: [../../../src/core/config/config-schema.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [assert]
 */

import * as assert from 'assert';
import {
  GinkoConfig,
  DEFAULT_CONFIG,
  isValidGinkoConfig,
  isPlatformConfig,
  validateConfig,
  ConfigValidationError,
  GINKO_CONFIG_SCHEMA,
  SUPPORTED_CONFIG_VERSIONS
} from '../../../src/core/config/config-schema.js';

/**
 * Test Suite: Configuration Schema Validation
 */
describe('Config Schema', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have correct structure', () => {
      assert.strictEqual(typeof DEFAULT_CONFIG.version, 'string');
      assert.strictEqual(typeof DEFAULT_CONFIG.paths, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.features, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.paths.docs, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.paths.ginko, 'object');
    });

    it('should pass validation', () => {
      assert.strictEqual(isValidGinkoConfig(DEFAULT_CONFIG), true);
      const result = validateConfig(DEFAULT_CONFIG);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should have valid version format', () => {
      const versionPattern = /^\d+\.\d+\.\d+$/;
      assert.strictEqual(versionPattern.test(DEFAULT_CONFIG.version), true);
    });

    it('should have required path categories', () => {
      assert.strictEqual('docs' in DEFAULT_CONFIG.paths, true);
      assert.strictEqual('ginko' in DEFAULT_CONFIG.paths, true);
    });

    it('should have sensible default features', () => {
      assert.strictEqual(typeof DEFAULT_CONFIG.features.autoHandoff, 'boolean');
      assert.strictEqual(typeof DEFAULT_CONFIG.features.contextCaching, 'boolean');
      assert.strictEqual(typeof DEFAULT_CONFIG.features.smartSuggestions, 'boolean');
    });
  });

  describe('isValidGinkoConfig', () => {
    it('should return true for valid config', () => {
      const validConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { testFeature: true }
      };
      assert.strictEqual(isValidGinkoConfig(validConfig), true);
    });

    it('should return false for null/undefined', () => {
      assert.strictEqual(isValidGinkoConfig(null), false);
      assert.strictEqual(isValidGinkoConfig(undefined), false);
    });

    it('should return false for non-object', () => {
      assert.strictEqual(isValidGinkoConfig('string'), false);
      assert.strictEqual(isValidGinkoConfig(123), false);
      assert.strictEqual(isValidGinkoConfig([]), false);
    });

    it('should return false for missing version', () => {
      const invalidConfig = {
        paths: { docs: {}, ginko: {} },
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });

    it('should return false for missing paths', () => {
      const invalidConfig = {
        version: '1.0.0',
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });

    it('should return false for missing features', () => {
      const invalidConfig = {
        version: '1.0.0',
        paths: { docs: {}, ginko: {} }
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });

    it('should return false for invalid version format', () => {
      const invalidConfig = {
        version: 'invalid',
        paths: { docs: {}, ginko: {} },
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });

    it('should return false for missing docs paths', () => {
      const invalidConfig = {
        version: '1.0.0',
        paths: { ginko: {} },
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });

    it('should return false for missing ginko paths', () => {
      const invalidConfig = {
        version: '1.0.0',
        paths: { docs: {} },
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(invalidConfig), false);
    });
  });

  describe('isPlatformConfig', () => {
    it('should return true for valid platform config', () => {
      const validPlatform = {
        type: 'linux' as const,
        shell: 'bash' as const,
        pathSeparator: '/' as const,
        homeDirectory: '/home/user'
      };
      assert.strictEqual(isPlatformConfig(validPlatform), true);
    });

    it('should return false for invalid type', () => {
      const invalidPlatform = {
        type: 'invalid',
        shell: 'bash',
        pathSeparator: '/',
        homeDirectory: '/home/user'
      };
      assert.strictEqual(isPlatformConfig(invalidPlatform), false);
    });

    it('should return false for invalid shell', () => {
      const invalidPlatform = {
        type: 'linux',
        shell: 'invalid',
        pathSeparator: '/',
        homeDirectory: '/home/user'
      };
      assert.strictEqual(isPlatformConfig(invalidPlatform), false);
    });

    it('should return false for invalid separator', () => {
      const invalidPlatform = {
        type: 'linux',
        shell: 'bash',
        pathSeparator: '|',
        homeDirectory: '/home/user'
      };
      assert.strictEqual(isPlatformConfig(invalidPlatform), false);
    });

    it('should return false for missing homeDirectory', () => {
      const invalidPlatform = {
        type: 'linux',
        shell: 'bash',
        pathSeparator: '/'
      };
      assert.strictEqual(isPlatformConfig(invalidPlatform), false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const result = validateConfig(DEFAULT_CONFIG);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should return errors for invalid config', () => {
      const invalidConfig = { invalid: 'config' };
      const result = validateConfig(invalidConfig);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length > 0, true);
    });

    it('should handle validation exceptions', () => {
      const problematicConfig = {
        get version() {
          throw new Error('Test error');
        }
      };
      const result = validateConfig(problematicConfig);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.some(e => e.includes('Validation failed')), true);
    });
  });

  describe('ConfigValidationError', () => {
    it('should create error with message', () => {
      const error = new ConfigValidationError('Test message');
      assert.strictEqual(error.name, 'ConfigValidationError');
      assert.strictEqual(error.message, 'Test message');
    });

    it('should create error with field and value', () => {
      const error = new ConfigValidationError('Test message', 'testField', 'testValue');
      assert.strictEqual(error.field, 'testField');
      assert.strictEqual(error.value, 'testValue');
    });
  });

  describe('GINKO_CONFIG_SCHEMA', () => {
    it('should have correct schema structure', () => {
      assert.strictEqual(GINKO_CONFIG_SCHEMA.$schema, 'http://json-schema.org/draft-07/schema#');
      assert.strictEqual(GINKO_CONFIG_SCHEMA.type, 'object');
      assert.strictEqual(Array.isArray(GINKO_CONFIG_SCHEMA.required), true);
    });

    it('should require version, paths, and features', () => {
      const required = GINKO_CONFIG_SCHEMA.required;
      assert.strictEqual(required.includes('version'), true);
      assert.strictEqual(required.includes('paths'), true);
      assert.strictEqual(required.includes('features'), true);
    });

    it('should define version pattern', () => {
      const versionProperty = GINKO_CONFIG_SCHEMA.properties.version;
      assert.strictEqual(versionProperty.type, 'string');
      assert.strictEqual(typeof versionProperty.pattern, 'string');
    });

    it('should define paths structure', () => {
      const pathsProperty = GINKO_CONFIG_SCHEMA.properties.paths;
      assert.strictEqual(pathsProperty.type, 'object');
      assert.strictEqual(Array.isArray(pathsProperty.required), true);
      assert.strictEqual(pathsProperty.required.includes('docs'), true);
      assert.strictEqual(pathsProperty.required.includes('ginko'), true);
    });

    it('should define features structure', () => {
      const featuresProperty = GINKO_CONFIG_SCHEMA.properties.features;
      assert.strictEqual(featuresProperty.type, 'object');
    });

    it('should define optional platform structure', () => {
      const platformProperty = GINKO_CONFIG_SCHEMA.properties.platform;
      assert.strictEqual(platformProperty.type, 'object');
      assert.strictEqual(Array.isArray(platformProperty.required), true);
    });
  });

  describe('SUPPORTED_CONFIG_VERSIONS', () => {
    it('should include current version', () => {
      const currentVersion = DEFAULT_CONFIG.version;
      assert.strictEqual(currentVersion in SUPPORTED_CONFIG_VERSIONS, true);
    });

    it('should have version descriptions', () => {
      for (const [version, info] of Object.entries(SUPPORTED_CONFIG_VERSIONS)) {
        assert.strictEqual(typeof info.description, 'string');
        assert.strictEqual(Array.isArray(info.features), true);
      }
    });

    it('should have features for each version', () => {
      const version1Info = SUPPORTED_CONFIG_VERSIONS['1.0.0'];
      assert.strictEqual(Array.isArray(version1Info.features), true);
      assert.strictEqual(version1Info.features.length > 0, true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      assert.strictEqual(isValidGinkoConfig({}), false);
      const result = validateConfig({});
      assert.strictEqual(result.valid, false);
    });

    it('should handle nested object validation', () => {
      const configWithInvalidNesting = {
        version: '1.0.0',
        paths: {
          docs: 'not an object',  // Should be object
          ginko: {}
        },
        features: {}
      };
      assert.strictEqual(isValidGinkoConfig(configWithInvalidNesting), false);
    });

    it('should handle configuration with extra properties', () => {
      const configWithExtra = {
        ...DEFAULT_CONFIG,
        extraProperty: 'should be ignored'
      };
      // Should still be valid - extra properties are allowed in our validation
      assert.strictEqual(isValidGinkoConfig(configWithExtra), true);
    });

    it('should handle platform config with partial data', () => {
      const partialPlatform = {
        type: 'linux',
        shell: 'bash'
        // Missing pathSeparator and homeDirectory
      };
      assert.strictEqual(isPlatformConfig(partialPlatform), false);
    });

    it('should validate version format strictly', () => {
      const configs = [
        { ...DEFAULT_CONFIG, version: '1.0' },      // Missing patch
        { ...DEFAULT_CONFIG, version: '1' },        // Missing minor and patch
        { ...DEFAULT_CONFIG, version: 'v1.0.0' },   // Has prefix
        { ...DEFAULT_CONFIG, version: '1.0.0-beta' }, // Has suffix
      ];

      configs.forEach(config => {
        assert.strictEqual(isValidGinkoConfig(config), false, `Should reject version: ${config.version}`);
      });
    });
  });

  describe('Type Safety', () => {
    it('should properly type check valid configs', () => {
      // This test ensures TypeScript compilation works correctly
      const config: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs', adr: '${docs.root}/adr' },
          ginko: { root: './.ginko', sessions: '${ginko.root}/sessions' }
        },
        features: {
          autoHandoff: true,
          contextCaching: false
        },
        platform: {
          type: 'linux',
          shell: 'bash',
          pathSeparator: '/',
          homeDirectory: '/home/user'
        }
      };

      assert.strictEqual(isValidGinkoConfig(config), true);
    });

    it('should handle metadata properly', () => {
      const configWithMetadata: GinkoConfig = {
        ...DEFAULT_CONFIG,
        metadata: {
          createdAt: '2025-09-19T00:00:00.000Z',
          updatedAt: '2025-09-19T00:00:00.000Z',
          updatedBy: 'test-user',
          migrationHistory: ['none -> 1.0.0']
        }
      };

      assert.strictEqual(isValidGinkoConfig(configWithMetadata), true);
    });
  });
});

/**
 * Performance Tests
 */
describe('Config Schema Performance', () => {
  it('should validate quickly', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      isValidGinkoConfig(DEFAULT_CONFIG);
    }
    const elapsed = Date.now() - start;

    // Should complete 1000 validations in under 100ms
    assert.strictEqual(elapsed < 100, true, `Validation took ${elapsed}ms, expected < 100ms`);
  });

  it('should handle large configurations efficiently', () => {
    const largeConfig = {
      ...DEFAULT_CONFIG,
      paths: {
        docs: {},
        ginko: {}
      },
      features: {}
    };

    // Add many path entries
    for (let i = 0; i < 100; i++) {
      largeConfig.paths.docs[`path${i}`] = `./docs/path${i}`;
      largeConfig.paths.ginko[`ginko${i}`] = `./ginko/path${i}`;
      largeConfig.features[`feature${i}`] = i % 2 === 0;
    }

    const start = Date.now();
    const result = isValidGinkoConfig(largeConfig);
    const elapsed = Date.now() - start;

    assert.strictEqual(result, true);
    assert.strictEqual(elapsed < 50, true, `Large config validation took ${elapsed}ms, expected < 50ms`);
  });
});

/**
 * Test runner for environments without a test framework
 * Remove this if using Jest, Mocha, or similar
 */
if (require.main === module) {
  console.log('Running config-schema tests...');

  // Simple test runner implementation
  const runTests = async () => {
    const tests = [
      () => {
        console.log('✓ DEFAULT_CONFIG structure test');
        assert.strictEqual(typeof DEFAULT_CONFIG.version, 'string');
      },
      () => {
        console.log('✓ isValidGinkoConfig basic test');
        assert.strictEqual(isValidGinkoConfig(DEFAULT_CONFIG), true);
      },
      () => {
        console.log('✓ isPlatformConfig basic test');
        const platform = {
          type: 'linux' as const,
          shell: 'bash' as const,
          pathSeparator: '/' as const,
          homeDirectory: '/home/user'
        };
        assert.strictEqual(isPlatformConfig(platform), true);
      }
    ];

    for (const test of tests) {
      try {
        test();
      } catch (error) {
        console.error('✗ Test failed:', error);
        process.exit(1);
      }
    }

    console.log('✓ All config-schema tests passed!');
  };

  runTests().catch(console.error);
}