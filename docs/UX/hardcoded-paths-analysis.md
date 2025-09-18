# Hard-coded Paths Analysis in Ginko Reflectors

## Overview
Analysis of hard-coded paths in ginko CLI to determine what should be configurable via `ginko.json`.

## Current Hard-coded Paths by Domain

### 1. Architecture Domain
**Files**:
- `architecture.ts`
- `architecture-pipeline.ts`
- `architecture-pipeline-enhanced.ts`
- `architecture-reflection.ts`

**Hard-coded Paths**:
- `docs/reference/architecture/` (older version)
- `docs/architecture/` (newer pipeline)
- `docs/adr/` (enhanced pipeline)

**Inconsistency Found**: Three different paths for ADRs across files!

### 2. PRD Domain
**Files**:
- `prd-reflection.ts`
- `prd-pipeline.ts`
- `prd-pipeline-enhanced.ts`

**Hard-coded Paths**:
- `docs/PRD/`

### 3. Sprint Domain
**Files**:
- `sprint-pipeline-enhanced.ts`
- `plan.ts`

**Hard-coded Paths**:
- `docs/SPRINTS/`
- References to `docs/adr/` and `docs/PRD/` for cross-domain lookups

### 4. Documentation Domain
**Files**:
- `documentation-pipeline.ts`

**Hard-coded Paths**:
- `docs/` (root documentation directory)

### 5. Backlog Domain
**Files**:
- `backlog-pipeline.ts`

**Hard-coded Paths**:
- `.ginko/backlog/` (stored in .ginko, not docs)

### 6. Session/Handoff/Start Domains
**Hard-coded Paths**:
- `.ginko/sessions/`
- `.ginko/context/`

## Recommended ginko.json Structure

```json
{
  "version": "1.0.0",
  "paths": {
    // User-configurable documentation paths
    "docs": {
      "root": "docs",                    // Base for all documentation
      "adr": "${docs.root}/adr",         // Architecture decisions
      "prd": "${docs.root}/PRD",         // Product requirements
      "sprints": "${docs.root}/sprints", // Sprint planning
      "strategy": "${docs.root}/strategy", // Business strategy
      "reference": "${docs.root}/reference" // Reference docs
    },

    // Internal paths (less likely to conflict)
    "ginko": {
      "root": ".ginko",                  // Ginko data root
      "context": "${ginko.root}/context",
      "sessions": "${ginko.root}/sessions",
      "backlog": "${ginko.root}/backlog",
      "temp": "${ginko.root}/.temp"
    }
  },

  // Feature flags
  "features": {
    "autoCapture": true,
    "gitIntegration": true,
    "aiEnhancement": true,
    "localBacklog": true  // Use git-based backlog vs external tool
  },

  // External integrations (premium features)
  "integrations": {
    "backlog": {
      "type": "local",  // "local" | "jira" | "ado" | "github" | "linear"
      "config": {}      // Connection details for external tools
    }
  },

  // Team/project metadata
  "project": {
    "name": "my-project",
    "team": "engineering",
    "conventions": {
      "adrPrefix": "ADR",
      "prdPrefix": "PRD",
      "sprintFormat": "YYYY-MM-DD"
    }
  }
}
```

## Path Configuration Strategy

### 1. Always Configurable (High Conflict Risk)
These paths should ALWAYS be read from ginko.json:
- `docs/adr/` - Many projects already use this
- `docs/PRD/` - Could conflict with existing product docs
- `docs/sprints/` - Teams may have different sprint tracking

### 2. Configurable with Smart Defaults
These can use defaults but should respect config:
- `docs/strategy/`
- `docs/reference/`
- Documentation root

### 3. Internal Paths (Rarely Need Configuration)
These are ginko-specific and unlikely to conflict:
- `.ginko/context/`
- `.ginko/sessions/`
- `.ginko/backlog/`
- `.ginko/.temp/`

## Implementation Approach

