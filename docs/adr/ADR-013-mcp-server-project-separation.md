---
type: decision
status: deprecated
updated: 2026-02-02
tags: [mcp, deployment, vercel, separation, production]
related: [ADR-009-serverless-first-mvp-architecture.md]
priority: high
audience: [developer, ai-agent, stakeholder]
estimated-read: 6-min
dependencies: [ADR-009]
---

# ADR-013: MCP Server Project Separation

**Status:** Deprecated (superseded by ADR-077 git-native CLI architecture)
**Date:** 2025-08-05
**Deprecated:** 2026-02-02
**Authors:** Claude Code Assistant, Chris Norton  
**Reviewers:** Chris Norton  
**Related:** [ADR-009](ADR-009-serverless-first-mvp-architecture.md)  

## Context

### Problem Statement
The MCP (Model Context Protocol) server endpoints were initially deployed as part of the main Ginko project structure, causing domain routing conflicts and deployment complexity. The domain `mcp.ginko.ai` was incorrectly routing to the dashboard project instead of serving MCP endpoints, breaking the end-to-end user journey for Claude Code integration.

### Business Context
MCP server availability is critical for Ginko's core value proposition - providing intelligent context management for Claude Code users. A broken MCP endpoint directly impacts:
- New user onboarding flow (95% complete, blocked on final MCP connection step)
- Production user experience for existing customers
- Developer confidence in the Ginko platform
- Claude Code integration reliability

### Technical Context  
Current architecture had MCP endpoints mixed with multiple concerns:
- Root project: Contains MCP API endpoints (`/api/mcp/*`) plus general utilities
- Dashboard project: Next.js app serving `app.ginko.ai` 
- Website project: Static marketing site serving `www.ginko.ai`
- Domain `mcp.ginko.ai` was misconfigured to point to dashboard instead of MCP endpoints

### Key Requirements
1. Dedicated MCP server accessible at `mcp.ginko.ai`
2. Clean separation of concerns between web UI and API services
3. Automated CI/CD pipeline for MCP server updates
4. Maintain existing MCP endpoint functionality and authentication
5. Enable independent scaling and deployment of MCP services

## Decision

We will create a dedicated `mcp-server` Vercel project that isolates MCP endpoints into their own deployment unit with dedicated domain routing.

### Chosen Solution
**Separate MCP Server Project Architecture:**
- Create `/mcp-server` directory containing only MCP-related code
- Deploy as dedicated Vercel project named `mcp-server`
- Configure `mcp.ginko.ai` domain to route exclusively to this project
- Implement automated GitHub-based deployment pipeline
- Maintain all existing API endpoints and authentication flows

### Implementation Approach
1. **Code Separation**: Copy MCP-specific files (`/api/mcp/*`, `/src/*`, `/database/*`) to `/mcp-server`
2. **Project Configuration**: Create optimized `vercel.json` for MCP endpoints only
3. **Domain Reassignment**: Move `mcp.ginko.ai` from dashboard to mcp-server project
4. **CI/CD Setup**: Connect mcp-server project to GitHub main branch with `/mcp-server` root directory
5. **Health Monitoring**: Add root path redirect to health endpoint for easy monitoring

