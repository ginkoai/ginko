# OpenTelemetry-Based Statusline Intelligence POC

## Comparison: Hooks vs OpenTelemetry

### Hooks Approach
**Pros:**
- ✅ Simple bash scripts
- ✅ Low latency (<30ms)
- ✅ Already working

**Cons:**
- ❌ No error data exposed
- ❌ Limited to basic tool info
- ❌ Requires restart to activate

### OpenTelemetry Approach
**Pros:**
- ✅ Rich telemetry data (errors, tokens, timing)
- ✅ Industry standard protocol
- ✅ Built-in metrics aggregation
- ✅ "Tool execution results" captured
- ✅ API errors tracked

**Cons:**
- ❌ More complex setup
- ❌ Requires OTLP collector
- ❌ Beta feature (may change)

## Quick POC Plan

### 1. Minimal OTLP Collector Setup
```bash
# Use OpenTelemetry Collector or simple HTTP receiver
docker run -p 4317:4317 -p 4318:4318 \
  otel/opentelemetry-collector:latest
```

### 2. Configure Claude Code
```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_LOGS_EXPORTER=console  # For debugging
```

### 3. Simple Telemetry Reader
```python
# Read from collector's export endpoint
# Parse metrics for:
# - Tool error rates
# - Token usage patterns
# - API errors
# - Tool execution frequency
```

### 4. Pattern Detection
- Error thrashing: Multiple tool errors in short time
- Flow state: High token usage, successful tools
- Stuck: Low activity, repeated same tools
- Context overflow: High token usage approaching limits

### 5. Statusline Integration
```bash
# Read telemetry patterns
# Map to coaching messages
# Update statusline file
```

## Decision Matrix

| Criteria | Hooks | OpenTelemetry | Winner |
|----------|-------|---------------|--------|
| Setup Complexity | Simple | Moderate | Hooks |
| Data Richness | Basic | Comprehensive | OTEL |
| Error Detection | No | Yes | OTEL |
| Performance | <30ms | TBD | TBD |
| Maintenance | Low | Medium | Hooks |
| Future-proof | Limited | Extensible | OTEL |

## Recommendation

**Hybrid Approach:**
1. Keep hooks for immediate tool tracking (working now)
2. Add OTEL for rich analytics and error detection
3. Statusline reads from both sources
4. Graceful fallback if either fails

This gives us:
- Immediate value from hooks
- Rich insights from OTEL
- Resilient architecture
- Progressive enhancement