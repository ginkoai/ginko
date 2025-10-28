// Migration 006: Temporal Relationships
// Purpose: Define temporal/session-based relationships for tracking knowledge evolution
// Date: 2025-10-28
// Dependencies: All node types (001-004)
//
// Note: Relationships in Neo4j are created dynamically by application code.
// This migration documents the relationship types for temporal tracking.

// ============================================================================
// Session-Based Temporal Relationships
// ============================================================================

// CREATED: (Session)-[:CREATED]->(ADR|PRD|Pattern|Gotcha|ContextModule)
// Properties: during_task (string)
// Purpose: Track when knowledge was created

// MODIFIED: (Session)-[:MODIFIED]->(ADR|PRD|CodeFile|ContextModule)
// Properties: changes (string), reason (string)
// Purpose: Track knowledge evolution over time

// DISCOVERED: (Session)-[:DISCOVERED]->(Pattern|Gotcha)
// Purpose: When pattern/gotcha was first identified

// VALIDATED: (Session)-[:VALIDATED]->(Pattern)
// Properties: validation_notes (string)
// Purpose: Pattern was confirmed to work in practice

// ENCOUNTERED: (Session)-[:ENCOUNTERED]->(Gotcha)
// Purpose: Dev hit a known gotcha (increments hit_count)

// LOADED_CONTEXT: (Session)-[:LOADED_CONTEXT]->(ADR|PRD|Pattern|Gotcha|ContextModule)
// Properties: relevance_score (float)
// Purpose: What context was synthesized for session

// WORKED_ON: (Session)-[:WORKED_ON]->(Task)
// Optional: Only if PM integration (Linear, Jira) enabled
// Purpose: Link sessions to external work tracking

// ============================================================================
// File Modification Tracking
// ============================================================================

// MODIFIED_FILE: (Session)-[:MODIFIED_FILE]->(CodeFile)
// Properties: changes_summary (string), lines_changed (int)
// Purpose: Track which files were changed in session

// ============================================================================
// Usage Patterns for Temporal Queries
// ============================================================================

// Timeline of work on a topic:
// MATCH (s:Session)-[r:CREATED|MODIFIED|DISCOVERED]->(n)
// WHERE s.project_id = $projectId AND any(tag IN s.tags WHERE tag = $topic)
// RETURN s.started_at, type(r), n
// ORDER BY s.started_at ASC

// Find all sessions that worked on an ADR:
// MATCH (s:Session)-[:CREATED|MODIFIED]->(adr:ADR {id: $adrId})
// RETURN s
// ORDER BY s.started_at ASC

// Track pattern validation over time:
// MATCH (p:Pattern)<-[:DISCOVERED]-(s1:Session)
// OPTIONAL MATCH (p)<-[:VALIDATED]-(s2:Session)
// RETURN p.title, s1.started_at as discovered_at, collect(s2.started_at) as validated_at
// ORDER BY p.confidence DESC

// Find frequently encountered gotchas:
// MATCH (g:Gotcha)<-[:ENCOUNTERED]-(s:Session)
// RETURN g.title, g.severity, count(s) as times_hit
// ORDER BY times_hit DESC

// ============================================================================
// Relationship Creation Notes
// ============================================================================

// These relationships will be created by:
// 1. Session ingestion during `ginko handoff`
// 2. Real-time tracking during `ginko start` session
// 3. Background analysis jobs for pattern extraction
// 4. Manual curation via dashboard UI

// Application code ensures:
// - Temporal consistency (created_at < modified_at)
// - Hit count increments when ENCOUNTERED created
// - Confidence updates when VALIDATED created
// - Relevance scores computed during LOADED_CONTEXT creation
