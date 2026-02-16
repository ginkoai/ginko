# ADR-079: Health Check & Process Adherence Supervision

**Status:** Draft
**Date:** 2026-02-16
**Epic:** EPIC-022
**Related:** ADR-043 (Session Logging), ADR-052 (Entity Naming), ADR-078 (Local-First CLI)

## Context

As AI partners take on more work at higher speed, human partners face a supervision scaling problem. Process steps (epic/sprint file creation, task status updates, session logging, graph sync) get skipped — not from negligence but from momentum. A detailed plan arriving as input actually *increases* the risk of skipping tracking, because the AI perceives planning as "already done."

Advisory safeguards (CLAUDE.md instructions, context reflexes) degrade under cognitive load. The oss-2 incident demonstrated this: the AI read the workflow instructions, understood them, and still skipped them when a detailed plan created urgency to build.

### The Supervision Scaling Problem

Traditional code review assumes a human reads every change. This doesn't scale when an AI partner produces dozens of changes per session. The human needs a different model — one based on **checkpoint auditing** rather than real-time review.

### The Planning-as-Done Illusion

A well-structured sprint plan creates a false sense of completion. The AI (and the human) perceive planning as progress, which reduces the felt urgency to track execution. The result: excellent plans with no artifacts proving they were followed. The health check exists to close this gap structurally — it doesn't care how good the plan felt, only whether process artifacts exist.

## Decision

Create `ginko health` — a structural supervision tool that shifts the human's role from **real-time reviewer** to **checkpoint auditor**.

### Key Framing

- What won't work: Expecting ginko to absolve the human of all supervisory responsibilities through code or CLAUDE.md rules.
- What can work: Giving the human a health check tool so they can successfully carry out their supervisory responsibilities at speed.
- AI partners make mistakes just like humans. The human's responsibility is to review at natural breakpoints.

### Principle: Slow is Smooth, Smooth is Fast

Process adherence feels like friction in the moment but prevents expensive rework, lost context, and invisible work. The health check makes this concrete: spend 10 seconds on `ginko health` now, or spend 30 minutes reconstructing what happened later.

## Architecture

### Command Surface

- `ginko health` — full adherence report across 5 categories
- `ginko health --fix` — guided interactive remediation (fix/skip/skip-all per gap)
- `ginko health --verbose` — expanded fix suggestions for all warnings
- Health nudge in `ginko task complete` — one-line prompt when adherence drops below threshold
- Health summary in `ginko handoff` — compact or expanded based on score
- `ran_health_check` adoption signal (+1 point) — reinforces the habit loop

### Adherence Categories

| Category | What It Checks | Examples |
|----------|---------------|----------|
| **Tracking** | Work artifacts exist for active work | Epic/sprint/task files created, task IDs assigned |
| **Completion** | Task status reflects reality | In-progress tasks have activity, completed tasks are marked done |
| **Sync** | Local and graph are aligned | `ginko push` run after changes, staleness within tolerance |
| **Session** | Session lifecycle is captured | Session log entries exist, handoff notes written |
| **Git** | Code changes are committed and attributed | Uncommitted files within tolerance, co-author present |

## Cost-Proportional Thresholds

Thresholds are set proportional to the cost of non-adherence, not arbitrary percentages.

**Analogy: Automobile driving.**
- Stopping at a red light: HIGH cost of failure (collision). Non-negotiable.
- Practicing defensive driving: MEDIUM cost of failure (risk compounds over time). Important but situational.
- Checking mirrors regularly: LOW individual cost, but compounding — skipping it for 100 trips eventually causes an accident.

### Threshold Table

| Category | Cost of Miss | Threshold | Enforcement | Rationale |
|----------|-------------|-----------|-------------|-----------|
| Epic/Sprint/Task creation | **HIGH** — work becomes invisible, context unrecoverable | 95%+ | **Gate** (block handoff) | If it's not tracked, it didn't happen. No artifact = no team visibility. |
| Task status marking | **HIGH** — stale "Next up" suggestions, team confusion | 95%+ | **Gate** (block handoff) | Incorrect status cascades into wrong decisions by every consumer. |
| Graph sync | **MEDIUM** — dashboard stale, but recoverable with `ginko push` | 85% | **Nudge** + escalating warning | Delay is tolerable; permanent drift is not. |
| Session logging | **MEDIUM** — next session starts cold, but context is recoverable with effort | 80% | **Nudge** + compound warning | One missed log is cheap. Five consecutive misses means the next AI partner starts blind. |
| Insight/gotcha capture | **LOW** individually, **compounds** over time | 70% | **Nudge**, escalating over time | Same gotchas get rediscovered across sessions. Streaks of misses increase severity. |

### Gate vs. Nudge

- **Gate:** Blocks a workflow step (e.g., `ginko handoff` refuses to complete). Used only for HIGH-cost categories where the cost of proceeding without adherence exceeds the friction of stopping.
- **Nudge:** Displays a warning but allows the user to proceed. Used for MEDIUM and LOW-cost categories. Nudges escalate based on streaks — a single missed session log is a quiet note; five consecutive misses become a prominent warning.

### Streak-Based Escalation

For compounding categories (session logging, insight capture), the health check tracks streaks of consecutive misses:

| Streak | Severity | Display |
|--------|----------|---------|
| 1-2 sessions missed | Info | Quiet note in health report |
| 3-4 sessions missed | Warning | Prominent warning, shown in `ginko start` |
| 5+ sessions missed | Alert | Elevated to health nudge in `ginko task complete` |

