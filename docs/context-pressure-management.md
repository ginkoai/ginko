---
type: guide
status: current
updated: 2025-10-01
tags: [context-pressure, quality-degradation, ai-optimization, session-management]
related: [adr/ADR-033-context-pressure-mitigation-strategy.md, adr/ADR-033-implementation-guide.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 12-min
---

# Context Pressure Management Guide

## What is Context Pressure?

**Context Pressure** is the degradation of AI reasoning quality and output depth that occurs as the conversation context window approaches saturation. This is a fundamental constraint in AI-assisted development that affects every extended session.

Think of it like RAM in a computer: as memory fills up, performance degrades, and eventually the system must free resources or crash.

---

## The Context Pressure Curve

```
AI Quality
  100% |●●●●●●●●●●●●●●●○○○○○○○○○○○○○○○
       |              ╲                ╲
   85% |               ●●●●●●●●○○○○○○○ ╲
       |                       ╲        ╲
   65% |                        ●●●●○○○ ╲
       |                            ╲    ╲
   40% |                             ●●○○●
       |                                ╲╱
   20% |                                 ●
       |___________________________________
        0%   25%   50%   75%   90%   95% 100%
              Context Window Utilization

Legend:
● = Optimal quality (100%)
○ = Degraded quality (40-85%)
```

### Key Observations

1. **0-50% Utilization**: Optimal performance, full reasoning capacity
2. **50-85% Utilization**: Gradual degradation, still functional
3. **85-95% Utilization**: Rapid quality collapse
4. **95-100% Utilization**: Crisis mode, generic responses

---

## Pressure Zones Explained

### Zone 1: Optimal (0-50% utilization) ✅

**Characteristics:**
- Full reasoning capacity available
- Deep analysis and exploration
- Creative problem-solving
- Complete code examples
- Multi-angle consideration
- Rich context references

**AI Behavior:**
```
Query: "How should I implement authentication?"

Response: "Let's consider several approaches:

1. JWT Tokens (Recommended)
   - Stateless, scales horizontally
   - Works across microservices
   - Requires secure secret management
   - Example implementation:
     [300 lines of detailed code]

2. Session Cookies
   - More secure (httpOnly, sameSite)
   - Simpler implementation
   - Harder to scale
   - Better for monoliths

3. OAuth Delegation
   - Best for third-party integration
   - Complex setup
   - Reduced liability

Based on your architecture (microservices, Next.js), I recommend JWT
with access/refresh pattern. Here's why..."
```

**Recommendations:**
- Do complex architecture decisions
- Explore multiple solutions
- Deep-dive debugging
- Learning new concepts

---

### Zone 2: Degradation (50-85% utilization) ⚠️

**Characteristics:**
- Reasoning begins to compress
- Shorter examples
- Less exploration of alternatives
- Focus on primary solution
- Reduced historical references

**AI Behavior:**
```
Query: "How should I implement authentication?"

Response: "For your Next.js app, use JWT tokens with NextAuth.js:

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export default NextAuth({
  providers: [
    CredentialsProvider({
      // [50 lines of code]
    })
  ]
})
```

This provides JWT tokens with automatic refresh. Consider session
cookies if security is paramount."
```

**Recommendations:**
- Continue implementation work
- Bug fixing and debugging
- Code reviews
- Testing

**Warning Signs:**
- Fewer code examples
- Less detailed explanations
- "As mentioned earlier..." without specifics
- Shorter responses

---

### Zone 3: Critical (85-100% utilization) 🔴

**Characteristics:**
- Severely compressed reasoning
- Generic, pattern-matched responses
- Minimal examples
- Unable to reference early context
- Quality collapse

**AI Behavior:**
```
Query: "How should I implement authentication?"

Response: "Use NextAuth.js for authentication in Next.js. It supports
JWT tokens and session management. See the documentation for setup
instructions."
```

**Recommendations:**
- Run `ginko handoff` immediately
- Start new session
- Avoid complex decisions
- No deep architectural work

**Crisis Symptoms:**
- Generic "see the docs" responses
- Unable to reference session history
- Repetitive suggestions
- Obvious quality degradation
- Auto-compact triggered by system

---

## Quality Degradation Examples

### Example 1: Code Generation

**At 20% Pressure (Optimal):**
```typescript
/**
 * Secure password hashing utility using bcrypt
 *
 * Rounds: 10-11 optimal (security vs performance)
 * - 10 rounds: ~100ms, good for most apps
 * - 12 rounds: ~300ms, high-security needs
 * - >12 rounds: Potential DoS vector
 */
export class PasswordService {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash a plaintext password
   * @throws {PasswordHashError} If hashing fails
   */
  static async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new PasswordHashError('Password too short');
    }

    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new PasswordHashError(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash
   * Uses constant-time comparison to prevent timing attacks
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error but don't expose to user
      logger.error('Password verification failed', { error });
      return false;
    }
  }
}

