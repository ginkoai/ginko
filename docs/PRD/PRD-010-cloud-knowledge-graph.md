# PRD-010: Cloud-First Knowledge Graph Platform

## Status
**Proposed** - Sprint starting 2025-10-27

## Metadata
- **Type**: Product Requirement Document
- **Priority**: Critical (Strategic Pivot)
- **Created**: 2025-10-27
- **Author**: Chris Norton & Claude
- **Related**: ADR-039 (Knowledge Graph Architecture)
- **Sprint**: SPRINT-2025-10-27-cloud-knowledge-graph

## Executive Summary

**What**: Multi-tenant cloud platform for AI-native knowledge management with graph database backend

**Why**: Current file-based knowledge doesn't scale for team collaboration or cross-project discovery. OSS projects lack structured, searchable architecture documentation.

**How**: Cloud-first graph database with GitHub OAuth, freemium business model, and public discovery for open source projects

**Business Model**: Free for public OSS repositories, paid for private projects and teams

## Problem Statement

### Current State: File-Based Knowledge Silos

**Individual Developers:**
- Knowledge scattered across: ADRs (`docs/adr/`), PRDs (`docs/PRD/`), context modules (`.ginko/context/modules/`)
- No cross-project discovery: "What authentication patterns exist across my projects?"
- Linear file search doesn't scale beyond 100-200 documents
- Manual maintenance of relationships between documents

**Development Teams:**
- Knowledge sharing via git commits only
- No real-time collaboration on architecture decisions
- Manual synchronization of context modules across team members
- Onboarding requires reading dozens of files to understand project knowledge

**Open Source Projects:**
- Architecture decisions buried in markdown files
- Contributors can't easily discover "why" behind code
- No searchable knowledge base separate from code
- Lost opportunity to showcase decision-making process

### Pain Points

1. **Scalability**: Linear file search fails at 1000+ knowledge items
2. **Discoverability**: No query interface for "Show me all auth patterns" or "ADRs implementing PRD-006"
3. **Collaboration**: File-based knowledge requires manual synchronization
4. **Cross-Project Insights**: Can't search knowledge across multiple repositories
5. **OSS Showcase**: No public-facing knowledge graph for open source projects

## Strategic Context

### Market Opportunity: Open Source Free Tier

**Model**: Free unlimited knowledge graph hosting for public GitHub repositories

**Strategic Benefits:**
1. **Community Goodwill** - Support OSS developers, build Ginko brand
2. **Network Effects** - Public knowledge graphs become searchable, discoverable community resource
3. **Validation Funnel** - OSS users upgrade when projects go commercial/private
4. **Content Marketing** - Public graphs = SEO, examples, case studies, social proof
5. **Proof of Value** - Developers experience full product before paying

**Comparable Examples:**
- **Vercel**: Free for OSS, paid for commercial (drives 70% of conversions)
- **Supabase**: Free tier with upgrade path (proven OSS-to-paid funnel)
- **GitHub Copilot**: Free for verified OSS maintainers (community engagement)

**Conversion Funnel:**
```
OSS Developer → Free public graph → Project goes commercial →
→ Needs private knowledge → Upgrades to paid tier
```

### Value Proposition

**For Individual Developers:**
- Intelligent knowledge discovery across all projects
- Preserve existing `ginko` CLI workflow (backward compatible)
- Automatic relationship tracking (ADRs → PRDs → Code)

**For Teams:**
- Shared knowledge graph with real-time collaboration
- GitHub-linked permissions (inherit repo visibility)
- Team onboarding: query relevant knowledge instantly

**For OSS Projects:**
- Public knowledge graph showcases architecture decisions
- Searchable by community (marketing + engagement)
- Free forever (no vendor lock-in concerns)

**For Paid Customers:**
- Private knowledge with team access control
- Advanced features (analytics, integrations, exports)
- SLA guarantees and support

## Solution Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Ginko Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   GitHub     │  │    Graph     │  │    GraphQL      │  │
│  │   OAuth      │→│   Database   │←→│   API Server    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                           ↕                    ↕            │
│                    ┌──────────────┐     ┌──────────────┐  │
│                    │ Authorization│     │   Public     │  │
│                    │   Service    │     │  Discovery   │  │
│                    └──────────────┘     └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕                    ↕
                  ┌──────────────┐      ┌──────────────┐
                  │  Ginko CLI   │      │  Dashboard   │
                  │  (preserved) │      │   (future)   │
                  └──────────────┘      └──────────────┘
