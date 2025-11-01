# Ginko Cloud API Specification

**Version:** 1.0
**Base URL:** `https://api.ginko.ai`
**Protocol:** HTTPS only
**Authentication:** Bearer token (JWT)

## Overview

The Ginko Cloud API provides knowledge graph services for project documentation. All graph processing (embeddings, relationships, queries) happens server-side, eliminating local setup requirements.

## Authentication

### Token Format
All API requests must include an Authorization header with a bearer token obtained from `ginko login`:

```http
Authorization: Bearer {jwt_token}
```

### Token Lifecycle
- **Issued by:** GitHub OAuth flow via `ginko login`
- **Storage:** `~/.ginko/auth.json`
- **Expiration:** 30 days from issue
- **Refresh:** Automatic via refresh token

### Error Responses
```json
// 401 Unauthorized
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required. Run 'ginko login' to authenticate."
  }
}

// 403 Forbidden
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have access to this resource."
  }
}
```

## Rate Limiting

### Limits by Tier

**Free Tier:**
- 100 queries per day
- 10 document uploads per day
- 1,000 total documents
- 1 project

**Pro Tier ($29/month):**
- Unlimited queries
- Unlimited uploads
- Unlimited documents
- Unlimited projects

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1698768000
```

### Rate Limit Error
```json
// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Resets at 2025-10-31T00:00:00Z",
    "resetAt": "2025-10-31T00:00:00Z"
  }
}
```

## Endpoints

### 1. Initialize Graph

Create a new knowledge graph namespace for a project.

**Endpoint:** `POST /api/v1/graph/init`

**Request:**
```json
{
  "projectPath": "/Users/chris/projects/ginko",
  "projectName": "ginko",
  "visibility": "private",
  "organization": "watchhill-ai",
  "documents": {
    "adr": 40,
    "prd": 10,
    "patterns": 15,
    "gotchas": 5,
    "sessions": 64
  }
}
```

**Request Schema:**
- `projectPath` (string, required): Absolute path to project directory
- `projectName` (string, required): Project name (lowercase, alphanumeric + hyphens)
- `visibility` (enum, optional): `"private"` | `"organization"` | `"public"` (default: `"private"`)
- `organization` (string, optional): GitHub organization slug (required if visibility is "organization")
- `documents` (object, required): Count of documents by type

**Response:** `201 Created`
```json
{
  "namespace": "/watchhill-ai/ginko",
  "graphId": "gin_abc123xyz",
  "status": "created",
  "estimatedProcessingTime": 45,
  "createdAt": "2025-10-31T18:45:23Z"
}
```

**Response Schema:**
- `namespace` (string): Unique namespace for this graph (`/org/project`)
- `graphId` (string): Unique graph identifier for API calls
- `status` (enum): `"created"` | `"initializing"` | `"ready"`
- `estimatedProcessingTime` (number): Estimated seconds to process all documents
- `createdAt` (string): ISO 8601 timestamp

**Error Responses:**
```json
// 400 Bad Request - Invalid project name
{
  "error": {
    "code": "INVALID_PROJECT_NAME",
    "message": "Project name must be lowercase alphanumeric with hyphens only.",
    "field": "projectName"
  }
}

