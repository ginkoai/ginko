---
type: decision
status: proposed
updated: 2025-11-03
tags: [knowledge-graph, ai-assistance, typed-relationships, methodology, quality]
related: [ADR-039-graph-based-context-discovery.md, ADR-002-ai-optimized-file-discovery.md, ADR-033-context-pressure-mitigation-strategy.md]
priority: critical
audience: [developer, ai-agent, stakeholder]
estimated-read: 15-min
dependencies: [ADR-039, ADR-002]
---

# ADR-042: AI-Assisted Knowledge Graph Quality Through Typed Relationships

**Status:** Proposed
**Date:** 2025-11-03
**Authors:** Claude (AI Assistant), Chris Norton
**Reviewers:** Chris Norton
**Related:** ADR-039 (Knowledge Discovery Graph), ADR-002 (AI-Optimized File Discovery)

## Context

### Problem Statement

Analysis of the Hetzner Neo4j knowledge graph (83 nodes, 1,892 relationships) revealed that **generic similarity relationships dominate** while **high-value typed relationships are scarce**:

**Current State:**
- 97.3% (1,840) generic SIMILAR_TO relationships
- 2.7% (52) typed relationships (IMPLEMENTS, REFERENCES, SUPERSEDES)
- 51% of SIMILAR_TO relationships below 0.75 quality threshold
- Duplicate relationships inflating counts
- Current similarity threshold (0.60) too permissive

**Quality Distribution:**
- Excellent (0.85+): 205 relationships (11.1%)
- High (0.75-0.85): 667 relationships (36.3%)
- Moderate (0.65-0.75): 48 relationships (2.6%)
- Low/Unknown (<0.65): ~920 relationships (50.0%)

**Impact on AI Partner Performance:**
Following 1,840 generic SIMILAR_TO links creates **information overload** and **context over-fetching**. The 52 typed relationships provide **10x more navigation value** but represent only 3% of the graph.

### Business Context

**Ginko's core value proposition:** AI-optimized knowledge management enabling rapid context discovery.

**The challenge:** How do we ensure teams create **high-quality knowledge structures** without imposing heavy methodology that kills velocity?

**Key insight from this session:** When the AI partner offered to create an ADR at the right moment (after relationship analysis), it demonstrated the **natural enforcement mechanism** - AI creates structure during collaboration, not humans after the fact.

**What teams need:**
1. **Fast AI context discovery** - Precise typed relationships, not similarity noise
2. **Preserved decision rationale** - Between-document WHY→WHAT→HOW architecture
3. **Lightweight methodology** - Structure emerges from AI assistance, not gates
4. **Flow-preserving** - Documentation happens in-stride, not as separate task

### Technical Context

**Between-Document WHY→WHAT→HOW Architecture:**

```
PRD (WHY)           ─ Business need, user value, success criteria
  ↓ IMPLEMENTS
ADR (WHAT)          ─ Architectural solution, alternatives, trade-offs
  ↓ GUIDES
Sprint Plan (HOW)   ─ Work breakdown, tasks, acceptance criteria
  ↓ PRODUCES
Pattern (HOW)       ─ Reusable implementation, code examples
  ↓ APPLIES_TO
CodeFile            ─ Concrete implementation
```

**This traversable graph enables AI to:**
- Start at PRD → understand business WHY
- Follow IMPLEMENTS → see architectural WHAT
- Follow GUIDES → understand implementation HOW
- Follow APPLIES_TO → find reusable patterns

**Current relationship creation** (`scripts/create-relationships-hetzner.ts:110`):
```typescript
const similar = await client.semanticSearch(doc.embedding, {
  limit: 6,           // Top 6 similar (5 excluding self)
  threshold: 0.60,    // ← Too permissive
  types: ['ADR', 'PRD', 'Pattern']
});

// Creates SIMILAR_TO relationships only
// No typed relationships (IMPLEMENTS, REFERENCES, etc.)
```

**Root causes:**
1. **Automated similarity only** - No AI-assisted typed relationship creation
2. **Low similarity threshold** - Captures weak connections (0.60)
3. **No relationship metadata** - No context on WHY links exist
4. **After-the-fact creation** - Relationships created in batch, not during collaboration
5. **No duplicate prevention** - Same relationships created multiple times

### Key Requirements

1. **Increase typed relationships** - From 3% to 40%+ of total relationships
2. **Reduce similarity noise** - Eliminate low-quality SIMILAR_TO (<0.75)
3. **AI-assisted creation** - Typed relationships created during collaboration
4. **Relationship metadata** - Capture WHY relationships exist
5. **Lightweight enforcement** - Structure emerges naturally, not forced
6. **Fast context discovery** - AI can navigate WHY→WHAT→HOW without over-fetching

## Decision

We adopt **AI-assisted knowledge graph construction** where AI partners proactively create typed relationships during collaboration, making structure emerge naturally rather than requiring human compliance with heavy methodology.

### Chosen Solution

**Two-Layer Strategy:**

#### Layer 1: AI-Assisted Typed Relationship Creation (Primary)

**AI Partner Responsibilities:**
AI partners (like Claude) become **active knowledge graph curators** by:

1. **Proactive relationship questioning during document creation:**
   ```
   Human: "Create ADR for graph quality improvements"
   AI: "Which PRD does this implement?"
   Human: "PRD-010: Cloud-First Knowledge Graph"
   AI: Creates ADR-042 with IMPLEMENTS relationship to PRD-010
   ```

2. **In-stride documentation at insight moments:**
   ```
   [After analysis reveals pattern]
   AI: "This analysis shows a clear pattern. Should I create an ADR
        to capture these insights?"
   Human: "Yes"
   AI: Creates ADR, adds REFERENCES to analysis, BUILDS_ON previous ADRs
   ```

