# Charter Synthesis Design

**Version**: 1.0
**Last Updated**: 2025-11-10
**Status**: Design Specification

---

## Overview

Charter synthesis is the process of transforming natural conversation into a structured, useful project charter document. The synthesizer extracts key information, organizes it thematically, and generates markdown that serves both human and AI partners.

### Core Principles

1. **Preserve User Voice**: Use exact user language, don't paraphrase
2. **Transparent Uncertainty**: Mark unclear areas as TBD, never invent
3. **Work Mode Adaptation**: Charter depth matches conversation depth
4. **Living Document**: Version-tracked with changelog for evolution
5. **Dual Purpose**: Readable by humans, parseable by AI

---

## Charter Structure

### Standard Template

```markdown
# Project Charter: [Project Name]

**Status**: Draft | Active | Archived
**Work Mode**: Hack & Ship | Think & Build | Full Planning
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Version**: 1.0
**Confidence**: [Overall %] - [Quality description]

---

## Purpose & Value

[Why this project exists, what problem it solves]

**Problem Statement**: [Core pain point in user's words]

**Business Value**: [Impact, benefits, why it matters]

**Motivation**: [Why now, what drove this]

---

## Users & Personas

[Who will use this and how it helps them]

**Primary Users**: [Main user types with their needs]

**Secondary Users**: [Other stakeholders, if any]

**User Outcomes**: [What users achieve with this]

---

## Success Criteria

How we'll know this is working well:

- [ ] [Criterion 1 - specific, measurable]
- [ ] [Criterion 2 - from conversation]
- [ ] [Criterion 3 - user outcomes]
- [ ] [TBD - areas to define later]

**Timeframe**: [When success should be measurable]

---

## Scope & Boundaries

### In Scope
- [Feature/capability 1]
- [Feature/capability 2]
- [Core functionality from conversation]

### Out of Scope
- [Explicitly excluded feature 1]
- [Explicitly excluded feature 2]
- [Deferred to future phases]

### TBD (To Be Determined)
- [Unclear boundaries]
- [Decisions deferred]
- [Areas to revisit]

---

## Context & Constraints

**Technical Constraints**: [Stack, platform, integration requirements]

**Timeline**: [Deadlines, milestones, phases]

**Team**: [Who's working on this]

**Dependencies**: [External factors, prerequisites]

---

## Changelog

All changes to this charter are tracked here for transparency.

### v1.0 - YYYY-MM-DD - Initial Creation
- Created from conversation during `ginko init`
- Confidence: [Overall %]
- Participants: [User name], [AI name]
- Key aspects: [What was well-defined vs. TBD]

---

*This charter was created through conversation and is a living document.
Edit conversationally (`ginko charter --edit`) or directly in markdown.*
```

---

## Extraction Patterns

### Phase 1: Content Extraction

The synthesizer processes conversation exchanges to extract key information.

#### Purpose Extraction

