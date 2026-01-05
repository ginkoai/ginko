---
epic_id: EPIC-008
status: complete
created: 2026-01-03
updated: 2026-01-05
completed: 2026-01-05
current_sprint: none
adr: ADR-057
# Velocity Metrics (ADR-057)
traditional_estimate: 6-7 weeks
actual_delivery: 3 days
acceleration_factor: 15
complexity: high
greenfield: false
work_mode: think-and-build
---

# EPIC-008: Team Collaboration

## Vision

Enable small teams (2-5 developers) to collaborate seamlessly on ginko-enabled projects with clear visibility, lightweight coordination, and frictionless onboarding. A new team member should be productive within 10 minutes of receiving an invite.

## Goal

Build team collaboration features that support project onboarding, role/permissions management, coordination, visibility, knowledge sharing, and environment synchronization for small teams.

## Success Criteria

- [x] Project owners can invite new members from dashboard or CLI (`ginko invite user@domain.com`)
- [x] New team member productive in ≤10 minutes from invite (assumes git proficiency)
- [x] Project owners can manage members via dashboard and CLI (invite, change permissions, suspend, remove)
- [x] Zero conflicts on knowledge merge edits
- [x] Team can see who is working on what (real-time visibility)
- [x] Project owners can view Insights for all team members (member pulldown filter)
- [x] Per-seat monthly billing via Stripe

## Scope

### In Scope

**Membership & Permissions:**
- `ginko invite` command - owner invites member via CLI
- `ginko join` command - member joins existing ginko-enabled project
- Dashboard member management (invite, edit permissions, suspend, remove)
- Owner/member permission model (simple two-role system)

**Visibility & Coordination:**
- Team activity feed (who's working on what)
- Enhanced sync with staleness detection for varying access frequencies
- Conflict prevention on concurrent knowledge edits

**Insights:**
- Member filter on Insights page for project owners
- Owner can view any team member's collaboration insights

**Billing:**
- Per-seat monthly billing model
- Stripe integration (extend existing ADR-005 implementation)
- Seat management in dashboard

### Out of Scope

- Code access control (git's responsibility)
- Granular RBAC (keep simple owner/member for now)
- Cross-project team management (one project at a time)
- Real-time collaboration (live cursors, simultaneous editing)
- Usage-based billing (per-seat only)

### Dependencies

- Existing Stripe integration (`packages/mcp-server/src/billing-manager.ts`, ADR-005)
- Supabase authentication (existing)
- Neo4j graph database (existing)
- Dashboard member management UI patterns

## Sprint Breakdown

| Sprint | Goal | Duration | Status |
|--------|------|----------|--------|
| Sprint 1 | Foundation (Schema & APIs) | 2 weeks | **Complete** |
| Sprint 2 | Visibility & Coordination | 2 weeks | **Complete** |
| Sprint 3 | Insights & Polish | 1 week | **Complete** |
| Sprint 4 | Billing & Seats | 1-2 weeks | **Complete** |

**Estimated Total:** 6-7 weeks
**Actual:** ~3 days (accelerated delivery)

### Sprint 1 Accomplishments (Closed 2026-01-03)
- Graph schema for teams, memberships, and roles
- Team management API endpoints (invite, join, members CRUD)
- `ginko invite` and `ginko join` CLI commands
- Dashboard member list component with status indicators
- Permission checks (owner/member model)
- Team-aware sync with staleness detection
- Integration tests for team APIs

### Sprint 2 Accomplishments (Closed 2026-01-03)
- Team activity feed with real-time visibility
- Enhanced sync with staleness detection
- Conflict prevention on concurrent knowledge edits
- Team-aware context loading

### Sprint 3 Accomplishments (Closed 2026-01-05)
- Insights page member filter for project owners
- Team aggregate insights API endpoint
- Onboarding flow optimization (≤10 min target achieved)
- Progress indicators for sync and join commands
- Team collaboration documentation
- E2E tests for team onboarding and collaboration

### Sprint 4 Accomplishments (Closed 2026-01-05)
- Extended billing schema for per-seat model (BillingManager, EntitlementsManager)
- Stripe per-seat product configuration ($15/seat/month)
- Automatic seat count synchronization on member add/remove
- Dashboard billing overview page with seat usage display
- Upgrade/downgrade flows with proper proration
- Stripe webhook handlers (subscription updates, payment failures)
- Free tier (2 seats) and trial configuration (14 days + 3-day grace)
- Launch checklist and security audit (`docs/launch/EPIC-008-launch-checklist.md`)

## Technical Considerations

### Graph Schema Extensions
- `(:Team {id, name, projectId, createdAt})`
- `(:Membership {userId, role, status, joinedAt, lastActive})`
- `(User)-[:MEMBER_OF {role}]->(Team)`
- `(Team)-[:OWNS]->(Project)`

### API Endpoints (Sprint 1)
- `POST /api/v1/team/invite` - Send invitation
- `POST /api/v1/team/join` - Accept invitation
- `GET /api/v1/team/members` - List members
- `PATCH /api/v1/team/members/:id` - Update member
- `DELETE /api/v1/team/members/:id` - Remove member

### CLI Commands
- `ginko invite <email> [--role owner|member]`
- `ginko join <invite-code>`
- `ginko team` - List team members and status

### Billing Model (Sprint 4)
- Extend existing BillingManager for per-seat pricing
- Seat count tracked at team level
- Stripe subscription updated on member add/remove

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Conflict resolution complexity | High | Start with prevention (lock-based), add resolution later |
| Billing edge cases (mid-cycle changes) | Medium | Use Stripe's proration; test thoroughly |
| Permission model too simple | Low | Design schema to support future RBAC if needed |
| Onboarding friction | High | User testing; iterate on 10-minute target |

## References

- [ADR-005: Stripe Payment Integration](../adr/ADR-005-stripe-payment-integration.md)
- [ADR-004: Identity, Entitlements, Billing](../adr/ADR-004-identity-entitlements-billing.md)
- Existing billing code: `packages/mcp-server/src/billing-manager.ts`

---

## Changelog

### v2.0.0 - 2026-01-05 (EPIC COMPLETE)
- Sprint 4 complete (8/8 tasks)
- All success criteria met
- Epic marked complete
- Added Sprint 4 accomplishments summary
- Launch checklist created and verified
- Deployed to production

### v1.3.0 - 2026-01-05
- Sprint 3 complete (6/6 tasks)
- Sprint 4 ready: Billing & Seats
- Added Sprint 3 accomplishments summary
- 75% of epic complete (3/4 sprints)

### v1.2.0 - 2026-01-03
- Sprint 2 complete
- Sprint 3 started: Insights & Polish
- Added Sprint 2 accomplishments summary

### v1.1.0 - 2026-01-03
- Sprint 1 complete (10/10 tasks)
- Sprint 2 started: Visibility & Coordination
- Added Sprint 1 accomplishments summary

### v1.0.0 - 2026-01-03
- Initial epic creation
- 4 sprints defined: Foundation, Visibility, Insights, Billing
- Participants: Chris Norton (chris@watchhill.ai), Claude