```

### Core Components

#### 1. GitHub OAuth Authentication
- **Zero ginko-hosted credentials**: All auth through GitHub
- **OAuth scopes**: Read repo metadata, team membership, email
- **User creation**: Auto-create on first login
- **Benefits**:
  - Target audience already has GitHub accounts
  - Inherit repo visibility automatically
  - Easy org/team member discovery

#### 2. Graph Database
**Research Sprint Required** - Evaluate options:

| Option | Pros | Cons | Est. Cost |
|--------|------|------|-----------|
| **PostgreSQL + Apache AGE** | Leverage existing Supabase, familiar SQL | Less graph-optimized, complex queries verbose | $0 (use Supabase) |
| **Neo4j AuraDB** | Most mature, rich ecosystem, Cypher queries | Managed service cost, vendor lock-in | $65-200/mo |
| **Neo4j Self-Hosted** | Full control, no vendor lock-in | Ops overhead, maintenance | $20-50/mo (Hetzner/DO) |
| **DGraph** | GraphQL-native, horizontally scalable | Less mature, smaller community | $30-100/mo (self-host) |
| **EdgeDB** | Modern, TypeScript-friendly, elegant | Very new, limited ecosystem | $40-80/mo |

**Evaluation Criteria:**
1. **Cost**: <$100/mo for 100 projects, 10K nodes
2. **Performance**: Query latency <50ms for complex graph traversals
3. **Multi-tenancy**: Efficient data isolation per project
4. **Developer Experience**: TypeScript SDK, good error messages
5. **Scalability**: Horizontal scaling path to 1M+ nodes
6. **Self-hosting**: Ability to run on Hetzner/DO/Linode

**Decision Timeline**: Week 1 of sprint (prototype each option)

#### 3. GraphQL API
**Based on ADR-039 Schema** (see ADR-039 for full schema)

**Core Query Capabilities:**
```graphql
# Universal search across knowledge types
search(query: String!, types: [NodeType!], tags: [String!]): [KnowledgeNode!]!

# Find knowledge by tags
nodesByTag(tag: String!, types: [NodeType!]): [KnowledgeNode!]!

# Context-aware discovery
relevantToContext(files: [String!], branch: String, tags: [String!]): [KnowledgeNode!]!

# Relationship traversal
nodeGraph(nodeId: ID!, depth: Int = 2): GraphResult!

# Implementation tracking
adrImplementation(adrNumber: Int!): ADRImplementationStatus!
prdProgress(prdId: String!): PRDProgress!
```

**Node Types:**
- `ADR` - Architecture Decision Records
- `PRD` - Product Requirements Documents
- `ContextModule` - Patterns, gotchas, insights
- `Session` - Development session logs
- `CodeFile` - Source file metadata (frontmatter)

**Edge Types:**
- `references`, `implements`, `depends-on`, `related-to`
- `tagged-with`, `affects`, `discovered-in`, `evolved-from`

#### 4. CLI Integration
**Preserve Existing UX** - Commands work identically, but backed by cloud

**Current (File-Based):**
```bash
ginko start                  # Loads local files
ginko context search "auth"  # Greps local files
ginko log "Fixed bug"        # Writes to local session log
```

**New (Cloud-Backed):**
```bash
ginko start                  # Syncs from cloud + loads local
ginko context search "auth"  # Queries cloud GraphQL API
ginko log "Fixed bug"        # Posts to cloud + local session
```

**Authentication Flow:**
```bash
# First-time setup
ginko login                  # Opens GitHub OAuth in browser
                             # Saves API token locally

# All subsequent commands authenticated via token
ginko knowledge search "patterns"  # Uses saved token
```

**Offline Mode:**
- Commands fail gracefully with clear error messages
- Local cache for read operations (future enhancement)
- Offline queue for writes (future enhancement)

#### 5. Authorization Service
**Zero-Trust Architecture** - Every API call verifies access

**Permission Model:**
```typescript
interface Project {
  id: string;
  name: string;
  githubRepoUrl: string;
  visibility: 'public' | 'private';
  owners: User[];      // Can add/remove members, edit config
  members: User[];     // Can read/write knowledge
}

interface User {
  githubId: string;
  githubUsername: string;
  email: string;
  teams: Team[];
}

