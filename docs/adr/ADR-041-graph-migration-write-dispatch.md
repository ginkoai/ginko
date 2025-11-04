# ADR-041: Graph Migration Strategy and Write Dispatch Architecture

## Status
Accepted

## Date
2025-11-02

## Context

### The Migration Challenge

Following ADR-039's decision to implement a cloud-first knowledge graph, we face a critical operational challenge: **how to migrate from local-first (file-based) to cloud-first (graph-based) without breaking existing workflows or causing data loss.**

**Current State (Local-First):**
```
ginko adr create "Decision"
  ↓
Writes to: docs/adr/ADR-042.md
Reads from: docs/adr/*.md
```

**Target State (Cloud-First):**
```
ginko adr create "Decision"
  ↓
Writes to: Neo4j Cloud Graph
Reads from: Neo4j Cloud Graph
```

### Source of Truth Ambiguity Problem

The naive approach (feature flags) creates ambiguity, especially with AI assistants:

```bash
# Scenario: AI assistant executing commands
Human: "start"
AI: Runs `ginko start` (which source? local or graph?)
  ↓
Reads from: Local files (old data) ❌
  ↓
Human: "This context is outdated, did you use --use-graph?"
```

**Root Problem:** If both local files and graph are readable, there's ambiguity about which is the "source of truth."

### Requirements

1. **Zero Data Loss**: No knowledge documents lost during migration
2. **Zero Downtime**: Existing workflows continue working
3. **Clear Source of Truth**: No ambiguity about where data lives
4. **Incremental Migration**: Test graph infrastructure before full cutover
5. **Easy Rollback**: Can revert if issues discovered
6. **AI-Friendly**: AI assistants always use correct source without flags
7. **Future-Proof**: Enable third-party integrations (Linear, Jira) later

## Decision

We will implement a **write dispatch architecture with adapter pattern** and a **4-phase dual-write migration strategy**.

### 1. Write Dispatcher Architecture

**Core Principle:** Separate write routing from write implementation.

```typescript
// All writes go through central dispatcher
await writeDispatcher.dispatch({
  type: 'ADR',
  title: 'Use JWT tokens',
  content: '...',
  data: { status: 'proposed', tags: ['auth'] }
});

// Dispatcher routes to enabled adapters:
// - GraphAdapter (always primary)
// - LocalAdapter (during dual-write only)
// - LinearAdapter (future, if configured)
```

**Benefits:**
- ✅ **Single interface**: All writes use same API
- ✅ **Runtime routing**: Adapters enabled/disabled via config
- ✅ **No flag confusion**: AI calls `ginko adr create`, dispatcher handles routing
- ✅ **Extensible**: Easy to add Linear/Jira adapters later (ADR-040)

### 2. Adapter Pattern

Each write destination implements a simple interface:

```typescript
interface WriteAdapter {
  name: string;
  write(document: KnowledgeDocument): Promise<WriteResult>;
  enabled(): boolean;
}

class GraphAdapter implements WriteAdapter {
  name = 'graph';

  async write(doc: KnowledgeDocument) {
    const client = await CloudGraphClient.fromToken(getToken());
    const nodeId = await client.createNode(doc.type, doc.data);
    return { source: 'graph', id: nodeId };
  }

  enabled() {
    return process.env.GINKO_GRAPH_ENABLED === 'true';
  }
}

class LocalAdapter implements WriteAdapter {
  name = 'local';

  async write(doc: KnowledgeDocument) {
    const path = `.ginko/archive/${doc.type}/${doc.id}.md`;
    await fs.writeFile(path, doc.content);
    return { source: 'local', path };
  }

  enabled() {
    // Only during dual-write period
    return process.env.GINKO_DUAL_WRITE === 'true';
  }
}
```

### 3. Read-Only Graph (Eliminates Ambiguity)

**Key Decision:** Once graph is enabled, **all reads come from graph exclusively**.

