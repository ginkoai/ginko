#!/usr/bin/env node
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
export declare class GitIntegration extends EventEmitter {
    private projectPath;
    private isGitRepo;
    constructor(projectPath: string);
    private checkGitRepo;
    /**
     * Get recent git history with enhanced team context
     */
    getRecentCommits(since?: string): Promise<GitEvent[]>;
    /**
     * Get current git status with team context
     */
    getGitStatus(): Promise<{
        staged: string[];
        modified: string[];
        untracked: string[];
        branch: string;
    }>;
    /**
     * Parse GitHub webhook payload
     */
    static parseGitHubWebhook(payload: any): GitEvent | null;
    /**
     * Parse GitLab webhook payload
     */
    static parseGitLabWebhook(payload: any): GitEvent | null;
    /**
     * Determine which files need context updates based on changes
     */
    static getContextUpdateScope(changedFiles: string[]): {
        needsFullScan: boolean;
        affectedFiles: string[];
        updateType: 'incremental' | 'full' | 'structural';
    };
    /**
     * Get team activity insights from git history
     */
    getTeamActivity(days?: number): Promise<{
        activeMembers: Array<{
            name: string;
            commits: number;
            lastActive: Date;
            focusAreas: string[];
        }>;
        hotFiles: Array<{
            file: string;
            changes: number;
            contributors: string[];
        }>;
        trends: {
            commits: number;
            filesChanged: number;
            contributors: number;
        };
    }>;
    private extractFocusAreas;
}
//# sourceMappingURL=git-integration.d.ts.map