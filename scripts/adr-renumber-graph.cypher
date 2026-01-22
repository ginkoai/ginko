// ADR Renumbering - Graph Updates
// Generated: 2026-01-22T19:14:23Z
// Run these queries in the Neo4j dashboard after local file updates
//
// IMPORTANT: Run each query separately and verify results

// Renumber: ADR-014-safe-defaults-reflector-pattern → ADR-073-safe-defaults-reflector-pattern
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-014-safe-defaults-reflector-pattern'
SET a.id = 'ADR-073-safe-defaults-reflector-pattern',
    a.title = 'ADR-073: Safe Defaults Pattern for Reflector Pipelines',
    a.name = 'ADR-073: Safe Defaults Pattern for Reflector Pipelines',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-011-backlog-architecture → ADR-070-backlog-architecture
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-011-backlog-architecture'
SET a.id = 'ADR-070-backlog-architecture',
    a.title = 'ADR-070: Git-Native Backlog Architecture',
    a.name = 'ADR-070: Git-Native Backlog Architecture',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-014-enhanced-handoff-quality → ADR-074-enhanced-handoff-quality
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-014-enhanced-handoff-quality'
SET a.id = 'ADR-074-enhanced-handoff-quality',
    a.title = 'ADR-074: Enhanced Handoff Quality Standards',
    a.name = 'ADR-074: Enhanced Handoff Quality Standards',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-013-simple-builder-pattern → ADR-072-simple-builder-pattern
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-013-simple-builder-pattern'
SET a.id = 'ADR-072-simple-builder-pattern',
    a.title = 'ADR-072: Simple Builder Pattern for Pipeline Architecture',
    a.name = 'ADR-072: Simple Builder Pattern for Pipeline Architecture',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-004-browser-extension-strategy → ADR-064-browser-extension-strategy
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-004-browser-extension-strategy'
SET a.id = 'ADR-064-browser-extension-strategy',
    a.title = 'ADR-064: Browser-First Strategy for Claude.ai Integration',
    a.name = 'ADR-064: Browser-First Strategy for Claude.ai Integration',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-008-context-reflexes → ADR-068-context-reflexes
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-008-context-reflexes'
SET a.id = 'ADR-068-context-reflexes',
    a.title = 'ADR-068: Context Reflexes Architecture',
    a.name = 'ADR-068: Context Reflexes Architecture',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-007-phase-context-coherence → ADR-067-phase-context-coherence
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-007-phase-context-coherence'
SET a.id = 'ADR-067-phase-context-coherence',
    a.title = 'ADR-067: Phase Context Coherence',
    a.name = 'ADR-067: Phase Context Coherence',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-026-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration → ADR-076-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-026-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration'
SET a.id = 'ADR-076-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration',
    a.title = 'ADR-076: Enhanced ginko init with Intelligent Project Optimization',
    a.name = 'ADR-076: Enhanced ginko init with Intelligent Project Optimization',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-007-github-search-engine → ADR-066-github-search-engine
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-007-github-search-engine'
SET a.id = 'ADR-066-github-search-engine',
    a.title = 'ADR-066: GitHub-Indexed Search Engine Architecture',
    a.name = 'ADR-066: GitHub-Indexed Search Engine Architecture',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-003-oauth-authentication-architecture → ADR-062-oauth-authentication-architecture
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-003-oauth-authentication-architecture'
SET a.id = 'ADR-062-oauth-authentication-architecture',
    a.title = 'ADR-062: OAuth Authentication Architecture',
    a.name = 'ADR-062: OAuth Authentication Architecture',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-016-handoff-tool-consolidation-and-vibecheck → ADR-075-handoff-tool-consolidation-and-vibecheck
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-016-handoff-tool-consolidation-and-vibecheck'
SET a.id = 'ADR-075-handoff-tool-consolidation-and-vibecheck',
    a.title = 'ADR-075: Handoff Tool Consolidation and Vibecheck Pattern',
    a.name = 'ADR-075: Handoff Tool Consolidation and Vibecheck Pattern',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-012-ginko-command-architecture → ADR-071-ginko-command-architecture
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-012-ginko-command-architecture'
SET a.id = 'ADR-071-ginko-command-architecture',
    a.title = 'ADR-071: Ginko Command Architecture - Structured Freedom',
    a.name = 'ADR-071: Ginko Command Architecture - Structured Freedom',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-003-migration-to-ginkoai → ADR-063-migration-to-ginkoai
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-003-migration-to-ginkoai'
SET a.id = 'ADR-063-migration-to-ginkoai',
    a.title = 'ADR-063: Migration from WatchHill to Ginko AI',
    a.name = 'ADR-063: Migration from WatchHill to Ginko AI',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-009-progressive-context-loading → ADR-069-progressive-context-loading
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-009-progressive-context-loading'
SET a.id = 'ADR-069-progressive-context-loading',
    a.title = 'ADR-069: Progressive Context Loading',
    a.name = 'ADR-069: Progressive Context Loading',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Renumber: ADR-006-continuous-context-invocation → ADR-065-continuous-context-invocation
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-006-continuous-context-invocation'
SET a.id = 'ADR-065-continuous-context-invocation',
    a.title = 'ADR-065: Continuous Context Invocation Pattern',
    a.name = 'ADR-065: Continuous Context Invocation Pattern',
    a.updatedAt = datetime()
RETURN a.id as newId;

// Fix header mismatches (title updates only)
// ADR-008-environment-based-authentication (header said ADR-007)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-008-environment-based-authentication'
  AND a.title STARTS WITH 'ADR-007'
SET a.title = 'ADR-008: Environment-Based Authentication for MCP Endpoints',
    a.name = 'ADR-008: Environment-Based Authentication for MCP Endpoints',
    a.updatedAt = datetime()
RETURN a.id, a.title;

// ADR-009-serverless-first-mvp-architecture (header said ADR-008)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-009-serverless-first-mvp-architecture'
  AND a.title STARTS WITH 'ADR-008'
SET a.title = 'ADR-009: Serverless-First Architecture for MVP',
    a.name = 'ADR-009: Serverless-First Architecture for MVP',
    a.updatedAt = datetime()
RETURN a.id, a.title;

// Delete moved/obsolete supplementary docs from graph (if they exist)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id IN ['ADR-033-implementation-guide', 'ADR-033-implementation-plan', 'ADR-033-implementation-summary']
DETACH DELETE a
RETURN count(*) as deleted;

// Validation: Count ADRs after renumbering
MATCH (a:ADR)
WHERE a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(a) as adrCount;