// 409 Conflict - Graph already exists
{
  "error": {
    "code": "GRAPH_EXISTS",
    "message": "Graph already exists for this project. Use 'ginko graph rebuild' to recreate.",
    "existingGraphId": "gin_abc123xyz"
  }
}
```

---

### 2. Upload Documents

Upload documents to the knowledge graph for processing.

**Endpoint:** `POST /api/v1/graph/documents`

**Request:**
```json
{
  "graphId": "gin_abc123xyz",
  "documents": [
    {
      "id": "ADR-039",
      "type": "ADR",
      "title": "Knowledge Discovery Graph",
      "content": "# ADR-039: Knowledge Discovery Graph\n\n## Status\nAccepted\n\n## Context\n...",
      "filePath": "docs/adr/ADR-039.md",
      "hash": "sha256:abc123def456...",
      "metadata": {
        "status": "accepted",
        "date": "2025-10-15",
        "tags": ["graph", "neo4j", "ai"]
      }
    }
  ]
}
```

**Request Schema:**
- `graphId` (string, required): Graph identifier from init
- `documents` (array, required): Array of document objects (max 500 per request)
  - `id` (string, required): Unique document identifier
  - `type` (enum, required): `"ADR"` | `"PRD"` | `"Pattern"` | `"Gotcha"` | `"Session"` | `"ContextModule"`
  - `title` (string, required): Document title
  - `content` (string, required): Full markdown content
  - `filePath` (string, required): Relative path from project root
  - `hash` (string, required): SHA-256 hash for change detection
  - `metadata` (object, optional): Document-specific metadata

**Response:** `202 Accepted`
```json
{
  "job": {
    "jobId": "job_xyz789",
    "status": "processing",
    "createdAt": "2025-10-31T18:45:30Z",
    "estimatedCompletion": "2025-10-31T18:46:15Z",
    "progress": {
      "uploaded": 137,
      "parsed": 0,
      "embedded": 0,
      "total": 137
    }
  }
}
```

**Response Schema:**
- `job` (object): Async job details
  - `jobId` (string): Job identifier for status polling
  - `status` (enum): `"queued"` | `"processing"` | `"completed"` | `"failed"`
  - `createdAt` (string): ISO 8601 timestamp
  - `estimatedCompletion` (string): Estimated completion time
  - `progress` (object): Current progress
    - `uploaded` (number): Documents received
    - `parsed` (number): Documents parsed
    - `embedded` (number): Documents with embeddings
    - `total` (number): Total documents to process

**Error Responses:**
```json
// 400 Bad Request - Invalid document format
{
  "error": {
    "code": "INVALID_DOCUMENT_FORMAT",
    "message": "Document content must be valid markdown.",
    "documentId": "ADR-039"
  }
}

// 413 Payload Too Large
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Maximum 500 documents per request.",
    "documentsCount": 750
  }
}
```

---

### 3. Check Job Status

Poll for async job completion status.

**Endpoint:** `GET /api/v1/graph/jobs/{jobId}`

**Response:** `200 OK`
```json
{
  "jobId": "job_xyz789",
  "status": "completed",
  "createdAt": "2025-10-31T18:45:30Z",
  "completedAt": "2025-10-31T18:46:08Z",
  "progress": {
    "uploaded": 137,
    "parsed": 137,
    "embedded": 137,
    "total": 137
  },
  "result": {
    "nodesCreated": 137,
    "relationshipsCreated": 298,
    "processingTime": 38
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job not found or expired.",
    "jobId": "job_xyz789"
  }
}
```

---

### 4. Get Graph Status

Retrieve graph statistics and health information.

**Endpoint:** `GET /api/v1/graph/status`

**Query Parameters:**
- `graphId` (string, required): Graph identifier

**Response:** `200 OK`
```json
{
  "namespace": "/watchhill-ai/ginko",
  "graphId": "gin_abc123xyz",
  "visibility": "private",
  "nodes": {
    "total": 137,
    "byType": {
      "ADR": 40,
      "PRD": 10,
      "Pattern": 15,
      "Gotcha": 5,
      "Session": 64,
      "ContextModule": 3
    },
    "withEmbeddings": 137
  },
  "relationships": {
    "total": 298,
    "byType": {
      "SIMILAR_TO": 278,
      "APPLIES_TO": 8,
      "REFERENCES": 5,
      "IMPLEMENTS": 3,
      "LEARNED_FROM": 2,
      "SUPERSEDES": 1,
      "MITIGATED_BY": 1
    }
  },
  "lastSync": "2025-10-31T18:45:23Z",
  "health": "healthy",
  "stats": {
    "averageConnections": 4.3,
    "mostConnected": {
      "id": "ADR-039",
      "connections": 15
    }
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": {
    "code": "GRAPH_NOT_FOUND",
    "message": "Graph not found. Run 'ginko graph init' to create.",
    "graphId": "gin_abc123xyz"
  }
}
```

---

### 5. Semantic Query

Search documents using natural language queries.

**Endpoint:** `POST /api/v1/graph/query`

**Request:**
```json
{
  "graphId": "gin_abc123xyz",
  "query": "authentication patterns",
  "limit": 10,
  "threshold": 0.70,
  "types": ["ADR", "Pattern"]
}
```

**Request Schema:**
- `graphId` (string, required): Graph identifier
- `query` (string, required): Natural language search query (min 3 chars)
- `limit` (number, optional): Max results to return (default: 10, max: 50)
- `threshold` (number, optional): Minimum similarity score 0-1 (default: 0.70)
- `types` (array, optional): Filter by document types (default: all types)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "document": {
        "id": "ADR-019",
        "type": "ADR",
        "title": "Claude Code SDK Agent Architecture",
        "summary": "Architectural decision for implementing Claude Code SDK agents with event-driven architecture.",
        "tags": ["auth", "sdk", "architecture"],
        "filePath": "docs/adr/ADR-019.md"
      },
      "similarity": 0.89,
      "connections": 7,
      "matchContext": "...authentication flow using OAuth 2.0 with JWT tokens..."
    },
    {
      "document": {
        "id": "PATTERN-auth-jwt",
        "type": "Pattern",
        "title": "JWT Authentication Pattern",
        "summary": "Reusable pattern for implementing JWT-based authentication.",
        "tags": ["auth", "jwt", "security"],
        "filePath": ".ginko/context/modules/auth-patterns.md"
      },
      "similarity": 0.85,
      "connections": 4,
      "matchContext": "...JWT tokens with refresh token rotation..."
    }
  ],
  "totalResults": 15,
  "queryTime": 45,
  "embedding": {
    "model": "all-mpnet-base-v2",
    "dimensions": 768
  }
}
```