### Phase 1: Create Config Loader
```typescript
// src/core/config.ts
interface GinkoConfig {
  version: string;
  paths: {
    docs: Record<string, string>;
    ginko: Record<string, string>;
  };
  features: Record<string, boolean>;
  project: Record<string, any>;
}

class ConfigLoader {
  private config: GinkoConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig(): GinkoConfig {
    const configPath = path.join(process.cwd(), 'ginko.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return this.getDefaults();
  }

  getPath(key: string): string {
    // Resolve ${variable} references
    // Return resolved path
  }
}
```

### Phase 2: Update Reflectors
Replace hard-coded paths:
```typescript
// Before
const adrDir = path.join(process.cwd(), 'docs', 'adr');

// After
const adrDir = config.getPath('docs.adr');
```

### Phase 3: Update ginko init
Add interactive prompt:
```typescript
if (fs.existsSync('docs')) {
  const choice = await prompt({
    type: 'list',
    message: 'Found existing docs/ folder. How should ginko organize?',
    choices: [
      { name: 'Use docs/ginko/ (recommended)', value: 'docs/ginko' },
      { name: 'Use docs/ directly', value: 'docs' },
      { name: 'Custom path...', value: 'custom' }
    ]
  });

  // Generate ginko.json based on choice
}
```

## Business Model Consideration: Local vs External Backlog

### The Git-Based Backlog Advantage
Ginko's current approach stores backlog in `.ginko/backlog/` for important AI-UX benefits:
- **Immediate AI access**: No API calls, instant context loading
- **Offline capability**: Works without internet connectivity
- **Version control**: Backlog changes tracked with code changes
- **Speed**: Local file access vs API roundtrips
- **Context richness**: AI can correlate backlog with code changes

### Performance Comparison: Local vs External Backlog

#### Local Filesystem (.ginko/backlog/)
- **Read 50 backlog items**: ~5-15ms (SSD), ~20-50ms (HDD)
- **Parse JSON/Markdown**: ~1-5ms per item
- **Context correlation**: Immediate (same filesystem)
- **Offline availability**: 100%
- **Total time for AI context loading**: **~50-200ms**

#### External API Integration
- **Network latency**: 20-100ms (local network), 50-300ms (internet)
- **API authentication**: 10-50ms per request
- **Rate limiting delays**: 100-1000ms between requests
- **Pagination overhead**: Multiple roundtrips for large backlogs
- **JSON parsing**: Same as local (~1-5ms per item)
- **Total time for 50 items**: **~500-5000ms (2.5-25x slower)**

#### Realistic Scenarios

**Fast Corporate Network** (best case):
- Local: ~100ms
- Jira API: ~800ms
- **Speed advantage: 8x faster**

**Typical Internet Connection**:
- Local: ~150ms
- External API: ~2000ms
- **Speed advantage: 13x faster**

**Poor Network/Rate Limited**:
- Local: ~200ms
- External API: ~5000ms
- **Speed advantage: 25x faster**

#### Business Impact
- **Developer flow state**: Sub-200ms feels instant, >1000ms breaks concentration
- **AI responsiveness**: Local enables real-time suggestions, external causes noticeable delays
- **Offline development**: Local works without connectivity, external fails completely
- **Batch operations**: Local can process entire backlog instantly, external hits rate limits

### Future Performance: In-Memory Daemon Architecture

#### Proposed Architecture
```
ginko start → Launch daemon → Preload cache → ginko commands use cache
     ↓              ↓              ↓                    ↓
Background     Read all docs    In-memory DB        Instant access
 process      into memory      (Redis/SQLite)      (<1ms retrieval)
```

#### Performance Projections

**Current Local Filesystem**:
- Context loading: ~50-200ms
- File I/O overhead: ~20-80ms
- JSON/Markdown parsing: ~30-120ms

**In-Memory Daemon**:
- Context loading: **~1-5ms** (memory access)
- No file I/O overhead: 0ms
- Pre-parsed data structures: **~0.1-1ms**
- **Total improvement: 10-40x faster than current filesystem**

#### Realistic Scenarios with Daemon

**Local Filesystem (current)**:
- Small project (20 docs): ~100ms
- Medium project (100 docs): ~300ms
- Large project (500 docs): ~1000ms

**In-Memory Daemon**:
- Small project: **~5ms (20x faster)**
- Medium project: **~15ms (20x faster)**
- Large project: **~50ms (20x faster)**