// Usage example:
const hashed = await PasswordService.hash('userPassword123');
const isValid = await PasswordService.verify('userPassword123', hashed);
```

**At 85% Pressure (Degraded):**
```typescript
// Hash password with bcrypt
import bcrypt from 'bcrypt';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

**At 95% Pressure (Critical):**
```typescript
// Use bcrypt for passwords
import bcrypt from 'bcrypt';
// See bcrypt documentation for usage
```

---

### Example 2: Debugging Help

**At 20% Pressure (Optimal):**
```
Looking at your error, the issue is a race condition in your token
refresh logic. Here's what's happening:

1. Two requests simultaneously detect expired token
2. Both call refreshToken()
3. Both generate new tokens
4. Database commits second token, invalidating first
5. Request with first token fails

The solution is atomic token rotation using SELECT FOR UPDATE:

```sql
BEGIN TRANSACTION;

-- Lock the row for update
SELECT * FROM refresh_tokens
WHERE token = $1
FOR UPDATE;

-- Generate new token
UPDATE refresh_tokens
SET token = $2, expires_at = $3
WHERE token = $1;

COMMIT;
```

This prevents concurrent refreshes. Also consider:
- Token versioning
- Grace period for old tokens
- Idempotency keys

Would you like me to show the implementation?
```

**At 85% Pressure (Degraded):**
```
This looks like a race condition in token refresh. Use SELECT FOR
UPDATE in PostgreSQL to lock the row during update:

```sql
SELECT * FROM tokens WHERE id = $1 FOR UPDATE;
UPDATE tokens SET token = $2 WHERE id = $1;
```

This makes it atomic.
```

**At 95% Pressure (Critical):**
```
Use database transactions to prevent race conditions. See PostgreSQL
documentation on SELECT FOR UPDATE.
```

---

## Managing Context Pressure

### Strategy 1: Regular Monitoring

```bash
# Check pressure every 30-60 minutes
ginko status

# Example output:
📊 Context Pressure
  Pressure: 45% ✅ (optimal zone)
  Quality Estimate: 100%
  💡 Continue working (optimal quality)
```

### Strategy 2: Pressure-Aware Workflow

```
Session Start (5%)
    ↓
Feature Work (20-50%)     ← Optimal for architecture decisions
    ↓
Implementation (50-70%)   ← Optimal for coding
    ↓
Testing (70-85%)          ← Still good quality
    ↓
[HANDOFF THRESHOLD]
    ↓
Handoff (75-85%)          ← Preserve quality
    ↓
New Session (5%)          ← Fresh start
```

### Strategy 3: Continuous Session Logging (ADR-033)

**Traditional Approach (Reactive):**
```
Work until 95% → Call handoff → Poor quality (40%)
```

**ADR-033 Approach (Proactive):**
```
Log at 20-80% → Work more → Handoff at 85% → Good quality (85%)
```

**Key Innovation**: Capture insights when pressure is low, synthesize when pressure is high.

---

## Pressure Mitigation Techniques

### 1. Early Handoff

**Bad Timing:**
- At 95%+ pressure
- After quality degradation noticed
- When forced by context limit

**Good Timing:**
- At 75-85% pressure
- After completing feature
- Before context switching
- End of work session

**Benefits:**
- Higher quality synthesis (+25-40%)
- Better insight preservation
- Smoother session continuity
- More useful for next developer

### 2. Session Logging (ADR-033)

Enable continuous logging to capture insights early:

```bash
# Start with logging (default)
ginko start

# Log events automatically (AI agent)
# Or manually:
ginko log feature "Implemented JWT authentication"
ginko log insight "bcrypt rounds 10-11 optimal"
ginko log decision "Chose JWT over sessions for scalability"

# Handoff uses logs for synthesis
ginko handoff
```

**Token Savings:** 40-50% reduction in handoff synthesis

### 3. Context Compaction

**Automatic Compaction:**
- Triggered at 95%+ pressure
- Summarizes early context
- Frees space for new context
- **Quality loss:** 30-50%