**Response Schema:**
- `results` (array): Matched documents sorted by similarity
  - `document` (object): Document metadata
  - `similarity` (number): Cosine similarity score (0-1)
  - `connections` (number): Number of related documents
  - `matchContext` (string): Snippet showing relevant content
- `totalResults` (number): Total matches above threshold
- `queryTime` (number): Query execution time in milliseconds
- `embedding` (object): Embedding model information

**Error Responses:**
```json
// 400 Bad Request - Query too short
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query must be at least 3 characters.",
    "query": "ai"
  }
}
```

---

### 6. Explore Document

Get detailed information about a document and its connections.

**Endpoint:** `GET /api/v1/graph/explore/{documentId}`

**Query Parameters:**
- `graphId` (string, required): Graph identifier
- `depth` (number, optional): Relationship depth to traverse (default: 1, max: 3)

**Response:** `200 OK`
```json
{
  "document": {
    "id": "ADR-039",
    "type": "ADR",
    "title": "Knowledge Discovery Graph for AI-Native Development",
    "summary": "Architectural decision to implement Neo4j knowledge graph with vector embeddings for intelligent context discovery.",
    "content": "# ADR-039: Knowledge Discovery Graph\n\n## Status\nAccepted\n\n...",
    "tags": ["graph", "neo4j", "ai", "knowledge", "context"],
    "filePath": "docs/adr/ADR-039.md",
    "metadata": {
      "status": "accepted",
      "date": "2025-10-15",
      "author": "Chris Norton"
    },
    "createdAt": "2025-10-31T18:45:23Z",
    "updatedAt": "2025-10-31T18:45:23Z"
  },
  "relationships": {
    "implements": [
      {
        "id": "PRD-010",
        "type": "PRD",
        "title": "Cloud-First Knowledge Graph Platform",
        "similarity": null
      }
    ],
    "referencedBy": [
      {
        "id": "ADR-040",
        "type": "ADR",
        "title": "Graph Query Optimization Strategies",
        "similarity": null
      },
      {
        "id": "PRD-011",
        "type": "PRD",
        "title": "Advanced Graph Features",
        "similarity": null
      }
    ],
    "similarTo": [
      {
        "id": "ADR-028",
        "type": "ADR",
        "title": "First-Use Experience Enhancement",
        "similarity": 0.85
      },
      {
        "id": "PATTERN-architecture-orchestrated-agents",
        "type": "Pattern",
        "title": "Orchestrated Agent Architecture",
        "similarity": 0.82
      }
    ],
    "appliedPatterns": [
      {
        "id": "PATTERN-human-ai-collaboration",
        "type": "Pattern",
        "title": "Human-AI Collaboration Advantages",
        "similarity": null
      }
    ]
  },
  "totalConnections": 9,
  "connectionsByType": {
    "implements": 1,
    "referencedBy": 2,
    "similarTo": 4,
    "appliedPatterns": 2
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found in graph.",
    "documentId": "ADR-999"
  }
}
```

---

### 7. Sync Graph

Incrementally update graph with new or modified documents.

**Endpoint:** `POST /api/v1/graph/sync`

**Request:**
```json
{
  "graphId": "gin_abc123xyz",
  "changes": {
    "added": [
      {
        "id": "ADR-041",
        "type": "ADR",
        "title": "New Architecture Decision",
        "content": "...",
        "filePath": "docs/adr/ADR-041.md",
        "hash": "sha256:new123..."
      }
    ],
    "modified": [
      {
        "id": "ADR-040",
        "hash": "sha256:updated456...",
        "content": "...",
        "previousHash": "sha256:old789..."
      }
    ],
    "deleted": ["ADR-038"]
  }
}
```

