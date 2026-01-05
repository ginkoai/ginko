# Implementation Plan: Onboarding Flow Optimization (e008_s03_t03)

**Goal:** Streamline new member onboarding to ≤10 minutes
**Branch:** `feature/e008_s03_t03-onboarding-optimization`
**Estimate:** 6h

## Current State Analysis

### Measured Timings (Current)
| Step | Current | Target | Gap |
|------|---------|--------|-----|
| 1. Receive invite | 0 min | 0 min | ✅ |
| 2. Click link, authenticate | 1-2 min | 1 min | ~1 min |
| 3. `ginko join <code>` | 4-8s | 1 min | ✅ |
| 4. Initial sync | 8-25s | 2 min | ✅ (but manual) |
| 5. `ginko start` - first load | 3-5s | 1 min | ✅ |
| 6. Review team context | 5+ min | 5 min | Needs UX |
| **Total** | **~12-15 min** | **≤10 min** | **~2-5 min** |

### Key Bottlenecks Identified

1. **Join → Sync Gap**: User must manually run `ginko sync` after join
2. **Sync Sequential Operations**:
   - `markNodeSynced()` one-at-a-time (100-500ms saved with batching)
   - Team status checks sequential (50-200ms saved)
   - Sprint API fetches sequential (50-300ms saved)
3. **Start Command**: Runs synthesis on empty log for first-time members (wasted 500ms-1s)
4. **No Progress Visibility**: User doesn't know what's happening during long operations

## Implementation Plan

### Phase 1: Join Command Enhancements (1.5h)

**File:** `packages/cli/src/commands/join/index.ts`

#### 1.1 Auto-Sync After Join
After successful join, automatically trigger sync instead of just suggesting it:

```typescript
// After acceptInvitation() succeeds (line ~95)
console.log(chalk.cyan('\n🔄 Syncing team context...'));
await runSync({ skipTeamCheck: true }); // New: auto-sync
console.log(chalk.green('✓ Team context loaded'));
```

#### 1.2 Progress Indicators During Join
Add ora spinners for each step:
- "Validating invitation..."
- "Joining team..."
- "Syncing team context..."
- "✓ Ready to start!"

#### 1.3 Pre-Flight Check (Optional)
While showing confirmation prompt, pre-fetch graph config in background:
```typescript
// Start pre-flight while waiting for user confirmation
const preFlight = getGraphConfig().catch(() => null); // Non-blocking
// ... user confirms ...
const graphConfig = await preFlight; // Already resolved
```

### Phase 2: Sync Command Parallelization (2h)

**File:** `packages/cli/src/commands/sync/sync-command.ts`

#### 2.1 Parallel Team Status Checks (HIGH PRIORITY)
**Location:** Lines 345-372

```typescript
// BEFORE (sequential):
const teamStatus = await getTeamSyncStatus(graphId, token);
const teamChangeSummary = await getTeamChangesSinceLast(graphId, token, lastSyncAt);

// AFTER (parallel):
const [teamStatus, teamChangeSummary] = await Promise.all([
  getTeamSyncStatus(graphId, token),
  getTeamChangesSinceLast(graphId, token, teamStatus?.membership?.last_sync_at),
]);
```

#### 2.2 Batch markNodeSynced Calls (HIGH PRIORITY)
**Location:** Lines 545-549

```typescript
// BEFORE: One API call per node
for (const node of nodes) {
  await syncNode(node);
  await markNodeSynced(node.id, hash, graphId, token); // Blocking
}

// AFTER: Batch at end
const syncedNodes: Array<{id: string, hash: string}> = [];
for (const node of nodes) {
  const result = await syncNode(node);
  syncedNodes.push({ id: node.id, hash: result.hash });
}
// Single batch call or parallel calls
await Promise.all(syncedNodes.map(n =>
  markNodeSynced(n.id, n.hash, graphId, token)
));
```

#### 2.3 Parallel Sprint API Fetches (MEDIUM PRIORITY)
**Location:** Lines 279-295

```typescript
// BEFORE: Sequential per sprint file
for (const sprintFile of sprintFiles) {
  const updates = await fetchTaskStatuses(sprintFile);
  // ...
}

// AFTER: Parallel fetch, sequential write
const allUpdates = await Promise.all(
  sprintFiles.map(sf => fetchTaskStatuses(sf).then(u => ({ file: sf, updates: u })))
);
for (const { file, updates } of allUpdates) {
  await updateSprintMarkdown(file, updates);
}
```

