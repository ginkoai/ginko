// Migration 014: Voyage AI Vector Indexes (1024 dimensions)
// Purpose: Update vector indexes for Voyage AI embeddings and add missing types
// Date: 2026-01-21
// Related: EPIC-016 (Team Features), Graph loading bug fix
//
// BREAKING CHANGE: This migration changes embedding dimensions from 768 to 1024.
// All existing embeddings must be regenerated via `ginko graph load --force`.
//
// Changes:
// - Updates dimensions from 768 (all-mpnet-base-v2) to 1024 (voyage-3.5)
// - Adds missing indexes: Sprint, Epic, Task, Charter

// ============================================================================
// DROP OLD 768-DIMENSION INDEXES
// ============================================================================

DROP INDEX adr_embedding_index IF EXISTS;
DROP INDEX prd_embedding_index IF EXISTS;
DROP INDEX pattern_embedding_index IF EXISTS;
DROP INDEX gotcha_embedding_index IF EXISTS;
DROP INDEX session_embedding_index IF EXISTS;
DROP INDEX codefile_embedding_index IF EXISTS;
DROP INDEX contextmodule_embedding_index IF EXISTS;

// ============================================================================
// CREATE NEW 1024-DIMENSION INDEXES (Voyage AI voyage-3.5)
// ============================================================================

// ADR Vector Index
CREATE VECTOR INDEX adr_embedding_index IF NOT EXISTS
FOR (n:ADR)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// PRD Vector Index
CREATE VECTOR INDEX prd_embedding_index IF NOT EXISTS
FOR (n:PRD)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Pattern Vector Index
CREATE VECTOR INDEX pattern_embedding_index IF NOT EXISTS
FOR (n:Pattern)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Gotcha Vector Index
CREATE VECTOR INDEX gotcha_embedding_index IF NOT EXISTS
FOR (n:Gotcha)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Session Vector Index
CREATE VECTOR INDEX session_embedding_index IF NOT EXISTS
FOR (n:Session)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// CodeFile Vector Index
CREATE VECTOR INDEX codefile_embedding_index IF NOT EXISTS
FOR (n:CodeFile)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// ContextModule Vector Index
CREATE VECTOR INDEX contextmodule_embedding_index IF NOT EXISTS
FOR (n:ContextModule)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// ============================================================================
// NEW INDEXES (previously missing)
// ============================================================================

// Sprint Vector Index
CREATE VECTOR INDEX sprint_embedding_index IF NOT EXISTS
FOR (n:Sprint)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Epic Vector Index
CREATE VECTOR INDEX epic_embedding_index IF NOT EXISTS
FOR (n:Epic)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Task Vector Index
CREATE VECTOR INDEX task_embedding_index IF NOT EXISTS
FOR (n:Task)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// Charter Vector Index
CREATE VECTOR INDEX charter_embedding_index IF NOT EXISTS
FOR (n:Charter)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};

// ============================================================================
// VERIFICATION
// ============================================================================

// Run after migration to verify:
// SHOW INDEXES YIELD name, type, labelsOrTypes, properties, options
// WHERE type = 'VECTOR'
// RETURN name, labelsOrTypes, options.indexConfig.`vector.dimensions` as dimensions

// Expected: 11 vector indexes, all with 1024 dimensions

// ============================================================================
// POST-MIGRATION STEPS
// ============================================================================

// After running this migration, all users must re-upload their documents:
// $ ginko graph load --force
//
// This regenerates embeddings using Voyage AI (1024 dimensions).