This mirrors real-world risk: skipping one mirror check is fine, but a pattern of skipping is a leading indicator of an incident.

## Chain of Responsibility

Process adherence in a multi-agent environment follows a chain of responsibility, with full accountability resting with the human.

### Responsibility Layers

```
1. Task Instructions (adherence steps baked into acceptance criteria)
   └─ 2. Executing Agent (primary responsibility — follows task instructions)
      └─ 3. Orchestrating Agent (secondary review — verifies artifacts before marking complete)
         └─ 4. Human (final accountability — checkpoint audit via ginko health)
```

### How Each Layer Works

**Layer 1 — Task Instructions:** When `ginko sprint create` generates tasks, each task's acceptance criteria includes the required process artifacts. Adherence isn't advice in CLAUDE.md — it's part of the definition of done.

Example acceptance criteria:
```markdown
- [ ] Implementation complete and tested
- [ ] Task status updated via `ginko task complete`
- [ ] Session log entry created via `ginko log`
- [ ] Changes committed with co-author attribution
```

**Layer 2 — Executing Agent:** The AI partner working on the task follows the acceptance criteria, including process steps. This is the first line of defense — and the one most likely to degrade under cognitive load.

**Layer 3 — Orchestrating Agent:** In multi-agent workflows, the orchestrating agent reviews task completion before accepting it. It checks for the presence of artifacts (session log entries, task status updates, committed code) — not the quality of the work itself.

**Layer 4 — Human:** The accountable human runs `ginko health` at natural breakpoints (session start, before handoff, end of sprint). They see the aggregate picture and can intervene where the automated layers missed something.

### Why the Human Remains Accountable

Automating accountability away doesn't work — it just moves the failure mode from "human forgot to check" to "human trusts automation blindly." The health check is a tool for the human, not a replacement for the human. The human's job is to exercise judgment at checkpoints, not to watch every action.

## AI-Side Feedback Loop

### The Gap

The current coaching system measures Human+AI pair effectiveness, but only the human side of the loop closes:

```
AI does work → coaching score updates → human sees score → human adjusts behavior
                                         ↑ AI never sees this
```

The AI partner never learns its own adherence patterns across sessions. It can't self-correct because it has no visibility into its track record.

### Closing the Loop

Surface adherence trends to the AI partner at session start:

```
Adherence trend (last 5 sessions):
  Tracking:  95% → 95% → 90% → 85% → 80%  ↓ declining
  Logging:   80% → 70% → 60% → 50% → 40%  ↓↓ sharp decline
  Insight:   70% → 75% → 80% → 85% → 90%  ↑ improving
```

When the AI sees its own declining trend, it self-corrects *before* the human needs to intervene. This creates the virtuous cycle:

```
AI does work → adherence tracked → AI sees own trend at session start
     ↑                                          ↓
     └──── AI adjusts behavior ←────────────────┘
```

The human still audits via `ginko health`, but they're auditing a system that's already self-correcting. Their role shifts from "catch every miss" to "verify the self-correction is working."

### Coaching Score Reframing

The dashboard coaching score isn't just a human score — it measures the Human+AI partnership. Both partners should see it. Both should react to it. The human reviews it with their supervisor to discuss team effectiveness. The AI reviews it at session start to calibrate its own process discipline.

This reframing has implications beyond the health check. It suggests that any metric we surface to the human should also be available to the AI partner, and vice versa. Asymmetric visibility creates asymmetric accountability.

### Implementation Note

This feedback loop may warrant its own ADR if the architecture is complex (persistence format, trend calculation, integration with `ginko start`). For now, the principle is captured here: **the AI must close its own adherence loop.**

## Consequences

### Positive

- **Human supervision scales.** Checkpoint auditing replaces real-time review, making it feasible to supervise fast-moving AI partners.
- **Process gaps become visible.** Silent failures (missing artifacts, stale status) surface as concrete warnings rather than vague unease.
- **Compounding risks are caught early.** Streak-based escalation prevents low-cost misses from accumulating into high-cost context loss.
- **AI self-correction reduces human burden.** The feedback loop means the human intervenes less often because the AI is already adjusting.
- **Multi-agent workflows have clear accountability.** The chain of responsibility model scales to any number of agents without diffusing accountability.

### Negative

- **False sense of security.** A green health check doesn't mean the work is *good* — only that process artifacts exist. Quality review remains a human responsibility.
- **Threshold calibration.** Initial thresholds are principled estimates. They'll need tuning based on real usage data. Too strict = friction and workarounds. Too loose = meaningless.
- **Gate friction.** Blocking handoff on adherence failures will occasionally frustrate users who want to move fast. The gate must be accompanied by a fast `--fix` path to reduce friction.
- **Metric gaming.** If adherence becomes a number to optimize, agents might create empty artifacts to satisfy the check. The health check should verify artifact *presence and plausibility*, not just existence.

### Open Questions

1. Should the AI feedback loop be a separate ADR? The architecture (persistence, trend calculation, `ginko start` integration) may be complex enough to warrant its own decision record.
2. How should `ginko health --fix` handle items that require human judgment (e.g., "this task was intentionally left incomplete")? Skip-with-reason? Suppress for session?
3. What's the right cadence for health checks? Every task completion? Every handoff? User-initiated only?

## References

- EPIC-022: Health Check & Process Adherence
- ADR-043: Session Logging Architecture
- ADR-052: Entity Naming Convention
- The oss-2 incident: AI skipped process steps despite reading CLAUDE.md instructions, demonstrating advisory safeguard degradation under cognitive load
