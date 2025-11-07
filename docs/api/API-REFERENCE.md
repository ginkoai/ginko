/**
 * @fileType: api-reference
 * @status: current
 * @updated: 2025-11-07
 * @tags: [documentation, api, rest, graphql, reference]
 * @related: [KNOWLEDGE-API.md, USER-GUIDE.md, CLI-REFERENCE.md]
 * @priority: critical
 * @complexity: high
 */

# Ginko API Reference

Complete reference for Ginko's REST and GraphQL APIs. This document covers authentication, endpoints, request/response formats, and code examples.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST API](#rest-api)
4. [GraphQL API](#graphql-api)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Code Examples](#code-examples)
8. [Webhooks](#webhooks)

---

## Overview

### Base URLs

- **Production:** `https://app.ginkoai.com`
- **GraphQL Endpoint:** `https://app.ginkoai.com/api/graphql`
- **GraphiQL (Dev):** `http://localhost:3000/api/graphql`

### API Design Principles

- **RESTful** - Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON** - All requests and responses use JSON
- **Stateless** - Bearer token authentication
- **Versioned** - API version in path (`/api/v1/...`)
- **Consistent** - Standard response formats and error codes

---

## Authentication

All API requests require authentication via Bearer token.

### Getting an API Key

**Method 1: CLI (Recommended)**
```bash
ginko login
# API key stored at ~/.ginko/auth.json
```

**Method 2: Dashboard**
1. Login at https://app.ginkoai.com/dashboard
2. Navigate to Settings → API Keys
3. Click "Generate New Key"
4. Copy the key (starts with `gk_`)

### Using API Keys

**HTTP Header:**
```http
Authorization: Bearer gk_abc123...
```

**cURL:**
```bash
curl https://app.ginkoai.com/api/v1/knowledge/nodes \
  -H "Authorization: Bearer $GINKO_API_KEY"
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch('https://app.ginkoai.com/api/v1/knowledge/nodes', {
  headers: {
    'Authorization': `Bearer ${process.env.GINKO_API_KEY}`,
    'Content-Type': 'application/json',
  },
});
```

**Python:**
```python
import os
import requests

headers = {
    'Authorization': f'Bearer {os.getenv("GINKO_API_KEY")}',
    'Content-Type': 'application/json',
}

response = requests.get(
    'https://app.ginkoai.com/api/v1/knowledge/nodes',
    headers=headers
)
```

### API Key Security

**Best Practices:**
- ✅ Store in environment variables
- ✅ Never commit to version control
- ✅ Rotate keys periodically
- ✅ Use separate keys for dev/prod
- ❌ Don't hardcode in source code
- ❌ Don't share keys publicly
- ❌ Don't log keys in application logs

**Environment Variables:**
```bash
# .env file (never commit!)
GINKO_API_KEY=gk_abc123...

# Load in application
export GINKO_API_KEY=gk_abc123...
```

---

## REST API

### Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/knowledge/nodes` | GET | List/filter knowledge nodes |
| `/api/v1/knowledge/nodes` | POST | Create knowledge node |
| `/api/v1/knowledge/nodes/[id]` | GET | Get node by ID |
| `/api/v1/knowledge/nodes/[id]` | PUT | Update node |
| `/api/v1/knowledge/nodes/[id]` | DELETE | Delete node |
| `/api/v1/projects` | GET | List projects |
| `/api/v1/projects` | POST | Create project |
| `/api/v1/projects/[id]` | GET | Get project details |
| `/api/v1/projects/[id]` | PUT | Update project |
| `/api/v1/projects/[id]` | DELETE | Delete project |
| `/api/v1/teams` | GET | List teams |
| `/api/v1/teams` | POST | Create team |

---

### Knowledge Nodes

#### Create Node

**POST** `/api/v1/knowledge/nodes`

Create a new knowledge node with optional relationships.

**Request Body:**
```json
{
  "type": "ADR",
  "graphId": "graph_123",
  "data": {
    "title": "Use GraphQL for Knowledge API",
    "content": "We will use GraphQL Yoga for the knowledge graph API because it provides excellent TypeScript support and integrates seamlessly with Next.js App Router. This enables efficient graph traversal queries and reduces over-fetching.",
    "status": "active",
    "tags": ["architecture", "api", "graphql"]
  },
  "relationships": [
    {
      "type": "IMPLEMENTS",
      "targetId": "prd_456"
    }
  ]
}
```

**Parameters:**
- `type` (string, required) - Node type: `ADR`, `PRD`, `ContextModule`, `Session`, `CodeFile`
- `graphId` (string, required) - Graph/project ID
- `data` (object, required) - Node data
  - `title` (string, required) - Node title
  - `content` (string, required) - Full content (markdown supported)
  - `status` (string, optional) - Status: `draft`, `active`, `archived` (default: `active`)
  - `tags` (array, optional) - Array of tag strings
- `relationships` (array, optional) - Array of relationship objects
  - `type` (string) - Relationship type: `IMPLEMENTS`, `REFERENCES`, `TAGGED_WITH`
  - `targetId` (string) - Target node ID

**Response (201 Created):**
```json
{
  "success": true,
  "node": {
    "id": "adr_789",
    "type": "ADR",
    "title": "Use GraphQL for Knowledge API",
    "content": "We will use GraphQL Yoga...",
    "status": "active",
    "tags": ["architecture", "api", "graphql"],
    "projectId": "graph_123",
    "createdAt": "2025-11-07T19:00:00Z",
    "updatedAt": "2025-11-07T19:00:00Z",
    "createdBy": "user_abc123",
    "embedding": [0.123, 0.456, ...]  // 1024-dimensional vector
  },
  "relationships": [
    {
      "type": "IMPLEMENTS",
      "fromId": "adr_789",
      "toId": "prd_456",
      "properties": {}
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid node type, missing required fields
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - No write access to graph
- `404 Not Found` - Graph not found
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST https://app.ginkoai.com/api/v1/knowledge/nodes \
  -H "Authorization: Bearer $GINKO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ADR",
    "graphId": "graph_123",
    "data": {
      "title": "Use PostgreSQL for Primary Database",
      "content": "We chose PostgreSQL...",
      "status": "active",
      "tags": ["database", "architecture"]
    }
  }'
```

#### List Nodes

**GET** `/api/v1/knowledge/nodes`

List and filter knowledge nodes.

**Query Parameters:**
- `graphId` (string, required) - Graph/project ID
- `type` (string, optional) - Filter by node type
- `status` (string, optional) - Filter by status (default: `active`)
- `tags` (string, optional) - Comma-separated tags
- `limit` (number, optional) - Max results (default: 50, max: 100)
- `offset` (number, optional) - Pagination offset (default: 0)
- `search` (string, optional) - Text search in title/content
- `createdAfter` (string, optional) - ISO timestamp
- `createdBefore` (string, optional) - ISO timestamp

**Response (200 OK):**
```json
{
  "nodes": [
    {
      "id": "adr_789",
      "type": "ADR",
      "title": "Use GraphQL for Knowledge API",
      "content": "...",
      "status": "active",
      "tags": ["architecture", "api"],
      "createdAt": "2025-11-07T19:00:00Z",
      "updatedAt": "2025-11-07T19:00:00Z"
    }
  ],
  "totalCount": 127,
  "filters": {
    "graphId": "graph_123",
    "type": "ADR",
    "status": "active",
    "tags": ["architecture"],
    "limit": 50,
    "offset": 0
  },
  "executionTime": 45
}
```

**Example:**
```bash
curl "https://app.ginkoai.com/api/v1/knowledge/nodes?graphId=graph_123&type=ADR&status=active&tags=database&limit=10" \
  -H "Authorization: Bearer $GINKO_API_KEY"
```

#### Get Node by ID

**GET** `/api/v1/knowledge/nodes/[id]`

Get a single node with relationships.

**Query Parameters:**
- `graphId` (string, required) - Graph/project ID

**Response (200 OK):**
```json
{
  "node": {
    "id": "adr_789",
    "type": "ADR",
    "title": "Use GraphQL for Knowledge API",
    "content": "...",
    "status": "active",
    "tags": ["architecture", "api"],
    "createdAt": "2025-11-07T19:00:00Z",
    "updatedAt": "2025-11-07T19:00:00Z",
    "createdBy": "user_abc123"
  },
  "relationships": [
    {
      "type": "IMPLEMENTS",
      "targetId": "prd_456",
      "targetTitle": "Cloud Knowledge Platform",
      "targetType": "PRD",
      "properties": {}
    },
    {
      "type": "REFERENCES",
      "targetId": "adr_123",
      "targetTitle": "Graph Database Evaluation",
      "targetType": "ADR",
      "properties": {}
    }
  ]
}
```

**Example:**
```bash
curl "https://app.ginkoai.com/api/v1/knowledge/nodes/adr_789?graphId=graph_123" \
  -H "Authorization: Bearer $GINKO_API_KEY"
```

#### Update Node

**PUT** `/api/v1/knowledge/nodes/[id]`

Update node data. Only specified fields are updated (partial update).

**Request Body:**
```json
{
  "graphId": "graph_123",
  "data": {
    "title": "Updated Title",
    "status": "archived",
    "tags": ["new-tag"]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "node": {
    "id": "adr_789",
    "title": "Updated Title",
    "status": "archived",
    "tags": ["new-tag"],
    "updatedAt": "2025-11-07T20:00:00Z"
  }
}
```

**Example:**
```bash
curl -X PUT https://app.ginkoai.com/api/v1/knowledge/nodes/adr_789 \
  -H "Authorization: Bearer $GINKO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "graph_123",
    "data": {
      "status": "deprecated"
    }
  }'
```

#### Delete Node

**DELETE** `/api/v1/knowledge/nodes/[id]`

Delete node and all its relationships (DETACH DELETE).

**Query Parameters:**
- `graphId` (string, required) - Graph/project ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Node deleted successfully",
  "deletedNodeId": "adr_789"
}
```

**Example:**
```bash
curl -X DELETE "https://app.ginkoai.com/api/v1/knowledge/nodes/adr_789?graphId=graph_123" \
  -H "Authorization: Bearer $GINKO_API_KEY"
```

---

### Projects

#### Create Project

**POST** `/api/v1/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "my-saas-app",
  "repository": "github.com/yourname/saas-app",
  "visibility": "private",
  "description": "SaaS platform for team collaboration"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "project": {
    "id": "proj_abc123",
    "name": "my-saas-app",
    "repository": "github.com/yourname/saas-app",
    "visibility": "private",
    "description": "SaaS platform for team collaboration",
    "graphId": "graph_xyz789",
    "createdAt": "2025-11-07T19:00:00Z",
    "createdBy": "user_abc123",
    "members": [
      {
        "userId": "user_abc123",
        "email": "you@example.com",
        "role": "owner"
      }
    ]
  }
}
```

#### List Projects

**GET** `/api/v1/projects`

List all projects you have access to.

**Query Parameters:**
- `visibility` (string, optional) - Filter by `public` or `private`
- `limit` (number, optional) - Max results (default: 50)
- `offset` (number, optional) - Pagination offset

**Response (200 OK):**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "my-saas-app",
      "repository": "github.com/yourname/saas-app",
      "visibility": "private",
      "yourRole": "owner",
      "memberCount": 5,
      "nodeCount": 127,
      "createdAt": "2025-10-15T10:00:00Z"
    }
  ],
  "totalCount": 3
}
```

