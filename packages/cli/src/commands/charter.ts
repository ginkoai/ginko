/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, project-charter, conversation, initialization]
 * @related: [../lib/charter/conversation-facilitator.ts, ../lib/charter/charter-storage.ts, init.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [chalk, prompts, uuid, charter-storage, conversation-facilitator]
 */

import chalk from 'chalk';
import prompts from 'prompts';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ConversationFacilitator,
  type FacilitatorResult,
} from '../lib/charter/conversation-facilitator.js';
import { CharterStorageManager } from '../lib/charter/charter-storage.js';
import { refine, type EditResult } from '../lib/charter/charter-editor.js';
import {
  createInitialVersion,
  versionToString,
  createInitialChangelog,
} from '../lib/charter/charter-versioning.js';
import type { Charter, CharterContent, CharterConfidence, WorkMode } from '../types/charter.js';
import { getUserEmail } from '../utils/helpers.js';

// ============================================================================
// Types
// ============================================================================

interface CharterOptions {
  view?: boolean;
  edit?: boolean;
  mode?: string;
  skipConversation?: boolean;
  outputPath?: string;
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Charter command - Create and manage project charters
 * Usage:
 *   ginko charter             - Create new charter via conversation
 *   ginko charter --view      - View existing charter
 *   ginko charter --edit      - Edit charter conversationally
 */
export async function charterCommand(options: CharterOptions = {}): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const storage = new CharterStorageManager(projectRoot, options.outputPath);

    // Handle --view flag
    if (options.view) {
      await viewCharter(storage);
      return;
    }

    // Handle --edit flag
    if (options.edit) {
      await editCharter(storage);
      return;
    }

