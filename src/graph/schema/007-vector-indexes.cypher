// Vector Indexes for Semantic Search
// Migration: 007-vector-indexes.cypher
// Created: 2025-10-30
// Purpose: Add vector indexes for all-mpnet-base-v2 embeddings (768 dimensions)

// ============================================================================
// VECTOR INDEXES FOR SEMANTIC SIMILARITY SEARCH
// ============================================================================

// ADR Vector Index (Architecture Decision Records)
// Enables semantic search across architectural decisions
CREATE VECTOR INDEX adr_embedding_index IF NOT EXISTS
FOR (n:ADR)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// PRD Vector Index (Product Requirements Documents)
// Enables semantic search across product requirements
CREATE VECTOR INDEX prd_embedding_index IF NOT EXISTS
FOR (n:PRD)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// Pattern Vector Index
// Enables semantic search for development patterns
CREATE VECTOR INDEX pattern_embedding_index IF NOT EXISTS
FOR (n:Pattern)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// Gotcha Vector Index
// Enables semantic search for known pitfalls
CREATE VECTOR INDEX gotcha_embedding_index IF NOT EXISTS
FOR (n:Gotcha)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// Session Vector Index
// Enables semantic search across development sessions
CREATE VECTOR INDEX session_embedding_index IF NOT EXISTS
FOR (n:Session)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// CodeFile Vector Index
// Enables semantic search across code files (frontmatter summaries)
CREATE VECTOR INDEX codefile_embedding_index IF NOT EXISTS
FOR (n:CodeFile)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// ContextModule Vector Index
// Enables semantic search for team conventions and practices
CREATE VECTOR INDEX contextmodule_embedding_index IF NOT EXISTS
FOR (n:ContextModule)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};

// ============================================================================
// VERIFICATION QUERY
// ============================================================================

// To verify vector indexes are created, run:
// SHOW INDEXES YIELD name, type, labelsOrTypes, properties
// WHERE type = 'VECTOR'
// RETURN name, labelsOrTypes, properties

// Expected output: 7 vector indexes (one per node type)

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Find similar ADRs
// CALL db.index.vector.queryNodes('adr_embedding_index', 5, $queryEmbedding)
// YIELD node, score
// WHERE node.project_id = $projectId AND score > 0.7
// RETURN node.id, node.title, score
// ORDER BY score DESC

// Example 2: Hybrid search (combine full-text + vector)
// CALL {
//   // Full-text search
//   CALL db.index.fulltext.queryNodes('adr_fulltext', $query)
//   YIELD node, score AS textScore
//   WHERE node.project_id = $projectId
//   RETURN node, textScore, 0.0 AS vectorScore
//   LIMIT 20
//   UNION
//   // Vector search
//   CALL db.index.vector.queryNodes('adr_embedding_index', 20, $queryEmbedding)
//   YIELD node, score AS vectorScore
//   WHERE node.project_id = $projectId
//   RETURN node, 0.0 AS textScore, vectorScore
// }
// WITH node, textScore, vectorScore
// WITH node, (textScore * 0.3 + vectorScore * 0.7) AS combinedScore
// WHERE combinedScore > 0.5
// RETURN node
// ORDER BY combinedScore DESC
// LIMIT 10

// Example 3: Find patterns similar to a gotcha (cross-type search)
// MATCH (g:Gotcha {id: $gotchaId})
// CALL db.index.vector.queryNodes('pattern_embedding_index', 5, g.embedding)
// YIELD node AS pattern, score
// WHERE score > 0.75
// RETURN pattern, score
// ORDER BY score DESC
