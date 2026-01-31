/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, planning, sprint-creation, graph-sync, duplicate-detection]
 * @related: [charter.ts, ../templates/epic-template.md, ADR-058]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, fs, path, prompts]
 */

import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import prompts from 'prompts';
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

    // Handle --sync flag
    if (options.sync) {
      await syncEpicToGraph(projectRoot);
      return;
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
// Local Duplicate Detection (ADR-058)
// ============================================================================

interface LocalEpicInfo {
  file: string;
  id: string;
  title: string;
}

/**
 * Detect duplicate epic IDs in local files before sync
 * Returns map of duplicate IDs to their files
 */
async function detectLocalDuplicates(
  epicsDir: string,
  epicFiles: string[]
): Promise<Map<string, LocalEpicInfo[]>> {
  const epicById = new Map<string, LocalEpicInfo[]>();

  for (const file of epicFiles) {
    const content = await fs.readFile(path.join(epicsDir, file), 'utf-8');

    // Extract epic ID from frontmatter or title
    const frontmatterMatch = content.match(/^---[\s\S]*?epic_id:\s*(\S+)[\s\S]*?---/m);
    const titleMatch = content.match(/^# (EPIC-\d+):/m);

    const id = frontmatterMatch?.[1]?.toUpperCase() ||
               titleMatch?.[1]?.toUpperCase() ||
               file.match(/^(EPIC-\d+)/i)?.[1]?.toUpperCase() ||
               'UNKNOWN';

    const epicTitleMatch = content.match(/^# EPIC-\d+:\s*(.+)$/m);
    const title = epicTitleMatch?.[1] || 'Untitled';

    const existing = epicById.get(id) || [];
    existing.push({ file, id, title });
    epicById.set(id, existing);
  }

  // Filter to only duplicates (IDs with more than one file)
  const duplicates = new Map<string, LocalEpicInfo[]>();
  for (const [id, files] of epicById) {
    if (files.length > 1) {
      duplicates.set(id, files);
    }
  }

  return duplicates;
}

// ============================================================================
// Sync Epic to Graph
// ============================================================================

/**
 * Sync epic and sprints to graph database
 * Includes conflict detection per ADR-058
 */
async function syncEpicToGraph(projectRoot: string): Promise<void> {
  console.log(chalk.blue('\n📡 Syncing epic to graph...\n'));

  // Check for graph configuration (in .ginko/graph/config.json)
  const graphConfigPath = path.join(projectRoot, '.ginko', 'graph', 'config.json');
  if (!existsSync(graphConfigPath)) {
    console.log(chalk.yellow('⚠️  Graph not configured'));
    console.log(chalk.dim('   Run `ginko graph init` first\n'));
    return;
  }

  try {
    // Read graph config
    const graphConfig = JSON.parse(await fs.readFile(graphConfigPath, 'utf-8'));
    const graphId = graphConfig.graphId;

    if (!graphId) {
      console.log(chalk.yellow('⚠️  No graph ID configured'));
      console.log(chalk.dim('   Run `ginko graph init` to configure\n'));
      return;
    }

    // Find epic files (from docs/epics/) and sprint files (from docs/sprints/)
    const epicsDir = path.join(projectRoot, 'docs', 'epics');
    const sprintsDir = path.join(projectRoot, 'docs', 'sprints');

    if (!existsSync(epicsDir)) {
      console.log(chalk.yellow('📋 No epics directory found'));
      return;
    }

    const epicFilesList = await fs.readdir(epicsDir);
    // Filter for EPIC-NNN*.md files (exclude EPIC-INDEX.md and similar)
    const epicFiles = epicFilesList.filter(f =>
      f.startsWith('EPIC-') &&
      f.endsWith('.md') &&
      /^EPIC-\d{3}/.test(f)
    );

    if (epicFiles.length === 0) {
      console.log(chalk.yellow('📋 No epics to sync'));
      return;
    }

    // ADR-058: Check for local duplicate IDs before sync
    const duplicates = await detectLocalDuplicates(epicsDir, epicFiles);
    if (duplicates.size > 0) {
      console.log(chalk.red('🚨 Duplicate epic IDs detected!\n'));
      console.log(chalk.dim('   Per ADR-058, each epic must have a unique ID.\n'));

      for (const [id, files] of duplicates) {
        console.log(chalk.yellow(`   ${id}:`));
        for (const info of files) {
          console.log(chalk.dim(`     - ${info.file}`));
          console.log(chalk.dim(`       "${info.title}"`));
        }
        console.log('');
      }

      console.log(chalk.dim('   To resolve:'));
      console.log(chalk.dim('   1. Rename one of the duplicate epics to a new ID'));
      console.log(chalk.dim('   2. Update the epic_id in frontmatter and the # title'));
      console.log(chalk.dim('   3. Run `ginko epic --sync` again\n'));

      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Continue sync anyway? (duplicates will cause overwrites)',
        initial: false,
      });

      if (!proceed) {
        console.log(chalk.dim('\nSync cancelled. Resolve duplicates first.\n'));
        return;
      }

      console.log(chalk.yellow('\n⚠️  Proceeding with duplicates - last file wins\n'));
    }

    // Get sprint files for association
    const sprintFilesList = existsSync(sprintsDir) ? await fs.readdir(sprintsDir) : [];

    // Import API client dynamically to avoid circular deps
    const { GraphApiClient } = await import('./graph/api-client.js');
    const client = new GraphApiClient();

    // Get current user for conflict detection
    const { getAccessToken } = await import('../utils/auth-storage.js');
    const token = await getAccessToken();
    let currentUser = 'unknown';
    if (token) {
      try {
        // Decode JWT to get user email (simple base64 decode of payload)
        const payload = token.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        currentUser = decoded.email || decoded.sub || 'unknown';
      } catch {
        // Ignore decode errors
      }
    }

    for (const file of epicFiles) {
      const content = await fs.readFile(path.join(epicsDir, file), 'utf-8');
      let epicData = parseEpicContent(content);
      const originalId = epicData.id;

      console.log(chalk.dim(`  Checking ${epicData.id}...`));

      // Check for ID conflict (ADR-058)
      const conflict = await client.checkEpicConflict(graphId, epicData.id);

      if (conflict && conflict.createdBy !== currentUser) {
        // ID conflict detected! Another user owns this ID
        console.log(chalk.yellow(`\n⚠️  ID Conflict: ${epicData.id} already exists`));
        console.log(chalk.dim(`   Created by: ${conflict.createdBy}${conflict.createdAt ? ` on ${conflict.createdAt.split('T')[0]}` : ''}`));
        console.log(chalk.dim(`   Title: "${conflict.title || 'Untitled'}"`));
        console.log(chalk.dim(`\nYour version: "${epicData.title}"\n`));

        // Find next available ID
        const suggestedId = conflict.suggestedId || await findNextAvailableEpicId(client, graphId, epicData.id);

        const { action } = await prompts({
          type: 'select',
          name: 'action',
          message: 'How would you like to resolve this conflict?',
          choices: [
            { title: `Rename to ${suggestedId} (recommended)`, value: 'rename' },
            { title: 'Skip this epic', value: 'skip' },
            { title: 'Cancel sync', value: 'cancel' },
          ],
        });

        if (action === 'cancel') {
          console.log(chalk.dim('\nSync cancelled.'));
          return;
        }

        if (action === 'skip') {
          console.log(chalk.yellow(`  ○ Skipped ${epicData.id}`));
          continue;
        }

        if (action === 'rename') {
          // Update epic ID
          const oldId = epicData.id;
          epicData = { ...epicData, id: suggestedId };

          console.log(chalk.green(`  ✓ Renamed ${oldId} → ${suggestedId}`));
          console.log(chalk.dim(`    Note: Update your local file docs/epics/${file} with the new ID\n`));
        }
      }

      console.log(chalk.dim(`  Syncing ${epicData.id}...`));

      // Sync epic node with graphId
      await client.syncEpic({ ...epicData, graphId });

      console.log(chalk.green(`  ✓ ${epicData.id}: ${epicData.title}`));

      // Find and sync associated sprints
      // Use original ID for finding files (user hasn't renamed local files yet)
      // Match both "epic009" and "e009" filename patterns
      const epicNum = originalId.toLowerCase().replace('epic-', '');
      const epicPrefix1 = `epic${epicNum}`; // e.g., "epic009"
      const epicPrefix2 = `e${epicNum}-`;   // e.g., "e009-" (for e009-s01 format)
      const sprintFiles = sprintFilesList.filter(f =>
        f.startsWith('SPRINT-') &&
        (f.toLowerCase().includes(epicPrefix1) || f.toLowerCase().includes(epicPrefix2))
      );

      for (const sprintFile of sprintFiles) {
        try {
          const sprintContent = await fs.readFile(path.join(sprintsDir, sprintFile), 'utf-8');

          // Use existing sprint sync
          await client.syncSprint(graphId, sprintContent);

          const sprintName = sprintFile.replace('.md', '');
          console.log(chalk.dim(`    ✓ ${sprintName}`));
        } catch (sprintError: any) {
          const sprintName = sprintFile.replace('.md', '');
          console.log(chalk.yellow(`    ⚠️ ${sprintName} (sync failed, continuing...)`));
        }
      }
    }

    console.log(chalk.green('\n✅ Epic sync complete!\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Sync failed: ${error.message}`));
    console.log(chalk.dim('   Check graph connection and authentication\n'));
  }
}

/**
 * Find next available Epic ID (ADR-058)
 * E.g., if EPIC-010 is taken, suggest EPIC-011
 */
async function findNextAvailableEpicId(
  client: { getEpicIds: (graphId: string) => Promise<string[]> },
  graphId: string,
  conflictId: string
): Promise<string> {
  try {
    // Get all existing epic IDs
    const existingIds = await client.getEpicIds(graphId);

    // Parse conflict ID to get the number part
    const match = conflictId.match(/EPIC-(\d+)/i);
    if (!match) {
      // Fallback: just append "-new"
      return `${conflictId}-new`;
    }

    // Find max epic number
    let maxNum = parseInt(match[1], 10);

    for (const id of existingIds) {
      const numMatch = id.match(/EPIC-(\d+)/i);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    // Suggest next number with proper padding
    const nextNum = maxNum + 1;
    return `EPIC-${nextNum.toString().padStart(3, '0')}`;
  } catch {
    // Fallback on error
    return `${conflictId}-new`;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse epic content from markdown
 */
function parseEpicContent(content: string): {
  id: string;
  title: string;
  goal: string;
  vision: string;
  status: string;
  progress: number;
  successCriteria: string[];
  inScope: string[];
  outOfScope: string[];
} {
  const titleMatch = content.match(/^# (EPIC-\d+): (.+)$/m);
  const goalMatch = content.match(/## Goal\n\n(.+?)(?=\n\n##|\n##|$)/s);
  const visionMatch = content.match(/## Vision\n\n(.+?)(?=\n\n##|\n##|$)/s);
  const statusMatch = content.match(/status: (\w+)/);

  // Parse success criteria
  const successSection = content.match(/## Success Criteria\n\n([\s\S]+?)(?=\n\n##|\n##|$)/);
  const successCriteria = successSection?.[1]
    ?.split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(l => l.replace(/^-\s*\[.\]\s*/, '').trim()) || [];

  // Calculate progress from checked items
  const totalCriteria = successCriteria.length;
  const completedCriteria = (successSection?.[1]?.match(/\[x\]/gi) || []).length;
  const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  // Parse scope
  const inScopeMatch = content.match(/### In Scope\n([\s\S]+?)(?=\n###|\n##|$)/);
  const outScopeMatch = content.match(/### Out of Scope\n([\s\S]+?)(?=\n###|\n##|$)/);

  const inScope = inScopeMatch?.[1]
    ?.split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim()) || [];

  const outOfScope = outScopeMatch?.[1]
    ?.split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim()) || [];

  return {
    id: titleMatch?.[1] || 'EPIC-000',
    title: titleMatch?.[2] || 'Untitled Epic',
    goal: goalMatch?.[1]?.trim() || '',
    vision: visionMatch?.[1]?.trim() || '',
    status: statusMatch?.[1] || 'active',
    progress,
    successCriteria,
    inScope,
    outOfScope,
  };
}

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
  'ginko epic --sync      # Sync epic to graph database',
];
