/**
 * @fileType: types
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sync, types, cloud-to-local, ADR-054]
 * @related: [sync-command.ts, node-syncer.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Sync Types (ADR-054)
 *
 * Types for the cloud→local sync command that pulls dashboard edits to git.
 */

export type NodeType = 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Charter';

export interface NodeSyncStatus {
  nodeId: string;
  nodeType: NodeType;

  // Sync state
  synced: boolean;
  syncedAt: Date | null;

  // Edit tracking
  editedAt: Date;
  editedBy: string;

  // Version tracking
  contentHash: string;
  gitHash: string | null;
  lastKnownGitHash: string | null;
}

export interface UnsyncedNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  status: string;
  tags: string[];

  // Sync metadata
  synced: boolean;
  syncedAt: string | null;
  editedAt: string;
  editedBy: string;
  contentHash: string;
  gitHash: string | null;

  // For file path generation
  slug?: string;
}

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  type?: NodeType;
  interactive?: boolean;
}

export type ConflictResolution = 'use-graph' | 'use-local' | 'skip' | 'merge';

export interface SyncConflict {
  node: UnsyncedNode;
  localContent: string;
  localHash: string;
  resolution?: ConflictResolution;
}

export interface SyncResult {
  synced: string[];
  skipped: string[];
  conflicts: SyncConflict[];
  errors: { nodeId: string; error: string }[];
}

export interface SyncApiResponse {
  nodes: UnsyncedNode[];
  count: number;
}
