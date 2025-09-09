/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-09
 * @tags: [session, data-collection, git, testing]
 * @related: [../types/session.ts, ../commands/handoff-ai.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [simple-git, fs-extra]
 */

import simpleGit, { SimpleGit, LogResult, StatusResult, DiffResult } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import {
  SessionData,
  GitCommit,
  FileChange,
  TestResult,
  ErrorLog,
  WorkMode,
  TestFailure
} from '../types/session.js';

/**
 * Collects comprehensive session data for insight extraction
 */
export class SessionCollector {
  private git: SimpleGit;
  private sessionStart: Date;
  private terminalBuffer: string[] = [];
  
  constructor() {
    this.git = simpleGit();
    this.sessionStart = new Date();
  }
  
  /**
   * Collect all session data
   */
  async collectSessionData(userEmail: string, previousHandoff?: string): Promise<SessionData> {
    const [
      gitData,
      testResults,
      errorLogs,
      buildOutput
    ] = await Promise.all([
      this.collectGitData(),
      this.collectTestResults(),
      this.collectErrorLogs(),
      this.collectBuildOutput()
    ]);
    
    const sessionEnd = new Date();
    const duration = Math.round((sessionEnd.getTime() - this.sessionStart.getTime()) / 60000);
    
    return {
      ...gitData,
      testResults,
      errorLogs,
      buildOutput,
      terminalOutput: this.terminalBuffer,
      sessionStart: this.sessionStart,
      sessionEnd,
      duration,
      userEmail,
      previousHandoff
    };
  }
  
  /**
   * Collect git-related data
   */
  private async collectGitData(): Promise<Partial<SessionData>> {
    const status = await this.git.status();
    const branch = await this.git.branchLocal();
    const log = await this.git.log({ maxCount: 20 });
    const diff = await this.git.diff(['--stat']);
    const stagedDiff = await this.git.diff(['--staged', '--stat']);
    
    // Get detailed file changes
    const filesChanged = await this.getDetailedFileChanges(status);
    
    // Convert git log to our format
    const commits = this.parseGitCommits(log);
    
    // Detect work mode from activity
    const workMode = this.detectWorkMode(status, commits, filesChanged);
    
    return {
      branch: branch.current,
      commits,
      diff,
      stagedDiff,
      filesChanged,
      workMode
    };
  }
  
  /**
   * Get detailed information about changed files
   */
  private async getDetailedFileChanges(status: StatusResult): Promise<FileChange[]> {
    const allFiles = [
      ...status.modified.map(f => ({ path: f, status: 'modified' as const })),
      ...status.created.map(f => ({ path: f, status: 'added' as const })),
      ...status.deleted.map(f => ({ path: f, status: 'deleted' as const })),
      ...status.renamed.map(f => ({ path: f.to, status: 'renamed' as const }))
    ];
    
    const changes: FileChange[] = [];
    
    for (const file of allFiles) {
      try {
        // Get diff stats for this file
        const diffStat = await this.git.diff(['--stat', '--', file.path]);
        const stats = this.parseDiffStats(diffStat);
        
        changes.push({
          path: file.path,
          status: file.status,
          insertions: stats.insertions,
          deletions: stats.deletions,
          language: this.detectLanguage(file.path)
        });
      } catch (error) {
        // File might be deleted or binary
        changes.push({
          path: file.path,
          status: file.status,
          insertions: 0,
          deletions: 0,
          language: this.detectLanguage(file.path)
        });
      }
    }
    
    return changes;
  }
  
  /**
   * Parse git commits to our format
   */
  private parseGitCommits(log: LogResult): GitCommit[] {
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date),
      filesChanged: 0, // Would need additional git call per commit
      insertions: 0,
      deletions: 0
    }));
  }
  
  /**
   * Detect work mode from git activity
   */
  private detectWorkMode(
    status: StatusResult,
    commits: GitCommit[],
    files: FileChange[]
  ): WorkMode {
    // Check recent commit messages for clues
    const recentMessages = commits.slice(0, 5).map(c => c.message.toLowerCase());
    
    if (recentMessages.some(m => m.includes('test') || m.includes('spec'))) {
      return 'testing';
    }
    
    if (recentMessages.some(m => m.includes('fix') || m.includes('bug') || m.includes('error'))) {
      return 'debugging';
    }
    
    if (recentMessages.some(m => m.includes('refactor') || m.includes('cleanup'))) {
      return 'refactoring';
    }
    
    // Check file patterns
    const testFiles = files.filter(f => f.path.includes('test') || f.path.includes('spec'));
    if (testFiles.length > files.length * 0.5) {
      return 'testing';
    }
    
    // Default based on change volume
    if (files.length === 0 && commits.length === 0) {
      return 'exploring';
    }
    
    return 'developing';
  }
  
  /**
   * Collect test results from common test runners
   */
  private async collectTestResults(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Check for test result files
    const testPatterns = [
      { pattern: '**/jest-results.json', framework: 'jest' as const },
      { pattern: '**/vitest-results.json', framework: 'vitest' as const },
      { pattern: '**/.mocha-results.json', framework: 'mocha' as const },
      { pattern: '**/.pytest_cache/lastfailed', framework: 'pytest' as const }
    ];
    
    for (const { pattern, framework } of testPatterns) {
      try {
        // Try to find and parse test results
        const testResult = await this.parseTestResults(pattern, framework);
        if (testResult) {
          results.push(testResult);
        }
      } catch (error) {
        // Test results might not exist
        continue;
      }
    }
    
    // Also check recent terminal output for test runs
    const terminalTests = this.parseTerminalTestOutput();
    if (terminalTests) {
      results.push(terminalTests);
    }
    
    return results;
  }
  
  /**
   * Parse test results from file
   */
  private async parseTestResults(pattern: string, framework: TestResult['framework']): Promise<TestResult | null> {
    // This is a simplified implementation
    // Real implementation would parse actual test result files
    try {
      if (framework === 'jest') {
        // Check for Jest results
        const jestConfig = await fs.readJSON('jest.config.json').catch(() => null);
        if (jestConfig) {
          // Simulate test results (in real implementation, parse actual results)
          return {
            framework: 'jest',
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
          };
        }
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }
  
  /**
   * Parse test output from terminal buffer
   */
  private parseTerminalTestOutput(): TestResult | null {
    // Look for test patterns in terminal output
    const testPatterns = [
      /(\d+) passing.*(\d+) failing/,
      /Tests:\s+(\d+) passed.*(\d+) failed/,
      /(\d+) passed.*(\d+) failed.*(\d+) skipped/
    ];
    
    for (const line of this.terminalBuffer.slice(-100)) {
      for (const pattern of testPatterns) {
        const match = line.match(pattern);
        if (match) {
          return {
            framework: 'other',
            passed: parseInt(match[1]) || 0,
            failed: parseInt(match[2]) || 0,
            skipped: parseInt(match[3]) || 0,
            duration: 0
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Collect error logs from session
   */
  private async collectErrorLogs(): Promise<ErrorLog[]> {
    const errors: ErrorLog[] = [];
    
    // Parse terminal buffer for errors
    const errorPatterns = [
      /ERROR:?\s+(.*)/i,
      /Error:\s+(.*)/,
      /TypeError:\s+(.*)/,
      /SyntaxError:\s+(.*)/,
      /ReferenceError:\s+(.*)/,
      /Failed to compile/i,
      /Module not found/i
    ];
    
    this.terminalBuffer.forEach((line, index) => {
      for (const pattern of errorPatterns) {
        const match = line.match(pattern);
        if (match) {
          errors.push({
            timestamp: new Date(),
            level: 'error',
            message: match[1] || match[0],
            // Try to extract file and line from surrounding context
            file: this.extractFileFromContext(this.terminalBuffer, index),
            line: this.extractLineNumberFromContext(this.terminalBuffer, index)
          });
        }
      }
    });
    
    return errors;
  }
  
  /**
   * Collect build output
   */
  private async collectBuildOutput(): Promise<string | undefined> {
    try {
      // Check for common build output files
      const buildFiles = [
        'build.log',
        '.next/build-manifest.json',
        'dist/build-info.json'
      ];
      
      for (const file of buildFiles) {
        if (await fs.pathExists(file)) {
          return await fs.readFile(file, 'utf8');
        }
      }
      
      // Try to get recent build output from package.json scripts
      const packageJson = await fs.readJSON('package.json').catch(() => null);
      if (packageJson?.scripts?.build) {
        // Don't actually run build, just note that it exists
        return 'Build script available: ' + packageJson.scripts.build;
      }
    } catch (error) {
      // No build output available
    }
    
    return undefined;
  }
  
  /**
   * Parse diff stats from git output
   */
  private parseDiffStats(diffStat: string): { insertions: number; deletions: number } {
    const match = diffStat.match(/(\d+) insertions.*(\d+) deletions/);
    if (match) {
      return {
        insertions: parseInt(match[1]) || 0,
        deletions: parseInt(match[2]) || 0
      };
    }
    return { insertions: 0, deletions: 0 };
  }
  
  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filepath: string): string | undefined {
    const ext = path.extname(filepath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.cs': 'csharp',
      '.sh': 'bash',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.md': 'markdown',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html'
    };
    
    return languageMap[ext];
  }
  
  /**
   * Extract file path from error context
   */
  private extractFileFromContext(buffer: string[], errorIndex: number): string | undefined {
    // Look for file paths in surrounding lines
    const context = buffer.slice(Math.max(0, errorIndex - 2), errorIndex + 3);
    const filePattern = /(?:at |in |from )([^\s:]+\.[a-z]+):?(\d+)?/i;
    
    for (const line of context) {
      const match = line.match(filePattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract line number from error context
   */
  private extractLineNumberFromContext(buffer: string[], errorIndex: number): number | undefined {
    const context = buffer.slice(Math.max(0, errorIndex - 2), errorIndex + 3);
    const linePattern = /:(\d+)(?::\d+)?/;
    
    for (const line of context) {
      const match = line.match(linePattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return undefined;
  }
  
  /**
   * Add terminal output to buffer (for real-time capture)
   */
  public addTerminalOutput(output: string): void {
    this.terminalBuffer.push(output);
    // Keep buffer size manageable
    if (this.terminalBuffer.length > 10000) {
      this.terminalBuffer = this.terminalBuffer.slice(-5000);
    }
  }
}