/**
 * @fileType: command
 * @status: current
 * @updated: 2026-02-16
 * @tags: [cli, health, adherence, process, supervision, EPIC-022]
 * @related: [../lib/health-checker.ts, status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, readline]
 */

/**
 * ginko health — Process Adherence Health Check (EPIC-022)
 *
 * Gives human partners a supervision dashboard at natural breakpoints.
 *
 * Framing: AI partners can make mistakes and skip important steps
 * just like humans. This tool helps humans carry out their
 * supervisory responsibilities effectively.
 */

import chalk from 'chalk';
import readline from 'readline';
import { runHealthChecks, type HealthResult, type HealthCategory, type HealthCheckItem } from '../lib/health-checker.js';
import { recordAdoptionSignal } from '../lib/adoption-score.js';

// ── Main Command ─────────────────────────────────────────────────

export async function healthCommand(options: { fix?: boolean; verbose?: boolean } = {}) {
  try {
    const result = await runHealthChecks();

    // EPIC-022: Record adoption signal for using health check
    try { await recordAdoptionSignal('ran_health_check'); } catch { /* non-critical */ }

    if (options.fix) {
      await runFixMode(result);
    } else {
      renderReport(result, options.verbose ?? false);
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ── Fix Mode ─────────────────────────────────────────────────────

async function runFixMode(result: HealthResult) {
  const gaps = getGaps(result);

  if (gaps.length === 0) {
    console.log(chalk.green('\n  All checks passing. Nothing to fix.\n'));
    return;
  }

  console.log('');
  console.log(chalk.green.bold('🌿 Ginko Health Fix'));
  console.log(chalk.dim('━'.repeat(50)));
  console.log(chalk.dim(`  ${gaps.length} item(s) need attention\n`));

  let fixed = 0;
  let skipped = 0;
  let skipAll = false;

  for (const gap of gaps) {
    if (skipAll) {
      skipped++;
      continue;
    }

    const icon = gap.status === 'fail' ? chalk.red('✗') : chalk.yellow('⚠');
    console.log(`${icon} ${chalk.bold(gap.label)}: ${gap.detail}`);

    if (gap.fix) {
      console.log(chalk.dim(`  Suggestion: ${gap.fix}`));
    }

    const action = await promptFixAction(gap);

    if (action === 'skip-all') {
      skipAll = true;
      skipped++;
      continue;
    }

    if (action === 'skip') {
      skipped++;
      console.log(chalk.dim('  Skipped\n'));
      continue;
    }

    if (action === 'fix') {
      // Execute the fix
      const didFix = await executeFix(gap);
      if (didFix) {
        fixed++;
      } else {
        skipped++;
      }
      console.log('');
    }
  }

  // Summary
  console.log(chalk.dim('━'.repeat(50)));
  console.log(`Fix complete: ${chalk.green(`${fixed} fixed`)}, ${chalk.dim(`${skipped} skipped`)}`);
  console.log(chalk.dim('Run `ginko health` to verify current state'));
  console.log('');
}

function getGaps(result: HealthResult): (HealthCheckItem & { category: string })[] {
  const gaps: (HealthCheckItem & { category: string })[] = [];
  for (const cat of result.categories) {
    for (const item of cat.items) {
      if (item.status === 'fail' || item.status === 'warn') {
        gaps.push({ ...item, category: cat.name });
      }
    }
  }
  // Failures first, then warnings
  gaps.sort((a, b) => {
    if (a.status === 'fail' && b.status !== 'fail') return -1;
    if (a.status !== 'fail' && b.status === 'fail') return 1;
    return 0;
  });
  return gaps;
}

async function promptFixAction(
  gap: HealthCheckItem,
): Promise<'fix' | 'skip' | 'skip-all'> {
  // Non-TTY: skip all fixes
  if (!process.stdin.isTTY) {
    return 'skip';
  }

  const hasFix = !!gap.fix;
  const options = hasFix
    ? `[${chalk.green('f')}]ix / [${chalk.dim('s')}]kip / [${chalk.dim('S')}]kip all`
    : `[${chalk.dim('s')}]kip / [${chalk.dim('S')}]kip all`;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`  ${options}: `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === 'f' && hasFix) return resolve('fix');
      if (a === 's' || a === '') return resolve('skip');
      if (answer.trim() === 'S') return resolve('skip-all');
      resolve('skip');
    });
  });
}

async function executeFix(gap: HealthCheckItem): Promise<boolean> {
  if (!gap.fix) return false;

  // Extract command from fix suggestion if it contains a backtick-quoted command
  const cmdMatch = gap.fix.match(/`([^`]+)`/);
  if (!cmdMatch) {
    // No executable command — just show the instruction
    console.log(chalk.cyan(`  Action needed: ${gap.fix}`));
    return false;
  }

  const cmd = cmdMatch[1];

  // Only auto-execute safe, read-only or status-updating ginko commands
  const safeCommands = [
    'ginko push',
    'ginko pull',
    'ginko start',
  ];

  const isSafe = safeCommands.some(safe => cmd.startsWith(safe));

  if (isSafe) {
    console.log(chalk.cyan(`  Running: ${cmd}`));
    try {
      const { execSync } = await import('child_process');
      execSync(cmd, { stdio: 'inherit', timeout: 30000 });
      console.log(chalk.green('  Done'));
      return true;
    } catch (error) {
      console.log(chalk.yellow(`  Command failed: ${error instanceof Error ? error.message : String(error)}`));
      return false;
    }
  } else {
    // Show the command for the user to run manually
    console.log(chalk.cyan(`  Run manually: ${chalk.bold(cmd)}`));
    return false;
  }
}

// ── Rendering ────────────────────────────────────────────────────

function renderReport(result: HealthResult, verbose: boolean) {
  const { categories, adherence, passCount, warnCount, failCount } = result;
  const scoreColor = adherence >= 80 ? chalk.green : adherence >= 60 ? chalk.yellow : chalk.red;

  console.log('');
  console.log(chalk.green.bold('🌿 Ginko Health Check'));
  console.log(chalk.dim('━'.repeat(50)));
  console.log('');

  for (const cat of categories) {
    console.log(`${cat.icon}  ${chalk.bold(cat.name)}`);

    for (const item of cat.items) {
      const icon =
        item.status === 'pass' ? chalk.green('✓') :
        item.status === 'warn' ? chalk.yellow('⚠') :
        chalk.red('✗');

      console.log(`   ${icon} ${item.label} ${chalk.dim('·')} ${item.detail}`);

      if ((verbose || item.status === 'fail') && item.fix) {
        console.log(`     ${chalk.dim('→')} ${chalk.dim(item.fix)}`);
      }
    }

    console.log('');
  }

  // Summary
  console.log(chalk.dim('━'.repeat(50)));
  console.log(
    `Adherence: ${scoreColor.bold(`${adherence}%`)} ` +
    chalk.dim(`(${passCount} pass, ${warnCount} warn, ${failCount} fail)`)
  );

  if (failCount > 0 || warnCount > 0) {
    console.log(chalk.dim('\nRun `ginko health --verbose` for fix suggestions'));
    console.log(chalk.dim('Run `ginko health --fix` for guided remediation'));
  }

  console.log('');
}