### Phase 3: Start Command First-Time Optimization (1h)

**File:** `packages/cli/src/commands/start/start-reflection.ts`

#### 3.1 Skip Synthesis for First-Time Members
Detect empty session log and skip AI synthesis:

```typescript
// Line ~223
const sessionLog = await SessionLogManager.loadSessionLog(sessionDir);
const isFirstTime = !sessionLog || sessionLog.entries.length === 0;

if (isFirstTime) {
  // Skip synthesis, use team context as primary
  context.synthesis = null;
  context.isFirstTimeMember = true;
} else {
  context.synthesis = await SessionSynthesizer.synthesize(sessionLog);
}
```

#### 3.2 Enhanced Welcome for First-Time Members
Customize the "Ready" output for new members:

```typescript
if (context.isFirstTimeMember) {
  console.log(chalk.cyan('👋 Welcome to the team!'));
  console.log(`   Team context loaded: ${strategicContext.patternCount} patterns, ${strategicContext.adrCount} ADRs`);
  console.log(`   Sprint: ${sprint.name} (${sprint.progress}% complete)`);
  console.log(chalk.dim('\n   Tip: Run `ginko start --team` to see recent team activity'));
}
```

### Phase 4: Progress Indicators & UX (1.5h)

#### 4.1 Create Onboarding Progress Module
**New file:** `packages/cli/src/lib/onboarding-progress.ts`

```typescript
export class OnboardingProgress {
  private steps = [
    { id: 'auth', label: 'Authenticating', weight: 1 },
    { id: 'join', label: 'Joining team', weight: 1 },
    { id: 'sync', label: 'Syncing context', weight: 3 },
    { id: 'load', label: 'Loading environment', weight: 2 },
  ];

  async trackStep(stepId: string, fn: () => Promise<void>) {
    const spinner = ora(this.getLabel(stepId)).start();
    try {
      await fn();
      spinner.succeed();
    } catch (err) {
      spinner.fail();
      throw err;
    }
  }
}
```

#### 4.2 Integrate Progress into Join Flow
Wire up progress tracking in join command.

#### 4.3 Add Time Estimates
Show estimated remaining time during long operations:
```
🔄 Syncing team context... (est. 15s remaining)
```

## Testing Strategy

### Unit Tests
- [ ] Join auto-sync triggers correctly
- [ ] Parallel sync operations maintain correctness
- [ ] First-time member detection works
- [ ] Progress indicators display properly

### Integration Tests
- [ ] New file: `packages/cli/test/e2e/onboarding-flow.test.ts`
- [ ] Full join → sync → start flow completes in <3 minutes
- [ ] Error handling: network failures gracefully handled

### Manual Testing
1. Create test team invitation
2. Run full onboarding as new member
3. Measure total time
4. Verify context is complete

## Success Criteria

- [ ] Total onboarding time ≤10 minutes (from invite to productive)
- [ ] Join → Sync automated (no manual step required)
- [ ] Sync operations parallelized (40-60% faster)
- [ ] Clear progress indicators throughout
- [ ] First-time member welcome experience improved

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parallel sync race conditions | Medium | High | Add integration tests, review carefully |
| Auto-sync failures block join | Low | High | Catch errors, allow manual retry |
| Progress estimates inaccurate | Medium | Low | Use conservative estimates |

## Files to Modify

1. `packages/cli/src/commands/join/index.ts` - Auto-sync, progress
2. `packages/cli/src/commands/sync/sync-command.ts` - Parallelization
3. `packages/cli/src/commands/sync/node-syncer.ts` - Batch marking
4. `packages/cli/src/commands/start/start-reflection.ts` - First-time detection
5. `packages/cli/src/lib/onboarding-progress.ts` - NEW: Progress tracking

## Implementation Order

1. **Phase 2.1-2.2**: Sync parallelization (biggest impact, lowest risk)
2. **Phase 1.1**: Auto-sync after join (user experience)
3. **Phase 3.1**: Skip synthesis for first-time (performance)
4. **Phase 4**: Progress indicators (polish)
5. **Phase 1.3, 2.3, 3.2**: Nice-to-haves if time permits
