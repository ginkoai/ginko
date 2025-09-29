/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-29
 * @tags: [git, context, analysis, diff]
 * @related: [git-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [execSync]
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface GitContext {
  status: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    hasChanges: boolean;
  };
  diff: {
    staged: string;
    unstaged: string;
    stats: { files: number; insertions: number; deletions: number };
  };
  recent: {
    commits: Array<{ hash: string; message: string; date: string }>;
    lastCommitHash?: string;
  };
  branch: {
    current: string;
    upstream?: string;
    ahead: number;
    behind: number;
  };
  changeAnalysis: {
    type: 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Refactored' | 'Unknown';
    scope: string;
    affectedFiles: string[];
    isBreaking: boolean;
  };
}

/**
 * Gathers git context for commit and changelog analysis
 */
export class GitContextGatherer {
  /**
   * Gather all git context
   */
  async gather(): Promise<GitContext> {
    const context: GitContext = {
      status: await this.getStatus(),
      diff: await this.getDiff(),
      recent: await this.getRecentCommits(),
      branch: await this.getBranchInfo(),
      changeAnalysis: {
        type: 'Unknown',
        scope: '',
        affectedFiles: [],
        isBreaking: false
      }
    };

    // Analyze changes if there are any
    if (context.status.hasChanges) {
      context.changeAnalysis = await this.analyzeChanges(context);
    }

    return context;
  }

