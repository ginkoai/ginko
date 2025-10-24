---
type: sprint
status: in_progress
sprint_number: 009
date: 2025-08-13
tags: [sprint, dashboard, coaching, collaboration, ai-human-performance]
related: [BACKLOG.md, api/tools/call.ts, session-handoff.ts, dashboard/]
priority: high
audience: [developer, team, product]
estimated_read: 20-min
dependencies: [SPRINT-008-20250812-handoff-enhancement-dashboard-data.md]
team_members: [chris, claude]
story_points_planned: 21
story_points_completed: 0
velocity: 0.0
sprint_goal: "Transform dashboard into collaboration coaching platform"
---

# Sprint 009 - Collaboration Coaching Dashboard

**Date**: August 13, 2025  
**Sprint Goal**: Build a dashboard that coaches users to improve AI-human collaboration
**Duration**: Multi-session sprint (5 sessions estimated)
**Mission Alignment**: Improve AI-human performance through collaboration coaching

## 🎯 Sprint Planning

### Strategic Vision
Transform the dashboard from passive metrics display into an active coaching platform that:
- Shows collaboration scorecards for each session
- Identifies patterns in successful vs struggling sessions
- Provides actionable coaching recommendations
- Tracks improvement over time
- Creates market differentiation as a performance improvement platform

### Backlog Items Selected
1. **[TASK-001] Session Scorecard Data Model** (5 story points) - Design comprehensive scoring system
2. **[TASK-002] Collaboration Scoring Algorithm** (8 story points) - Build scoring engine
3. **[TASK-003] Dashboard UI Components** (5 story points) - Create React components with Recharts
4. **[TASK-004] Coaching Recommendations Engine** (3 story points) - Generate improvement suggestions

### Success Criteria
- [ ] Session scorecards capture meaningful collaboration metrics
- [ ] Scoring algorithm provides actionable insights
- [ ] Dashboard displays sessions with expandable scorecards
- [ ] Coaching recommendations are specific and helpful
- [ ] Remove placeholder analytics code

## 🔴 Pre-Mortem Analysis: "What Could Kill This?"

### Critical Risks

**1. Data We Don't Actually Have** ⚠️
- **Threat**: Scoring metrics that aren't being captured
- **Reality Check**: 
  - ✅ Handoff quality scores (from assess_handoff_quality)
  - ✅ Session timestamps
  - ❌ Task completion tracking
  - ❌ Token usage metrics
  - ❌ Mood/trajectory data
- **Mitigation**: 
  - Phase 1: Verify what's in Supabase
  - Score ONLY available data initially
  - Add tracking incrementally

**2. Scope Creep**
- **Threat**: Building perfect system in one sprint
- **Mitigation**: 
  - MVP with 3-5 metrics MAX
  - No ML/AI in v1
  - Ship iteratively

**3. Breaking Existing Handoff Flow**
- **Threat**: Dashboard changes break working system
- **Mitigation**: 
  - READ-ONLY dashboard
  - Separate tables for coaching data
  - Test handoff after each change

### ✅ RESOLVED: UI Framework Risk
- **Solution Found**: Dashboard already uses Next.js 14 + React + Tailwind + Recharts
- **Located at**: `dashboard/` directory, deployed to app.ginko.ai

## 📊 Collaboration Scorecard Design

