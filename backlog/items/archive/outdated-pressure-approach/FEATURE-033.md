---
id: FEATURE-033
type: feature
title: Context Pressure Measurement Integration with Claude Code
status: todo
priority: critical
size: M
created: '2025-10-03T20:27:55.434Z'
updated: '2025-10-03T20:27:55.436Z'
author: xtophr@gmail.com
tags:
  - adr-033
  - context-pressure
  - claude-code-integration
  - pressure-monitoring
  - critical
related:
  - ADR-033-context-pressure-mitigation-strategy.md
  - packages/cli/src/core/pressure-monitor.ts
  - FEATURE-032.md
acceptance_criteria:
  - PressureMonitor receives real token usage from Claude Code
  - ginko status shows accurate pressure (not 0%)
  - Quality estimates based on actual context utilization
  - Zone classification works correctly (optimal/degradation/critical)
  - Session log captures real pressure values
---
## Problem Statement

**Architectural Gap**: `PressureMonitor.getCurrentPressure()` always returns 0% because ginko CLI has no access to Claude Code's actual token usage.

**Evidence of Disconnect**:
```bash
# ginko status reports:
📊 Context Pressure: 0% (optimal zone)
Quality Estimate: 100%

# Claude Code /context shows reality:
Context Usage 151k/200k tokens (75%)
⛁ ⛀ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛝ ⛝   # 75% full (degradation zone!)
```

**Root Cause** (pressure-monitor.ts:54):
```typescript
private static estimatedTokens: number = 0;  // ← Never updated!

static getCurrentPressure(tokensUsed?: number): number {
  const used = tokensUsed ?? this.estimatedTokens;  // Always uses 0
  return Math.min(used / this.maxTokens, 1.0);      // Returns 0/200000 = 0
}
```

**Impact on ADR-033**:
- ✅ Session logging infrastructure works
- ✅ Log parsing works (ginko status reads logs)
- ❌ **Pressure measurement broken** (always 0%)
- ❌ **Quality estimates wrong** (always 100%)
- ❌ **Zone classification broken** (always "optimal")
- ❌ **Handoff timing guidance wrong** (never suggests handoff)
- ❌ **Session log pressure values are estimates** (not real measurements)

**Why This Matters**:
According to ADR-033, quality degrades significantly above 75% pressure:
- 0-50%: 100% quality (optimal)
- 50-85%: 85-95% quality (degradation) ← **We're actually here**
- 85-100%: 40-65% quality (critical)

Without real measurements, users don't know when to call `ginko handoff` to preserve quality.

## Solution

**Integrate ginko CLI with Claude Code token tracking** via one of three approaches:

### Option 1: Claude Code Hook Integration (Recommended)
Use Claude Code's hook system to pass context data to ginko:

```bash
# .claude/hooks/on-tool-call.sh
#!/bin/bash
if [[ "$TOOL_NAME" == "ginko" ]]; then
  # Extract token usage from /context
  TOKENS=$(claude context | grep -oP '\d+k/\d+k' | head -1)
  export GINKO_CONTEXT_TOKENS="$TOKENS"
fi
```

```typescript
// In ginko CLI - read from environment
const tokens = process.env.GINKO_CONTEXT_TOKENS;
if (tokens) {
  const [used, max] = tokens.split('/').map(s => parseInt(s) * 1000);
  PressureMonitor.updateEstimatedTokens(used);
}
```

### Option 2: MCP Context Extension
Create an MCP tool that Claude Code calls to report token usage:

```typescript
// Claude Code → MCP Server → ginko CLI
{
  name: "update_context_pressure",
  input: { tokens_used: 151000, tokens_max: 200000 }
}
```

### Option 3: Session Metadata File
Claude Code writes token stats to `.ginko/context-stats.json`:

```json
{
  "timestamp": "2025-10-03T20:27:00Z",
  "tokens_used": 151000,
  "tokens_max": 200000,
  "pressure": 0.755
}
```

ginko CLI reads this file on every command to get current pressure.

## Technical Approach

**Phase 1: Hook-based Integration** (Simplest, fastest)

1. **Create Claude Code hook** (`.claude/hooks/on-ginko-call.sh`):
   ```bash
   #!/bin/bash
   # Extract context from Claude Code
   CONTEXT=$(claude context --json 2>/dev/null || echo '{}')
   TOKENS_USED=$(echo "$CONTEXT" | jq -r '.tokens_used // 0')
   TOKENS_MAX=$(echo "$CONTEXT" | jq -r '.tokens_max // 200000')

   # Export for ginko to read
   export GINKO_TOKENS_USED="$TOKENS_USED"
   export GINKO_TOKENS_MAX="$TOKENS_MAX"
   ```

2. **Update ginko CLI startup** (all commands):
   ```typescript
   // At start of every command
   function initializePressureMonitor() {
     const used = parseInt(process.env.GINKO_TOKENS_USED || '0');
     const max = parseInt(process.env.GINKO_TOKENS_MAX || '200000');

     if (used > 0) {
       PressureMonitor.updateEstimatedTokens(used);
       PressureMonitor.maxTokens = max;
     }
   }
   ```

3. **Update session logger** (session-logger.ts:146):
   ```typescript
   private async estimateContextPressure(): Promise<number> {
     // Try to get real pressure first
     const realPressure = PressureMonitor.getCurrentPressure();
     if (realPressure > 0) {
       return realPressure;
     }

     // Fallback to estimation (message count heuristic)
     return this.estimatePressureFromMessages();
   }
   ```

**Phase 2: Add Validation**
- Verify hook execution with debug logging
- Add pressure reading to `ginko status --verbose`
- Test with multiple pressure levels

**Phase 3: Fallback Heuristics**
When real data unavailable, use smart estimation:
- Message count (rough proxy)
- File read sizes
- Response lengths

**Testing**:
- Verify at 25%, 50%, 75%, 90% actual pressure
- Confirm zone transitions work correctly
- Validate quality estimates match curve
