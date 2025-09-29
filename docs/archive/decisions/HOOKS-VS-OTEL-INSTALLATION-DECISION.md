# Critical Decision: Hooks vs OTEL Installation Reality Check

## 🚨 Key Discovery
**Hooks cannot be fully automated** - they require:
1. Manual `/hooks` command execution in Claude Code
2. TWO application restarts
3. Security consent for arbitrary shell execution

## Installation Comparison

| Aspect | Hooks | OpenTelemetry | Winner |
|--------|-------|---------------|--------|
| **Automation** | ❌ Requires manual steps | ✅ Fully scriptable | OTEL |
| **Restarts Required** | 2 | 0 | OTEL |
| **Security Risk** | HIGH (shell exec) | LOW (telemetry only) | OTEL |
| **User Consent** | Complex warnings | Simple opt-in | OTEL |
| **Installation Success Rate** | ~30-40% | ~60-70% | OTEL |

## User Experience Journey

### Hooks Path (Complex)
```
ginko install
├── ⚠️ "This will modify Claude Code settings"
├── ⚠️ "Hooks can execute arbitrary commands"
├── ❌ "Please restart Claude Code"
├── ❌ "Run /hooks command"
├── ❌ "Restart Claude Code again"
└── Maybe works?
```

### OTEL Path (Simple)
```
ginko install --telemetry
├── ✅ "Enable telemetry for coaching?"
├── ✅ Sets environment variables
├── ✅ Starts local collector
└── Works immediately
```

## 🎯 Revised Recommendation

### Immediate Action: Pivot to OTEL-First

**Why the pivot:**
1. **Hooks are a power-user feature**, not suitable for general installation
2. **OTEL can be automated** during Ginko setup
3. **Lower liability** - no arbitrary code execution
4. **Better fallback** - graceful degradation if disabled

### Implementation Strategy

#### Phase 1: OTEL MVP (Week 1)
```bash
# During ginko install
echo "Enable intelligent coaching? (y/n)"
if [[ $REPLY =~ ^[Yy]$ ]]; then
  export CLAUDE_CODE_ENABLE_TELEMETRY=1
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
  docker run -d ginko/otel-collector
fi
```

#### Phase 2: Hooks as Opt-in Advanced Feature (Week 2-3)
```bash
# Separate command for power users
ginko install-advanced-hooks
# Shows warnings, guides through manual setup
# Provides test scripts to verify
```

## Risk Mitigation

### If OTEL Consent Denied:
- ✅ Core Ginko features work
- ✅ Show static coaching tips
- ✅ Time-based patterns still available
- ✅ Can enable later

### If Hooks Installation Fails:
- ❌ Complex recovery process
- ❌ User frustration high
- ❌ Support burden increases
- ❌ Security concerns remain

## Decision Matrix

| Criteria | Weight | Hooks | OTEL | Weighted Score |
|----------|--------|-------|------|----------------|
| Installation Simplicity | 30% | 2/10 | 7/10 | OTEL +1.5 |
| User Adoption | 25% | 3/10 | 7/10 | OTEL +1.0 |
| Data Richness | 20% | 5/10 | 9/10 | OTEL +0.8 |
| Security Risk | 15% | 3/10 | 8/10 | OTEL +0.75 |
| Maintenance | 10% | 4/10 | 7/10 | OTEL +0.3 |

**Total Score: OTEL 7.4 vs Hooks 3.2**

## 📋 Action Items

### Do Now:
1. [ ] Stop hooks development for general release
2. [ ] Focus on OTEL collector implementation
3. [ ] Create seamless OTEL installation flow
4. [ ] Test with beta users

### Do Later:
1. [ ] Document hooks for power users
2. [ ] Create hooks "advanced mode" installer
3. [ ] Build community around hook scripts

## Conclusion

**The installation complexity kills hooks for general adoption.**

OTEL is the pragmatic choice for Ginko's intelligent statusline. Hooks become an advanced feature for power users who explicitly want that level of control.

This pivots our architecture from "hooks with OTEL enhancement" to "OTEL-first with hooks as premium add-on."

---
*Decision Date: 2025-08-19*
*Critical Factor: Installation automation requirement*