```typescript
// Before migration
async function loadContext() {
  return await loadFromLocalFiles('.ginko/context/');
}

// After migration
async function loadContext() {
  return await graphClient.query({
    labels: ['ADR', 'PRD', 'ContextModule'],
    relevance: 'high'
  });
  // Local files are NEVER read after GINKO_GRAPH_ENABLED=true
}
```

**Benefits:**
- ✅ No ambiguity about source of truth
- ✅ AI assistants always get latest data
- ✅ Predictable behavior

### 4. Environment Variable Control

**Configuration (not flags):**

```yaml
# .ginko/config.yml
graph:
  enabled: false      # Read from graph? (default: false for safety)
  dualWrite: false    # Write to both graph + local? (default: false)
  endpoint: https://api.ginko.ai
```

**Environment variables override config:**

```bash
# Phase 1: Graph enabled, dual-write for safety
export GINKO_GRAPH_ENABLED=true
export GINKO_DUAL_WRITE=true

ginko adr create "Test"
# → Writes to: Graph (primary) + Local (backup)
# → Reads from: Graph only

# Phase 2: Graph only (local files are archives)
export GINKO_GRAPH_ENABLED=true
export GINKO_DUAL_WRITE=false

ginko adr create "Test"
# → Writes to: Graph only
# → Reads from: Graph only
```

**Priority:** Environment Variable > Config File > Default (false)

---

## Migration Phases

### Phase 1: Graph Infrastructure Validation (Week 2-3)

**Goal:** Validate graph APIs work end-to-end with production data

**Setup:**
```bash
# Enable graph mode
export GINKO_GRAPH_ENABLED=true
export GINKO_DUAL_WRITE=true  # Safety: write to both
```

**Commands to Test (in order):**

1. **`ginko log` (Write Operation)**
   ```bash
   ginko log "Test event from graph"
   # Validates: Graph writes work, events persist to Neo4j
   ```

2. **`ginko start` (Read Operation)**
   ```bash
   ginko start
   # Validates: Sessions load from graph, context appears
   ```

3. **`ginko adr create` (Create Operation)**
   ```bash
   ginko adr create "Test Decision"
   # Validates: Knowledge documents persist to graph
   ```

4. **`ginko knowledge search` (Query Operation)**
   ```bash
   ginko knowledge search "authentication"
   # Validates: Semantic search works, returns relevant results
   ```

**Success Criteria:**
- ✅ Events persist to Neo4j and appear in queries
- ✅ Sessions load from graph without errors
- ✅ Queries return expected results
- ✅ Performance acceptable (<200ms for reads, <500ms for writes)
- ✅ Both graph and local files stay in sync

**Validation Command:**
```bash
ginko validate-sync
# Compares: Graph nodes vs Local files
# Reports: Discrepancies, missing data, sync failures
```

**Duration:** 1-2 weeks of testing with real usage

---

### Phase 2: Data Migration (Week 3)

**Goal:** Migrate existing knowledge documents to graph

**Migration Command:**
```bash
# Dry run: See what would be migrated
ginko migrate --dry-run
# Output:
#   Sessions: 47 files → 47 Session nodes
#   Context modules: 23 files → 23 ContextModule nodes
#   ADRs: 39 files → 39 ADR nodes
#   PRDs: 12 files → 12 PRD nodes
#   Patterns: 15 files → 15 Pattern nodes
#   Gotchas: 8 files → 8 Gotcha nodes
#   Total: 144 knowledge documents

# Actual migration (with confirmation)
ginko migrate --from=local --to=graph
# Prompts: "Migrate 144 documents to graph? (y/n)"
# Progress: Shows live progress bar
# Result: Summary of successes/failures
```

**Selective Migration:**
```bash
# Migrate only recent sessions
ginko migrate --type=sessions --date-after=2025-10-01

# Migrate specific document types
ginko migrate --types=ADR,PRD

# Skip already migrated
ginko migrate --skip-existing
```

