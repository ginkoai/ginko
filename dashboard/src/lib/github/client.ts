/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-16
 * @tags: [github, api-client, git-sync, ADR-054]
 * @related: [types.ts, git-sync-service.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * GitHub Client (ADR-054 / e011_s02_t03)
 *
 * Handles GitHub API operations for syncing dashboard edits to git.
 * Uses GitHub Contents API - no local git required.
 */

import type { GitHubFileContent, GitHubFileResult } from './types';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubClient {
  private owner: string;
  private repo: string;
  private token: string;
  private defaultBranch: string;

  constructor(repoUrl: string, token: string, defaultBranch = 'main') {
    const parsed = this.parseRepoUrl(repoUrl);
    this.owner = parsed.owner;
    this.repo = parsed.repo;
    this.token = token;
    this.defaultBranch = defaultBranch;
  }

  /**
   * Parse GitHub repo URL to extract owner and repo name
   */
  private parseRepoUrl(url: string): { owner: string; repo: string } {
    // Handle HTTPS URLs: https://github.com/owner/repo or https://github.com/owner/repo.git
    const httpsMatch = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    // Handle SSH URLs: git@github.com:owner/repo.git
    const sshMatch = url.match(/git@github\.com:([\w.-]+)\/([\w.-]+?)(\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    throw new Error(`Invalid GitHub repo URL: ${url}`);
  }

  /**
   * Get file content and SHA from repository
   * Returns null if file doesn't exist
   */
  async getFile(path: string, branch?: string): Promise<GitHubFileContent | null> {
    const ref = branch || this.defaultBranch;
    const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${ref}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      sha: data.sha,
      path: data.path,
      encoding: data.encoding,
    };
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<GitHubFileResult> {
    const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const body: Record<string, string> = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: branch || this.defaultBranch,
    };

    // If SHA provided, this is an update (required for existing files)
    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      sha: data.commit.sha,
      path: data.content.path,
      url: data.content.html_url,
    };
  }

  /**
   * Get default branch for the repository
   */
  async getDefaultBranch(): Promise<string> {
    const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.default_branch;
  }

  /**
   * Build authorization headers
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Ginko-Dashboard',
    };
  }

  /**
   * Get repository owner
   */
  getOwner(): string {
    return this.owner;
  }

  /**
   * Get repository name
   */
  getRepo(): string {
    return this.repo;
  }
}
