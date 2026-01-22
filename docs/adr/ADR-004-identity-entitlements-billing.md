---
type: decision
status: approved
updated: 2025-08-01
tags: [identity, authentication, authorization, billing, entitlements, stripe, oauth]
related: [ADR-062-oauth-authentication-architecture.md, database.ts, remote-server.ts]
priority: critical
audience: [developer, ai-agent, business]
estimated-read: 15-min
dependencies: [ADR-001, ADR-003]
---

# ADR-004: Identity, Entitlements, and Billing Architecture

## Status
Approved

## Context

ContextMCP currently operates as an open-access service without user authentication, plan-based feature restrictions, or monetization capabilities. To transition from MVP to sustainable SaaS business, we need:

1. **User Identity**: Link Claude Code sessions to authenticated users
2. **Feature Entitlements**: Enforce plan-based access controls (Free/Pro/Enterprise)  
3. **Billing Integration**: Usage tracking and subscription management
4. **Organization Management**: Multi-tenant architecture for teams

### Current State Analysis
- **Authentication**: None - all users access same "default-team"
- **Authorization**: No feature restrictions or rate limiting
- **Billing**: No payment processing or subscription management
- **Multi-tenancy**: Basic team/project structure exists but not enforced
- **Usage Tracking**: Activity logging exists but no billing integration

### Business Requirements
- **Free Tier**: 1 project, 50 sessions/month, basic features
- **Pro Tier**: 10 projects, 1000 sessions/month, team collaboration
- **Enterprise Tier**: Unlimited usage, SSO, priority support
- **Revenue Target**: $10K MRR within 6 months

## Decision

We will implement a **three-layer architecture** for identity, entitlements, and billing:

### Layer 1: Identity & Authentication
**MCP Client Authentication** via API keys embedded in Claude Code configuration

### Layer 2: Authorization & Entitlements  
**Real-time enforcement** at tool/endpoint level with plan-based feature gates

### Layer 3: Billing & Usage Tracking
**Stripe integration** with usage-based billing and subscription management

## Architecture Design

### 1. User Identity Linking

#### MCP Client Authentication Flow
```typescript
// .claude-config.json enhancement
{
  "mcpServers": {
    "context-mcp": {
      "command": "node",
      "args": ["dist/simple-remote-client.js"],
      "env": {
        "CONTEXTMCP_API_KEY": "cmcp_sk_live_abc123...",
        "CONTEXTMCP_SERVER_URL": "https://api.contextmcp.com"
      }
    }
  }
}
```

#### Server-Side Authentication
```typescript
interface AuthenticatedUser {
  id: string;              // UUID from users table
  email: string;           // Primary identifier  
  organizationId: string;  // Billing entity
  teamId: string;          // Collaboration unit
  planTier: PlanTier;      // free | pro | enterprise
  permissions: string[];   // Feature access list
  apiKeyHash: string;      // Secure key storage
}

class AuthenticationMiddleware {
  async authenticateRequest(apiKey: string): Promise<AuthenticatedUser> {
    const keyHash = this.hashApiKey(apiKey);
    const user = await this.db.getUserByApiKey(keyHash);
    
    if (!user || !this.isKeyValid(user)) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    await this.updateLastActive(user.id);
    return user;
  }
}
```

### 2. Plan Tier Entitlements System

