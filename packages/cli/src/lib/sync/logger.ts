/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [sync, logging, rollback, audit, task-026]
 * @related: [sync.ts, uploader.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [fs]
 */

/**
 * Sync Logger (TASK-026)
 *
 * Logs sync operations for audit and rollback:
 * - Stores sync metadata (timestamp, nodes uploaded, conflicts)
 * - Enables rollback to previous state
 * - Provides sync history
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export interface SyncLog {
  syncId: string;
  timestamp: string;
  graphId: string;
  nodesScanned: number;
  nodesUploaded: number;
  nodesFailed: number;
  nodesSkipped: number;
  relationshipsCreated: number;
  conflicts: number;
  resolution: string;
  duration: number;
  uploadedNodes?: Array<{
    id: string;
    type: string;
    title: string;
  }>;
}

/**
 * Sync logger for tracking sync operations
 */
export class SyncLogger {
  private graphId: string;
  private syncId: string;
  private logDir: string;
  private logFile: string;

  constructor(graphId: string) {
    this.graphId = graphId;
    this.syncId = this.generateSyncId();

    // Store logs in user's home directory
    this.logDir = path.join(homedir(), '.ginko', 'sync-logs');
    this.logFile = path.join(this.logDir, `${this.syncId}.json`);
  }

  /**
   * Initialize logger (create directories)
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to initialize sync logger: ${error.message}`);
    }
  }

  /**
   * Log sync operation
   */
  async logSync(log: Omit<SyncLog, 'syncId'>): Promise<void> {
    try {
      const fullLog: SyncLog = {
        syncId: this.syncId,
        ...log,
      };

      await fs.writeFile(this.logFile, JSON.stringify(fullLog, null, 2), 'utf-8');

      // Also append to history file
      await this.appendToHistory(fullLog);

    } catch (error: any) {
      console.warn(`⚠️  Failed to write sync log: ${error.message}`);
    }
  }

  /**
   * Append to sync history
   */
  private async appendToHistory(log: SyncLog): Promise<void> {
    try {
      const historyFile = path.join(this.logDir, 'history.jsonl');

      const entry = JSON.stringify(log) + '\n';
      await fs.appendFile(historyFile, entry, 'utf-8');

    } catch (error: any) {
      // Non-critical error
      console.warn(`⚠️  Failed to append to history: ${error.message}`);
    }
  }

  /**
   * Get sync log by ID
   */
  async getSyncLog(syncId: string): Promise<SyncLog | null> {
    try {
      const logFile = path.join(this.logDir, `${syncId}.json`);
      const content = await fs.readFile(logFile, 'utf-8');
      return JSON.parse(content);

    } catch (error: any) {
      return null;
    }
  }

  /**
   * Get all sync logs
   */
  async getAllSyncLogs(): Promise<SyncLog[]> {
    try {
      const files = await fs.readdir(this.logDir);
      const logs: SyncLog[] = [];

      for (const file of files) {
        if (file.endsWith('.json') && file !== 'history.jsonl') {
          const content = await fs.readFile(path.join(this.logDir, file), 'utf-8');
          logs.push(JSON.parse(content));
        }
      }

      // Sort by timestamp (newest first)
      return logs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error: any) {
      return [];
    }
  }

  /**
   * Get sync history from JSONL file
   */
  async getSyncHistory(): Promise<SyncLog[]> {
    try {
      const historyFile = path.join(this.logDir, 'history.jsonl');
      const content = await fs.readFile(historyFile, 'utf-8');

      const logs = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      return logs.reverse(); // Newest first

    } catch (error: any) {
      return [];
    }
  }

  /**
   * Generate unique sync ID
   */
  private generateSyncId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `sync-${timestamp}`;
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logFile;
  }

  /**
   * Get sync ID
   */
  getSyncId(): string {
    return this.syncId;
  }

  /**
   * Clean up old logs (keep last N)
   */
  async cleanupOldLogs(keepCount: number = 10): Promise<void> {
    try {
      const logs = await this.getAllSyncLogs();

      if (logs.length <= keepCount) {
        return;
      }

      // Delete oldest logs
      const logsToDelete = logs.slice(keepCount);

      for (const log of logsToDelete) {
        const logFile = path.join(this.logDir, `${log.syncId}.json`);
        try {
          await fs.unlink(logFile);
        } catch (error) {
          // Ignore errors when deleting old logs
        }
      }

    } catch (error: any) {
      // Non-critical error
      console.warn(`⚠️  Failed to cleanup old logs: ${error.message}`);
    }
  }
}

/**
 * Get sync statistics
 */
export function getSyncStats(logs: SyncLog[]): {
  totalSyncs: number;
  totalNodesUploaded: number;
  totalRelationships: number;
  averageDuration: number;
  successRate: number;
} {
  if (logs.length === 0) {
    return {
      totalSyncs: 0,
      totalNodesUploaded: 0,
      totalRelationships: 0,
      averageDuration: 0,
      successRate: 0,
    };
  }

  const totalSyncs = logs.length;
  const totalNodesUploaded = logs.reduce((sum, log) => sum + log.nodesUploaded, 0);
  const totalRelationships = logs.reduce((sum, log) => sum + log.relationshipsCreated, 0);
  const averageDuration = logs.reduce((sum, log) => sum + log.duration, 0) / totalSyncs;
  const successfulSyncs = logs.filter(log => log.nodesFailed === 0).length;
  const successRate = (successfulSyncs / totalSyncs) * 100;

  return {
    totalSyncs,
    totalNodesUploaded,
    totalRelationships,
    averageDuration: Math.round(averageDuration),
    successRate: Math.round(successRate * 10) / 10,
  };
}