---

### Teams

#### Create Team

**POST** `/api/v1/teams`

Create a new team.

**Request Body:**
```json
{
  "name": "backend-team",
  "description": "Backend development team"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "team": {
    "id": "team_abc123",
    "name": "backend-team",
    "description": "Backend development team",
    "createdAt": "2025-11-07T19:00:00Z",
    "createdBy": "user_abc123",
    "members": [
      {
        "userId": "user_abc123",
        "email": "you@example.com",
        "role": "owner"
      }
    ]
  }
}
```

#### Add Member to Team

**POST** `/api/v1/teams/[id]/members`

Add a member to a team.

**Request Body:**
```json
{
  "email": "alice@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "member": {
    "userId": "user_def456",
    "email": "alice@example.com",
    "addedAt": "2025-11-07T19:30:00Z"
  }
}
```

---

## GraphQL API

### Endpoint

**POST** `/api/graphql`

GraphQL endpoint accepts queries and mutations.

### GraphiQL Interface

Access interactive GraphQL playground in development:
- **Local:** http://localhost:3000/api/graphql
- **Production:** https://app.ginkoai.com/api/graphql (requires auth)

### Schema Overview

```graphql
type Query {
  # Semantic search
  search(
    query: String!
    graphId: String!
    limit: Int = 10
    minScore: Float = 0.75
    type: NodeType
    status: String
  ): [SearchResult!]!

  # Find nodes by tags
  nodesByTag(
    tags: [String!]!
    graphId: String!
    type: NodeType
    status: String = "active"
    limit: Int = 20
  ): [KnowledgeNode!]!

  # Node graph (relationship visualization)
  nodeGraph(
    nodeId: String!
    graphId: String!
    depth: Int = 1
    relationshipTypes: [RelationshipType!]
  ): NodeGraph!

  # Implementation progress tracking
  implementationProgress(
    projectId: String!
    graphId: String!
  ): ImplementationProgress!

  # Context-aware queries
  contextualNodes(
    graphId: String!
    context: ContextInput!
    limit: Int = 20
  ): [KnowledgeNode!]!
}

type Mutation {
  # Create node
  createNode(
    graphId: String!
    type: NodeType!
    title: String!
    content: String!
    tags: [String!]
    status: String = "active"
  ): KnowledgeNode!

  # Update node
  updateNode(
    id: String!
    graphId: String!
    title: String
    content: String
    tags: [String!]
    status: String
  ): KnowledgeNode!

  # Delete node
  deleteNode(
    id: String!
    graphId: String!
  ): Boolean!

  # Create relationship
  createRelationship(
    fromId: String!
    toId: String!
    graphId: String!
    type: RelationshipType!
  ): Relationship!
}

enum NodeType {
  ADR
  PRD
  ContextModule
  Session
  CodeFile
}

enum RelationshipType {
  IMPLEMENTS
  REFERENCES
  TAGGED_WITH
  RELATED_TO
}
```