## Architecture

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   MCP Server    │    │    Website      │
│                 │    │                 │    │                 │
│ app.ginko.ai│    │mcp.ginko.ai │    │www.ginko.ai │
│                 │    │                 │    │                 │
│ - User Auth     │    │ - /api/mcp/*    │    │ - Marketing     │
│ - Settings      │    │ - Health Check  │    │ - Landing Page  │
│ - Analytics     │    │ - Tools API     │    │ - Static Assets │
│ - Sessions      │    │ - Best Practices│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌─────────────────┐
                    │  Shared Services │
                    │                 │
                    │ - Supabase DB   │
                    │ - GitHub OAuth  │
                    │ - Stripe        │
                    └─────────────────┘
```

### Integration Points
- **Authentication**: Shared Supabase JWT validation across all projects
- **Database**: Common PostgreSQL instance with fallback to in-memory storage
- **Cross-Origin**: CORS headers configured for inter-project communication
- **Monitoring**: Health endpoints accessible from all projects

### Data Model Changes
No database schema changes required. MCP server uses existing tables:
- `best_practices` - Team best practices storage
- `sessions` - Context session data
- `user_profiles` - API key validation

## Alternatives Considered

### Option 1: Subdirectory Routing
**Description:** Use Vercel rewrites to route `mcp.ginko.ai` to `/api/mcp/*` within existing project  
**Pros:** No code duplication, single project to manage  
**Cons:** Complex routing rules, harder to debug, mixed concerns in single deployment  
**Decision:** Rejected due to routing complexity and debugging difficulties experienced

### Option 2: Separate Git Repository
**Description:** Create entirely separate repository for MCP server  
**Pros:** Complete isolation, independent versioning  
**Cons:** Code duplication, shared utility maintenance overhead, team coordination complexity  
**Decision:** Rejected to maintain monorepo benefits and shared development workflow

### Option 3: Docker Containerization
**Description:** Deploy MCP server as containerized service on cloud provider  
**Pros:** Maximum flexibility, resource control  
**Cons:** Increased operational complexity, higher costs, deviation from Vercel-first strategy  
**Decision:** Rejected to maintain consistency with ADR-009 serverless-first approach

## Consequences

### Positive Impacts
- **Clear Separation**: MCP concerns isolated from web UI concerns
- **Domain Reliability**: Dedicated routing eliminates configuration conflicts
- **Independent Scaling**: MCP server can scale based on API usage patterns
- **Simplified Debugging**: Issues clearly attributed to specific service
- **Faster Deployments**: Smaller deployment units with focused changes
- **Production Stability**: Reduced risk of UI changes affecting API availability

### Negative Impacts  
- **Code Duplication**: Shared utilities copied between projects
- **Maintenance Overhead**: Multiple projects to manage and monitor
- **Deployment Complexity**: Additional project configuration required
- **Team Coordination**: Changes affecting multiple projects need coordination

### Neutral Impacts
- **Development Workflow**: Same Git repository and branch strategy
- **Authentication Flow**: No changes to existing auth mechanisms
- **Database Access**: Same connection patterns and fallback strategies

### Migration Strategy
1. **Phase 1**: Create mcp-server project with copied codebase
2. **Phase 2**: Deploy and verify endpoints work correctly
3. **Phase 3**: Reassign domain from dashboard to mcp-server
4. **Phase 4**: Test end-to-end user journey completion
5. **Phase 5**: Setup GitHub auto-deployment pipeline

## Implementation Details

### Technical Requirements
- **Vercel Project**: Dedicated `mcp-server` project configuration
- **Build System**: TypeScript compilation with existing tsconfig.json
- **Environment Variables**: Shared database credentials and API keys
- **Monitoring**: Health endpoint at `/api/mcp/health` and root redirect

### Security Considerations
- **API Key Validation**: Maintains existing authentication patterns
- **CORS Configuration**: Proper cross-origin headers for dashboard integration
- **Environment Isolation**: Production secrets managed through Vercel environment variables
- **Database Access**: Read-only database access for most endpoints

### Performance Implications
- **Reduced Bundle Size**: Smaller deployment packages focused on MCP functionality
- **Faster Cold Starts**: Reduced serverless function initialization time
- **Independent Caching**: MCP endpoints can have different cache strategies
- **Resource Optimization**: CPU and memory allocated specifically for API workloads

### Operational Impact
- **Monitoring**: Additional project to monitor in Vercel dashboard
- **Deployment**: Automated GitHub triggers for main branch changes
- **Logging**: Centralized logging through Vercel functions
- **Backup Strategy**: Database backups unchanged, code backed up in Git

## Monitoring and Success Metrics

### Key Performance Indicators
- **Endpoint Availability**: 99.9% uptime for `/api/mcp/health`
- **Response Time**: <200ms p95 response time for health checks
- **Error Rate**: <0.1% error rate for authenticated requests
- **User Journey Completion**: 100% success rate for end-to-end NPX installer flow

### Monitoring Strategy
- **Health Checks**: Automated monitoring of mcp.ginko.ai/api/mcp/health
- **Vercel Analytics**: Function execution metrics and error tracking
- **Alert Configuration**: Slack notifications for deployment failures
- **Performance Tracking**: Response time monitoring for all MCP endpoints

### Success Criteria
- ✅ `mcp.ginko.ai` serves MCP endpoints correctly
- ✅ NPX installer completes successfully with MCP server connection
- ✅ Auto-deployment pipeline works from GitHub commits
- ✅ No increase in overall system error rates

### Failure Criteria
- Domain routing still fails after migration
- Increased error rates in MCP endpoint responses
- Auto-deployment pipeline breaks or becomes unreliable
- User journey completion rate decreases

## Risks and Mitigations

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Code drift between projects | Medium | Medium | Shared utility library, regular sync reviews |
| Domain propagation delays | Low | Low | Test domain routing before full migration |
| Deployment pipeline failures | High | Low | Manual deployment fallback, monitoring alerts |
| Authentication token issues | High | Low | Shared token validation, extensive testing |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| User journey disruption | High | Low | Staged rollout, immediate rollback capability |
| Increased operational costs | Low | Medium | Monitor Vercel usage, optimize function sizes |
| Team productivity impact | Medium | Low | Clear documentation, automated processes |

## Timeline and Milestones

### Implementation Phases
- **Phase 1** (Completed): Create mcp-server directory and copy codebase
- **Phase 2** (Completed): Deploy mcp-server as new Vercel project
- **Phase 3** (Completed): Reassign mcp.ginko.ai domain
- **Phase 4** (Completed): Verify end-to-end functionality
- **Phase 5** (Completed): Setup GitHub auto-deployment

### Key Milestones
- **2025-08-05**: ✅ MCP server project created and deployed
- **2025-08-05**: ✅ Domain routing configured and tested
- **2025-08-05**: ✅ Auto-deployment pipeline verified
- **2025-08-05**: ✅ End-to-end user journey validated

## Review and Updates

### Review Schedule
Review this decision quarterly or when:
- Significant changes to Vercel platform capabilities
- Major updates to MCP specification
- Team workflow changes affecting multi-project management
- Performance or reliability issues with current architecture

### Update History
| Date | Author | Changes |
|------|--------|---------|
| 2025-08-05 | Claude Code Assistant, Chris Norton | Initial version - implemented and approved |

## References

### Documentation
- [MCP Server Project README](../../mcp-server/README.md)
- [Vercel Multi-Project Configuration](../../docs/setup/vercel-deployment-guide.md)
- [ADR-009: Serverless-First MVP Architecture](ADR-009-serverless-first-mvp-architecture.md)

### External References
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Vercel Project Configuration](https://vercel.com/docs/projects/overview)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)

### Code References
- Implementation: `mcp-server/api/mcp/health.ts`
- Configuration: `mcp-server/vercel.json`
- Deployment: `.github/workflows` (auto-configured by Vercel)

---

**Implementation Status:** ✅ Complete and Approved  
**Production Status:** ✅ Live at mcp.ginko.ai  
**End-to-End Validation:** ✅ User journey 100% functional