#### Implementation Considerations

**Benefits**:
- **Ultra-fast context access**: Sub-10ms for any project size
- **Intelligent preloading**: Load frequently accessed docs first
- **Smart invalidation**: Watch filesystem for changes
- **Cross-command optimization**: Share cache across multiple ginko invocations
- **Memory efficiency**: Only load what's needed, compress rarely accessed items

**Challenges**:
- **Memory usage**: ~1-10MB per 100 docs (manageable)
- **Cache coherency**: Filesystem changes must invalidate cache
- **Daemon lifecycle**: Start/stop, crash recovery
- **Development complexity**: IPC, process management
- **Platform differences**: Windows/Mac/Linux daemon patterns

#### Cache Strategy
```typescript
interface DaemonCache {
  // Hot cache: Frequently accessed, always in memory
  hotCache: Map<string, ParsedDocument>;

  // Warm cache: Recently accessed, compressed in memory
  warmCache: Map<string, CompressedDocument>;

  // Cold storage: File paths only, load on demand
  coldIndex: Map<string, FileMetadata>;

  // Invalidation: Watch for file changes
  watcher: FileSystemWatcher;
}
```

#### Performance vs Complexity Analysis

**Performance Gains**:
- Current local: ~100-1000ms
- With daemon: **~5-50ms (10-20x improvement)**
- **Makes ginko feel instantaneous even for large projects**

**Development Cost**: Medium-High
- IPC implementation
- Cross-platform daemon management
- Cache invalidation logic
- Error handling and recovery

**User Experience Impact**: **Dramatic**
- Sub-10ms response time feels truly instant
- Enables real-time AI suggestions during typing
- Large projects feel as fast as small ones
- Could enable new features like live context streaming

#### Recommended Implementation Phase
- **Phase 1**: Implement for backlog/context only (highest ROI)
- **Phase 2**: Extend to all documentation
- **Phase 3**: Add intelligent preloading and compression
- **Phase 4**: Cross-session persistence and warming

This daemon architecture could make ginko the fastest documentation/context tool available, providing a significant competitive advantage.

#### Daemon + External Integrations: Best of Both Worlds

The daemon architecture solves the external integration performance problem elegantly:

**Hybrid Architecture**:
```
External API (Jira/ADO) → Background Sync → Daemon Cache → Instant Access
      ↓                        ↓              ↓              ↓
   ~2000ms                   Periodic       In-memory     ~5ms access
  (one-time)                background      local copy   (always fast)
```

**Performance Comparison with Daemon**:

| Scenario | Without Daemon | With Daemon | Improvement |
|----------|----------------|-------------|-------------|
| **Local backlog** | ~150ms | ~5ms | **30x faster** |
| **External API (direct)** | ~2000ms | ~5ms | **400x faster** |
| **External + local cache** | ~150ms | ~5ms | **30x faster** |

**How It Works**:

1. **Smart Sync Strategy**: WebSocket subscriptions where supported, polling fallback
2. **Local Cache**: External items stored in fast local cache alongside local docs
3. **Instant Access**: All ginko commands read from memory, never wait for APIs
4. **Real-time Updates**: File watching for local changes, WebSocket events for external
5. **Offline Capability**: Last sync available even without network

#### Enhanced Sync Strategies

**WebSocket Subscriptions (Premium)**:
```
Jira/ADO → WebSocket → Daemon → Instant Cache Update
    ↓         ↓          ↓            ↓
Real-time   ~10ms    In-memory    Always current
updates   delivery   processing   (~5ms access)
```

**Polling Fallback (All Tools)**:
```
External API → Periodic Poll → Daemon → Cache Update
     ↓              ↓           ↓          ↓
  ~2000ms        Every 5m    In-memory   Current within 5m
 (initial)     (background)  processing  (~5ms access)
```

**Sync Strategy by Integration**:

