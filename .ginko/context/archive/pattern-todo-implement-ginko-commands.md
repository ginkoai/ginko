---
type: pattern
tags: [unix, architecture, cli, semantic, backlog, todo]
area: /packages/cli/src/commands
created: 2025-08-27
updated: 2025-08-27
relevance: high
dependencies: [gotcha-explore-architecture-plan-modes-need-better]
---

# TODO: Implement ginko commands as hybrid UNIX pipe patterns with semantic prefixes

## Context
During analysis of ginko capture modes, we identified that the current flag-based approach for differentiating knowledge vs actionable captures risks becoming a "Swiss Army knife" anti-pattern. The Unix philosophy of "do one thing well" suggests a cleaner approach using semantic detection and optional pipes for composability.

## Technical Details
The hybrid approach combines three strategies:
1. **Semantic Detection (80% of cases)**: Automatically detect intent from prefixes like TODO:, BUG:, FIX:, NEED:
2. **Unix Pipes (power users)**: Enable command chaining with --stdout and --stdin flags
3. **Simple Override (explicit control)**: Single --action flag when semantic detection needs override

### Semantic Prefix Detection
```typescript
function detectActionable(description: string): boolean {
  const actionPrefixes = [
    'TODO:', 'BUG:', 'FIX:', 'NEED:', 'MUST:',
    'SHOULD:', 'IMPLEMENT:', 'CREATE:'
  ];
  const upper = description.toUpperCase();
  return actionPrefixes.some(prefix => upper.startsWith(prefix));
}
```

## Code Examples
### Current Approach (Swiss Army Knife Anti-Pattern)
```bash
# Too many responsibilities - capture doing multiple things
ginko capture "insight" --backlog --ticket --slack --email
```

### Proposed Unix Pipe Pattern
```bash
# Simple semantic detection
ginko capture "TODO: fix template context"
→ Creates context module + BACKLOG-044 automatically

# Explicit pipe for complex workflows
ginko capture "critical auth bug" --stdout | ginko backlog --priority=high | ginko assign @security-team

# Override semantic detection
ginko capture "learning about React 19" --action  # Forces backlog even though it's phrased as learning
```

### Implementation in capture.ts
```typescript
export async function captureCommand(description: string | undefined, options: CaptureOptions) {
  // ... existing capture logic ...
  
  // Detect actionable intent
  const isActionable = detectActionable(description) || options.action;
  
  if (isActionable) {
    // Create backlog item automatically
    const backlogItem = await createBacklogEntry({
      description,
      contextModule: modulePath,
      type: detectBacklogType(description), // bug, feature, task
      priority: options.priority || 'medium'
    });
    
    if (!options.quiet) {
      console.log(`BACKLOG-${backlogItem.id} created`);
    }
  }
  
  // Support Unix pipes
  if (options.stdout) {
    const output = {
      module: modulePath,
      description,
      backlogId: backlogItem?.id
    };
    console.log(JSON.stringify(output));
    process.exit(0); // Clean exit for piping
  }
  
  // Normal "done" output
  if (!options.quiet && !options.stdout) {
    console.log('done');
  }
}
```

## Impact
- **Simplicity**: Capture remains focused on its primary purpose
- **Flexibility**: Power users can chain commands for complex workflows
- **Discoverability**: Semantic prefixes are self-documenting
- **Enterprise Ready**: Webhook events can be triggered for actionable items
- **Backwards Compatible**: Existing captures continue to work

## Enterprise Integration Opportunity
```typescript
// Future enterprise feature
if (isActionable && config.webhooks.enabled) {
  await sendToMessageQueue({
    event: 'actionable_captured',
    data: { description, module, backlogId },
    timestamp: new Date().toISOString()
  });
}
```

## References
- Unix Philosophy: "Make each program do one thing well"
- Git precedent: `git add` and `git commit` are separate, but `git commit -a` combines them
- Current implementation: /packages/cli/src/commands/capture.ts
- Related discussion: Context preservation system (ADR-025)

## Related Patterns
- Git's semantic commit prefixes (feat:, fix:, docs:)
- Conventional Commits specification
- Unix pipe philosophy (ls | grep | sort)
- Semantic versioning (MAJOR.MINOR.PATCH)

## Next Steps
1. Implement detectActionable() function in capture.ts
2. Add createBacklogEntry() for automatic backlog creation
3. Support --stdout flag for Unix piping
4. Document semantic prefixes in README
5. Add enterprise webhook configuration option