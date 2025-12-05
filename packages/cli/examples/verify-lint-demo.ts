/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [example, verification, lint, epic-004-s3]
 * @related: [../src/lib/verification/lint-check.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: []
 */

/**
 * Lint Verification Demo
 *
 * Demonstrates usage of the runLint utility.
 *
 * Usage:
 * ```bash
 * tsx examples/verify-lint-demo.ts [project-path]
 * ```
 */

import { runLint } from '../src/lib/verification/lint-check.js';
import * as path from 'path';

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);

  console.log('Lint Verification Demo');
  console.log('======================\n');
  console.log(`Project: ${absolutePath}\n`);

  // Example 1: Basic usage
  console.log('Example 1: Basic lint check');
  console.log('---------------------------');
  const result1 = await runLint(absolutePath);
  console.log(`Status: ${result1.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Errors: ${result1.errorCount}`);
  console.log(`Warnings: ${result1.warningCount}`);
  console.log(`Duration: ${result1.duration_ms}ms`);
  console.log(`Output preview: ${result1.output.substring(0, 100)}...\n`);

  // Example 2: With baseline comparison
  console.log('Example 2: Baseline comparison (baseline: 10 errors)');
  console.log('-----------------------------------------------------');
  const result2 = await runLint(absolutePath, { baseline: 10 });
  console.log(`Status: ${result2.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Errors: ${result2.errorCount} (baseline: 10)`);
  console.log(`Interpretation: ${result2.errorCount <= 10 ? 'No new errors introduced' : 'New errors detected!'}\n`);

  // Example 3: With timeout
  console.log('Example 3: With 60-second timeout');
  console.log('----------------------------------');
  const result3 = await runLint(absolutePath, { timeout: 60000 });
  console.log(`Status: ${result3.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Duration: ${result3.duration_ms}ms (timeout: 60000ms)\n`);

  console.log('Demo complete!');
}

main().catch((error) => {
  console.error('Error running demo:', error);
  process.exit(1);
});
