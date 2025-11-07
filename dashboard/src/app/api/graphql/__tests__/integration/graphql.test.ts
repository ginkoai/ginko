/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-07
 * @tags: [test, integration, graphql, knowledge]
 * @related: [../route.ts, ../schema.ts, ../resolvers.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, graphql-yoga]
 */

/**
 * Integration Tests for Knowledge Graph GraphQL API
 *
 * Tests all GraphQL queries (read-only):
 * - search: Semantic search
 * - nodesByTag: Find nodes by tags
 * - nodeGraph: Get node with relationship graph
 * - node: Get single node by ID
 * - nodes: List nodes
 * - contextualNodes: Context-aware queries
 * - adrsByPrd: Find ADRs implementing a PRD
 * - implementationProgress: Track implementation progress
 *
 * Note: Write operations (create, update, delete) use REST API
 * See: dashboard/src/app/api/v1/knowledge/__tests__/integration/nodes.test.ts
 */

import { NextRequest } from 'next/server';
import { POST } from '../../route';
import { CloudGraphClient } from '../../../v1/graph/_cloud-graph-client';
import { runQuery } from '../../../v1/graph/_neo4j';
import { getVoyageClient } from '@/lib/embeddings/voyage-client';

// Mock dependencies
jest.mock('../../../v1/graph/_cloud-graph-client');
jest.mock('../../../v1/graph/_neo4j');
jest.mock('@/lib/embeddings/voyage-client');

