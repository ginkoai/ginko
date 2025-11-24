# Sprint Plan: Implement Handoff and Start as Reflection Domains

**Date**: 2025-01-13
**Author**: Chris Norton
**Status**: In Progress

## Overview
Transform `handoff` and `start` commands into reflection domains while preserving legacy functionality. This completes the vision of ADR-003 and creates a fully reflexive system where context flows seamlessly through the reflection pattern.

## Problem Statement
Current handoff implementation has critical gaps:
- Doesn't reference active PRDs/ADRs/Tasks in workstream
- Doesn't instruct next session to load critical context modules
- Generic AI instructions that don't enable rapid flow state
- Results in rapport degradation and delays to productive work

## Solution
Implement handoff and start as reflection domains following the DSL pattern, creating a complete cycle:
- `ginko reflect --domain handoff` - Writes structured context
- `ginko reflect --domain start` - Reads structured context
- Maintains aliases `ginko handoff` and `ginko start` for compatibility

## Implementation Tasks

### 1. Update Documentation

#### PRD-001 Updates
Add to Must Have (P0) section:
- **Handoff Domain**: Session state preservation with workstream context
- **Start Domain**: Intelligent session initialization from handoff

Update domain list to include:
```markdown
### Core System Domains (P0-Critical)
1. **Start Domain** - Intelligent session initialization
   - Reads previous handoff
   - Loads relevant context modules
   - Sets appropriate work mode
   - Suggests immediate next actions

2. **Handoff Domain** - Session state preservation
   - Captures workstream context (PRDs/ADRs/Tasks)
   - Identifies critical modules for next session
   - Preserves architectural decisions
   - Enables instant flow state resumption
```

#### ADR-003 Updates
Refine the proposed domains section to emphasize the complete cycle:
- Start domain reads handoff through reflection
- Handoff domain writes context through reflection
- Creates perfect symmetry and self-improving loop

### 2. Preserve Legacy Commands

#### Rename Existing Files
```bash
# Handoff commands
packages/cli/src/commands/handoff.ts → handoff-orig.ts
packages/cli/src/commands/handoff-enhanced.ts → handoff-enhanced-orig.ts
packages/cli/src/commands/handoff-ai.ts → handoff-ai-orig.ts

# Start commands
packages/cli/src/commands/start.ts → start-orig.ts
packages/cli/src/commands/start-enhanced.ts → start-enhanced-orig.ts
```

### 3. Create Reflection Domain Implementations

#### Handoff Reflection Domain
Create `packages/cli/src/commands/handoff/handoff-reflection.ts`:
```typescript
export class HandoffReflectionCommand extends ReflectionCommand {
  async loadTemplate() {
    return {
      requiredSections: [
        'session_summary',
        'active_workstream', // NEW: PRDs, ADRs, Tasks
        'critical_context_modules', // NEW: Essential modules
        'architectural_decisions',
        'in_progress_work',
        'next_session_instructions', // NEW: Specific commands
        'mental_model'
      ],
      contextToConsider: [
        'git_changes',
        'active_prds_adrs', // NEW
        'critical_modules', // NEW
        'test_results',
        'session_duration',
        'workstream_focus' // NEW
      ],
      rulesAndConstraints: [
        'Reference ALL active PRDs/ADRs by number',
        'List ESSENTIAL context modules explicitly',
        'Provide SPECIFIC next actions with commands',
        'Preserve architectural rationale',
        'Enable <30 second flow state achievement'
      ]
    };
  }

  async gatherContext(intent) {
    const workstream = await this.detectWorkstream();
    const criticalModules = await this.identifyCriticalModules();

    return {
      gitStatus: await git.status(),
      activePRDs: workstream.prds,
      activeADRs: workstream.adrs,
      activeTasks: workstream.tasks,
      criticalModules: criticalModules,
      recentCommits: await git.log({ maxCount: 10 }),
      previousHandoff: await this.getPreviousHandoff()
    };
  }
}
```

#### Start Reflection Domain
Create `packages/cli/src/commands/start/start-reflection.ts`:
```typescript
export class StartReflectionCommand extends ReflectionCommand {
  async loadTemplate() {
    return {
      requiredSections: [
        'session_configuration',
        'loaded_context_modules',
        'work_mode_setting',
        'immediate_actions',
        'warnings_and_blockers'
      ],
      contextToConsider: [
        'previous_handoff',
        'time_since_last_session',
        'uncommitted_changes',
        'branch_state',
        'test_status'
      ],
      rulesAndConstraints: [
        'Load ONLY relevant modules based on handoff',
        'Set appropriate work mode for current state',
        'Provide immediate actionable first step',
        'Surface blockers immediately',
        'Achieve flow state in <30 seconds'
      ]
    };
  }

  async gatherContext(intent) {
    const handoff = await this.readHandoff();
    const workstream = await this.parseWorkstreamFromHandoff(handoff);

    return {
      lastHandoff: handoff,
      workstream: workstream,
      uncommittedWork: await git.status(),
      timeSinceLastSession: this.calculateTimeSince(),
      branchState: await git.branch(),
      testStatus: await this.getTestStatus()
    };
  }

  async execute(intent, options) {
    const result = await super.execute(intent, options);

    // Actually load the recommended modules
    for (const module of result.modulesToLoad) {
      await this.loadContextModule(module);
    }

    // Set the work mode
    await this.setWorkMode(result.workMode);

    // Display immediate actions
    this.displayFlowStateInstructions(result.instructions);
  }
}
```

