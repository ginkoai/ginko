# Refactoring Proposal: Universal Reflection Pattern with Command Shortcuts

**Status**: PROPOSED
**Date**: 2025-10-01
**Complexity**: Medium (affects 15+ commands)
**Value**: High (architectural consistency, extensibility, maintainability)

## Current State Analysis

### Two Parallel Systems

**System 1: Standalone Commands** (15+ commands)
```bash
ginko capture "decision made"
ginko start
ginko handoff "session complete"
ginko architecture "new ADR"
ginko explore "feature idea"
ginko ship "release v2"
```

**System 2: Universal Reflection Pattern** (11 reflectors)
```bash
ginko reflect --domain backlog "new feature"
ginko reflect --domain prd "product spec"
ginko reflect --domain sprint "planning"
```

### Problem

**Architectural inconsistency**: Two ways to achieve similar outcomes
- `capture.ts` - standalone implementation
- `backlog/backlog-reflection.ts` - reflection implementation
- Users must learn which commands use which pattern
- Maintenance burden: two code paths for similar functionality
- Harder to add new domains (which pattern to follow?)

## Proposed Solution

### Unified Architecture: Everything is a Reflector

**Core Principle**: `ginko reflect --domain <domain>` is the universal interface.
**User Experience**: Direct commands are **shortcuts** that delegate to reflectors.

### Implementation Strategy

#### 1. Command Routing Layer

```typescript
// packages/cli/src/core/command-shortcuts.ts

export const COMMAND_SHORTCUTS: Record<string, ReflectorShortcut> = {
  capture: {
    domain: 'capture',
    defaultIntent: (description) => description || 'capture current context',
    options: { save: true }
  },
  start: {
    domain: 'start',
    defaultIntent: () => 'load session context',
    options: { verbose: false }
  },
  handoff: {
    domain: 'handoff',
    defaultIntent: (message) => message || 'preserve session state',
    options: { save: true }
  },
  ship: {
    domain: 'ship',
    defaultIntent: (message) => message || 'prepare for deployment',
    options: { commit: true, push: false }
  },
  // ... all other commands
};

// Shortcut handler
export async function executeShortcut(
  command: string,
  args: string[],
  options: any
): Promise<void> {
  const shortcut = COMMAND_SHORTCUTS[command];
  if (!shortcut) {
    throw new Error(`Unknown command: ${command}`);
  }

  // Delegate to universal reflect command
  const intent = shortcut.defaultIntent(...args);
  const mergedOptions = { ...shortcut.options, ...options, domain: shortcut.domain };

  return reflectCommand(intent, mergedOptions);
}
```

#### 2. Simplified index.ts

```typescript
// Before: 15+ individual command registrations
program.command('capture [description]').action(captureCommand);
program.command('start [sessionId]').action(startCommand);
program.command('handoff [message]').action(handoffCommand);
// ... 12 more ...

// After: Unified shortcut registration
const shortcuts = ['capture', 'start', 'handoff', 'ship', 'explore', 'architecture', 'plan'];

shortcuts.forEach(cmd => {
  const shortcut = COMMAND_SHORTCUTS[cmd];
  program
    .command(`${cmd} ${shortcut.argPattern || ''}`)
    .description(shortcut.description)
    .action((...args) => executeShortcut(cmd, args.slice(0, -1), args[args.length - 1]));
});

// Universal pattern always available
program
  .command('reflect <intent>')
  .option('-d, --domain <domain>', 'Specify reflection domain')
  .action(reflectCommand);
```

#### 3. Reflector Migration Path

**Phase 1: Create Missing Reflectors**
Commands that need reflector implementations:
- ✅ `start` - has `StartReflectionCommand`
- ✅ `handoff` - has `HandoffReflectionCommand`
- ❌ `capture` - **NEEDS** `CaptureReflectionCommand`
- ✅ `architecture` - has `ArchitectureReflectionCommand`
- ❌ `explore` - **NEEDS** `ExploreReflectionCommand`
- ❌ `ship` - **NEEDS** `ShipReflectionCommand`
- ❌ `plan` - **NEEDS** `PlanReflectionCommand`
- ❌ `compact` - **NEEDS** `CompactReflectionCommand`
- ❌ `vibecheck` - **NEEDS** `VibecheckReflectionCommand`
- ❌ `init` - **SPECIAL CASE** (setup, not reflection)
- ❌ `doctor` - **SPECIAL CASE** (diagnostics, not reflection)
- ❌ `config` - **SPECIAL CASE** (configuration, not reflection)
- ❌ `status` - **SPECIAL CASE** (read-only query, not reflection)
- ❌ `context` - **SPECIAL CASE** (CRUD operations, not reflection)

