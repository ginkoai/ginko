# SPRINT-007: MVP Schema Alignment for Production Launch

**Date**: 2025-08-09  
**Status**: In Progress  
**Priority**: Critical  
**Goal**: Align MCP server code with existing MVP schema to enable session persistence  

## Context & Problem Statement

**Current Situation:**
- ✅ Database connection working (Supabase PostgreSQL via session pooler)
- ✅ OAuth authentication working (GitHub → auth.users → user_profiles)
- ✅ MVP schema deployed in production with required tables
- ❌ MCP server code expects full schema (users/organizations/teams)
- ❌ Session capture failing due to schema mismatch
- ❌ E2E tests using hardcoded user that doesn't exist

**Root Cause:** Code/schema alignment issue, not infrastructure problem.

## Decision Framework Applied

**Business Context:**
- Finding PMF for new product → Simplicity over complexity
- Developer audience → GitHub OAuth removes friction  
- Startup speed → YAGNI principle, dead simple architecture
- Launch focus → Working system now > future complexity

**Technical Decisions:**
- **Schema**: MVP (user_profiles + sessions referencing auth.users)
- **Authentication**: GitHub OAuth only (already working)
- **User Model**: Simple (user_id = org_id, no team complexity)
- **Priority**: Working system for launch

## Execution Sequence

### Phase 1: Code Alignment (1-2 hours)

#### Task 1.1: Update AuthManager for MVP Schema
**File**: `packages/mcp-server/src/auth-manager.ts`

**Current (Full Schema)**:
```typescript
// Expects: users + organizations tables with bcrypt
FROM users u JOIN organizations o ON u.organization_id = o.id
WHERE u.api_key_hash IS NOT NULL
```

**Target (MVP Schema)**:
```typescript
// Use: user_profiles with plaintext api_key
FROM user_profiles up WHERE up.api_key = $1 AND up.is_active = true
```

**Changes:**
- Replace bcrypt comparison with direct API key match
- Query `user_profiles` instead of `users` + `organizations`
- Simplify user model: `organizationId = userId` (1:1 mapping)
- Return subscription_tier as planTier

#### Task 1.2: Update Session Storage References
**Files**: 
- `packages/mcp-server/src/database.ts` (session methods)
- `api/sessions/capture.ts`
- `api/sessions/list.ts`

**Changes:**
- Update session queries to expect `sessions.user_id → auth.users.id`
- Remove references to team_id, project_id foreign keys
- Simplify session structure for MVP model

#### Task 1.3: Update User Model in API Utils
**File**: `api/_utils.ts`

**Current**: Complex user creation with organizations/teams/projects
**Target**: Simple user creation that works with OAuth trigger

**Changes:**
- Remove `ensureTestUserExists()` function (OAuth handles user creation)
- Update `getAuthenticatedUser()` for E2E test scenarios
- Use actual OAuth-created test user instead of hardcoded UUIDs

### Phase 2: E2E Test Data Setup (30 minutes)

#### Task 2.1: Create OAuth Test User
**Method**: Use existing OAuth flow to create real test user

**Steps:**
1. Navigate to production OAuth: `https://ginkocmp-dashboard.vercel.app`
2. Sign in with dedicated test GitHub account
3. Extract generated API key from user_profiles table  
4. Update E2E test configuration with real API key
5. Document test user setup for future use

#### Task 2.2: Update Test Configuration
**Files**:
- Update hardcoded test API key with OAuth-generated key
- Verify test user has proper user_profiles entry
- Test authentication flow end-to-end

### Phase 3: Validation & Testing (30 minutes)

#### Task 3.1: Local Testing
- `npm run build` - Verify compilation
- Test AuthManager with MVP schema queries
- Verify session capture/list operations

#### Task 3.2: Production Deployment
- Deploy to Vercel
- Test health endpoint (database connectivity)
- Test session capture with real OAuth user
- Test session list functionality

