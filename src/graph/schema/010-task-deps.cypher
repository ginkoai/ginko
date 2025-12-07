// Migration 010: Task Dependencies for EPIC-004 Sprint 4
// Purpose: Enable task orchestration with dependency tracking
// Date: 2025-12-07
// Related: EPIC-004 Sprint 4 TASK-2

// ============================================================================
// Relationship Documentation
// ============================================================================

// DEPENDS_ON: Task depends on another Task
// - Direction: (t1:Task)-[:DEPENDS_ON]->(t2:Task)
// - Properties: created_at (timestamp)
// - Purpose: Track task dependencies for orchestration
// - Usage: Task execution must wait until all dependencies are complete

// ASSIGNED_TO: Task is assigned to an Agent by orchestrator
// - Direction: (t:Task)-[:ASSIGNED_TO]->(a:Agent)
// - Properties: assigned_by, assigned_at, priority
// - Purpose: Track task assignments in supervisor pattern
// - Usage: Orchestrator assigns tasks to specific agents

// ============================================================================
// Relationship Index (Performance Optimization)
// ============================================================================

// Index on DEPENDS_ON relationships for fast dependency queries
// Note: Relationship indexes may not be available on Neo4j Free Tier
// If unavailable, queries will still work but may be slower

// CREATE INDEX rel_depends_on IF NOT EXISTS
// FOR ()-[r:DEPENDS_ON]->()
// ON (r.created_at);

// ============================================================================
// Validation Queries
// ============================================================================

// Query 1: Find all dependencies for a specific task
// MATCH (t:Task {id: 'TASK-3'})-[:DEPENDS_ON]->(dep:Task)
// RETURN dep.id, dep.status

// Query 2: Find tasks with no dependencies (can start immediately)
// MATCH (t:Task)
// WHERE NOT EXISTS { (t)-[:DEPENDS_ON]->() }
// AND t.status <> 'complete'
// RETURN t.id, t.title

// Query 3: Detect circular dependencies (should return empty)
// MATCH path=(t:Task)-[:DEPENDS_ON*]->(t)
// RETURN [node in nodes(path) | node.id] AS cycle

// Query 4: Find available tasks (all dependencies complete)
// MATCH (t:Task)
// WHERE t.status IN ['pending', 'available']
// AND NOT EXISTS {
//   MATCH (t)-[:DEPENDS_ON]->(dep:Task)
//   WHERE dep.status <> 'complete'
// }
// RETURN t.id, t.title
// ORDER BY t.priority DESC

// Query 5: Find tasks assigned to a specific agent
// MATCH (t:Task)-[:ASSIGNED_TO]->(a:Agent {id: $agentId})
// RETURN t.id, t.title, t.status

// ============================================================================
// Usage Examples
// ============================================================================

// Create DEPENDS_ON relationship between tasks:
//
// MATCH (t1:Task {id: 'TASK-3'})
// MATCH (t2:Task {id: 'TASK-1'})
// CREATE (t1)-[:DEPENDS_ON {created_at: timestamp()}]->(t2)
//
// MATCH (t1:Task {id: 'TASK-3'})
// MATCH (t3:Task {id: 'TASK-2'})
// CREATE (t1)-[:DEPENDS_ON {created_at: timestamp()}]->(t3)

// Create ASSIGNED_TO relationship:
//
// MATCH (t:Task {id: 'TASK-1', status: 'available'})
// MATCH (a:Agent {id: $agentId})
// CREATE (t)-[:ASSIGNED_TO {
//   assigned_by: $orchestratorId,
//   assigned_at: datetime(),
//   priority: $priority
// }]->(a)
// SET t.status = 'assigned'

// ============================================================================
// Performance Notes
// ============================================================================

// Expected query performance:
// - Find dependencies for one task: O(d) where d = number of dependencies
// - Find available tasks: O(t * d) where t = total tasks, d = avg dependencies
// - Detect circular deps: O(t * d) worst case
// - Target: < 100ms for dependency queries in sprints with < 50 tasks

// ============================================================================
// Schema Constraints
// ============================================================================

// Dependencies must reference existing tasks (enforced at application level)
// Circular dependencies are detected and rejected (enforced at application level)
// Missing dependencies generate warnings (enforced at application level)
