/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, testing, task-validation, epic-004, sprint-3]
 * @related: [build-check.ts, lint-check.ts, ../sprint-loader.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [child_process, fs, path]
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Result from running project tests
 * EPIC-004 Sprint 3 TASK-3: Test Runner Integration
 */
export interface TestResult {
  passed: boolean;
  passCount: number;
  failCount: number;
  coverage?: number;
  output: string;
  duration_ms: number;
}

/**
 * Options for test execution
 */
export interface TestOptions {
  timeout?: number; // milliseconds, default 300000 (5 min)
}

/**
 * Detected test framework configuration
 */
interface TestConfig {
  framework: 'jest' | 'vitest' | 'mocha' | 'npm-test' | 'unknown';
  command: string;
  args: string[];
}

/**
 * Detect test framework from project configuration
 * Checks package.json scripts and config files
 */
function detectTestFramework(projectRoot: string): TestConfig {
  // Check package.json first
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check for test script
      const testScript = packageJson.scripts?.test;
      if (testScript) {
        // Detect framework from test script command
        if (testScript.includes('jest')) {
          return { framework: 'jest', command: 'npm', args: ['test', '--', '--no-coverage'] };
        }
        if (testScript.includes('vitest')) {
          return { framework: 'vitest', command: 'npm', args: ['test'] };
        }
        if (testScript.includes('mocha')) {
          return { framework: 'mocha', command: 'npm', args: ['test'] };
        }

        // Generic npm test
        return { framework: 'npm-test', command: 'npm', args: ['test'] };
      }

      // Check for framework in devDependencies
      const devDeps = packageJson.devDependencies || {};
      const deps = packageJson.dependencies || {};
      const allDeps = { ...devDeps, ...deps };

      if (allDeps.jest || allDeps['@types/jest']) {
        return { framework: 'jest', command: 'npx', args: ['jest', '--no-coverage'] };
      }
      if (allDeps.vitest) {
        return { framework: 'vitest', command: 'npx', args: ['vitest', 'run'] };
      }
      if (allDeps.mocha) {
        return { framework: 'mocha', command: 'npx', args: ['mocha'] };
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  // Check for config files
  const configFiles = [
    { file: 'jest.config.js', framework: 'jest' as const, command: 'npx', args: ['jest', '--no-coverage'] },
    { file: 'jest.config.ts', framework: 'jest' as const, command: 'npx', args: ['jest', '--no-coverage'] },
    { file: 'vitest.config.ts', framework: 'vitest' as const, command: 'npx', args: ['vitest', 'run'] },
    { file: 'vitest.config.js', framework: 'vitest' as const, command: 'npx', args: ['vitest', 'run'] },
    { file: '.mocharc.json', framework: 'mocha' as const, command: 'npx', args: ['mocha'] },
    { file: '.mocharc.js', framework: 'mocha' as const, command: 'npx', args: ['mocha'] },
  ];

  for (const config of configFiles) {
    if (existsSync(join(projectRoot, config.file))) {
      return { framework: config.framework, command: config.command, args: config.args };
    }
  }

  // Default: try npm test
  return { framework: 'unknown', command: 'npm', args: ['test'] };
}

/**
 * Parse test output to extract pass/fail counts
 * Supports Jest, Vitest, Mocha output formats
 */
function parseTestOutput(output: string, framework: string): { passCount: number; failCount: number; coverage?: number } {
  let passCount = 0;
  let failCount = 0;
  let coverage: number | undefined;

  // Jest/Vitest patterns:
  // "Tests: 5 passed, 1 failed, 6 total"
  // "Test Suites: 2 passed, 2 total"
  // "Tests:       142 passed, 142 total"
  const jestPattern = /Tests?:\s*(?:(\d+)\s+passed)?(?:,?\s*(\d+)\s+failed)?(?:,?\s*(\d+)\s+total)?/i;
  const jestMatch = output.match(jestPattern);

  if (jestMatch) {
    passCount = parseInt(jestMatch[1] || '0', 10);
    failCount = parseInt(jestMatch[2] || '0', 10);
    const total = parseInt(jestMatch[3] || '0', 10);

    // If we have total but not pass/fail breakdown, calculate
    if (total > 0 && passCount === 0 && failCount === 0) {
      // Check for failures in output
      const failureMatch = output.match(/(\d+)\s+failing/i);
      if (failureMatch) {
        failCount = parseInt(failureMatch[1], 10);
        passCount = total - failCount;
      } else {
        // Assume all passed if no failures reported
        passCount = total;
      }
    }
  }

  // Mocha patterns:
  // "  15 passing"
  // "  2 failing"
  const mochaPassPattern = /(\d+)\s+passing/i;
  const mochaFailPattern = /(\d+)\s+failing/i;

  const mochaPassMatch = output.match(mochaPassPattern);
  const mochaFailMatch = output.match(mochaFailPattern);

  if (mochaPassMatch) {
    passCount = parseInt(mochaPassMatch[1], 10);
  }
  if (mochaFailMatch) {
    failCount = parseInt(mochaFailMatch[1], 10);
  }

  // Coverage pattern (Jest/Vitest):
  // "All files      |     85.71 |     75.00 |     80.00 |     85.71 |"
  // Extract overall coverage percentage
  const coveragePattern = /All files\s*\|\s*(\d+(?:\.\d+)?)/i;
  const coverageMatch = output.match(coveragePattern);
  if (coverageMatch) {
    coverage = parseFloat(coverageMatch[1]);
  }

  return { passCount, failCount, coverage };
}

/**
 * Run tests and capture results
 *
 * Detects test framework from package.json scripts or config files.
 * Runs tests with timeout, captures output, parses pass/fail counts.
 *
 * @param projectRoot - Path to project root directory
 * @param options - Test execution options (timeout)
 * @returns Structured test result with pass/fail counts
 *
 * @example
 * ```typescript
 * const result = await runTests('/path/to/project');
 * if (result.passed) {
 *   console.log(`✓ All tests passed (${result.passCount})`);
 * } else {
 *   console.log(`✗ ${result.failCount} tests failed`);
 * }
 * ```
 */
export async function runTests(
  projectRoot: string,
  options: TestOptions = {}
): Promise<TestResult> {
  const timeout = options.timeout || 300000; // 5 minutes default
  const startTime = Date.now();

  // Detect test framework and command
  const config = detectTestFramework(projectRoot);

  return new Promise((resolve) => {
    let output = '';
    let timedOut = false;

    // Spawn test process
    const testProcess = spawn(config.command, config.args, {
      cwd: projectRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture stdout and stderr
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      testProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    // Handle process completion
    testProcess.on('close', (code) => {
      clearTimeout(timeoutHandle);
      const duration_ms = Date.now() - startTime;

      // If timed out, return timeout result
      if (timedOut) {
        resolve({
          passed: false,
          passCount: 0,
          failCount: 0,
          output: `Test execution timed out after ${timeout}ms\n\n${output}`,
          duration_ms,
        });
        return;
      }

      // Parse test output
      const { passCount, failCount, coverage } = parseTestOutput(output, config.framework);

      // Determine if tests passed
      // Exit code 0 = success, but also check for failures in output
      const passed = code === 0 && failCount === 0;

      resolve({
        passed,
        passCount,
        failCount,
        coverage,
        output,
        duration_ms,
      });
    });

    // Handle spawn errors
    testProcess.on('error', (error) => {
      clearTimeout(timeoutHandle);
      const duration_ms = Date.now() - startTime;

      resolve({
        passed: false,
        passCount: 0,
        failCount: 0,
        output: `Failed to run tests: ${error.message}\n\nDetected framework: ${config.framework}\nCommand: ${config.command} ${config.args.join(' ')}`,
        duration_ms,
      });
    });
  });
}
