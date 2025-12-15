/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-12-15
 * @tags: dashboard, web-interface, observability, beta, focus-page, sprint-tracking
 * @related: ADR-052-entity-naming-convention.md, PROJECT-CHARTER.md
 * @priority: high
 * @complexity: low
 * @dependencies: app.ginkoai.com, GitHub OAuth
 */

# Ginko Dashboard Guide

**Web interface for AI collaboration observability**

The Ginko Dashboard at [app.ginkoai.com](https://app.ginkoai.com) provides real-time visibility into your AI-assisted development workflow. Monitor sprint progress, track tasks, review team activity, and identify blockers - all in one place.

**Current status:** Beta (active development)

---

## Getting Access

**Authentication:** GitHub OAuth (same credentials as CLI)

```bash
# Login via CLI (stores credentials)
ginko login

# Initialize graph connection
ginko graph init
```

Once authenticated, navigate to [app.ginkoai.com](https://app.ginkoai.com) and sign in with GitHub.

---

## Focus Page (Landing)

The Focus page is your command center - designed for quick context refresh and action prioritization.

[Screenshot: Focus page overview]

### Sprint Progress Card

**Shows:**
- Active sprint name and epic
- Progress percentage (tasks completed / total tasks)
- Timeline status: Days ahead/behind schedule
- Quick link to sprint details

**Example:**
```
EPIC-005 Sprint 2: Dashboard Beta Release
67% complete (8/12 tasks)
2 days ahead of schedule
```

### My Tasks

**Displays:**
- Tasks assigned to you
- Priority level (critical/high/medium/low)
- Status (pending/in-progress/completed/blocked)
- Related files and context links

**Actions:**
- Click task to view details
- Update status directly
- Add comments or blockers

[Screenshot: My Tasks card with priority indicators]

### Last Session Summary

**Captures:**
- What you accomplished in your most recent session
- Files modified
- Key decisions or insights logged
- Time spent

**Source:** Auto-generated from `ginko log` entries and session events

### Recent Completions

**Team activity feed showing:**
- Tasks completed by team members
- Timestamps and assignees
- Impact level (high/medium/low)
- Related epic/sprint context

**Updates:** Real-time (via webhook sync or manual `ginko sync`)

### Action Items

**System-generated warnings:**
- "Unsynced nodes detected - run `ginko sync`"
- "Sprint deadline approaching (2 days remaining)"
- "3 blocked tasks require attention"
- "High-priority task overdue"

**Purpose:** Surface issues before they impact delivery

[Screenshot: Action Items card with warning indicators]

---

## Navigation Overview

**Three main sections:**

### 1. Focus (Landing)
- Quick context refresh
- Personal task view
- Sprint status at-a-glance

### 2. Graph (Coming Soon)
- Visual knowledge graph
- Entity relationships (ADRs, Sprints, Tasks, Patterns)
- Interactive exploration

### 3. Insights (Coming Soon)
- Velocity metrics
- Context pressure trends
- Team collaboration patterns
- Sprint retrospective data

---

## Coming Soon / Beta Notes

**Currently in beta:**
- Focus page (active development)
- GitHub OAuth authentication
- Sprint progress tracking
- Task management

**Planned features:**
- Graph visualization (Q1 2026)
- Advanced analytics and insights
- Team collaboration tools
- Custom dashboards
- Mobile-responsive design improvements

**Known limitations:**
- Manual sync required (`ginko sync`) for immediate updates
- Limited to single-project view (multi-project support planned)
- Graph page UI placeholder only

**Feedback:** Report issues or feature requests via GitHub Issues or `support@ginkoai.com`

---

## Quick Start Workflow

1. **Authenticate:** `ginko login` + `ginko graph init`
2. **Sync your work:** `ginko sync` (pushes local graph to cloud)
3. **Open dashboard:** Navigate to [app.ginkoai.com](https://app.ginkoai.com)
4. **Review Focus page:** Check sprint progress, tasks, action items
5. **Take action:** Update task status, address blockers, sync again

**Refresh frequency:** Run `ginko sync` at session start/end for up-to-date dashboard

---

## Integration with CLI

The dashboard is a **read-optimized view** of your git-native Ginko data:

| CLI Command | Dashboard Impact |
|-------------|------------------|
| `ginko start` | Updates last session timestamp |
| `ginko log` | Populates session summaries |
| `ginko sync` | Pushes local graph to cloud for dashboard |
| Task completion | Updates My Tasks and Recent Completions |
| Sprint updates | Refreshes Sprint Progress Card |

**Primary workflow remains CLI-based.** Dashboard provides observability, not primary editing.

---

## Support & Resources

- **Dashboard URL:** [app.ginkoai.com](https://app.ginkoai.com)
- **CLI Documentation:** See [CLAUDE.md](../CLAUDE.md)
- **Graph API:** See [ADR-052](../adr/ADR-052-entity-naming-convention.md)
- **Feedback:** GitHub Issues or `support@ginkoai.com`

---

*Last updated: 2025-12-15 | Status: Beta | Next review: Q1 2026*