#### Feature Gate Architecture
```typescript
interface PlanLimits {
  maxProjects: number;           // -1 = unlimited
  maxTeamMembers: number;        
  maxSessionsPerMonth: number;   
  maxContextCacheSize: number;   // MB
  maxBestPractices: number;      
  features: Set<FeatureFlag>;    // Granular permissions
  rateLimit: {                   // Requests per minute
    contextQueries: number;
    sessionCreation: number;
    gitWebhooks: number;
  };
}

enum FeatureFlag {
  // Core Features
  BASIC_CONTEXT = 'basic_context',
  LOCAL_SESSIONS = 'local_sessions',
  
  // Collaboration Features  
  TEAM_COLLABORATION = 'team_collaboration',
  REAL_TIME_SYNC = 'real_time_sync',
  SESSION_HANDOFF = 'session_handoff',
  
  // Integration Features
  GIT_INTEGRATION = 'git_integration',
  WEBHOOK_PROCESSING = 'webhook_processing',
  BEST_PRACTICES_MGMT = 'best_practices_mgmt',
  
  // Analytics Features
  USAGE_ANALYTICS = 'usage_analytics',
  TEAM_INSIGHTS = 'team_insights',
  PERFORMANCE_METRICS = 'performance_metrics',
  
  // Enterprise Features
  SSO_INTEGRATION = 'sso_integration',
  CUSTOM_INTEGRATIONS = 'custom_integrations',
  PRIORITY_SUPPORT = 'priority_support',
  WHITE_LABEL = 'white_label'
}

const PLAN_CONFIGURATIONS: Record<PlanTier, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxTeamMembers: 1,
    maxSessionsPerMonth: 50,
    maxContextCacheSize: 100,
    maxBestPractices: 10,
    features: new Set([
      FeatureFlag.BASIC_CONTEXT,
      FeatureFlag.LOCAL_SESSIONS
    ]),
    rateLimit: {
      contextQueries: 30,
      sessionCreation: 10,
      gitWebhooks: 0
    }
  },
  pro: {
    maxProjects: 10,
    maxTeamMembers: 10,
    maxSessionsPerMonth: 1000,
    maxContextCacheSize: 1000,
    maxBestPractices: 50,
    features: new Set([
      FeatureFlag.BASIC_CONTEXT,
      FeatureFlag.LOCAL_SESSIONS,
      FeatureFlag.TEAM_COLLABORATION,
      FeatureFlag.REAL_TIME_SYNC,
      FeatureFlag.SESSION_HANDOFF,
      FeatureFlag.GIT_INTEGRATION,
      FeatureFlag.WEBHOOK_PROCESSING,
      FeatureFlag.BEST_PRACTICES_MGMT,
      FeatureFlag.USAGE_ANALYTICS
    ]),
    rateLimit: {
      contextQueries: 200,
      sessionCreation: 50,
      gitWebhooks: 100
    }
  },
  enterprise: {
    maxProjects: -1,
    maxTeamMembers: -1,
    maxSessionsPerMonth: -1,
    maxContextCacheSize: 10000,
    maxBestPractices: -1,
    features: new Set(Object.values(FeatureFlag)),
    rateLimit: {
      contextQueries: 1000,
      sessionCreation: 200,
      gitWebhooks: 500
    }
  }
};
```

#### Enforcement Middleware
```typescript
class EntitlementEnforcer {
  async checkFeatureAccess(
    user: AuthenticatedUser, 
    feature: FeatureFlag, 
    context?: any
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    
    if (!limits.features.has(feature)) {
      throw new ForbiddenError(`Feature ${feature} not available on ${user.planTier} plan`);
    }
    
    return true;
  }
  
  async checkUsageLimit(
    user: AuthenticatedUser,
    resource: string,
    action: string
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    const currentUsage = await this.usageTracker.getCurrentUsage(
      user.organizationId, 
      resource,
      'month'
    );
    
    const limit = limits[`max${resource}PerMonth`];
    if (limit !== -1 && currentUsage >= limit) {
      throw new UsageLimitExceededError(
        `Monthly ${resource} limit exceeded (${currentUsage}/${limit})`
      );
    }
    
    return true;
  }
}
```

### 3. Organization Hierarchy

#### Database Schema Enhancement
```sql
-- Organizations (billing entities)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  plan_status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  billing_email TEXT NOT NULL,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (identity & access)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  api_key_hash TEXT UNIQUE,
  api_key_prefix TEXT, -- First 8 chars for display
  last_active TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Organization invitations
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for billing
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL, -- session_create, context_query, git_webhook, etc.
  resource_id UUID, -- project_id, session_id, etc.
  quantity INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plan usage summaries (for quick lookups)
CREATE TABLE usage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  event_type TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, period_start, period_end, event_type)
);
```

### 4. Billing Integration

#### Stripe Integration Architecture
```typescript
class BillingManager {
  private stripe: Stripe;
  
  async createCustomer(organization: Organization): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: organization.billingEmail,
      name: organization.name,
      metadata: {
        organizationId: organization.id
      }
    });
    
    await this.db.updateOrganization(organization.id, {
      stripeCustomerId: customer.id
    });
    
    return customer.id;
  }
  
  async createSubscription(
    customerId: string, 
    planTier: PlanTier
  ): Promise<Stripe.Subscription> {
    const priceId = this.getPriceIdForPlan(planTier);
    
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14,
      metadata: {
        planTier
      }
    });
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }
}
```

