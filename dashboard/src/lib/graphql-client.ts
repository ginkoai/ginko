/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [graphql, client, api, task-027]
 * @related: [api/graphql/route.ts, discover pages]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * GraphQL Client Utility for Public Discovery Pages
 * TASK-027: Public Discovery Catalog
 *
 * Provides a simple GraphQL client for querying the knowledge graph API
 * Used by discover pages to fetch public knowledge graph data
 */

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class GraphQLClient {
  private endpoint: string;
  private token: string;

  constructor(endpoint: string = '/api/graphql', token?: string) {
    this.endpoint = endpoint;
    this.token = token || '';
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data;
  }
}

// Helper function to create client with auth token
export function createGraphQLClient(token?: string): GraphQLClient {
  return new GraphQLClient('/api/graphql', token);
}

// Type definitions for common queries
export interface KnowledgeNode {
  id: string;
  type: 'ADR' | 'PRD' | 'ContextModule' | 'Session' | 'CodeFile';
  title?: string;
  content: string;
  status: 'active' | 'archived' | 'draft';
  tags?: string[];
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  node: KnowledgeNode;
  score: number;
  relationshipType: 'HIGHLY_RELATED_TO' | 'RELATED_TO' | 'LOOSELY_RELATED_TO' | 'DUPLICATE_OF';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  githubRepo?: string;
  isPublic: boolean;
  isDiscoverable: boolean;
  knowledgeCount?: number;
  tags?: string[];
  updatedAt: string;
}

export interface NodeGraph {
  centerNode: KnowledgeNode;
  connectedNodes: KnowledgeNode[];
  relationships: Array<{
    type: string;
    fromId: string;
    toId: string;
    properties?: Record<string, any>;
  }>;
  depth: number;
}

// Common GraphQL queries
export const QUERIES = {
  SEARCH: `
    query Search($query: String!, $graphId: String!, $limit: Int, $minScore: Float, $type: NodeType) {
      search(query: $query, graphId: $graphId, limit: $limit, minScore: $minScore, type: $type) {
        node {
          id
          type
          title
          content
          status
          tags
          projectId
          createdAt
          updatedAt
        }
        score
        relationshipType
      }
    }
  `,

  NODES_BY_TAG: `
    query NodesByTag($tags: [String!]!, $graphId: String!, $type: NodeType, $limit: Int) {
      nodesByTag(tags: $tags, graphId: $graphId, type: $type, limit: $limit) {
        id
        type
        title
        content
        status
        tags
        projectId
        createdAt
        updatedAt
      }
    }
  `,

  NODE_GRAPH: `
    query NodeGraph($nodeId: ID!, $graphId: String!, $depth: Int) {
      nodeGraph(nodeId: $nodeId, graphId: $graphId, depth: $depth) {
        centerNode {
          id
          type
          title
          content
          status
          tags
        }
        connectedNodes {
          id
          type
          title
          status
          tags
        }
        relationships {
          type
          fromId
          toId
        }
        depth
      }
    }
  `,

  NODES: `
    query Nodes($graphId: String!, $type: NodeType, $status: NodeStatus, $tags: [String!], $limit: Int, $offset: Int) {
      nodes(graphId: $graphId, type: $type, status: $status, tags: $tags, limit: $limit, offset: $offset) {
        nodes {
          id
          type
          title
          content
          status
          tags
          projectId
          createdAt
          updatedAt
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          totalCount
        }
      }
    }
  `,
};
