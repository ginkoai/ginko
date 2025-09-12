---
id: FEATURE-029
type: feature
title: Implement Core Workflow Domain Reflections
status: todo
priority: critical
created: '2025-09-12T13:40:00.000Z'
updated: '2025-09-12T13:40:00.000Z'
size: XL
author: chris@watchhill.ai
tags: [reflection, domains, workflow, productivity]
---

# Implement Core Workflow Domain Reflections

## Problem Statement
Developers need reflection patterns for their actual daily workflows. While we have backlog and documentation domains, we're missing critical domains that map to real development cycles: PRD (WHY), Architecture (WHAT), Sprint Planning (HOW/WHO/WHEN), Overview (BIG PICTURE), Testing, and Git workflows.

## Solution
Implement six core domain reflections that match actual development workflow:

### 1. PRD Domain (The WHY)
```bash
ginko reflect --domain prd "optimize checkout flow performance"
```
Generates:
- Pain points and user frustrations
- UX and functional gaps
- Desired future outcomes
- Value assessment (ROI, metrics)
- Success criteria
- Solutions considered
- Trade-offs and decisions

### 2. Architecture Domain (The WHAT)
```bash
ginko reflect --domain architecture "microservices migration strategy"
```
Generates:
- ADRs with proper numbering
- System design diagrams (mermaid/plantuml)
- Code examples and patterns
- Integration points
- Technology choices
- Security considerations
- Performance requirements

### 3. Sprint Planning Domain (The HOW/WHO/WHEN)
```bash
ginko reflect --domain sprint "Q4 authentication overhaul"
```
Generates:
- Work breakdown structure
- Backlog item creation/linkage
- Task dependencies
- Team assignments
- Time estimates
- Sprint goals
- Risk mitigation

### 4. Overview Domain (The BIG PICTURE)
```bash
ginko reflect --domain overview "current system architecture"
```
Generates:
- System overview documentation
- Complete architecture diagrams
- Architectural principles
- Component relationships
- Data flow diagrams
- Deployment topology
- **Critical for AI context**

### 5. Testing Domain
```bash
ginko reflect --domain testing "payment processing module"
```
Generates:
- Unit test suites
- Integration test scenarios
- UAT test plans
- Test data fixtures
- Mock implementations
- Coverage requirements

### 6. Git Domain
```bash
ginko reflect --domain git "implement feature-029"
```
Generates:
- Branch naming
- Commit messages linked to backlog
- PR descriptions with ADR/PRD references
- Merge strategies
- Release notes

## Success Criteria
- [ ] Each domain has specific ReflectionCommand implementation
- [ ] Templates capture real-world requirements
- [ ] Context gathering is domain-appropriate
- [ ] Output can be directly used in development
- [ ] Integration with existing backlog/ADR systems
- [ ] Clear linkage between domains (PRD→Architecture→Sprint)
- [ ] 50% reduction in document creation time

## Technical Implementation

### Domain Registry Update
```typescript
type ReflectionDomain = 
  | 'prd'           // Product Requirements
  | 'architecture'  // Technical Design
  | 'sprint'        // Planning & Execution
  | 'overview'      // System Documentation
  | 'testing'       // Test Generation
  | 'git'           // Version Control
  | 'backlog'       // Existing
  | 'documentation' // Existing
```

### Context Flow
```
PRD → Architecture → Sprint Planning → Implementation
  ↓         ↓            ↓                   ↓
Overview ← Testing ← Git Workflows ← Backlog Items
```

### Template Structure
Each domain needs:
1. Intent parser (understanding the ask)
2. Context gatherer (relevant information)
3. Template loader (structure/requirements)
4. Validation rules (quality checks)
5. Cross-domain linker (references)

## Dependencies
- Existing reflection pattern infrastructure
- Backlog system for item creation
- ADR numbering system
- Git integration for branch/commit info

## Implementation Order
1. **Architecture** ✅ (ADRs are immediately useful) - DONE
2. **PRD** (Foundation for features - use for planning remaining domains)
3. **Sprint Planning** (Break down the work for implementing domains)
4. **Testing** (Generate tests for our reflection implementations)
5. **Git** (Automate commits/PRs for this feature)
6. **Overview** (Document the complete reflection system)

## Validation
- Each domain tested with real use cases
- Output reviewed by development team
- Integration tested with existing tools
- Performance metrics (time saved)
- Quality metrics (completeness, accuracy)

## Related Items
- FEATURE-020: Git-Native Backlog System
- ADR-021: No Role Prompting Decision
- Universal Reflection Pattern documentation

## Notes
- Focus on practical, daily use cases
- Templates should be opinionated but customizable
- Each domain should take <100 lines to implement
- Reuse context gathering where possible
- Consider template versioning for evolution