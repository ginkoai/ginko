/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [graphql, schema, knowledge, task-024]
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
`;