3. **Cross-reference detection and suggestion:**
   ```
   AI: "I notice ADR-042 references graph quality concepts from ADR-039.
        Should I create a REFERENCES relationship?"
   Human: "Yes, and it also builds on ADR-002's frontmatter approach"
   AI: Creates both typed relationships with context
   ```

4. **Pattern application recognition:**
   ```
   [During code implementation]
   AI: "This connection pooling pattern APPLIES_TO the serverless
        architecture in ADR-009. Should I link them?"
   Human: "Definitely"
   AI: Creates APPLIES_TO relationship with implementation context
   ```

5. **Relationship metadata creation:**
   ```typescript
   {
     type: 'IMPLEMENTS',
     source: 'ADR-042',
     target: 'PRD-010',
     context: 'ADR-042 implements relationship quality requirements from PRD-010',
     created_by: 'ai-assistant',
     created_during: 'session-2025-11-03',
     confidence: 0.95
   }
   ```

**Human Responsibilities:**
- Provide business context (WHY we're solving this)
- Make strategic decisions (WHAT solution to choose)
- Validate AI suggestions (yes/no on relationships)
- Correct misunderstandings (no, this implements PRD-011, not PRD-010)

#### Layer 2: Technical Similarity Quality (Foundation)

**Similarity threshold tuning:**
- Raise threshold: 0.60 → 0.75 (eliminate weak connections)
- Reduce top-K: 5 → 3 (quality over quantity)
- Add duplicate prevention (uniqueness constraints)
- Keep similarity for serendipitous discovery (don't eliminate entirely)

**Result:** ~400 high-quality SIMILAR_TO relationships (down from 1,840) providing exploratory navigation alongside ~200 typed relationships providing precise navigation.

### Implementation Approach

**Phase 1: Technical Foundation (Week 1)**
1. Update similarity threshold to 0.75 in `create-relationships-hetzner.ts`
2. Implement duplicate relationship detection/prevention
3. Reduce top-K from 5 to 3
4. Add Neo4j uniqueness constraints for relationships

**Phase 2: AI Behavior Patterns (Week 2)**
1. Document AI relationship creation patterns in CLAUDE.md
2. Create relationship suggestion templates for common scenarios
3. Implement relationship metadata schema (context, confidence, created_by)
4. Add typed relationship creation to CloudGraphClient API

**Phase 3: CLI Integration (Week 3)**
1. Add `--implements`, `--references` flags to `ginko create` commands
2. Implement relationship suggestions in AI workflows
3. Create `ginko graph suggest-relationships` command for existing docs
4. Add relationship quality metrics to `ginko graph status`

**Phase 4: Migration & Validation (Week 4)**
1. Cleanup script: prune <0.75 SIMILAR_TO relationships
2. AI-assisted review: suggest typed relationships for existing docs
3. Rebuild graph with new standards
4. Validate improvement metrics

## Architecture

### Between-Document Relationship Types

**Typed Relationships (40% target):**

| Relationship | Source → Target | Meaning | Example |
|--------------|----------------|---------|---------|
| IMPLEMENTS | ADR → PRD | Architecture delivers business requirement | ADR-042 IMPLEMENTS PRD-010 |
| REFERENCES | ADR → ADR/PRD | Decision builds on previous decision | ADR-042 REFERENCES ADR-039 |
| SUPERSEDES | ADR → ADR | New decision replaces old decision | ADR-020 SUPERSEDES ADR-008 |
| GUIDES | ADR → Sprint | Architecture directs implementation work | ADR-039 GUIDES Sprint-2025-10 |
| PRODUCES | Sprint → Pattern | Work creates reusable pattern | Sprint-2025-10 PRODUCES GraphPattern |
| APPLIES_TO | Pattern → ADR/Code | Pattern implements architecture | PoolingPattern APPLIES_TO ADR-009 |
| MITIGATED_BY | Gotcha → Pattern | Pattern solves known problem | ServerlessGotcha MITIGATED_BY PoolingPattern |
| LEARNED_FROM | Pattern → Session | Pattern discovered during work | PoolingPattern LEARNED_FROM Session-2025-10-15 |

**Generic Relationships (60% target):**

| Relationship | Source → Target | Meaning | Quality Threshold |
|--------------|----------------|---------|-------------------|
| SIMILAR_TO | Any → Any | Semantic similarity | >= 0.75 |

**Relationship Metadata:**
```typescript
interface TypedRelationship {
  type: RelationshipType;
  source_id: string;
  target_id: string;
  context: string;          // WHY this relationship exists
  created_by: string;       // 'ai-assistant' | 'human' | 'automated'
  created_during: string;   // Session or script identifier
  confidence: number;       // AI confidence in relationship (0-1)
  validated: boolean;       // Human validated the suggestion
  created_at: string;       // Timestamp
}
```

### AI Relationship Creation Patterns

**Pattern 1: Document Creation Flow**
```
┌─────────────────────────────────────────────────────┐
│ Human: "Create ADR for X"                           │
├─────────────────────────────────────────────────────┤
│ AI: "Which PRD does this implement?"                │
│ Human: "PRD-010"                                    │
├─────────────────────────────────────────────────────┤
│ AI: Creates ADR with frontmatter:                   │
│   @related: [PRD-010.md, ADR-039.md]               │
├─────────────────────────────────────────────────────┤
│ AI: Creates typed relationships:                    │
│   - ADR-042 IMPLEMENTS PRD-010                     │
│   - ADR-042 REFERENCES ADR-039                     │
│   - ADR-042 BUILDS_ON ADR-002                      │
├─────────────────────────────────────────────────────┤
│ AI: "I've created these relationships. Correct?"    │
│ Human: "Yes" | "No, it implements PRD-011"         │
└─────────────────────────────────────────────────────┘
```

**Pattern 2: Insight Documentation Flow**
```
┌─────────────────────────────────────────────────────┐
│ [AI detects insight during analysis]                │
├─────────────────────────────────────────────────────┤
│ AI: "This analysis reveals relationship quality     │
│      issues. Should I create an ADR?"              │
│ Human: "Yes"                                        │
├─────────────────────────────────────────────────────┤
│ AI: Creates ADR-042 with relationships:             │
│   - REFERENCES analysis findings                    │
│   - BUILDS_ON ADR-039 (graph architecture)         │
│   - ADDRESSES insights from current session        │
├─────────────────────────────────────────────────────┤
│ AI: Logs to session:                                │
│   "Created ADR-042 capturing relationship quality   │
│    insights, linked to PRD-010 and ADR-039"        │
└─────────────────────────────────────────────────────┘
```

**Pattern 3: Cross-Reference Detection Flow**
```
┌─────────────────────────────────────────────────────┐
│ AI: Writing ADR-042, mentions ADR-039 concepts      │
├─────────────────────────────────────────────────────┤
│ AI: "I'm referencing graph-based discovery from     │
│      ADR-039. Should I create a REFERENCES link?"  │
│ Human: "Yes, and it also builds on ADR-002"        │
├─────────────────────────────────────────────────────┤
│ AI: Creates relationships:                          │
│   - ADR-042 REFERENCES ADR-039                     │
│   - ADR-042 BUILDS_ON ADR-002                      │
│                                                     │
│ AI: Updates frontmatter:                            │
│   @related: [ADR-039.md, ADR-002.md, PRD-010.md]  │
└─────────────────────────────────────────────────────┘
```

**Pattern 4: Pattern Application Flow**
```
┌─────────────────────────────────────────────────────┐
│ AI: Implementing code with connection pooling       │
├─────────────────────────────────────────────────────┤
│ AI: "This pooling pattern APPLIES_TO the           │
│      serverless architecture in ADR-009."          │
│ Human: "Correct, and it mitigates the gotcha       │
│         about cold starts"                         │
├─────────────────────────────────────────────────────┤
│ AI: Creates relationships:                          │
│   - PoolingPattern APPLIES_TO ADR-009              │
│   - PoolingPattern MITIGATES_BY ColdStartGotcha   │
│   - PoolingPattern LEARNED_FROM Session-current    │
└─────────────────────────────────────────────────────┘
```

### Quality Targets

| Metric | Current | Target | How Achieved |
|--------|---------|--------|--------------|
| Total relationships | 1,892 | 600-700 | Prune <0.75, focus on quality |
| SIMILAR_TO | 1,840 (97%) | ~400 (60%) | Raise threshold, reduce top-K |
| Typed relationships | 52 (3%) | ~200 (40%) | AI-assisted creation |
| Avg similarity | 0.70 (est) | 0.80+ | 0.75 threshold enforcement |
| Relationships with context | 0% | 80%+ | AI adds metadata |
| Duplicates | Many | 0 | Uniqueness constraints |
| AI-created relationships | 0% | 60%+ | Natural collaboration flow |

### Integration Points

**CloudGraphClient API:**
```typescript
class CloudGraphClient {
  // New: Create typed relationship with metadata
  async createTypedRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    metadata: {
      context: string;
      created_by: 'ai-assistant' | 'human' | 'automated';
      confidence?: number;
    }
  ): Promise<void>;

  // New: Suggest relationships for document
  async suggestRelationships(
    documentId: string,
    options?: { types?: RelationshipType[] }
  ): Promise<RelationshipSuggestion[]>;

  // New: Get relationship metadata
  async getRelationshipContext(
    sourceId: string,
    targetId: string
  ): Promise<TypedRelationship>;
}
```

**CLI Commands:**
```bash
# Create ADR with typed relationships
ginko create adr "Graph Quality" --implements PRD-010 --references ADR-039

# Suggest relationships for existing document
ginko graph suggest-relationships ADR-042

# Create relationship manually (if AI missed it)
ginko graph link ADR-042 IMPLEMENTS PRD-010 --context "Addresses graph quality requirements"

# View relationship quality metrics
ginko graph quality --show-typed --show-context
```

**AI Behavior in CLAUDE.md:**
```markdown
## AI Relationship Creation Protocol

When creating or discussing documents, AI partners should:

1. **Ask about PRD implementation** when creating ADRs
2. **Suggest cross-references** when mentioning other documents
3. **Offer to create ADRs** when insights emerge
4. **Create pattern links** when applying reusable solutions
5. **Add relationship metadata** explaining WHY links exist

Example prompts:
- "Which PRD does this implement?"
- "Should I link this to ADR-039?"
- "This looks like a pattern. Should I document it?"
- "I'll create these relationships: [list]. Correct?"
```

## Deployment Tiers & Economics

### Strategic Decision: Embeddings as Optional Premium Feature

**Core insight:** Making embeddings **optional** enables a viable free tier while creating clear upgrade path to premium discovery features. This shifts Ginko from "requires infrastructure investment" to "freemium with premium discovery."

### Deployment Tiers

#### **Tier 1: AI-Assisted Only (Free/Freemium)**

**Infrastructure:**
- Neo4j (typed relationships storage)
- Vercel/serverless API
- **No embeddings infrastructure required**

**Features:**
- Unlimited typed relationships
- AI-assisted relationship creation (IMPLEMENTS, REFERENCES, etc.)
- Manual document linking
- Graph navigation via typed relationships
- No similarity-based discovery

**Cost:**
- Per user: $0.022-0.032/month
- At 10K users: $220-320/month total

**Target audience:**
- Individual developers
- Small teams (1-5 developers)
- Evaluation and proof-of-concept
- Teams focused on explicit relationships

**Value proposition:** Zero friction, AI-assisted knowledge management without infrastructure setup.

#### **Tier 2: AI + Self-Hosted Embeddings (Pro - $9/user/month)**

**Additional infrastructure:**
- Hetzner embeddings service (€69/month)
- Vector storage in Neo4j
- Self-hosted all-mpnet-base-v2 model

**Additional features:**
- **Embeddings-powered similarity search**
- **Serendipitous discovery** ("find similar docs")
- **Batch relationship suggestions** for existing documents
- **Exploratory queries** (textual similarity)
- Unlimited projects

**Cost:**
- Infrastructure: $395/month (10K users)
- Per user: $0.040/month
- Pricing: $9/user/month
- **Margin: 99.6%**
- **Break-even: 44 users** (~5 teams of 10)

**Target audience:**
- Professional teams (5-20 developers)
- Teams with large document corpus
- Organizations valuing discovery over just navigation

**Value proposition:** Everything in Free + serendipitous discovery for finding unexpected connections.

#### **Tier 3: Private Infrastructure (Enterprise - $19/user/month)**

**Infrastructure:**
- Dedicated Neo4j cluster
- Private embeddings service (AWS/GCP GPU)
- Custom embedding models
- Dedicated support

**Additional features:**
- **Private embeddings infrastructure** (compliance/security)
- **Custom similarity models** (domain-specific)
- **Advanced graph analytics** (custom queries)
- **SLA guarantees** (99.9% uptime)
- **Dedicated support** (Slack channel)
- **SSO/SAML integration**

**Cost:**
- Infrastructure: $670/month (dedicated)
- Per user: $0.067/month
- Pricing: $19/user/month
- **Margin: 99.6%**

**Target audience:**
- Large organizations (20+ developers)
- Regulated industries (healthcare, finance)
- Custom integration requirements

**Value proposition:** Everything in Pro + enterprise-grade security, compliance, and customization.

### Unit Economics at Scale

**Scenario: 10,000 daily users**

**Assumed distribution:**
- 40% Free (4,000 users)
- 50% Pro (5,000 users)
- 10% Enterprise (1,000 users)

**Revenue:**
- Free: $0
- Pro: 5,000 × $9 = $45,000/month
- Enterprise: 1,000 × $19 = $19,000/month
- **Total revenue: $64,000/month**

**Infrastructure costs:**
- Free (shared): 4,000 × $0.03 = $120/month
- Pro (shared): 5,000 × $0.04 = $200/month
- Enterprise (dedicated): 1,000 × $0.08 = $80/month
- **Total costs: $400/month**

**Profit: $63,600/month (99.4% margin)** 🎯

**Key metrics:**
- Cost per user: $0.04 (blended average)
- Revenue per user: $6.40 (blended average)
- LTV/CAC ratio: Very favorable (low infrastructure costs)
- Break-even: 44 Pro users or 5 small teams

### Competitive Positioning

**Compared to knowledge management alternatives:**

| Product | Price/User/Month | AI-Assisted | Knowledge Graph | Embeddings |
|---------|------------------|-------------|-----------------|------------|
| **Ginko Free** | $0 | ✅ | ✅ Typed | ❌ |
| **Ginko Pro** | $9 | ✅ | ✅ Full | ✅ |
| **Ginko Enterprise** | $19 | ✅ | ✅ Private | ✅ Private |
| Notion | $10-15 | Partial | ❌ | ❌ |
| Confluence | $5-10 | ❌ | Limited | ❌ |
| Obsidian Publish | $20 | ❌ | ✅ Local | ❌ |
| Roam Research | $15 | ❌ | ✅ Local | ❌ |

**Competitive advantage:**
1. **Only solution with AI-assisted typed relationship creation**
2. **Viable free tier** (competitors start at $5-10/user)
3. **Embeddings as premium feature** (not baseline requirement)
4. **Between-document WHY→WHAT→HOW architecture** (unique)
5. **99%+ margins** enable aggressive feature development

### Strategic Implications

**Immediate consequences of this decision:**

1. **Pause embeddings refinement** - Current Hetzner setup sufficient for Pro tier
2. **Focus on typed relationships** - Core value, available in free tier
3. **Invest in UX** - AI interaction patterns, relationship suggestions
4. **Defer similarity optimization** - 0.75 threshold sufficient for MVP

**Go-to-market strategy:**
- **Free tier drives adoption** - Zero friction, prove AI-assisted value
- **Pro tier monetizes discovery** - Upgrade when teams need serendipity
- **Enterprise for scale** - Security/compliance requirements at large orgs

**Product roadmap priorities:**
1. ✅ AI-assisted typed relationship creation (core differentiator)
2. ✅ Relationship suggestion UX (conversion driver)
3. ✅ Free tier infrastructure (adoption driver)
4. ⏸️ Embeddings optimization (sufficient for Pro tier)
5. ⏸️ Custom embedding models (Enterprise feature)

### Cost Scaling Analysis

**Infrastructure costs by user count:**

| Users | Free Tier | Pro Infrastructure | Enterprise | Total Monthly |
|-------|-----------|-------------------|------------|---------------|
| 100 | $3 | $395 | $0 | $398 |
| 1,000 | $30 | $395 | $0 | $425 |
| 10,000 | $300 | $395 | $80 | $775 |
| 100,000 | $3,000 | $795* | $800 | $4,595 |

*Assumes horizontal scaling of embeddings service at 50K+ Pro users

**Key insight:** Infrastructure costs scale **sub-linearly** due to:
- Fixed embeddings cost ($395) serves 10K+ Pro users
- Neo4j connection pooling (efficient reuse)
- Serverless API auto-scaling (pay for usage)

**Break-even remains constant:**
- 44 Pro users at any scale
- $395 infrastructure ÷ $9 per user
- Achievable by 5 small teams

## Alternatives Considered

### Option 1: Heavy Validation Gates
**Description:** Require humans to specify typed relationships via form validation
**Pros:**
- Guaranteed relationship creation
- Explicit human approval
- Structured input

**Cons:**
- Breaks flow, reduces velocity
- Feels bureaucratic
- Humans forget or skip gates
- Misses AI's comparative advantage

**Decision:** Rejected - Goes against lightweight, flow-preserving principle

### Option 2: Automated Inference Only
**Description:** Use NLP to automatically infer relationships from document content
**Pros:**
- Zero human effort
- Scales automatically
- Works for existing documents

**Cons:**
- Lower accuracy than AI-assisted
- No human validation
- Misses context/intent
- Can't ask clarifying questions

**Decision:** Rejected - AI assistance > pure automation

### Option 3: Manual Relationship Curation
**Description:** Humans explicitly create all typed relationships after documents exist
**Pros:**
- Complete human control
- High accuracy for created relationships

**Cons:**
- Extremely low completion rate (humans forget)
- After-the-fact, not in-flow
- Doesn't scale
- Misses AI's real-time context

**Decision:** Rejected - Too manual, doesn't leverage AI

### Option 4: Typed Relationships Only (No Similarity)
**Description:** Eliminate SIMILAR_TO, use only typed relationships
**Pros:**
- Maximum precision
- Clear semantic meaning
- No similarity noise

**Cons:**
- Loses serendipitous discovery
- Requires comprehensive manual linking
- Too rigid for exploratory knowledge
- Misses unexpected connections

**Decision:** Rejected - Need both typed (precision) and similarity (exploration)

## Consequences

### Positive Impacts

**AI Partner Performance:**
- **3-5x faster context discovery** - Follow precise typed relationships vs exploring similarity noise
- **Higher context relevance** - IMPLEMENTS links directly to business WHY
- **Preserved rationale** - Relationship metadata explains WHY links exist
- **No over-fetching** - 600 quality relationships vs 1,892 noisy relationships

**Team Velocity:**
- **Flow-preserving** - AI creates structure in-stride, no separate documentation task
- **Natural enforcement** - Structure emerges from collaboration, not gates
- **Faster onboarding** - New team members follow WHY→WHAT→HOW paths
- **Reduced "why did we?" questions** - Relationships preserve context

**Graph Quality:**
- **40% typed relationships** - Up from 3% (7x increase)
- **80%+ relationships with metadata** - Context on WHY links exist
- **Zero duplicates** - Uniqueness constraints enforced
- **0.80+ avg similarity** - Only high-quality SIMILAR_TO relationships

**AI Comparative Advantage:**
- **Real-time relationship detection** - AI sees context humans miss
- **Rapid synthesis** - AI creates ADRs at insight moments
- **Contextual questioning** - AI asks right questions at right time
- **Metadata generation** - AI explains WHY without additional human effort

### Negative Impacts

**AI Dependency:**
- Teams become reliant on AI partners for relationship creation
- If AI unavailable, typed relationship % may drop
- Quality degrades if AI partner not engaged

**Migration Complexity:**
- Existing 1,840 relationships need review/pruning
- AI-assisted review time required for existing docs
- Potential disruption during transition

**Cognitive Load:**
- AI asking "which PRD?" adds interaction overhead
- Teams may find questions disruptive initially
- Learning curve for relationship types

### Neutral Impacts

**Relationship Creation Mode:**
- Shifts from batch (after creation) to real-time (during creation)
- Changes collaboration dynamics (more AI questions)
- Different workflow but not necessarily better/worse

**Quality Distribution:**
- 60% similarity, 40% typed (vs current 97% similarity, 3% typed)
- Different graph structure, different navigation patterns
- Trade exploratory breadth for navigational precision

### Migration Strategy

**Phase 1: Technical Cleanup (Week 1)**
```bash
# 1. Backup current graph
ginko graph export > backup-pre-adr042.json

# 2. Analyze current quality
ginko graph quality --report --output quality-before.json

# 3. Prune low-quality SIMILAR_TO (<0.75)
ginko graph prune --similarity-threshold 0.75 --dry-run
ginko graph prune --similarity-threshold 0.75 --confirm

# 4. Remove duplicates
ginko graph deduplicate --dry-run
ginko graph deduplicate --confirm
```

**Phase 2: AI-Assisted Typed Relationship Creation (Week 2-3)**
```bash
# 5. AI reviews existing documents and suggests relationships
ginko graph suggest-relationships --all --interactive

# Example AI suggestions:
# "ADR-039 appears to implement PRD-010. Create IMPLEMENTS relationship? (Y/n)"
# "ADR-042 references concepts from ADR-039. Create REFERENCES relationship? (Y/n)"
# "Pattern-PoolingPattern applies to ADR-009. Create APPLIES_TO relationship? (Y/n)"

# 6. Validate suggestions
ginko graph quality --show-typed --show-confidence
```

**Phase 3: Validation (Week 4)**
```bash
# 7. Compare before/after
ginko graph quality --report --output quality-after.json --compare quality-before.json

# 8. Verify targets met
# - Total relationships: 600-700 ✓
# - Typed relationships: 40%+ ✓
# - Avg similarity: 0.80+ ✓
# - Duplicates: 0 ✓
```

## Implementation Details

### Technical Requirements

**Neo4j Schema Updates:**
```cypher
// Uniqueness constraint for SIMILAR_TO relationships
CREATE CONSTRAINT similar_to_unique IF NOT EXISTS
FOR ()-[r:SIMILAR_TO]-()
REQUIRE (r.source_id, r.target_id) IS UNIQUE;

// Uniqueness constraint for typed relationships
CREATE CONSTRAINT typed_rel_unique IF NOT EXISTS
FOR ()-[r]-()
WHERE type(r) IN ['IMPLEMENTS', 'REFERENCES', 'SUPERSEDES', 'GUIDES',
                   'PRODUCES', 'APPLIES_TO', 'MITIGATED_BY', 'LEARNED_FROM']
REQUIRE (r.source_id, r.target_id, type(r)) IS UNIQUE;

// Index on relationship metadata
CREATE INDEX relationship_context IF NOT EXISTS
FOR ()-[r]-()
ON (r.created_by, r.confidence);
```

**TypeScript Interfaces:**
```typescript
/**
 * Typed relationship types
 */
type RelationshipType =
  | 'IMPLEMENTS'      // ADR → PRD (architecture delivers requirement)
  | 'REFERENCES'      // ADR → ADR/PRD (decision builds on previous)
  | 'SUPERSEDES'      // ADR → ADR (new replaces old)
  | 'GUIDES'          // ADR → Sprint (architecture directs work)
  | 'PRODUCES'        // Sprint → Pattern (work creates reusable solution)
  | 'APPLIES_TO'      // Pattern → ADR/Code (pattern implements architecture)
  | 'MITIGATED_BY'    // Gotcha → Pattern (pattern solves problem)
  | 'LEARNED_FROM'    // Pattern → Session (discovered during work)
  | 'SIMILAR_TO';     // Any → Any (semantic similarity)

/**
 * Relationship metadata
 */
interface TypedRelationship {
  type: RelationshipType;
  source_id: string;
  target_id: string;
  context: string;          // WHY this relationship exists
  created_by: 'ai-assistant' | 'human' | 'automated';
  created_during?: string;  // Session or script identifier
  confidence?: number;      // AI confidence (0-1)
  validated?: boolean;      // Human validated
  created_at: string;
}

/**
 * AI relationship suggestion
 */
interface RelationshipSuggestion {
  type: RelationshipType;
  source_id: string;
  target_id: string;
  target_title: string;
  context: string;
  confidence: number;
  reasoning: string;        // Why AI suggests this relationship
}
```

**Updated Relationship Creation:**
```typescript
// scripts/create-relationships-hetzner.ts (updated)
async function createSimilarityRelationships(
  client: CloudGraphClient,
  documents: any[]
): Promise<number> {
  console.log('Creating high-quality SIMILAR_TO relationships...');
  let created = 0;

  for (const doc of documents) {
    if (!doc.embedding) continue;

    // Use higher threshold and lower top-K
    const similar = await client.semanticSearch(doc.embedding, {
      limit: 4,         // Top 4 (3 excluding self) ← Reduced from 6
      threshold: 0.75,  // Higher quality ← Raised from 0.60
      types: ['ADR', 'PRD', 'Pattern']
    });

    for (const match of similar) {
      if (match.node.id === doc.id) continue;

      try {
        // Check for duplicate before creating
        const exists = await client.relationshipExists(
          doc.id,
          match.node.id,
          'SIMILAR_TO'
        );

        if (!exists) {
          await client.createTypedRelationship(
            doc.id,
            match.node.id,
            'SIMILAR_TO',
            {
              context: `Semantic similarity: ${(match.score * 100).toFixed(1)}%`,
              created_by: 'automated',
              confidence: match.score
            }
          );
          created++;
        }
      } catch (error) {
        // Log but continue
        console.error(`  ✗ Error creating relationship: ${error.message}`);
      }
    }
  }

  return created;
}
```

### Security Considerations

**AI Relationship Validation:**
- AI suggestions require human approval for critical relationships
- Confidence scores visible to users (can reject low-confidence suggestions)
- Audit trail: all relationships track `created_by` and `created_at`

**Relationship Integrity:**
- Uniqueness constraints prevent duplicate relationships
- Foreign key validation ensures target documents exist
- Relationship metadata immutable after creation (versioning for changes)

### Performance Implications

**Context Discovery Speed:**
- **Before:** Follow 1,840 SIMILAR_TO links → 3-5 second exploration
- **After:** Follow 200 typed + 400 similarity → <500ms targeted navigation
- **Improvement:** 6-10x faster for typical "find related ADRs" queries

**Relationship Creation Overhead:**
- AI question/answer: +5-10 seconds per document
- Relationship creation: +50-100ms per relationship
- **Total:** ~30 seconds additional time for comprehensive linking
- **ROI:** 30 seconds invested saves 3-5 seconds on every future context discovery

**Storage:**
- Relationship metadata: ~200 bytes per relationship
- 600 relationships × 200 bytes = 120KB (negligible)

### Operational Impact

**New AI Behaviors:**
- AI partners ask clarifying questions during document creation
- AI offers to create ADRs at insight moments
- AI suggests relationships when detecting cross-references
- AI explains relationship suggestions with reasoning

**Human Workflows:**
- More interactive collaboration (AI asks questions)
- Quick yes/no validation on relationship suggestions
- Optional manual relationship creation via CLI

**Monitoring:**
```bash
# Track AI relationship creation effectiveness
ginko graph quality --ai-metrics

# Example output:
# AI Relationship Metrics:
#   Total AI-suggested: 156
#   Human-approved: 142 (91%)
#   Human-rejected: 14 (9%)
#   Avg confidence: 0.87
#   Top relationship types:
#     - IMPLEMENTS: 45 (32%)
#     - REFERENCES: 38 (27%)
#     - APPLIES_TO: 29 (20%)
```

## Monitoring and Success Metrics

### Key Performance Indicators

**Graph Quality Metrics:**
- [ ] Typed relationships >= 40% of total (target: 40-50%)
- [ ] Average similarity >= 0.80 (target: 0.80-0.85)
- [ ] Relationships with context >= 80% (target: 80-90%)
- [ ] Duplicate relationships = 0 (target: 0)
- [ ] Total relationships: 600-700 (current: 1,892)

**AI Assistance Metrics:**
- [ ] AI relationship suggestions per document >= 2 (target: 2-4)
- [ ] Human approval rate >= 80% (target: 80-90%)
- [ ] AI-created relationships >= 60% of typed (target: 60-80%)

**Context Discovery Performance:**
- [ ] Average context discovery time < 500ms (baseline: measure)
- [ ] Relevant context hit rate >= 85% (AI finds needed docs)
- [ ] Context over-fetch rate < 15% (AI doesn't fetch irrelevant docs)

**Team Adoption:**
- [ ] Documents with typed relationships >= 80% (target: 80-95%)
- [ ] Relationship metadata completeness >= 80% (target: 80-90%)
- [ ] Teams using AI-assisted creation >= 70% (target: 70-85%)

### Monitoring Strategy

**Automated Metrics Collection:**
```typescript
// /api/v1/graph/quality endpoint response
interface QualityMetrics {
  timestamp: string;

  relationships: {
    total: number;
    byType: Record<RelationshipType, number>;
    typedPercentage: number;      // % that are typed (not SIMILAR_TO)
    avgSimilarity: number;
    duplicates: number;
    withContext: number;          // % with metadata
  };

  aiAssistance: {
    suggestionsOffered: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    approvalRate: number;
    avgConfidence: number;
    aiCreatedPercentage: number;  // % created by AI
  };

  performance: {
    avgContextDiscoveryMs: number;
    p90ContextDiscoveryMs: number;
    p99ContextDiscoveryMs: number;
    relevantContextHitRate: number;
    overFetchRate: number;
  };
}
```

**CLI Monitoring:**
```bash
# Real-time quality dashboard
ginko graph quality --watch

# Example output:
# Knowledge Graph Quality Dashboard
# ═══════════════════════════════════
# Relationships:        642 total
#   Typed:             256 (40%) ✓
#   Similarity:        386 (60%) ✓
#   Avg similarity:    0.82 ✓
#   With metadata:     534 (83%) ✓
#
# AI Assistance:
#   Suggestions:       189 offered
#   Approved:          167 (88%) ✓
#   Avg confidence:    0.86 ✓
#
# Performance:
#   Avg discovery:     387ms ✓
#   P90 discovery:     521ms
#   Hit rate:          89% ✓
```

### Success Criteria

**Technical Success (Week 4):**
- Graph migration complete (600-700 relationships)
- 40%+ typed relationships
- Zero duplicates
- 0.80+ average similarity
- 80%+ relationships with context metadata

**AI Assistance Success (Week 8):**
- 80%+ AI suggestion approval rate
- 60%+ of typed relationships created by AI
- 2+ relationship suggestions per document average

**Business Success (Month 3):**
- 3-5x faster AI context discovery (measured)
- 85%+ relevant context hit rate
- Teams report improved knowledge navigation (survey)
- Reduced "why did we decide this?" questions

### Failure Criteria

**Would trigger decision review:**
- Typed relationship % stays below 25% after 2 months (AI assistance not working)
- AI approval rate below 60% (suggestions not accurate)
- Context discovery performance unchanged (no benefit realized)
- Teams disable AI assistance in >50% of projects (too disruptive)
- Migration takes >8 weeks (too expensive)

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| AI suggestions inaccurate | Medium | Medium | Confidence scores, human validation, learning from rejections |
| Relationship creation overhead | Low | Medium | Async creation, batch validation, skip low-confidence |
| Migration breaks queries | High | Low | Comprehensive testing, backward compatibility, gradual rollout |
| Duplicate detection failures | Medium | Low | Uniqueness constraints, pre-check before creation |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Teams find AI questions disruptive | High | Medium | Make optional, configurable frequency, batch suggestions |
| AI dependency concerns | Medium | Medium | Fallback to manual creation, CLI alternatives |
| Low AI approval rate | High | Low | Improve suggestion accuracy, explain reasoning, learn from feedback |
| Unclear ROI | Medium | Low | Track metrics, demonstrate performance gains, user testimonials |

### Mitigation Details

**AI Question Frequency Control:**
```json
// ginko.config.json
{
  "ai": {
    "relationshipAssistance": "full|minimal|off",
    "suggestionMode": "interactive|batch|silent",
    "confidenceThreshold": 0.7
  }
}
```

**Modes:**
- `full` - AI asks about every potential relationship (interactive)
- `minimal` - AI only suggests high-confidence (>0.8) relationships
- `off` - No AI suggestions (manual only)

**Suggestion Modes:**
- `interactive` - AI asks in real-time during creation
- `batch` - AI suggests all relationships at end of document
- `silent` - AI creates relationships automatically, human reviews later

## Timeline and Milestones

### Implementation Phases

- **Phase 1 - Technical Foundation** (Week 1, Nov 4-10): ✅ COMPLETE
  - Update similarity threshold to 0.75 ✓
  - Implement duplicate prevention ✓
  - Reduce top-K to 3 ✓
  - Add Neo4j uniqueness constraints ✓
  - **Decision: Pause embeddings optimization** (sufficient for Pro tier)

- **Phase 2 - AI Behavior Patterns** (Week 2, Nov 11-17): 🎯 FOCUS
  - Document AI relationship protocols in CLAUDE.md
  - Create relationship suggestion templates
  - Implement relationship metadata schema
  - Add typed relationship creation to CloudGraphClient
  - **Priority: Core differentiator for free tier**

- **Phase 3 - UX & Interaction Design** (Week 3, Nov 18-24): 🎯 FOCUS
  - Design AI questioning patterns (non-disruptive)
  - Implement relationship suggestion UI/CLI
  - Add `--implements`, `--references` flags to `ginko create`
  - Create quality metrics dashboard (`ginko graph quality`)
  - **Priority: Conversion driver for Pro tier**

- **Phase 4 - Free Tier Infrastructure** (Week 4, Nov 25-Dec 1):
  - Deploy Neo4j AuraDB (shared infrastructure)
  - Implement connection pooling
  - Add usage tracking (free tier limits)
  - Test at 100 concurrent users
  - **Priority: Adoption driver**

- **Phase 5 - Migration & Validation** (Week 5, Dec 2-8):
  - Prune low-quality SIMILAR_TO (<0.75) from existing graph
  - AI-assisted typed relationship creation for existing docs
  - Validate improvement metrics
  - Prepare Pro tier rollout

**Deferred to Post-MVP:**
- ⏸️ Embeddings optimization (current 0.75 threshold sufficient)
- ⏸️ Custom embedding models (Enterprise feature)
- ⏸️ Advanced similarity tuning (Pro tier enhancement)
- ⏸️ Batch relationship processing (automated)

### Key Milestones

- **M1 - Technical Foundation** (Nov 10): ✅ Similarity tuned (0.75), duplicates prevented, embeddings paused
- **M2 - AI Patterns Documented** (Nov 17): AI relationship protocols in CLAUDE.md, templates created
- **M3 - UX Complete** (Nov 24): Relationship suggestion UI/CLI, non-disruptive interaction patterns
- **M4 - Free Tier Live** (Dec 1): Shared infrastructure deployed, usage tracking active
- **M5 - Migration Complete** (Dec 8): Existing graph at target quality (40% typed relationships)
- **M6 - Pro Tier Launch** (Dec 15): Embeddings-enhanced discovery available, pricing live
- **M7 - Adoption Validated** (Jan 15): 100+ free tier users, 10+ Pro users (break-even), 80%+ relationship approval rate

## Review and Updates

### Review Schedule

**Regular Reviews:**
- **2 weeks** (Nov 17): AI pattern documentation complete, assess feasibility
- **1 month** (Dec 3): Full implementation complete, review AI assistance metrics
- **3 months** (Feb 3): Business value assessment, team feedback on AI assistance
- **6 months** (May 3): Long-term impact, consider new relationship types

**Trigger-Based Reviews:**
- AI approval rate <70% for 2 consecutive weeks (improve suggestions)
- Typed relationship % <30% after 2 months (investigate adoption barriers)
- Context discovery performance unchanged after 1 month (validate hypothesis)
- Teams disable AI assistance in >30% of projects (too disruptive)

### Update History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-03 | Claude, Chris Norton | Initial version - AI-assisted relationship quality strategy |
| 2025-11-03 | Claude, Chris Norton | Added deployment tiers & economics analysis. **Strategic decisions:** (1) Embeddings optional at paid tiers ($9 Pro, $19 Enterprise), (2) Per-user pricing model, (3) Pause embeddings refinement, (4) Focus on typed relationships + UX. Updated timeline to reflect priorities. |

## References

### Documentation

- [ADR-039: Knowledge Discovery Graph](ADR-039-graph-based-context-discovery.md) - Graph architecture foundation
- [ADR-002: AI-Optimized File Discovery](ADR-002-ai-optimized-file-discovery.md) - Frontmatter standards
- [ADR-033: Context Pressure Mitigation](ADR-033-context-pressure-mitigation-strategy.md) - Session continuity
- [Relationship Quality Analysis](../analysis/relationship-quality-2025-11-03.md) - Empirical findings

### Code References

- Analysis: `scripts/analyze-relationship-quality.ts`
- Relationship creation: `scripts/create-relationships-hetzner.ts`
- Graph client: `api/v1/graph/_cloud-graph-client.ts`
- Embeddings: `src/graph/embeddings-service.ts`

### External References

- [Neo4j Relationship Patterns](https://neo4j.com/docs/cypher-manual/current/patterns/relationships/)
- [Knowledge Graph Best Practices](https://neo4j.com/developer/kb-best-practices/)
- [Sentence Transformers](https://huggingface.co/sentence-transformers/all-mpnet-base-v2)

---

## Key Insights

**AI Comparative Advantage:** AI partners excel at detecting semantic connections in real-time and synthesizing structure without breaking flow. This makes them ideal for creating typed relationships during collaboration rather than requiring human compliance with methodology gates.

**Between-Document WHY→WHAT→HOW:** Typed relationships create a traversable knowledge graph where PRDs capture business WHY, ADRs capture architectural WHAT, and Sprints/Patterns capture implementation HOW. This enables AI to rapidly navigate from any document to complete context.

**Quality Over Quantity:** Reducing from 1,892 to 600-700 relationships while increasing typed relationship percentage from 3% to 40% creates a **higher signal-to-noise ratio** that dramatically improves AI context discovery performance.

**Lightweight Enforcement:** Structure emerges naturally from AI-assisted collaboration rather than heavy methodology gates. This preserves team velocity while ensuring knowledge graph quality.

**Embeddings as Optional Premium:** Making embeddings optional rather than required infrastructure enables a viable free tier (zero infrastructure setup) while creating clear upgrade path to Pro tier for serendipitous discovery. This shifts Ginko from "requires infrastructure investment" to "freemium with premium discovery."

**Economics Enable Aggressive Development:** 99%+ margins at scale ($64K revenue on $400 infrastructure at 10K users) with break-even at just 44 Pro users (5 small teams) creates exceptional unit economics that enable rapid feature development and competitive pricing.

**Strategic Positioning:** This decision shifts Ginko from "document store with similarity search" to "AI-assisted knowledge graph where structure emerges from collaboration" - a fundamentally different value proposition that enables freemium go-to-market strategy.
