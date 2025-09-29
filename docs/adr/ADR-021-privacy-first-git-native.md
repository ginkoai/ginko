# ADR-021: Privacy-First Git-Native Architecture

## Status
Proposed

## Date
2025-08-27

## Context

During the CLI pivot planning, we recognized that our MCP tools were still database-dependent for core functionality like session handoffs. This contradicts our git-native philosophy and raises privacy concerns about proprietary code being sent to servers.

### Key Realization
Session handoffs, project context, and best practices should NEVER leave the local machine. Only anonymous metrics and aggregated patterns should optionally sync to servers for coaching insights.

### Privacy Concerns
- Enterprises cannot risk proprietary code in third-party databases
- Developers distrust tools that upload their code
- Compliance requirements (GDPR, SOC2, etc.) complicate data storage
- Network dependencies reduce reliability

## Decision

We will implement a **privacy-first, git-native architecture** where:

1. **All code and context stays local** - No proprietary information leaves the machine
2. **Git is the only source of truth** - `.ginko/` directory stores everything
3. **Server sync is optional** - Only anonymous metrics and patterns
4. **Full offline functionality** - Everything works without internet
5. **Zero-knowledge coaching** - Server provides insights without seeing code

## Implementation

### Local-Only Operations (Default)
```bash
ginko init          # Creates .ginko/ structure
ginko handoff       # Saves to .ginko/sessions/ (git-tracked)
ginko start         # Reads from .ginko/sessions/
ginko context       # Analyzes local files only
ginko patterns      # Local pattern library in .ginko/patterns/
ginko coach         # Local-only coaching based on git history
```

### Optional Server Sync (Opt-in)
```bash
ginko sync --metrics-only     # Anonymous usage statistics
ginko coach --enhanced         # Server patterns (no code sent)
ginko team --analytics         # Aggregated team metrics
```

### Data Classification

**Never Leaves Machine:**
- Source code
- File contents  
- Commit messages
- Session handoffs
- Project structure
- API keys/secrets
- File paths
- Variable names

**Can Sync Anonymously (Opt-in):**
- Command usage frequency
- Session duration
- Context size metrics
- Error patterns (type, not content)
- Tool usage statistics
- Performance metrics
- Success/failure rates
- Language/framework detection

### Directory Structure
```
.ginko/                          # All git-tracked
├── sessions/                    # Session handoffs
│   └── [user]/
│       ├── current.md          # Active session
│       └── archive/            # Historical sessions
├── patterns/                    # Discovered patterns
│   ├── debugging/              # Debug strategies
│   ├── implementation/         # Code patterns
│   └── recovery/               # Error recovery
├── best-practices/             # Team standards
│   ├── local.md               # Personal practices
│   └── team.md                # Shared practices
├── context/                    # Context rules
│   ├── rules.md               # What loads when
│   ├── boundaries.md          # Module boundaries
│   └── ignore.md              # What to exclude
└── config.json                 # Local configuration
```

### Privacy-Preserving Analytics

When analytics are enabled, only send:
```json
{
  "session_id": "uuid-hash",
  "metrics": {
    "duration_minutes": 45,
    "commands_used": ["handoff", "context", "compact"],
    "context_size_percentage": 40,
    "files_touched_count": 12,
    "pattern_detected": "debugging_spiral",
    "recovery_time_minutes": 5
  }
}
```

Never send:
```json
{
  "files": ["src/auth/login.ts"],        // ❌ File paths
  "code": "function authenticate() {}",   // ❌ Source code  
  "error": "undefined variable 'user'",   // ❌ Actual errors
  "commit": "Fix authentication bug"      // ❌ Commit messages
}
```

## Consequences

### Positive
- **Zero trust required** - Code never leaves machine
- **Enterprise ready** - No compliance concerns
- **Faster operations** - No network latency
- **Reliability** - Works offline always
- **Developer trust** - Transparent, auditable
- **GDPR compliant** - No personal data stored
- **Open source friendly** - Can be used on any project

### Negative  
- **Less coaching precision** - Without code context
- **No cross-machine sync** - Git handles this differently
- **Limited team insights** - Only anonymous metrics
- **No cloud backup** - Relies on git for persistence

### Neutral
- Coaching quality depends on local pattern detection
- Team features require explicit sharing via git
- Analytics require opt-in consent

## Migration

### From MCP Tools to CLI Commands

**Before (MCP + Database):**
```javascript
// MCP tool calls that hit database
mcp__ginko-mcp__store_handoff({ content: "..." })
mcp__ginko-mcp__load_handoff({ session_id: "..." })
```

**After (CLI + Git):**
```bash
# Direct file operations
ginko handoff "Session complete"  # Writes to .ginko/sessions/
ginko start                        # Reads from .ginko/sessions/
```

### From Database to Git

**Before:**
```sql
-- Session stored in PostgreSQL
INSERT INTO sessions (user_id, content, metadata)
VALUES ($1, $2, $3);
```

**After:**
```bash
# Session stored in git
echo "$HANDOFF" > .ginko/sessions/$USER/current.md
git add .ginko/sessions/
git commit -m "Session handoff"
```

## Security Benefits

1. **No attack surface** - No server to hack
2. **No data breaches** - No central database
3. **No MITM attacks** - No network transmission
4. **No API keys needed** - For core functionality
5. **Audit trail in git** - Complete history

## Implementation Priority

### Phase 1: Core Git-Native (Day 1-2)
- Local handoff storage
- Git-based session management
- Local context analysis
- Pattern extraction from git

### Phase 2: Privacy-Preserving Analytics (Day 3)
- Anonymous metrics collection
- Opt-in configuration
- Local coaching algorithms
- Pattern aggregation

### Phase 3: Team Features (Day 4-5)
- Git-based sharing
- Team patterns via git
- Aggregated insights
- Zero-knowledge coaching

## Success Metrics

1. **Zero code transmission** - Verified by network monitoring
2. **Full offline functionality** - All features work without internet
3. **Sub-second operations** - No network latency
4. **100% git recoverable** - Everything in version control
5. **Enterprise adoption** - No security questionnaire blockers

## References

- [ADR-020: CLI-First Architecture](./ADR-020-cli-first-pivot.md)
- [Git-Native Handoffs](/docs/GIT-NATIVE-HANDOFFS.md)
- [Privacy Policy](https://ginko.ai/privacy) (to be created)