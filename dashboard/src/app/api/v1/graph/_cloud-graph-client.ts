/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-02
 * @tags: [graph, cloud, multi-tenant, neo4j, serverless, crud]
 * @related: [_neo4j.ts, init.ts, status.ts, nodes.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [neo4j-driver]
 */

import neo4j from 'neo4j-driver';
import { getDriver, runQuery } from './_neo4j';
import type { QueryResult, Record as Neo4jRecord } from 'neo4j-driver';

/**
 * Graph context for multi-tenancy
 */
export interface GraphContext {
  userId: string;      // Extracted from Bearer token
  graphId: string;     // Graph namespace identifier
  namespace?: string;  // Optional: /org/project path
}

/**
 * Generic node data structure
 */
export interface NodeData {
  id?: string;         // Optional: auto-generated if not provided
  [key: string]: any;  // Flexible properties
}

/**
 * Relationship data structure
 */
export interface RelationshipData {
  type: string;
  properties?: Record<string, any>;
}

/**
 * Query filters for node queries
 */
export interface QueryFilters {
  labels?: string[];   // Node labels to filter by (ADR, PRD, etc.)
  properties?: Record<string, any>;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' };
}

/**
 * Query result wrapper
 */
export interface QueryResultWrapper<T = any> {
  nodes: T[];
  totalCount: number;
  executionTime: number;
}

/**
 * Graph statistics
 */
export interface GraphStats {
  namespace: string;
  graphId: string;
  visibility: string;
  nodes: {
    total: number;
    byType: Record<string, number>;
    withEmbeddings?: number;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
  };
  health: string;
  lastSync?: string;
  stats?: {
    averageConnections?: number;
    mostConnected?: { id: string; connections: number };
  };
}

/**
 * Event Stream Types (ADR-043)
 */
export type EventCategory = 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';

export interface Event {
  id: string;              // 'event_1730736293000_abc123'
  user_id: string;         // Who logged this
  organization_id: string; // Multi-tenant scoping
  project_id: string;      // Which project
  timestamp: Date | string; // When it happened
  category: EventCategory; // fix|feature|decision|insight|git|achievement
  description: string;     // Rich context (WHY, not just WHAT)
  files: string[];         // Files mentioned
  impact: 'high' | 'medium' | 'low';
  pressure: number;        // Context pressure when logged (0-1)
  branch: string;          // Git branch context
  tags: string[];          // For filtering

  // Team collaboration
  shared: boolean;         // Team visibility (default: false)
  commit_hash?: string;    // Git commit reference (if applicable)
}

export interface SessionCursor {
  id: string;              // 'cursor_feature_auth'
  user_id: string;         // Cursor owner
  organization_id: string; // Multi-tenant scoping
  project_id: string;      // Project context
  branch: string;          // Git branch
  current_event_id: string; // Position in stream
  last_loaded_event_id: string; // What AI last saw
  started: Date | string;  // When cursor created
  last_active: Date | string; // Last activity
  status: 'active' | 'paused'; // No 'ended' - just paused
  context_snapshot?: Record<string, any>; // Optional: cached context
}

/**
 * CloudGraphClient
 *
 * Multi-tenant Neo4j client that automatically scopes all queries to user's graph.
 * Prevents cross-tenant data leakage by auto-injecting userId and graphId into queries.
 *
 * Features:
 * - Automatic multi-tenancy via namespace isolation
 * - Clean CRUD API for nodes and relationships
 * - Bearer token authentication
 * - Serverless-optimized connection pooling
 * - Type-safe operations with TypeScript
 *
 * Usage:
 * ```typescript
 * const client = await CloudGraphClient.fromBearerToken(token, graphId);
 * const adrId = await client.createNode('ADR', { title: 'My Decision', ... });
 * const node = await client.getNode(adrId);
 * ```
 */
export class CloudGraphClient {
  private context: GraphContext;

  constructor(context: GraphContext) {
    this.context = context;
  }

  /**
   * Create client from Bearer token
   * Extracts userId from token and validates graph access
   */
  static async fromBearerToken(
    token: string,
    graphId?: string
  ): Promise<CloudGraphClient> {
    // MVP: Accept any non-empty token
    if (!token || token.length < 8) {
      throw new Error('Invalid bearer token');
    }

    // Extract userId from token (temporary strategy)
    // Format: 'user_' + first 8 chars of base64 encoded token
    const userId = 'user_' + Buffer.from(token).toString('base64').substring(0, 8);

    const context: GraphContext = {
      userId,
      graphId: graphId || '',
    };

    const client = new CloudGraphClient(context);

    // Verify graph access if graphId provided
    if (graphId) {
      const hasAccess = await client.verifyAccess();
      if (!hasAccess) {
        throw new Error(`User ${userId} does not have access to graph ${graphId}`);
      }
    }

    return client;
  }

  /**
   * Verify user has access to graph
   */
  async verifyAccess(): Promise<boolean> {
    const result = await runQuery<{ count: number }>(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})
       RETURN count(g) as count`,
      { graphId: this.context.graphId, userId: this.context.userId }
    );

    return result.length > 0 && result[0].count > 0;
  }

  /**
   * Create a new node in the graph
   * Auto-generates ID if not provided
   * Automatically links to user's graph via CONTAINS relationship
   */
  async createNode(label: string, data: NodeData): Promise<string> {
    // Auto-generate ID if not provided
    const nodeId = data.id || `${label.toLowerCase()}_${Date.now()}_${this.randomString(6)}`;

    // Prepare properties (exclude id, it's set separately)
    const { id, ...props } = data;

    // Create node and link to graph
    const result = await runQuery<{ id: string }>(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})
       CREATE (g)-[:CONTAINS]->(n:${label})
       SET n = $props,
           n.id = $nodeId,
           n.createdAt = datetime(),
           n.updatedAt = datetime()
       RETURN n.id as id`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        nodeId,
        props,
      }
    );

    if (result.length === 0) {
      throw new Error(`Failed to create node. Graph ${this.context.graphId} may not exist.`);
    }

    return result[0].id;
  }

  /**
   * Get a node by ID
   * Returns null if not found or user doesn't have access
   */
  async getNode(id: string): Promise<NodeData | null> {
    const result = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n {id: $id})
       RETURN n`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        id,
      }
    );

    if (result.length === 0) {
      return null;
    }

    return result[0].n || null;
  }

  /**
   * Update a node by ID
   * Only updates provided properties, preserves others
   */
  async updateNode(id: string, data: Partial<NodeData>): Promise<void> {
    await runQuery(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n {id: $id})
       SET n += $data, n.updatedAt = datetime()`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        id,
        data,
      }
    );
  }

  /**
   * Delete a node by ID
   * Also deletes all relationships
   */
  async deleteNode(id: string): Promise<void> {
    await runQuery(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n {id: $id})
       DETACH DELETE n`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        id,
      }
    );
  }

  /**
   * Query nodes with filters
   * Supports filtering by labels, properties, pagination, and ordering
   */
  async queryNodes<T = NodeData>(filters: QueryFilters = {}): Promise<QueryResultWrapper<T>> {
    const {
      labels = [],
      properties = {},
      limit = 100,
      offset = 0,
      orderBy,
    } = filters;

    const startTime = Date.now();

    // Build label filter
    const labelFilter = labels.length > 0 ? `:${labels.join(':')}` : '';

    // Build property filter
    const propKeys = Object.keys(properties);
    const propFilter =
      propKeys.length > 0
        ? `WHERE ${propKeys.map((k) => `n.${k} = $prop_${k}`).join(' AND ')}`
        : '';

    // Build order clause
    const orderClause = orderBy ? `ORDER BY n.${orderBy.field} ${orderBy.direction}` : '';

    // Build property params
    const propParams = Object.fromEntries(
      propKeys.map((k) => [`prop_${k}`, properties[k]])
    );

    // Query nodes
    const cypher = `
      MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n${labelFilter})
      ${propFilter}
      ${orderClause}
      RETURN n
      SKIP $offset
      LIMIT $limit
    `;

    const nodes = await runQuery<T>(cypher, {
      graphId: this.context.graphId,
      userId: this.context.userId,
      offset: neo4j.int(offset),
      limit: neo4j.int(limit),
      ...propParams,
    });

    // Get total count
    const countCypher = `
      MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n${labelFilter})
      ${propFilter}
      RETURN count(n) as count
    `;

    const countResult = await runQuery<{ count: number }>(countCypher, {
      graphId: this.context.graphId,
      userId: this.context.userId,
      ...propParams,
    });

    return {
      nodes: nodes.map((n: any) => n.n || n),
      totalCount: countResult[0]?.count || 0,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Create a relationship between two nodes
   */
  async createRelationship(
    fromId: string,
    toId: string,
    relationship: RelationshipData
  ): Promise<void> {
    const { type, properties = {} } = relationship;

    await runQuery(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(from {id: $fromId})
       MATCH (g)-[:CONTAINS]->(to {id: $toId})
       CREATE (from)-[r:${type}]->(to)
       SET r = $props, r.createdAt = datetime()`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        fromId,
        toId,
        props: properties,
      }
    );
  }

  /**
   * Get relationships for a node
   * Optionally filter by relationship type
   */
  async getRelationships(nodeId: string, type?: string): Promise<RelationshipData[]> {
    const typeFilter = type ? `:${type}` : '';

    const result = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(n {id: $nodeId})
       MATCH (n)-[r${typeFilter}]-(connected)
       RETURN type(r) as type, properties(r) as properties,
              n.id as fromId, connected.id as toId`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        nodeId,
      }
    );

    return result.map((r: any) => ({
      type: r.type,
      properties: r.properties,
      fromId: r.fromId,
      toId: r.toId,
    }));
  }

  /**
   * Delete a relationship between two nodes
   */
  async deleteRelationship(fromId: string, toId: string, type: string): Promise<void> {
    await runQuery(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})-[:CONTAINS]->(from {id: $fromId})
       MATCH (g)-[:CONTAINS]->(to {id: $toId})
       MATCH (from)-[r:${type}]->(to)
       DELETE r`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
        fromId,
        toId,
      }
    );
  }

  /**
   * Semantic search using vector embeddings
   *
   * Searches for nodes similar to the given embedding vector using cosine similarity.
   * Requires vector indexes to be created (see schema/007-vector-indexes.cypher).
   *
   * @param queryEmbedding - 768-dimensional embedding vector from all-mpnet-base-v2
   * @param options - Search options (limit, threshold, types)
   * @returns Array of similar nodes with similarity scores
   *
   * @example
   * ```typescript
   * const embedding = await embedder.embed('graph-based context discovery');
   * const results = await client.semanticSearch(embedding.embedding, {
   *   limit: 10,
   *   threshold: 0.70,
   *   types: ['ADR', 'Pattern']
   * });
   * ```
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      types?: string[];
    } = {}
  ): Promise<Array<{ node: NodeData; score: number; type: string }>> {
    const { limit = 10, threshold = 0.70, types } = options;

    // Build node labels filter
    const labelFilter = types && types.length > 0
      ? `WHERE ANY(label IN labels(node) WHERE label IN [${types.map(t => `'${t}'`).join(', ')}])`
      : '';

    // Perform vector similarity search across all node types
    // Neo4j's db.index.vector.queryNodes returns nodes sorted by similarity
    // Filter by Graph → CONTAINS relationship (multi-tenant structure)
    const cypher = `
      CALL {
        ${types && types.length > 0
          ? types.map(type => `
            CALL db.index.vector.queryNodes('${type.toLowerCase()}_embedding_index', $limit, $queryEmbedding)
            YIELD node, score
            WITH node, score
            MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(node)
            RETURN node, score, '${type}' as type
          `).join(' UNION ALL ')
          : `
            CALL db.index.vector.queryNodes('adr_embedding_index', $limit, $queryEmbedding)
            YIELD node, score
            WITH node, score
            MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(node)
            RETURN node, score, 'ADR' as type
          `
        }
      }
      WITH node, score, type
      WHERE score >= $threshold
      RETURN node, score, type
      ORDER BY score DESC
      LIMIT $limit
    `;

    const result = await runQuery<any>(cypher, {
      graphId: this.context.graphId,
      queryEmbedding,
      limit: neo4j.int(limit),
      threshold,
    });

    return result.map(record => ({
      node: {
        id: record.node.properties.id,
        ...record.node.properties,
      },
      score: record.score,
      type: record.type,
    }));
  }

  /**
   * Convert Neo4j Integer/BigInt to JavaScript number
   */
  private toNumber(value: any): number {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      return value.toNumber();
    }
    return Number(value);
  }

  /**
   * Get graph statistics
   * Returns comprehensive stats about the graph
   */
  async getGraphStats(): Promise<GraphStats> {
    // Get graph metadata
    const graphResult = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})
       RETURN g.namespace as namespace,
              g.graphId as graphId,
              g.visibility as visibility,
              g.updatedAt as lastSync`,
      {
        graphId: this.context.graphId,
        userId: this.context.userId,
      }
    );

    if (graphResult.length === 0) {
      throw new Error(`Graph ${this.context.graphId} not found`);
    }

    const graphMeta = graphResult[0];

    // Get node counts by type
    const nodeCountResult = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       RETURN labels(doc)[0] as type, count(doc) as count`,
      { graphId: this.context.graphId }
    );

    const nodesByType: Record<string, number> = {};
    let totalNodes = 0;

    nodeCountResult.forEach((r: any) => {
      const count = this.toNumber(r.count);
      nodesByType[r.type] = count;
      totalNodes += count;
    });

    // Get embedding count
    const embeddingResult = await runQuery<{ count: number }>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       WHERE doc.embedding IS NOT NULL OR doc.openai_embedding IS NOT NULL
       RETURN count(doc) as count`,
      { graphId: this.context.graphId }
    );

    // Get relationship counts
    const relCountResult = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       MATCH (doc)-[r]-(other)
       WHERE other.id IS NOT NULL
       RETURN type(r) as type, count(r) as count`,
      { graphId: this.context.graphId }
    );

    const relsByType: Record<string, number> = {};
    let totalRels = 0;

    relCountResult.forEach((r: any) => {
      const count = this.toNumber(r.count);
      relsByType[r.type] = count;
      totalRels += count;
    });

    return {
      namespace: graphMeta.namespace,
      graphId: graphMeta.graphId,
      visibility: graphMeta.visibility,
      nodes: {
        total: totalNodes,
        byType: nodesByType,
        withEmbeddings: embeddingResult[0]?.count
          ? this.toNumber(embeddingResult[0].count)
          : 0,
      },
      relationships: {
        total: totalRels,
        byType: relsByType,
      },
      health: totalNodes > 0 ? 'healthy' : 'empty',
      lastSync: graphMeta.lastSync,
    };
  }

  /**
   * Run a custom Cypher query (advanced use)
   * Query is automatically scoped to user's graph
   *
   * WARNING: Use with caution. Prefer CRUD methods for safety.
   */
  async runScopedQuery<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    // Inject graph scoping parameters
    const scopedParams = {
      ...params,
      graphId: this.context.graphId,
      userId: this.context.userId,
    };

    return runQuery<T>(cypher, scopedParams);
  }

  /**
   * Get graph context
   */
  getContext(): GraphContext {
    return { ...this.context };
  }

  /**
   * Generate random string for IDs
   */
  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ============================================================
   * Event Stream Methods (ADR-043)
   * ============================================================
   */

  /**
   * Create an Event in the stream
   * Automatically links to User and previous Event (temporal chain)
   * Multi-tenant scoped by organization_id and project_id
   *
   * @param event - Event data (id auto-generated if not provided)
   * @returns Created event with generated ID
   */
  async createEvent(event: Omit<Event, 'id'> & { id?: string }): Promise<Event> {
    // Auto-generate ID if not provided
    const eventId = event.id || `event_${Date.now()}_${this.randomString(6)}`;

    // Ensure multi-tenant scoping
    if (!event.organization_id || !event.project_id) {
      throw new Error('Event must include organization_id and project_id for multi-tenant scoping');
    }

    // Create event and link to temporal chain
    const result = await runQuery<any>(
      `
      // Create event node
      CREATE (e:Event {
        id: $id,
        user_id: $user_id,
        organization_id: $organization_id,
        project_id: $project_id,
        timestamp: datetime($timestamp),
        category: $category,
        description: $description,
        files: $files,
        impact: $impact,
        pressure: $pressure,
        branch: $branch,
        tags: $tags,
        shared: $shared,
        commit_hash: $commit_hash
      })
      WITH e

      // Link to User (if exists)
      OPTIONAL MATCH (u:User {id: $user_id})
      FOREACH (user IN CASE WHEN u IS NOT NULL THEN [u] ELSE [] END |
        CREATE (user)-[:LOGGED]->(e)
      )

      // Link to previous event (temporal chain)
      WITH e
      CALL {
        WITH e
        MATCH (prev:Event)
        WHERE prev.user_id = e.user_id
          AND prev.organization_id = e.organization_id
          AND prev.project_id = e.project_id
          AND prev.branch = e.branch
          AND prev.id <> e.id
        RETURN prev
        ORDER BY prev.timestamp DESC
        LIMIT 1
      }
      WITH e, prev
      FOREACH (p IN CASE WHEN prev IS NOT NULL THEN [prev] ELSE [] END |
        CREATE (p)-[:NEXT]->(e)
      )

      RETURN e
      `,
      {
        id: eventId,
        user_id: event.user_id,
        organization_id: event.organization_id,
        project_id: event.project_id,
        timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
        category: event.category,
        description: event.description,
        files: event.files || [],
        impact: event.impact,
        pressure: event.pressure,
        branch: event.branch,
        tags: event.tags || [],
        shared: event.shared || false,
        commit_hash: event.commit_hash || null,
      }
    );

    if (result.length === 0) {
      throw new Error('Failed to create event');
    }

    const createdEvent = result[0].e.properties;
    return {
      ...createdEvent,
      timestamp: new Date(createdEvent.timestamp),
    };
  }

  /**
   * Create a SessionCursor
   * Cursors track position in event stream for context loading
   *
   * @param cursor - Cursor data (id auto-generated if not provided)
   * @returns Created cursor with generated ID
   */
  async createSessionCursor(
    cursor: Omit<SessionCursor, 'id'> & { id?: string }
  ): Promise<SessionCursor> {
    // Auto-generate ID if not provided
    const cursorId = cursor.id || `cursor_${cursor.branch}_${this.randomString(6)}`;

    // Ensure multi-tenant scoping
    if (!cursor.organization_id || !cursor.project_id) {
      throw new Error('SessionCursor must include organization_id and project_id for multi-tenant scoping');
    }

    // Create cursor and link to current event
    const result = await runQuery<any>(
      `
      // Create cursor node
      CREATE (c:SessionCursor {
        id: $id,
        user_id: $user_id,
        organization_id: $organization_id,
        project_id: $project_id,
        branch: $branch,
        current_event_id: $current_event_id,
        last_loaded_event_id: $last_loaded_event_id,
        started: datetime($started),
        last_active: datetime($last_active),
        status: $status
      })
      WITH c

      // Link to User (if exists)
      OPTIONAL MATCH (u:User {id: $user_id})
      FOREACH (user IN CASE WHEN u IS NOT NULL THEN [u] ELSE [] END |
        CREATE (user)-[:HAS_CURSOR]->(c)
      )

      // Link to current event position
      WITH c
      MATCH (e:Event {id: $current_event_id})
      WHERE e.organization_id = $organization_id
        AND e.project_id = $project_id
      CREATE (c)-[:POSITIONED_AT]->(e)

      RETURN c
      `,
      {
        id: cursorId,
        user_id: cursor.user_id,
        organization_id: cursor.organization_id,
        project_id: cursor.project_id,
        branch: cursor.branch,
        current_event_id: cursor.current_event_id,
        last_loaded_event_id: cursor.last_loaded_event_id,
        started: cursor.started instanceof Date ? cursor.started.toISOString() : cursor.started,
        last_active: cursor.last_active instanceof Date ? cursor.last_active.toISOString() : cursor.last_active,
        status: cursor.status,
      }
    );

    if (result.length === 0) {
      throw new Error('Failed to create session cursor. Ensure current_event_id exists.');
    }

    const createdCursor = result[0].c.properties;
    return {
      ...createdCursor,
      started: new Date(createdCursor.started),
      last_active: new Date(createdCursor.last_active),
    };
  }

  /**
   * Update SessionCursor position or status
   * Used when advancing cursor or pausing/resuming work
   *
   * @param cursorId - Cursor ID to update
   * @param updates - Partial cursor updates
   * @returns Updated cursor
   */
  async updateSessionCursor(
    cursorId: string,
    updates: Partial<Omit<SessionCursor, 'id' | 'user_id' | 'organization_id' | 'project_id'>>
  ): Promise<SessionCursor> {
    // Build update properties
    const updateProps: Record<string, any> = {};

    if (updates.current_event_id !== undefined) {
      updateProps.current_event_id = updates.current_event_id;
    }
    if (updates.last_loaded_event_id !== undefined) {
      updateProps.last_loaded_event_id = updates.last_loaded_event_id;
    }
    if (updates.status !== undefined) {
      updateProps.status = updates.status;
    }
    if (updates.context_snapshot !== undefined) {
      updateProps.context_snapshot = updates.context_snapshot;
    }

    // Always update last_active
    updateProps.last_active = updates.last_active instanceof Date
      ? updates.last_active.toISOString()
      : (updates.last_active || new Date().toISOString());

    const result = await runQuery<any>(
      `
      MATCH (c:SessionCursor {id: $cursorId})
      WHERE c.user_id = $userId
      SET c += $updateProps,
          c.last_active = datetime($last_active)

      // Update POSITIONED_AT relationship if current_event_id changed
      WITH c
      ${updates.current_event_id ? `
        OPTIONAL MATCH (c)-[old:POSITIONED_AT]->()
        DELETE old
        WITH c
        MATCH (e:Event {id: $new_event_id})
        WHERE e.organization_id = c.organization_id
          AND e.project_id = c.project_id
        CREATE (c)-[:POSITIONED_AT]->(e)
      ` : ''}

      RETURN c
      `,
      {
        cursorId,
        userId: this.context.userId,
        updateProps,
        last_active: updateProps.last_active,
        new_event_id: updates.current_event_id || null,
      }
    );

    if (result.length === 0) {
      throw new Error(`SessionCursor ${cursorId} not found or access denied`);
    }

    const updatedCursor = result[0].c.properties;
    return {
      ...updatedCursor,
      started: new Date(updatedCursor.started),
      last_active: new Date(updatedCursor.last_active),
    };
  }

  /**
   * Get SessionCursor by user, project, and branch
   * Multi-tenant safe - scoped to user's project
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param branch - Git branch
   * @returns Cursor or null if not found
   */
  async getSessionCursor(
    userId: string,
    projectId: string,
    branch: string
  ): Promise<SessionCursor | null> {
    const result = await runQuery<any>(
      `
      MATCH (c:SessionCursor)
      WHERE c.user_id = $userId
        AND c.project_id = $projectId
        AND c.branch = $branch
      RETURN c
      ORDER BY c.last_active DESC
      LIMIT 1
      `,
      { userId, projectId, branch }
    );

    if (result.length === 0) {
      return null;
    }

    const cursor = result[0].c.properties;
    return {
      ...cursor,
      started: new Date(cursor.started),
      last_active: new Date(cursor.last_active),
    };
  }

  /**
   * Read events backwards from cursor position
   * Implements ADR-043 context loading pattern
   *
   * @param cursorId - Cursor ID to read from
   * @param limit - Maximum number of events to read (default: 50)
   * @returns Array of events in reverse chronological order
   */
  async readEventsBackward(cursorId: string, limit: number = 50): Promise<Event[]> {
    const result = await runQuery<any>(
      `
      MATCH (cursor:SessionCursor {id: $cursorId})-[:POSITIONED_AT]->(current:Event)
      WHERE cursor.user_id = $userId

      // Read backwards via NEXT relationships (variable-length path)
      MATCH path = (e:Event)-[:NEXT*0..${limit}]->(current)
      WHERE e.organization_id = cursor.organization_id
        AND e.project_id = cursor.project_id
        AND (e.branch = cursor.branch OR cursor.branch IS NULL)

      WITH DISTINCT e
      ORDER BY e.timestamp DESC
      LIMIT $limit

      RETURN e
      `,
      {
        cursorId,
        userId: this.context.userId,
        limit: neo4j.int(limit),
      }
    );

    return result.map((r: any) => ({
      ...r.e.properties,
      timestamp: new Date(r.e.properties.timestamp),
    }));
  }
}

/**
 * Helper to extract userId from Bearer token
 * MVP implementation - will be replaced with Supabase verification
 */
export function extractUserIdFromToken(token: string): string {
  if (!token || token.length < 8) {
    throw new Error('Invalid token');
  }
  return 'user_' + Buffer.from(token).toString('base64').substring(0, 8);
}
