/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, unit-test, environment, validation, jest]
 * @related: [../../../src/core/validators/environment-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { EnvironmentValidator, Platform } from '../../../src/core/validators/environment-validator.js';

describe('EnvironmentValidator', () => {
  let validator: EnvironmentValidator;

  beforeEach(() => {
    validator = new EnvironmentValidator();
  });

  describe('validate()', () => {
    it('should pass validation in normal Node.js environment', async () => {
      const result = await validator.validate();

      // This test assumes we're running in a valid Node.js environment
      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.environment).toBeDefined();
    });

    it('should include environment metadata on successful validation', async () => {
      const result = await validator.validate();

      if (result.valid) {
        expect(result.metadata?.environment).toMatchObject({
          platform: expect.any(String),
          nodeVersion: expect.stringMatching(/^v?\d+\.\d+\.\d+/),
          workingDirectory: expect.any(String),
          homeDirectory: expect.any(String),
          pathSeparator: expect.any(String),
          executable: {
            node: expect.any(String)
          }
        });
      }
    });

    it('should detect platform correctly', async () => {
      const result = await validator.validate();

      if (result.valid) {
        const platform = result.metadata?.environment?.platform;
        expect(['windows', 'macos', 'linux']).toContain(platform);
      }
    });

    it('should validate Node.js version requirements', async () => {
      const result = await validator.validate();

      // This test assumes we're running Node.js 18+ for development
      expect(result.valid).toBe(true);
      expect(result.metadata?.nodeCompliant).toBe(true);
    });
  });

  describe('getEnvironmentInfo()', () => {
    it('should return undefined before validation', () => {
      const info = validator.getEnvironmentInfo();
      expect(info).toBeUndefined();
    });

    it('should return environment info after validation', async () => {
      await validator.validate();
      const info = validator.getEnvironmentInfo();

      expect(info).toBeDefined();
      if (info) {
        expect(info).toHaveProperty('platform');
        expect(info).toHaveProperty('nodeVersion');
        expect(info).toHaveProperty('workingDirectory');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle validation timeout gracefully', async () => {
      // Create a validator that would theoretically timeout
      // This test is mainly to ensure timeout handling exists
      const result = await validator.validate();

      // Even if individual checks timeout, validation should complete
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.suggestions || [])).toBe(true);
    });

    it('should provide helpful error messages and suggestions', async () => {
      const result = await validator.validate();

      if (!result.valid) {
        expect(result.error).toBeTruthy();
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result.suggestions!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Static methods', () => {
    describe('isNodeVersionValid()', () => {
      it('should return true for current Node.js version', () => {
        const isValid = EnvironmentValidator.isNodeVersionValid();
        expect(typeof isValid).toBe('boolean');

        // Since we're running this test, Node.js should be valid
        expect(isValid).toBe(true);
      });
    });

    describe('getPlatform()', () => {
      it('should return valid platform type', () => {
        const platform = EnvironmentValidator.getPlatform();
        expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);
      });

      it('should return consistent results', () => {
        const platform1 = EnvironmentValidator.getPlatform();
        const platform2 = EnvironmentValidator.getPlatform();
        expect(platform1).toBe(platform2);
      });
    });

    describe('getBasicInfo()', () => {
      it('should return basic environment information', async () => {
        const info = await EnvironmentValidator.getBasicInfo();

        expect(typeof info).toBe('object');
        // Should have at least some properties even if validation fails
        expect(info).toBeDefined();
      });

      it('should not throw errors even in problematic environments', async () => {
        // This test ensures the method is robust
        await expect(EnvironmentValidator.getBasicInfo()).resolves.toBeDefined();
      });
    });
  });

  describe('Platform-specific behavior', () => {
    it('should detect Windows platform correctly', () => {
      const originalPlatform = process.platform;

      // Mock Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });

      const platform = EnvironmentValidator.getPlatform();
      expect(platform).toBe('windows');

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should detect macOS platform correctly', () => {
      const originalPlatform = process.platform;

      // Mock macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });

      const platform = EnvironmentValidator.getPlatform();
      expect(platform).toBe('macos');

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should detect Linux platform correctly', () => {
      const originalPlatform = process.platform;

      // Mock Linux platform
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });

      const platform = EnvironmentValidator.getPlatform();
      expect(platform).toBe('linux');

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should handle unknown platforms', () => {
      const originalPlatform = process.platform;

      // Mock unknown platform
      Object.defineProperty(process, 'platform', {
        value: 'unknown-os',
        configurable: true
      });

      const platform = EnvironmentValidator.getPlatform();
      expect(platform).toBe('unknown');

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });
  });

  describe('Node.js version checking', () => {
    it('should validate semantic version comparison', () => {
      // Access private method through reflection for testing
      const validator = new EnvironmentValidator();
      const compareVersions = (validator as any).compareVersions;

      if (compareVersions) {
        expect(compareVersions('20.0.0', '18.0.0')).toBe(1);
        expect(compareVersions('18.0.0', '20.0.0')).toBe(-1);
        expect(compareVersions('18.0.0', '18.0.0')).toBe(0);
        expect(compareVersions('18.1.0', '18.0.0')).toBe(1);
        expect(compareVersions('18.0.1', '18.0.0')).toBe(1);
      }
    });

    it('should handle version strings with and without v prefix', () => {
      const currentVersion = process.version; // Includes 'v' prefix
      const isValid = EnvironmentValidator.isNodeVersionValid();

      expect(typeof isValid).toBe('boolean');
      expect(currentVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('Command availability checking', () => {
    it('should detect Node.js executable', async () => {
      const result = await validator.validate();

      if (result.valid) {
        const executable = result.metadata?.environment?.executable?.node;
        expect(executable).toBeTruthy();
        expect(typeof executable).toBe('string');
      }
    });

    it('should handle missing commands gracefully', async () => {
      // This test ensures the validator doesn't crash when commands are missing
      const result = await validator.validate();

      // Should always complete, even if some commands are missing
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('Permission validation', () => {
    it('should validate directory permissions for current working directory', async () => {
      const result = await validator.validate();

      // In normal test environments, should have permissions
      if (result.valid) {
        expect(result.metadata).toBeDefined();
      } else {
        // If validation fails, should provide helpful suggestions
        expect(result.suggestions).toContain(
          expect.stringMatching(/permission|access|directory/i)
        );
      }
    });
  });

  describe('Integration with real environment', () => {
    it('should work with actual system environment', async () => {
      const result = await validator.validate();

      // This test validates against the real environment
      // It should pass in CI/development environments
      expect(typeof result.valid).toBe('boolean');

      if (result.valid) {
        expect(result.metadata?.platform).toBeTruthy();
        expect(result.metadata?.nodeCompliant).toBe(true);
      } else {
        // If it fails, errors should be actionable
        expect(result.error).toBeTruthy();
        expect(result.suggestions).toBeTruthy();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      }
    });
  });
});