interface Team {
  id: string;
  name: string;
  members: User[];
  projects: Project[];
}
```

**Authorization Rules:**
1. **Public Projects**: Anyone can read, members can write
2. **Private Projects**: Only members can read/write
3. **Project Ownership**: Owners can add/remove members, transfer ownership
4. **At Least One Owner**: Projects must have ≥1 owner at all times
5. **Creator = Default Owner**: User who creates project is initial owner

**GitHub-Linked Permissions:**
- If GitHub repo is private → Ginko project must be private
- If user has repo access in GitHub → Can request project access
- Periodic sync of GitHub repo visibility (webhook or polling)

#### 6. Public Discovery (OSS Feature)
**Searchable Catalog of Open Source Knowledge Graphs**

**Use Cases:**
- "Show me authentication patterns from popular OSS projects"
- "How does React handle state management decisions?" (query React's ADRs)
- "Find projects using serverless architecture" (tag-based discovery)

**Features:**
- **Public Index**: Search across all public project knowledge graphs
- **Project Profiles**: Showcase page per OSS project
- **Tag Clouds**: Discover projects by technology/pattern tags
- **Trending Knowledge**: Most-viewed ADRs, patterns this week
- **Export/Share**: Link to specific knowledge nodes

**Privacy:**
- Only public GitHub repos appear in discovery
- Projects can opt-out of discovery (stay public but not searchable)
- Individual knowledge nodes can be marked private within public projects

**Marketing Value:**
- SEO: Every public ADR/PRD/module is indexed
- Social Proof: "1,247 OSS projects use Ginko"
- Community Resource: Developers cite Ginko knowledge graphs in discussions

## Multi-Tenancy Model

### Entity Hierarchy

```
Organization (Future)
  ├── Team 1
  │   ├── Project A (members: Alice, Bob)
  │   └── Project B (members: Bob, Charlie)
  ├── Team 2
  │   └── Project C
  └── Individual Projects (not in teams)

Individual (Current MVP)
  ├── Personal Projects
  └── Member of Teams
```

**Current MVP Scope:**
- ✅ Individuals (GitHub users)
- ✅ Teams (collections of users)
- ✅ Projects (knowledge scopes)
- ⏭️ Organizations (future - team hierarchy)

**Extensibility:**
- Architecture supports `Organization` → `Team` → `Project` → `Knowledge`
- Database schema includes `organization_id` (nullable for MVP)
- Future migration: Add org layer without breaking existing teams/projects

### Database Schema (Conceptual)

```sql
-- Users (from GitHub OAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team membership
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',  -- 'owner' | 'member'
  PRIMARY KEY (team_id, user_id)
);

-- Projects (knowledge scopes)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  github_repo_url VARCHAR(500),
  visibility VARCHAR(20) DEFAULT 'private',  -- 'public' | 'private'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project access (owners + members)
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',  -- 'owner' | 'member'
  granted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Project team access
CREATE TABLE project_teams (
  project_id UUID REFERENCES projects(id),
  team_id UUID REFERENCES teams(id),
  PRIMARY KEY (project_id, team_id)
);

