/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-05
 * @tags: [test, verification, lint, epic-004-s3]
 * @related: [../../src/lib/verification/lint-check.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Lint Check Tests
 *
 * Tests for lint verification utility.
 *
 * Test Coverage:
 * - Detection of lint commands from package.json
 * - Detection of lint config files
 * - Parsing of various lint output formats
 * - Baseline comparison logic
 * - Error handling for missing projects
 * - Timeout handling
 */

import { runLint } from '../../src/lib/verification/lint-check.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('runLint', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test projects
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-lint-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should return skipped result when no lint command detected', async () => {
    // Create empty project without package.json
    const result = await runLint(tempDir);

    expect(result.passed).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.output).toContain('No lint command detected');
  });

  test('should detect lint script from package.json', async () => {
    // Create package.json with lint script
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✖ 0 problems"',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir);

    expect(result.passed).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.output).toContain('0 problems');
  });

  test('should parse ESLint standard format', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✖ 42 problems (23 errors, 19 warnings)"',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir);

    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(23);
    expect(result.warningCount).toBe(19);
  });

  test('should parse ESLint alternative format', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✖ 5 errors, 3 warnings"',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir);

    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(5);
    expect(result.warningCount).toBe(3);
  });

  test('should support baseline comparison', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✖ 3 errors, 2 warnings"',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Should pass if errors <= baseline
    const resultPass = await runLint(tempDir, { baseline: 5 });
    expect(resultPass.passed).toBe(true);
    expect(resultPass.errorCount).toBe(3);

    // Should fail if errors > baseline
    const resultFail = await runLint(tempDir, { baseline: 2 });
    expect(resultFail.passed).toBe(false);
    expect(resultFail.errorCount).toBe(3);
  });

  test('should handle timeout', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'sleep 10',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir, { timeout: 100 });

    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(-1);
    expect(result.output).toContain('failed');
  }, 10000);

  test('should return error on non-existent project', async () => {
    const result = await runLint('/nonexistent/path');

    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(-1);
  });

  test('should measure duration', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✖ 0 problems"',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir);

    expect(result.duration_ms).toBeGreaterThan(0);
    expect(result.duration_ms).toBeLessThan(5000);
  });

  test('should parse "no problems" success message', async () => {
    const packageJson = {
      name: 'test-project',
      scripts: {
        lint: 'echo "✔ All files pass linting. no problems found."',
      },
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const result = await runLint(tempDir);

    expect(result.passed).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
});
