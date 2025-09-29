# Claude Code Permissions Guide for Ginko Power Users

## Overview

This guide helps you configure Claude Code's tool permissions for optimal Ginko workflow. By pre-approving certain commands, you can achieve uninterrupted flow state with zero permission prompts.

**⚠️ Important**: These settings remove safety prompts. Only configure if you understand and trust the commands being auto-approved.

## Permission Levels

### 🟢 Level 1: Essential Flow (Recommended)

Pre-approve only the most common, safe Ginko operations:

```json
{
  "tools": {
    "autoApprove": [
      "Bash(ginko capture:*)",
      "Bash(ginko start:*)",
      "Bash(ginko status:*)",
      "Read(.ginko/**)"
    ]
  }
}
```

**What this enables:**
- Instant context capture without prompts
- Session starts without interruption
- Status checks flow smoothly
- Reading context modules automatically

**Still requires approval:**
- File writes (safety check)
- Handoffs and shipping (important operations)
- System commands outside Ginko

### 🟡 Level 2: Productivity Mode

For users comfortable with more automation:

```json
{
  "tools": {
    "autoApprove": [
      "Bash(ginko capture:*)",
      "Bash(ginko start:*)",
      "Bash(ginko handoff:*)",
      "Bash(ginko status:*)",
      "Bash(ginko context:*)",
      "Bash(ginko vibecheck:*)",
      "Read(.ginko/**)",
      "Write(.ginko/**)",
      "Bash(git status:*)",
      "Bash(git diff:*)"
    ]
  }
}
```

**Additional capabilities:**
- Auto-save handoffs
- Write context modules without prompts
- Git status checks for context
- Review diffs automatically

**Still requires approval:**
- Git commits and pushes
- Running tests
- System modifications

### 🔴 Level 3: Maximum Flow (Power Users Only)

For experienced users who prioritize uninterrupted flow:

```json
{
  "tools": {
    "autoApprove": [
      "Bash(ginko:*)",
      "Read(.ginko/**)",
      "Write(.ginko/**)",
      "MultiEdit(.ginko/**)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(npm test:*)",
      "Read(**/*.md)",
      "Read(**/*.ts)",
      "Read(**/*.tsx)",
      "Read(**/*.js)",
      "Read(**/*.jsx)"
    ]
  }
}
```

**Full automation:**
- All Ginko commands instant
- Read any code files
- Run tests automatically
- Complete git inspection

**Still requires approval:**
- Writing source code files
- Git commits/pushes
- System-level commands
- Package installations

## Setup Instructions

### Step 1: Locate Claude Code Settings

1. Open Claude Code
2. Access Settings/Preferences (usually `Cmd+,` or `Ctrl+,`)
3. Look for "Tools", "Permissions", or "Security" section

### Step 2: Add Permission Rules

1. Find the `autoApprove` or similar configuration
2. Copy one of the permission levels above
3. Paste into your settings
4. Save the configuration

### Step 3: Test the Configuration

Test with progressively more complex commands:

```bash
# Test 1: Simple capture (should be instant)
/ginko capture "test permission"

# Test 2: Status check (should be instant)
/ginko status

# Test 3: Write operation (check if needs approval)
/ginko handoff "testing flow"
```

### Step 4: Adjust as Needed

- Start with Level 1
- Upgrade to Level 2 after a week
- Consider Level 3 only if interruptions break your flow

## Understanding the Workflow

### Without Permissions (Default)

```
User: /ginko capture "insight"
Claude: [🔔 Requests permission to run bash command]
User: [Clicks approve]
Claude: [Executes capture]
Claude: [🔔 Requests permission to store]
User: [Clicks approve]
Claude: done
```

**Time: 10-15 seconds** (includes approval clicks)

### With Permissions (Configured)

```
User: /ginko capture "insight"
Claude: [Executes immediately]
Claude: [Stores immediately]
Claude: done
```

**Time: 2 seconds** (true flow state)

## The Capture Workflow in Detail

