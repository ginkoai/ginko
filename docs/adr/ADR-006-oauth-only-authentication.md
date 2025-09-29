---
type: architecture
decision: oauth-only-authentication
status: approved
updated: 2025-02-03
tags: [authentication, oauth, ux, security, architecture]
related: [ADR-001-infrastructure-stack-selection.md, UX-001-user-journey-friction-analysis.md]
priority: high
audience: [developer, architect, team]
estimated-read: 5-min
decision-date: 2025-02-03
---

# ADR-006: OAuth-Only Authentication Strategy

## Status
**Approved** - Implemented in production

## Context
Ginko initially implemented traditional email/password authentication alongside GitHub OAuth. The UX friction analysis (UX-001) identified authentication as a major friction point in the user journey, with developers experiencing:
- Password fatigue from managing yet another password
- Email verification delays
- Form friction during signup
- No immediate value after account creation

Given our target audience is developers who universally have GitHub accounts, we needed to reconsider our authentication strategy.

## Decision
We will use **GitHub OAuth as the exclusive authentication method**, removing email/password authentication entirely.

### Implementation Details:
1. Remove all email/password form fields from signup/login pages
2. Present GitHub OAuth as the single authentication option
3. Add clear messaging about why we use GitHub authentication
4. Ensure smooth redirect flow with proper loading states

## Rationale

### 1. **Developer-First Experience**
- 99%+ of our target users already have GitHub accounts
- GitHub accounts are free and easy to create
- Developers trust GitHub's security infrastructure

### 2. **Reduced Friction**
- Signup time reduced from ~2 minutes to ~10 seconds
- No passwords to create, remember, or reset
- No email verification delays
- Single-click authentication

### 3. **Enhanced Security**
- Leverage GitHub's robust security (2FA, breach detection)
- No password storage or reset flows to maintain
- Reduced attack surface for our application

### 4. **Simplified Codebase**
- Remove password validation logic
- Remove email verification flows
- Remove password reset functionality
- Cleaner, more maintainable auth code

### 5. **Better User Data**
- Automatic access to developer profile information
- GitHub username for better team collaboration features
- Repository access for future integrations

## Consequences

### Positive:
- **Dramatically reduced signup friction** (from 😕 to 😊 in user journey)
- **Higher conversion rates** expected due to single-click signup
- **Lower support burden** (no password reset requests)
- **Faster time-to-value** for new users
- **Stronger security posture** via GitHub's infrastructure

### Negative:
- **GitHub dependency** - Service outages affect our auth
- **Limited audience** - Non-GitHub users excluded (acceptable for MVP)
- **Privacy concerns** - Some users may not want to connect GitHub
- **Single point of failure** - All auth through one provider

### Mitigations:
- Monitor GitHub status and communicate outages
- Add additional OAuth providers (GitLab, Bitbucket) post-PMF
- Clear privacy policy about GitHub data usage
- Implement proper error handling for OAuth failures

## Alternatives Considered

1. **Magic Links** - Passwordless email authentication
   - Rejected: Still requires email verification, doesn't leverage existing identity

2. **Multiple OAuth Providers** - GitHub, GitLab, Bitbucket from day one
   - Rejected: Adds complexity before validating PMF

3. **Hybrid Approach** - Keep email/password as secondary option
   - Rejected: Maintains complexity we're trying to eliminate

## Implementation Timeline
- **Phase 1** (Complete): Remove email/password forms, GitHub OAuth only
- **Phase 2** (Future): Add GitLab OAuth based on user demand
- **Phase 3** (Future): Consider Bitbucket, Azure DevOps based on growth

## Success Metrics
- Signup conversion rate > 80% (from landing to authenticated)
- Time to first authenticated session < 30 seconds
- Support tickets for auth issues < 1% of signups
- User satisfaction with auth process > 4.5/5

## References
- [UX-001: User Journey Friction Analysis](../UX/UX-001-user-journey-friction-analysis.md)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Supabase GitHub OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-github)