  /**
   * Get git status
   */
  private async getStatus(): Promise<GitContext['status']> {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf-8' });
      const lines = output.trim().split('\n').filter(Boolean);

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      lines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status === '??') {
          untracked.push(file);
        } else if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        } else if (status[1] !== ' ' && status[1] !== '?') {
          unstaged.push(file);
        }
      });

      return {
        staged,
        unstaged,
        untracked,
        hasChanges: lines.length > 0
      };
    } catch {
      return { staged: [], unstaged: [], untracked: [], hasChanges: false };
    }
  }

  /**
   * Get git diff
   */
  private async getDiff(): Promise<GitContext['diff']> {
    try {
      const staged = execSync('git diff --cached', { encoding: 'utf-8' });
      const unstaged = execSync('git diff', { encoding: 'utf-8' });

      // Get stats
      const statsOutput = execSync('git diff --cached --stat', { encoding: 'utf-8' });
      const stats = this.parseStats(statsOutput);

      return { staged, unstaged, stats };
    } catch {
      return {
        staged: '',
        unstaged: '',
        stats: { files: 0, insertions: 0, deletions: 0 }
      };
    }
  }

  /**
   * Parse git diff stats
   */
  private parseStats(output: string): { files: number; insertions: number; deletions: number } {
    const match = output.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    return {
      files: match ? parseInt(match[1], 10) : 0,
      insertions: match && match[2] ? parseInt(match[2], 10) : 0,
      deletions: match && match[3] ? parseInt(match[3], 10) : 0
    };
  }

  /**
   * Get recent commits
   */
  private async getRecentCommits(): Promise<GitContext['recent']> {
    try {
      const output = execSync('git log -5 --pretty=format:"%H|%s|%ai"', { encoding: 'utf-8' });
      const commits = output.split('\n').filter(Boolean).map(line => {
        const [hash, message, date] = line.split('|');
        return { hash: hash.substring(0, 7), message, date };
      });

      return {
        commits,
        lastCommitHash: commits[0]?.hash
      };
    } catch {
      return { commits: [] };
    }
  }

  /**
   * Get branch info
   */
  private async getBranchInfo(): Promise<GitContext['branch']> {
    try {
      const current = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

      let upstream: string | undefined;
      let ahead = 0;
      let behind = 0;

      try {
        upstream = execSync('git rev-parse --abbrev-ref @{upstream}', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();

        // Get ahead/behind counts
        const counts = execSync(`git rev-list --left-right --count ${upstream}...HEAD`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        const [behindStr, aheadStr] = counts.split('\t');
        behind = parseInt(behindStr, 10);
        ahead = parseInt(aheadStr, 10);
      } catch {
        // No upstream configured
      }

      return { current, upstream, ahead, behind };
    } catch {
      return { current: 'unknown', ahead: 0, behind: 0 };
    }
  }

  /**
   * Analyze changes to determine type and scope
   */
  private async analyzeChanges(context: GitContext): Promise<GitContext['changeAnalysis']> {
    const allFiles = [
      ...context.status.staged,
      ...context.status.unstaged
    ];

    // Determine scope from affected files
    const scope = this.detectScope(allFiles);

    // Determine change type from diff content
    const type = this.detectChangeType(context.diff.staged + context.diff.unstaged, allFiles);

    // Check for breaking changes
    const isBreaking = this.detectBreakingChanges(context.diff.staged + context.diff.unstaged);

    return {
      type,
      scope,
      affectedFiles: allFiles,
      isBreaking
    };
  }

  /**
   * Detect scope from file paths
   */
  private detectScope(files: string[]): string {
    const scopePatterns: Record<string, RegExp[]> = {
      'api': [/^(src\/)?api\//i, /route\.ts$/i, /endpoint/i],
      'cli': [/^(src\/)?commands\//i, /^packages\/cli/i],
      'database': [/^(src\/)?database\//i, /schema/, /migration/i],
      'auth': [/auth/i, /login/i, /session/i],
      'ui': [/^(src\/)?components\//i, /\.tsx$/i, /\.jsx$/i],
      'docs': [/^docs\//i, /\.md$/i, /README/i],
      'config': [/config/i, /\.config\./i, /\.json$/i],
      'core': [/^(src\/)?core\//i, /^(src\/)?lib\//i],
      'test': [/test/i, /spec/i, /\.test\./i, /\.spec\./i]
    };

    for (const [scope, patterns] of Object.entries(scopePatterns)) {
      if (files.some(file => patterns.some(pattern => pattern.test(file)))) {
        return scope;
      }
    }

    // Extract from first directory
    const firstFile = files[0];
    if (firstFile) {
      const match = firstFile.match(/^(?:src\/)?([^\/]+)\//);
      if (match) return match[1];
    }

    return 'general';
  }

  /**
   * Detect change type from diff content
   */
  private detectChangeType(
    diff: string,
    files: string[]
  ): 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Refactored' | 'Unknown' {
    // Check for new files (high weight)
    const newFiles = files.filter(f => diff.includes(`+++ b/${f}`) && !diff.includes(`--- a/${f}`));
    if (newFiles.length > files.length * 0.5) {
      return 'Added';
    }

    // Check for deleted files
    const deletedFiles = files.filter(f => diff.includes(`--- a/${f}`) && !diff.includes(`+++ b/${f}`));
    if (deletedFiles.length > 0) {
      return 'Removed';
    }

    // Analyze diff content
    const lowerDiff = diff.toLowerCase();

    // Check for fixes
    if (lowerDiff.match(/\b(fix|bug|error|issue|crash|broken)\b/g)) {
      return 'Fixed';
    }

    // Check for refactoring indicators
    const addedLines = (diff.match(/^\+[^+]/gm) || []).length;
    const removedLines = (diff.match(/^-[^-]/gm) || []).length;
    const changeRatio = Math.abs(addedLines - removedLines) / Math.max(addedLines, removedLines, 1);

    if (changeRatio < 0.3 && addedLines + removedLines > 50) {
      return 'Refactored';
    }

    // Check for new exports/functions (additions)
    if (lowerDiff.match(/\+\s*(export|function|class|const|let)/g)) {
      return 'Added';
    }

    return 'Changed';
  }

  /**
   * Detect breaking changes
   */
  private detectBreakingChanges(diff: string): boolean {
    const breakingPatterns = [
      /BREAKING CHANGE:/i,
      /^-\s*export\s+(function|class|const|interface|type)/gm,  // Removed exports
      /^-\s*(public|protected)\s+/gm,  // Changed visibility
      /renamed\s+from/i,  // Renamed files
      /remove.*api/i  // Removed API
    ];

    return breakingPatterns.some(pattern => pattern.test(diff));
  }

  /**
   * Generate commit message from changes
   */
  async suggestCommitMessage(context: GitContext): Promise<string> {
    const { changeAnalysis } = context;

    const type = changeAnalysis.type.toLowerCase();
    const scope = changeAnalysis.scope !== 'general' ? `(${changeAnalysis.scope})` : '';

    // Create subject from file changes
    const summary = this.summarizeChanges(context);

    let message = `${type}${scope}: ${summary}`;

    if (changeAnalysis.isBreaking) {
      message = message.replace(':', '!:');
    }

    return message;
  }

  /**
   * Summarize changes for commit message
   */
  private summarizeChanges(context: GitContext): string {
    const { staged, unstaged } = context.status;
    const files = [...staged, ...unstaged];

    if (files.length === 0) return 'update files';
    if (files.length === 1) return `update ${path.basename(files[0])}`;

    // Group by directory
    const dirs = new Set(files.map(f => f.split('/')[0]));
    if (dirs.size === 1) {
      return `update ${Array.from(dirs)[0]} module`;
    }

    return `update ${files.length} files across ${dirs.size} modules`;
  }
}