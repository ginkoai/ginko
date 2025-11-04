# ADR-040: Work Tracking Integration Strategy

## Status
Proposed

## Date
2025-10-24

## Context

### The Problem with Git-Native Work Tracking

Ginko currently implements git-native backlog and sprint management using sequential IDs (TASK-001, FEATURE-002, etc.). While this works for solo developers, it has fundamental limitations for teams:

**Sequential ID Conflicts:**
```
Team Scenario:
1. Alice pulls latest code (has TASK-016)
2. Bob pulls latest code (has TASK-016)
3. Alice creates new task → generates TASK-017
4. Bob creates new task → generates TASK-017
5. Both commit → Git conflict
```

**Real-Time Expectations:**
- Modern teams expect live updates (Linear, Jira, GitHub Projects)
- Git-native requires commit/pull cycles for visibility
- Knowledge gaps between commits grow with team size

**Mature Alternatives Exist:**
- Linear, Jira, and GitHub Projects are established, feature-rich
- Teams already use these tools
- Competing with them is not Ginko's unique value

### Ginko's Unique Value: AI-Native Knowledge Management

Our strategic insight from ADR-039:

**Ginko Is:**
- ✅ AI-Native Knowledge Management (ADRs, PRDs, Modules)
- ✅ Vendor-Neutral AI Interface (works with any AI model)
- ✅ Git-Native Documentation (versioned with code)

**Ginko Is NOT:**
- ❌ Project management tool
- ❌ Real-time collaboration platform
- ❌ Replacement for Linear/Jira

**Strategic Positioning:** "Terraform for AI" - vendor-neutral interface that integrates with existing tools

## Decision

**Integrate with existing work tracking tools rather than competing with them.**

### Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│  Ginko Core (Knowledge Management)                  │
│  ├── ADRs (git-native)                              │
│  ├── PRDs (git-native)                              │
│  ├── Context Modules (git-native)                   │
│  └── Session Logs (git-native)                      │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  Work Integration Layer (API-Based)                 │
│  ├── Linear API                                     │
│  ├── Jira API                                       │
│  ├── GitHub Projects API                            │
│  ├── Asana API                                      │
│  └── Local Fallback (git-native for solo devs)     │
└─────────────────────────────────────────────────────┘
```

### Integration Approach

**Knowledge documents reference external work, don't duplicate it:**

```markdown
# docs/adr/ADR-039-graph-based-context-discovery.md
---
status: proposed
tags: [knowledge-graph, graphql]
tracked-in:
  - provider: linear
    id: LIN-123
    url: https://linear.app/ginko/issue/LIN-123
---

## Decision
Implement knowledge discovery graph...
```

**CLI commands integrate seamlessly:**

```bash
# Configuration
ginko config set work.provider linear
ginko config set work.apiKey $LINEAR_API_KEY

# Work commands route to configured provider
ginko work create "Add auth"     # → Creates in Linear
ginko work list --status=todo    # → Fetches from Linear
ginko work update LIN-123 --status=done

# Solo dev fallback
ginko config set work.provider local  # Uses git-native
```

### Migration Path

**Phase 1: Keep Current Backlog (Short Term)**
- ADR-039 implements knowledge graph (excludes work tracking)
- Current git-native backlog remains functional
- Teams acknowledge sequential ID limitation
- Document workarounds (UUID-based IDs, pull-before-create discipline)

**Phase 2: Add Integration Layer (Medium Term)**
- Build integration adapters for Linear, Jira, GitHub Projects
- Keep local backlog as fallback for solo developers
- Teams can choose their work tracking tool

**Phase 3: Recommend External Tools (Long Term)**
- Documentation recommends Linear/Jira for teams
- Local backlog maintained only for solo devs
- Ginko focuses development on knowledge management + integration

## Alternatives Considered

### Alternative 1: UUID-Based IDs (Git-Native)
```bash
# Instead of: TASK-017
# Use: TASK-f47ac10b (first 8 chars of UUID)
```

**Pros:**
- Zero conflicts (cryptographically unique)
- Still git-native
- No external dependencies

**Cons:**
- Loses sequential mental model
- Less human-readable
- Can't easily see "latest task"
- Doesn't solve real-time collaboration

**Verdict:** Solves conflicts but doesn't address core limitation (git is not real-time)

### Alternative 2: Hybrid (Local + Optional SaaS Sync)
```
Local Layer:  Git-native files (works offline)
              ↕ (Optional bidirectional sync)
