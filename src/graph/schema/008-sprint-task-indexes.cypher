// Migration 008: Sprint and Task Indexes for EPIC-002 Phase 1
// Purpose: Optimize Task → MUST_FOLLOW → ADR queries (< 200ms target)
// Date: 2025-11-24
// Related: ADR-043 (Event-Based Context Loading), EPIC-002 (AI-Native Sprint Graphs)

// ============================================================================
// Constraints (Uniqueness)
// ============================================================================

// Sprint nodes must have unique IDs
CREATE CONSTRAINT sprint_id_unique IF NOT EXISTS
FOR (s:Sprint)
REQUIRE s.id IS UNIQUE;

// Task nodes must have unique IDs
CREATE CONSTRAINT task_id_unique IF NOT EXISTS
FOR (t:Task)
REQUIRE t.id IS UNIQUE;

// File nodes must have unique IDs (TASK-3)
CREATE CONSTRAINT file_id_unique IF NOT EXISTS
FOR (f:File)
REQUIRE f.id IS UNIQUE;

// ============================================================================
// Indexes (Performance - TASK-3 Query Optimization)
// ============================================================================

// Index on Task.id for direct lookups (used in /api/v1/task/{id}/constraints)
CREATE INDEX task_id_idx IF NOT EXISTS
FOR (t:Task)
ON (t.id);

// Index on Task.status for filtering incomplete tasks (NEXT_TASK queries)
CREATE INDEX task_status_idx IF NOT EXISTS
FOR (t:Task)
ON (t.status);

// Index on Sprint.id for direct lookups
CREATE INDEX sprint_id_idx IF NOT EXISTS
FOR (s:Sprint)
ON (s.id);

// Index on File.path for file lookups (MODIFIES relationships)
CREATE INDEX file_path_idx IF NOT EXISTS
FOR (f:File)
ON (f.path);

// ============================================================================
// Relationship Index (if needed for performance)
// ============================================================================

// Note: Neo4j AuraDB Free Tier may not support relationship indexes
// If needed, create via: CREATE INDEX rel_must_follow IF NOT EXISTS FOR ()-[r:MUST_FOLLOW]->() ON (r.source)

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints: SHOW CONSTRAINTS;
// Show all indexes: SHOW INDEXES;
//
// Expected performance improvement:
// - Task lookup: O(log n) instead of O(n)
// - MUST_FOLLOW traversal: O(k) where k = number of related ADRs
// - Target: < 200ms for /api/v1/task/{id}/constraints