| Tool | WebSocket Support | Strategy | Update Latency |
|------|------------------|----------|----------------|
| **Jira Cloud** | ✅ Webhooks/Events | Real-time subscription | ~10-50ms |
| **GitHub Issues** | ✅ Webhooks | Real-time subscription | ~10-50ms |
| **Azure DevOps** | ✅ Service Hooks | Real-time subscription | ~10-50ms |
| **Linear** | ✅ GraphQL Subscriptions | Real-time subscription | ~10-50ms |
| **Monday.com** | ❌ Limited | Smart polling (1-5m) | ~1-5 minutes |
| **Legacy Tools** | ❌ None | Fallback polling | ~5-15 minutes |

**Performance Benefits**:

- **Real-time tools**: Sub-100ms update propagation vs 5-15 minute polling
- **Reduced API load**: Only fetch changes, not full datasets
- **Better concurrency**: Multiple team members see updates instantly
- **Lower rate limiting**: Subscriptions don't count against API quotas

**Business Model Integration**:

```json
{
  "integrations": {
    "backlog": {
      "type": "jira",           // External tool
      "syncInterval": "5m",     // Background sync frequency
      "cacheStrategy": "smart", // Intelligent caching
      "config": {
        "url": "company.atlassian.net",
        "project": "PROJ"
      }
    }
  },
  "daemon": {
    "enabled": true,           // Daemon always improves performance
    "cacheSize": "50MB",       // Memory allocation
    "syncStrategy": "background" // Don't block user commands
  }
}
```

**User Experience Benefits**:

- **Premium users**: Get external integration convenience + local performance
- **Free users**: Get ultra-fast local backlog access
- **All users**: Consistent sub-10ms response regardless of data source
- **Offline-first**: Always works, even when external APIs are down

**Implementation Advantages**:

1. **Solves the API performance problem**: External integrations become viable
2. **Enables premium features**: Fast external sync justifies higher pricing
3. **Maintains free tier speed**: Local-only users get daemon benefits too
4. **Provides fallback**: External API failures don't break ginko
5. **Enables hybrid workflows**: Mix local docs with external backlog seamlessly

This architecture makes external integrations feel as fast as local storage while maintaining all the business model benefits.

#### AI Assistant Integration: Cache-First Commands

**The Problem**: AI assistants default to filesystem commands (`cat`, `ls`, `grep`) instead of leveraging ginko's optimized cache.

**Current AI Behavior**:
```bash
# AI typically does this (slow):
cat .ginko/backlog/TASK-001.md
grep -r "authentication" docs/

# Instead of this (fast):
ginko backlog show TASK-001
ginko search "authentication"
```

**Performance Impact**:
- **Filesystem commands**: ~100-500ms + parsing time
- **Ginko cache commands**: ~5-15ms with pre-parsed data
- **Speed difference**: 10-50x slower when AI uses filesystem directly

#### Solution: Command Routing Architecture

**Daemon Command Interface**:
```typescript
interface DaemonAPI {
  // Cache-optimized commands
  getBacklogItem(id: string): Promise<BacklogItem>;
  searchDocuments(query: string): Promise<SearchResult[]>;
  getContext(domain: string): Promise<ContextData>;

  // For AI assistant integration
  queryCache(query: CacheQuery): Promise<CacheResult>;
  getBulkData(filter: DataFilter): Promise<BulkData>;
}
```

**AI-Optimized Commands**:
```bash
# Fast cache access for AI
ginko query backlog --format json              # Get all backlog as JSON
ginko query docs --grep "auth" --format json   # Search with structured output
ginko query context --domain prd --format json # Get PRD context

# Bulk operations for AI analysis
ginko bulk --type backlog,docs,context --format json
```

#### Implementation Strategies

**1. Command Redirection**:
```json
{
  "daemon": {
    "aiIntegration": {
      "redirectCommands": {
        "cat .ginko/backlog/*.md": "ginko query backlog",
        "grep -r * docs/": "ginko search",
        "find . -name '*.md'": "ginko list docs"
      }
    }
  }
}
```

**2. AI Assistant Guidance**:
```markdown
# In CLAUDE.md or AI context
## Ginko Cache Commands (ALWAYS USE THESE)

Instead of filesystem commands, use ginko's optimized cache:

❌ DON'T: `cat .ginko/backlog/TASK-001.md`
✅ DO: `ginko backlog show TASK-001`

❌ DON'T: `grep -r "auth" docs/`
✅ DO: `ginko search "auth"`

❌ DON'T: `find . -name "*.md" | head -10`
✅ DO: `ginko list docs --limit 10`

These commands are 10-50x faster and return structured data.
```