### Query Examples

#### 1. Semantic Search

```graphql
query SearchKnowledge {
  search(
    query: "authentication patterns"
    graphId: "graph_123"
    limit: 10
    minScore: 0.75
    type: ADR
    status: "active"
  ) {
    node {
      id
      title
      type
      content
      tags
      createdAt
    }
    score
    relationshipType
  }
}
```

**Response:**
```json
{
  "data": {
    "search": [
      {
        "node": {
          "id": "adr_123",
          "title": "OAuth2 Implementation",
          "type": "ADR",
          "content": "We will use OAuth2 with GitHub...",
          "tags": ["auth", "oauth", "security"],
          "createdAt": "2025-10-15T10:00:00Z"
        },
        "score": 0.92,
        "relationshipType": "HIGHLY_RELATED_TO"
      }
    ]
  }
}
```

#### 2. Node Graph (Relationship Visualization)

```graphql
query NodeGraph {
  nodeGraph(
    nodeId: "adr_123"
    graphId: "graph_123"
    depth: 2
    relationshipTypes: [IMPLEMENTS, REFERENCES]
  ) {
    centerNode {
      id
      title
      type
      status
    }
    connectedNodes {
      id
      title
      type
      relationshipType
      distance
    }
    relationships {
      type
      fromId
      toId
      properties
    }
    depth
    totalNodes
  }
}
```

