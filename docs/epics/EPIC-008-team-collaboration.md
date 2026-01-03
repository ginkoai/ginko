---
epic_id: EPIC-008
status: active
created: 2026-01-03
updated: 2026-01-03
adr: TBD
---

# EPIC-008: Team Collaboration

## Vision

Enable small teams (2-5 developers) to collaborate seamlessly on ginko-enabled projects with clear visibility, lightweight coordination, and frictionless onboarding. A new team member should be productive within 10 minutes of receiving an invite.

## Goal

Build team collaboration features that support project onboarding, role/permissions management, coordination, visibility, knowledge sharing, and environment synchronization for small teams.

## Success Criteria

- [ ] Project owners can invite new members from dashboard or CLI (`ginko invite user@domain.com`)
- [ ] New team member productive in ≤10 minutes from invite (assumes git proficiency)
- [ ] Project owners can manage members via dashboard and CLI (invite, change permissions, suspend, remove)
- [ ] Zero conflicts on knowledge merge edits
- [ ] Team can see who is working on what (real-time visibility)
- [ ] Project owners can view Insights for all team members (member pulldown filter)
- [ ] Per-seat monthly billing via Stripe

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
| Sprint 1 | Foundation (Schema & APIs) | 2 weeks | Not Started |
| Sprint 2 | Visibility & Coordination | 2 weeks | Not Started |
| Sprint 3 | Insights & Polish | 1 week | Not Started |
| Sprint 4 | Billing & Seats | 1-2 weeks | Not Started |

**Estimated Total:** 6-7 weeks

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

### v1.0.0 - 2026-01-03
- Initial epic creation
- 4 sprints defined: Foundation, Visibility, Insights, Billing
- Participants: Chris Norton (chris@watchhill.ai), Claude
