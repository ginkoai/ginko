/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-12-15
 * @tags: [dashboard, insights, coaching, metrics, beta, ai-driven]
 * @related: [docs/guides/DASHBOARD-SETUP.md, docs/adr/ADR-033-context-pressure-mitigation-strategy.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: [ginko-cli, dashboard-app]
 */

# Coaching Insights Guide

**AI-driven coaching insights that help you improve collaboration with Ginko.**

The Insights page analyzes your development sessions, task completion patterns, and collaboration habits to provide actionable recommendations. Think of it as a personal coach that helps you work better with AI assistants.

**Read time:** ~4 minutes

---

## What Are Insights?

Insights are AI-generated observations about your development patterns. They identify:

- **Strengths:** What you're doing well
- **Opportunities:** Where you can improve
- **Anti-patterns:** Habits that slow you down
- **Recommendations:** Specific actions to try

Unlike traditional metrics dashboards, Insights focus on **collaboration quality** between you and AI assistants, not just code output.

---

## Overall Score

Your Insights score is a 0-100 metric that reflects collaboration health across four categories.

### Score Visualization

```
┌─────────────────────────────────────┐
│  Overall Score: 78                  │
│  ████████████████░░░░  ↑ +5         │
│  Analysis Period: Last 7 days       │
└─────────────────────────────────────┘
```

**Color gradient:**
- 🔴 Red (0-40): Critical issues present
- 🟠 Orange (41-60): Needs improvement
- 🟡 Yellow (61-75): Good, but room to grow
- 🔵 Cyan (76-85): Very good
- 🟢 Green (86-100): Excellent collaboration

**Trend indicator:**
- ↑ Green: Improving vs previous period
- ↓ Red: Declining vs previous period
- → Gray: Stable (±2 points)

**Analysis period:**
- Defaults to last 7 days
- Configurable in settings (1 day, 7 days, 30 days)

---

## Four Categories (Pillars)

Insights are organized into four core categories. Each contributes to your overall score.

### 1. Efficiency (25% of score)

Measures how quickly you get into productive flow:

**Metrics:**
- **Time-to-flow:** How long until first meaningful work
- **Context load time:** Speed of session startup
- **Session startup:** Overall initialization performance

**Example insights:**
- ✅ "Average time-to-flow: 2.3 minutes (excellent)"
- ⚠️ "Context loading taking 12s (expected <5s)"
- 💡 "Consider using `ginko start` with --no-graph for faster startup"

### 2. Patterns (25% of score)

Tracks adoption of project best practices:

**Metrics:**
- **ADR adoption rate:** % of decisions documented
- **Pattern usage:** How often you reference established patterns
- **Best practice adherence:** Following documented guidelines

**Example insights:**
- ✅ "ADR references found in 89% of commits"
- ⚠️ "Low pattern adoption: only 3 patterns used this week"
- 💡 "Try using `head -12` for AI-optimized file discovery (ADR-002)"

### 3. Quality (25% of score)

Evaluates output and collaboration effectiveness:

**Metrics:**
- **Task completion rate:** % of started tasks finished
- **Commit frequency:** Steady progress vs big-bang commits
- **Code quality:** Test coverage, linting, build success

**Example insights:**
- ✅ "Task completion rate: 92% (8 of 9 tasks completed)"
- ⚠️ "Only 2 commits in 5 days (low frequency)"
- 💡 "Commit more frequently for better progress tracking"

### 4. Anti-patterns (25% of score)

Detects collaboration habits that create friction:

**Metrics:**
- **Stuck tasks:** Tasks open >7 days without progress
- **Sessions without handoff:** Missing context for next session
- **Scope creep:** Work outside current sprint/task

**Example insights:**
- 🚨 "3 tasks stuck >7 days (TASK-5, TASK-8, TASK-12)"
- ⚠️ "4 sessions ended without `ginko handoff`"
- 💡 "Use `ginko log` to capture context during sessions"

---

## Reading Insights

Each insight includes several components to help you understand and act on it.

### Severity Levels

Insights are color-coded by severity:

| Severity | Color | Meaning | Example |
|----------|-------|---------|---------|
| Critical | 🔴 Red | Immediate action needed | Tasks stuck >14 days |
| Warning | 🟡 Yellow | Should address soon | Session startup >10s |
| Suggestion | 🔵 Blue | Nice-to-have improvement | Try new pattern |
| Info | ⚪ Gray | FYI, no action required | Usage stats |

### Score Impact

Each insight shows how it affects your overall score:

```
⚠️ Context loading taking 12s (expected <5s)
   Score impact: -8 points
   Category: Efficiency
```

Higher impact insights matter more for your score.

### Evidence

Insights reference specific sessions, tasks, or commits:

```
🚨 3 tasks stuck >7 days
   Evidence:
   - TASK-5: Open since 2025-12-01 (14 days)
   - TASK-8: Open since 2025-12-03 (12 days)
   - TASK-12: Open since 2025-12-05 (10 days)
```

Click evidence links to jump to relevant entities.

### Recommendations

Actionable suggestions for improvement:

```
💡 Recommendation: Archive or close stale tasks
   1. Review each stuck task
   2. Either make progress or close as "won't do"
   3. Use `ginko log` to document decision
```

Follow recommendations to improve your score.

---

## Generating Insights

Insights are generated by the Ginko CLI and loaded into the Dashboard.

### Run Analysis

```bash
# Generate insights for last 7 days
ginko insights --json

# Custom time period
ginko insights --json --days=30

# Verbose output
ginko insights --json --verbose
```

Output is saved to `.ginko/insights/latest.json`.

### Dashboard Loading

The Dashboard automatically loads from `latest.json`:

1. Navigate to **Insights** page
2. Dashboard reads `.ginko/insights/latest.json`
3. Displays score, categories, and recommendations
4. Updates every time you generate new insights

### Caching

Insights are cached for 24 hours:

- **First run:** Full analysis (may take 10-30s)
- **Within 24h:** Instant load from cache
- **After 24h:** Re-analysis recommended

**Tip:** Run `ginko insights` daily to track progress.

---

## Demo Mode

Explore Insights without real data using Demo Mode.

### Toggle Demo Mode

Click **"Enable Demo Mode"** in the top-right corner of the Insights page.

**Demo Mode shows:**
- Realistic sample score (72/100)
- Mix of positive and negative insights
- Example evidence (synthetic sessions/tasks)
- Typical recommendations

**Use cases:**
- Learning what insights look like
- Exploring the interface
- Showing Ginko to teammates
- Testing dashboard features

**Exit Demo Mode:** Click "Disable Demo Mode" to return to your real data.

---

## Acting on Insights

Use Insights to continuously improve your collaboration with Ginko.

### Prioritization Strategy

**1. Critical issues first (🔴)**
- These have the biggest score impact
- Often block other improvements
- Address within 1-2 sessions

**2. Warnings next (🟡)**
- Moderate impact
- Address within 1 week
- Usually quick wins

**3. Suggestions when possible (🔵)**
- Low impact, but cumulative benefit
- Try when you have spare time
- Experiment to find what works for you

### Follow Recommendations

Each insight includes specific actions:

```
⚠️ Low pattern adoption: only 3 patterns used this week
   Recommendation:
   1. Review available patterns in docs/patterns/
   2. Reference patterns in next 2 commits
   3. Use `ginko log --pattern=PATTERN-NAME` to track usage
```

Treat recommendations as experiments, not rules.

### Re-run to See Improvement

After taking action:

```bash
# Generate fresh insights
ginko insights --json

# Compare to previous period
ginko insights --json --compare
```

Watch your score improve over time.

---

## Example Workflow

**Monday morning:**
```bash
# Start week with fresh insights
ginko insights --json --days=7

# Open dashboard, check Insights page
# Note: 2 critical issues, 5 warnings
```

**During the week:**
- Address critical issues (stuck tasks)
- Apply 1-2 recommendations per session
- Use `ginko log` to capture context

**Friday afternoon:**
```bash
# Re-run insights
ginko insights --json --compare

# Check improvement
# Score: 68 → 75 (+7 points)
```

**Iterate weekly** for continuous improvement.

---

## FAQ

**Q: Why is my score low even though I'm productive?**

A: Insights measure **collaboration quality**, not code output. Low scores often indicate missing context (no handoffs), lack of documentation (no ADR references), or process friction (stuck tasks). These matter for AI-assisted development.

**Q: How often should I check Insights?**

A: **Weekly** is ideal. Daily checks can feel noisy, monthly is too infrequent for course correction.

**Q: Can I customize what's measured?**

A: Not yet. Insights are based on research into effective AI-human collaboration. Custom metrics may come in a future release.

**Q: Do Insights track my code quality?**

A: Indirectly. Insights measure **process quality** (commits, tests, builds), not code itself (linting, complexity). Good process usually leads to good code.

**Q: What if I disagree with an insight?**

A: Insights are suggestions, not requirements. If a recommendation doesn't fit your workflow, ignore it. Your score will reflect your chosen approach.

---

## Next Steps

- **Explore Demo Mode** to see example insights
- **Run `ginko insights --json`** to generate your first analysis
- **Address 1 critical issue** this week
- **Check back in 7 days** to see improvement

Happy collaborating! 🚀

---

*Last updated: 2025-12-15 | Part of Ginko Dashboard Beta*
