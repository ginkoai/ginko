/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, unit-test, config, validation, jest]
 * @related: [../../../src/core/validators/config-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import { ConfigValidator, GinkoConfig } from '../../../src/core/validators/config-validator.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('ConfigValidator', () => {
  let tempDir: string;
  let validator: ConfigValidator;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-test-'));
    validator = new ConfigValidator(tempDir);
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await fs.remove(tempDir);
  });

  describe('validate()', () => {
    it('should fail when ginko.json does not exist', async () => {
      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('ginko.json configuration file not found');
      expect(result.suggestions).toContain('Create ginko.json: ginko init');
    });

    it('should fail when ginko.json contains invalid JSON', async () => {
      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeFile(configPath, '{ invalid json }');

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid JSON syntax');
      expect(result.suggestions).toContain('Fix JSON syntax errors in ginko.json');
    });

    it('should pass with valid default configuration', async () => {
      const validConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: './docs',
            adr: './docs/adr'
          },
          ginko: {
            root: './.ginko',
            context: './.ginko/context'
          }
        },
        features: {
          autoHandoff: true,
          contextCapture: true
        }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, validConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.configPath).toBe(configPath);
      expect(result.metadata?.config).toEqual(validConfig);
    });

    it('should fail when required fields are missing', async () => {
      const incompleteConfig = {
        version: '1.0.0'
        // Missing paths and features
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, incompleteConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('schema validation failed');
      expect(result.suggestions).toContain('Fix: Missing required field: paths');
      expect(result.suggestions).toContain('Fix: Missing required field: features');
    });

    it('should fail with invalid version format', async () => {
      const invalidConfig = {
        version: 'invalid-version',
        paths: {
          docs: {},
          ginko: {}
        },
        features: {}
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, invalidConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.suggestions).toContain('Fix: Invalid version format. Expected semantic version (e.g., "1.0.0")');
    });

    it('should create required directories and validate paths', async () => {
      const validConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: path.join(tempDir, 'docs'),
            adr: path.join(tempDir, 'docs/adr')
          },
          ginko: {
            root: path.join(tempDir, '.ginko'),
            context: path.join(tempDir, '.ginko/context')
          }
        },
        features: {
          autoHandoff: true
        }
      };

      // Create the directories referenced in config
      await fs.ensureDir(path.join(tempDir, 'docs/adr'));
      await fs.ensureDir(path.join(tempDir, '.ginko/context'));

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, validConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.pathsChecked).toBeDefined();
    });

    it('should warn about non-existent paths without failing', async () => {
      const configWithMissingPaths: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: path.join(tempDir, 'nonexistent-docs')
          },
          ginko: {
            root: path.join(tempDir, 'nonexistent-ginko')
          }
        },
        features: {
          autoHandoff: true
        }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, configWithMissingPaths);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.warnings).toContain(
        expect.stringContaining('does not exist')
      );
    });

    it('should detect custom paths vs defaults', async () => {
      const customConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: './custom-docs',
            adr: './custom-docs/architecture'
          },
          ginko: {
            root: './custom-ginko',
            context: './custom-ginko/ctx'
          }
        },
        features: {
          autoHandoff: false,
          customFeature: true
        }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, customConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.hasCustomPaths).toBe(true);
      expect(result.metadata?.enabledFeatures).toContain('customFeature');
    });
  });

  describe('getConfig()', () => {
    it('should return undefined before validation', () => {
      const config = validator.getConfig();
      expect(config).toBeUndefined();
    });

    it('should return loaded config after successful validation', async () => {
      const testConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { autoHandoff: true }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, testConfig);

      await validator.validate();
      const config = validator.getConfig();

      expect(config).toEqual(testConfig);
    });
  });

  describe('Static methods', () => {
    describe('getDefaultConfig()', () => {
      it('should return valid default configuration', () => {
        const defaultConfig = ConfigValidator.getDefaultConfig();

        expect(defaultConfig).toHaveProperty('version');
        expect(defaultConfig).toHaveProperty('paths');
        expect(defaultConfig).toHaveProperty('features');
        expect(defaultConfig.paths).toHaveProperty('docs');
        expect(defaultConfig.paths).toHaveProperty('ginko');
      });

      it('should return a deep copy (not reference)', () => {
        const config1 = ConfigValidator.getDefaultConfig();
        const config2 = ConfigValidator.getDefaultConfig();

        expect(config1).toEqual(config2);
        expect(config1).not.toBe(config2); // Different objects
        expect(config1.paths).not.toBe(config2.paths); // Deep copy
      });
    });

    describe('validateConfigObject()', () => {
      it('should validate a valid config object', () => {
        const validConfig = {
          version: '1.0.0',
          paths: {
            docs: {},
            ginko: {}
          },
          features: {}
        };

        const result = ConfigValidator.validateConfigObject(validConfig);
        expect(result.valid).toBe(true);
      });

      it('should fail for non-object input', () => {
        const result = ConfigValidator.validateConfigObject('not an object');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be an object');
      });

      it('should fail for null input', () => {
        const result = ConfigValidator.validateConfigObject(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be an object');
      });

      it('should fail when required fields are missing', () => {
        const incompleteConfig = {
          version: '1.0.0'
          // Missing paths and features
        };

        const result = ConfigValidator.validateConfigObject(incompleteConfig);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Missing required fields: paths, features');
      });
    });

    describe('mergeWithDefaults()', () => {
      it('should merge user config with defaults', () => {
        const userConfig = {
          features: {
            customFeature: true
          }
        };

        const merged = ConfigValidator.mergeWithDefaults(userConfig);

        expect(merged).toHaveProperty('version');
        expect(merged).toHaveProperty('paths');
        expect(merged.features).toHaveProperty('customFeature', true);
        expect(merged.features).toHaveProperty('autoHandoff'); // From defaults
      });

      it('should deep merge nested objects', () => {
        const userConfig = {
          paths: {
            docs: {
              custom: './custom-docs'
            }
          }
        };

        const merged = ConfigValidator.mergeWithDefaults(userConfig);

        expect(merged.paths.docs).toHaveProperty('custom', './custom-docs');
        expect(merged.paths.docs).toHaveProperty('root'); // From defaults
        expect(merged.paths).toHaveProperty('ginko'); // From defaults
      });

      it('should override default values with user values', () => {
        const userConfig = {
          version: '2.0.0',
          features: {
            autoHandoff: false // Override default
          }
        };

        const merged = ConfigValidator.mergeWithDefaults(userConfig);

        expect(merged.version).toBe('2.0.0');
        expect(merged.features.autoHandoff).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle file permission errors', async () => {
      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, { version: '1.0.0', paths: {}, features: {} });

      // Make file unreadable (Unix only)
      if (process.platform !== 'win32') {
        await fs.chmod(configPath, 0o000);

        const result = await validator.validate();

        expect(result.valid).toBe(false);
        expect(result.error).toContain('not readable');

        // Cleanup
        await fs.chmod(configPath, 0o644);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeFile(configPath, '{"version": "1.0.0", "trailing": "comma",}');

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid JSON syntax');
      expect(result.suggestions).toContain('Check for missing commas, quotes, or brackets');
    });

    it('should handle empty files', async () => {
      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeFile(configPath, '');

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid JSON syntax');
    });
  });

  describe('Complex configuration scenarios', () => {
    it('should handle configuration with platform-specific settings', async () => {
      const platformConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { autoHandoff: true },
        platform: {
          type: 'windows',
          shell: 'powershell',
          pathSeparator: '\\',
          hooks: {
            preCommit: 'pre-commit.bat'
          }
        }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, platformConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.hasPlatformConfig).toBe(true);
      expect(result.metadata?.config?.platform?.type).toBe('windows');
    });

    it('should handle extended configuration with extra properties', async () => {
      const extendedConfig = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { autoHandoff: true },
        customSection: {
          apiKey: 'test-key',
          endpoints: ['http://localhost:3000']
        },
        metadata: {
          author: 'test-user',
          created: '2025-09-19'
        }
      };

      const configPath = path.join(tempDir, 'ginko.json');
      await fs.writeJson(configPath, extendedConfig);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.config).toHaveProperty('customSection');
      expect(result.metadata?.config).toHaveProperty('metadata');
    });
  });
});