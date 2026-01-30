/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-30
 * @tags: [git, change-detection, push, ADR-077]
 * @related: [sync-state.ts, entity-classifier.ts, ../commands/push/push-command.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-git]
 */

/**
 * Git Change Detection (ADR-077)
 *
 * Uses `simple-git` to detect files changed since the last push commit.
 * When lastPushCommit is null (first push), returns all pushable content files.
 */

import { simpleGit, type SimpleGit } from 'simple-git';
import { isPushableFile, classifyFile, type ClassifiedFile } from './entity-classifier.js';

export interface ChangedFile {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
}

export interface ChangeDetectionResult {
  /** Files changed since last push */
  changedFiles: ChangedFile[];
  /** Classified files (excluding deleted) ready for push */
  classifiedFiles: ClassifiedFile[];
  /** Current HEAD commit SHA */
  headCommit: string;
  /** Whether this is a first-time push (no lastPushCommit) */
  isFirstPush: boolean;
}

/**
 * Detect files changed since the given commit SHA
 *
 * @param lastPushCommit - The commit SHA from last push (null = first push)
 * @param projectRoot - Project root directory
 * @returns Changed files with classification
 */
export async function detectChanges(
  lastPushCommit: string | null,
  projectRoot?: string
): Promise<ChangeDetectionResult> {
  const git: SimpleGit = simpleGit(projectRoot || process.cwd());

  // Get current HEAD
  const headCommit = await git.revparse(['HEAD']);

  if (!lastPushCommit) {
    // First push: find all pushable content files
    return await detectAllContentFiles(git, headCommit.trim());
  }

  // Check if the commit exists
  try {
    await git.catFile(['-t', lastPushCommit]);
  } catch {
    // Commit doesn't exist (e.g., after rebase) - treat as first push
    return await detectAllContentFiles(git, headCommit.trim());
  }

  // Get diff between last push and HEAD
  const diffSummary = await git.diffSummary([`${lastPushCommit}..HEAD`]);

  const changedFiles: ChangedFile[] = [];
  const classifiedFiles: ClassifiedFile[] = [];

  for (const file of diffSummary.files) {
    const filePath = file.file;

    if (!isPushableFile(filePath)) continue;

    // Determine change type: text files have insertions/deletions, binary/name-status don't
    let changeType: ChangedFile['changeType'] = 'modified';
    if ('insertions' in file && 'deletions' in file) {
      changeType =
        file.insertions > 0 && file.deletions === 0 ? 'added' :
        file.insertions === 0 && file.deletions > 0 ? 'deleted' :
        'modified';
    }

    changedFiles.push({ filePath, changeType });

    // Only classify non-deleted files for push
    if (changeType !== 'deleted') {
      classifiedFiles.push(classifyFile(filePath));
    }
  }

  return {
    changedFiles,
    classifiedFiles,
    headCommit: headCommit.trim(),
    isFirstPush: false,
  };
}

/**
 * Detect all content files for first-time push
 * Uses git ls-files to find all tracked files, then filters for pushable content
 */
async function detectAllContentFiles(
  git: SimpleGit,
  headCommit: string
): Promise<ChangeDetectionResult> {
  // Get all tracked files
  const trackedRaw = await git.raw(['ls-files']);
  const tracked = trackedRaw.split('\n').filter(Boolean);

  // Also get untracked content files
  const untrackedRaw = await git.raw(['ls-files', '--others', '--exclude-standard']);
  const untracked = untrackedRaw.split('\n').filter(Boolean);

  const allFiles = [...new Set([...tracked, ...untracked])];

  const changedFiles: ChangedFile[] = [];
  const classifiedFiles: ClassifiedFile[] = [];

  for (const filePath of allFiles) {
    if (!isPushableFile(filePath)) continue;

    changedFiles.push({ filePath, changeType: 'added' });
    classifiedFiles.push(classifyFile(filePath));
  }

  return {
    changedFiles,
    classifiedFiles,
    headCommit,
    isFirstPush: true,
  };
}

/**
 * Get count of unpushed files (for status display)
 */
export async function getUnpushedCount(
  lastPushCommit: string | null,
  projectRoot?: string
): Promise<number> {
  const result = await detectChanges(lastPushCommit, projectRoot);
  return result.changedFiles.length;
}
