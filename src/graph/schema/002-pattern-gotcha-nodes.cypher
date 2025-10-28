// Migration 002: Pattern and Gotcha Nodes
// Purpose: Add learning capture and pitfall tracking
// Date: 2025-10-28
// Dependencies: 001-initial-schema.cypher

// ============================================================================
// Pattern Nodes - Reusable Learnings
// ============================================================================

// Pattern nodes must have unique IDs
CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
FOR (p:Pattern)
REQUIRE p.id IS UNIQUE;

// Index on Pattern.project_id for multi-tenancy filtering
CREATE INDEX pattern_project_idx IF NOT EXISTS
FOR (p:Pattern)
ON (p.project_id);

// Index on Pattern.category for filtering by type
CREATE INDEX pattern_category_idx IF NOT EXISTS
FOR (p:Pattern)
ON (p.category);

// Index on Pattern.confidence for quality filtering
CREATE INDEX pattern_confidence_idx IF NOT EXISTS
FOR (p:Pattern)
ON (p.confidence);

// Full-text search on Pattern content
CREATE FULLTEXT INDEX pattern_fulltext IF NOT EXISTS
FOR (p:Pattern)
ON EACH [p.title, p.content, p.context];

// ============================================================================
// Gotcha Nodes - Pitfalls and Traps
// ============================================================================

// Gotcha nodes must have unique IDs
CREATE CONSTRAINT gotcha_id_unique IF NOT EXISTS
FOR (g:Gotcha)
REQUIRE g.id IS UNIQUE;

// Index on Gotcha.project_id for multi-tenancy filtering
CREATE INDEX gotcha_project_idx IF NOT EXISTS
FOR (g:Gotcha)
ON (g.project_id);

// Index on Gotcha.severity for prioritization
CREATE INDEX gotcha_severity_idx IF NOT EXISTS
FOR (g:Gotcha)
ON (g.severity);

// Index on Gotcha.hit_count for identifying frequent issues
CREATE INDEX gotcha_hit_count_idx IF NOT EXISTS
FOR (g:Gotcha)
ON (g.hit_count);

// Full-text search on Gotcha content
CREATE FULLTEXT INDEX gotcha_fulltext IF NOT EXISTS
FOR (g:Gotcha)
ON EACH [g.title, g.symptom, g.cause, g.solution];

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints
// SHOW CONSTRAINTS;

// Show all indexes
// SHOW INDEXES;
