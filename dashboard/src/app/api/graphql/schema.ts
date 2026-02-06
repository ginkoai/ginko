/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-05
 * @tags: [graphql, schema, knowledge, task-024, epic-018, session-start]
 * @related: [route.ts, resolvers.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [graphql]
 */

/**
 * GraphQL Schema for Knowledge Graph API
 * TASK-024: GraphQL API Implementation
 *
 * Core Queries:
 * - search: Semantic search across knowledge nodes
 * - nodesByTag: Find nodes by tags
 * - nodeGraph: Get node with its relationship graph
 * - node: Get single node by ID
 * - nodes: List/filter nodes
 */

export const typeDefs = `#graphql
  """
  Knowledge node types supported by the graph
  """
  enum NodeType {
    ADR
    PRD
    ContextModule
    Session
    CodeFile
  }

  """
  Node status
  """
  enum NodeStatus {
    active
    archived
    draft
  }

  """
  Relationship types between nodes
  """
  enum RelationshipType {
    IMPLEMENTS
    REFERENCES
    TAGGED_WITH
    RELATED_TO
    HIGHLY_RELATED_TO
    DUPLICATE_OF
    LOOSELY_RELATED_TO
  }

  """
  A knowledge node in the graph
  """
  type KnowledgeNode {
    id: ID!
    type: NodeType!
    title: String
    content: String!
    status: NodeStatus!
    tags: [String!]
    projectId: String!
    userId: String!
    createdAt: String!
    updatedAt: String!

    # Computed fields
    relationships: [Relationship!]
    relatedNodes: [KnowledgeNode!]
  }

  """
  A relationship between two nodes
  """
  type Relationship {
    type: RelationshipType!
    fromId: ID!
    toId: ID!
    properties: JSON
    target: KnowledgeNode
  }

  """
  Search result with similarity score
  """
  type SearchResult {
    node: KnowledgeNode!
    score: Float!
    relationshipType: RelationshipType!
  }

  """
  Graph representation of a node and its connections
  """
  type NodeGraph {
    centerNode: KnowledgeNode!
    connectedNodes: [KnowledgeNode!]!
    relationships: [Relationship!]!
    depth: Int!
  }

  """
  Pagination info
  """
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    totalCount: Int!
  }

  """
  Paginated nodes response
  """
  type NodesConnection {
    nodes: [KnowledgeNode!]!
    pageInfo: PageInfo!
  }

  """
  Context-aware query filters
  """
  input ContextFilters {
    projectId: String
    branch: String
    timeRange: String
    userId: String
  }

  """
  JSON scalar for flexible property storage
  """
  scalar JSON

  """
  Root Query type
  """
  type Query {
    """
    Semantic search across knowledge nodes using vector similarity
    """
    search(
      query: String!
      graphId: String!
      limit: Int = 10
      minScore: Float = 0.75
      type: NodeType
      status: NodeStatus = active
    ): [SearchResult!]!

    """
    Find nodes by tags with optional filters
    """
    nodesByTag(
      tags: [String!]!
      graphId: String!
      type: NodeType
      status: NodeStatus = active
      limit: Int = 50
    ): [KnowledgeNode!]!

    """
    Get a node with its relationship graph (1-2 hops)
    """
    nodeGraph(
      nodeId: ID!
      graphId: String!
      depth: Int = 1
      relationshipTypes: [RelationshipType!]
    ): NodeGraph

    """
    Get a single node by ID
    """
    node(
      id: ID!
      graphId: String!
    ): KnowledgeNode

    """
    List nodes with filters and pagination
    """
    nodes(
      graphId: String!
      type: NodeType
      status: NodeStatus
      tags: [String!]
      limit: Int = 50
      offset: Int = 0
    ): NodesConnection!

    """
    Context-aware queries for AI assistance
    Find relevant nodes based on current work context
    """
    contextualNodes(
      graphId: String!
      context: ContextFilters!
      limit: Int = 20
    ): [KnowledgeNode!]!

    """
    Find ADRs implementing a specific PRD
    """
    adrsByPrd(
      prdId: ID!
      graphId: String!
    ): [KnowledgeNode!]!

    """
    Track implementation progress for a feature/project
    """
    implementationProgress(
      projectId: String!
      graphId: String!
    ): ImplementationProgress!

    """
    Strategic context for AI partner readiness
    Loads charter + team activity + relevant patterns in single query
    """
    strategicContext(
      graphId: String!
      userId: String!
      projectId: String!
      teamEventDays: Int = 7
      teamEventLimit: Int = 10
      patternTags: [String!]
      patternLimit: Int = 5
    ): StrategicContext!

    """
    Session start context - all data needed for ginko start in one query
    Replaces 4-5 sequential REST calls:
    1. GET /api/v1/sprint/active
    2. GET /api/v1/task/{id}/patterns
    3. GET /api/v1/task/{id}/gotchas
    4. GET /api/v1/task/{id}/constraints
    5. (optional) charter and team activity

    EPIC-018 Sprint 1 TASK-08
    """
    sessionStart(
      graphId: String!
      userId: String!
      sprintId: String
      eventLimit: Int = 25
      teamEventDays: Int = 7
    ): SessionStartResponse!
  }

  """
  Implementation progress tracking
  """
  type ImplementationProgress {
    totalPRDs: Int!
    implementedPRDs: Int!
    inProgressPRDs: Int!
    totalADRs: Int!
    completionPercentage: Float!
    recentDecisions: [KnowledgeNode!]!
  }

  """
  Project charter for strategic context
  """
  type Charter {
    purpose: String!
    goals: [String!]!
    successCriteria: [String!]!
    constraints: String
    scope: Scope!
    team: [String!]
    workMode: String!
    status: String!
    lastUpdated: String!
    confidence: Float
  }

  """
  Scope boundaries
  """
  type Scope {
    inScope: [String!]!
    outOfScope: [String!]!
    tbd: [String!]!
  }

  """
  Team activity event
  """
  type TeamEvent {
    id: ID!
    category: String!
    description: String!
    impact: String
    user: String!
    timestamp: String!
    branch: String
    shared: Boolean
  }

  """
  Pattern or gotcha from context modules
  """
  type Pattern {
    id: ID!
    title: String!
    content: String!
    type: String!
    tags: [String!]
    category: String
    createdAt: String!
  }

  """
  Strategic context response
  """
  type StrategicContext {
    charter: Charter
    teamActivity: [TeamEvent!]!
    patterns: [Pattern!]!
    metadata: StrategicContextMetadata!
  }

  """
  Metadata about strategic context loading
  """
  type StrategicContextMetadata {
    charterStatus: String!
    teamEventCount: Int!
    patternCount: Int!
    loadTimeMs: Int!
    tokenEstimate: Int!
  }

  # ============================================================================
  # Session Start Types (EPIC-018 Sprint 1 TASK-08)
  # Single GraphQL query to replace 4-5 sequential REST calls for ginko start
  # ============================================================================

  """
  Task status enumeration
  """
  enum TaskStatus {
    not_started
    in_progress
    complete
    blocked
    todo
  }

  """
  Sprint status enumeration
  """
  enum SprintStatus {
    not_started
    active
    complete
    blocked
  }

  """
  Pattern reference for task enrichment
  """
  type TaskPattern {
    id: ID!
    title: String!
    confidence: String!
    confidenceScore: Int
    category: String
  }

  """
  Gotcha reference for task enrichment
  """
  type TaskGotcha {
    id: ID!
    title: String!
    severity: String!
    confidenceScore: Int
  }

  """
  ADR constraint reference for task enrichment
  """
  type TaskConstraint {
    id: ID!
    title: String!
    status: String
  }

  """
  Enriched task with patterns, gotchas, and constraints
  """
  type EnrichedTask {
    id: ID!
    title: String!
    status: String!
    blocked_reason: String
    assignee: String
    patterns: [TaskPattern!]!
    gotchas: [TaskGotcha!]!
    constraints: [TaskConstraint!]!
  }

  """
  Sprint progress tracking
  """
  type SprintProgress {
    complete: Int!
    total: Int!
    percent: Int!
  }

  """
  Next task indicator for session continuity
  """
  type NextTask {
    id: ID!
    title: String!
    continue: Boolean!
  }

  """
  Blocked task with reason
  """
  type BlockedTask {
    id: ID!
    title: String!
    reason: String!
  }

  """
  Active sprint with full task list and enriched current task
  """
  type ActiveSprint {
    id: ID!
    name: String!
    epic_id: String!
    status: String!
    progress: SprintProgress!
    currentTask: EnrichedTask
    nextTask: NextTask
    tasks: [EnrichedTask!]!
    blocked_tasks: [BlockedTask!]!
  }

  """
  Recent event from session history
  """
  type RecentEvent {
    id: ID!
    category: String!
    description: String!
    timestamp: String!
    files: [String!]
    impact: String
    branch: String
  }

  """
  Minimal charter info for session context
  """
  type CharterSummary {
    purpose: String!
    goals: [String!]!
  }

  """
  Team activity summary
  """
  type TeamActivitySummary {
    category: String!
    description: String!
    user: String!
    timestamp: String!
  }

  """
  Epic info for display
  """
  type EpicInfo {
    id: ID!
    title: String
    roadmap_lane: String
    roadmap_status: String
  }

  """
  Session start response - all context needed for ginko start in one query
  """
  type SessionStartResponse {
    activeSprint: ActiveSprint
    recentEvents: [RecentEvent!]!
    charter: CharterSummary
    teamActivity: [TeamActivitySummary!]!
    epic: EpicInfo
    metadata: SessionStartMetadata!
  }

  """
  Metadata about session start query execution
  """
  type SessionStartMetadata {
    loadTimeMs: Int!
    sprintFound: Boolean!
    taskCount: Int!
    eventCount: Int!
    tokenEstimate: Int!
  }
`;
