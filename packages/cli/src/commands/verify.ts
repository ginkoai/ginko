/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, task-validation, epic-004, sprint-3, cli]
 * @related: [../lib/verification/test-runner.ts, ../lib/verification/build-check.ts, ../lib/verification/lint-check.ts, ../lib/sprint-loader.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ../lib/sprint-loader, ../lib/verification]
 */

/**
 * Verify Command (EPIC-004 Sprint 3 TASK-6)
 *
 * Loads task from active sprint and runs verification checks based on
 * acceptance criteria. Returns structured pass/fail results.
 *
 * Usage:
 *   ginko verify TASK-1
 *   ginko verify TASK-1 --json
 *
 * Output format:
 * ```
 * Verifying TASK-1: Implement user authentication
 *
 * Criteria:
 *   ✓ Unit tests pass (142 passed, 0 failed)
 *   ✓ Build succeeds (12.3s)
 *   ✓ No new lint errors (0 new)
 *   ✗ API response < 200ms (actual: 342ms)
 *
 * Result: FAILED (3/4 criteria passed)
 * ```
 */

import chalk from 'chalk';
import { loadSprintChecklist } from '../lib/sprint-loader.js';
import { runTests } from '../lib/verification/test-runner.js';
import { runBuild } from '../lib/verification/build-check.js';
import { runLint } from '../lib/verification/lint-check.js';
import type { AcceptanceCriterion } from '../lib/sprint-loader.js';
import { execSync } from 'child_process';

/**
 * Result of verifying a single criterion
 */
interface CriterionResult {
  id: string;
  description: string;
  passed: boolean;
  details?: string;
  duration_ms?: number;
}

/**
 * Overall verification result
 */
interface VerificationResult {
  taskId: string;
  taskTitle: string;
  passed: boolean;
  timestamp: Date;
  criteria: CriterionResult[];
  summary: string;
}

/**
 * Find git root directory
 */
function findGitRoot(): string {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return root;
  } catch {
    return process.cwd();
  }
}

/**
 * Execute verification check for a single criterion
 */
async function verifyCriterion(
  criterion: AcceptanceCriterion,
  projectRoot: string
): Promise<CriterionResult> {
  const result: CriterionResult = {
    id: criterion.id,
    description: criterion.description,
    passed: false,
  };

  try {
    switch (criterion.type) {
      case 'test': {
        const testResult = await runTests(projectRoot);
        result.passed = testResult.passed;
        result.duration_ms = testResult.duration_ms;
        result.details = testResult.passed
          ? `${testResult.passCount} passed, ${testResult.failCount} failed`
          : `${testResult.failCount} test(s) failed`;
        break;
      }

      case 'build': {
        const buildResult = await runBuild(projectRoot);
        result.passed = buildResult.passed;
        result.duration_ms = buildResult.duration_ms;
        result.details = buildResult.passed
          ? `${(buildResult.duration_ms / 1000).toFixed(1)}s`
          : buildResult.errorOutput || 'Build failed';
        break;
      }

      case 'lint': {
        const lintResult = await runLint(projectRoot);
        result.passed = lintResult.passed;
        result.duration_ms = lintResult.duration_ms;
        result.details = lintResult.passed
          ? `${lintResult.errorCount} errors, ${lintResult.warningCount} warnings`
          : `${lintResult.errorCount} error(s) found`;
        break;
      }

      case 'performance': {
        // Performance criteria require custom implementation
        // For now, mark as manual verification needed
        result.passed = false;
        result.details = 'Manual verification required (performance testing not yet automated)';
        break;
      }

      case 'manual': {
        // Manual criteria cannot be auto-verified
        result.passed = false;
        result.details = 'Manual verification required';
        break;
      }

      case 'custom': {
        // Custom criteria with commands
        if (criterion.command) {
          try {
            execSync(criterion.command, {
              cwd: projectRoot,
              stdio: 'pipe',
              timeout: 30000, // 30 second timeout
            });
            result.passed = true;
            result.details = 'Custom command succeeded';
          } catch (error: any) {
            result.passed = false;
            result.details = `Custom command failed: ${error.message}`;
          }
        } else {
          result.passed = false;
          result.details = 'Manual verification required (no command specified)';
        }
        break;
      }

      default:
        result.passed = false;
        result.details = 'Unknown criterion type';
    }
  } catch (error: any) {
    result.passed = false;
    result.details = `Verification error: ${error.message}`;
  }

  return result;
}

/**
 * Verify command implementation
 */
export async function verifyCommand(
  taskId: string,
  options: { json?: boolean } = {}
): Promise<void> {
  try {
    const projectRoot = findGitRoot();

    // Load sprint checklist
    const checklist = await loadSprintChecklist(projectRoot);
    if (!checklist) {
      console.error(chalk.red('❌ No active sprint found'));
      process.exit(1);
    }

    // Find the specified task
    const task = checklist.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(chalk.red(`❌ Task ${taskId} not found in active sprint`));
      console.error(chalk.dim(`   Active sprint: ${checklist.name}`));
      console.error(chalk.dim(`   Available tasks: ${checklist.tasks.map(t => t.id).join(', ')}`));
      process.exit(1);
    }

    // Check if task has acceptance criteria
    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
      console.error(chalk.yellow(`⚠️  Task ${taskId} has no acceptance criteria defined`));
      console.error(chalk.dim('   Add acceptance criteria to the task in the sprint file'));
      process.exit(1);
    }

    // Show verification header
    if (!options.json) {
      console.log(chalk.bold(`\nVerifying ${taskId}: ${task.title}\n`));
    }

    // Run verification checks
    const criteriaResults: CriterionResult[] = [];
    for (const criterion of task.acceptanceCriteria) {
      if (!options.json) {
        process.stdout.write(chalk.dim(`  Checking: ${criterion.description}... `));
      }

      const result = await verifyCriterion(criterion, projectRoot);
      criteriaResults.push(result);

      if (!options.json) {
        if (result.passed) {
          console.log(chalk.green('✓'));
        } else {
          console.log(chalk.red('✗'));
        }
      }
    }

    // Calculate overall result
    const passedCount = criteriaResults.filter(r => r.passed).length;
    const totalCount = criteriaResults.length;
    const allPassed = passedCount === totalCount;

    const verificationResult: VerificationResult = {
      taskId,
      taskTitle: task.title,
      passed: allPassed,
      timestamp: new Date(),
      criteria: criteriaResults,
      summary: allPassed
        ? `All ${totalCount} criteria passed`
        : `${passedCount}/${totalCount} criteria passed`,
    };

    // Output results
    if (options.json) {
      console.log(JSON.stringify(verificationResult, null, 2));
    } else {
      console.log(chalk.bold('\nCriteria:'));
      for (const result of criteriaResults) {
        const symbol = result.passed ? chalk.green('✓') : chalk.red('✗');
        const details = result.details ? chalk.dim(` (${result.details})`) : '';
        console.log(`  ${symbol} ${result.description}${details}`);
      }

      console.log();
      if (allPassed) {
        console.log(chalk.green.bold(`✓ PASSED`) + chalk.green(` (${passedCount}/${totalCount} criteria passed)`));
      } else {
        console.log(chalk.red.bold(`✗ FAILED`) + chalk.red(` (${passedCount}/${totalCount} criteria passed)`));
      }
      console.log();
    }

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);

  } catch (error: any) {
    console.error(chalk.red(`❌ Verification error: ${error.message}`));
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}
