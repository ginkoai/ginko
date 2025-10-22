/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-22
 * @tags: [team, collaboration, visibility, session-logs, task-012]
 * @related: [team-awareness.ts, session-log-manager.ts, log.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk, team-awareness]
 */

/**
 * Team Command
 *
 * Displays team member activity from user-namespaced session logs.
 * Enables coordination and prevents duplicate work.
 *
 * Usage:
 *   ginko team                    # List all active team members
 *   ginko team <user>             # View specific member's session
 *   ginko team --timeline         # Show chronological team events
 *   ginko team --files            # Show file activity across team
 *
 * Based on TASK-012 and PRD-009 Phase 4
 */

import chalk from 'chalk';
import {
  getActiveTeamMembers,
  getTeamMemberSession,
  getTeamTimeline,
  getTeamFileActivity,
  getFileConflicts,
  formatRelativeTime,
  formatTime,
  type TeamMember
} from '../utils/team-awareness.js';

interface TeamCommandOptions {
  timeline?: boolean;
  files?: boolean;
  conflicts?: boolean;
  window?: string; // Time window in hours (default: 24)
}

/**
 * Team command handler
 */
export async function teamCommand(userIdentifier?: string, options: TeamCommandOptions = {}): Promise<void> {
  try {
    // Parse time window
    const timeWindowHours = options.window ? parseInt(options.window) : 24;

    if (isNaN(timeWindowHours) || timeWindowHours <= 0) {
      console.error(chalk.red('Error: Invalid time window. Must be a positive number.'));
      process.exit(1);
    }

    // Show timeline view
    if (options.timeline) {
      await showTimeline(timeWindowHours);
      return;
    }

    // Show file activity view
    if (options.files) {
      await showFileActivity(timeWindowHours);
      return;
    }

    // Show file conflicts view
    if (options.conflicts) {
      await showFileConflicts(timeWindowHours);
      return;
    }

    // Show specific team member details
    if (userIdentifier) {
      await showTeamMemberDetails(userIdentifier);
      return;
    }

    // Default: show all active team members
    await showActiveTeamMembers(timeWindowHours);

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Show all active team members
 */
async function showActiveTeamMembers(timeWindowHours: number): Promise<void> {
  const members = await getActiveTeamMembers(timeWindowHours);

  if (members.length === 0) {
    console.log(chalk.yellow(`No active team members in the last ${timeWindowHours}h.`));
    console.log(chalk.dim('\nNote: Team activity is tracked via session logs in .ginko/sessions/'));
    return;
  }

  console.log(chalk.bold.cyan(`\nActive team members (last ${timeWindowHours}h):\n`));

  for (const member of members) {
    const timeAgo = formatRelativeTime(member.lastActive);
    const taskInfo = member.currentTask ? chalk.dim(` - Working on ${member.currentTask}`) : '';
    const branchInfo = member.branch && member.branch !== 'main' ? chalk.dim(` [${member.branch}]`) : '';

    console.log(`  ${chalk.green('•')} ${chalk.bold(member.email)} ${chalk.dim(`(${timeAgo})`)}${taskInfo}${branchInfo}`);
  }

  console.log(chalk.dim(`\nUse ${chalk.white('ginko team <email>')} to view detailed session info.`));
  console.log(chalk.dim(`Use ${chalk.white('ginko team --timeline')} to see chronological team events.`));
  console.log(chalk.dim(`Use ${chalk.white('ginko team --files')} to see which files teammates are modifying.`));
}

/**
 * Show detailed session for a specific team member
 */
async function showTeamMemberDetails(userIdentifier: string): Promise<void> {
  const member = await getTeamMemberSession(userIdentifier);

  if (!member) {
    console.error(chalk.red(`\nTeam member not found: ${userIdentifier}`));
    console.log(chalk.dim('\nAvailable team members:'));

    const allMembers = await getActiveTeamMembers(24 * 7); // Last week
    if (allMembers.length === 0) {
      console.log(chalk.dim('  (none)'));
    } else {
      allMembers.forEach(m => console.log(chalk.dim(`  • ${m.email} (${m.slug})`)));
    }

    process.exit(1);
  }

  // Header
  console.log(chalk.bold.cyan(`\n${member.email}'s Current Session\n`));

  // Session metadata
  if (member.sessionStarted) {
    console.log(chalk.dim(`Started: ${member.sessionStarted.toLocaleString()}`));
  }

  if (member.branch) {
    console.log(chalk.dim(`Branch: ${member.branch}`));
  }

  console.log(chalk.dim(`Last active: ${formatRelativeTime(member.lastActive)}`));

  if (member.currentTask) {
    console.log(chalk.dim(`Current task: ${member.currentTask}`));
  }

  // Recent events
  if (member.recentEvents.length > 0) {
    console.log(chalk.bold('\nRecent Events:'));

    member.recentEvents.forEach(event => {
      const categoryColor = getCategoryColor(event.category);
      const categoryBadge = chalk[categoryColor](`[${event.category}]`);
      const filesInfo = event.files && event.files.length > 0
        ? chalk.dim(` (${event.files.length} file${event.files.length > 1 ? 's' : ''})`)
        : '';

      console.log(`  ${event.timestamp} ${categoryBadge} ${event.description}${filesInfo}`);

      // Show files if present
      if (event.files && event.files.length > 0 && event.files.length <= 3) {
        event.files.forEach(file => {
          console.log(chalk.dim(`    • ${file}`));
        });
      }
    });
  }

  // Files modified
  if (member.filesModified.length > 0) {
    console.log(chalk.bold(`\nFiles Modified (${member.filesModified.length}):`));

    // Show first 10 files
    const displayFiles = member.filesModified.slice(0, 10);
    displayFiles.forEach(file => {
      console.log(chalk.dim(`  • ${file}`));
    });

    if (member.filesModified.length > 10) {
      console.log(chalk.dim(`  ... and ${member.filesModified.length - 10} more`));
    }
  }

  console.log('');
}

/**
 * Show chronological timeline of all team events
 */
async function showTimeline(timeWindowHours: number): Promise<void> {
  const events = await getTeamTimeline(timeWindowHours, 50);

  if (events.length === 0) {
    console.log(chalk.yellow(`\nNo team activity in the last ${timeWindowHours}h.`));
    return;
  }

  console.log(chalk.bold.cyan(`\nTeam Timeline (last ${timeWindowHours}h):\n`));

  events.forEach(event => {
    const time = formatTime(event.timestamp);
    const categoryColor = getCategoryColor(event.category);
    const categoryBadge = chalk[categoryColor](`[${event.category}]`);
    const userShort = event.user.split('@')[0]; // Just username part

    console.log(`${chalk.dim(time)} ${chalk.bold(userShort)} ${categoryBadge} ${event.description}`);

    if (event.files && event.files.length > 0 && event.files.length <= 2) {
      event.files.forEach(file => {
        console.log(chalk.dim(`         • ${file}`));
      });
    }
  });

  console.log('');
}

/**
 * Show file activity across team
 */
async function showFileActivity(timeWindowHours: number): Promise<void> {
  const activity = await getTeamFileActivity(timeWindowHours);

  if (activity.length === 0) {
    console.log(chalk.yellow(`\nNo file activity in the last ${timeWindowHours}h.`));
    return;
  }

  console.log(chalk.bold.cyan(`\nFile Activity (last ${timeWindowHours}h):\n`));

  activity.forEach(file => {
    const usersShort = file.users.map(u => u.split('@')[0]).join(', ');
    const timeAgo = formatRelativeTime(file.lastModified);
    const multiUser = file.users.length > 1 ? chalk.yellow(' ⚠ ') : '   ';

    console.log(`${multiUser}${chalk.bold(file.filePath)}`);
    console.log(chalk.dim(`     Modified by: ${usersShort} (${timeAgo})`));
  });

  console.log('');

  // Show conflict warning if any
  const conflicts = activity.filter(a => a.users.length > 1);
  if (conflicts.length > 0) {
    console.log(chalk.yellow(`⚠  ${conflicts.length} file${conflicts.length > 1 ? 's' : ''} modified by multiple users (potential conflicts)`));
    console.log(chalk.dim(`Use ${chalk.white('ginko team --conflicts')} to see only conflicting files.\n`));
  }
}

/**
 * Show file conflicts (files modified by 2+ users)
 */
async function showFileConflicts(timeWindowHours: number): Promise<void> {
  const conflicts = await getFileConflicts(timeWindowHours);

  if (conflicts.length === 0) {
    console.log(chalk.green(`\n✓ No file conflicts in the last ${timeWindowHours}h.`));
    console.log(chalk.dim('\nAll files are being worked on by single users.\n'));
    return;
  }

  console.log(chalk.bold.yellow(`\n⚠  File Conflicts (last ${timeWindowHours}h):\n`));

  conflicts.forEach(file => {
    const usersShort = file.users.map(u => u.split('@')[0]);

    console.log(chalk.bold.yellow(`  ⚠  ${file.filePath}`));
    console.log(chalk.dim(`     Modified by: ${usersShort.join(', ')}`));
    console.log(chalk.dim(`     Last change: ${formatRelativeTime(file.lastModified)}`));
    console.log(chalk.dim(`     Recommendation: Coordinate with teammates to avoid conflicts\n`));
  });
}

/**
 * Get color for category badge
 */
function getCategoryColor(category: string): 'green' | 'blue' | 'magenta' | 'yellow' | 'cyan' | 'white' {
  switch (category) {
    case 'fix':
      return 'yellow';
    case 'feature':
      return 'green';
    case 'decision':
      return 'magenta';
    case 'insight':
      return 'cyan';
    case 'git':
      return 'blue';
    case 'achievement':
      return 'green';
    default:
      return 'white';
  }
}
