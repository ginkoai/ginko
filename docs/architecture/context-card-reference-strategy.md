# Context Card Reference Strategy

## Overview

Context cards need to be surfaced at the right time to maximize their value. This document outlines when and how context cards should be referenced throughout the Ginko workflow.

## Reference Points in the Workflow

### 1. During `ginko start` (Primary Loading Point)

**When**: Session initialization  
**What**: Load relevant context cards based on:
- Current branch name
- Recent file activity
- Previous session's work
- Error patterns from last session

**Implementation**:
```typescript
// Relevance scoring for context cards at start
interface StartContextRelevance {
  branchRelevance: number;     // Branch name matches card tags
  fileRelevance: number;        // Working on files mentioned in card
  recencyRelevance: number;     // Card created recently
  historyRelevance: number;     // Card was useful in past sessions
}
```

**Display Strategy**:
```
🌿 Starting session on branch: feature/auth-system
📚 Loaded 5 relevant context modules:
  • gotcha-react-hooks-must-follow (95% relevant - working in components/)
  • pattern-auth-token-refresh (90% relevant - branch matches)
  • decision-use-tanstack-query (75% relevant - used last session)
  • workaround-vercel-env-variables (70% relevant - deployment context)
  • optimization-database-pooling (65% relevant - recent creation)

💡 Quick tip from gotcha-react-hooks-must-follow:
   "useState must be called at component top level, not conditionally"
```

### 2. During `ginko handoff` (Reference in Summary)

**When**: Session completion  
**What**: Reference cards that were:
- Created during this session
- Consulted during this session
- Related to problems solved

**Implementation**:
```markdown
## 📚 Context Modules Referenced
- **Used**: `pattern-error-boundary.md` - Applied to 3 components
- **Created**: `gotcha-vercel-serverless.md` - New discovery this session
- **Related**: `decision-use-tanstack-query.md` - Influenced API design

## 💡 Captured Insights (3)
1. **gotcha**: Vercel serverless functions need explicit exports
   - Module: `.ginko/context/modules/gotcha-vercel-serverless.md`
   - Saves: 90 minutes
```

### 3. During Development (Proactive Suggestions)

**When**: Real-time during coding  
**What**: Surface relevant cards based on:
- Current file being edited
- Error messages encountered
- Git diff patterns
- Test failures

**Trigger Examples**:
```typescript
// When error detected
if (error.message.includes('Rendered more hooks')) {
  surfaceCard('gotcha-react-hooks-must-follow.md');
}

// When editing specific files
if (currentFile.includes('api/route.ts')) {
  surfaceCard('pattern-serverless-api-structure.md');
}

// When tests fail
if (testFailure.includes('connection pool')) {
  surfaceCard('gotcha-database-connections.md');
}
```

### 4. During `ginko vibecheck` (Quick Context Refresh)

**When**: Mid-session recalibration  
**What**: Show most relevant cards for current situation

```
$ ginko vibecheck

🎯 Current Context Check:
- Working on: API error handling
- Last commit: "Fix auth middleware"
- Uncommitted changes: 5 files

📚 Relevant context for your situation:
  1. pattern-error-boundary.md - Error handling patterns
  2. gotcha-middleware-order.md - Common middleware issues
  3. decision-centralized-error-handling.md - Architecture decision

💡 Based on your current work, consider:
  "Middleware order matters in Express - auth before error handlers"
```

## Reference Priority Algorithm

