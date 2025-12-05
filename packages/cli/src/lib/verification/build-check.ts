/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: verification, build, health-check, CI
 * @related: packages/cli/src/lib/verification/test-check.ts
 * @priority: high
 * @complexity: medium
 * @dependencies: fs-extra, child_process
 */

import * as fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Result of running a build verification
 */
export interface BuildResult {
  passed: boolean;
  output: string;
  errorOutput?: string;
  duration_ms: number;
}

/**
 * Options for build verification
 */
export interface BuildCheckOptions {
  /** Maximum time to wait for build in milliseconds (default: 600000 = 10 min) */
  timeout?: number;
}

/**
 * Detects the appropriate build command for a project
 *
 * Detection order:
 * 1. package.json "build" script
 * 2. tsconfig.json → npx tsc --noEmit
 * 3. Fallback to npm run build
 *
 * @param projectRoot - Absolute path to project root
 * @returns Build command to execute
 */
async function detectBuildCommand(projectRoot: string): Promise<string> {
  // Check for package.json with build script
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.scripts?.build) {
        return 'npm run build';
      }
    } catch (error) {
      // Invalid package.json, continue to next detection
    }
  }

  // Check for tsconfig.json → use TypeScript compiler
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (await fs.pathExists(tsconfigPath)) {
    return 'npx tsc --noEmit';
  }

  // Default fallback
  return 'npm run build';
}

/**
 * Runs build verification for a project
 *
 * Automatically detects build command and executes it, capturing output.
 * Handles errors gracefully and returns structured results.
 *
 * @param projectRoot - Absolute path to project root
 * @param options - Build check options
 * @returns Build result with success status, output, and duration
 *
 * @example
 * ```typescript
 * const result = await runBuild('/path/to/project');
 * if (result.passed) {
 *   console.log('Build successful in', result.duration_ms, 'ms');
 * } else {
 *   console.error('Build failed:', result.errorOutput);
 * }
 * ```
 */
export async function runBuild(
  projectRoot: string,
  options?: BuildCheckOptions
): Promise<BuildResult> {
  const startTime = Date.now();
  const timeout = options?.timeout ?? 600000; // 10 minutes default

  try {
    // Detect appropriate build command
    const buildCommand = await detectBuildCommand(projectRoot);

    // Execute build with timeout
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: projectRoot,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large build outputs
    });

    const duration_ms = Date.now() - startTime;

    // Build succeeded
    return {
      passed: true,
      output: stdout || stderr || 'Build completed successfully (no output)',
      duration_ms,
    };
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;

    // Build failed or timed out
    return {
      passed: false,
      output: error.stdout || '',
      errorOutput: error.stderr || error.message || 'Build failed with unknown error',
      duration_ms,
    };
  }
}

/**
 * Checks if a project has a buildable configuration
 *
 * @param projectRoot - Absolute path to project root
 * @returns True if project has package.json or tsconfig.json
 */
export async function isBuildable(projectRoot: string): Promise<boolean> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

  return (
    (await fs.pathExists(packageJsonPath)) || (await fs.pathExists(tsconfigPath))
  );
}
