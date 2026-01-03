/**
 * @fileType: types
 * @status: current
 * @updated: 2026-01-03
 * @tags: [sync, types, cloud-to-local, ADR-054, EPIC-008]
 * @related: [sync-command.ts, node-syncer.ts, team-sync.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Sync Types (ADR-054)
 *
 * Types for the cloud→local sync command that pulls dashboard edits to git.
 */

export type NodeType = 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Charter' | 'Sprint' | 'Task';

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

// Sprint sync types (ADR-054 extension)

export interface TaskStatusUpdate {
  taskId: string;
  newStatus: string;
  sprintId: string;
}

export interface SprintFile {
  path: string;
  sprintId: string;
  content: string;
}

export interface SprintSyncResult {
  sprintId: string;
  filePath: string;
  tasksUpdated: number;
  changes: string[];
  error: string | null;
}

// Team sync types (EPIC-008)

export interface TeamMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_sync_at: string | null;
  user: {
    id: string;
    email: string;
    github_username?: string;
    full_name?: string;
  } | null;
}

export interface TeamMembership {
  team_id: string;
  team_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_sync_at: string | null;
}

export interface TeamSyncStatus {
  isMember: boolean;
  membership: TeamMembership | null;
  staleness: {
    isStale: boolean;
    lastSyncAt: string | null;
    daysSinceSync: number;
    thresholdDays: number;
  };
}

export interface TeamSyncOptions extends SyncOptions {
  teamId?: string;
  stalenessThresholdDays?: number;
  skipMembershipCheck?: boolean;
  /** Preview mode: show team changes without syncing (EPIC-008 Sprint 2) */
  preview?: boolean;
}