```typescript
interface ContextCardRelevance {
  // Static scores (computed once)
  typeScore: number;        // Card type matches work mode
  tagScore: number;         // Tag overlap with current context
  ageScore: number;         // Newer cards slightly preferred
  
  // Dynamic scores (computed per session)
  branchScore: number;      // Branch name correlation
  fileScore: number;        // File path correlation
  errorScore: number;       // Error pattern matching
  historyScore: number;     // Previously useful in similar context
  
  // Contextual boosts
  recentlyUsed: boolean;    // Used in last 3 sessions (+0.2)
  teamShared: boolean;      // Marked as team-critical (+0.3)
  preventsCritical: boolean; // Prevents critical errors (+0.4)
}

function calculateRelevance(card: ContextCard, context: SessionContext): number {
  const scores = computeRelevanceScores(card, context);
  
  // Weighted combination
  let relevance = (
    scores.typeScore * 0.15 +
    scores.tagScore * 0.20 +
    scores.branchScore * 0.15 +
    scores.fileScore * 0.25 +
    scores.errorScore * 0.20 +
    scores.historyScore * 0.05
  );
  
  // Apply boosts
  if (scores.recentlyUsed) relevance += 0.2;
  if (scores.teamShared) relevance += 0.3;
  if (scores.preventsCritical) relevance += 0.4;
  
  return Math.min(1.0, relevance);
}
```

## Display Strategies

### Minimal Mode (Default)
- Show 3-5 most relevant cards at `ginko start`
- Single line summaries only
- No automatic surfacing during work

### Standard Mode
- Show 5-8 relevant cards at `ginko start`
- Include brief tips from top cards
- Surface cards on errors

### Verbose Mode
- Show all relevant cards (>70% relevance)
- Include full problem/solution for top 3
- Proactive suggestions during development
- Track which cards were helpful

## Integration Points

### 1. VS Code Extension
```typescript
// Show relevant cards in sidebar
vscode.commands.registerCommand('ginko.showRelevantCards', () => {
  const cards = getRelevantCards(currentFile, gitBranch);
  showInSidebar(cards);
});
```

### 2. CLI Hooks
```bash
# Pre-commit hook shows relevant cards
ginko check-context --files-changed

# Pre-push hook ensures cards are committed
ginko verify-cards --branch $BRANCH
```

### 3. Team Sharing
```yaml
# .ginko/team-cards.yaml
critical:
  - gotcha-database-connections.md    # Everyone hits this
  - pattern-error-boundary.md          # Team standard
  
recommended:
  - optimization-query-caching.md      # Big performance win
  - decision-use-tanstack-query.md     # Architecture decision
```

## Measurement & Optimization

### Track Card Usefulness
```typescript
interface CardMetrics {
  cardId: string;
  timesLoaded: number;
  timesViewed: number;
  timesApplied: number;
  problemsPrevented: number;
  timeSaved: number;
  lastUseful: Date;
}
```

### Feedback Loop
- Track which cards are actually viewed vs just loaded
- Monitor which cards prevent errors
- Measure time saved when cards are applied
- Adjust relevance algorithm based on outcomes

## Anti-Patterns to Avoid

### ❌ Don't Overwhelm
- Never show more than 8 cards at once
- Don't interrupt flow with popups
- Don't repeat same card in single session

### ❌ Don't Be Noisy
- Avoid showing cards for trivial issues
- Don't surface cards that were just created
- Skip cards marked as "seen" for current context

### ❌ Don't Break Flow
- Never force user to acknowledge cards
- Don't block commands waiting for card review
- Keep loading fast (<100ms)

## Configuration

```json
{
  "contextCards": {
    "loadOnStart": true,
    "maxCardsToShow": 5,
    "minRelevanceScore": 0.7,
    "showTips": true,
    "proactiveSuggestions": false,
    "trackUsage": true,
    "displayMode": "standard"
  }
}
```

## Summary

The optimal strategy is:

1. **Primary Loading**: During `ginko start` - Show 5 most relevant cards with one-line tips
2. **Reference in Handoff**: List cards created/used during session
3. **Error-Triggered**: Surface specific cards when matching errors occur
4. **Vibecheck Refresh**: Quick relevance check during session
5. **Team Critical**: Always load cards marked as team-critical

This approach ensures cards are:
- **Timely**: Shown when most relevant
- **Contextual**: Based on actual work being done
- **Non-intrusive**: Don't interrupt flow
- **Valuable**: Solve real problems
- **Discoverable**: Easy to find when needed