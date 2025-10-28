// Migration 005: Semantic Relationships
// Purpose: Define semantic relationships between knowledge artifacts
// Date: 2025-10-28
// Dependencies: All node types (001-004)
//
// Note: Relationships in Neo4j are created dynamically by application code.
// This migration documents the relationship types and creates useful indexes.

// ============================================================================
// Semantic Relationships - Knowledge Connections
// ============================================================================

// IMPLEMENTS: (ADR)-[:IMPLEMENTS]->(PRD)
// Properties: description (string), completeness (float)
// Purpose: Track how decisions realize requirements

// REFERENCES: (ADR)-[:REFERENCES]->(ADR)
// Properties: context (string), relationship (string)
// Purpose: Knowledge builds on other knowledge
// Relationship values: "builds_on" | "conflicts_with" | "supersedes"

// SIMILAR_TO: (ADR|Pattern|Gotcha|Session)-[:SIMILAR_TO]->(Same Type)
// Properties: similarity (float), computed_at (datetime)
// Purpose: Enable "find related" queries (AI-computed)

// CONFLICTS_WITH: (ADR)-[:CONFLICTS_WITH]->(ADR)
// Properties: explanation (string)
// Purpose: Surface contradictions

// ============================================================================
// Implementation Relationships - Code Links
// ============================================================================

// REALIZED_BY: (ADR)-[:REALIZED_BY]->(CodeFile)
// Properties: file_section (string), lines (string)
// Purpose: Where decisions live in code

// EXHIBITS_PATTERN: (CodeFile)-[:EXHIBITS_PATTERN]->(Pattern)
// Properties: example_quality (string)
// Purpose: Code demonstrates pattern
// Quality values: "canonical" | "good" | "antipattern"

// ============================================================================
// Learning Relationships - Pattern Discovery
// ============================================================================

// LEARNED_FROM: (Pattern)-[:LEARNED_FROM]->(Session)
// Properties: extraction_confidence (float)
// Purpose: Track pattern origin

// APPLIES_TO: (Pattern)-[:APPLIES_TO]->(ADR|CodeFile)
// Purpose: Where pattern is relevant

// MITIGATED_BY: (Gotcha)-[:MITIGATED_BY]->(Pattern|ADR)
// Purpose: How to avoid gotcha

// SOLVED_SIMILAR_PROBLEM: (Session)-[:SOLVED_SIMILAR_PROBLEM]->(Session)
// Properties: similarity (float)
// Purpose: Find sessions that tackled similar challenges

// ============================================================================
// Relationship Property Indexes (for query performance)
// ============================================================================

// Index on SIMILAR_TO.similarity for threshold filtering
// Note: Neo4j Community Edition has limited relationship indexing
// These will be useful when we upgrade to Enterprise or use Composite Database

// For now, relationships will be created dynamically without explicit indexes
// Application code will handle relationship creation with proper properties

// ============================================================================
// Validation Queries
// ============================================================================

// Show all relationship types:
// CALL db.relationshipTypes()

// Count relationships by type:
// MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC
