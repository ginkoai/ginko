/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-19
 * @tags: [task-sync, graph, neo4j, epic-015, sprint-0a]
 * @related: [task-parser.ts, ../commands/graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [api-client]
 */

/**
 * Task Graph Sync (EPIC-015 Sprint 0a Tasks 2-3)
 *
 * Syncs parsed tasks to Neo4j graph via the dashboard API.
 * Creates Task nodes and BELONGS_TO relationships.
 *
 * Key principle (ADR-060): Content from Git, State from Graph.
 * - On CREATE: Uses initial_status from markdown
 * - On UPDATE: Preserves existing status (graph-authoritative)
 */

import { GraphApiClient } from '../commands/graph/api-client.js';
import { loadGraphConfig, isGraphInitialized } from '../commands/graph/config.js';
import { ParsedTask, SprintParseResult } from './task-parser.js';

/**
 * Response from task sync API
 */
export interface TaskSyncResponse {
  success: boolean;
  created: number;
  updated: number;
  relationships: number;
  tasks: string[];
}

/**
 * Options for task sync
 */
export interface TaskSyncOptions {
  /** Create BELONGS_TO relationships (default: true) */
  createRelationships?: boolean;
  /** Batch size for API calls (default: 50) */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (synced: number, total: number) => void;
}

/**
 * Result of syncing multiple sprints
 */
export interface BatchSyncResult {
  success: boolean;
  totalTasks: number;
  created: number;
  updated: number;
  relationships: number;
  errors: string[];
}

/**
 * Sync tasks to graph via API
 *
 * @param tasks - Array of parsed tasks
 * @param graphId - Graph namespace ID
 * @param client - GraphApiClient instance
 * @param options - Sync options
 * @returns TaskSyncResponse
 */
export async function syncTasksToGraph(
  tasks: ParsedTask[],
  graphId: string,
  client: GraphApiClient,
  options: TaskSyncOptions = {}
): Promise<TaskSyncResponse> {
  const { createRelationships = true, batchSize = 50, onProgress } = options;

  if (tasks.length === 0) {
    return {
      success: true,
      created: 0,
      updated: 0,
      relationships: 0,
      tasks: [],
    };
  }

  // Process in batches
  const batches: ParsedTask[][] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    batches.push(tasks.slice(i, i + batchSize));
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalRelationships = 0;
  const allTaskIds: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const response = await client.syncTasks(graphId, batch, createRelationships);

    totalCreated += response.created;
    totalUpdated += response.updated;
    totalRelationships += response.relationships;
    allTaskIds.push(...response.tasks);

    if (onProgress) {
      const synced = Math.min((i + 1) * batchSize, tasks.length);
      onProgress(synced, tasks.length);
    }
  }

  return {
    success: true,
    created: totalCreated,
    updated: totalUpdated,
    relationships: totalRelationships,
    tasks: allTaskIds,
  };
}

/**
 * Sync a single sprint's tasks to graph
 *
 * @param sprintResult - Parsed sprint with tasks
 * @param client - GraphApiClient instance (optional, will create if not provided)
 * @param options - Sync options
 * @returns TaskSyncResponse
 */
export async function syncSprintTasksToGraph(
  sprintResult: SprintParseResult,
  client?: GraphApiClient,
  options: TaskSyncOptions = {}
): Promise<TaskSyncResponse> {
  // Check if graph is initialized
  if (!await isGraphInitialized()) {
    throw new Error('Graph not initialized. Run "ginko graph init" first.');
  }

  // Load config to get graphId
  const config = await loadGraphConfig();
  if (!config) {
    throw new Error('Failed to load graph configuration');
  }

  // Create client if not provided
  const apiClient = client || new GraphApiClient(config.apiEndpoint);

  return syncTasksToGraph(sprintResult.tasks, config.graphId, apiClient, options);
}

/**
 * Sync multiple sprints' tasks to graph
 *
 * @param sprintResults - Array of parsed sprints with tasks
 * @param options - Sync options
 * @returns BatchSyncResult
 */
export async function syncAllSprintTasksToGraph(
  sprintResults: SprintParseResult[],
  options: TaskSyncOptions = {}
): Promise<BatchSyncResult> {
  // Check if graph is initialized
  if (!await isGraphInitialized()) {
    return {
      success: false,
      totalTasks: 0,
      created: 0,
      updated: 0,
      relationships: 0,
      errors: ['Graph not initialized. Run "ginko graph init" first.'],
    };
  }

  // Load config
  const config = await loadGraphConfig();
  if (!config) {
    return {
      success: false,
      totalTasks: 0,
      created: 0,
      updated: 0,
      relationships: 0,
      errors: ['Failed to load graph configuration'],
    };
  }

  // Collect all tasks
  const allTasks: ParsedTask[] = [];
  for (const result of sprintResults) {
    allTasks.push(...result.tasks);
  }

  if (allTasks.length === 0) {
    return {
      success: true,
      totalTasks: 0,
      created: 0,
      updated: 0,
      relationships: 0,
      errors: [],
    };
  }

  // Create client
  const client = new GraphApiClient(config.apiEndpoint);
  const errors: string[] = [];

  try {
    const response = await syncTasksToGraph(allTasks, config.graphId, client, options);

    return {
      success: true,
      totalTasks: allTasks.length,
      created: response.created,
      updated: response.updated,
      relationships: response.relationships,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during sync');
    return {
      success: false,
      totalTasks: allTasks.length,
      created: 0,
      updated: 0,
      relationships: 0,
      errors,
    };
  }
}

/**
 * Get task sync status from graph
 *
 * @param graphId - Graph namespace ID
 * @param sprintId - Optional sprint ID filter
 * @param epicId - Optional epic ID filter
 * @param client - GraphApiClient instance
 * @returns Array of task status objects
 */
export async function getTasksFromGraph(
  graphId: string,
  client: GraphApiClient,
  filters?: { sprintId?: string; epicId?: string }
): Promise<Array<{
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint_id: string;
  epic_id: string;
  estimate: string | null;
  assignee: string | null;
  synced_at: string | null;
}>> {
  return client.getTasks(graphId, filters);
}
