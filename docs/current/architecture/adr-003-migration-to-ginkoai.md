# ADR-003: Migration from WatchHill to Ginko AI

## Status
Accepted

## Date
2025-01-25

## Context
The project needed to be migrated from the WatchHill brand to Ginko AI, requiring a complete rebranding and infrastructure migration while maintaining service continuity.

## Decision
We performed a comprehensive migration covering:
- Domain migration from watchhill.ai to ginkoai.com
- GitHub organization from watchhillai to ginkoai
- NPM organization from @watchhill to @ginkoai
- Complete codebase rebranding (449 files)
- Infrastructure migration to new Supabase and Vercel projects

## Consequences

### Positive
- **Clean brand separation**: Complete independence from WatchHill infrastructure
- **Improved architecture**: Fixed OAuth authentication issues during migration
- **Published NPM package**: @ginkoai/mcp-client v0.6.1 now publicly available
- **Unified infrastructure**: All services under ginkoai organization control

### Negative
- **Breaking changes**: Existing WatchHill users need to migrate
- **NPM package rename**: Users must update from @watchhill/mcp-client to @ginkoai/mcp-client
- **API endpoint changes**: All API calls now point to mcp.ginkoai.com

## Implementation Details

### Infrastructure Components
1. **Domains**:
   - Website: https://ginkoai.com
   - Dashboard: https://app.ginkoai.com
   - API: https://mcp.ginkoai.com

2. **Database**:
   - Supabase project: zkljpiubcaszelgilifo
   - PostgreSQL with auth schema
   - Fixed user creation trigger for OAuth

3. **Authentication**:
   - GitHub OAuth configured
   - Disabled email confirmation requirement
   - User profiles created automatically on signup

4. **Package Distribution**:
   - NPM: @ginkoai/mcp-client
   - GitHub: github.com/ginkoai/ginko

### Key Technical Changes
1. **API Key Prefix**: Changed from `wmcp_sk_` to `gmcp_sk_`
2. **Database Trigger**: Modified `handle_new_user()` to handle OAuth properly
3. **Environment Variables**: All services updated with new Supabase and domain configurations

### Migration Process
1. Created new GitHub and NPM organizations
2. Forked and rebranded codebase
3. Set up new Supabase project with schema migration
4. Deployed to Vercel with new domain configuration
5. Fixed authentication issues
6. Published NPM package
7. Verified end-to-end functionality

## Lessons Learned
1. **OAuth Configuration**: Supabase email confirmation conflicts with OAuth flows
2. **Database Triggers**: Must handle NULL values for optional fields like API keys
3. **NPM Publishing**: Requires removing "private" field and proper 2FA setup
4. **DNS Propagation**: Domain changes take time to propagate globally

## References
- Migration handoff: /Users/cnorton/Development/ginko-migration-handoff.md
- GitHub Repository: https://github.com/ginkoai/ginko
- NPM Package: https://www.npmjs.com/package/@ginkoai/mcp-client