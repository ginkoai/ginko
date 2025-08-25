---
type: adr
status: approved
updated: 2025-08-04
tags: [architecture, authentication, security, mcp]
related: [ADR-004-identity-entitlements-billing.md, auth-manager.ts, remote-server.ts]
priority: high
audience: [developer, team]
estimated-read: 5-min
dependencies: [auth-manager.ts]
---

# ADR-007: Environment-Based Authentication for MCP Endpoints

## Status
Approved and Implemented

## Context

During initial development, MCP authentication was disabled to facilitate rapid development and testing. This created technical debt where production endpoints lacked proper authentication, creating a security vulnerability. We need a solution that:

1. Ensures production security
2. Maintains development velocity
3. Supports seamless local testing
4. Enables gradual rollout

## Decision

Implement environment-based authentication that adapts based on the deployment environment:

### Production Mode (NODE_ENV=production or REQUIRE_AUTH=true)
- Full authentication required via `createAuthMiddleware()`
- All MCP endpoints require valid API key
- 401 errors for unauthenticated requests
- Usage tracking and rate limiting enforced

### Development Mode (default)
- Optional authentication via `createOptionalAuthMiddleware()`
- Requests proceed with or without API key
- Authenticated requests get full user context
- Unauthenticated requests use fallback user object
- Maintains backward compatibility

### Implementation Details

```typescript
// remote-server.ts
private setupMCPAuthentication() {
  if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true') {
    // Require full authentication in production
    console.log('[AUTH] MCP endpoints require authentication (production mode)');
    this.app.use('/api/mcp', this.authManager.createAuthMiddleware());
  } else {
    // Optional authentication in development
    console.log('[AUTH] MCP endpoints using optional authentication (development mode)');
    this.app.use('/api/mcp', this.authManager.createOptionalAuthMiddleware());
  }
}
```

### Fallback User Object (Development Only)
```typescript
const user = req.user as AuthenticatedUser || {
  planTier: 'enterprise',
  planStatus: 'active',
  organizationId: 'local-dev',
  id: 'local-user',
  email: 'dev@localhost'
};
```

### Client Authentication Support
```typescript
// simple-remote-client.ts
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (this.apiKey) {
  headers['Authorization'] = `Bearer ${this.apiKey}`;
}
```

## Consequences

### Positive
- **Zero-downtime deployment** - No breaking changes for existing users
- **Secure by default in production** - Authentication automatically enforced
- **Development flexibility** - Local testing works without API keys
- **Gradual adoption** - Teams can opt-in to authentication via REQUIRE_AUTH
- **Clear audit trail** - Authentication mode logged on startup

### Negative
- **Configuration complexity** - Additional environment variables to manage
- **Testing overhead** - Need to test both authenticated and unauthenticated flows
- **Potential confusion** - Developers might forget production requires auth

### Migration Strategy

1. **Phase 1**: Deploy optional auth middleware (complete)
2. **Phase 2**: Update documentation and .env.example (complete)
3. **Phase 3**: Test in staging with REQUIRE_AUTH=true
4. **Phase 4**: Deploy to production with authentication enforced
5. **Phase 5**: Monitor logs for authentication failures
6. **Phase 6**: Provide API key generation UI in dashboard

## Security Considerations

- API keys must be kept secure and never committed to repositories
- Production logs should not contain full API keys
- Rate limiting should be enforced regardless of auth status
- Regular key rotation should be encouraged

## Monitoring

Track these metrics post-deployment:
- Authentication success/failure rates
- Fallback user usage in development
- API key adoption rate
- Performance impact of auth middleware

## Future Enhancements

1. **OAuth token support** - Allow GitHub OAuth tokens for MCP
2. **Scoped API keys** - Different permissions for different use cases
3. **Key rotation automation** - Automatic key rotation policies
4. **Multi-factor authentication** - Additional security for enterprise