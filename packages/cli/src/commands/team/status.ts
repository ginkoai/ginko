/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-21
 * @tags: [team, status, visibility, epic-016, sprint-3]
 * @related: [../team.ts, ../../lib/output-formatter.ts, ../graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, commander]
 */

/**
 * Team Status Command (EPIC-016 Sprint 3)
 *
 * Displays team-wide work status including:
 * - Member progress with progress bars
 * - Unassigned work summary
 * - Activity timestamps with relative time
 *
 * Usage:
 *   ginko team status    # Show team work status
 */

import chalk from 'chalk';
import { GraphApiClient } from '../graph/api-client.js';
import { getGraphId } from '../graph/config.js';
import { formatProgressBar } from '../../lib/output-formatter.js';
import { requireCloud } from '../../utils/cloud-guard.js';

interface MemberStatus {
  email: string;
  name?: string;
  activeSprint: {
    id: string;
    title: string;
    epic: { id: string; title: string };
  } | null;
  progress: {
    complete: number;
    total: number;
    inProgress: number;
  };
  lastActivity: string | null;
}

interface UnassignedSprint {
  sprintId: string;
  sprintTitle: string;
  epicTitle: string;
  taskCount: number;
}

interface TeamStatusResponse {
  members: MemberStatus[];
  unassigned: UnassignedSprint[];
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalUnassigned: number;
  };
}

/**
 * Format relative time (e.g., "30m ago", "2h ago", "3d ago")
 */
function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return chalk.dim('never');

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return chalk.green('just now');
  if (minutes < 60) return chalk.green(`${minutes}m ago`);
  if (hours < 24) return chalk.yellow(`${hours}h ago`);
  if (days < 7) return chalk.dim(`${days}d ago`);
  return chalk.dim(`${days}d ago`);
}

/**
 * Format progress as a compact progress bar with percentage
 */
function formatCompactProgress(complete: number, total: number, width: number = 8): string {
  if (total === 0) return chalk.dim('no tasks');

  const percent = Math.round((complete / total) * 100);
  const bar = formatProgressBar(percent, width);
  return `${complete}/${total} ${bar} ${percent}%`;
}

/**
 * Extract short sprint name (e.g., "EPIC-016 Sprint 1" from full title)
 */
function formatSprintName(sprint: { id: string; title: string; epic: { title: string } }): string {
  // Try to extract epic number from ID (e.g., e016_s01 -> EPIC-016)
  const epicMatch = sprint.id.match(/e(\d+)_s(\d+)/);
  if (epicMatch) {
    const epicNum = parseInt(epicMatch[1], 10);
    const sprintNum = parseInt(epicMatch[2], 10);
    return `EPIC-${epicNum.toString().padStart(3, '0')} Sprint ${sprintNum}`;
  }

  // Fallback to epic title + sprint title
  return `${sprint.epic.title} ${sprint.title}`.substring(0, 30);
}

/**
 * Team status command handler
 */
export async function teamStatusCommand(): Promise<void> {
  await requireCloud('team status');
  try {
    // Get graphId from config
    const graphId = await getGraphId();
    if (!graphId) {
      console.log(chalk.yellow('⚠️  No project initialized. Run "ginko init" first.'));
      return;
    }

    const client = new GraphApiClient();

    // Fetch team status from API
    const response = await client.request<TeamStatusResponse>(
      'GET',
      `/api/v1/team/status?graphId=${encodeURIComponent(graphId)}`
    );

    // Render output
    renderTeamStatus(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Not authenticated')) {
        console.log(chalk.yellow('⚠️  Not authenticated. Run "ginko login" first.'));
      } else if (error.message.includes('ACCESS_DENIED')) {
        console.log(chalk.red('✗ Access denied to this project.'));
      } else {
        console.log(chalk.red(`✗ ${error.message}`));
      }
    } else {
      console.log(chalk.red('✗ Failed to fetch team status'));
    }
  }
}

/**
 * Render team status output with box drawing
 */
function renderTeamStatus(data: TeamStatusResponse): void {
  const width = 73;
  const box = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
  };

  const hr = box.horizontal.repeat(width);
  const pad = (s: string, len: number) => {
    const visibleLen = s.replace(/\x1b\[[0-9;]*m/g, '').length;
    return s + ' '.repeat(Math.max(0, len - visibleLen));
  };

  const lines: string[] = [];

  // Header
  lines.push(`${box.topLeft}${hr}${box.topRight}`);
  lines.push(`${box.vertical}  ${chalk.bold('Team Status')}${' '.repeat(width - 14)}${box.vertical}`);
  lines.push(`${box.leftT}${hr}${box.rightT}`);

  // Members section
  if (data.members.length === 0) {
    lines.push(`${box.vertical}  ${chalk.dim('No team members with assigned work')}${' '.repeat(width - 38)}${box.vertical}`);
  } else {
    for (const member of data.members) {
      // Member email line
      const emailLine = `  ${chalk.cyan(member.email)}`;
      lines.push(`${box.vertical}${pad(emailLine, width)}${box.vertical}`);

      // Sprint progress line
      if (member.activeSprint) {
        const sprintName = formatSprintName(member.activeSprint);
        const progress = formatCompactProgress(
          member.progress.complete,
          member.progress.total
        );
        const activity = formatRelativeTime(member.lastActivity);

        const sprintLine = `  └─ ${sprintName}      ${progress}    active ${activity}`;
        lines.push(`${box.vertical}${pad(sprintLine, width)}${box.vertical}`);
      } else {
        const activity = formatRelativeTime(member.lastActivity);
        const noWorkLine = `  └─ ${chalk.dim('(no active work)')}                           last seen ${activity}`;
        lines.push(`${box.vertical}${pad(noWorkLine, width)}${box.vertical}`);
      }

      // Empty line between members
      lines.push(`${box.vertical}${' '.repeat(width)}${box.vertical}`);
    }
  }

  // Unassigned work section
  if (data.unassigned.length > 0) {
    lines.push(`${box.leftT}${hr}${box.rightT}`);
    lines.push(`${box.vertical}  ${chalk.bold('Unassigned Work')}${' '.repeat(width - 18)}${box.vertical}`);

    for (const sprint of data.unassigned.slice(0, 5)) {
      const sprintLine = `  └─ ${sprint.epicTitle} ${sprint.sprintTitle}      ${sprint.taskCount} tasks            ${chalk.yellow('needs owner')}`;
      lines.push(`${box.vertical}${pad(sprintLine, width)}${box.vertical}`);
    }

    if (data.unassigned.length > 5) {
      const moreLine = `  ${chalk.dim(`... and ${data.unassigned.length - 5} more sprints with unassigned work`)}`;
      lines.push(`${box.vertical}${pad(moreLine, width)}${box.vertical}`);
    }
  }

  // Summary section
  lines.push(`${box.leftT}${hr}${box.rightT}`);
  const summaryLine = `  Summary: ${data.summary.totalMembers} members ${box.vertical} ${data.summary.activeMembers} active today ${box.vertical} ${data.summary.totalUnassigned} unassigned tasks`;
  lines.push(`${box.vertical}${pad(summaryLine, width)}${box.vertical}`);

  // Footer
  lines.push(`${box.bottomLeft}${hr}${box.bottomRight}`);

  // Output
  console.log(lines.join('\n'));
}

export default teamStatusCommand;
