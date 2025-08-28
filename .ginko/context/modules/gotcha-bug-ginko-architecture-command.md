---
type: gotcha
tags: [bug, stderr, cli, architecture]
area: packages/cli/src/commands
created: 2025-08-28
updated: 2025-08-28
relevance: high
dependencies: [chalk, process.stdout]
---

# BUG: ginko architecture command still uses stderr

## Context
While working on the enhanced ginko init architecture, discovered that the architecture command (and potentially explore and plan) still use console.log with process.exit(44), causing output to appear in stderr as red error text. This breaks the flow state philosophy from ADR-023 where commands should have clean, non-anxiety-inducing output.

## Technical Details
The architecture command exits with code 44 to signal architecture mode to the AI, but uses console.log() instead of process.stdout.write(). When process.exit() is called with a non-zero code, the shell interprets this as an error and displays the output in red through stderr, even though the command succeeded.

## Code Examples
**Current (shows as red error):**
```typescript
// packages/cli/src/commands/architecture.ts
console.log(chalk.blue('\n🏛️  Architecture Decision Mode'));
console.log(framework);
process.exit(44); // Output appears in stderr
```

**Fixed (clean output):**
```typescript
// Should be:
process.stdout.write(chalk.blue('\n🏛️  Architecture Decision Mode') + '\n');
process.stdout.write(framework + '\n');
await new Promise(resolve => process.stdout.write('', resolve)); // Flush
process.exit(44); // Output stays in stdout
```

## Impact
- **User Experience**: Red error text causes anxiety even when command succeeds
- **Consistency**: Other commands (capture, handoff) already fixed, architecture/explore/plan still broken
- **Flow State**: Error appearance interrupts concentration and causes doubt
- **Professional Image**: Makes the tool feel unpolished

## References
- Previous fix applied to capture.ts, handoff-ai.ts, explore.ts, plan.ts
- ADR-023: Flow State Design Philosophy
- Pattern established in packages/cli/src/commands/handoff-ai.ts:113-125

## Related Patterns
- All commands using special exit codes (42-47) need stdout fix
- Exit codes: 43 (explore), 44 (architecture), 45 (plan) still affected
- Pattern: Use process.stdout.write() and flush before exit