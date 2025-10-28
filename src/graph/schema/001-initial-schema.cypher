// Migration 001: Initial Schema for Prototype
// Purpose: Minimal schema to test context loading query
// Date: 2025-10-27

// ============================================================================
// Constraints (Uniqueness)
// ============================================================================

// ADR nodes must have unique IDs
CREATE CONSTRAINT adr_id_unique IF NOT EXISTS
FOR (a:ADR)
REQUIRE a.id IS UNIQUE;

// PRD nodes must have unique IDs
CREATE CONSTRAINT prd_id_unique IF NOT EXISTS
FOR (p:PRD)
REQUIRE p.id IS UNIQUE;

// ============================================================================
// Indexes (Performance)
// ============================================================================

// Index on ADR.project_id for multi-tenancy filtering
CREATE INDEX adr_project_idx IF NOT EXISTS
FOR (a:ADR)
ON (a.project_id);

// Index on ADR.status for filtering active decisions
CREATE INDEX adr_status_idx IF NOT EXISTS
FOR (a:ADR)
ON (a.status);

// Index on PRD.project_id for multi-tenancy filtering
CREATE INDEX prd_project_idx IF NOT EXISTS
FOR (p:PRD)
ON (p.project_id);

// Index on PRD.status for filtering active PRDs
CREATE INDEX prd_status_idx IF NOT EXISTS
FOR (p:PRD)
ON (p.status);

// Full-text search on ADR content
CREATE FULLTEXT INDEX adr_fulltext IF NOT EXISTS
FOR (a:ADR)
ON EACH [a.title, a.content, a.summary];

// Full-text search on PRD content
CREATE FULLTEXT INDEX prd_fulltext IF NOT EXISTS
FOR (p:PRD)
ON EACH [p.title, p.content, p.summary];

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints
// SHOW CONSTRAINTS;

// Show all indexes
// SHOW INDEXES;