describe('Knowledge Graph GraphQL API - Integration Tests', () => {
  const mockToken = 'test-bearer-token';
  const mockGraphId = 'test-graph-id';
  const mockNodeId = 'test-node-123';

  let mockClient: any;
  let mockVoyageClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CloudGraphClient
    mockClient = {
      createNode: jest.fn(),
      getNode: jest.fn(),
      updateNode: jest.fn(),
      deleteNode: jest.fn(),
      queryNodes: jest.fn(),
      getRelationships: jest.fn(),
      createRelationship: jest.fn(),
    };
    (CloudGraphClient.fromBearerToken as jest.Mock).mockResolvedValue(mockClient);

    // Mock Voyage AI client
    mockVoyageClient = {
      embed: jest.fn(),
    };
    (getVoyageClient as jest.Mock).mockReturnValue(mockVoyageClient);
  });

  const executeGraphQL = async (query: string, variables?: Record<string, any>) => {
    const request = new NextRequest('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    return POST(request);
  };

  describe('Queries', () => {
    describe('search - Semantic Search', () => {
      it('should perform semantic search successfully', async () => {
        const mockEmbedding = new Array(1024).fill(0.1);
        mockVoyageClient.embed.mockResolvedValue([mockEmbedding]);

        const mockResults = [
          {
            node: {
              properties: {
                id: '1',
                type: 'ADR',
                title: 'Use GraphQL',
                content: 'We will use GraphQL',
                status: 'active',
              },
            },
            score: 0.95,
          },
        ];
        (runQuery as jest.Mock).mockResolvedValue(mockResults);

        const query = `
          query Search($query: String!, $graphId: String!) {
            search(query: $query, graphId: $graphId, limit: 5) {
              node {
                id
                title
                type
              }
              score
              relationshipType
            }
          }
        `;

        const response = await executeGraphQL(query, {
          query: 'authentication patterns',
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.search).toHaveLength(1);
        expect(data.data.search[0].node.id).toBe('1');
        expect(data.data.search[0].score).toBe(0.95);
        expect(data.data.search[0].relationshipType).toBe('DUPLICATE_OF'); // score >= 0.95
      });

      it('should filter search by node type', async () => {
        mockVoyageClient.embed.mockResolvedValue([[0.1]]);
        (runQuery as jest.Mock).mockResolvedValue([]);

        const query = `
          query Search($query: String!, $graphId: String!, $type: NodeType) {
            search(query: $query, graphId: $graphId, type: $type) {
              node { id }
              score
            }
          }
        `;

        await executeGraphQL(query, {
          query: 'test',
          graphId: mockGraphId,
          type: 'ADR',
        });

        expect(runQuery).toHaveBeenCalled();
        const cypherQuery = (runQuery as jest.Mock).mock.calls[0][0];
        expect(cypherQuery).toContain('AND node:ADR');
      });
    });

    describe('nodesByTag - Find Nodes by Tags', () => {
      it('should find nodes by tags successfully', async () => {
        const mockNodes = [
          { id: '1', tags: ['api', 'graphql'], title: 'Node 1' },
          { id: '2', tags: ['rest', 'api'], title: 'Node 2' },
        ];

        mockClient.queryNodes.mockResolvedValue({
          nodes: mockNodes,
        });

        const query = `
          query NodesByTag($tags: [String!]!, $graphId: String!) {
            nodesByTag(tags: $tags, graphId: $graphId) {
              id
              title
              tags
            }
          }
        `;

        const response = await executeGraphQL(query, {
          tags: ['api'],
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.nodesByTag).toHaveLength(2);
      });

      it('should filter nodes by type and status', async () => {
        mockClient.queryNodes.mockResolvedValue({ nodes: [] });

        const query = `
          query NodesByTag($tags: [String!]!, $graphId: String!, $type: NodeType, $status: NodeStatus) {
            nodesByTag(tags: $tags, graphId: $graphId, type: $type, status: $status) {
              id
            }
          }
        `;

        await executeGraphQL(query, {
          tags: ['test'],
          graphId: mockGraphId,
          type: 'ADR',
          status: 'active',
        });

        expect(mockClient.queryNodes).toHaveBeenCalledWith(
          expect.objectContaining({
            labels: ['ADR'],
            properties: { status: 'active' },
          })
        );
      });
    });

    describe('nodeGraph - Get Node Relationship Graph', () => {
      it('should get node graph successfully', async () => {
        // Mock center node
        mockClient.getNode.mockResolvedValue({
          id: mockNodeId,
          title: 'Center Node',
        });

        // Mock connected nodes query
        const mockGraphData = [
          {
            connected: { id: 'connected-1', title: 'Connected 1' },
            pathRels: [
              {
                type: 'IMPLEMENTS',
                fromId: mockNodeId,
                toId: 'connected-1',
                properties: {},
              },
            ],
          },
        ];

        (runQuery as jest.Mock).mockResolvedValue(mockGraphData);

        const query = `
          query NodeGraph($nodeId: ID!, $graphId: String!, $depth: Int) {
            nodeGraph(nodeId: $nodeId, graphId: $graphId, depth: $depth) {
              centerNode {
                id
                title
              }
              connectedNodes {
                id
                title
              }
              relationships {
                type
                fromId
                toId
              }
              depth
            }
          }
        `;

        const response = await executeGraphQL(query, {
          nodeId: mockNodeId,
          graphId: mockGraphId,
          depth: 2,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.nodeGraph.centerNode.id).toBe(mockNodeId);
        expect(data.data.nodeGraph.connectedNodes).toHaveLength(1);
        expect(data.data.nodeGraph.depth).toBe(2);
      });

      it('should handle non-existent node', async () => {
        mockClient.getNode.mockResolvedValue(null);

        const query = `
          query NodeGraph($nodeId: ID!, $graphId: String!) {
            nodeGraph(nodeId: $nodeId, graphId: $graphId) {
              centerNode { id }
            }
          }
        `;

        const response = await executeGraphQL(query, {
          nodeId: 'non-existent',
          graphId: mockGraphId,
        });

        const data = await response.json();
        // Resolver throws error when node not found
        expect(data.errors).toBeDefined();
        expect(data.errors[0].message).toContain('not found');
      });
    });

    describe('node - Get Single Node', () => {
      it('should get single node by ID', async () => {
        const mockNode = {
          id: mockNodeId,
          type: 'ADR',
          title: 'Test Node',
          content: 'Test content',
          status: 'active',
        };

        mockClient.getNode.mockResolvedValue(mockNode);

        const query = `
          query Node($id: ID!, $graphId: String!) {
            node(id: $id, graphId: $graphId) {
              id
              type
              title
              content
              status
            }
          }
        `;

        const response = await executeGraphQL(query, {
          id: mockNodeId,
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.node.id).toBe(mockNodeId);
        expect(data.data.node.title).toBe('Test Node');
      });

      it('should return null for non-existent node', async () => {
        mockClient.getNode.mockResolvedValue(null);

        const query = `
          query Node($id: ID!, $graphId: String!) {
            node(id: $id, graphId: $graphId) {
              id
            }
          }
        `;

        const response = await executeGraphQL(query, {
          id: 'non-existent',
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(data.data.node).toBeNull();
      });
    });

    describe('nodes - List Nodes', () => {
      it('should list nodes with pagination', async () => {
        const mockNodes = [
          { id: '1', title: 'Node 1', type: 'ADR' },
          { id: '2', title: 'Node 2', type: 'PRD' },
        ];

        mockClient.queryNodes.mockResolvedValue({
          nodes: mockNodes,
          totalCount: 2,
        });

        const query = `
          query Nodes($graphId: String!, $limit: Int, $offset: Int) {
            nodes(graphId: $graphId, limit: $limit, offset: $offset) {
              nodes {
                id
                title
                type
              }
              pageInfo {
                totalCount
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `;

        const response = await executeGraphQL(query, {
          graphId: mockGraphId,
          limit: 10,
          offset: 0,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.nodes.nodes).toHaveLength(2);
        expect(data.data.nodes.pageInfo.totalCount).toBe(2);
      });
    });

    describe('contextualNodes - Context-Aware Queries', () => {
      it('should get contextual nodes successfully', async () => {
        mockClient.queryNodes.mockResolvedValue({
          nodes: [{ id: '1', title: 'Contextual Node' }],
        });

        const query = `
          query ContextualNodes($graphId: String!, $context: ContextFilters!) {
            contextualNodes(graphId: $graphId, context: $context, limit: 20) {
              id
              title
            }
          }
        `;

        const response = await executeGraphQL(query, {
          graphId: mockGraphId,
          context: {
            projectId: 'my-project',
            branch: 'main',
          },
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.contextualNodes).toBeDefined();
      });
    });

    describe('adrsByPrd - Find ADRs by PRD', () => {
      it('should find ADRs implementing a PRD', async () => {
        const mockADRs = [
          {
            adr: { id: 'adr-1', title: 'ADR 1', type: 'ADR', content: 'Content' },
          },
        ];

        (runQuery as jest.Mock).mockResolvedValue(mockADRs);

        const query = `
          query AdrsByPrd($prdId: ID!, $graphId: String!) {
            adrsByPrd(prdId: $prdId, graphId: $graphId) {
              id
              title
            }
          }
        `;

        const response = await executeGraphQL(query, {
          prdId: 'prd-123',
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.adrsByPrd).toHaveLength(1);
        expect(data.data.adrsByPrd[0].id).toBe('adr-1');
      });
    });

    describe('implementationProgress - Track Progress', () => {
      it('should track implementation progress', async () => {
        // Mock stats query
        const mockStatsData = [{ totalPRDs: 10, implementedPRDs: 7, inProgressPRDs: 2 }];
        const mockADRData = [{ totalADRs: 15 }];
        const mockRecentData = [
          { adr: { id: 'adr-1', title: 'Recent ADR', type: 'ADR', content: 'Content' } },
        ];

        // Mock multiple runQuery calls in sequence
        (runQuery as jest.Mock)
          .mockResolvedValueOnce(mockStatsData)
          .mockResolvedValueOnce(mockADRData)
          .mockResolvedValueOnce(mockRecentData);

        const query = `
          query Progress($projectId: String!, $graphId: String!) {
            implementationProgress(projectId: $projectId, graphId: $graphId) {
              totalPRDs
              implementedPRDs
              inProgressPRDs
              totalADRs
              completionPercentage
              recentDecisions {
                id
                title
              }
            }
          }
        `;

        const response = await executeGraphQL(query, {
          projectId: 'my-project',
          graphId: mockGraphId,
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data.implementationProgress).toBeDefined();
        expect(data.data.implementationProgress.totalPRDs).toBe(10);
        expect(data.data.implementationProgress.completionPercentage).toBeCloseTo(70, 0);
      });
    });
  });

  // NOTE: Mutations removed from GraphQL API
  // Write operations use REST API (/api/v1/knowledge/nodes)
  // GraphQL is read-only for complex queries and graph traversal

  describe('Error Handling', () => {
    it('should handle missing authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ node(id: "1", graphId: "test") { id } }',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errors).toBeDefined();
      expect(data.errors[0].message).toContain('authorization');
    });

    it('should handle GraphQL syntax errors', async () => {
      const query = '{ invalidQuery {';

      const response = await executeGraphQL(query);
      const data = await response.json();

      expect(data.errors).toBeDefined();
    });

    it('should handle CloudGraphClient errors', async () => {
      (CloudGraphClient.fromBearerToken as jest.Mock).mockRejectedValue(
        new Error('Unauthorized access')
      );

      const query = `
        query Node($id: ID!, $graphId: String!) {
          node(id: $id, graphId: $graphId) {
            id
          }
        }
      `;

      const response = await executeGraphQL(query, {
        id: mockNodeId,
        graphId: mockGraphId,
      });

      const data = await response.json();
      expect(data.errors).toBeDefined();
    });
  });
});