When you run `/ginko capture "learning"` with permissions configured:

### Phase 1: Template Generation
1. **Command executes instantly** (no prompt)
2. **CLI generates template** with AI placeholders
3. **Returns with exit code 42** signaling AI enhancement needed

### Phase 2: AI Enhancement (Automatic)
1. **Claude recognizes exit code 42**
2. **Reads the template** (auto-approved with `Read(.ginko/**)`)
3. **Enhances with contextual information**
4. **No manual intervention required**

### Phase 3: Storage (Automatic)
1. **Claude calls `ginko capture --store`** (auto-approved)
2. **Writes enriched module** (auto-approved with `Write(.ginko/**)`)
3. **Returns "done"**
4. **Total time: ~2 seconds**

## Security Best Practices

### ✅ DO

- Start with minimal permissions
- Only auto-approve commands you use frequently
- Keep permissions scoped to specific directories
- Review permissions monthly
- Revoke permissions when pair programming

### ❌ DON'T

- Never auto-approve `Bash(*)` (too dangerous)
- Don't auto-approve `Write(**)` (too broad)
- Don't share permission configs without review
- Don't auto-approve destructive commands (`rm`, `delete`)
- Don't bypass permissions on shared machines

## Troubleshooting

### Permissions Not Working

1. **Check syntax**: Ensure JSON is valid
2. **Check patterns**: Patterns are case-sensitive
3. **Restart Claude Code**: Some changes need restart
4. **Check logs**: Look for permission denied messages

### Too Many Prompts

- Gradually increase permission level
- Add specific commands you use often
- Consider workflow patterns

### Security Concerns

- Start with read-only permissions
- Add write permissions for specific directories only
- Never auto-approve system-level commands
- Keep sensitive directories excluded

## Permission Patterns Reference

### Ginko-Specific
- `Bash(ginko capture:*)` - All capture commands
- `Bash(ginko:*)` - All ginko commands
- `Read(.ginko/**)` - Read any ginko files
- `Write(.ginko/**)` - Write to ginko directory

### Git Operations
- `Bash(git status:*)` - Status checks
- `Bash(git diff:*)` - View differences
- `Bash(git log:*)` - View history
- ⚠️ `Bash(git commit:*)` - Commits (use cautiously)

### File Operations
- `Read(**/*.ts)` - Read TypeScript files
- `Read(**/README.md)` - Read documentation
- `Write(.ginko/context/**)` - Write context modules
- `MultiEdit(.ginko/**)` - Bulk edits in ginko

### Development Tools
- `Bash(npm test:*)` - Run tests
- `Bash(npm run build:*)` - Build commands
- ⚠️ `Bash(npm install:*)` - Package installation

## Gradual Adoption Path

### Week 1: Observation
- Use Ginko without permissions
- Note which prompts interrupt flow
- Track most common commands

### Week 2: Essential Permissions
- Configure Level 1 permissions
- Test capture workflow
- Measure flow improvement

### Week 3: Productivity Mode
- Upgrade to Level 2 if comfortable
- Add your most-used commands
- Fine-tune patterns

### Week 4+: Optimization
- Consider Level 3 for maximum flow
- Create custom permission sets
- Share learnings with team

## The Goal: Invisible Excellence

With proper permissions configured, Ginko becomes invisible:

```bash
# Monday morning
/ginko start                    # Instant
/ginko capture "api pattern"    # 2 seconds
/ginko capture "gotcha: cors"   # 2 seconds
/ginko handoff                  # 3 seconds

# Total interruption: < 10 seconds for entire day
```

The tool disappears, leaving only the work. This is the ultimate expression of the Flow State Philosophy (ADR-023).

## Getting Help

- Check Claude Code documentation for platform-specific settings
- Review ADR-023 for Flow State Philosophy
- Test permissions in a safe environment first
- Start conservative, increase gradually

---

Remember: The best permission configuration is the one that makes the tool invisible while keeping you safe. Start small, build trust, increase gradually.