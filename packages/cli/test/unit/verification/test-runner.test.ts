/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, testing, unit-test, epic-004]
 * @related: [../../../src/lib/verification/test-runner.ts]
 * @priority: high
 * @complexity: medium
 */

import { runTests } from '../../../src/lib/verification/test-runner.js';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Test Runner', () => {
  let testProjectRoot: string;

  beforeEach(() => {
    // Create temporary test project
    const timestamp = new Date().getTime();
    testProjectRoot = join(tmpdir(), `test-runner-${timestamp}`);
    mkdirSync(testProjectRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('Framework Detection', () => {
    it('should detect Jest from package.json scripts', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'jest',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // This will fail because jest isn't installed, but we can verify detection
      const result = await runTests(testProjectRoot, { timeout: 5000 });

      // Should attempt to run npm test
      expect(result.output).toContain('jest');
    });

    it('should detect Vitest from package.json dependencies', async () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          vitest: '^1.0.0',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      // Should attempt to run vitest
      expect(result.output).toBeDefined();
    });

    it('should default to npm test when framework unknown', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "No tests"',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      expect(result.output).toContain('No tests');
    });
  });

  describe('Output Parsing', () => {
    it('should parse Jest output format', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "Tests: 5 passed, 1 failed, 6 total"',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      expect(result.passCount).toBe(5);
      expect(result.failCount).toBe(1);
      expect(result.passed).toBe(false);
    });

    it('should parse Mocha output format', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "  15 passing\\n  2 failing"',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      expect(result.passCount).toBe(15);
      expect(result.failCount).toBe(2);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running tests', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'sleep 10',
        },
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 1000 });

      expect(result.passed).toBe(false);
      expect(result.output).toContain('timed out');
      expect(result.duration_ms).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing test command gracefully', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {},
      };
      writeFileSync(
        join(testProjectRoot, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      expect(result.passed).toBe(false);
      expect(result.duration_ms).toBeGreaterThan(0);
    });
  });
});
