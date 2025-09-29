# Architecture Decision Records (ADR) Index

This document maintains the official registry of all Architecture Decision Records to ensure unique numbering and provide a central reference.

## Quick Reference

| ADR # | Title | Status | Date | Tags |
|-------|-------|--------|------|------|
| [ADR-001](ADR-001-infrastructure-stack-selection.md) | Infrastructure Stack Selection | Approved | 2025-01-31 | infrastructure, mvp, supabase, vercel |
| [ADR-002](ADR-002-ai-readable-code-frontmatter.md) | AI-Readable Code Frontmatter | Approved | 2025-01-31 | ai-optimization, code-organization |
| [ADR-003](ADR-003-oauth-authentication-architecture.md) | OAuth Authentication Architecture | Approved | 2025-08-01 | oauth, authentication, supabase |
| [ADR-004](ADR-004-identity-entitlements-billing.md) | Identity, Entitlements & Billing Architecture | Approved | 2025-08-01 | identity, billing, stripe |
| [ADR-005](ADR-005-stripe-payment-integration.md) | Stripe Payment Integration | Approved | 2025-08-01 | payments, stripe, billing |
| [ADR-006](ADR-006-oauth-only-authentication.md) | OAuth-Only Authentication Strategy | Approved | 2025-08-02 | oauth, authentication, security |
| [ADR-007](ADR-007-github-search-engine.md) | GitHub Search Engine Architecture | Approved | 2025-08-02 | search, github, indexing |
| [ADR-008](ADR-008-environment-based-authentication.md) | Environment-Based Authentication | Approved | 2025-08-04 | authentication, environment, security |
| [ADR-009](ADR-009-serverless-first-mvp-architecture.md) | Serverless-First MVP Architecture | Approved | 2025-08-04 | serverless, vercel, architecture |
| [ADR-010](ADR-010-ai-attribution-efficacy-tracking.md) | AI Attribution and Efficacy Tracking System | Accepted | 2025-08-04 | ai-attribution, efficacy, marketplace |
| [ADR-011](ADR-011-best-practices-claude-code-integration.md) | Best Practices Integration with Claude Code | Accepted | 2025-08-04 | claude-code, best-practices, context |
| [ADR-012](ADR-012-legacy-context-migration-strategy.md) | Legacy Context Migration Strategy | Implemented | 2025-08-05 | migration, context, database, legacy |
| [ADR-013](ADR-013-mcp-server-project-separation.md) | MCP Server Project Separation | Approved | 2025-08-05 | mcp, deployment, vercel, separation, production |
| [ADR-014](ADR-014-mcp-server-consolidation-and-rationalization.md) | MCP Server Consolidation | Superseded | 2025-08-06 | mcp, consolidation, serverless |
| [ADR-015](ADR-015-monorepo-migration-architecture.md) | Monorepo Migration Architecture | Accepted | 2025-08-07 | monorepo, modules, bundling, vercel |
| [ADR-016](ADR-016-simplify-mcp-interface-preserve-capabilities.md) | Simplify MCP Interface While Preserving Internal Capabilities | Accepted | 2025-08-11 | mcp, interface, mvp, capabilities |
| [ADR-017](ADR-017-ai-driven-handoff-prompt-architecture.md) | AI-Driven Handoff Prompt Architecture | Accepted | 2025-08-11 | handoff, prompts, session-management, ai |
| [ADR-018](ADR-018-collaborative-slash-commands.md) | Collaborative Slash Commands with Safety Guardrails | Accepted | 2025-08-12 | claude-code, collaboration, commands, ux |

## ADR Status Definitions

- **Draft**: Work in progress, not yet ready for review
- **Proposed**: Ready for review and discussion
- **Accepted**: Approved and ready for implementation
- **Approved**: Implemented and in production use
- **Deprecated**: No longer recommended, but still in use
- **Superseded**: Replaced by a newer ADR

## Creating a New ADR

### Step 1: Reserve Next Number
1. Check this index for the highest ADR number currently assigned
2. Assign the next sequential number (e.g., if highest is ADR-011, use ADR-012)
3. **Immediately update this index** with your reserved number and basic info

### Step 2: Create ADR File
1. Copy `ADR-TEMPLATE.md` to `ADR-XXX-your-title.md`
2. Replace XXX with your reserved number (zero-padded to 3 digits)
3. Fill out the template with your decision details
4. Use descriptive, kebab-case filename after the number

### Step 3: Update Index
1. Add complete entry to the Quick Reference table above
2. Update any cross-references in related ADRs
3. Commit both the new ADR and updated index together

### Example Workflow
```bash
# 1. Check current highest number in ADR-INDEX.md
# 2. Reserve ADR-012 by updating index immediately
# 3. Create your ADR
cp ADR-TEMPLATE.md ADR-012-my-new-decision.md
# 4. Edit your ADR file
# 5. Update this index with complete details
# 6. Commit both files together
git add ADR-012-my-new-decision.md ADR-INDEX.md
git commit -m "feat: add ADR-012 for my new decision"
```

## Cross-Reference Guidelines

### Referencing Other ADRs
- Always use format: `[ADR-XXX](ADR-XXX-title.md)` for links
- Use `ADR-XXX` for plain text references in discussions
- Update `related` field in frontmatter for bidirectional links

### Superseding ADRs
- Mark old ADR as `superseded` status
- Add `superseded_by: ADR-XXX` field
- Mark new ADR with `supersedes: ADR-XXX` field
- Keep old ADR file for historical reference

### Deprecating ADRs
- Change status to `deprecated`
- Add deprecation reason and date
- Provide migration guidance if applicable
- Don't delete the file - maintain for historical context

## Quality Standards

### Required Sections
- Context: Why this decision is needed
- Decision: What was decided
- Consequences: Positive and negative impacts
- Alternatives: What options were considered

### Best Practices
- Write for future developers who weren't involved
- Include concrete examples and code snippets
- Link to related documents and implementations
- Use specific, measurable language
- Consider both technical and business implications

### Review Process
1. Author creates ADR in `draft` status
2. Stakeholders review and provide feedback
3. Author incorporates feedback and changes status to `proposed`
4. Final approval changes status to `accepted`
5. After implementation, status becomes `approved`

## Archive Policy

ADRs are never deleted, only deprecated or superseded. This maintains a complete historical record of architectural decisions and their evolution over time.

---

**Last Updated:** 2025-08-12  
**Next Available Number:** ADR-019  
**Maintainer:** Architecture Team
- [ADR-025: Context Preservation System Architecture](./ADR-025-context-preservation-system-architecture.md)

- [ADR-026: Enhanced ginko init with intelligent project optimization for AI collaboration](./ADR-026-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration.md)
