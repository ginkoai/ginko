/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-04
 * @tags: [session-synthesis, handoff, adr-033, ai-summary, fallback-synthesis, git-context]
 * @related: [../commands/start/index.ts, ../core/session-log-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [session-log-manager, chalk, child_process]
 */

import { SessionLogManager } from '../core/session-log-manager.js';
import chalk from 'chalk';

export interface SessionSummary {
  overview: string;
  keyDecisions: string[];
  nextSteps: string[];
  filesModified: string[];
  insights: string[];
}

/**
 * Synthesize session log into concise, actionable summary
 * Called at session start (0-20% pressure) for optimal AI quality
 */
export async function synthesizeHandoff(logContent: string): Promise<SessionSummary> {
  // Parse structured log data
  const metadata = SessionLogManager.parseMetadata(logContent);
  const timeline = SessionLogManager.extractEntries(logContent, 'Timeline');
  const decisions = SessionLogManager.extractEntries(logContent, 'Key Decisions');
  const insights = SessionLogManager.extractEntries(logContent, 'Insights');
  const stats = SessionLogManager.getSummary(logContent);

  // Build concise overview (2-3 sentences)
  let overview = `Session from ${metadata?.started || 'unknown time'}`;

  if (timeline.length > 0) {
    const categories = Object.keys(stats.byCategory).join(', ');
    overview += ` with ${timeline.length} events logged (${categories})`;
  }

  if (stats.filesAffected > 0) {
    overview += `, affecting ${stats.filesAffected} files`;
  }

  overview += '.';

  // Extract key decisions with context
  const keyDecisions = decisions.map(d => {
    const filesContext = d.files ? ` (${d.files.join(', ')})` : '';
    return `${d.description}${filesContext}`;
  });

  // Extract insights
  const keyInsights = insights.map(i => i.description);

  // Determine next steps from last few timeline entries
  const recentEvents = timeline.slice(-3);
  const nextSteps: string[] = [];

  // Look for session-end event
  const sessionEndEvent = timeline.find(e => e.category === 'achievement' || e.description.includes('Session ended'));
  if (sessionEndEvent) {
    nextSteps.push(`Continue from: ${sessionEndEvent.description}`);
  }

  // Add any pending work from recent events
  for (const event of recentEvents) {
    if (event.category === 'feature' && !event.description.includes('completed')) {
      nextSteps.push(`Resume work on: ${event.description}`);
    }
  }

  // Collect all affected files
  const filesModified: string[] = [];
  for (const entry of timeline) {
    if (entry.files) {
      filesModified.push(...entry.files);
    }
  }

  return {
    overview,
    keyDecisions,
    nextSteps: nextSteps.length > 0 ? nextSteps : ['Review session log for context'],
    filesModified: Array.from(new Set(filesModified)), // deduplicate
    insights: keyInsights
  };
}

/**
 * Format session summary for display
 */
export function formatSessionSummary(summary: SessionSummary): string {
  const lines: string[] = [];

  lines.push(chalk.cyan.bold('📚 Previous Session Summary'));
  lines.push('');
  lines.push(chalk.white(summary.overview));
  lines.push('');

  if (summary.keyDecisions.length > 0) {
    lines.push(chalk.yellow.bold('Key Decisions:'));
    for (const decision of summary.keyDecisions) {
      lines.push(chalk.gray(`  • ${decision}`));
    }
    lines.push('');
  }

  if (summary.insights.length > 0) {
    lines.push(chalk.magenta.bold('Insights:'));
    for (const insight of summary.insights.slice(0, 3)) { // Show top 3
      lines.push(chalk.gray(`  • ${insight}`));
    }
    lines.push('');
  }

  if (summary.nextSteps.length > 0) {
    lines.push(chalk.green.bold('Next Steps:'));
    for (const step of summary.nextSteps) {
      lines.push(chalk.gray(`  → ${step}`));
    }
    lines.push('');
  }

  if (summary.filesModified.length > 0) {
    const fileCount = summary.filesModified.length;
    const displayFiles = summary.filesModified.slice(0, 5);
    const moreCount = fileCount - displayFiles.length;

    lines.push(chalk.blue.bold(`Files Modified (${fileCount}):`));
    for (const file of displayFiles) {
      lines.push(chalk.gray(`  • ${file}`));
    }
    if (moreCount > 0) {
      lines.push(chalk.gray(`  • ... and ${moreCount} more`));
    }
  }

  return lines.join('\n');
}

/**
 * Generate and display session summary from handoff log
 */
export async function showSessionSummary(handoffLogPath: string): Promise<void> {
  const fs = await import('fs/promises');

  // Read handoff log
  const logContent = await fs.readFile(handoffLogPath, 'utf-8');

  // Synthesize summary (at optimal 0-20% pressure)
  const summary = await synthesizeHandoff(logContent);

  // Display formatted summary
  console.log(formatSessionSummary(summary));
}

/**
 * Fallback synthesis from git logs, ADRs, PRDs when session log is missing
 * Focuses on most recent changes to provide context continuity
 */
export async function synthesizeFromGit(ginkoDir: string): Promise<string | null> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { execSync } = await import('child_process');

  try {
    const lines: string[] = [];
    lines.push(chalk.cyan.bold('📚 Context from Recent Activity'));
    lines.push('');
    lines.push(chalk.yellow('⚠ No session log found - synthesizing from available sources'));
    lines.push('');

    // Get recent git commits (last 5)
    try {
      const gitLog = execSync('git log -5 --oneline --no-decorate', {
        encoding: 'utf-8',
        cwd: process.cwd()
      }).trim();

      if (gitLog) {
        lines.push(chalk.green.bold('Recent Commits:'));
        const commits = gitLog.split('\n').slice(0, 5);
        commits.forEach(commit => {
          lines.push(chalk.gray(`  • ${commit}`));
        });
        lines.push('');
      }
    } catch {
      // Git not available or no commits
    }

    // Check for recent ADRs
    try {
      const adrDir = path.join(process.cwd(), 'docs', 'adr');
      await fs.access(adrDir);
      const adrFiles = await fs.readdir(adrDir);
      const recentAdrs = adrFiles
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 3);

      if (recentAdrs.length > 0) {
        lines.push(chalk.yellow.bold('Recent Architecture Decisions:'));
        for (const adr of recentAdrs) {
          // Extract title from filename
          const title = adr
            .replace(/^ADR-\d+-/, '')
            .replace(/-/g, ' ')
            .replace('.md', '');
          lines.push(chalk.gray(`  • ${title}`));
        }
        lines.push('');
      }
    } catch {
      // No ADR directory
    }

    // Check for recent PRDs
    try {
      const prdDir = path.join(process.cwd(), 'docs', 'prd');
      await fs.access(prdDir);
      const prdFiles = await fs.readdir(prdDir);
      const recentPrds = prdFiles
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 3);

      if (recentPrds.length > 0) {
        lines.push(chalk.magenta.bold('Recent Requirements:'));
        for (const prd of recentPrds) {
          const title = prd
            .replace(/^PRD-\d+-/, '')
            .replace(/-/g, ' ')
            .replace('.md', '');
          lines.push(chalk.gray(`  • ${title}`));
        }
        lines.push('');
      }
    } catch {
      // No PRD directory
    }

    // Check for recent files modified
    try {
      const recentFiles = execSync('git diff --name-only HEAD~5..HEAD', {
        encoding: 'utf-8',
        cwd: process.cwd()
      }).trim();

      if (recentFiles) {
        const files = recentFiles.split('\n').slice(0, 5);
        lines.push(chalk.blue.bold('Recently Modified Files:'));
        files.forEach(file => {
          lines.push(chalk.gray(`  • ${file}`));
        });
        lines.push('');
      }
    } catch {
      // Git diff not available
    }

    // Next steps suggestion
    lines.push(chalk.green.bold('Next Steps:'));
    lines.push(chalk.gray('  → Review recent commits and changes'));
    lines.push(chalk.gray('  → Check git status for current work'));
    lines.push(chalk.gray('  → Consider running `ginko handoff` to create session log'));

    return lines.length > 5 ? lines.join('\n') : null; // Only return if we found something
  } catch (error) {
    console.log(chalk.red(`Error synthesizing from git: ${error}`));
    return null;
  }
}
