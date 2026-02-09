---
epic_id: EPIC-019
status: active
created: 2026-02-08
updated: 2026-02-09
roadmap_lane: now
roadmap_status: in_progress
tags: [marketing, launch, gtm, content, product-hunt]
---

# EPIC-019: Go-to-Market Launch

## Vision

Execute a focused, founder-led launch that positions ginko as the solution to "context rot" in AI-assisted development. Generate user feedback, validate messaging, and build momentum for public launch—all while operating lean with marketing managed by Claude as the "marketing department."

## Goal

Take ginko from public beta to public launch with validated messaging, user testimonials, and presence in key developer communities. Build a repeatable marketing engine that Reese can operate using playbook-driven templates.

**Target Outcome:** 100+ CLI installs, 10+ user testimonials, and Product Hunt launch within 4 weeks.

## Success Criteria

- [ ] Product marketing context document complete and validated
- [ ] Marketing playbook operational (Reese can execute independently)
- [ ] 5+ verbatim user quotes collected from Ed's beta users
- [ ] 10+ social posts published across X, LinkedIn, Reddit
- [ ] Product Hunt launch executed
- [ ] Landing page updated with user testimonials
- [ ] Competitive positioning validated (no direct competitors confirmed)

## Scope

### In Scope

**Sprint 1: Foundation (Week 1) - MOSTLY COMPLETE**
- [x] Product marketing context document
- [x] Marketing playbook with templates
- [x] Competitive landscape analysis
- [x] Brand assets organized (logos)
- [ ] User feedback questions prepared for Ed

**Sprint 2: Validation (Week 2)**
- [ ] Collect feedback from Ed's beta users
- [ ] Extract verbatim quotes for testimonials
- [ ] Validate/refine messaging based on feedback
- [ ] Update landing page with testimonials
- [ ] First social posts using playbook templates

**Sprint 3: Content Push (Week 3)**
- [ ] Daily social presence (X, LinkedIn)
- [ ] Reddit engagement in target subreddits
- [ ] Blog post repurposed to social content
- [ ] ElevenLabs voice clone for video content (Chris)
- [ ] YouTube video from blog content

**Sprint 4: Launch (Week 4)**
- [ ] Product Hunt launch
- [ ] Coordinated social push
- [ ] Community engagement sprint
- [ ] Collect launch feedback
- [ ] Iterate based on results

### Out of Scope

- Paid advertising (budget not allocated)
- PR/media outreach
- Conference presence
- Influencer partnerships
- Discord community (defer to later)

### Dependencies

- Ed's beta users available for feedback
- Chris available for voice/video content
- Landing page editable (Vercel)
- Product Hunt account ready

## Sprint Breakdown

| Sprint | ID | Goal | Duration | Status |
|--------|-----|------|----------|--------|
| Sprint 1 | e019_s01 | Foundation & Playbook | 1 week | In Progress |
| Sprint 2 | e019_s02 | User Feedback & Validation | 1 week | Not Started |
| Sprint 3 | e019_s03 | Content Execution | 1 week | Not Started |
| Sprint 4 | e019_s04 | Product Hunt Launch | 1 week | Not Started |

**Total Duration:** 4 weeks
**Total Effort:** ~40-60 hours

## Key Assets Created

| Asset | Location | Status |
|-------|----------|--------|
| Product Marketing Context | `.claude/product-marketing-context.md` | Complete (needs validation) |
| Marketing Playbook | `docs/marketing/PLAYBOOK.md` | Complete |
| Brand Logos | `assets/branding/` | Complete |
| Existing Strategies | `docs/marketing/*.md` | Reference material |

## Operating Model

**Claude = Marketing Department**
- Writes all copy and content
- Creates social post templates
- Maintains playbook and context docs
- Provides strategic guidance

**Reese = Execution**
- Copy/paste from playbook
- Publish to channels
- Report back on engagement
- Relay feedback to Claude

**Chris = Founder Voice**
- Video content (ElevenLabs voice clone)
- High-visibility posts
- Product Hunt launch
- Sales conversations

## Competitive Positioning

**Validated 2026-02-08:** No direct competitor occupies ginko's position:
- Git-native (vs cloud-based: Supermemory, Mem0)
- AI-agnostic (vs tool-specific: Cursor Memory Bank)
- Product with support (vs DIY patterns: session handoff articles)
- Team features (vs individual-only solutions)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ed's users unavailable for feedback | High | Start social push without testimonials, add later |
| Reese uncomfortable posting | Medium | Playbook has copy/paste templates, Claude reviews |
| Product Hunt timing | Medium | Monitor for competing launches, flexible date |
| Low initial engagement | Medium | Iterate messaging, try different channels |
| Competitor emerges | Low | Move fast, establish presence first |

## Feedback Loop

```
Post content → Monitor engagement → Report to Claude → Refine playbook → Repeat
```

Weekly check-in: What worked? What didn't? What do we try next?

---

## Changelog

### v1.0.1 - 2026-02-09
- Restored epic after ID collision (Chris's EPIC-019 moved to EPIC-020)

### v1.0.0 - 2026-02-08
- Initial epic creation
- Participants: Reese (user), Claude (marketing), Chris (founder)
- Foundation work (Sprint 1) mostly complete
- 4-week timeline to Product Hunt launch