#### Task 3.3: E2E Validation
```bash
# Test session capture
curl -X POST "https://[deployment]/api/tools/call" \
  -H "Authorization: Bearer [oauth-generated-key]" \
  -d '{"name": "capture_session", "arguments": {"currentTask": "MVP schema validation"}}'

# Test session list
curl -X POST "https://[deployment]/api/tools/call" \
  -H "Authorization: Bearer [oauth-generated-key]" \
  -d '{"name": "list_sessions", "arguments": {}}'
```

### Phase 4: Documentation & Cleanup (15 minutes)

#### Task 4.1: Update Documentation
- Document MVP schema decision in ADR
- Update development setup instructions
- Document OAuth test user setup process

#### Task 4.2: Clean Up Code
- Remove unused full-schema code
- Remove complex user creation logic
- Update comments and type definitions

#### Task 4.3: Commit & Merge
```bash
git add -A
git commit -m "feat: align MCP server with MVP schema for production launch

- Update AuthManager to use user_profiles table with direct API key lookup
- Simplify session storage to reference auth.users.id directly  
- Remove complex org/team/project structure for MVP simplicity
- Update E2E tests to use OAuth-generated test user
- Enable session persistence with existing OAuth integration

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Chris Norton <chris@ginko.ai>
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin fix/mvp-schema-alignment
# Create PR for review
```

## Success Criteria

### Definition of Done
- [ ] Session capture works end-to-end
- [ ] Session list returns user's sessions
- [ ] OAuth users unaffected
- [ ] E2E tests pass with real OAuth user
- [ ] Zero production downtime
- [ ] Health endpoint shows "connected" status

### Validation Commands
```bash
# 1. Health check
curl https://[deployment]/api/health | jq .database.status

# 2. Session capture test  
curl -X POST https://[deployment]/api/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [oauth-key]" \
  -d '{"name": "capture_session", "arguments": {"currentTask": "Launch validation"}}'

# 3. Session list test
curl -X POST https://[deployment]/api/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [oauth-key]" \
  -d '{"name": "list_sessions", "arguments": {}}'
```

### Success Output
```json
{
  "result": {
    "content": [{
      "type": "text", 
      "text": "# Session Captured Successfully ✅\n\n**Session ID**: `abc-123-def`..."
    }]
  }
}
```

## Risk Mitigation

### Pre-Execution Validation
- [x] MVP schema has required tables (`sessions`, `user_profiles`) ✅
- [x] OAuth integration working in production ✅
- [x] Database connection established ✅

### Rollback Plan
- Feature branch approach allows easy rollback
- OAuth users unaffected (no schema changes)
- Quick revert: `git checkout main && vercel --prod`

### Monitoring
- Watch Vercel function logs during deployment
- Monitor health endpoint post-deployment
- Test with multiple OAuth users to verify no regression

## Timeline

**Total Estimated Time**: 2.5-3 hours

- **Phase 1 (Code Alignment)**: 1-2 hours
- **Phase 2 (E2E Setup)**: 30 minutes  
- **Phase 3 (Validation)**: 30 minutes
- **Phase 4 (Documentation)**: 15 minutes

**Target Completion**: Same day (2025-08-09)

## Post-Sprint Actions

### Immediate (Next 24 hours)
- [ ] Monitor production for any OAuth user issues
- [ ] Verify session persistence working for real users
- [ ] Update development environment setup guide

### Short-term (Next Sprint)
- [ ] Implement session analytics tracking
- [ ] Add session quality scoring
- [ ] Optimize session search functionality

### Long-term (Post-Launch)
- [ ] Evaluate need for org/team complexity based on user feedback
- [ ] Consider migration path if complex hierarchy needed
- [ ] Monitor usage patterns to guide future architecture decisions

---

## Notes

**Why MVP Schema is Right Choice:**
- Existing OAuth users depend on it ✅
- Simple = fewer failure points ✅  
- Faster to launch and learn ✅
- YAGNI principle applied ✅
- Database connection already working with this schema ✅

**Key Insight:** The "database persistence issue" was actually a "schema alignment issue" all along. The infrastructure works fine - we just need to write code that matches the deployed schema.