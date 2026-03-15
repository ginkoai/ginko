/**
 * @fileType: command
 * @status: current
 * @updated: 2026-03-15
 * @tags: [sprint, plan, integration-warnings, epic-025]
 * @related: [index.ts, ../../lib/integration-warnings.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk, fs-extra]
 */

/**
 * Sprint Plan Check Command (EPIC-025 Sprint 3)
 *
 * Re-evaluates integration warnings for an existing sprint file.
 * Reports new, resolved, and unchanged warnings.
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import { findSprintFileById } from '../../lib/sprint-loader.js';
import { parseSprintFile } from '../../lib/task-parser.js';
import {
  analyzeIntegration,
  formatIntegrationWarnings,
  formatDependencyTree,
} from '../../lib/integration-warnings.js';
import { getProjectRoot } from '../../utils/helpers.js';

interface PlanCheckOptions {
  update?: boolean;
}

export async function planCheckCommand(
  sprintId: string,
  options: PlanCheckOptions = {}
): Promise<void> {
  let projectRoot: string;
  try {
    projectRoot = await getProjectRoot();
  } catch {
    projectRoot = process.cwd();
  }

  // Find sprint file
  const sprintFile = await findSprintFileById(sprintId, projectRoot);
  if (!sprintFile) {
    console.error(chalk.red(`✗ Sprint file not found for: ${sprintId}`));
    console.error(chalk.dim('  Check sprint ID or look in docs/sprints/'));
    return;
  }

  // Parse sprint
  const result = await parseSprintFile(sprintFile);
  if (!result || result.tasks.length === 0) {
    console.log(chalk.yellow('No tasks found in sprint file'));
    return;
  }

  // Run analysis
  const analysis = analyzeIntegration(result);

  console.log(chalk.bold(`\n📋 Integration Check: ${sprintId}\n`));
  console.log(chalk.dim(`Sprint file: ${sprintFile}`));
  console.log(chalk.dim(`Tasks analyzed: ${result.tasks.length}`));
  console.log('');

  if (analysis.overlaps.length === 0) {
    console.log(chalk.green('✅ No file overlaps detected — all tasks are independent'));
    return;
  }

  // Display warnings
  console.log(chalk.yellow(`Found ${analysis.overlaps.length} file overlap(s):\n`));

  for (const overlap of analysis.overlaps) {
    const shortIds = overlap.taskIds.map(id => id.split('_').pop() || id).join(', ');
    const icon = overlap.classification === 'independent' ? chalk.green('✅') :
                 overlap.classification === 'dependent' ? chalk.red('⚠️') :
                 chalk.yellow('⚠️');

    console.log(`  ${icon} ${shortIds} → ${chalk.cyan(overlap.filePath)}`);
    console.log(chalk.dim(`     ${overlap.reason}`));
  }

  // Dependencies
  if (analysis.dependencies.length > 0) {
    console.log(chalk.bold('\nTask Dependencies:'));
    for (const dep of analysis.dependencies) {
      const fromShort = dep.from.split('_').pop() || dep.from;
      const toShort = dep.to.split('_').pop() || dep.to;
      console.log(chalk.dim(`  ${fromShort} → ${toShort}: ${dep.reason}`));
    }
  }

  // Independent tasks
  if (analysis.independentTasks.length > 0) {
    const shortIds = analysis.independentTasks.map(id => id.split('_').pop() || id).join(', ');
    console.log(chalk.green(`\nIndependent (safe to parallelize): ${shortIds}`));
  }

  // Update sprint file in place
  if (options.update) {
    const content = await fs.readFile(sprintFile, 'utf-8');
    const warnings = formatIntegrationWarnings(analysis);
    const depTree = formatDependencyTree(analysis);

    let updated = content;

    // Replace or append Integration Warnings section
    const warningsPattern = /## Integration Warnings[\s\S]*?(?=\n## |\n---\s*$|$)/;
    if (warningsPattern.test(updated) && warnings) {
      updated = updated.replace(warningsPattern, warnings);
    } else if (warnings) {
      // Append before Related Documents or at end
      const insertPoint = updated.indexOf('## Related Documents');
      if (insertPoint >= 0) {
        updated = updated.slice(0, insertPoint) + warnings + '\n\n---\n\n' + updated.slice(insertPoint);
      } else {
        updated += '\n\n---\n\n' + warnings + '\n';
      }
    }

    // Replace or append Task Dependencies section
    const depsPattern = /## Task Dependencies[\s\S]*?(?=\n## |\n---\s*$|$)/;
    if (depsPattern.test(updated) && depTree) {
      updated = updated.replace(depsPattern, depTree);
    } else if (depTree) {
      const insertPoint = updated.indexOf('## Integration Warnings');
      if (insertPoint >= 0) {
        updated = updated.slice(0, insertPoint) + depTree + '\n\n---\n\n' + updated.slice(insertPoint);
      }
    }

    if (updated !== content) {
      await fs.writeFile(sprintFile, updated, 'utf-8');
      console.log(chalk.green('\n✓ Sprint file updated with integration warnings'));
    } else {
      console.log(chalk.dim('\nNo changes needed in sprint file'));
    }
  } else {
    console.log(chalk.dim('\nRun with --update to write warnings to sprint file'));
  }
}