    // Default: Create new charter
    await createCharter(storage, options);

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// Create Charter
// ============================================================================

/**
 * Create new charter through conversational flow
 */
async function createCharter(
  storage: CharterStorageManager,
  options: CharterOptions
): Promise<void> {
  // Check if charter already exists
  const existing = await storage.load();
  if (existing) {
    const { replace } = await prompts({
      type: 'confirm',
      name: 'replace',
      message: chalk.yellow('Charter already exists. Replace with new conversation?'),
      initial: false,
    });

    if (!replace) {
      console.log(chalk.dim('\n💡 Use `ginko charter --edit` to refine existing charter'));
      return;
    }

    console.log(''); // Blank line for spacing
  }

  // Welcome message
  console.log(chalk.green('💡 Let\'s capture your project vision!\n'));
  console.log(chalk.dim('This helps both you and your AI partner stay aligned.\n'));

  // Skip conversation mode (testing/automation)
  if (options.skipConversation) {
    console.log(chalk.yellow('⚠️  Skipping conversation (--skipConversation flag)\n'));
    const mockCharter = createMockCharter();
    await storage.save(mockCharter);
    displayCharterSaved(mockCharter);
    return;
  }

  // Conversational charter creation
  console.log(chalk.green('What would you like to build?\n'));

  const facilitator = new ConversationFacilitator();
  const result: FacilitatorResult = await facilitator.facilitate();

  // Build charter from conversation
  const projectRoot = process.cwd();
  const projectName = path.basename(projectRoot);
  const userEmail = await getUserEmail();

  const charter: Charter = {
    id: `charter-${uuidv4()}`,
    projectId: projectName,
    status: 'active',
    workMode: result.workMode,
    version: createInitialVersion(),
    createdAt: new Date(),
    updatedAt: new Date(),
    content: result.content,
    confidence: result.confidence,
    changelog: [],
  };

  // Add initial changelog entry
  charter.changelog = [createInitialChangelog(charter, [userEmail])];

  // Preview charter
  console.log(chalk.green('\n✨ Here\'s what I captured:\n'));
  displayCharterPreview(charter);

  // Confirm save
  const { approve } = await prompts({
    type: 'confirm',
    name: 'approve',
    message: 'Save this charter?',
    initial: true,
  });

  if (!approve) {
    console.log(chalk.dim('\n💡 No problem! Run `ginko charter` again anytime.'));
    return;
  }

  // Save charter
  console.log(chalk.dim('\n📝 Saving charter...'));
  const saveResult = await storage.save(charter);

  if (!saveResult.success) {
    throw new Error(saveResult.error || 'Failed to save charter');
  }

  // Display success
  displayCharterSaved(charter);
}

// ============================================================================
// View Charter
// ============================================================================

/**
 * View existing charter
 */
async function viewCharter(storage: CharterStorageManager): Promise<void> {
  const charter = await storage.load();

  if (!charter) {
    console.log(chalk.yellow('\n📋 No charter found for this project'));
    console.log(chalk.dim('   Run `ginko charter` to create one\n'));
    return;
  }

  displayCharterFull(charter);
}

// ============================================================================
// Edit Charter
// ============================================================================

/**
 * Edit charter conversationally
 */
async function editCharter(storage: CharterStorageManager): Promise<void> {
  const existing = await storage.load();

  if (!existing) {
    console.log(chalk.yellow('\n📋 No charter found for this project'));
    console.log(chalk.dim('   Run `ginko charter` to create one first\n'));
    return;
  }

  // Display current charter
  console.log(chalk.green('\n📄 Current Charter:\n'));
  console.log(chalk.dim(`   Version: ${versionToString(existing.version)}`));
  console.log(chalk.dim(`   Work Mode: ${formatWorkMode(existing.workMode)}`));
  console.log(chalk.dim(`   Confidence: ${existing.confidence.overall}%`));
  console.log(chalk.dim(`   Last updated: ${existing.updatedAt.toLocaleDateString()}\n`));

  // Ask what to refine
  console.log(chalk.green('What would you like to refine?\n'));
  console.log(chalk.dim('(Or type "markdown" to edit the file directly)\n'));

  const { refinement } = await prompts({
    type: 'text',
    name: 'refinement',
    message: '>',
  });

  if (!refinement || refinement.trim() === '') {
    console.log(chalk.dim('\n💡 No changes made'));
    return;
  }

  // Handle markdown editing
  if (refinement.toLowerCase() === 'markdown') {
    console.log(chalk.blue('\n📝 Opening charter in your editor...'));
    console.log(chalk.dim('   File: docs/PROJECT-CHARTER.md'));
    console.log(chalk.dim('   Changelog will be updated at next session start\n'));
    // Note: Actual editor opening would be handled by the system (not implemented here)
    return;
  }

  // Conversational refinement
  const userEmail = await getUserEmail();
  const editResult: EditResult = await refine(existing, refinement, [userEmail]);

  if (!editResult.success || !editResult.updated) {
    console.error(chalk.red(`\n❌ ${editResult.error}`));
    console.log(chalk.dim('   Try rephrasing your request\n'));
    return;
  }

  // Show diff
  console.log(chalk.green('\n✨ Updated Charter:\n'));
  displayDiff(editResult.diff);

  // Confirm save
  const { approve } = await prompts({
    type: 'confirm',
    name: 'approve',
    message: 'Save changes?',
    initial: true,
  });

  if (!approve) {
    console.log(chalk.dim('\n💡 Changes discarded'));
    return;
  }

  // Save updated charter
  const saveResult = await storage.save(editResult.updated);

  if (!saveResult.success) {
    throw new Error(saveResult.error || 'Failed to save charter');
  }

  console.log(chalk.green(`\n✅ Charter updated to v${versionToString(editResult.updated.version)}`));
  console.log(chalk.dim('   📄 docs/PROJECT-CHARTER.md\n'));
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Display charter preview
 */
function displayCharterPreview(charter: Charter): void {
  console.log(chalk.bold('Purpose:'));
  console.log(chalk.dim(truncate(charter.content.purpose, 200)));
  console.log('');

  if (charter.content.users.length > 0) {
    console.log(chalk.bold('Users:'));
    charter.content.users.slice(0, 3).forEach(user => {
      console.log(chalk.dim(`  • ${user}`));
    });
    if (charter.content.users.length > 3) {
      console.log(chalk.dim(`  • ... and ${charter.content.users.length - 3} more`));
    }
    console.log('');
  }

  console.log(chalk.bold('Success Criteria:'));
  charter.content.successCriteria.slice(0, 3).forEach(criterion => {
    console.log(chalk.dim(`  • ${criterion}`));
  });
  if (charter.content.successCriteria.length > 3) {
    console.log(chalk.dim(`  • ... and ${charter.content.successCriteria.length - 3} more`));
  }
  console.log('');

  console.log(chalk.bold('Scope:'));
  console.log(chalk.dim(`  In: ${charter.content.scope.inScope.length} items`));
  console.log(chalk.dim(`  Out: ${charter.content.scope.outOfScope.length} items`));
  if (charter.content.scope.tbd.length > 0) {
    console.log(chalk.dim(`  TBD: ${charter.content.scope.tbd.length} items`));
  }
  console.log('');

  console.log(chalk.bold('Metadata:'));
  console.log(chalk.dim(`  Work Mode: ${formatWorkMode(charter.workMode)}`));
  console.log(chalk.dim(`  Confidence: ${charter.confidence.overall}%`));
  console.log('');
}

/**
 * Display full charter
 */
function displayCharterFull(charter: Charter): void {
  console.log(chalk.green('\n╔════════════════════════════════════════════╗'));
  console.log(chalk.green('║         Project Charter                  ║'));
  console.log(chalk.green('╚════════════════════════════════════════════╝\n'));

  console.log(chalk.bold('Status:'), formatStatus(charter.status));
  console.log(chalk.bold('Version:'), versionToString(charter.version));
  console.log(chalk.bold('Work Mode:'), formatWorkMode(charter.workMode));
  console.log(chalk.bold('Confidence:'), `${charter.confidence.overall}% (${confidenceLabel(charter.confidence.overall)})`);
  console.log('');

  console.log(chalk.bold('Purpose & Value:'));
  console.log(charter.content.purpose);
  console.log('');

  if (charter.content.users.length > 0) {
    console.log(chalk.bold('Users & Personas:'));
    charter.content.users.forEach(user => {
      console.log(`  • ${user}`);
    });
    console.log('');
  }

  console.log(chalk.bold('Success Criteria:'));
  charter.content.successCriteria.forEach(criterion => {
    console.log(`  • ${criterion}`);
  });
  console.log('');

  console.log(chalk.bold('Scope & Boundaries:'));
  console.log(chalk.underline('  In Scope:'));
  charter.content.scope.inScope.forEach(item => {
    console.log(chalk.green(`    ✓ ${item}`));
  });
  console.log(chalk.underline('  Out of Scope:'));
  charter.content.scope.outOfScope.forEach(item => {
    console.log(chalk.red(`    ✗ ${item}`));
  });
  if (charter.content.scope.tbd.length > 0) {
    console.log(chalk.underline('  TBD:'));
    charter.content.scope.tbd.forEach(item => {
      console.log(chalk.yellow(`    ? ${item}`));
    });
  }
  console.log('');

  if (charter.content.constraints || charter.content.timeline || charter.content.team) {
    console.log(chalk.bold('Context:'));
    if (charter.content.constraints) {
      console.log(`  Constraints: ${charter.content.constraints}`);
    }
    if (charter.content.timeline) {
      console.log(`  Timeline: ${charter.content.timeline}`);
    }
    if (charter.content.team && charter.content.team.length > 0) {
      console.log(`  Team: ${charter.content.team.join(', ')}`);
    }
    console.log('');
  }

  console.log(chalk.dim('📄 Full charter: docs/PROJECT-CHARTER.md\n'));
}

/**
 * Display charter saved message
 */
function displayCharterSaved(charter: Charter): void {
  console.log(chalk.green('\n✅ Charter saved!\n'));
  console.log(chalk.dim('📄 docs/PROJECT-CHARTER.md'));
  console.log(chalk.dim(`   Version: ${versionToString(charter.version)}`));
  console.log(chalk.dim(`   Confidence: ${charter.confidence.overall}%\n`));

  console.log(chalk.bold('💡 Next steps:'));
  console.log(chalk.dim('   ginko start          - Begin session with charter context'));
  console.log(chalk.dim('   ginko charter --view - View full charter'));
  console.log(chalk.dim('   ginko charter --edit - Refine charter anytime\n'));
}

/**
 * Display diff between charters
 */
function displayDiff(diff: any): void {
  if (diff.additions.length > 0) {
    console.log(chalk.green('Added:'));
    diff.additions.forEach((add: string) => {
      console.log(chalk.green(`  + ${add}`));
    });
    console.log('');
  }

  if (diff.deletions.length > 0) {
    console.log(chalk.red('Removed:'));
    diff.deletions.forEach((del: string) => {
      console.log(chalk.red(`  - ${del}`));
    });
    console.log('');
  }

  if (diff.modifications.length > 0) {
    console.log(chalk.yellow('Modified:'));
    diff.modifications.forEach((mod: string) => {
      console.log(chalk.yellow(`  ~ ${mod}`));
    });
    console.log('');
  }

  if (diff.significantChange) {
    console.log(chalk.yellow('⚠️  Significant changes detected (>5 changes)'));
    console.log('');
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatStatus(status: string): string {
  const colors: Record<string, any> = {
    draft: chalk.yellow,
    active: chalk.green,
    archived: chalk.dim,
  };
  const color = colors[status] || chalk.white;
  return color(status.charAt(0).toUpperCase() + status.slice(1));
}

function formatWorkMode(mode: WorkMode): string {
  const labels: Record<WorkMode, string> = {
    'hack-ship': 'Hack & Ship',
    'think-build': 'Think & Build',
    'full-planning': 'Full Planning',
  };
  return labels[mode];
}

function confidenceLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good enough to start';
  if (score >= 40) return 'Workable minimum';
  return 'Needs refinement';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Mock Charter (for testing)
// ============================================================================

function createMockCharter(): Charter {
  const projectRoot = process.cwd();
  const projectName = path.basename(projectRoot);

  return {
    id: `charter-${uuidv4()}`,
    projectId: projectName,
    status: 'active',
    workMode: 'think-build',
    version: createInitialVersion(),
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      purpose: 'Mock charter for testing purposes',
      users: ['Developers', 'QA Engineers'],
      successCriteria: ['Tests pass', 'Documentation complete'],
      scope: {
        inScope: ['Core features'],
        outOfScope: ['Advanced features'],
        tbd: ['Performance optimizations'],
      },
    },
    confidence: {
      purpose: { score: 70, signals: [], missing: [] },
      users: { score: 70, signals: [], missing: [] },
      success: { score: 70, signals: [], missing: [] },
      scope: { score: 70, signals: [], missing: [] },
      overall: 70,
    },
    changelog: [],
  };
}

// ============================================================================
// Export Example Commands
// ============================================================================

export const charterExamples = [
  'ginko charter                # Create new charter via conversation',
  'ginko charter --view         # View existing charter',
  'ginko charter --edit         # Edit charter conversationally',
];
