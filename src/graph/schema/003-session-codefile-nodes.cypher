// Migration 003: Session and CodeFile Nodes
// Purpose: Add temporal tracking and code linking
// Date: 2025-10-28
// Dependencies: 001-initial-schema.cypher, 002-pattern-gotcha-nodes.cypher

// ============================================================================
// Session Nodes - Development Session Tracking
// ============================================================================

// Session nodes must have unique IDs
CREATE CONSTRAINT session_id_unique IF NOT EXISTS
FOR (s:Session)
REQUIRE s.id IS UNIQUE;

// Index on Session.project_id for multi-tenancy filtering
CREATE INDEX session_project_idx IF NOT EXISTS
FOR (s:Session)
ON (s.project_id);

// Index on Session.user_email for per-user queries
CREATE INDEX session_user_idx IF NOT EXISTS
FOR (s:Session)
ON (s.user_email);

// Index on Session.started_at for temporal queries
CREATE INDEX session_started_idx IF NOT EXISTS
FOR (s:Session)
ON (s.started_at);

// Index on Session.task_id for task-based queries
CREATE INDEX session_task_idx IF NOT EXISTS
FOR (s:Session)
ON (s.task_id);

// Index on Session.git_branch for branch-based queries
CREATE INDEX session_branch_idx IF NOT EXISTS
FOR (s:Session)
ON (s.git_branch);

// Full-text search on Session content
CREATE FULLTEXT INDEX session_fulltext IF NOT EXISTS
FOR (s:Session)
ON EACH [s.task_title, s.intent, s.outcome];

// ============================================================================
// CodeFile Nodes - Source Code Reference
// ============================================================================

// CodeFile nodes must have unique IDs
CREATE CONSTRAINT codefile_id_unique IF NOT EXISTS
FOR (c:CodeFile)
REQUIRE c.id IS UNIQUE;

// Index on CodeFile.project_id for multi-tenancy filtering
CREATE INDEX codefile_project_idx IF NOT EXISTS
FOR (c:CodeFile)
ON (c.project_id);

// Index on CodeFile.path for file lookup
CREATE INDEX codefile_path_idx IF NOT EXISTS
FOR (c:CodeFile)
ON (c.path);

// Index on CodeFile.file_type for type-based queries
CREATE INDEX codefile_type_idx IF NOT EXISTS
FOR (c:CodeFile)
ON (c.file_type);

// Index on CodeFile.language for language-based queries
CREATE INDEX codefile_language_idx IF NOT EXISTS
FOR (c:CodeFile)
ON (c.language);

// Index on CodeFile.complexity for filtering by complexity
CREATE INDEX codefile_complexity_idx IF NOT EXISTS
FOR (c:CodeFile)
ON (c.complexity);

// Full-text search on CodeFile content
CREATE FULLTEXT INDEX codefile_fulltext IF NOT EXISTS
FOR (c:CodeFile)
ON EACH [c.path, c.summary];

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints
// SHOW CONSTRAINTS;

// Show all indexes
// SHOW INDEXES;