**Request Schema:**
- `graphId` (string, required): Graph identifier
- `changes` (object, required): Document changes
  - `added` (array): New documents (same schema as upload)
  - `modified` (array): Changed documents with new content
  - `deleted` (array): Document IDs to remove

**Response:** `202 Accepted`
```json
{
  "job": {
    "jobId": "job_sync_abc123",
    "status": "processing",
    "changes": {
      "added": 1,
      "modified": 1,
      "deleted": 1
    },
    "estimatedCompletion": "2025-10-31T18:46:15Z"
  }
}
```

---

### 8. Delete Graph

Delete an entire knowledge graph and all associated data.

**Endpoint:** `DELETE /api/v1/graph/{graphId}`

**Query Parameters:**
- `confirm` (boolean, required): Must be `true` to confirm deletion

**Response:** `200 OK`
```json
{
  "message": "Graph successfully deleted.",
  "graphId": "gin_abc123xyz",
  "deletedAt": "2025-10-31T18:45:23Z",
  "nodesDeleted": 137,
  "relationshipsDeleted": 298
}
```

**Error Responses:**
```json
// 400 Bad Request - Missing confirmation
{
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "Must set confirm=true to delete graph."
  }
}
```

---

## Error Handling

### Standard Error Format
All errors follow this schema:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName",
    "details": {}
  }
}
```

### HTTP Status Codes
- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `202 Accepted` - Async job started
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `413 Payload Too Large` - Request too large
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Temporary outage

### Error Codes
- `AUTH_REQUIRED` - Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `GRAPH_NOT_FOUND` - Graph doesn't exist
- `GRAPH_EXISTS` - Graph already exists
- `DOCUMENT_NOT_FOUND` - Document doesn't exist
- `JOB_NOT_FOUND` - Job doesn't exist or expired
- `INVALID_QUERY` - Query validation failed
- `INVALID_PROJECT_NAME` - Project name format invalid
- `INVALID_DOCUMENT_FORMAT` - Document content invalid
- `PAYLOAD_TOO_LARGE` - Request exceeds size limits
- `CONFIRMATION_REQUIRED` - Destructive action needs confirmation

---

## Versioning

### API Version Strategy
- Current version: `v1`
- Version in URL path: `/api/v1/`
- Breaking changes require new version
- Deprecated versions supported for 6 months

### Version Headers
```http
X-API-Version: 1.0
X-Client-Version: ginko-cli@1.2.3
```

---

## Webhooks (Future)

### Webhook Events
For future Phase 3+ implementation:
- `graph.document.added` - Document added to graph
- `graph.document.updated` - Document modified
- `graph.document.deleted` - Document removed
- `graph.sync.completed` - Sync job finished
- `graph.query.performed` - Query executed (audit)

### Webhook Payload Format
```json
{
  "event": "graph.document.added",
  "timestamp": "2025-10-31T18:45:23Z",
  "graphId": "gin_abc123xyz",
  "data": {
    "documentId": "ADR-041",
    "documentType": "ADR"
  }
}
```

---

## Performance Targets

### Response Times (p95)
- `POST /graph/init`: < 500ms
- `POST /graph/documents`: < 1000ms (returns job immediately)
- `GET /graph/status`: < 200ms
- `POST /graph/query`: < 500ms
- `GET /graph/explore`: < 300ms

### Processing Times
- Embedding generation: ~150ms per document
- Relationship extraction: ~50ms per document
- Full load (137 docs): 30-60 seconds

### Scalability
- Max documents per graph: 10,000 (free), unlimited (pro)
- Max graph size: 10 GB
- Max document size: 5 MB
- Concurrent requests per user: 10

---

## Security

### Data Encryption
- **In transit:** TLS 1.3
- **At rest:** AES-256

### Authentication
- OAuth 2.0 via GitHub
- JWT tokens with 30-day expiration
- Refresh tokens for automatic renewal

### Authorization
- Namespace-based isolation
- Organization-level sharing controls
- Audit logs for all data access

### Privacy
- Data never shared across organizations
- Opt-in for public graphs
- Full data deletion on request
- GDPR compliant

---

## References

- [Onboarding Guide](./GRAPH_ONBOARDING.md)
- [Implementation Plan](./GRAPH_IMPLEMENTATION_PLAN.md)
- [CLI Documentation](./CLI_REFERENCE.md)
- [Neo4j Multi-tenancy](https://neo4j.com/developer/multi-tenancy-worked-example/)
