/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, unit-test, integration-test, validation, jest]
 * @related: [../../../src/core/validators/index.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest, fs-extra]
 */

import {
  validateBasicEnvironment,
  isValidGitRepository,
  validateGinkoConfig,
  getPlatformInfo,
  isNodeCompatible,
  validateGinkoSetup,
  canRunGinko
} from '../../../src/core/validators/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { simpleGit } from 'simple-git';

describe('Validation Index (Integration Tests)', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-integration-test-'));
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await fs.remove(tempDir);
  });

  describe('Quick validation functions', () => {
    describe('validateBasicEnvironment()', () => {
      it('should return true in normal test environment', async () => {
        const isValid = await validateBasicEnvironment();
        expect(isValid).toBe(true);
      });

      it('should not throw errors', async () => {
        await expect(validateBasicEnvironment()).resolves.toBeDefined();
      });
    });

    describe('isValidGitRepository()', () => {
      it('should return false for non-git directory', async () => {
        const isValid = await isValidGitRepository(tempDir);
        expect(isValid).toBe(false);
      });

      it('should return true for git repository', async () => {
        // Initialize git repository
        const git = simpleGit(tempDir);
        await git.init();

        const isValid = await isValidGitRepository(tempDir);
        expect(isValid).toBe(true);
      });

      it('should use current directory by default', async () => {
        const isValid = await isValidGitRepository();
        expect(typeof isValid).toBe('boolean');
      });

      it('should not throw errors for invalid paths', async () => {
        const isValid = await isValidGitRepository('/nonexistent/path');
        expect(isValid).toBe(false);
      });
    });

    describe('validateGinkoConfig()', () => {
      it('should return false when config does not exist', async () => {
        const isValid = await validateGinkoConfig(tempDir);
        expect(isValid).toBe(false);
      });

      it('should return true for valid config', async () => {
        const config = {
          version: '1.0.0',
          paths: {
            docs: { root: './docs' },
            ginko: { root: './.ginko' }
          },
          features: { autoHandoff: true }
        };

        await fs.writeJson(path.join(tempDir, 'ginko.json'), config);

        const isValid = await validateGinkoConfig(tempDir);
        expect(isValid).toBe(true);
      });

      it('should return false for invalid JSON', async () => {
        await fs.writeFile(path.join(tempDir, 'ginko.json'), '{ invalid json }');

        const isValid = await validateGinkoConfig(tempDir);
        expect(isValid).toBe(false);
      });

      it('should not throw errors', async () => {
        await expect(validateGinkoConfig('/nonexistent/path')).resolves.toBe(false);
      });
    });

    describe('getPlatformInfo()', () => {
      it('should return valid platform type', () => {
        const platform = getPlatformInfo();
        expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);
      });

      it('should be consistent', () => {
        const platform1 = getPlatformInfo();
        const platform2 = getPlatformInfo();
        expect(platform1).toBe(platform2);
      });
    });

    describe('isNodeCompatible()', () => {
      it('should return true in test environment', () => {
        const isCompatible = isNodeCompatible();
        expect(isCompatible).toBe(true);
      });

      it('should return boolean', () => {
        const isCompatible = isNodeCompatible();
        expect(typeof isCompatible).toBe('boolean');
      });
    });
  });

  describe('Comprehensive validation functions', () => {
    describe('validateGinkoSetup()', () => {
      it('should return validation summary', async () => {
        const summary = await validateGinkoSetup({
          projectRoot: tempDir,
          skipOptional: true
        });

        expect(summary).toMatchObject({
          success: expect.any(Boolean),
          canProceed: expect.any(Boolean),
          reports: expect.any(Array),
          errors: expect.any(Array),
          warnings: expect.any(Array),
          duration: expect.any(Number),
          metadata: expect.any(Object)
        });
      });

      it('should fail for incomplete setup', async () => {
        const summary = await validateGinkoSetup({
          projectRoot: tempDir,
          skipOptional: true
        });

        expect(summary.canProceed).toBe(false);
        expect(summary.errors.length).toBeGreaterThan(0);
      });

      it('should succeed for complete setup', async () => {
        // Setup git repository
        const git = simpleGit(tempDir);
        await git.init();
        await git.config('user.email', 'test@example.com');
        await git.config('user.name', 'Test User');

        // Setup ginko config
        const config = {
          version: '1.0.0',
          paths: {
            docs: { root: './docs' },
            ginko: { root: './.ginko' }
          },
          features: { autoHandoff: true }
        };

        await fs.writeJson(path.join(tempDir, 'ginko.json'), config);

        const summary = await validateGinkoSetup({
          projectRoot: tempDir,
          skipOptional: true
        });

        expect(summary.canProceed).toBe(true);
        expect(summary.success).toBe(true);
      });

      it('should respect skipOptional option', async () => {
        const withOptional = await validateGinkoSetup({
          projectRoot: tempDir,
          skipOptional: false
        });

        const withoutOptional = await validateGinkoSetup({
          projectRoot: tempDir,
          skipOptional: true
        });

        expect(withOptional.reports.length).toBeGreaterThanOrEqual(withoutOptional.reports.length);
      });

      it('should handle errors gracefully', async () => {
        const summary = await validateGinkoSetup({
          projectRoot: '/nonexistent/path',
          skipOptional: true
        });

        expect(summary).toBeDefined();
        expect(summary.canProceed).toBe(false);
      });
    });

    describe('canRunGinko()', () => {
      it('should return false for incomplete setup', async () => {
        const canRun = await canRunGinko(tempDir);
        expect(canRun).toBe(false);
      });

      it('should return true for valid setup', async () => {
        // Setup git repository
        const git = simpleGit(tempDir);
        await git.init();

        const canRun = await canRunGinko(tempDir);
        expect(canRun).toBe(true); // Should be able to run with just git
      });

      it('should not throw errors', async () => {
        await expect(canRunGinko('/nonexistent/path')).resolves.toBe(false);
      });

      it('should be fast', async () => {
        const startTime = Date.now();
        await canRunGinko(tempDir);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      });
    });
  });

  describe('End-to-end scenarios', () => {
    it('should handle fresh project initialization workflow', async () => {
      // Step 1: Check if we can run ginko (should fail)
      let canRun = await canRunGinko(tempDir);
      expect(canRun).toBe(false);

      // Step 2: Check if it's a git repository (should fail)
      let isGitRepo = await isValidGitRepository(tempDir);
      expect(isGitRepo).toBe(false);

      // Step 3: Initialize git
      const git = simpleGit(tempDir);
      await git.init();

      // Step 4: Check git repository again (should pass)
      isGitRepo = await isValidGitRepository(tempDir);
      expect(isGitRepo).toBe(true);

      // Step 5: Check if we can run ginko (should pass now)
      canRun = await canRunGinko(tempDir);
      expect(canRun).toBe(true);

      // Step 6: Check ginko config (should fail)
      let hasConfig = await validateGinkoConfig(tempDir);
      expect(hasConfig).toBe(false);

      // Step 7: Create ginko config
      const config = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { autoHandoff: true }
      };

      await fs.writeJson(path.join(tempDir, 'ginko.json'), config);

      // Step 8: Check ginko config again (should pass)
      hasConfig = await validateGinkoConfig(tempDir);
      expect(hasConfig).toBe(true);

      // Step 9: Full validation should succeed
      const summary = await validateGinkoSetup({
        projectRoot: tempDir,
        skipOptional: true
      });

      expect(summary.success).toBe(true);
      expect(summary.canProceed).toBe(true);
      expect(summary.errors.length).toBe(0);
    });

    it('should provide helpful guidance for common issues', async () => {
      // Test with no git repository
      const summary = await validateGinkoSetup({
        projectRoot: tempDir,
        skipOptional: true
      });

      expect(summary.canProceed).toBe(false);

      const gitError = summary.errors.find(e => e.validator === 'Git Repository');
      expect(gitError).toBeDefined();
      expect(gitError?.suggestions).toContain('Initialize git: git init');
    });

    it('should detect platform-specific issues', async () => {
      const platform = getPlatformInfo();
      const isEnvValid = await validateBasicEnvironment();
      const isNodeValid = isNodeCompatible();

      // All should be valid in test environment
      expect(['windows', 'macos', 'linux', 'unknown']).toContain(platform);
      expect(isEnvValid).toBe(true);
      expect(isNodeValid).toBe(true);

      // Platform should be detected correctly
      expect(platform).not.toBe('unknown');
    });
  });

  describe('Performance and reliability', () => {
    it('should complete validations within reasonable time', async () => {
      const startTime = Date.now();

      await Promise.all([
        validateBasicEnvironment(),
        isValidGitRepository(tempDir),
        validateGinkoConfig(tempDir),
        canRunGinko(tempDir)
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // All validations in under 10 seconds
    });

    it('should be robust against concurrent access', async () => {
      // Run multiple validations concurrently
      const promises = Array(5).fill(null).map(() => canRunGinko(tempDir));
      const results = await Promise.all(promises);

      // All should return the same result
      expect(results.every(r => r === results[0])).toBe(true);
    });

    it('should handle resource constraints gracefully', async () => {
      // Test with very short timeout
      const summary = await validateGinkoSetup({
        projectRoot: tempDir,
        skipOptional: true,
        timeoutMs: 100
      });

      // Should still complete, even if individual validations timeout
      expect(summary).toBeDefined();
      expect(typeof summary.canProceed).toBe('boolean');
    });
  });
});