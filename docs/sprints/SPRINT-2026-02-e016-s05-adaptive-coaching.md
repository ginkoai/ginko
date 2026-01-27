# SPRINT: EPIC-016 Sprint 5 - Adaptive Coaching (DRAFT)

## Sprint Overview

**Sprint Goal**: Coaching adapts to user's insight scores—more help when struggling, quieter when thriving
**Duration**: 1 week
**Type**: CLI + Dashboard integration
**Progress:** 0% (0/5 tasks complete)
**Prerequisite:** Sprint 4 complete (work pattern coaching working)

**Key Insight**: The Coaching Insights dashboard already tracks Session Efficiency, Pattern Adoption, Collaboration Quality, and Anti-Patterns. Use these scores to automatically tune coaching intensity.

**Success Criteria:**
- [ ] Coaching intensity auto-adjusts based on 7-day insight score
- [ ] Users can manually override with `ginko nudging` command
- [ ] Targeted coaching addresses specific weak areas
- [ ] Dashboard shows current nudging level
- [ ] Users report coaching feels "right-sized"

---

## Sprint Tasks

### e016_s05_t01: Insight Score Integration (3h)
**Priority:** HIGH

**Goal:** Connect CLI coaching to dashboard insight scores

**Score Thresholds:**
| Overall Score (7-day) | Coaching Level | Behavior |
|-----------------------|----------------|----------|
| ≥75 | Minimal | Brief prompts, assume competence |
| 60-74 | Standard | Normal prompts with guidance |
| <60 | Supportive | Detailed prompts, more examples |

**Implementation:**
- Fetch insight scores from dashboard API at session start
- Cache locally with 4-hour TTL
- Fall back to local adoption score if offline

**Files:**
- New: `packages/cli/src/lib/coaching-level.ts`
- Modify: `packages/cli/src/commands/start.ts`

**Acceptance Criteria:**
- CLI reads insight scores from dashboard
- Coaching level adjusts automatically
- Graceful offline fallback

---

### e016_s05_t02: ginko nudging Command (2h)
**Priority:** HIGH

**Goal:** Manual override for coaching intensity

**Usage:**
```bash
# View current level
ginko nudging
> Current coaching level: Standard (score: 68)
> Auto-adjusting based on 7-day insights

# Set manual override
ginko nudging minimal
> Coaching set to: Minimal
> Override active until: ginko nudging auto

# Return to auto
ginko nudging auto
> Coaching returned to auto-adjustment
> Current level: Standard (score: 68)
```

**Levels:**
- `minimal` - Expert mode, nearly silent
- `standard` - Balanced guidance
- `supportive` - Extra help and examples
- `auto` - Follow insight scores (default)

**Files:**
- New: `packages/cli/src/commands/nudging.ts`
- Modify: `.ginko/config.json` (store override)

**Acceptance Criteria:**
- View current level works
- Manual override persists
- Auto returns to score-based

---

### e016_s05_t03: Targeted Coaching Elaborations (4h)
**Priority:** MEDIUM

**Goal:** When a specific metric is low, provide focused coaching in that area

**Metric-Specific Coaching:**

| Low Metric | Coaching Focus |
|------------|----------------|
| Session Efficiency (<70) | "Consider using `ginko handoff` to preserve context" |
| Pattern Adoption (<70) | Extra guidance on Epic→Sprint→Task structure |
| Collaboration Quality (<70) | Prompts about logging decisions, handoff quality |
| Anti-Patterns (>2 warnings) | Specific warnings about detected anti-patterns |

**Implementation:**
- Fetch per-metric scores from dashboard
- Inject targeted tips at relevant moments
- Track which tips shown to avoid repetition

**Files:**
- New: `packages/cli/src/lib/targeted-coaching.ts`
- Modify: `packages/cli/src/commands/start.ts` (inject tips)
- Modify: `packages/cli/src/commands/handoff.ts` (inject tips)

**Acceptance Criteria:**
- Low metrics trigger relevant coaching
- Tips are contextual (appear at right moments)
- No tip spam (shown once per session max)

---

### e016_s05_t04: Dashboard Nudging Display (2h)
**Priority:** MEDIUM

**Goal:** Show current coaching level in dashboard

**Dashboard Addition:**
```
Coaching Settings
─────────────────
Current Level: Standard (auto)
Based on: 7-day score of 68
Override: None

[Adjust in CLI: ginko nudging <level>]
```

**Implementation:**
- Add coaching section to Insights page
- Show current level and basis
- Indicate if manual override active

**Files:**
- Modify: Dashboard insights page component
- API: Endpoint to fetch/store nudging preference

**Acceptance Criteria:**
- Dashboard shows coaching level
- Override status visible
- Links to CLI command

---

### e016_s05_t05: Coaching Feedback Loop (2h)
**Priority:** LOW

**Goal:** Track coaching effectiveness for future improvement

**Metrics to Track:**
- Planning menu selections over time
- Time from "no structure" to "structured work"
- User override patterns (do they always go minimal?)
- Correlation between coaching level and pattern adoption

**Implementation:**
- Log coaching interactions to events
- Dashboard can analyze patterns
- Inform future coaching improvements

**Files:**
- Modify: Event logging to include coaching context
- Dashboard: Future analytics (out of scope for this sprint)

**Acceptance Criteria:**
- Coaching interactions logged
- Data available for future analysis
- No user-facing changes (infrastructure only)

---

## Technical Notes

### Score Fetching

```typescript
// packages/cli/src/lib/coaching-level.ts
interface CoachingContext {
  overallScore: number;
  metrics: {
    sessionEfficiency: number;
    patternAdoption: number;
    collaborationQuality: number;
    antiPatterns: number;
  };
  level: 'minimal' | 'standard' | 'supportive';
  override: 'minimal' | 'standard' | 'supportive' | null;
}
```

### Caching Strategy

- Fetch scores at `ginko start`
- Cache in `.ginko/cache/insights.json`
- TTL: 4 hours (re-fetch if stale)
- Offline: Use cached or fall back to adoption_score from S04

### Prompt Variants

Each prompt has three variants:
```typescript
const prompts = {
  noStructure: {
    minimal: "No active sprint. [a] Epic [b] Sprint [c] Quick [d] Ad-hoc",
    standard: "You have no planned work. What would you like to work on?\n[a] New Epic...",
    supportive: "I notice you're not currently in a sprint. Sprints help track progress...\n[a] New Epic (for large initiatives)..."
  }
};
```

---

## Dependencies

- Sprint 4 complete (planning menu, quick-fix path)
- Dashboard API exposes insight scores
- ginko insights command working

---

## Future Considerations (Not in Scope)

1. **Team-level coaching** - Adjust coaching for entire team based on aggregate scores
2. **Coaching A/B testing** - Test different prompt styles
3. **AI-generated coaching** - Dynamic tips based on specific session context
4. **Onboarding mode** - Intensive coaching for first 2 weeks, then graduate

---

## Completion Criteria

Sprint 5 is complete when:
1. Coaching level auto-adjusts based on insight scores
2. `ginko nudging` command works for manual override
3. Targeted coaching appears for low metrics
4. Dashboard displays coaching status
5. Coaching interactions are logged for analysis