#### 3. Implementation Progress

```graphql
query Progress {
  implementationProgress(
    projectId: "my-project"
    graphId: "graph_123"
  ) {
    totalPRDs
    implementedPRDs
    inProgressPRDs
    notStartedPRDs
    totalADRs
    completionPercentage
    recentDecisions {
      id
      title
      status
      createdAt
    }
  }
}
```

### Mutation Examples

#### Create Node

```graphql
mutation CreateNode {
  createNode(
    graphId: "graph_123"
    type: ADR
    title: "Use Redis for Caching"
    content: "We will use Redis for caching because..."
    tags: ["cache", "redis", "performance"]
    status: "active"
  ) {
    id
    title
    type
    status
    tags
    createdAt
  }
}
```

#### Create Relationship

```graphql
mutation CreateRelationship {
  createRelationship(
    fromId: "adr_789"
    toId: "prd_456"
    graphId: "graph_123"
    type: IMPLEMENTS
  ) {
    type
    fromId
    toId
    properties
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2025-11-07T19:00:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing/invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (duplicate) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Temporary outage |

### Common Errors

**401 Unauthorized:**
```json
{
  "error": "Missing or invalid authorization header",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "error": "Unauthorized: No access to specified graph",
  "code": "FORBIDDEN",
  "details": {
    "graphId": "graph_123",
    "requiredRole": "editor"
  }
}
```

**404 Not Found:**
```json
{
  "error": "Node not found",
  "code": "NOT_FOUND",
  "details": {
    "nodeId": "adr_999",
    "graphId": "graph_123"
  }
}
```

**429 Rate Limit:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "60s",
    "retryAfter": 45
  }
}
```

---

## Rate Limiting

### Limits

**Free Tier:**
- 100 requests per minute
- 1,000 requests per hour
- 10,000 requests per day

**Paid Tier:**
- 1,000 requests per minute
- 10,000 requests per hour
- 100,000 requests per day

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699368000
```

### Handling Rate Limits

**Exponential Backoff:**
```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['x-ratelimit-reset'];
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Code Examples

### TypeScript/Node.js

