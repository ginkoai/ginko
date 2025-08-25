---
type: adr
status: approved
updated: 2025-08-04
tags: [architecture, infrastructure, mvp, serverless, websockets]
related: [ADR-001-infrastructure-stack-selection.md, remote-server.ts, BACKLOG.md]
priority: high
audience: [developer, team, stakeholder]
estimated-read: 8-min
dependencies: [remote-server.ts]
---

# ADR-008: Serverless-First Architecture for MVP

## Status
Approved

## Context

Ginko currently uses a hybrid architecture:
- **Dashboard**: Deployed on Vercel (Next.js)
- **MCP Server**: Running locally with Socket.io for WebSockets

This split infrastructure causes several pain points:
1. **Connection Issues**: WebSocket disconnects degrade developer experience
2. **Deployment Complexity**: Two separate deployment pipelines
3. **Debugging Difficulty**: Issues span multiple services
4. **Velocity Impact**: Infrastructure management slows feature development

Additionally, our authentication changes need production testing, but deploying the current MCP server architecture requires additional infrastructure setup.

## Decision

Remove WebSocket dependencies and deploy the MCP server as Vercel serverless functions alongside the dashboard.

### Implementation Strategy

1. **Remove Socket.io** from the MCP server
2. **Convert WebSocket events** to database writes
3. **Implement polling** for activity feeds (if needed)
4. **Deploy as Vercel API routes** in the same project as the dashboard
5. **Use Vercel KV or database** for state management

### Code Architecture Changes

```typescript
// Before: WebSocket-based
class CollaborativeContextManager {
  broadcastActivity(activity) {
    this.io.to(`team:${teamId}`).emit('activity', activity);
  }
}

// After: Database-based  
class CollaborativeContextManager {
  async broadcastActivity(activity) {
    await this.db.recordActivity(teamId, activity);
    // Clients poll /api/mcp/activity?since=timestamp
  }
}
```

## Consequences

### Positive
- **Unified Deployment**: Single `git push` deploys everything
- **Improved Reliability**: No WebSocket connection drops
- **Faster Development**: 50% reduction in infrastructure tasks
- **Automatic Scaling**: Vercel handles load balancing
- **Simplified Debugging**: All logs in one place
- **Cost Effective**: Generous free tier for MVP
- **Better DX**: Claude's MCP client prefers stateless HTTP

### Negative  
- **No Real-time Updates**: Must use polling (30s intervals)
- **Refactoring Required**: Remove Socket.io code
- **Future Migration**: May need to re-add WebSockets post-PMF
- **Polling Overhead**: Slight increase in API calls

### Neutral
- **Database Load**: Activity writes instead of WebSocket broadcasts
- **Client Changes**: Update any real-time UI to polling

## Technical Details

### Vercel API Structure
```
/api/
  /mcp/
    /tools/
      list.ts      # GET /api/mcp/tools/list
      call.ts      # POST /api/mcp/tools/call
    /activity.ts   # GET /api/mcp/activity?since=timestamp
    /sessions/
      list.ts      # GET /api/mcp/sessions
      capture.ts   # POST /api/mcp/sessions/capture
      resume.ts    # GET /api/mcp/sessions/:id
    /health.ts     # GET /api/mcp/health
```

### Environment Variables
```env
# Shared between dashboard and API
DATABASE_URL=...
NEXTAUTH_SECRET=...
NODE_ENV=production
```

### Polling Strategy
```typescript
// Client-side polling for team activity
const useTeamActivity = () => {
  const { data, error } = useSWR(
    '/api/mcp/activity?since=' + lastUpdate,
    fetcher,
    { refreshInterval: 30000 } // 30 second polling
  );
  return { activity: data, error };
};
```

## Migration Plan

### Phase 1: Remove WebSockets (Week 1)
1. Remove Socket.io dependencies
2. Convert broadcasts to database writes
3. Add activity polling endpoint
4. Test locally

### Phase 2: Create API Routes (Week 1)  
1. Create `/api/mcp/` directory structure
2. Port Express routes to Vercel functions
3. Update authentication middleware
4. Test with local Vercel dev

### Phase 3: Deploy and Test (Week 2)
1. Deploy to Vercel preview
2. Test authentication in production
3. Update MCP client configuration
4. Monitor performance

### Phase 4: Optimize (Week 2)
1. Add caching where appropriate
2. Implement rate limiting
3. Add monitoring/alerts
4. Document new architecture

## Alternatives Considered

### 1. Separate WebSocket Service
- **Pros**: Keep real-time features
- **Cons**: Complex infrastructure, connection issues persist
- **Rejected**: Violates "do things that don't scale" principle

### 2. Managed WebSocket Service (Pusher/Ably)
- **Pros**: Reliable WebSockets
- **Cons**: Another dependency, additional cost
- **Rejected**: Overkill for MVP needs

### 3. Edge Runtime with WebSockets
- **Pros**: Modern architecture
- **Cons**: Experimental, limited ecosystem
- **Rejected**: Too bleeding edge for MVP

### 4. Different Platform (Railway/Render)
- **Pros**: Full Node.js support
- **Cons**: Separate deployment pipeline
- **Rejected**: Increases complexity

## Success Metrics

- **Deployment Time**: < 2 minutes (from git push)
- **Connection Failures**: 0 (no WebSockets to drop)
- **API Response Time**: < 200ms p95
- **Development Velocity**: 50% faster feature delivery
- **Infrastructure Costs**: < $20/month during MVP

## Future Considerations

When real-time features become critical (post-PMF):
1. **Option 1**: Add Supabase Realtime for specific features
2. **Option 2**: Implement Server-Sent Events (SSE)
3. **Option 3**: Migrate to platform with WebSocket support
4. **Option 4**: Hybrid approach with Vercel + WebSocket microservice

## References

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- ["Do Things That Don't Scale"](http://paulgraham.com/ds.html) - Paul Graham