**Targets:**
- Problem statements (what's broken/frustrating)
- Value propositions (why this matters)
- Motivation (why now, what's driving this)
- Impact (who benefits, how much)

**Extraction Strategy:**

```typescript
interface PurposeExtraction {
  problemStatements: string[];      // Direct quotes about problems
  valueStatements: string[];        // Direct quotes about value
  motivationStatements: string[];   // Direct quotes about why
  impactStatements: string[];       // Direct quotes about impact
}

function extractPurpose(exchanges: Exchange[]): PurposeExtraction {
  const extraction: PurposeExtraction = {
    problemStatements: [],
    valueStatements: [],
    motivationStatements: [],
    impactStatements: [],
  };

  for (const exchange of exchanges) {
    const answer = exchange.answer.toLowerCase();

    // Look for problem language
    if (containsAny(answer, ['problem', 'pain', 'frustration', 'issue'])) {
      extraction.problemStatements.push(
        extractSentence(exchange.answer, ['problem', 'pain', 'frustration'])
      );
    }

    // Look for value language
    if (containsAny(answer, ['value', 'benefit', 'impact', 'improve'])) {
      extraction.valueStatements.push(
        extractSentence(exchange.answer, ['value', 'benefit', 'impact'])
      );
    }

    // Look for motivation language
    if (containsAny(answer, ['because', 'why', 'need', 'want'])) {
      extraction.motivationStatements.push(
        extractSentence(exchange.answer, ['because', 'why', 'need'])
      );
    }

    // Look for impact language
    if (containsAny(answer, ['saves', 'enables', 'unlocks', 'improves'])) {
      extraction.impactStatements.push(
        extractSentence(exchange.answer, ['saves', 'enables', 'unlocks'])
      );
    }
  }

  return extraction;
}
```

**Key Techniques:**
1. **Sentence Extraction**: Pull complete sentences containing keywords
2. **Quote Preservation**: Keep user's exact words in quotes when impactful
3. **Deduplication**: Remove redundant statements
4. **Prioritization**: Most specific/impactful statements first

---

#### User Extraction

**Targets:**
- User types (developers, designers, customers, etc.)
- User needs (jobs to be done, pain points)
- User outcomes (what they achieve)
- Persona details (if provided)

**Extraction Strategy:**

```typescript
interface UserExtraction {
  userTypes: Array<{
    type: string;           // "developers", "team", "myself"
    description?: string;   // Additional context if provided
    needs?: string[];       // What they need
    outcomes?: string[];    // What they achieve
  }>;
}

function extractUsers(exchanges: Exchange[]): UserExtraction {
  const userTypes = new Map<string, UserType>();

  for (const exchange of exchanges) {
    const answer = exchange.answer;

    // Detect user type mentions
    const types = detectUserTypes(answer);

    for (const type of types) {
      if (!userTypes.has(type)) {
        userTypes.set(type, {
          type,
          needs: [],
          outcomes: [],
        });
      }

      // Extract needs for this user type
      const needs = extractNeeds(answer, type);
      userTypes.get(type)!.needs.push(...needs);

      // Extract outcomes for this user type
      const outcomes = extractOutcomes(answer, type);
      userTypes.get(type)!.outcomes.push(...outcomes);
    }
  }

  return {
    userTypes: Array.from(userTypes.values()),
  };
}
```

**Detection Patterns:**
- "for [developers]" → Primary user
- "[team] needs" → Primary user with need
- "I'm building this for [myself]" → Primary user (self)
- "also useful for [designers]" → Secondary user

---

#### Success Criteria Extraction

**Targets:**
- Qualitative criteria (happy, fast, easy, reliable)
- Quantitative criteria (time saved, reduction %, metrics)
- User outcomes (what becomes possible)
- Timeframes (when success should be visible)

**Extraction Strategy:**

```typescript
interface SuccessExtraction {
  qualitative: string[];   // "users are happy", "feels fast"
  quantitative: string[];  // "saves 2 hours per week", "50% faster"
  outcomes: string[];      // "enables X", "unlocks Y"
  timeframes: string[];    // "within 2 weeks", "by Q2"
}

function extractSuccess(exchanges: Exchange[]): SuccessExtraction {
  const extraction: SuccessExtraction = {
    qualitative: [],
    quantitative: [],
    outcomes: [],
    timeframes: [],
  };

  for (const exchange of exchanges) {
    const answer = exchange.answer;

    // Look for measurable criteria
    if (containsNumbers(answer) || containsMeasurements(answer)) {
      extraction.quantitative.push(
        extractMeasurableCriteria(answer)
      );
    }

    // Look for qualitative criteria
    if (containsQualityWords(answer)) {
      extraction.qualitative.push(
        extractQualitativeCriteria(answer)
      );
    }

    // Look for outcome statements
    if (containsOutcomeWords(answer)) {
      extraction.outcomes.push(
        extractOutcomes(answer)
      );
    }

    // Look for timeframes
    if (containsTimeWords(answer)) {
      extraction.timeframes.push(
        extractTimeframes(answer)
      );
    }
  }

  return extraction;
}
```

**Formatting:**
- Convert to checkbox list: `- [ ] Users complete setup in under 2 minutes`
- Combine related criteria: `- [ ] Fast response time (< 100ms) and intuitive UI`
- Mark TBD for vague areas: `- [ ] TBD: Define metrics for user satisfaction`

---

#### Scope Extraction

**Targets:**
- In-scope features/capabilities
- Out-of-scope features/capabilities
- Boundaries and constraints
- MVP vs. future phases

**Extraction Strategy:**

```typescript
interface ScopeExtraction {
  inScope: string[];       // Features/capabilities being built
  outOfScope: string[];    // Explicitly excluded
  ambiguous: string[];     // Unclear or TBD
  mvpFeatures: string[];   // Minimum viable features
}

function extractScope(exchanges: Exchange[]): ScopeExtraction {
  const extraction: ScopeExtraction = {
    inScope: [],
    outOfScope: [],
    ambiguous: [],
    mvpFeatures: [],
  };

  for (const exchange of exchanges) {
    const answer = exchange.answer;

    // Detect in-scope features
    const inScopePatterns = [
      /building (\w+)/gi,
      /includes (\w+)/gi,
      /supports (\w+)/gi,
      /will have (\w+)/gi,
    ];

    for (const pattern of inScopePatterns) {
      const matches = answer.matchAll(pattern);
      for (const match of matches) {
        extraction.inScope.push(match[1]);
      }
    }

    // Detect out-of-scope features
    const outOfScopePatterns = [
      /not building (\w+)/gi,
      /excluding (\w+)/gi,
      /won't have (\w+)/gi,
      /skip (\w+)/gi,
      /defer (\w+)/gi,
      /later: (\w+)/gi,
    ];

    for (const pattern of outOfScopePatterns) {
      const matches = answer.matchAll(pattern);
      for (const match of matches) {
        extraction.outOfScope.push(match[1]);
      }
    }

    // Detect MVP mentions
    if (containsAny(answer.toLowerCase(), ['mvp', 'minimum', 'essential', 'core'])) {
      extraction.mvpFeatures.push(
        extractSentence(answer, ['mvp', 'minimum', 'essential'])
      );
    }
  }

  return extraction;
}
```

**Organization:**
- Group related features: "Authentication (login, logout, password reset)"
- Prioritize: MVP features first, nice-to-haves later
- Explicit exclusions: "No mobile app, no social login, no video uploads"

---

### Phase 2: Synthesis Rules

#### Rule 1: Preserve User Language

**DO:**
```markdown
**Problem Statement**: "Developers waste 30 minutes every day switching context between projects, losing their flow state and forgetting what they were working on."
```

**DON'T:**
```markdown
**Problem Statement**: The system aims to address productivity challenges related to context management across multiple concurrent development initiatives.
```

**Implementation:**
- Use direct quotes for impactful statements
- Preserve emotional language ("frustrating", "waste", "exciting")
- Keep user's technical vocabulary
- Maintain their level of formality

---

#### Rule 2: Mark Uncertainty as TBD

**DO:**
```markdown
### Out of Scope
- No mobile applications
- No real-time collaboration
- [TBD - Cloud sync strategy to be determined]
```

**DON'T:**
```markdown
### Out of Scope
- No mobile applications
- No real-time collaboration
- Cloud sync via AWS S3  [<-- INVENTED, USER NEVER SAID THIS]
```

**Implementation:**
- Use `[TBD - description]` for unclear items
- Be specific about what's uncertain: "TBD - Authentication strategy"
- Never invent technical details
- Flag assumptions: "Assumed: Single-user initially (verify)"

---

#### Rule 3: Organize Thematically

**DO:**
```markdown
## Purpose & Value

This project solves the context-switching problem that costs developers 30 minutes daily. By capturing and restoring full development context automatically, it eliminates the "what was I working on?" moment and preserves flow state.

**Business Value**: Saves 2.5 hours per developer per week, reduces context-related bugs, improves developer satisfaction.
```

**DON'T:**
```markdown
## Purpose & Value

User said they want to build a tool. They mentioned context switching. There are productivity issues. Developers are the target users. [<-- DISORGANIZED, NO NARRATIVE]
```

**Implementation:**
- Create coherent narrative from fragments
- Group related points under themes
- Lead with most important information
- Connect ideas logically

---

#### Rule 4: Adapt to Work Mode

Charter depth and detail should match detected work mode.

**Hack & Ship Charter:**
```markdown
# Project Charter: QuickEnv CLI

**Status**: Draft
**Work Mode**: Hack & Ship
**Version**: 0.5
**Confidence**: 62% - Workable, can refine as we go

## Purpose & Value

Quick CLI tool for managing environment variables across projects. Current tools are too complex, I need something simple for local dev.

## Users

- Primary: Just me (solo developer)
- Maybe: Team later if it works

## Success Criteria

- [ ] Manage envs across projects in < 30 seconds
- [ ] Add, list, delete commands working
- [ ] Better than current manual process

## Scope

**In Scope:**
- Basic CRUD for environment variables
- Terminal-only interface
- Local storage

**Out of Scope:**
- Cloud sync
- GUI
- Team collaboration

[Minimal charter - good enough to start hacking]
```

**Think & Build Charter:**
```markdown
# Project Charter: Ginko Context Manager

**Status**: Active
**Work Mode**: Think & Build
**Version**: 1.0
**Confidence**: 73% - Good foundation, some TBD

## Purpose & Value

Ginko solves the context-switching problem where developers lose 30 minutes daily when switching between projects. Current tools don't capture full development context (open files, uncommitted work, mental state), forcing the frustrating "what was I working on?" moment.

**Business Value**:
- Saves 2.5 hours per developer per week
- Reduces context-related bugs and rework
- Improves developer satisfaction and flow state
- Enables efficient multi-project management

## Users & Personas

**Primary Users**: Professional developers managing 2-4 concurrent projects
- **Needs**: Fast context switching, zero cognitive overhead, privacy respected
- **Success**: Seamless transitions, no "ramp-up" time

**Secondary Users**: Development teams wanting shared context understanding
- **Needs**: See what teammates are working on without interrupting
- **Success**: Better collaboration, fewer "where were we?" meetings

## Success Criteria

- [ ] Context switches complete in < 5 seconds
- [ ] Zero "what was I doing?" moments reported by users
- [ ] 50% reduction in context-related bugs
- [ ] 8/10 developer satisfaction score within 3 months
- [ ] 80% daily active usage among pilot users

## Scope & Boundaries

### In Scope (v1.0)
- Git-native context capture (branch, uncommitted changes, position)
- Smart context restoration (files, terminal state, environment)
- Session logging with timeline
- Local-first operation (works offline)
- VS Code integration

### Out of Scope (v1.0)
- AI code generation (focused on context, not code)
- Task/project management (use existing tools)
- Time tracking (not our purpose)
- Cloud sync (maybe v2)
- Mobile apps (desktop CLI only)

### TBD
- [TBD - Team collaboration features - scope unclear]
- [TBD - Integration with other IDEs beyond VS Code]
- [TBD - Context sharing mechanism if team feature added]

## Context & Constraints

**Technical Constraints**:
- Must work offline (git-native storage)
- Respect privacy (local-first, no tracking)
- Cross-platform (macOS, Linux, Windows)
- Fast startup (< 2 seconds)

**Timeline**:
- Beta: 6 weeks
- Production v1.0: 3 months
- Monthly iterations after launch

**Team**:
- Lead engineer: [Name]
- 2 contributing senior developers
- Part-time UX advisor

**Dependencies**:
- Git (required)
- VS Code API (for editor integration)
- Node.js runtime

## Changelog

### v1.0 - 2025-11-10 - Initial Creation
- Created from conversation during `ginko init`
- Confidence: 73%
- Participants: Chris Norton, Claude
- Well-defined: Purpose, users, core scope
- TBD: Team features, IDE integrations beyond VS Code

---

*Standard depth charter - balanced detail for iterative development*
```

**Full Planning Charter:**
```markdown
# Project Charter: Enterprise Knowledge Graph Platform

**Status**: Active
**Work Mode**: Full Planning
**Version**: 1.0
**Confidence**: 89% - Comprehensive foundation

## Purpose & Value

**Problem Statement**: Our 50-person engineering organization suffers from severe knowledge silos, resulting in duplicate work, 2-month onboarding times, and quality issues. Existing solutions (Confluence, Notion, custom wikis) fail to capture the dynamic, interconnected nature of our engineering knowledge.

**Business Value**:
- **Productivity**: Reduce duplicate work by 40% (estimated $200K annual savings)
- **Talent**: Cut onboarding time from 8 weeks to 4 weeks
- **Quality**: Decrease context-related production incidents by 30%
- **Retention**: Improve engineer satisfaction scores by 20 points
- **Strategic**: Create searchable organizational memory that compounds over time

**Motivation**: Recent production incidents traced to knowledge gaps. High-value senior engineer left, taking critical system knowledge. New CTO prioritizing engineering excellence.

## Users & Personas

**Primary Users**:

1. **Professional Engineers (40 people)**
   - **Needs**: Fast knowledge discovery, easy contribution, trust in accuracy
   - **Success**: Find answers in < 30 seconds, contribute without friction
   - **Current Pain**: Slack searches, asking in channels, tribal knowledge

2. **New Hires (8-10 per year)**
   - **Needs**: Structured learning path, context about systems and decisions
   - **Success**: Feel productive within 2 weeks, not overwhelmed
   - **Current Pain**: Information overload, don't know what they don't know

**Secondary Users**:

3. **Engineering Leadership (5 people)**
   - **Needs**: Metrics on knowledge health, identify gaps, strategic insights
   - **Success**: Data-driven knowledge decisions, visibility into team learning
   - **Current Pain**: No metrics, reactive to knowledge problems

4. **Documentation Team (2 people)**
   - **Needs**: Content curation tools, quality assurance, engagement metrics
   - **Success**: High-quality knowledge base, sustainable maintenance
   - **Current Pain**: Manual curation, duplicate content, staleness

## Success Criteria

### Phase 1 Success (Q1 2025)
- [ ] 50% of engineering team actively using daily (25+ people)
- [ ] Average knowledge search time < 30 seconds (vs. 5 minutes today)
- [ ] 100+ knowledge articles contributed by team
- [ ] 8/10 satisfaction score from early adopters
- [ ] Zero security incidents related to platform

### Phase 2 Success (Q2 2025)
- [ ] 90% engineering team adoption (45+ people)
- [ ] Onboarding time reduced from 8 weeks to 6 weeks
- [ ] Duplicate work incidents down 25% (tracked via retro analysis)
- [ ] 500+ articles, 80% reviewed within last quarter
- [ ] Knowledge search top 3 most-used tools (survey data)

### Phase 3 Success (Q3 2025)
- [ ] Onboarding time at 4 weeks target
- [ ] 40% reduction in duplicate work
- [ ] 1000+ articles with high quality scores
- [ ] Integration with all core tools (GitHub, Slack, Notion)
- [ ] ROI positive vs. initial investment

### Long-term Success (12 months)
- [ ] Context-related production incidents down 30%
- [ ] Engineer satisfaction +20 points (engagement survey)
- [ ] Knowledge platform self-sustaining (community-driven)
- [ ] Becomes core part of engineering culture

## Scope & Boundaries

### Phase 1: Foundation (Q1 2025)

**In Scope**:
- Core knowledge graph infrastructure (Neo4j-based)
- Full-text semantic search (embedding-based)
- Article creation and editing (markdown-based)
- Basic curation workflow (review, approve, archive)
- Slack integration (search bot, notifications)
- GitHub integration (ADR/docs sync)
- Analytics dashboard (usage, gaps, quality)
- Access control (team-based permissions)

**Out of Scope**:
- AI content generation (human-authored only)
- Video content support (text/code only)
- External partner access (internal-only)
- Mobile apps (web + Slack bot sufficient)
- Real-time collaboration editing
- Version control beyond git

### Phase 2: Enrichment (Q2 2025)

**In Scope**:
- Notion integration (import existing docs)
- Personalized recommendations
- Knowledge health scoring
- Advanced curation tools
- Browser extension (capture from web)

**Out of Scope**:
- AI-generated summaries (maybe Phase 3)
- Cross-organization sharing
- API marketplace

### Phase 3: Intelligence (Q3 2025)

**In Scope** (tentative):
- AI-assisted search refinement
- Smart context suggestions
- Knowledge gap detection
- Automated staleness detection

**TBD**:
- [TBD - AI content generation approach - ethical/quality concerns]
- [TBD - External customer access model - security review needed]
- [TBD - Mobile app necessity - wait for user feedback]

### Explicitly Out of Scope (All Phases)

- Task/project management (use Jira/Linear)
- Code hosting (use GitHub)
- Communication platform (use Slack)
- Time tracking (not our purpose)
- Performance reviews (HR system)

## Context & Constraints

**Technical Constraints**:
- Must integrate with: GitHub, Slack, Notion, Google Workspace
- Security compliance: SOC 2 Type II required (impacts Q2 timeline)
- Performance: Sub-second search response times
- Scalability: Support 500 users (future growth)
- Privacy: No personal data in knowledge articles
- Audit trail: All changes logged for compliance

**Timeline & Phases**:
- **Q1 2025**: MVP with early adopters (10 people), core features
- **Q2 2025**: Full engineering rollout (50 people), integrations
- **Q3 2025**: Polish, intelligence features, measurement
- **Q4 2025**: Expand to product team (additional 20 people)

**Team Structure**:
- **Engineering**: 3 full-time engineers (1 lead, 2 senior)
- **Product**: 1 product manager (full-time)
- **Design**: 1 designer (part-time, 50%)
- **Curation**: 2 content curators (part-time, 25% each)
- **Advisory**: CTO (sponsor), 2 senior engineers (champions)

**Budget**:
- Engineering: $450K (team salaries)
- Infrastructure: $24K/year (Neo4j, embeddings API, hosting)
- Tools/licenses: $10K (various APIs, services)
- **Total Phase 1**: $484K

**Dependencies**:
- Neo4j database provisioned (DevOps team, by Nov 15)
- Voyage AI API access approved (Procurement, by Nov 20)
- Security review complete (InfoSec, by Dec 1)
- Slack bot permissions granted (IT, by Nov 25)

**Stakeholders & Governance**:
- **Sponsor**: CTO (final decisions, quarterly reviews)
- **Steering Committee**: VP Eng, Engineering Managers (monthly check-ins)
- **Champions**: 2 senior engineers (early feedback, advocacy)
- **InfoSec Review**: Required before production launch

## Risks & Mitigations

### High-Impact Risks

**Risk 1: Low Adoption**
- **Impact**: High (project failure)
- **Probability**: Medium
- **Mitigation**:
  - Champions program (2 senior engineers as advocates)
  - Integrate into onboarding (mandatory for new hires)
  - Weekly demos and wins shared in engineering all-hands
  - Gamification (contribution leaderboard, badges)
  - Make it better than Slack search (high bar)

**Risk 2: Content Quality Issues**
- **Impact**: High (trust erosion, abandonment)
- **Probability**: Medium
- **Mitigation**:
  - Curation team (2 part-time curators)
  - Peer review workflow (technical review required)
  - Quality scoring (freshness, accuracy, usefulness)
  - Easy reporting of inaccuracies
  - Regular content audits (quarterly)

**Risk 3: Maintenance Burden**
- **Impact**: Medium (unsustainable over time)
- **Probability**: High
- **Mitigation**:
  - Community ownership model (not centralized)
  - Automated staleness detection
  - Low-friction contribution (markdown, GitHub-like)
  - Curation as part of engineering culture
  - Metrics on contribution health

**Risk 4: Security/Compliance Issues**
- **Impact**: Critical (blocker)
- **Probability**: Low (with proper review)
- **Mitigation**:
  - Early InfoSec involvement (design phase)
  - SOC 2 compliance requirements integrated
  - Regular security audits
  - Access controls from day 1
  - Audit logging for all actions

### Medium-Impact Risks

**Risk 5: Integration Complexity**
- **Impact**: Medium (delayed timeline)
- **Probability**: Medium
- **Mitigation**:
  - Start with simplest integrations (Slack, GitHub)
  - Defer complex ones (Notion) to Phase 2
  - Allocate 30% buffer for integration work
  - Partner with platform teams early

**Risk 6: Scope Creep**
- **Impact**: Medium (delayed launch, complexity)
- **Probability**: High
- **Mitigation**:
  - Clear phase boundaries
  - Ruthless prioritization (must-have vs. nice-to-have)
  - Monthly scope reviews with product
  - Parking lot for Phase 2+ ideas

## Alternatives Considered

### Alternative 1: Confluence
- **Pros**: Battle-tested, Atlassian integration
- **Cons**: Rigid hierarchy, poor search, not engineering-friendly
- **Decision**: Rejected - doesn't fit our knowledge structure

### Alternative 2: Notion
- **Pros**: Flexible, modern UI, already using
- **Cons**: Not designed for knowledge graphs, limited API, search gaps
- **Decision**: Integrate as source, not replace

### Alternative 3: Custom Wiki (MediaWiki/GitBook)
- **Pros**: Full control, well-known patterns
- **Cons**: No graph capabilities, maintenance burden, dated UX
- **Decision**: Rejected - not differentiated enough

### Alternative 4: Obsidian/Roam
- **Pros**: Graph-native, markdown, popular
- **Cons**: Personal tools, not team-scale, limited integrations
- **Decision**: Inspiration, not solution

**Selected Approach**: Custom graph-based platform
- Unique knowledge graph capabilities
- Tailored to our engineering culture
- Integrates with existing tools
- Scales to organization needs

## Changelog

### v1.0 - 2025-11-10 - Initial Creation
- Created from comprehensive conversation during planning session
- Confidence: 89% - Excellent foundation with minor TBD items
- Participants: Chris Norton (Engineering), Claude (AI)
- Session duration: ~20 minutes
- **Well-defined**:
  - Clear problem statement with business case
  - Comprehensive user personas and needs
  - Phased success criteria with metrics
  - Detailed scope boundaries by phase
  - Risk mitigation strategies
  - Governance model and stakeholders
- **TBD Items**:
  - AI content generation approach (ethics/quality review needed)
  - External customer access model (security review pending)
  - Mobile app decision (defer until user feedback)

---

*Comprehensive charter - suitable for enterprise planning and governance*
```

---

## TBD Handling Strategies

### Strategy 1: Explicit TBD Marking

**When to Use**: Information explicitly requested but user didn't have clarity

**Format**:
```markdown
- [TBD - Authentication strategy to be determined after security review]
- [TBD - Team size unclear - depends on funding]
- [TBD - Mobile support decision deferred to Phase 2]
```

**Implementation**:
- Always include reason: "TBD - [why]"
- Be specific about what's unclear
- Note when it should be resolved (if mentioned)

---

### Strategy 2: Assumption Flagging

**When to Use**: Reasonable inference made, but should be verified

**Format**:
```markdown
**Technical Constraints**:
- Must work offline (stated)
- [Assumed: Browser compatibility back to 2 years - verify with team]
- [Assumed: No IE11 support - confirm acceptable]
```

**Implementation**:
- Mark with `[Assumed: ...]`
- Make inference explicit
- Prompt for verification

---

### Strategy 3: Partial Information

**When to Use**: Some clarity exists, but incomplete

**Format**:
```markdown
**Timeline**:
- Beta target: 6 weeks (stated)
- Production: TBD - depends on beta feedback
- [Partial: Monthly iterations mentioned but cadence unclear]
```

**Implementation**:
- State what's known clearly
- Mark gaps with "TBD" or "[Partial: ...]"
- Don't extend beyond what was said

---

### Strategy 4: Conditional Inclusion

**When to Use**: Feature/aspect mentioned conditionally

**Format**:
```markdown
### Out of Scope
- No cloud sync (stated)
- [Maybe Later: Team sharing if initial version succeeds]
- [Conditional: Mobile app only if web adoption > 80%]
```

**Implementation**:
- Mark with `[Maybe Later: ...]` or `[Conditional: ...]`
- State the condition clearly
- Don't promote to definite plan

---

## Changelog Format

Every charter includes a changelog tracking its evolution.

### Initial Creation Entry

```markdown
### v1.0 - 2025-11-10 - Initial Creation
- Created from conversation during `ginko init`
- Confidence: 73% - Good foundation, some TBD
- Participants: Chris Norton, Claude
- Session duration: ~10 minutes
- **Well-defined**: Purpose, users, core scope, success criteria
- **TBD Items**: Team features, integration strategy, timeline details
- **Work Mode**: Think & Build (detected from conversation depth)
```

### Edit Entry

```markdown
### v1.1 - 2025-11-12 - Scope Clarification
- Updated via conversational edit (`ginko charter --edit`)
- **Changes**:
  - Added explicit exclusion: No mobile apps in v1.0
  - Clarified timeline: Beta by Dec 15, production by Feb 1
  - Refined success criteria: Added measurable metrics
- **Confidence**: 73% → 81% (scope and timeline clearer)
- **Participants**: Chris Norton, Claude
```

### Major Revision Entry

```markdown
### v2.0 - 2025-11-20 - Pivot to Team Focus
- **Breaking Changes**:
  - Shifted from solo tool to team collaboration platform
  - Added stakeholder: Engineering Manager (new primary user)
  - Scope expanded: Team context sharing now in-scope
  - Timeline extended: Production now March 1 (was Feb 1)
- **Rationale**: User research showed team need > individual need
- **Impact**: Significant architecture implications
- **Confidence**: 81% → 68% (new scope needs refinement)
- **Participants**: Chris Norton, Claude
- **⚠️ Warning**: Major assumptions changed - review dependencies
```

### Changelog Best Practices

1. **Version Semantics**:
   - **Patch** (1.0 → 1.0.1): Typos, minor clarifications
   - **Minor** (1.0 → 1.1): New details, refinements, scope additions
   - **Major** (1.0 → 2.0): Breaking changes, pivots, major scope shifts

2. **Entry Requirements**:
   - Date and version number
   - Change type (creation, edit, revision)
   - What changed (specific bullets)
   - Confidence delta (if significant)
   - Participants

3. **Warning Flags**:
   - Use ⚠️ for breaking changes
   - Explain impact on downstream work
   - Call out assumption changes

---

## Synthesis Quality Checklist

Before finalizing charter:

- [ ] **User Voice Preserved**: Key phrases in user's exact words
- [ ] **TBD Marked**: All unclear areas explicitly flagged
- [ ] **Work Mode Appropriate**: Depth matches conversation signals
- [ ] **Organized Coherently**: Narrative flow, not bullet dump
- [ ] **Specific & Concrete**: Avoids vague language
- [ ] **Confidence Accurate**: Score matches actual clarity
- [ ] **Changelog Complete**: Initial entry with details
- [ ] **Actionable**: Clear enough to guide work
- [ ] **Honest**: Doesn't oversell or invent clarity
- [ ] **Useful for AI**: Provides context for intelligent assistance

---

## Anti-Patterns to Avoid

### ❌ Corporate Speak

**Bad:**
```markdown
**Purpose**: To leverage synergies in the developer experience domain by implementing a paradigm-shifting solution for context management...
```

**Good:**
```markdown
**Purpose**: Developers lose 30 minutes daily switching between projects. We're building a tool to capture and restore full context in < 5 seconds.
```

---

### ❌ Invented Detail

**Bad:**
```markdown
**Technical Constraints**:
- Built with React 18 and TypeScript 5.2
- Deployed on AWS Lambda with DynamoDB
- Uses OpenAI GPT-4 for intelligence
[USER NEVER MENTIONED ANY OF THIS]
```

**Good:**
```markdown
**Technical Constraints**:
- Must work offline (stated)
- [TBD - Tech stack to be determined]
- [TBD - Deployment strategy]
```

---

### ❌ Bullet Dump

**Bad:**
```markdown
## Purpose
- User wants tool
- Problem with current solutions
- Needs to be fast
- Team usage
- Save time
```

**Good:**
```markdown
## Purpose & Value

Current API key management tools are too complex for our team's simple local development needs. We waste time navigating enterprise features we don't use. A lightweight CLI focused on the essentials (add, list, delete) would save 15 minutes per developer per day and reduce the friction of working across multiple projects.
```

---

### ❌ Vague Success

**Bad:**
```markdown
## Success Criteria
- Users are happy
- Works well
- Better than before
```

**Good:**
```markdown
## Success Criteria
- [ ] Manage API keys in < 30 seconds (vs. 5 minutes today)
- [ ] Zero leaked keys in git (current problem)
- [ ] 8/10 team satisfaction score within 2 weeks
- [ ] Daily usage by 80% of dev team
```

---

## Implementation Notes

The synthesizer is implemented in `packages/cli/src/lib/charter/charter-synthesizer.ts` and uses:

1. **Extraction Engine**: Pulls structured data from conversation
2. **Template Engine**: Generates markdown from extracted data
3. **TBD Detector**: Identifies unclear areas based on confidence scores
4. **Voice Preserver**: Uses direct quotes for impactful statements
5. **Work Mode Adapter**: Adjusts depth based on detected mode

**Key Dependencies**:
- `confidence-scorer.ts`: Provides confidence metrics
- `conversation-context.ts`: Provides conversation exchanges
- `question-templates.ts`: Maps exchanges to charter aspects

---

## Related Documents

- `docs/design/CHARTER-CONVERSATION-DESIGN.md` - Conversation patterns
- `packages/cli/src/lib/charter/confidence-scorer.ts` - Confidence algorithm
- `docs/examples/charter-conversations/` - Example conversations showing synthesis

---

*Last Updated: 2025-11-10*
*Version: 1.0*
*Status: Design Specification*
