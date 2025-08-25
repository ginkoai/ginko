---
type: decision
status: approved
updated: 2025-01-31
tags: [infrastructure, mvp, supabase, vercel, architecture]
related: [supabase-setup-guide.md, vercel-deployment-guide.md]
priority: critical
audience: [developer, ai-agent]
estimated-read: 10-min
dependencies: [UX-001]
---

# ADR-001: Infrastructure Stack Selection

## Status
Approved

## Context
ContextMCP needs to select an infrastructure stack for its MVP launch. As a solo entrepreneur project with 100% Claude Code development and a $100/month infrastructure budget constraint, we need to optimize for development speed, cost efficiency, and maintainability.

Key constraints:
- Solo developer with limited DevOps time
- $100/month infrastructure budget until 1000 signups
- All code written by Claude Code
- 4-week MVP timeline requirement
- Must handle 0-10K users efficiently

## Decision
We will use **Vercel + Supabase** as our primary infrastructure stack instead of AWS Lambda + DynamoDB/RDS.

## Rationale

### Development Speed (10x faster)
- **Vercel + Supabase**: 30 minutes to production deployment
- **AWS**: 2-3 days for basic setup
- Claude Code can work more effectively with simpler infrastructure

### Cost Efficiency
- **0-500 users**: $0/month (vs AWS $50-55/month)
- **500-5K users**: $45/month (vs AWS $115/month)
- Stays within $100/month budget until ~7K users

### Developer Experience
```typescript
// Vercel + Supabase (5 lines for auth)
const { user } = await supabase.auth.signInWithOAuth({
  provider: 'github'
})

// AWS (days of setup for Cognito + IAM + API Gateway)
```

### Key Trade-offs Accepted
1. **Performance**: 50-200ms latency vs AWS 20-100ms (acceptable for MVP)
2. **Vendor lock-in**: Mitigated by abstraction layer for future migration
3. **Scale limits**: Sufficient for 10K+ users before needing migration
4. **Less control**: Acceptable trade for 10x development speed

## Consequences

### Positive
- Launch MVP in 4 weeks instead of 12
- $0 infrastructure cost during validation phase
- Automatic scaling without configuration
- Built-in auth, database, hosting, CDN
- Preview deployments on every PR
- Excellent Claude Code compatibility

### Negative
- Bandwidth costs escalate at scale ($150-300/month at 10K users)
- Single-region database (latency for global users)
- Function execution limits (60s max)
- Less flexibility for custom requirements
- Migration complexity if switching later

### Neutral
- Similar vendor lock-in to AWS
- Both require learning platform-specific patterns
- Migration path exists but requires planning

## Migration Strategy
If we need to migrate to AWS after product-market fit:

```typescript
// Abstraction layer from day 1
interface DatabaseService {
  getSession(id: string): Promise<Session>
  saveSession(session: Session): Promise<void>
}

// Easy to swap implementations
class SupabaseDB implements DatabaseService { }
class DynamoDB implements DatabaseService { }
```

## Alternatives Considered

### AWS Lambda + DynamoDB/RDS
- **Pros**: Better performance, infinite scale, more control
- **Cons**: 10x slower development, $50+/month minimum, complex DevOps
- **Rejected because**: Time-to-market more important than optimization

### Railway/Render + PostgreSQL
- **Pros**: Simple deployment, good DX
- **Cons**: Less ecosystem, manual auth setup
- **Rejected because**: Supabase provides more built-in features

### Firebase
- **Pros**: Good DX, real-time features
- **Cons**: NoSQL only, Google lock-in, poor SQL support
- **Rejected because**: Need relational database for our use case

## Review Schedule
Review this decision when:
- Reaching 5K active users
- Infrastructure costs exceed $200/month
- Performance becomes user complaint
- Need multi-region deployment

## References
- [Vercel Pricing](https://vercel.com/pricing)
- [Supabase Pricing](https://supabase.com/pricing)
- [AWS Lambda Pricing Calculator](https://calculator.aws)
- Internal analysis: UX-004-infrastructure-comparison.md

## Approval
- **Author**: Chris Norton
- **Date**: 2025-01-31
- **Reviewers**: Chris Norton
- **Approval**: Approved