**Migration Process:**
1. Scan local directories (docs/adr/, docs/PRD/, .ginko/context/, etc.)
2. Parse frontmatter and content
3. Create nodes in graph via CloudGraphClient
4. Create relationships (REFERENCES, IMPLEMENTS, etc.)
5. Generate embeddings (if not already present)
6. Verify each write succeeded
7. Report summary (successes, failures, skipped)

**Rollback Strategy:**
```bash
# If migration fails, revert
ginko migrate --rollback
# Deletes: All nodes created during migration
# Preserves: Local files (untouched)
```

**Success Criteria:**
- ✅ 100% of knowledge documents migrated successfully
- ✅ All relationships preserved (REFERENCES, IMPLEMENTS)
- ✅ Embeddings generated for all documents
- ✅ Validation passes: `ginko validate-sync`

---

### Phase 3: Parallel Running / Validation Period (Week 3-4)

**Goal:** Run both systems in parallel, validate data consistency

**Configuration:**
```bash
# Both adapters enabled
export GINKO_GRAPH_ENABLED=true
export GINKO_DUAL_WRITE=true
```

**What Happens:**
```typescript
ginko adr create "Test"
  ↓
WriteDispatcher.dispatch()
  ↓
  ├─→ GraphAdapter.write()   [PRIMARY]
  └─→ LocalAdapter.write()   [BACKUP]
  ↓
Both writes succeed → Command succeeds
Graph write fails → Command fails
Local write fails → Warning logged, command succeeds
```

**Monitoring:**
```bash
# Daily validation
ginko validate-sync --report
# Output:
#   Graph nodes: 156
#   Local files: 156
#   Discrepancies: 0
#   Sync health: 100%

# If discrepancies found:
#   Discrepancies: 3
#   - ADR-042: Graph has newer content (2025-11-03)
#   - Pattern-auth: Local missing embedding
#   - Session-abc: Local has extra event
```

**Alerts:**
- Graph write failures logged to monitoring
- Sync discrepancies emailed daily
- Performance degradation triggers alert (<200ms SLA)

**Success Criteria:**
- ✅ Zero data loss events
- ✅ <0.1% sync discrepancies
- ✅ Graph uptime >99%
- ✅ Performance within SLAs
- ✅ 100+ sessions completed without user-reported issues

**Duration:** 1-2 weeks of validation

---

### Phase 4: Graph-Primary / Cutover (Week 4+)

**Goal:** Graph becomes sole source of truth, local files are archives

**Configuration:**
```bash
# Disable dual-write
export GINKO_GRAPH_ENABLED=true
export GINKO_DUAL_WRITE=false
```

**What Happens:**
```typescript
ginko adr create "Test"
  ↓
WriteDispatcher.dispatch()
  ↓
GraphAdapter.write() only   [PRIMARY]
  ↓
Local files no longer written
```

**Local Files as Archives:**
```bash
# Create timestamped backup
ginko export --to=local --date=2025-11-02
# Output: .ginko/exports/2025-11-02/
#   ├── adr/
#   ├── PRD/
#   ├── context/
#   └── sessions/

# Archive old local files
mv .ginko/context .ginko/archive/context-pre-graph
mv docs/adr docs/archive/adr-pre-graph
```

**Read Paths Cleaned Up:**
```typescript
// Remove old file-based loading
// async function loadFromLocalFiles() { ... }  ← DELETE

// Keep only graph-based loading
async function loadContext() {
  return await graphClient.query({ ... });
}
```

**Success Criteria:**
- ✅ All writes go to graph only
- ✅ All reads come from graph only
- ✅ Local files preserved as historical archives
- ✅ Zero user-reported issues
- ✅ Performance better than local (due to semantic search)

**Rollback Plan:**
If critical issues arise:
1. `export GINKO_GRAPH_ENABLED=false` (revert to local)
2. Restore from latest export: `.ginko/exports/latest/`
3. Investigate issue, fix, retry migration

---

## Implementation Details

### Write Dispatcher

**File:** `src/write-dispatcher.ts`

