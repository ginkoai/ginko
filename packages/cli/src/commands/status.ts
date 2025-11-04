/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-03
 * @tags: [cli, status, session, info, progressive-learning, defensive-logging]
 * @related: [session-log-manager.ts]
 * @priority: medium
 * @complexity: low
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, formatTimeAgo, getProjectInfo } from '../utils/helpers.js';
import { ProgressiveLearning } from '../utils/progressive-learning.js';
import { SessionLogManager } from '../core/session-log-manager.js';
import { listCursors, SessionCursor } from '../lib/session-cursor.js';

export async function statusCommand(options: any = {}) {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const currentHandoff = path.join(sessionDir, 'current.md');
    const projectInfo = await getProjectInfo();
    
    console.log(chalk.green('\n🌿 Ginko Status\n'));
    
    // Project info
    console.log(chalk.cyan('📦 Project'));
    console.log(`  Name: ${projectInfo.name}`);
    console.log(`  Type: ${projectInfo.type}`);
    console.log(`  User: ${userEmail}`);
    
    // Session info
    console.log(chalk.cyan('\n📝 Session'));
    let lastHandoffTime: Date | null = null;
    if (await fs.pathExists(currentHandoff)) {
      const stats = await fs.stat(currentHandoff);
      lastHandoffTime = stats.mtime;
      const content = await fs.readFile(currentHandoff, 'utf8');
      const modeMatch = content.match(/mode: (.*)/);
      const mode = modeMatch ? modeMatch[1] : 'Unknown';
      
      console.log(`  Status: Active`);
      console.log(`  Mode: ${mode}`);
      console.log(`  Last saved: ${formatTimeAgo(stats.mtime)}`);
      console.log(`  Size: ${Math.round(stats.size / 1024)}KB`);
    } else {
      console.log(`  Status: No active session`);
      console.log(chalk.dim(`  Run 'ginko start' to begin`));
    }

    // Session logging status
    const hasSessionLog = await SessionLogManager.hasSessionLog(sessionDir);

    if (hasSessionLog) {
      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const summary = SessionLogManager.getSummary(logContent);

      console.log(chalk.cyan('\n📝 Session Logging'));
      console.log(`  Status: ${chalk.green('Active')}`);
      console.log(`  Entries: ${summary.totalEntries}`);
      console.log(`  Files: ${summary.filesAffected}`);

      // Show breakdown by category
      if (summary.totalEntries > 0) {
        const categories = Object.entries(summary.byCategory)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(', ');
        console.log(`  ${chalk.dim(categories)}`);
      }
    } else {
      console.log(chalk.cyan('\n📝 Session Logging'));
      console.log(`  Status: ${chalk.dim('Not initialized')}`);
      console.log(chalk.dim(`  Run 'ginko start' to enable`));
    }

    // Git status
    const gitStatus = await git.status();
    const branch = await git.branchLocal();
    
    console.log(chalk.cyan('\n🌳 Git'));
    console.log(`  Branch: ${branch.current}`);
    console.log(`  Modified: ${gitStatus.modified.length} files`);
    console.log(`  Staged: ${gitStatus.staged.length} files`);
    console.log(`  Untracked: ${gitStatus.not_added.length} files`);
    
    // Privacy status
    const config = await fs.readJSON(path.join(ginkoDir, 'config.json'));
    console.log(chalk.cyan('\n🔐 Privacy'));
    console.log(`  Analytics: ${config.privacy?.analytics?.enabled ? chalk.yellow('Enabled (anonymous)') : chalk.green('Disabled')}`);
    console.log(`  Telemetry: ${config.privacy?.telemetry?.enabled ? chalk.yellow('Enabled') : chalk.green('Disabled')}`);
    console.log(chalk.dim(`  All data stored locally in .ginko/`));
    
    // Archive stats
    const archiveDir = path.join(sessionDir, 'archive');
    let archiveCount = 0;
    if (await fs.pathExists(archiveDir)) {
      const archives = await fs.readdir(archiveDir);
      archiveCount = archives.length;
      console.log(chalk.cyan('\n📚 Archives'));
      console.log(`  Sessions: ${archives.length}`);
      if (archives.length > 0) {
        console.log(chalk.dim(`  View with: ls .ginko/sessions/${userSlug}/archive/`));
      }
    }
    
    // Progressive learning hints
    await ProgressiveLearning.updateProgress('status');
    
    const sessionAge = lastHandoffTime ? 
      Math.floor((Date.now() - lastHandoffTime.getTime()) / 60000) : 0;
    
    await ProgressiveLearning.showHint({
      command: 'status',
      gitStatus,
      sessionAge,
      fileCount: archiveCount,
    });
    
    // Show smart suggestions (enhanced with pressure awareness)
    const suggestions = await ProgressiveLearning.getSmartSuggestions(gitStatus);

    if (suggestions.length > 0) {
      console.log(ProgressiveLearning.formatSuggestions(suggestions));
    }

    // Show all cursors if --all flag is used (ADR-043)
    if (options.all) {
      await displayAllCursors();
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Display all session cursors (ADR-043)
 */
async function displayAllCursors(): Promise<void> {
  try {
    const cursors = await listCursors();

    if (cursors.length === 0) {
      console.log(chalk.cyan('\n📍 Session Cursors'));
      console.log(chalk.dim('  No session cursors found'));
      return;
    }

    console.log(chalk.cyan('\n📍 Session Cursors'));
    console.log(chalk.dim(`  Total: ${cursors.length}\n`));

    for (const cursor of cursors) {
      const statusColor = cursor.status === 'active' ? chalk.green : chalk.yellow;
      const statusEmoji = cursor.status === 'active' ? '🟢' : '⏸️ ';

      console.log(statusColor(`${statusEmoji} ${cursor.branch}`));
      console.log(chalk.dim(`   Project: ${cursor.project_id}`));
      console.log(chalk.dim(`   Status: ${cursor.status}`));
      console.log(chalk.dim(`   Position: ${cursor.current_event_id}`));
      console.log(chalk.dim(`   Last active: ${formatTimeAgo(cursor.last_active)}`));
      console.log(chalk.dim(`   Started: ${formatTimeAgo(cursor.started)}`));
      console.log('');
    }

    // Show helpful tips
    const activeCursors = cursors.filter(c => c.status === 'active');
    if (activeCursors.length > 1) {
      console.log(chalk.yellow('⚠️  Multiple active cursors detected'));
      console.log(chalk.dim('   Consider pausing unused sessions with: ginko handoff'));
    }

  } catch (error) {
    console.warn(chalk.yellow('Failed to load cursors:'), error instanceof Error ? error.message : String(error));
  }
}