#### Usage Tracking System
```typescript
class UsageTracker {
  async trackEvent(
    organizationId: string,
    userId: string,
    eventType: string,
    resourceId?: string,
    quantity: number = 1,
    metadata?: any
  ): Promise<void> {
    // Real-time tracking for rate limiting
    const monthKey = `usage:${organizationId}:${eventType}:${this.getCurrentMonth()}`;
    await this.redis.incrby(monthKey, quantity);
    await this.redis.expire(monthKey, 2592000); // 30 days
    
    // Persistent tracking for billing
    await this.db.recordUsageEvent({
      organizationId,
      userId,
      eventType,
      resourceId,
      quantity,
      metadata
    });
    
    // Update usage summaries (batch process)
    await this.updateUsageSummary(organizationId, eventType, quantity);
  }
  
  async getCurrentUsage(
    organizationId: string,
    eventType: string,
    period: 'month' | 'day' = 'month'
  ): Promise<number> {
    const key = `usage:${organizationId}:${eventType}:${this.getCurrentPeriod(period)}`;
    const usage = await this.redis.get(key);
    return parseInt(usage || '0');
  }
  
  async checkRateLimit(
    organizationId: string,
    eventType: string,
    user: AuthenticatedUser
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    const currentUsage = await this.getCurrentUsage(organizationId, eventType, 'minute');
    const rateLimit = limits.rateLimit[eventType];
    
    if (rateLimit && currentUsage >= rateLimit) {
      throw new RateLimitExceededError(`Rate limit exceeded for ${eventType}`);
    }
    
    return true;
  }
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. **Database Schema**: Add organizations, users, usage_events tables
2. **API Key Authentication**: Generate and validate API keys
3. **Basic Entitlements**: Implement feature flags and usage limits
4. **Usage Tracking**: Basic event recording system

### Phase 2: Billing Integration (Week 3-4)  
1. **Stripe Setup**: Customer creation, subscription management
2. **Webhook Processing**: Handle subscription lifecycle events
3. **Plan Management**: Upgrade/downgrade flows
4. **Usage Summaries**: Efficient billing calculations

### Phase 3: Advanced Features (Week 5-6)
1. **Organization Management**: Team invitations, role management
2. **Rate Limiting**: Redis-based real-time enforcement
3. **Admin Dashboard**: Usage monitoring, customer management
4. **Compliance**: Data retention, audit logs

### Phase 4: Enterprise Features (Week 7-8)
1. **SSO Integration**: SAML/OAuth2 for enterprises
2. **Custom Integrations**: Webhook APIs, custom best practices
3. **White Label**: Custom branding for enterprise customers
4. **Priority Support**: Dedicated support channels

## Security Considerations

### API Key Management
- **Generation**: Cryptographically secure random keys
- **Storage**: Hash-based storage (never store plaintext)
- **Rotation**: Automatic expiration and renewal
- **Scoping**: Organization and feature-level permissions

### Data Privacy
- **Isolation**: Organization-level data segregation
- **Encryption**: At-rest and in-transit encryption
- **Access Control**: Role-based permissions
- **Audit Logs**: Complete activity tracking

### Rate Limiting
- **DDoS Protection**: Redis-based sliding window
- **Fair Usage**: Per-organization limits
- **Graceful Degradation**: Clear error messages
- **Monitoring**: Real-time usage alerts

## Monitoring & Observability

### Key Metrics
```typescript
interface BillingMetrics {
  // Revenue Metrics
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  churnRate: number;
  
  // Usage Metrics
  activeUsers: number;
  sessionsPerUser: number;
  contextQueriesPerSession: number;
  storageUsagePerOrg: number;
  
  // Performance Metrics
  authenticationLatency: number;
  entitlementCheckLatency: number;
  usageTrackingLatency: number;
  rateLimitAccuracy: number;
}
```

### Alerting
- **Billing Failures**: Failed payments, subscription cancellations
- **Usage Spikes**: Unusual activity patterns, potential abuse
- **Performance Issues**: Authentication timeouts, database errors
- **Security Events**: Invalid API keys, rate limit violations

## Success Criteria

### Technical Metrics
- **Authentication**: <100ms API key validation
- **Authorization**: <50ms entitlement checks  
- **Usage Tracking**: <10ms event recording
- **Billing Accuracy**: 99.9% invoice accuracy

### Business Metrics
- **Conversion Rate**: 15% free-to-paid conversion
- **Customer Satisfaction**: >4.5/5 billing experience
- **Revenue Growth**: $10K MRR within 6 months
- **Churn Rate**: <5% monthly churn

## Risks & Mitigation

### Technical Risks
- **API Key Leakage**: Implement key rotation, monitoring
- **Usage Tracking Drift**: Real-time vs batch reconciliation
- **Stripe Integration**: Comprehensive webhook testing
- **Rate Limiting Bypass**: Multiple validation layers

### Business Risks  
- **Pricing Strategy**: A/B testing, customer feedback
- **Competitive Response**: Unique value propositions
- **Customer Support**: Comprehensive documentation, support tooling
- **Compliance**: GDPR/SOC2 preparation

## Conclusion

This architecture provides a comprehensive foundation for transforming ContextMCP from an open MVP to a sustainable SaaS business. The three-layer approach (Identity → Entitlements → Billing) ensures scalable growth while maintaining security and performance.

The design leverages existing infrastructure (Supabase, Vercel) while adding necessary commercial capabilities. Implementation follows a phased approach to minimize risk and enable iterative improvement based on customer feedback.

**Next Steps:**
1. Begin Phase 1 implementation
2. Set up Stripe test environment
3. Design API key generation system
4. Update BACKLOG.md with detailed implementation tasks