-- Knowledge nodes stored in graph database
-- (schema depends on graph DB selection)
```

### Access Control Examples

**Scenario 1: Individual Developer (Alice)**
```
Alice creates "my-saas-app" project
→ Alice is owner by default
→ Project is private (GitHub repo is private)
→ Alice can read/write all knowledge
```

**Scenario 2: Team Collaboration**
```
Bob creates "team-api" project
→ Bob adds "Engineering" team
→ All Engineering team members get read/write access
→ Bob can add Charlie as co-owner
→ Bob cannot remove himself if he's the only owner
```

**Scenario 3: OSS Project**
```
Charlie creates "awesome-lib" project (public GitHub repo)
→ Project auto-detected as public
→ Anyone can read knowledge graph
→ Only Charlie (owner) + invited members can write
→ Project appears in public discovery catalog
```

## Business Model

### Pricing Tiers

#### Free Tier: Open Source
**Target**: Public GitHub repositories

**Features:**
- ✅ Unlimited public projects
- ✅ Unlimited knowledge nodes (ADRs, PRDs, modules)
- ✅ Full GraphQL query API
- ✅ CLI access (`ginko` commands)
- ✅ Public discovery (opt-in searchable catalog)
- ✅ Export to git (markdown files)
- ⏭️ Community support (GitHub Discussions)

**Limits:**
- Must be linked to public GitHub repo
- No private knowledge
- No team collaboration features
- Standard SLA (99% uptime, best-effort support)

**Value to Ginko:**
- Marketing and SEO (every public graph is indexed)
- Community engagement and goodwill
- Validation funnel (OSS → paid conversion)
- User testimonials and case studies

#### Paid Tier: Private Projects (Starting $10/mo per project)
**Target**: Commercial projects, private repositories, team collaboration

**Features:**
- ✅ Everything in Free tier
- ✅ Private projects (GitHub-linked permissions)
- ✅ Team collaboration (up to 10 members per project)
- ✅ Advanced analytics (query patterns, usage metrics)
- ✅ Priority support (email, 24hr response)
- ✅ SLA guarantee (99.9% uptime)
- ✅ API rate limits: 10K requests/day
- ✅ Export integrations (Notion, Confluence)

**Pricing Model:**
- $10/month per private project (unlimited knowledge nodes)
- $5/month per additional team member beyond 10
- $50/month for organizations (unlimited teams, 100 members)

**Upsell Path:**
- Start: Individual dev with 1-2 private projects ($10-20/mo)
- Grow: Add team members as project scales ($30-50/mo)
- Scale: Upgrade to organization plan ($50+/mo)

#### Enterprise Tier: Self-Hosted (Custom Pricing)
**Target**: Large organizations, strict compliance requirements

**Features:**
- ✅ Self-hosted graph database (on-premise or VPC)
- ✅ SSO integration (SAML, OIDC)
- ✅ Compliance (SOC2, HIPAA, GDPR controls)
- ✅ Unlimited projects, teams, members
- ✅ Dedicated support (Slack channel, 4hr SLA)
- ✅ Custom integrations and training

**Pricing**: Custom (starts at $500/month for 50-seat minimum)

### Revenue Model

**Year 1 Targets:**
- 500 free OSS projects (marketing value)
- 50 paid individual developers ($10/mo × 50 = $500/mo)
- 10 paid teams ($50/mo × 10 = $500/mo)
- **MRR**: ~$1,000/mo by month 6

**Year 2 Targets:**
- 2,000 free OSS projects
- 200 paid individuals ($2,000/mo)
- 50 paid teams ($2,500/mo)
- 5 enterprise customers ($2,500/mo)
- **MRR**: ~$7,000/mo ($84K ARR)

### Competitive Pricing Analysis

| Product | Free Tier | Paid Tier | Business Model |
|---------|-----------|-----------|----------------|
| **Vercel** | Unlimited OSS | $20/mo pro | Freemium, OSS-first |
| **Supabase** | 500MB DB free | $25/mo pro | Freemium, generous free tier |
| **Linear** | None | $8/user/mo | Paid-only, team focus |
| **Notion** | Personal free | $8/user/mo | Freemium, workspace model |
| **Ginko** | Unlimited OSS | $10/project/mo | Freemium, OSS-first |

**Differentiation**: Project-based pricing (not per-user) aligns with how developers think about knowledge scopes.

## MVP Scope (Sprint 1)

### Week 1: Research & Foundation
**Goal**: Select graph database, prototype auth

**Tasks:**
- [ ] Evaluate graph DB options (PostgreSQL+AGE, Neo4j, DGraph)
- [ ] Prototype each with sample knowledge graph (100 nodes)
- [ ] Benchmark query performance, cost estimates
- [ ] **Decision**: Select graph DB for MVP
- [ ] Setup GitHub OAuth app (production + staging)
- [ ] Implement basic auth flow (login, token generation)
- [ ] Database schema design (users, teams, projects)

**Deliverables:**
- Graph DB selection documented with rationale
- Working GitHub OAuth prototype
- Database schema SQL scripts

### Week 2: Core CRUD + Multi-Tenancy
**Goal**: Store/retrieve knowledge, project authorization

**Tasks:**
- [ ] Implement knowledge node CRUD (create, read, update, delete)
- [ ] Project creation and ownership
- [ ] Team creation and member management
- [ ] Project member authorization (owners vs members)
- [ ] GitHub repo visibility sync
- [ ] API authentication middleware

**Deliverables:**
- Users can create private/public projects
- Users can add team members to projects
- Authorization enforced on all operations

### Week 3: GraphQL API + CLI Integration
**Goal**: Query interface, CLI commands work

**Tasks:**
- [ ] Implement GraphQL schema (per ADR-039)
- [ ] Core resolvers: `search()`, `nodesByTag()`, `node()`
- [ ] Relationship resolvers: `nodeGraph()`, `references()`
- [ ] CLI: `ginko login` command (OAuth flow)
- [ ] CLI: `ginko knowledge search` (query cloud API)
- [ ] CLI: `ginko knowledge create` (push to cloud)
- [ ] CLI: `ginko start` (sync cloud + local)

**Deliverables:**
- Working GraphQL API with 5+ core queries
- CLI commands authenticated and functional
- Backward compatibility with existing `ginko` workflow

### Week 4: Public Discovery + Polish
**Goal**: OSS catalog, production-ready

**Tasks:**
- [ ] Public project index (searchable catalog)
- [ ] Public discovery API endpoints
- [ ] Project visibility toggle (opt-out of discovery)
- [ ] Error handling and validation
- [ ] Rate limiting (API quotas)
- [ ] Monitoring and logging setup
- [ ] Production deployment (infrastructure selection)

**Deliverables:**
- Public OSS project catalog live
- Production API deployed
- Monitoring dashboards configured

### Out of Scope (Post-MVP)
- ⏭️ Web dashboard UI (CLI-first MVP)
- ⏭️ Real-time collaboration (websockets)
- ⏭️ Git export automation (scheduled syncs)
- ⏭️ Advanced analytics (query insights, usage patterns)
- ⏭️ Integrations (Notion, Confluence, Slack)
- ⏭️ Organizations (team hierarchy)

## Migration Strategy

### Phase 1: Greenfield (Week 1-4)
- New projects start cloud-native
- No migration of existing file-based knowledge
- Existing `ginko` commands work with local files (unchanged)

### Phase 2: Hybrid Mode (Month 2)
- CLI detects local knowledge files
- Offers one-time migration: `ginko migrate --to-cloud`
- Migrates ADRs, PRDs, modules to cloud project
- Optionally preserves local files (git export mode)

### Phase 3: Cloud-Native (Month 3+)
- Recommend cloud-first workflow for new users
- Existing users can maintain local files indefinitely
- Git export feature ensures no lock-in

### Backward Compatibility Guarantees
1. **CLI Commands**: Existing `ginko` commands continue working with local files
2. **File Format**: Can always export knowledge to markdown files
3. **Data Portability**: GraphQL API allows full data export
4. **No Forced Migration**: Users opt-in to cloud at their pace

## Technical Architecture

### Infrastructure Options

#### Option 1: Leverage Existing Vercel + Supabase
**Pros:**
- Already have production Supabase instance
- Vercel serverless functions for API
- Familiar deployment process
- Can add Apache AGE extension to Supabase Postgres

**Cons:**
- Graph queries less optimized in PostgreSQL
- Vercel function cold starts (200-500ms)
- Supabase pricing scales with DB size

**Cost Estimate:**
- Supabase Pro: $25/mo (existing)
- Vercel Pro: $20/mo (existing)
- Apache AGE: Free (extension)
- **Total**: $45/mo (current infrastructure)

#### Option 2: Self-Hosted Graph DB (Hetzner/DO)
**Pros:**
- Full control over infrastructure
- Fixed costs (not usage-based)
- Better graph query performance
- Can optimize for multi-tenancy

**Cons:**
- Ops overhead (monitoring, backups, scaling)
- Need DevOps expertise
- Uptime responsibility

**Cost Estimate:**
- Hetzner CX31 (8GB RAM, 2 vCPU): €12/mo (~$13)
- Neo4j/DGraph self-hosted: Free
- Backups (Hetzner Volume): €5/mo
- **Total**: ~$20/mo

#### Option 3: Hybrid (Vercel + Self-Hosted Graph)
**Pros:**
- Best of both: Vercel for API, self-hosted for graph
- Optimize costs (cheap graph DB, scalable API)
- Can migrate graph DB later without API changes

**Cons:**
- More complex architecture
- Network latency (Vercel ↔ Hetzner)
- Need VPN or secure connectivity

**Cost Estimate:**
- Vercel Pro: $20/mo
- Hetzner graph DB: $15/mo
- **Total**: $35/mo

**Recommendation**: Start with Option 1 (Vercel + Supabase + AGE) for fastest MVP. Evaluate Option 2/3 if costs scale beyond $100/mo.

### API Design

**GraphQL API Endpoint:**
```
https://api.ginko.ai/graphql
```

**Authentication:**
```http
POST /graphql
Authorization: Bearer <github-oauth-token>
Content-Type: application/json