### Core Metrics Structure
```typescript
interface SessionScorecard {
  sessionId: string;
  timestamp: Date;
  duration: number;
  
  // Collaboration Scores (0-100)
  scores: {
    handoffQuality: number;      // From assess_handoff_quality
    taskCompletion: number;      // % of planned tasks completed
    sessionDrift: number;        // How much session deviated from plan
    contextEfficiency: number;   // Tokens used vs work accomplished
    continuityScore: number;     // Emotional/momentum continuity
    overallCollaboration: number; // Weighted average
  };
  
  // Session Mood Tracking
  mood: {
    start: 'excited' | 'focused' | 'uncertain' | 'frustrated';
    end: 'satisfied' | 'accomplished' | 'blocked' | 'exhausted';
    trajectory: 'improving' | 'steady' | 'declining';
  };
  
  // Work Metrics
  work: {
    tasksPlanned: number;
    tasksCompleted: number;
    unexpectedTasks: number;
    blockers: string[];
    breakthroughs: string[];
  };
  
  // Context Consumption
  context: {
    tokensConsumed: number;
    filesAccessed: number;
    toolsUsed: string[];
    searchQueries: number;
    contextReloads: number;
  };
  
  // Coaching Insights
  coaching: {
    strengths: string[];
    improvements: string[];
    recommendations: CoachingRecommendation[];
    patterns: CollaborationPattern[];
  };
}
```

## 🎨 Dashboard UI Design

### Tech Stack (Existing)
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Data**: Supabase
- **Deployment**: Vercel at app.ginko.ai

### Component Structure
```
dashboard/src/components/dashboard/collaboration/
├── SessionScorecard.tsx       // Main scorecard component
├── CollaborationScore.tsx     // Score display with radar chart
├── MoodTrajectory.tsx         // Mood visualization
├── CoachingInsights.tsx       // Recommendations display
├── SessionMetrics.tsx         // Work & context metrics
└── index.ts                   // Exports
```

### API Structure
```
dashboard/src/app/api/sessions/
├── [id]/
│   └── scorecard/
│       └── route.ts          // GET scorecard for session
├── scorecards/
│   └── route.ts              // GET all scorecards
└── coaching/
    └── route.ts              // GET coaching recommendations
```

## 📈 Implementation Plan (Multi-Session)

### Session 1 (Today): Foundation & Data Discovery
- ✅ Pre-mortem analysis
- ✅ Identify dashboard architecture
- ⏳ Verify what data exists in Supabase
- ⏳ Design scorecard data model
- ⏳ Create database schema for scorecards

### Session 2: Backend & Data
- Extend session tracking to capture metrics
- Build scoring algorithm
- Create API endpoints
- Remove placeholder analytics

### Session 3: Frontend Components
- Build React scorecard components
- Integrate with Recharts
- Extend SessionsTable
- Add loading/error states

### Session 4: Coaching Logic
- Implement recommendation engine
- Add pattern detection
- Create coaching content
- Test with real sessions

### Session 5: Polish & Ship
- Performance optimization
- Caching strategy
- Full testing
- Production deployment

## 🚀 Expected Outcomes

### User Value
- **Immediate feedback** on collaboration quality
- **Specific improvements** to implement
- **Progress tracking** over time
- **Pattern recognition** of what works

### Business Value
- **Increased engagement**: Users return to see scores
- **Market differentiation**: Only coaching platform for AI collaboration
- **Data insights**: Aggregate patterns across all users
- **Premium features**: Advanced coaching, team comparisons

## 🔄 Sprint Progress

### Session 1 Progress (In Progress)
- ✅ Sprint planning completed
- ✅ Pre-mortem analysis done
- ✅ Dashboard architecture identified
- ⏳ Data availability verification
- ⏳ Schema design

### Files Modified
- `docs/sprints/SPRINT-009-*.md` - Sprint planning document

### Commits
```
(pending)
```

## 📝 Technical Decisions

### Decision 1: MVP Scoring Metrics
- **Context**: Limited data currently captured
- **Decision**: Start with available data only
- **Metrics for MVP**:
  1. Handoff quality (we have this)
  2. Session duration (we have this)
  3. Files touched (can derive from tools)
- **Defer**: Token usage, mood tracking, task completion

### Decision 2: Scorecard Storage
- **Context**: Need flexible schema for evolution
- **Decision**: Separate `session_scorecards` table with JSONB
- **Impact**: Can evolve schema without migrations

---

**Sprint Status**: Session 1 - Foundation
**Next Step**: Verify Supabase data availability
**Risk Level**: Medium (data availability unknown)