/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-04
 * @tags: [start, session-synthesis, adr-033, edge-case-handling, progressive-search]
 * @related: [./index.ts, ../../utils/session-synthesizer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs/promises, path, chalk]
 */

import { showSessionSummary, synthesizeFromGit } from '../../utils/session-synthesizer.js';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Progressive search for session logs
 * Handles edge cases: handoff not called, log misplaced, log missing
 */
async function findSessionLog(ginkoDir: string, userSlug: string): Promise<string | null> {
  const userDir = path.join(ginkoDir, 'sessions', userSlug);
  const archiveDir = path.join(userDir, 'archive');

  // Strategy 1: Unarchived current session log (handoff not called)
  const currentLogPath = path.join(userDir, 'current-session-log.md');
  try {
    await fs.access(currentLogPath);
    const stats = await fs.stat(currentLogPath);
    if (stats.size > 100) { // Non-empty log
      console.log(chalk.gray('Found unarchived session log (handoff not called)'));
      return currentLogPath;
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Latest archived handoff (standard flow)
  try {
    await fs.access(archiveDir);
    const files = await fs.readdir(archiveDir);
    const handoffFiles = files
      .filter(f => f.endsWith('-handoff.md'))
      .sort()
      .reverse(); // Most recent first

    if (handoffFiles.length > 0) {
      console.log(chalk.gray(`Found archived handoff: ${handoffFiles[0]}`));
      return path.join(archiveDir, handoffFiles[0]);
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Alternative naming patterns
  const alternativeNames = ['session-log.md', 'log.md', 'handoff.md'];
  for (const name of alternativeNames) {
    const altPath = path.join(userDir, name);
    try {
      await fs.access(altPath);
      console.log(chalk.gray(`Found session log with alternative name: ${name}`));
      return altPath;
    } catch {
      continue;
    }
  }

  // Strategy 4: Search in other user directories (misplaced)
  try {
    const sessionsDir = path.join(ginkoDir, 'sessions');
    const userDirs = await fs.readdir(sessionsDir);

    for (const dir of userDirs) {
      if (dir === userSlug) continue; // Already checked

      const otherUserLog = path.join(sessionsDir, dir, 'current-session-log.md');
      try {
        await fs.access(otherUserLog);
        const stats = await fs.stat(otherUserLog);
        if (stats.size > 100) {
          console.log(chalk.yellow(`⚠ Found session log in different user directory: ${dir}`));
          return otherUserLog;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // No sessions directory or can't read it
  }

  return null; // No session log found anywhere
}

/**
 * Find and load the latest handoff from archive
 * Synthesize summary at optimal context pressure (0-20%)
 *
 * Edge case handling:
 * 1. Handoff not called → Use unarchived session log
 * 2. Session log missing → Progressive search + fallback synthesis
 */
export async function loadPreviousSession(): Promise<boolean> {
  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');

    // Progressive search for session log
    const sessionLogPath = await findSessionLog(ginkoDir, userSlug);

    if (sessionLogPath) {
      // Found session log - synthesize from it
      console.log('');
      await showSessionSummary(sessionLogPath);
      console.log('');
      console.log(chalk.gray('─'.repeat(60)));
      console.log('');
      return true;
    }

    // No session log found - fallback to git/context synthesis
    console.log(chalk.yellow('⚠ No session log found'));
    console.log(chalk.gray('Synthesizing from available sources (git, ADRs, PRDs)...'));
    console.log('');

    const fallbackSummary = await synthesizeFromGit(ginkoDir);

    if (fallbackSummary) {
      console.log(fallbackSummary);
      console.log('');
      console.log(chalk.gray('─'.repeat(60)));
      console.log('');
      return true;
    }

    return false; // No context available
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not load previous session: ${error}`));
    return false;
  }
}