```typescript
export interface KnowledgeDocument {
  type: 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Session' | 'ContextModule' | 'CodeFile';
  id?: string;
  title: string;
  content: string;
  data: Record<string, any>;
}

export interface WriteResult {
  source: string;
  id?: string;
  path?: string;
  url?: string;
}

export interface WriteAdapter {
  name: string;
  write(document: KnowledgeDocument): Promise<WriteResult>;
  enabled(): boolean;
}

export class WriteDispatcher {
  private adapters: WriteAdapter[] = [];

  register(adapter: WriteAdapter): void {
    this.adapters.push(adapter);
  }

  async dispatch(doc: KnowledgeDocument): Promise<WriteResult> {
    const enabledAdapters = this.adapters.filter(a => a.enabled());

    if (enabledAdapters.length === 0) {
      throw new Error('No write adapters enabled. Set GINKO_GRAPH_ENABLED=true');
    }

    // Write to all enabled adapters
    const results = await Promise.allSettled(
      enabledAdapters.map(a => a.write(doc))
    );

    // Graph is always primary
    const graphIdx = enabledAdapters.findIndex(a => a.name === 'graph');
    const graphResult = graphIdx >= 0 ? results[graphIdx] : null;

    if (!graphResult || graphResult.status === 'rejected') {
      throw new Error(`Graph write failed: ${graphResult?.status === 'rejected' ? graphResult.reason : 'Not enabled'}`);
    }

    // Log secondary adapter failures (warnings only)
    results.forEach((result, i) => {
      const adapter = enabledAdapters[i];
      if (result.status === 'rejected' && adapter.name !== 'graph') {
        console.warn(`[WriteDispatcher] ${adapter.name} write failed:`, result.reason);
        // Don't fail the command - graph write succeeded
      }
    });

    return graphResult.value;
  }
}

// Singleton instance
export const writeDispatcher = new WriteDispatcher();
```

### Graph Adapter

**File:** `src/adapters/graph-adapter.ts`

```typescript
import { CloudGraphClient } from '../../api/v1/graph/_cloud-graph-client.js';
import type { WriteAdapter, KnowledgeDocument, WriteResult } from '../write-dispatcher.js';

export class GraphAdapter implements WriteAdapter {
  name = 'graph';

  async write(doc: KnowledgeDocument): Promise<WriteResult> {
    const token = await this.getAuthToken();
    const graphId = await this.getGraphId();

    const client = await CloudGraphClient.fromBearerToken(token, graphId);
    const nodeId = await client.createNode(doc.type, {
      title: doc.title,
      content: doc.content,
      ...doc.data,
    });

    return {
      source: 'graph',
      id: nodeId,
      url: `https://api.ginko.ai/graph/${graphId}/nodes/${nodeId}`,
    };
  }

  enabled(): boolean {
    return process.env.GINKO_GRAPH_ENABLED === 'true';
  }

  private async getAuthToken(): Promise<string> {
    // Load from ~/.ginko/auth.json or environment
    const authPath = path.join(os.homedir(), '.ginko', 'auth.json');
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      return auth.token;
    }
    throw new Error('Not authenticated. Run: ginko login');
  }

  private async getGraphId(): Promise<string> {
    // Load from .ginko/config.yml or environment
    const configPath = '.ginko/config.yml';
    if (fs.existsSync(configPath)) {
      const config = yaml.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.graph?.currentGraphId;
    }
    throw new Error('No graph configured. Run: ginko graph init');
  }
}
```

### Local Adapter

**File:** `src/adapters/local-adapter.ts`

```typescript
import type { WriteAdapter, KnowledgeDocument, WriteResult } from '../write-dispatcher.js';

export class LocalAdapter implements WriteAdapter {
  name = 'local';

  async write(doc: KnowledgeDocument): Promise<WriteResult> {
    const basePath = this.getBasePath(doc.type);
    const fileName = `${doc.id || this.generateId(doc)}.md`;
    const filePath = path.join(basePath, fileName);

    // Generate markdown content
    const markdown = this.generateMarkdown(doc);

    // Ensure directory exists
    await fs.mkdir(basePath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, markdown, 'utf-8');

    return {
      source: 'local',
      path: filePath,
    };
  }