**Manual Compaction:**
```bash
# Compact before critical pressure
ginko compact

# Better: Handoff instead
ginko handoff  # Preserves full quality
```

### 4. Selective Context Loading

**Progressive Context Loading:**
- Load immediate context first (high relevance)
- Defer background context (low relevance)
- Optimize token usage

**Example:**
```typescript
const context = await ActiveContextManager.loadInitialContext({
  immediate: true,    // Load now
  background: false   // Defer until needed
});
```

---

## Pressure Monitoring Tools

### Built-in Commands

```bash
# Full status with pressure
ginko status

# Quick pressure check
ginko status --pressure

# Continuous monitoring (Linux/Mac)
watch -n 300 ginko status --pressure  # Every 5 minutes
```

### Shell Integration

Add to your `.bashrc` or `.zshrc`:

```bash
# Show pressure in prompt
function ginko_pressure() {
  if [ -d ".ginko" ]; then
    local pressure=$(ginko status --pressure 2>/dev/null || echo "N/A")
    echo "[Ginko: $pressure]"
  fi
}

# Add to PS1
PS1='$(ginko_pressure) \u@\h:\w\$ '
```

### IDE Integration (Future)

- VS Code extension status bar
- Real-time pressure monitoring
- Automatic handoff suggestions
- Context usage visualization

---

## Best Practices

### Do's ✅

1. **Monitor regularly**: Check pressure every 30-60 minutes
2. **Log early**: Capture insights at low pressure (20-60%)
3. **Handoff proactively**: At 75-85%, not 95%+
4. **Use session logging**: Enable with `ginko start` (default)
5. **Trust the warnings**: Act on pressure recommendations

### Don'ts ❌

1. **Ignore pressure warnings**: Quality degradation accelerates
2. **Wait until 95%**: Critical pressure causes quality collapse
3. **Skip logging**: Loses insights to pressure degradation
4. **Disable monitoring**: Flying blind on quality
5. **Force through**: More tokens ≠ better output at high pressure

---

## FAQ

**Q: Why does quality degrade with pressure?**

A: AI models have fixed context windows (e.g., 200k tokens). As they fill, the model must compress or discard information to fit new context. This compression reduces reasoning depth and output quality.

**Q: Can I increase the context window?**

A: Context window size is model-specific (Claude Sonnet 4.5: 200k tokens). You can't increase it, but you can use it more efficiently with session logging.

**Q: How accurate are pressure estimates?**

A: Pressure estimates in `ginko status` are heuristics (~4 chars/token). Actual pressure comes from Claude API token counts in production. Estimates are ±5-10% accurate.

**Q: Should I always handoff at 85%?**

A: Not always. Guidelines:
- **Feature complete**: Yes, handoff
- **Mid-debugging**: Finish current bug, then handoff
- **Deep work**: Consider 75-80% threshold
- **Hack & ship**: Can push to 90% if needed

**Q: Does logging slow down development?**

A: No. Logging adds <20ms per entry (<2 minutes total per 3-hour session). The quality preservation far outweighs the minimal time cost.

**Q: What if I forget to handoff?**

A: Session logs are preserved until next handoff. No data loss. However, quality will degrade if you continue working at high pressure. Run `ginko handoff` as soon as you notice.

**Q: Can I disable pressure monitoring?**

A: Yes, but not recommended:
```bash
ginko start --no-log --no-pressure
```

However, this removes quality safeguards and is only suitable for short, simple sessions.

---

## Related Documentation

- [ADR-033: Context Pressure Mitigation Strategy](adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-033 Implementation Guide](adr/ADR-033-implementation-guide.md)
- [Session Logging Example](examples/session-logging-example.md)
- [CLAUDE.md: Session Logging Best Practices](../CLAUDE.md#session-logging-best-practices)

---

## Conclusion

Context pressure is a fundamental constraint in AI-assisted development. By understanding the pressure curve, monitoring regularly, and using session logging (ADR-033), you can maintain high-quality AI assistance throughout long development sessions.

**Key Takeaways:**
1. Pressure degrades quality exponentially above 85%
2. Early logging preserves insights for later synthesis
3. Proactive handoffs (75-85%) yield 25-40% better quality
4. Regular monitoring prevents quality collapse
5. Session logging reduces token usage by 40-50%

**Action Items:**
1. Enable session logging: `ginko start`
2. Check pressure regularly: `ginko status`
3. Handoff proactively: At 75-85% pressure
4. Trust the system: Follow pressure recommendations

---

*Last updated: 2025-10-01*
*Part of ADR-033 implementation*
