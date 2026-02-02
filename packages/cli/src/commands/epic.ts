/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, planning, sprint-creation]
 * @related: [charter.ts, ../templates/epic-template.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, fs, path, prompts]
 */

import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { getProjectRoot } from '../utils/helpers.js';

// ============================================================================
// Types
// ============================================================================

interface EpicOptions {
  view?: boolean;
  list?: boolean;
  noAi?: boolean;
  sync?: boolean;
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Epic command - Create and manage epics with sprint breakdown
 * Usage:
 *   ginko epic             - Output template for AI-mediated creation (default)
 *   ginko epic --no-ai     - Interactive mode (future)
 *   ginko epic --list      - List existing epics
 *   ginko epic --view      - View epic details
 *   ginko epic --sync      - Sync epic to graph
 */
export async function epicCommand(options: EpicOptions = {}): Promise<void> {
  try {
    let projectRoot: string;
    try { projectRoot = await getProjectRoot(); } catch { projectRoot = process.cwd(); }

    // Handle --list flag
    if (options.list) {
      await listEpics(projectRoot);
      return;
    }

    // Handle --view flag
    if (options.view) {
      await viewEpics(projectRoot);
      return;
    }

    // Handle --sync flag (removed — ADR-077)
    if (options.sync) {
      console.log(chalk.red('\u2717 `ginko epic --sync` has been removed.'));
      console.log(chalk.dim('  Use `ginko push epic` instead (ADR-077).\n'));
      process.exit(1);
    }

    // Default: AI-mediated mode (output template) unless --no-ai specified
    if (!options.noAi) {
      await outputEpicTemplate();
      return;
    }

    // --no-ai: Interactive mode (not yet implemented)
    console.log(chalk.yellow('\n⚠️  Interactive epic creation not yet implemented'));
    console.log(chalk.dim('   Use AI-mediated mode (default) for now\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// Output Epic Template (AI-Mediated Mode)
// ============================================================================

/**
 * Output epic template for AI-mediated creation
 * The AI partner will read this, conduct a natural conversation, and create the epic
 */
async function outputEpicTemplate(): Promise<void> {
  const templatePath = new URL('../templates/epic-template.md', import.meta.url);

  try {
    const template = await fs.readFile(templatePath, 'utf-8');

    // Output template to stdout (AI partner will read this)
    console.log(template);

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading epic template: ${error.message}`));
    console.error(chalk.yellow('Template path:', templatePath.pathname));
    process.exit(1);
  }
}

// ============================================================================
// List Epics
// ============================================================================

/**
 * List all existing epics
 */
async function listEpics(projectRoot: string): Promise<void> {
  const epicsDir = path.join(projectRoot, 'docs', 'epics');

  if (!existsSync(epicsDir)) {
    console.log(chalk.yellow('\n📋 No epics found'));
    console.log(chalk.dim('   Run `ginko epic` to create one\n'));
    return;
  }

  try {
    const files = await fs.readdir(epicsDir);
    // Filter for EPIC-NNN*.md files (exclude EPIC-INDEX.md and similar)
    const epicFiles = files.filter(f =>
      f.startsWith('EPIC-') &&
      f.endsWith('.md') &&
      /^EPIC-\d{3}/.test(f)
    );

    if (epicFiles.length === 0) {
      console.log(chalk.yellow('\n📋 No epics found'));
      console.log(chalk.dim('   Run `ginko epic` to create one\n'));
      return;
    }

    console.log(chalk.green('\n📋 Epics:\n'));

    for (const file of epicFiles) {
      const content = await fs.readFile(path.join(epicsDir, file), 'utf-8');
      const titleMatch = content.match(/^# (EPIC-\d+): (.+)$/m);
      const statusMatch = content.match(/status: (\w+)/);
      const progressMatch = content.match(/Progress.*?(\d+)%/i);

      const epicId = titleMatch?.[1] || file.replace('.md', '');
      const title = titleMatch?.[2] || 'Untitled';
      const status = statusMatch?.[1] || 'unknown';
      const progress = progressMatch?.[1] || '0';

      const statusIcon = status === 'active' ? chalk.green('●') :
                         status === 'complete' ? chalk.blue('✓') :
                         chalk.dim('○');

      console.log(`  ${statusIcon} ${chalk.bold(epicId)}: ${title}`);
      console.log(chalk.dim(`     Progress: ${progress}% | Status: ${status}`));
      console.log('');
    }

    // List associated sprints
    const sprintFiles = files.filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'));
    if (sprintFiles.length > 0) {
      console.log(chalk.dim(`  📁 ${sprintFiles.length} sprint files in docs/sprints/\n`));
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error listing epics: ${error.message}`));
  }
}

// ============================================================================
// View Epic Details
// ============================================================================

/**
 * View epic details with sprint breakdown
 */
async function viewEpics(projectRoot: string): Promise<void> {
  const epicsDir = path.join(projectRoot, 'docs', 'epics');
  const sprintsDir = path.join(projectRoot, 'docs', 'sprints');

  if (!existsSync(epicsDir)) {
    console.log(chalk.yellow('\n📋 No epics found'));
    console.log(chalk.dim('   Run `ginko epic` to create one\n'));
    return;
  }

  try {
    const epicFilesList = await fs.readdir(epicsDir);
    // Filter for EPIC-NNN*.md files (exclude EPIC-INDEX.md and similar)
    const epicFiles = epicFilesList.filter(f =>
      f.startsWith('EPIC-') &&
      f.endsWith('.md') &&
      /^EPIC-\d{3}/.test(f)
    );

    if (epicFiles.length === 0) {
      console.log(chalk.yellow('\n📋 No epics found'));
      console.log(chalk.dim('   Run `ginko epic` to create one\n'));
      return;
    }

    // Get sprint files for associating with epics
    const sprintFilesList = existsSync(sprintsDir) ? await fs.readdir(sprintsDir) : [];

    for (const file of epicFiles) {
      const content = await fs.readFile(path.join(epicsDir, file), 'utf-8');

      // Parse epic header
      const titleMatch = content.match(/^# (EPIC-\d+): (.+)$/m);
      const goalMatch = content.match(/## Goal\n\n(.+?)(?=\n\n##|\n##|$)/s);
      const successMatch = content.match(/## Success Criteria\n\n([\s\S]+?)(?=\n\n##|\n##|$)/);

      const epicId = titleMatch?.[1] || file.replace('.md', '');
      const title = titleMatch?.[2] || 'Untitled';
      const goal = goalMatch?.[1]?.trim() || 'No goal defined';

      console.log(chalk.green('\n╔════════════════════════════════════════════════════╗'));
      console.log(chalk.green(`║  ${epicId}: ${title.substring(0, 40).padEnd(40)}  ║`));
      console.log(chalk.green('╚════════════════════════════════════════════════════╝\n'));

      console.log(chalk.bold('Goal:'));
      console.log(chalk.dim(`  ${goal}\n`));

      if (successMatch) {
        console.log(chalk.bold('Success Criteria:'));
        const criteria = successMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
        criteria.forEach(c => {
          const done = c.includes('[x]');
          const text = c.replace(/^-\s*\[.\]\s*/, '').trim();
          console.log(done ? chalk.green(`  ✓ ${text}`) : chalk.dim(`  ○ ${text}`));
        });
        console.log('');
      }

      // Find associated sprints
      const epicPrefix = epicId.toLowerCase().replace('epic-', 'epic');
      const associatedSprints = sprintFilesList.filter(f =>
        f.startsWith('SPRINT-') &&
        f.toLowerCase().includes(epicPrefix)
      );

      if (associatedSprints.length > 0) {
        console.log(chalk.bold('Sprints:'));
        for (const sprintFile of associatedSprints) {
          const sprintContent = await fs.readFile(path.join(sprintsDir, sprintFile), 'utf-8');
          const sprintTitleMatch = sprintContent.match(/^# SPRINT: (.+)$/m);
          const progressMatch = sprintContent.match(/\*\*Progress:\*\*\s*(\d+)%/);
          const sprintTitle = sprintTitleMatch?.[1] || sprintFile;
          const progress = progressMatch?.[1] || '0';

          const progressBar = createProgressBar(parseInt(progress));
          console.log(`  ${progressBar} ${sprintTitle}`);
        }
        console.log('');
      }

      console.log(chalk.dim(`📄 File: docs/epics/${file}\n`));
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error viewing epics: ${error.message}`));
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a simple progress bar
 */
function createProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  const color = percent === 100 ? chalk.green :
                percent >= 50 ? chalk.yellow :
                chalk.dim;

  return color(`[${bar}] ${percent}%`);
}

// ============================================================================
// Export Examples
// ============================================================================

export const epicExamples = [
  'ginko epic             # Create new epic via AI conversation',
  'ginko epic --list      # List existing epics',
  'ginko epic --view      # View epic details with sprints',
  'ginko push epic        # Push epic to graph (ADR-077)',
];
