/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-07
 * @tags: [test, integration, rest-api, knowledge, nodes]
 * @related: [../nodes/route.ts, ../nodes/[id]/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests for Knowledge Nodes REST API
 *
 * Tests all CRUD endpoints:
 * - POST /api/v1/knowledge/nodes - Create node
 * - GET /api/v1/knowledge/nodes - List nodes
 * - GET /api/v1/knowledge/nodes/[id] - Get single node
 * - PUT /api/v1/knowledge/nodes/[id] - Update node
 * - DELETE /api/v1/knowledge/nodes/[id] - Delete node
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../../nodes/route';
import { GET as GetById, PUT, DELETE } from '../../nodes/[id]/route';
import { CloudGraphClient } from '../../../graph/_cloud-graph-client';

// Mock CloudGraphClient
jest.mock('../../../graph/_cloud-graph-client');

describe('Knowledge Nodes REST API - Integration Tests', () => {
  const mockToken = 'test-bearer-token';
  const mockGraphId = 'test-graph-id';
  const mockNodeId = 'test-node-123';

  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock client
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
  });

  describe('POST /api/v1/knowledge/nodes - Create Node', () => {
    it('should create a new ADR node successfully', async () => {
      const mockNodeData = {
        type: 'ADR',
        graphId: mockGraphId,
        data: {
          title: 'ADR-001: Use GraphQL',
          content: 'We will use GraphQL for the API',
          status: 'active',
          tags: ['graphql', 'api'],
        },
      };

      mockClient.createNode.mockResolvedValue(mockNodeId);
      mockClient.getNode.mockResolvedValue({
        id: mockNodeId,
        ...mockNodeData.data,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockNodeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.node.id).toBe(mockNodeId);
      expect(data.node.type).toBe('ADR');
      expect(mockClient.createNode).toHaveBeenCalledWith(
        'ADR',
        expect.objectContaining({
          title: 'ADR-001: Use GraphQL',
          content: 'We will use GraphQL for the API',
          status: 'active',
          projectId: mockGraphId,
        })
      );
    });

    it('should create node with relationships', async () => {
      const mockNodeData = {
        type: 'ADR',
        graphId: mockGraphId,
        data: {
          title: 'ADR-002',
          content: 'Implementation decision',
        },
        relationships: [
          { type: 'IMPLEMENTS', targetId: 'prd-123' },
          { type: 'REFERENCES', targetId: 'adr-001' },
        ],
      };

      mockClient.createNode.mockResolvedValue(mockNodeId);
      mockClient.getNode.mockResolvedValue({
        id: mockNodeId,
        ...mockNodeData.data,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockNodeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockClient.createRelationship).toHaveBeenCalledTimes(2);
      expect(mockClient.createRelationship).toHaveBeenCalledWith(
        mockNodeId,
        'prd-123',
        expect.objectContaining({ type: 'IMPLEMENTS' })
      );
    });

    it('should return 401 without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify({ type: 'ADR', graphId: mockGraphId, data: { content: 'test' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authorization');
    });

    it('should return 400 for invalid node type', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'INVALID_TYPE',
          graphId: mockGraphId,
          data: { content: 'test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid node type');
      expect(data.validTypes).toContain('ADR');
    });

    it('should return 400 for missing graphId', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          data: { content: 'test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });

    it('should return 400 for missing content in data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          graphId: mockGraphId,
          data: { title: 'No content' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
    });

    it('should return 400 for invalid relationship type', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          graphId: mockGraphId,
          data: { content: 'test' },
          relationships: [{ type: 'INVALID_REL', targetId: 'node-123' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid relationship type');
    });
  });

  describe('GET /api/v1/knowledge/nodes - List Nodes', () => {
    it('should list all nodes with default filters', async () => {
      const mockNodes = [
        { id: '1', type: 'ADR', title: 'ADR-001', status: 'active' },
        { id: '2', type: 'PRD', title: 'PRD-001', status: 'active' },
      ];

      mockClient.queryNodes.mockResolvedValue({
        nodes: mockNodes,
        executionTime: 10,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nodes).toHaveLength(2);
      expect(data.totalCount).toBe(2);
      expect(data.filters.graphId).toBe(mockGraphId);
      expect(mockClient.queryNodes).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
    });

    it('should filter nodes by type', async () => {
      mockClient.queryNodes.mockResolvedValue({
        nodes: [{ id: '1', type: 'ADR', title: 'ADR-001' }],
        executionTime: 5,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);
      url.searchParams.set('type', 'ADR');

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.type).toBe('ADR');
      expect(mockClient.queryNodes).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['ADR'],
        })
      );
    });

    it('should filter nodes by status', async () => {
      mockClient.queryNodes.mockResolvedValue({
        nodes: [{ id: '1', status: 'active' }],
        executionTime: 5,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);
      url.searchParams.set('status', 'active');

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockClient.queryNodes).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { status: 'active' },
        })
      );
    });

    it('should filter nodes by tags', async () => {
      mockClient.queryNodes.mockResolvedValue({
        nodes: [
          { id: '1', tags: ['api', 'graphql'] },
          { id: '2', tags: ['rest', 'api'] },
        ],
        executionTime: 5,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);
      url.searchParams.set('tags', 'api,graphql');

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nodes).toHaveLength(2); // Both have 'api' tag
    });

    it('should handle pagination', async () => {
      mockClient.queryNodes.mockResolvedValue({
        nodes: Array(10).fill({ id: '1' }),
        executionTime: 5,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);
      url.searchParams.set('limit', '10');
      url.searchParams.set('offset', '20');

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockClient.queryNodes).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });

    it('should cap limit at 100', async () => {
      mockClient.queryNodes.mockResolvedValue({
        nodes: [],
        executionTime: 5,
      });

      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);
      url.searchParams.set('limit', '500'); // Try to request 500

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);

      expect(mockClient.queryNodes).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Should be capped
        })
      );
    });

    it('should return 401 without authorization', async () => {
      const url = new URL('http://localhost:3000/api/v1/knowledge/nodes');
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 without graphId', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });
  });

  describe('GET /api/v1/knowledge/nodes/[id] - Get Node By ID', () => {
    it('should get node by ID successfully', async () => {
      const mockNode = {
        id: mockNodeId,
        type: 'ADR',
        title: 'ADR-001',
        content: 'Test content',
      };

      const mockRelationships = [
        { type: 'IMPLEMENTS', targetId: 'prd-123', properties: {} },
      ];

      mockClient.getNode.mockResolvedValue(mockNode);
      mockClient.getRelationships.mockResolvedValue(mockRelationships);

      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GetById(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.node.id).toBe(mockNodeId);
      expect(data.relationships).toHaveLength(1);
      expect(mockClient.getNode).toHaveBeenCalledWith(mockNodeId);
    });

    it('should return 404 for non-existent node', async () => {
      mockClient.getNode.mockResolvedValue(null);

      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await GetById(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 401 without authorization', async () => {
      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'GET' });
      const response = await GetById(request, { params: { id: mockNodeId } });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/knowledge/nodes/[id] - Update Node', () => {
    it('should update node successfully', async () => {
      const updateData = {
        graphId: mockGraphId,
        data: {
          title: 'Updated Title',
          content: 'Updated content',
          status: 'deprecated',
        },
      };

      const existingNode = { id: mockNodeId, title: 'Old Title' };
      const updatedNode = { id: mockNodeId, ...updateData.data };

      mockClient.getNode.mockResolvedValueOnce(existingNode);
      mockClient.getNode.mockResolvedValueOnce(updatedNode);

      const request = new NextRequest(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.node.title).toBe('Updated Title');
      expect(mockClient.updateNode).toHaveBeenCalledWith(mockNodeId, updateData.data);
    });

    it('should return 404 for non-existent node', async () => {
      mockClient.getNode.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          graphId: mockGraphId,
          data: { title: 'Updated' },
        }),
      });

      const response = await PUT(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 400 for missing graphId', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          data: { title: 'Updated' },
        }),
      });

      const response = await PUT(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });

    it('should return 400 for empty data', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          graphId: mockGraphId,
          data: {},
        }),
      });

      const response = await PUT(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('data');
    });
  });

  describe('DELETE /api/v1/knowledge/nodes/[id] - Delete Node', () => {
    it('should delete node successfully', async () => {
      mockClient.getNode.mockResolvedValue({ id: mockNodeId });

      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedNodeId).toBe(mockNodeId);
      expect(mockClient.deleteNode).toHaveBeenCalledWith(mockNodeId);
    });

    it('should return 404 for non-existent node', async () => {
      mockClient.getNode.mockResolvedValue(null);

      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 401 without authorization', async () => {
      const url = new URL(`http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`);
      url.searchParams.set('graphId', mockGraphId);

      const request = new NextRequest(url, { method: 'DELETE' });
      const response = await DELETE(request, { params: { id: mockNodeId } });

      expect(response.status).toBe(401);
    });

    it('should return 400 without graphId', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/knowledge/nodes/${mockNodeId}`,
        {
          method: 'DELETE',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await DELETE(request, { params: { id: mockNodeId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('graphId');
    });
  });

  describe('Error Handling', () => {
    it('should handle CloudGraphClient access errors', async () => {
      (CloudGraphClient.fromBearerToken as jest.Mock).mockRejectedValue(
        new Error('User does not have access to graph')
      );

      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          graphId: mockGraphId,
          data: { content: 'test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });

    it('should handle invalid bearer token', async () => {
      (CloudGraphClient.fromBearerToken as jest.Mock).mockRejectedValue(
        new Error('Invalid bearer token')
      );

      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer invalid-token`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          graphId: mockGraphId,
          data: { content: 'test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid bearer token');
    });

    it('should handle generic errors', async () => {
      mockClient.createNode.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/knowledge/nodes', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ADR',
          graphId: mockGraphId,
          data: { content: 'test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create knowledge node');
    });
  });
});