SaaS Layer:   Real-time sync, centralized IDs
```

**Pros:**
- Best of both worlds
- Works offline
- Real-time when online

**Cons:**
- High complexity (sync conflicts, merge strategies)
- Maintenance burden
- Reinventing what Linear/Jira already do

**Verdict:** Over-engineering - integrating is simpler

### Alternative 3: Accept Git Workflow Discipline
```bash
# Protocol:
1. Always `git pull` before `ginko backlog create`
2. Conflicts resolved via git merge
3. Teams learn discipline
```

**Pros:**
- Simple architecture
- Embraces git as collaboration protocol
- Forces good git hygiene

**Cons:**
- Friction for teams
- Doesn't scale beyond 3-5 people
- Modern tools set higher expectations

**Verdict:** Viable for tiny teams, but limiting growth

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Design integration adapter interface
- [ ] Implement Linear adapter (most requested)
- [ ] Add `ginko config set work.provider`
- [ ] Document migration guide

### Phase 2: Additional Providers (Week 3-4)
- [ ] Implement Jira adapter
- [ ] Implement GitHub Projects adapter
- [ ] Add provider auto-detection
- [ ] CLI commands route to configured provider

### Phase 3: Knowledge Graph Integration (Week 5-6)
- [ ] Add `ExternalWorkReference` nodes to graph (ADR-039)
- [ ] Implement `tracked-in` frontmatter support
- [ ] Query external work via graph
- [ ] Cache external work metadata

### Phase 4: Local Fallback (Week 7-8)
- [ ] Keep current git-native backlog as `local` provider
- [ ] Document when to use local vs external
- [ ] Maintain feature parity for solo devs

## Success Metrics

1. **Provider Adoption**: 70%+ of teams use external providers (Linear, Jira, GitHub)
2. **Solo Dev Satisfaction**: Local provider rated 4+/5 for solo developers
3. **Integration Quality**: External work data syncs in <2 seconds
4. **Reduced Conflicts**: Zero sequential ID conflicts for teams using external providers
5. **Team Growth**: Ginko supports teams of 10+ people (vs current limit of ~3)

## Consequences

### Positive
1. ✅ **Eliminates sequential ID conflicts** for teams
2. ✅ **Real-time collaboration** via existing tools
3. ✅ **Reduces development burden** (don't build project management features)
4. ✅ **Focus on unique value** (knowledge management, AI collaboration)
5. ✅ **Integrates with existing workflows** (teams keep their tools)

### Negative
1. ❌ **External dependency** for teams (requires Linear/Jira account)
2. ❌ **API rate limits** (cached data may be stale)
3. ❌ **Complexity** (multiple adapters to maintain)
4. ❌ **Migration effort** (teams must move from local backlog)

### Neutral
1. ⚪ **Solo devs unaffected** (local provider remains)
2. ⚪ **Git-native knowledge preserved** (ADRs, PRDs, Modules still in git)
3. ⚪ **Learning curve** (teams must configure provider)

## References

### Strategic Context
- **[Strategic Vision 2025](../strategy/STRATEGIC-VISION-2025.md)** - Cloud-first platform strategy, bottom-up GTM
- **[ADR-039](./ADR-039-graph-based-context-discovery.md)** - Knowledge discovery graph (complements work integration)

### External Resources
- Terraform's multi-cloud architecture (strategic inspiration)
- Linear API: https://developers.linear.app/
- Jira API: https://developer.atlassian.com/cloud/jira/
- GitHub Projects API: https://docs.github.com/en/graphql

---

**Proposed by:** Chris Norton & Claude (Session: 2025-10-24)
**Decision Date:** TBD (awaiting ADR-039 implementation)
**Implementation Start:** TBD (after ADR-039 Phase 1)

---

## 📋 Addendum: Updated Implementation Timeline (2025-11-02)

**Status:** Deferred to Q2 2025

### Strategic Decision Impact

Following the decision in ADR-039 Addendum (2025-11-02) to proceed with **on-platform knowledge management first**, this ADR's implementation timeline has been updated.

### Revised Timeline

**MVP Phase (Nov 2025 - Jan 2025):**
- ✅ Focus on on-platform knowledge CRUD (ADR, PRD, Pattern, Gotcha, ContextModule)
- ✅ Git-native local backlog remains as fallback for solo developers
- ✅ No external integrations yet - validate core value first

**Integration Phase (Q2 2025):**
- 📊 Collect user data: "Which PM tool do you use?"
- 📊 Validate integration demand: "Would you pay for Linear/Jira integration?"
- 🔧 Build adapters based on actual user demand (data-driven)

### Decision Rationale

**Why defer integrations:**
1. **Validate core value first** - Prove knowledge graph + semantic search delivers value before adding integration complexity
2. **Faster time to market** - 2-3 weeks to MVP vs 6-8 weeks with integrations
3. **Data-driven prioritization** - Let user demand dictate which integrations to build
4. **Lower risk** - No dependence on external API stability for MVP launch

**Integration strategy remains valid:**
- Architecture design from this ADR is still accurate
- Adapter pattern will be used when integrations are built
- Local backlog fallback preserved for solo developers
- "Integrate don't compete" philosophy unchanged

### Updated Implementation Plan

**Current (Week 2-4, Nov 2025):**
```bash
# On-platform knowledge management
ginko adr create "Decision title"     # Creates in Neo4j cloud graph
ginko pattern add "Pattern name"      # Creates in Neo4j cloud graph
ginko knowledge search "query"        # Searches cloud graph

# Local backlog still available for solo devs
ginko backlog create "Task name"      # Git-native local storage
```

**Q2 2025 (After MVP validation):**
```bash
# External integrations (if user demand validates)
ginko config set work.provider linear
ginko work create "Add auth"          # Creates in Linear
ginko work list --status=todo         # Fetches from Linear
```

### Success Criteria for Integration Phase

**Pre-requisites for starting integration work:**
1. ✅ 50+ active users using on-platform knowledge management
2. ✅ 60%+ of survey respondents request Linear/Jira integration
3. ✅ Core knowledge graph features stable (CRUD, search, relationships)
4. ✅ Product-market fit validated for knowledge management

**Integration quality metrics:**
5. External work data syncs in <2 seconds
6. Zero breaking changes to existing on-platform users
7. Feature parity between providers (Linear, Jira, local)

### References

- **[ADR-039 Addendum: On-Platform Knowledge Management Strategy](./ADR-039-graph-based-context-discovery.md#-addendum-on-platform-knowledge-management-strategy-2025-11-02)** - Strategic decision documentation
- **[SPRINT-2025-10-27: Cloud Knowledge Graph](../sprints/SPRINT-2025-10-27-cloud-knowledge-graph.md)** - Current implementation focus

---

**Addendum By:** Chris Norton & Claude (Session: 2025-11-02)
**Status:** Timeline Updated - Integration deferred to Q2 2025
**Next Review:** After MVP launch (Jan 2025) with user feedback data