**Complete Example:**
```typescript
import axios from 'axios';

const API_BASE = 'https://app.ginkoai.com';
const API_KEY = process.env.GINKO_API_KEY!;

// Create API client
const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Create knowledge node
async function createKnowledgeNode() {
  const response = await client.post('/api/v1/knowledge/nodes', {
    type: 'ADR',
    graphId: 'graph_123',
    data: {
      title: 'Use TypeScript for Backend',
      content: 'We will use TypeScript for type safety...',
      status: 'active',
      tags: ['typescript', 'backend'],
    },
  });

  console.log('Created node:', response.data.node.id);
  return response.data.node;
}

// Search knowledge
async function searchKnowledge(query: string) {
  const response = await client.get('/api/v1/knowledge/nodes', {
    params: {
      graphId: 'graph_123',
      search: query,
      type: 'ADR',
      limit: 10,
    },
  });

  console.log(`Found ${response.data.totalCount} nodes`);
  return response.data.nodes;
}

// GraphQL query
async function graphqlSearch(query: string) {
  const response = await client.post('/api/graphql', {
    query: `
      query Search($query: String!, $graphId: String!) {
        search(query: $query, graphId: $graphId, limit: 10) {
          node { id title type }
          score
        }
      }
    `,
    variables: { query, graphId: 'graph_123' },
  });

  return response.data.data.search;
}

// Example usage
(async () => {
  const node = await createKnowledgeNode();
  const results = await searchKnowledge('typescript');
  const graphqlResults = await graphqlSearch('backend architecture');
})();
```

### Python

**Complete Example:**
```python
import os
import requests
from typing import Dict, List, Optional

API_BASE = 'https://app.ginkoai.com'
API_KEY = os.getenv('GINKO_API_KEY')

class GinkoClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

    def create_node(self, node_type: str, graph_id: str, title: str,
                    content: str, tags: List[str] = None,
                    status: str = 'active') -> Dict:
        """Create a knowledge node"""
        response = requests.post(
            f'{API_BASE}/api/v1/knowledge/nodes',
            headers=self.headers,
            json={
                'type': node_type,
                'graphId': graph_id,
                'data': {
                    'title': title,
                    'content': content,
                    'status': status,
                    'tags': tags or [],
                }
            }
        )
        response.raise_for_status()
        return response.json()['node']

    def search_nodes(self, graph_id: str, search: str,
                     node_type: Optional[str] = None,
                     limit: int = 10) -> List[Dict]:
        """Search knowledge nodes"""
        params = {
            'graphId': graph_id,
            'search': search,
            'limit': limit,
        }
        if node_type:
            params['type'] = node_type

        response = requests.get(
            f'{API_BASE}/api/v1/knowledge/nodes',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()['nodes']

    def graphql_query(self, query: str, variables: Dict = None) -> Dict:
        """Execute GraphQL query"""
        response = requests.post(
            f'{API_BASE}/api/graphql',
            headers=self.headers,
            json={'query': query, 'variables': variables or {}}
        )
        response.raise_for_status()
        return response.json()['data']

# Example usage
client = GinkoClient(API_KEY)

# Create node
node = client.create_node(
    node_type='ADR',
    graph_id='graph_123',
    title='Use FastAPI for Python Backend',
    content='We will use FastAPI for async performance...',
    tags=['python', 'backend', 'fastapi']
)
print(f"Created node: {node['id']}")

# Search
results = client.search_nodes(
    graph_id='graph_123',
    search='backend architecture',
    node_type='ADR'
)
print(f"Found {len(results)} results")

# GraphQL
graphql_results = client.graphql_query(
    query='''
        query Search($query: String!, $graphId: String!) {
            search(query: $query, graphId: $graphId, limit: 5) {
                node { id title type }
                score
            }
        }
    ''',
    variables={'query': 'api design', 'graphId': 'graph_123'}
)
print(graphql_results['search'])
```

---

## Webhooks

### Coming Soon

Webhooks for real-time notifications:
- Node created
- Node updated
- Node deleted
- Project member added
- Team event

**Example Webhook Payload:**
```json
{
  "event": "node.created",
  "timestamp": "2025-11-07T19:00:00Z",
  "data": {
    "nodeId": "adr_789",
    "projectId": "proj_abc123",
    "graphId": "graph_123",
    "type": "ADR",
    "title": "Use GraphQL",
    "createdBy": "user_abc123"
  }
}
```

---

## Best Practices

1. **Use Environment Variables** - Store API keys securely
2. **Handle Rate Limits** - Implement exponential backoff
3. **Cache Responses** - Reduce API calls where possible
4. **Use GraphQL for Complex Queries** - More efficient than multiple REST calls
5. **Validate Inputs** - Check data before sending requests
6. **Monitor Errors** - Log and track API errors
7. **Use Pagination** - Don't request all data at once
8. **Keep API Keys Secret** - Never commit to version control

---

## Support

- **Documentation:** https://docs.ginkoai.com
- **API Status:** https://status.ginkoai.com
- **GitHub Issues:** https://github.com/chrispangg/ginko/issues
- **Email:** chris@watchhill.ai

---

**Last Updated:** 2025-11-07 | **API Version:** v1
