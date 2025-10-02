

## Session Logging Best Practices (ADR-033)

### Overview

Continuous session logging captures insights at low context pressure (20-80%), enabling high-quality handoffs even when called under high pressure (85-100%). This inverts the quality curve and preserves insights that would otherwise be lost to context pressure degradation.

### When to Log

Log events after significant milestones:

**File Modifications**
- After implementing a feature
- After refactoring code
- When changing multiple files

**Bug Fixes**
- After identifying root cause
- After implementing solution
- After verifying fix

**Key Decisions**
- Architecture choices
- Library/framework selection
- Trade-off decisions
- Alternative approaches considered

**Insights**
- Performance gotchas discovered
- API quirks encountered
- Best practices learned
- Patterns identified

**Git Operations**
- After commits
- Branch changes
- Merge operations

**Achievements**
- Features completed
- Tests passing
- Milestones reached

### How to Write Concise, Valuable Entries

**Format:**
```markdown
### HH:MM - [category]
Brief description (1-2 sentences max)
Files: path/to/file.ts:line-range, other-file.ts:lines
Impact: high|medium|low
```

**Good Examples:**

```markdown
### 14:30 - [feature]
Implemented JWT authentication with access/refresh token rotation
Files: src/auth/jwt.ts:1-120, src/middleware/auth.ts:40-85
Impact: high | Pressure: 35%
```

```markdown
### 15:15 - [insight]
Discovered bcrypt rounds 10-11 optimal balance (security vs performance)
Impact: medium | Pressure: 42%
```

**Bad Examples (Too Vague):**

```markdown
### 14:30 - [feature]
Fixed auth stuff
Impact: medium | Pressure: 35%
```

### Integration with Work Modes

#### Hack & Ship Mode
- **Frequency**: Log every 60-90 minutes
- **Focus**: Achievements, blockers, decisions
- **Detail**: Minimal (1 sentence)
- **Categories**: feature, fix, achievement
- **Pressure threshold**: Handoff at 85-90%

#### Think & Build Mode
- **Frequency**: Log every 30-45 minutes
- **Focus**: Decisions, patterns, files
- **Detail**: Moderate (1-2 sentences)
- **Categories**: All categories
- **Pressure threshold**: Handoff at 75-85%

#### Deep Work Mode
- **Frequency**: Log every 20-30 minutes
- **Focus**: Comprehensive context, rationale
- **Detail**: Detailed (2-3 sentences)
- **Categories**: All categories + extensive insights
- **Pressure threshold**: Handoff at 70-80%

### Pressure-Aware Workflow

**Recommended Pattern:**

```
Session Start (5%)
    ↓
ginko start
    ↓
Work + Log (20-60%)        ← Optimal logging zone
    ↓
Check pressure (ginko status)
    ↓
Continue if < 75%
    ↓
Work + Log (60-75%)        ← Still good quality
    ↓
Check pressure again
    ↓
Complete current task (75-85%)
    ↓
ginko handoff              ← Preserve quality
    ↓
New session (5%)
```

### References

- [ADR-033: Context Pressure Mitigation Strategy](docs/adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-033 Implementation Guide](docs/adr/ADR-033-implementation-guide.md)
- [Session Logging Example](docs/examples/session-logging-example.md)
- [Context Pressure Management](docs/context-pressure-management.md)

---

*Session logging is enabled by default with `ginko start`. Use `--no-log` to disable.*
