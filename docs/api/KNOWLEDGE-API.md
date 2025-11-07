# Knowledge API Documentation

**Status:** Implementation Complete (TASK-021, TASK-024, TASK-025)
**Date:** 2025-11-07
**Sprint:** SPRINT-2025-10-27-cloud-knowledge-graph

## Overview

The Knowledge API provides two interfaces for managing knowledge nodes:
1. **REST API** - CRUD operations on individual nodes
2. **GraphQL API** - Complex queries, semantic search, relationship traversal

Both APIs use Bearer token authentication and the same Neo4j graph backend via `CloudGraphClient`.

---

## REST API Endpoints

### Base URL
- **Production:** `https://app.ginkoai.com/api/v1/knowledge`
- **Local:** `http://localhost:3000/api/v1/knowledge`

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

### Endpoints

#### 1. Create Node
**POST** `/api/v1/knowledge/nodes`

Creates a new knowledge node with optional relationships.

**Request Body:**
```json
{
  "type": "ADR",
  "graphId": "graph_123",
  "data": {
    "title": "Use GraphQL for Knowledge API",
    "content": "We will use GraphQL Yoga for the knowledge graph API...",
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

**Response:**
```json
{
  "success": true,
  "node": {
    "id": "adr_789",
    "type": "ADR",
    "title": "Use GraphQL for Knowledge API",
    "content": "...",
    "status": "active",
    "tags": ["architecture", "api", "graphql"],
    "projectId": "graph_123",
    "createdAt": "2025-11-07T19:00:00Z",
    "updatedAt": "2025-11-07T19:00:00Z"
  },
  "relationships": [...]
}
```

**Node Types:**
- `ADR` - Architecture Decision Records
- `PRD` - Product Requirements Documents
- `ContextModule` - Patterns, gotchas, insights
- `Session` - Development session logs
- `CodeFile` - Source file metadata

**Relationship Types:**
- `IMPLEMENTS` - Node implements another node
- `REFERENCES` - Node references another node
- `TAGGED_WITH` - Node tagged with tag

---

#### 2. List/Filter Nodes
**GET** `/api/v1/knowledge/nodes?graphId=<id>&type=ADR&status=active&tags=auth&limit=50&offset=0`

Query parameters:
- `graphId` (required) - Graph ID
- `type` - Filter by node type
- `status` - Filter by status (active, archived, draft)
- `tags` - Comma-separated tags
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "nodes": [...],
  "totalCount": 15,
  "filters": {
    "graphId": "graph_123",
    "type": "ADR",
    "status": "active",
    "tags": ["auth"],
    "limit": 50,
    "offset": 0
  },
  "executionTime": 45
}
```

---

#### 3. Get Node by ID
**GET** `/api/v1/knowledge/nodes/[id]?graphId=<id>`

**Response:**
```json
{
  "node": {
    "id": "adr_789",
    "type": "ADR",
    "title": "...",
    "content": "...",
    "status": "active",
    "tags": [...],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "relationships": [
    {
      "type": "IMPLEMENTS",
      "targetId": "prd_456",
      "properties": {}
    }
  ]
}
```

---

#### 4. Update Node
**PUT** `/api/v1/knowledge/nodes/[id]`

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

**Response:**
```json
{
  "success": true,
  "node": {...}
}
```

---

#### 5. Delete Node
**DELETE** `/api/v1/knowledge/nodes/[id]?graphId=<id>`

Deletes node and all its relationships (DETACH DELETE).

**Response:**
```json
{
  "success": true,
  "message": "Node deleted successfully",
  "deletedNodeId": "adr_789"
}
```

---

## GraphQL API

### Endpoint
**POST** `/api/graphql`

### GraphiQL Interface
Available in development mode at `http://localhost:3000/api/graphql`

### Authentication
Same as REST API - Bearer token in Authorization header.

### Core Queries

#### 1. Semantic Search
```graphql
query SearchKnowledge {
  search(
    query: "authentication patterns"
    graphId: "graph_123"
    limit: 10
    minScore: 0.75
    type: ADR
    status: active
  ) {
    node {
      id
      title
      type
      content
      tags
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
          "content": "...",
          "tags": ["auth", "oauth"]
        },
        "score": 0.92,
        "relationshipType": "HIGHLY_RELATED_TO"
      }
    ]
  }
}
```