**Phase 2: Shortcut Integration**
For each command with a reflector:
1. Keep existing `command-name.ts` file temporarily
2. Create `command-name-reflection.ts` following reflection pattern
3. Update shortcut registry to point to new reflector
4. Add deprecation warning to old implementation
5. Remove old file after validation

**Phase 3: Cleanup**
- Remove standalone command files
- Consolidate into pure reflection architecture
- Update documentation

## Benefits

### 1. Architectural Consistency
- **Single pattern**: Everything uses ReflectionPipeline
- **Predictable**: All commands follow same structure
- **Testable**: Unified testing approach

### 2. User Experience
```bash
# Both work identically:
ginko capture "important decision"
ginko reflect --domain capture "important decision"

# Power users can use full syntax:
ginko reflect --domain capture "decision" --noai --save

# Casual users get shortcuts:
ginko capture "decision"
```

### 3. Extensibility
```typescript
// Adding new domain becomes trivial
export class CustomReflectionCommand extends ReflectionPipeline {
  // Implement 5 methods, get full CLI integration automatically
}

// Register shortcut (optional)
COMMAND_SHORTCUTS.custom = {
  domain: 'custom',
  defaultIntent: (input) => input
};
```

### 4. Maintenance
- **One codebase**: Reflectors only
- **Shared improvements**: Quality system updates benefit all commands
- **Easier debugging**: Single execution path
- **Simpler testing**: Test reflectors, shortcuts are thin wrappers

### 5. Meta-Reflection Power
```bash
# Generate new reflector using existing reflector
ginko reflect --domain meta "create performance monitoring reflector"

# Output: Complete reflector implementation following established patterns
```

## Migration Strategy

### Week 1: Foundation
- [x] Universal Reflection Pattern exists (✅ done)
- [ ] Create `command-shortcuts.ts` registry system
- [ ] Create shortcut execution handler
- [ ] Write migration guide for reflector creation

### Week 2-3: Missing Reflectors
Priority order (by usage frequency):
1. `capture` - High usage, straightforward
2. `ship` - High value, moderate complexity
3. `explore` - Creative, good test case
4. `plan` - Structured, demonstrates templates
5. `compact` - Utility, simpler implementation
6. `vibecheck` - Unique, requires careful design

### Week 4: Integration
- [ ] Update `index.ts` to use shortcut system
- [ ] Add deprecation warnings to old implementations
- [ ] Run full test suite
- [ ] Update documentation

### Week 5: Validation
- [ ] User testing with both syntaxes
- [ ] Performance benchmarking
- [ ] Edge case testing
- [ ] Migration guide for custom commands

### Week 6: Cleanup
- [ ] Remove deprecated standalone implementations
- [ ] Archive `-orig.ts` files
- [ ] Update all documentation
- [ ] Publish v2.1.0 with unified architecture

## Special Cases

### Init, Doctor, Config, Status, Context

These commands perform **different functions** than reflection:
- **init**: Project setup (not reflection)
- **doctor**: Diagnostics and repair (read-only analysis)
- **config**: CRUD operations (not AI-enhanced)
- **status**: Query command (read-only)
- **context**: CRUD for context modules (management, not reflection)

**Recommendation**: Keep as standalone commands. They don't fit the reflection pattern.

## Breaking Changes

### None (Backwards Compatible)

Both syntaxes work identically:
```bash
# Old way (still works)
ginko capture "decision"

# New way (also works)
ginko reflect --domain capture "decision"

# Power user way (also works)
ginko reflect --domain capture "decision" --verbose --noai
```

## Risks & Mitigations

### Risk 1: User Confusion
**Mitigation**: Documentation clearly explains both work identically, shortcuts are convenience

### Risk 2: Performance Overhead
**Mitigation**: Shortcut layer adds <1ms overhead, negligible vs AI processing time

### Risk 3: Migration Bugs
**Mitigation**: Parallel implementation during migration, extensive testing before removing old code

### Risk 4: Incomplete Reflector Parity
**Mitigation**: Feature parity checklist for each migrated command, user acceptance testing

## Success Metrics

- ✅ All high-usage commands have reflector implementations
- ✅ Zero regressions in existing functionality
- ✅ Documentation updated to reflect unified architecture
- ✅ Performance within 5% of current implementation
- ✅ Test coverage >80% for new reflectors
- ✅ User satisfaction: >90% prefer unified architecture (survey)

## Next Steps

1. **Review this proposal** - Architecture team discussion
2. **Create ADR** - Formalize decision if approved
3. **Spike implementation** - Build `capture` reflector as proof of concept
4. **User feedback** - Test with early adopters
5. **Full migration** - Execute 6-week plan

---

**Author**: Architecture Team
**Reviewers**: [Pending]
**Status**: Awaiting approval
