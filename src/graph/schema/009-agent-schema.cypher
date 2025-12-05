// Migration 009: Agent Nodes for EPIC-004 AI-to-AI Collaboration
// Purpose: Multi-agent coordination infrastructure
// Date: 2025-12-05
// Related: EPIC-004 Sprint 1 TASK-1

// ============================================================================
// Constraints (Uniqueness)
// ============================================================================

// Agent nodes must have unique IDs
CREATE CONSTRAINT agent_id_unique IF NOT EXISTS
FOR (a:Agent)
REQUIRE a.id IS UNIQUE;

// ============================================================================
// Indexes (Performance)
// ============================================================================

// Index on Agent.organization_id for multi-tenancy and scoped queries
CREATE INDEX agent_organization_idx IF NOT EXISTS
FOR (a:Agent)
ON (a.organization_id);

// Index on Agent.project_id for project-scoped queries
CREATE INDEX agent_project_idx IF NOT EXISTS
FOR (a:Agent)
ON (a.project_id);

// Index on Agent.status for filtering active/idle agents
CREATE INDEX agent_status_idx IF NOT EXISTS
FOR (a:Agent)
ON (a.status);

// Index on Agent.last_heartbeat for detecting stale agents
CREATE INDEX agent_heartbeat_idx IF NOT EXISTS
FOR (a:Agent)
ON (a.last_heartbeat);

// ============================================================================
// Relationship Documentation
// ============================================================================

// CLAIMED_BY: Task claimed by Agent
// - Direction: (t:Task)-[:CLAIMED_BY]->(a:Agent)
// - Properties: claimed_at (timestamp), priority (number)
// - Purpose: Track which agent is working on which task

// ASSIGNED_TO: Agent assigned to Project/Organization
// - Direction: (a:Agent)-[:ASSIGNED_TO]->(p:Project)
// - Properties: assigned_at (timestamp), role (string)
// - Purpose: Track agent assignments

// COLLABORATED_WITH: Agent collaborated with another Agent
// - Direction: (a1:Agent)-[:COLLABORATED_WITH]->(a2:Agent)
// - Properties: session_id (string), started_at (timestamp), ended_at (timestamp)
// - Purpose: Track multi-agent collaboration sessions

// ============================================================================
// Agent Properties Schema
// ============================================================================

// Required Properties:
// - id: string (UUID) - Unique agent identifier
// - name: string - Human-readable agent name
// - model: string - AI model identifier (e.g., "claude-sonnet-4-5")
// - provider: string - AI provider (e.g., "anthropic")
// - status: string - Current status: "active" | "idle" | "offline" | "error"
// - organization_id: string - Organization scope
// - project_id: string - Project scope (optional, null for org-level agents)
// - created_at: number - Unix timestamp of agent creation
// - last_heartbeat: number - Unix timestamp of last activity

// Optional Properties:
// - capabilities: string[] - List of agent capabilities (e.g., ["code", "design", "review"])
// - metadata: object - Additional agent metadata (JSON)
// - max_concurrent_tasks: number - Max tasks agent can handle simultaneously
// - current_task_count: number - Current number of active tasks

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// Show all constraints: SHOW CONSTRAINTS;
// Show all indexes: SHOW INDEXES;
//
// Expected performance improvement:
// - Agent lookup by ID: O(1) via unique constraint
// - Filter by organization: O(log n) via organization_idx
// - Filter by status: O(log n) via status_idx
// - Detect stale agents: O(log n) via heartbeat_idx
// - Target: < 50ms for agent availability queries