{
  "query": "query { search(query: \"auth\") { title type } }"
}
```

**Rate Limits:**
- Free tier: 1,000 requests/day
- Paid tier: 10,000 requests/day
- Enterprise: Unlimited (fair use)

**Error Handling:**
```json
{
  "errors": [
    {
      "message": "Unauthorized: Invalid API token",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "suggestion": "Run 'ginko login' to authenticate"
      }
    }
  ]
}
```

### CLI Implementation

**Architecture:**
```
ginko CLI (local)
  ↓ HTTPS
Vercel Serverless Function
  ↓ Internal
Graph Database
```

**Command Flow Example:**
```bash
# User runs command
ginko knowledge search "authentication"

# CLI reads local token (~/.ginko/auth.json)
# Sends GraphQL query to api.ginko.ai
# Receives results, formats for terminal
# Displays: 5 matching ADRs, 3 patterns
```

**Local Token Storage:**
```json
// ~/.ginko/auth.json
{
  "github_token": "gho_xxxxxxxxxxxx",
  "user_id": "uuid-xxxx-xxxx",
  "expires_at": "2025-11-27T00:00:00Z"
}
```

## User Flows

### Flow 1: OSS Developer First-Time Setup
1. Developer has public GitHub repo with ADRs in `docs/adr/`
2. Runs `ginko login` → Opens GitHub OAuth
3. Authorizes Ginko app (read repo metadata)
4. Creates project: `ginko project create --repo=github.com/user/repo`
5. Migrates existing knowledge: `ginko migrate --from=./docs`
6. Knowledge now queryable: `ginko knowledge search "api design"`
7. Project appears in public discovery catalog

### Flow 2: Team Inviting Member
1. Project owner (Alice) wants to add Bob to "saas-api" project
2. Runs `ginko project add-member saas-api bob@github`
3. Bob receives email notification
4. Bob accepts invitation via link
5. Bob can now query project: `ginko knowledge search "auth" --project=saas-api`
6. Bob creates new ADR: `ginko adr create "Use JWT tokens"`
7. ADR visible to all project members

### Flow 3: Upgrading from OSS to Paid
1. Developer working on public "my-app" repo
2. Project goes commercial, makes repo private
3. GitHub webhook notifies Ginko of visibility change
4. Ginko blocks write operations: "This project requires paid tier"
5. Developer runs `ginko upgrade --project=my-app`
6. Enters payment info, subscribes to $10/mo plan
7. Project becomes private, knowledge hidden from public discovery

## Success Metrics

### Infrastructure Metrics
- **Query Performance**: <50ms p95 for complex graph queries
- **Uptime**: 99.9% availability (SLA for paid tier)
- **Scalability**: Support 10K concurrent users, 1M knowledge nodes
- **Cost Efficiency**: <$100/mo infrastructure for 100 projects

### Adoption Metrics
- **OSS Projects**: 100 public projects in 3 months
- **Paid Conversion**: 10% of OSS users upgrade to paid within 6 months
- **User Growth**: 500 registered users in 6 months
- **Engagement**: 5+ knowledge queries per user per session

### Discovery Metrics
- **Public Searches**: 1,000+ public graph searches per month
- **SEO Impact**: 10K organic visits to public knowledge graphs per month
- **Community Engagement**: 50+ external references to Ginko knowledge graphs

### Business Metrics
- **MRR Growth**: $1,000/mo by month 6
- **CAC**: <$50 per paid customer (primarily inbound from OSS)
- **Churn**: <5% monthly churn (annual contracts)
- **NPS**: >50 (developer satisfaction)

### Quality Metrics
- **API Errors**: <0.1% error rate
- **Customer Support**: <24hr response time
- **Feature Requests**: Prioritize top 5 requested features quarterly

## Marketing Strategy

### Launch Plan (Month 1)

**Week 1: Soft Launch**
- Private beta with 10 friendly OSS projects
- Collect feedback, iterate on UX
- Fix critical bugs

**Week 2: Community Launch**
- Public beta announcement on GitHub Discussions
- Blog post: "Ginko Cloud - Free Knowledge Graphs for OSS"
- Reach out to 20 popular OSS projects directly

**Week 3: Developer Community**
- Post on Hacker News: "Show HN: Free Knowledge Graphs for OSS Projects"
- Share on r/programming, r/opensource
- Twitter thread with examples from beta projects

**Week 4: Content Marketing**
- Case study: "How [Popular OSS Project] uses Ginko"
- Technical deep-dive blog post
- Video walkthrough (YouTube, Twitter)

### Ongoing Marketing (Month 2+)

**Content Strategy:**
- Weekly blog posts featuring OSS projects using Ginko
- Developer interviews (podcasts, YouTube)
- Documentation and tutorials
- Example knowledge graphs as templates

**Community Engagement:**
- Sponsor OSS conferences (speaking, booth)
- Contribute to developer tool discussions
- GitHub sponsors program (give back to OSS)

**SEO Strategy:**
- Every public knowledge graph indexed
- Target keywords: "architecture decision records", "ADR tool", "team documentation"
- Backlinks from OSS projects (powered by Ginko badges)

## Risks & Mitigations

### Risk 1: GitHub API Rate Limits
**Impact**: High - OAuth and repo sync depend on GitHub API

**Mitigation:**
- Use OAuth tokens (5,000 requests/hour vs 60 unauthenticated)
- Cache repo metadata (sync every 24 hours, not real-time)
- Implement exponential backoff for rate limit errors
- Offer manual visibility toggle (fallback if sync fails)

### Risk 2: Graph Database Scaling Costs
**Impact**: Medium - Could hit limits at 1M+ nodes

**Mitigation:**
- Start with PostgreSQL+AGE (leverage existing Supabase)
- Monitor query performance and costs monthly
- Plan migration to self-hosted Neo4j if costs exceed $200/mo
- Implement query complexity limits (prevent expensive operations)

### Risk 3: Low OSS Adoption
**Impact**: High - Business model depends on OSS funnel

**Mitigation:**
- Partner with 10-20 popular OSS projects pre-launch
- Offer migration assistance (white-glove onboarding)
- Create compelling case studies and examples
- Invest in content marketing and SEO

### Risk 4: Privacy Concerns (Code Leakage)
**Impact**: Critical - Could prevent adoption

**Mitigation:**
- Clear documentation: "Ginko never stores source code"
- Architecture docs only (ADRs, PRDs, patterns)
- Optional: End-to-end encryption for sensitive knowledge
- SOC2 compliance roadmap (transparency)

### Risk 5: Competitor Launches Similar Product
**Impact**: Medium - Could commoditize offering

**Mitigation:**
- Focus on developer experience (CLI-first, backward compatible)
- OSS-first positioning (free tier is table stakes)
- Network effects (public discovery, shared patterns)
- Execution speed (ship MVP in 1 month)

## Appendix

### Related Documents
- **ADR-039**: Knowledge Discovery Graph (original git-native vision)
- **BACKLOG-MVP.md**: Original session handoff MVP backlog
- **SPRINT-2025-10-27-cloud-knowledge-graph.md**: Implementation sprint plan

### Open Questions
1. Should we support non-GitHub authentication (GitLab, Bitbucket)?
   - **Decision**: GitHub-only for MVP, evaluate later based on demand

2. How to handle knowledge that references deleted GitHub repos?
   - **Decision**: Archive project (read-only mode), allow export

3. Should free tier have storage limits?
   - **Decision**: Unlimited for public repos (storage is cheap, marketing value high)

4. What's the migration path for existing `app.ginko.ai` users?
   - **Decision**: Defer integration until cloud graph proven (greenfield first)

### Success Criteria for Moving to Next Phase
- ✅ 50+ OSS projects using Ginko Cloud
- ✅ 5+ paid customers (validate pricing)
- ✅ <50ms query performance
- ✅ <$100/mo infrastructure costs
- ✅ NPS >40 (early adopter satisfaction)

---

**Document Status**: Draft - Ready for review and sprint planning
**Next Steps**:
1. Review with stakeholders
2. Create sprint plan (SPRINT-2025-10-27-cloud-knowledge-graph.md)
3. Begin Week 1 graph DB evaluation