---

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
    }
    connectedNodes {
      id
      title
      type
    }
    relationships {
      type
      fromId
      toId
    }
    depth
  }
}
```

---

#### 3. Find Nodes by Tags
```graphql
query NodesByTag {
  nodesByTag(
    tags: ["authentication", "security"]
    graphId: "graph_123"
    type: ADR
    status: active
    limit: 20
  ) {
    id
    title
    type
    tags
  }
}
```

---

#### 4. Implementation Progress Tracking
```graphql
query Progress {
  implementationProgress(
    projectId: "my-project"
    graphId: "graph_123"
  ) {
    totalPRDs
    implementedPRDs
    inProgressPRDs
    totalADRs
    completionPercentage
    recentDecisions {
      id
      title
      createdAt
    }
  }
}
```

---

#### 5. Context-Aware Queries
```graphql
query ContextualNodes {
  contextualNodes(
    graphId: "graph_123"
    context: {
      projectId: "my-project"
      branch: "feature/auth"
      userId: "user_123"
    }
    limit: 20
  ) {
    id
    title
    type
    content
  }
}
```

---

### Mutations

#### Create Node
```graphql
mutation CreateNode {
  createNode(
    graphId: "graph_123"
    type: ADR
    title: "New Decision"
    content: "We will use GraphQL..."
    tags: ["api", "graphql"]
    status: active
  ) {
    id
    title
    type
    status
    createdAt
  }
}
```

#### Update Node
```graphql
mutation UpdateNode {
  updateNode(
    id: "adr_123"
    graphId: "graph_123"
    title: "Updated Title"
    status: archived
  ) {
    id
    title
    status
    updatedAt
  }
}
```

#### Delete Node
```graphql
mutation DeleteNode {
  deleteNode(
    id: "adr_123"
    graphId: "graph_123"
  )
}
```

#### Create Relationship
```graphql
mutation CreateRelationship {
  createRelationship(
    fromId: "adr_123"
    toId: "prd_456"
    graphId: "graph_123"
    type: IMPLEMENTS
  ) {
    type
    fromId
    toId
  }
}
```

---

## CLI Commands

### Installation
```bash
npm install -g ginko
ginko login  # Authenticate first
```

### Commands

#### 1. Search Knowledge
```bash
# Basic search
ginko knowledge search "authentication patterns"

# With filters
ginko knowledge search "auth" --limit 5 --threshold 0.8 --type ADR

# Table format
ginko knowledge search "security" --table
```

**Options:**
- `-l, --limit <number>` - Max results (default: 10)
- `-t, --threshold <number>` - Min similarity score 0-1 (default: 0.75)
- `--type <type>` - Filter by node type
- `--status <status>` - Filter by status (default: active)
- `--table` - Display as table

---

#### 2. Create Knowledge Node
```bash
# Interactive mode (default)
ginko knowledge create

# Non-interactive with options
ginko knowledge create \
  --type ADR \
  --title "Use GraphQL for API" \
  --content "We will use GraphQL Yoga..." \
  --tags "api,graphql"

# Read from file
ginko knowledge create \
  --type ADR \
  --title "API Decision" \
  --file docs/adr/ADR-050.md
```

**Options:**
- `--type <type>` - Node type (default: ContextModule)
- `--title <title>` - Node title
- `--content <content>` - Node content
- `--tags <tags>` - Comma-separated tags
- `--file <file>` - Read content from file
- `--interactive` - Force interactive mode

---

#### 3. Visualize Node Graph
```bash
# Tree format (default)
ginko knowledge graph adr_123

# With depth
ginko knowledge graph adr_123 --depth 2

# Filter relationships
ginko knowledge graph adr_123 --types IMPLEMENTS,REFERENCES

# Mermaid diagram
ginko knowledge graph adr_123 --format mermaid

# JSON output
ginko knowledge graph adr_123 --format json
```

**Options:**
- `-d, --depth <number>` - Relationship depth 1-2 (default: 1)
- `--types <types>` - Filter by relationship types (comma-separated)
- `--format <format>` - Output format: tree, json, mermaid (default: tree)

---

## Error Handling

### Common Error Codes

**401 Unauthorized**
```json
{
  "error": "Missing or invalid authorization header"
}
```

**403 Forbidden**
```json
{
  "error": "Unauthorized: No access to specified graph"
}
```

**404 Not Found**
```json
{
  "error": "Node not found"
}
```

**400 Bad Request**
```json
{
  "error": "Invalid node type",
  "validTypes": ["ADR", "PRD", "ContextModule", "Session", "CodeFile"]
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create knowledge node",
  "message": "Neo4j connection error"
}
```

---

## Files Reference

**REST API:**
- `dashboard/src/app/api/v1/knowledge/nodes/route.ts` - List & create
- `dashboard/src/app/api/v1/knowledge/nodes/[id]/route.ts` - Get, update, delete

**GraphQL API:**
- `dashboard/src/app/api/graphql/schema.ts` - GraphQL schema
- `dashboard/src/app/api/graphql/resolvers.ts` - Resolver implementations
- `dashboard/src/app/api/graphql/route.ts` - GraphQL Yoga endpoint

**CLI:**
- `packages/cli/src/commands/knowledge/index.ts` - Command group
- `packages/cli/src/commands/knowledge/search.ts` - Search command
- `packages/cli/src/commands/knowledge/create.ts` - Create command
- `packages/cli/src/commands/knowledge/graph.ts` - Graph visualization

**Core Infrastructure:**
- `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts` - Neo4j client
- `dashboard/src/app/api/v1/graph/_neo4j.ts` - Database connection
- `dashboard/src/lib/embeddings/voyage-client.ts` - Embedding generation

---

## Testing Status

**Implemented:** ✅ All endpoints and CLI commands
**Pending:**
- Integration tests for REST endpoints
- Integration tests for GraphQL queries
- E2E tests (CLI → API → Neo4j)
- Load testing for semantic search

See `NEXT-STEPS.md` for testing plan.