  enabled(): boolean {
    // Only enabled during dual-write period
    return process.env.GINKO_DUAL_WRITE === 'true';
  }

  private getBasePath(type: string): string {
    const basePaths: Record<string, string> = {
      ADR: 'docs/adr',
      PRD: 'docs/PRD',
      Pattern: '.ginko/context/modules',
      Gotcha: '.ginko/context/modules',
      Session: '.ginko/sessions',
      ContextModule: '.ginko/context/modules',
      CodeFile: 'src', // Frontmatter only
    };
    return basePaths[type] || '.ginko/archive';
  }

  private generateId(doc: KnowledgeDocument): string {
    return `${doc.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateMarkdown(doc: KnowledgeDocument): string {
    // Generate frontmatter
    const frontmatter = yaml.stringify(doc.data);
    return `---\n${frontmatter}---\n\n${doc.content}`;
  }
}
```

### CLI Integration

**File:** `packages/cli/src/commands/adr/create.ts`

```typescript
import { writeDispatcher } from '../../../src/write-dispatcher.js';
import { GraphAdapter } from '../../../src/adapters/graph-adapter.js';
import { LocalAdapter } from '../../../src/adapters/local-adapter.js';

// Register adapters
writeDispatcher.register(new GraphAdapter());
writeDispatcher.register(new LocalAdapter());

export async function createADR(title: string, options: any) {
  const number = await getNextADRNumber();

  const doc = {
    type: 'ADR' as const,
    id: `ADR-${number.toString().padStart(3, '0')}`,
    title,
    content: generateADRTemplate(title, number),
    data: {
      number,
      status: 'proposed',
      tags: options.tags || [],
      created: new Date().toISOString(),
    },
  };

  // Dispatch handles routing to enabled adapters
  const result = await writeDispatcher.dispatch(doc);

  console.log(`✓ Created ADR-${number}: ${title}`);
  console.log(`  Source: ${result.source}`);
  if (result.id) console.log(`  ID: ${result.id}`);
  if (result.path) console.log(`  Path: ${result.path}`);
}
```

---

## Consequences

### Positive

1. **✅ Zero Data Loss**
   - Dual-write ensures data persists to both systems
   - Validation catches discrepancies early
   - Rollback available at any phase

2. **✅ Clear Source of Truth**
   - Graph is always primary when enabled
   - No ambiguity for AI assistants
   - Predictable behavior

3. **✅ Incremental Migration**
   - Test each command independently
   - Roll back if issues found
   - Build confidence progressively

4. **✅ Future-Proof**
   - Adapter pattern enables Linear/Jira integrations (ADR-040)
   - Easy to add new write destinations
   - No architectural changes needed

5. **✅ Operational Safety**
   - Environment variables control behavior
   - Validation command catches issues
   - Monitoring alerts on failures

### Negative

1. **❌ Dual Maintenance (Temporary)**
   - Two write paths during migration (1-2 weeks)
   - Code complexity until Phase 4
   - Testing burden increased

2. **❌ Migration Time**
   - 4-week migration timeline
   - Resource investment required
   - User training needed

3. **❌ Storage Duplication (Temporary)**
   - Data stored in both graph and local files
   - ~2x storage during dual-write period
   - Acceptable cost for safety

### Neutral

1. **⚪ Environment Variable Dependency**
   - Teams must set `GINKO_GRAPH_ENABLED=true`
   - Documentation needed
   - One-time setup per environment

2. **⚪ Adapter Pattern Overhead**
   - ~200 lines of dispatcher code
   - Minimal runtime overhead (<5ms)
   - Worth it for extensibility

---

## Alternatives Considered

### Alternative 1: Feature Flags (--use-graph)

```bash
ginko adr create "Test" --use-graph
```

**Rejected Because:**
- ❌ Flag confusion: AI assistants may forget flag
- ❌ Ambiguity: User unsure which system is active
- ❌ Tedious: Every command needs flag
- ❌ Error-prone: Easy to forget flag and get stale data

### Alternative 2: Namespace Approach

```bash
ginko adr create "Test"    # Uses local files
ginko g adr create "Test"  # Uses graph
```

**Rejected Because:**
- ❌ User confusion: Which to use?
- ❌ Fragmentation: Two command sets
- ❌ Documentation burden
- ✅ Could revisit for experimentation phase

### Alternative 3: Async Job Queue (MQTT/Kafka)

```bash
ginko adr create "Test"
  ↓
Publish to MQTT
  ↓
Worker processes write
```

**Rejected for MVP Because:**
- ❌ Over-engineering for current scale
- ❌ Adds infrastructure complexity (MQTT broker)
- ❌ Slower user feedback (async)
- ❌ MQTT designed for IoT, not job queues
- ✅ May revisit for slow operations (Phase 4+)

**When to Reconsider:**
- Integration APIs are slow (Linear: 500ms-2s)
- Embeddings are slow (batch: 10-30s)
- Relationship extraction is slow (AI: 5-10s)

**Then Use:**
- Vercel Queue (serverless-native, $0.50/million)
- Redis Queue (if self-hosted)

### Alternative 4: Immediate Cutover

```bash
# Day 1: Switch to graph
export GINKO_GRAPH_ENABLED=true
# No dual-write, no validation period
```

**Rejected Because:**
- ❌ High risk: No rollback if issues arise
- ❌ No validation: Can't catch data loss early
- ❌ User impact: Breaking changes without testing
- ❌ No confidence: Haven't proven graph reliability

---

## Success Metrics

### Migration Success
1. **Zero Data Loss**: 100% of knowledge documents migrated successfully
2. **Sync Accuracy**: <0.1% discrepancies during dual-write period
3. **Performance**: Graph reads <200ms (p95), writes <500ms (p95)
4. **Uptime**: Graph availability >99% during migration
5. **Rollback Rate**: Zero rollbacks required

### User Experience
6. **AI Assistant Accuracy**: 100% of commands use correct source (graph)
7. **User-Reported Issues**: <5 issues during migration period
8. **Command Compatibility**: 100% of existing commands work unchanged

### Engineering Efficiency
9. **Code Cleanup**: Remove 100% of local read paths after Phase 4
10. **Adapter Reuse**: Linear/Jira adapters use same dispatcher (ADR-040)

---

## Related Decisions

- **[ADR-039: Knowledge Discovery Graph](./ADR-039-graph-based-context-discovery.md)** - Strategic decision to implement cloud-first knowledge graph
- **[ADR-039 Addendum: On-Platform Knowledge Management](./ADR-039-graph-based-context-discovery.md#-addendum-on-platform-knowledge-management-strategy-2025-11-02)** - Decision to build on-platform first (no third-party integrations for MVP)
- **[ADR-040: Work Tracking Integration Strategy](./ADR-040-work-tracking-integration-strategy.md)** - Future integrations with Linear/Jira/GitHub (adapter pattern enables this)

---

## References

### Implementation Files
- `src/write-dispatcher.ts` - Central write routing
- `src/adapters/graph-adapter.ts` - Neo4j cloud graph writes
- `src/adapters/local-adapter.ts` - Local file writes (dual-write only)
- `api/v1/graph/_cloud-graph-client.ts` - Graph client (ADR-039 implementation)
- `packages/cli/src/commands/*/create.ts` - CLI command integration

### Migration Tools
- `ginko migrate` - Migrate local files to graph
- `ginko validate-sync` - Check graph/local consistency
- `ginko export` - Export graph to local files (backup)

### External Resources
- Write Dispatcher Pattern: Martin Fowler's Enterprise Integration Patterns
- Zero-Downtime Migrations: Stripe's migration playbook
- Feature Toggles: Pete Hodgson's Feature Toggle guide

---

**Approved by:** Chris Norton & Claude (Session: 2025-11-02)
**Implementation Start:** Week 2 (2025-11-02)
**Cutover Target:** Week 4-5 (2025-11-23)
