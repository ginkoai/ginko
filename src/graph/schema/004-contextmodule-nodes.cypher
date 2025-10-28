// Migration 004: ContextModule Nodes
// Purpose: Add team conventions and best practices tracking
// Date: 2025-10-28
// Dependencies: 001-initial-schema.cypher, 002-pattern-gotcha-nodes.cypher, 003-session-codefile-nodes.cypher

// ============================================================================
// ContextModule Nodes - Team Conventions & Best Practices
// ============================================================================

// ContextModule nodes must have unique IDs
CREATE CONSTRAINT contextmodule_id_unique IF NOT EXISTS
FOR (cm:ContextModule)
REQUIRE cm.id IS UNIQUE;

// Index on ContextModule.project_id for multi-tenancy filtering
CREATE INDEX contextmodule_project_idx IF NOT EXISTS
FOR (cm:ContextModule)
ON (cm.project_id);

// Index on ContextModule.category for filtering by type
CREATE INDEX contextmodule_category_idx IF NOT EXISTS
FOR (cm:ContextModule)
ON (cm.category);

// Index on ContextModule.priority for prioritization
CREATE INDEX contextmodule_priority_idx IF NOT EXISTS
FOR (cm:ContextModule)
ON (cm.priority);

// Full-text search on ContextModule content
CREATE FULLTEXT INDEX contextmodule_fulltext IF NOT EXISTS
FOR (cm:ContextModule)
ON EACH [cm.title, cm.content, cm.summary];

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints
// SHOW CONSTRAINTS;

// Show all indexes
// SHOW INDEXES;
