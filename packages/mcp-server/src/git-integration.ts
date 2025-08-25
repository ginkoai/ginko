#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { EventEmitter } from 'events';

export interface GitEvent {
  type: 'push' | 'commit' | 'merge' | 'pull_request';
  author: string;
  message: string;
  files: string[];
  timestamp: Date;
  hash?: string;
  branch?: string;
  projectId?: string;
}

export interface FileChange {
  type: 'add' | 'modify' | 'delete';
  filePath: string;
  timestamp: Date;
  size?: number;
}

export class GitIntegration extends EventEmitter {
  private projectPath: string;
  private isGitRepo: boolean;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
    this.isGitRepo = this.checkGitRepo();
  }

  private checkGitRepo(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: this.projectPath, 
        stdio: 'ignore' 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get recent git history with enhanced team context
   */
  async getRecentCommits(since: string = '1 day'): Promise<GitEvent[]> {
    if (!this.isGitRepo) return [];

    try {
      const commits = execSync(
        `git log --since="${since}" --pretty=format:"%H|%an|%ae|%s|%ad" --date=iso`,
        { cwd: this.projectPath, encoding: 'utf-8' }
      );

      if (!commits) return [];

      const events: GitEvent[] = [];
      
      for (const commitLine of commits.split('\n')) {
        if (!commitLine) continue;
        
        const [hash, author, email, message, dateStr] = commitLine.split('|');
        
        // Get files for this commit
        const filesChanged = execSync(
          `git diff-tree --no-commit-id --name-only -r ${hash}`,
          { cwd: this.projectPath, encoding: 'utf-8' }
        ).split('\n').filter(Boolean);

        events.push({
          type: 'commit',
          author,
          message,
          files: filesChanged,
          timestamp: new Date(dateStr),
          hash,
        });
      }

      return events;
    } catch (error) {
      console.error('[GIT] Error getting recent commits:', error);
      return [];
    }
  }

  /**
   * Get current git status with team context
   */
  async getGitStatus(): Promise<{ staged: string[]; modified: string[]; untracked: string[]; branch: string }> {
    if (!this.isGitRepo) {
      return { staged: [], modified: [], untracked: [], branch: 'main' };
    }

    try {
      // Get current branch
      const branch = execSync('git branch --show-current', {
        cwd: this.projectPath,
        encoding: 'utf-8'
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: this.projectPath,
        encoding: 'utf-8'
      });

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      for (const line of status.split('\n')) {
        if (!line) continue;
        
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3);

        if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          staged.push(filePath);
        }
        if (statusCode[1] === 'M' || statusCode[1] === 'D') {
          modified.push(filePath);
        }
        if (statusCode === '??') {
          untracked.push(filePath);
        }
      }

      return { staged, modified, untracked, branch };
    } catch (error) {
      console.error('[GIT] Error getting git status:', error);
      return { staged: [], modified: [], untracked: [], branch: 'main' };
    }
  }

  /**
   * Parse GitHub webhook payload
   */
  static parseGitHubWebhook(payload: any): GitEvent | null {
    try {
      if (!payload.commits || !payload.repository) return null;

      const latestCommit = payload.commits[payload.commits.length - 1];
      if (!latestCommit) return null;
      
      return {
        type: 'push',
        author: latestCommit.author.name,
        message: latestCommit.message,
        files: [
          ...(latestCommit.added || []),
          ...(latestCommit.modified || []),
          ...(latestCommit.removed || [])
        ],
        timestamp: new Date(latestCommit.timestamp),
        hash: latestCommit.id,
        branch: payload.ref?.replace('refs/heads/', ''),
        projectId: payload.repository.full_name,
      };
    } catch (error) {
      console.error('[GIT] Error parsing GitHub webhook:', error);
      return null;
    }
  }

  /**
   * Parse GitLab webhook payload
   */
  static parseGitLabWebhook(payload: any): GitEvent | null {
    try {
      if (!payload.commits || !payload.project) return null;

      const latestCommit = payload.commits[payload.commits.length - 1];
      if (!latestCommit) return null;
      
      return {
        type: 'push',
        author: latestCommit.author.name,
        message: latestCommit.message,
        files: [
          ...(latestCommit.added || []),
          ...(latestCommit.modified || []),
          ...(latestCommit.removed || [])
        ],
        timestamp: new Date(latestCommit.timestamp),
        hash: latestCommit.id,
        branch: payload.ref?.replace('refs/heads/', ''),
        projectId: payload.project.path_with_namespace,
      };
    } catch (error) {
      console.error('[GIT] Error parsing GitLab webhook:', error);
      return null;
    }
  }

  /**
   * Determine which files need context updates based on changes
   */
  static getContextUpdateScope(changedFiles: string[]): {
    needsFullScan: boolean;
    affectedFiles: string[];
    updateType: 'incremental' | 'full' | 'structural';
  } {
    const structuralFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'webpack.config.js',
      '.gitignore',
      'README.md',
    ];

    const coreFiles = [
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/app.ts',
      'index.ts',
      'index.js',
    ];

    const needsFullScan = changedFiles.some(file => 
      structuralFiles.some(pattern => file.includes(pattern)) ||
      coreFiles.some(pattern => file.includes(pattern))
    );

    const updateType = needsFullScan ? 
      (structuralFiles.some(pattern => changedFiles.some(file => file.includes(pattern))) ? 'structural' : 'full') :
      'incremental';

    return {
      needsFullScan,
      affectedFiles: changedFiles,
      updateType,
    };
  }

  /**
   * Get team activity insights from git history
   */
  async getTeamActivity(days: number = 7): Promise<{
    activeMembers: Array<{ name: string; commits: number; lastActive: Date; focusAreas: string[] }>;
    hotFiles: Array<{ file: string; changes: number; contributors: string[] }>;
    trends: { commits: number; filesChanged: number; contributors: number };
  }> {
    if (!this.isGitRepo) {
      return { activeMembers: [], hotFiles: [], trends: { commits: 0, filesChanged: 0, contributors: 0 } };
    }

    try {
      // Get commits from last N days
      const commits = await this.getRecentCommits(`${days} days ago`);
      
      // Analyze team member activity
      const memberActivity = new Map<string, { commits: number; lastActive: Date; files: Set<string> }>();
      const fileActivity = new Map<string, { changes: number; contributors: Set<string> }>();

      for (const commit of commits) {
        // Track member activity
        if (!memberActivity.has(commit.author)) {
          memberActivity.set(commit.author, { commits: 0, lastActive: commit.timestamp, files: new Set() });
        }
        const member = memberActivity.get(commit.author)!;
        member.commits++;
        if (commit.timestamp > member.lastActive) {
          member.lastActive = commit.timestamp;
        }
        commit.files.forEach(file => member.files.add(file));

        // Track file activity
        for (const file of commit.files) {
          if (!fileActivity.has(file)) {
            fileActivity.set(file, { changes: 0, contributors: new Set() });
          }
          const fileData = fileActivity.get(file)!;
          fileData.changes++;
          fileData.contributors.add(commit.author);
        }
      }

      // Convert to results format
      const activeMembers = Array.from(memberActivity.entries()).map(([name, data]) => ({
        name,
        commits: data.commits,
        lastActive: data.lastActive,
        focusAreas: this.extractFocusAreas(Array.from(data.files)),
      })).sort((a, b) => b.commits - a.commits);

      const hotFiles = Array.from(fileActivity.entries())
        .map(([file, data]) => ({
          file,
          changes: data.changes,
          contributors: Array.from(data.contributors),
        }))
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 10);

      const trends = {
        commits: commits.length,
        filesChanged: fileActivity.size,
        contributors: memberActivity.size,
      };

      return { activeMembers, hotFiles, trends };
    } catch (error) {
      console.error('[GIT] Error getting team activity:', error);
      return { activeMembers: [], hotFiles: [], trends: { commits: 0, filesChanged: 0, contributors: 0 } };
    }
  }

  private extractFocusAreas(files: string[]): string[] {
    const areas = new Map<string, number>();
    
    for (const file of files) {
      const parts = file.split('/');
      if (parts.length > 1) {
        const area = parts[0] === 'src' ? (parts[1] || 'core') : parts[0];
        areas.set(area, (areas.get(area) || 0) + 1);
      }
    }

    return Array.from(areas.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);
  }
}

// Remove default export to fix import issues