---
type: pattern
tags: [ai-enhancement, cli, two-phase, stdout]
area: packages/cli/src/commands
created: 2025-08-28
updated: 2025-08-28
relevance: high
dependencies: [chalk, fs-extra]
---

# AI enhancement pattern: Use process.stdout.write and exit code 42 for two-phase execution

## Context
When implementing the AI-enhanced handoff command following ADR-024, we discovered that using console.log() with process.exit(42) causes output to appear in stderr, showing an "Error" message. This breaks the flow state philosophy from ADR-023 where success should be silent or minimal.

## Technical Details
The two-phase execution model requires:
1. **Phase 1**: CLI generates template with AI placeholders and exits with code 42
2. **Phase 2**: AI processes template and calls back with --store flag

Key implementation details:
- Use `process.stdout.write()` instead of `console.log()` before exit code 42
- Flush stdout before exiting to ensure output is displayed
- Exit code 42 signals AI processing needed (not an error)
- Store template in temp file for AI reference

## Code Examples
**Before (shows as error):**
```typescript
console.log(chalk.yellow('🤖 AI Enhancement Required:'));
console.log(template.prompt);
process.exit(42); // Output goes to stderr
```

**After (clean output):**
```typescript
process.stdout.write(chalk.yellow('🤖 AI Enhancement Required:\n'));
process.stdout.write(template.prompt + '\n');
await new Promise(resolve => process.stdout.write('', resolve)); // Flush
process.exit(42); // Output stays in stdout
```

## Impact
- **User Experience**: Clean output without error messages maintains flow state
- **AI Integration**: Clear signal for AI to process template
- **Consistency**: Pattern can be reused across capture, ship, vibecheck commands
- **Debugging**: Exit code 42 clearly indicates AI enhancement phase

## References
- ADR-023: Flow State Design Philosophy (docs/reference/architecture/ADR-023)
- ADR-024: AI-Enhanced Local Tooling (docs/reference/architecture/ADR-024)
- Implementation: packages/cli/src/commands/handoff-ai.ts
- Utilities: packages/cli/src/utils/ai-templates.ts

## Related Patterns
- Template generation with AI markers ([AI: ...] placeholders)
- Validation of enriched content before storage
- Temporary file storage for cross-phase data (.tmp files)