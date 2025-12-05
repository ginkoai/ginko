/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, lint, quality, epic-004-s3]
 * @related: [test-runner.ts, build-check.ts, ../commands/verify.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, child_process]
 */

/**
 * Lint Verification Utility
 *
 * Detects and runs lint commands to verify code quality standards.
 *
 * Pattern:
 * - Auto-detects lint command from package.json scripts
 * - Checks for common lint config files (.eslintrc, eslint.config.js, etc.)
 * - Parses lint output to extract error/warning counts
 * - Supports baseline comparison to detect new errors
 * - Returns structured result with pass/fail status
 *
 * Detection Logic:
 * 1. Check package.json for "lint" script
 * 2. Check for lint config files
 * 3. Default to `npm run lint` if both exist
 *
 * Parsing:
 * - ESLint format: "✖ N problems (X errors, Y warnings)"
 * - Alternative formats: Look for "error(s)" and "warning(s)" patterns
 *
 * Usage:
 * ```typescript
 * const { runLint } = require('./lint-check');
 *
 * // Basic usage
 * const result = await runLint('/path/to/project');
 * console.log(`Passed: ${result.passed}, Errors: ${result.errorCount}`);
 *
 * // With baseline comparison
 * const result = await runLint('/path/to/project', { baseline: 5 });
 * // Only fails if error count > 5 (new errors introduced)
 *
 * // With timeout
 * const result = await runLint('/path/to/project', { timeout: 60000 });
 * ```
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface LintResult {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  output: string;
  duration_ms: number;
}

export interface LintOptions {
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Baseline error count - only fail if errors exceed this number */
  baseline?: number;
}

/**
 * Detect lint command from project configuration
 */
async function detectLintCommand(projectRoot: string): Promise<string | null> {
  try {
    // Check package.json for lint script
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.scripts?.lint) {
      return 'npm run lint';
    }

    // Check for common lint config files
    const lintConfigFiles = [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
    ];

    for (const configFile of lintConfigFiles) {
      const configPath = path.join(projectRoot, configFile);
      try {
        await fs.access(configPath);
        // Config exists, assume eslint is available
        return 'npx eslint .';
      } catch {
        // Config doesn't exist, try next
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse lint output to extract error and warning counts
 */
function parseLintOutput(output: string): { errorCount: number; warningCount: number } {
  let errorCount = 0;
  let warningCount = 0;

  // ESLint format: "✖ 42 problems (23 errors, 19 warnings)"
  const eslintMatch = output.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/i);
  if (eslintMatch) {
    errorCount = parseInt(eslintMatch[2], 10);
    warningCount = parseInt(eslintMatch[3], 10);
    return { errorCount, warningCount };
  }

  // Alternative ESLint format: "✖ 23 errors, 19 warnings"
  const eslintAltMatch = output.match(/(\d+)\s+errors?,\s+(\d+)\s+warnings?/i);
  if (eslintAltMatch) {
    errorCount = parseInt(eslintAltMatch[1], 10);
    warningCount = parseInt(eslintAltMatch[2], 10);
    return { errorCount, warningCount };
  }

  // Generic error pattern
  const errorMatch = output.match(/(\d+)\s+errors?/i);
  if (errorMatch) {
    errorCount = parseInt(errorMatch[1], 10);
  }

  // Generic warning pattern
  const warningMatch = output.match(/(\d+)\s+warnings?/i);
  if (warningMatch) {
    warningCount = parseInt(warningMatch[1], 10);
  }

  // If no counts found, check for "no problems" or similar success messages
  if (errorCount === 0 && warningCount === 0) {
    if (
      output.includes('no problems') ||
      output.includes('0 errors') ||
      output.includes('All matched files use Prettier code style')
    ) {
      return { errorCount: 0, warningCount: 0 };
    }
  }

  return { errorCount, warningCount };
}

/**
 * Run lint command and return structured result
 *
 * @param projectRoot - Absolute path to project root directory
 * @param options - Optional configuration (timeout, baseline)
 * @returns LintResult with pass/fail status and details
 *
 * @throws Error if projectRoot doesn't exist or lint command fails to execute
 */
export async function runLint(
  projectRoot: string,
  options: LintOptions = {}
): Promise<LintResult> {
  const { timeout = 120000, baseline } = options;
  const startTime = Date.now();

  try {
    // Verify project root exists
    await fs.access(projectRoot);

    // Detect lint command
    const lintCommand = await detectLintCommand(projectRoot);

    if (!lintCommand) {
      return {
        passed: true,
        errorCount: 0,
        warningCount: 0,
        output: 'No lint command detected. Skipping lint verification.',
        duration_ms: Date.now() - startTime,
      };
    }

    // Run lint command
    let output = '';
    let errorCount = 0;
    let warningCount = 0;

    try {
      const { stdout, stderr } = await execAsync(lintCommand, {
        cwd: projectRoot,
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      output = stdout + stderr;
      const counts = parseLintOutput(output);
      errorCount = counts.errorCount;
      warningCount = counts.warningCount;
    } catch (error: any) {
      // Lint commands typically exit with non-zero on errors
      // Capture output even on failure
      output = (error.stdout || '') + (error.stderr || '');
      const counts = parseLintOutput(output);
      errorCount = counts.errorCount;
      warningCount = counts.warningCount;

      // If parsing found no errors but command failed, it's likely a real error
      if (errorCount === 0 && error.code !== 0) {
        throw error;
      }
    }

    const duration_ms = Date.now() - startTime;

    // Determine pass/fail
    let passed = errorCount === 0;

    // Apply baseline comparison if provided
    if (baseline !== undefined) {
      passed = errorCount <= baseline;
    }

    return {
      passed,
      errorCount,
      warningCount,
      output: output.trim(),
      duration_ms,
    };
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;

    // Handle execution errors gracefully
    return {
      passed: false,
      errorCount: -1,
      warningCount: -1,
      output: `Lint execution failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`,
      duration_ms,
    };
  }
}