### 4. Create Domain Routers

#### Handoff Index
Create `packages/cli/src/commands/handoff/index.ts`:
```typescript
import { HandoffReflectionCommand } from './handoff-reflection.js';

export async function handoffCommand(options) {
  if (options.legacy) {
    // Use original implementation
    const { handoffOrigCommand } = await import('../handoff-orig.js');
    return handoffOrigCommand(options);
  }

  // Use reflection domain
  const reflection = new HandoffReflectionCommand();
  const intent = options.message || 'Create session handoff';
  return reflection.execute(intent, options);
}
```

#### Start Index
Create `packages/cli/src/commands/start/index.ts`:
```typescript
import { StartReflectionCommand } from './start-reflection.js';

export async function startCommand(options) {
  if (options.legacy) {
    // Use original implementation
    const { startOrigCommand } = await import('../start-orig.js');
    return startOrigCommand(options);
  }

  // Use reflection domain
  const reflection = new StartReflectionCommand();
  const intent = 'Initialize development session';
  return reflection.execute(intent, options);
}
```

### 5. Update CLI Integration

#### Update reflect.ts Router
Add cases for handoff and start domains:
```typescript
// In packages/cli/src/commands/reflect.ts
case 'handoff':
  const { HandoffReflectionCommand } = await import('./handoff/handoff-reflection.js');
  return new HandoffReflectionCommand();

case 'start':
  const { StartReflectionCommand } = await import('./start/start-reflection.js');
  return new StartReflectionCommand();
```

#### Update ReflectionDomain Type
In `packages/cli/src/core/reflection-pattern.ts`:
```typescript
export type ReflectionDomain =
  | 'start'      // NEW
  | 'handoff'    // NEW
  | 'prd'
  | 'backlog'
  // ... rest
```

### 6. Update Main CLI
In `packages/cli/src/index.ts`:
```typescript
// Register commands with reflection routing
program
  .command('handoff')
  .description('Create session handoff (uses reflection)')
  .option('--legacy', 'Use original implementation')
  .option('-m, --message <msg>', 'Handoff message')
  .action(async (options) => {
    const { handoffCommand } = await import('./commands/handoff/index.js');
    await handoffCommand(options);
  });

program
  .command('start')
  .description('Start session (uses reflection)')
  .option('--legacy', 'Use original implementation')
  .action(async (options) => {
    const { startCommand } = await import('./commands/start/index.js');
    await startCommand(options);
  });
```

### 7. Testing Strategy

1. **Test complete cycle**:
   ```bash
   ginko handoff  # Creates reflection-based handoff
   ginko start    # Reads handoff through reflection
   ```

2. **Verify legacy compatibility**:
   ```bash
   ginko handoff --legacy  # Uses original
   ginko start --legacy    # Uses original
   ```

3. **Test reflection domains directly**:
   ```bash
   ginko reflect --domain handoff "completing PRD work"
   ginko reflect --domain start
   ```

## Expected Outcomes

1. **Seamless context flow**: Handoff → Start creates perfect continuity
2. **Intelligent module loading**: No more irrelevant "gotcha" modules
3. **Instant flow state**: <30 seconds to productive work
4. **Self-improving**: System learns from usage patterns
5. **Architectural purity**: Everything uses reflection pattern

## Key Design Decisions

### Why Reflection Domains?
- **DSL Consistency**: Maintains "one command, multiple domains" principle
- **Pattern Purity**: Everything flows through the reflection pattern
- **Symmetry**: Handoff writes, Start reads - perfect cycle
- **Learning System**: AI improves at context preservation over time

### Why Preserve Legacy?
- **Backward Compatibility**: No breaking changes for users
- **Gradual Migration**: Teams can adopt at their own pace
- **Fallback Option**: Safety net if reflection has issues

## Success Metrics
- Time to flow state: <30 seconds (from >5 minutes currently)
- Context preservation: 100% of PRDs/ADRs referenced
- Module relevance: >90% accuracy (from ~30% currently)
- User satisfaction: Eliminate "rapport degradation" complaints

## Implementation Order
1. ✅ Save this plan
2. Update PRD-001 with new domains
3. Update ADR-003 with refined approach
4. Rename existing commands to -orig
5. Create handoff reflection domain
6. Create start reflection domain
7. Update CLI routing
8. Test complete cycle
9. Document in CLAUDE.md

---
*This plan addresses the critical gaps in context preservation that lead to flow state delays and rapport degradation in AI-Human collaboration.*