**3. Shell Integration**:
```bash
# Alias common patterns
alias gcat='ginko query'
alias ggrep='ginko search'
alias gfind='ginko list'

# Or intercept via shell function
cat() {
  if [[ $1 == .ginko/* ]]; then
    ginko query file "$1"
  else
    command cat "$@"
  fi
}
```

**4. Structured Output for AI**:
```bash
# AI-friendly JSON output
ginko query backlog --format json --schema
{
  "items": [
    {
      "id": "TASK-001",
      "title": "Fix auth bug",
      "status": "in_progress",
      "priority": "high",
      "content": "...",
      "metadata": { "created": "2025-09-17", "assignee": "chris" }
    }
  ],
  "schema": "backlog-v1",
  "cached_at": "2025-09-17T15:30:00Z"
}
```

#### Business Model Integration

**Free Tier**: Basic cache commands
```bash
ginko query backlog
ginko search "keyword"
ginko list docs
```

**Premium Tier**: Advanced AI integration
```bash
ginko query --ai-optimize           # Pre-process for AI consumption
ginko search --semantic "auth flow" # Semantic search across all docs
ginko analyze --correlate           # Cross-reference backlog + docs + code
```

**Enterprise Tier**: Full automation
```bash
ginko daemon --ai-proxy             # Intercept filesystem commands
ginko config --redirect-commands    # Automatic command routing
ginko integrate --claude-context    # Deep Claude integration
```

#### Developer Experience

**AI Assistant Instructions**:
```
When working with ginko projects:
1. ALWAYS use `ginko query` instead of `cat` for .ginko files
2. ALWAYS use `ginko search` instead of `grep` for documentation
3. Use `--format json` for structured data analysis
4. Use `ginko list` to explore available data

These commands are optimized and 10-50x faster than filesystem access.
```

This ensures AI assistants leverage ginko's performance advantages while maintaining natural command patterns.

### Corporate Reality: External Tool Usage
Many corporate teams already use:
- **Microsoft Azure DevOps (ADO)**
- **Atlassian Jira**
- **GitHub Issues**
- **Linear**
- **Monday.com**

### Recommended Feature Flag Strategy

```json
{
  "features": {
    "localBacklog": true  // Core feature (free)
  },
  "integrations": {
    "backlog": {
      "type": "local",    // Free tier default
      "syncEnabled": false, // Premium feature
      "config": {
        // Premium integration settings
        "jira": { "url": "", "project": "", "token": "" },
        "ado": { "organization": "", "project": "", "pat": "" }
      }
    }
  }
}
```

### Business Model Alignment
1. **Free Tier**: Local git-based backlog (current behavior)
2. **Premium Tier**: External tool integration with local sync
3. **Enterprise Tier**: Bi-directional sync, bulk operations, reporting

This allows:
- **Individual developers**: Use free local backlog
- **Small teams**: Start free, upgrade when they need integration
- **Corporates**: Pay for integration with existing tools

### Implementation Considerations
- Keep local backlog as fallback even with external integrations
- Cache external items locally for AI context speed
- Provide clear migration path from local to external

## Benefits of This Approach

1. **Backward Compatible**: Works without ginko.json (uses defaults)
2. **Team Consistency**: Shared config in repo
3. **Flexible**: Each path individually configurable
4. **Clear Separation**: Docs paths (user-facing) vs ginko paths (internal)
5. **Extensible**: Easy to add new paths or features
6. **Business Model Ready**: Clear free/premium feature separation

## Priority for Implementation

**High Priority** (Fix inconsistencies and conflicts):
1. Fix ADR path inconsistency (3 different paths!)
2. Make docs/adr and docs/PRD configurable
3. Create config loader

**Medium Priority** (Improve UX):
4. Update ginko init with prompts
5. Add path validation
6. Update all reflectors to use config

**Low Priority** (Nice to have):
7. Variable resolution in paths
8. Config migration tool
9. Config validation schema