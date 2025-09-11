# Reflection Pattern Examples

## Real-World Usage Examples

This document demonstrates practical applications of the Universal Reflection Pattern across different domains.

## 1. Backlog Domain Examples

### Creating a Feature

```bash
# Natural language intent
ginko reflect "create a feature for implementing real-time notifications"

# Explicit domain
ginko reflect --domain backlog "add webhook support for GitHub integration"

# Using shortcut
ginko backlog ai "implement user authentication with OAuth"
```

**Generated Reflection Prompt:**
```xml
<reflection-task domain="backlog">

INTENT: "create a feature for implementing real-time notifications"

CURRENT CONTEXT:
- Branch: feature/notifications
- In Progress: FEATURE-025 (API restructuring)
- High Priority: 3 items pending

TEMPLATE REQUIREMENTS:
- metadata (type, title, priority, size)
- problem_statement
- solution_approach
- acceptance_criteria
- technical_notes
- relationships

REFLECTION INSTRUCTIONS:
1. Analyze the intent to determine item type (feature)
2. Consider current work in progress
3. Set appropriate priority based on impact
4. Estimate size based on complexity
5. Create comprehensive content for all sections

</reflection-task>
```

**AI Response Example:**
```markdown
## Execute Command:
```bash
ginko backlog create feature "Real-time notification system" -p high -s L
```

## Then Create Content:
### Problem Statement
Users currently must refresh the page to see updates, leading to missed important information and poor user experience. Support teams report 40% of complaints relate to delayed notifications.

### Solution Approach
Implement WebSocket-based real-time notifications using Socket.io:
- Server-side event emission for key actions
- Client-side listeners with reconnection logic
- Fallback to polling for unsupported browsers
- Redis pub/sub for multi-server support

### Acceptance Criteria
- [ ] Users receive notifications within 2 seconds of trigger
- [ ] Notifications persist across page refreshes
- [ ] System handles 10,000 concurrent connections
- [ ] Graceful degradation for offline users
- [ ] Admin can configure notification types

### Technical Notes
Dependencies: socket.io, redis, @types/socket.io
Security: JWT authentication for WebSocket connections
Performance: Max 100ms latency, connection pooling

### Relationships
Parent: EPIC-008 (Enhanced User Experience)
Related: FEATURE-022 (User preferences), STORY-145 (Email notifications)
Blocks: STORY-201 (Mobile push notifications)
```

## 2. Documentation Domain Examples

### Generating API Documentation

```bash
# Generate comprehensive API docs
ginko reflect --domain documentation "create API documentation for the auth module"

# Update existing documentation
ginko reflect --domain documentation "update README with latest features"
```

**Generated Reflection Prompt:**
```xml
<reflection-task domain="documentation">

INTENT: "create API documentation for the auth module"

PROJECT INFORMATION:
- Name: @ginko/auth
- Version: 2.1.0
- Technologies: TypeScript, Express, JWT
- Has tests: true
- Has existing docs: partial

TEMPLATE REQUIREMENTS:
- overview
- installation
- getting_started
- api_reference
- configuration
- examples
- troubleshooting

REFLECTION INSTRUCTIONS:
1. Document all public APIs in auth module
2. Include authentication flow diagrams
3. Provide code examples for common use cases
4. Document error codes and handling
5. Include migration guide from v1.x

</reflection-task>
```

**AI Response Example:**
```markdown
# Auth Module API Documentation

## Overview
The `@ginko/auth` module provides secure, token-based authentication for Node.js applications. It supports JWT tokens, refresh tokens, and OAuth2 integration.

## Installation
```bash
npm install @ginko/auth
```

## Getting Started
```javascript
import { AuthManager } from '@ginko/auth';

const auth = new AuthManager({
  secret: process.env.JWT_SECRET,
  expiresIn: '1h',
  refreshTokenExpiry: '7d'
});

// Generate tokens
const { accessToken, refreshToken } = await auth.generateTokens(userId);
```

## API Reference

### AuthManager

#### constructor(options: AuthOptions)
Creates a new authentication manager instance.

**Parameters:**
- `options.secret` (string): JWT signing secret
- `options.expiresIn` (string): Access token expiry (default: '1h')
- `options.refreshTokenExpiry` (string): Refresh token expiry (default: '7d')
- `options.issuer` (string): JWT issuer claim

#### generateTokens(userId: string, claims?: object)
Generates access and refresh token pair.

**Returns:** `Promise<{ accessToken: string, refreshToken: string }>`

**Example:**
```javascript
const tokens = await auth.generateTokens('user123', { 
  role: 'admin',
  permissions: ['read', 'write']
});
```

[... continues with full API documentation ...]
```

## 3. Testing Domain Examples

### Generating Test Suites

```bash
# Generate tests for a module
ginko reflect --domain testing "create comprehensive tests for the payment service"

# Generate integration tests
ginko reflect --domain testing "write integration tests for API endpoints"
```

**Generated Test Suite Example:**
```javascript
describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockStripe: jest.Mocked<Stripe>;
  
  beforeEach(() => {
    mockStripe = createMockStripe();
    paymentService = new PaymentService(mockStripe);
  });
  
  describe('processPayment', () => {
    it('should successfully process valid payment', async () => {
      // Arrange
      const payment = {
        amount: 1000,
        currency: 'usd',
        source: 'tok_visa'
      };
      mockStripe.charges.create.mockResolvedValue({ id: 'ch_123' });
      
      // Act
      const result = await paymentService.processPayment(payment);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.chargeId).toBe('ch_123');
      expect(mockStripe.charges.create).toHaveBeenCalledWith(payment);
    });
    
    it('should handle declined cards gracefully', async () => {
      // Test implementation
    });
    
    it('should validate payment amounts', async () => {
      // Test implementation
    });
  });
});
```

## 4. Architecture Domain Examples

### Creating ADRs

```bash
# Create architecture decision record
ginko reflect --domain architecture "decide on caching strategy for API responses"
```

**Generated ADR Example:**
```markdown
# ADR-015: API Response Caching Strategy

## Status
Proposed

## Context
API response times are averaging 800ms for complex queries. User surveys indicate performance is the #1 complaint. We need a caching strategy that balances performance with data freshness.

## Decision
Implement a multi-layer caching strategy:
1. **CDN Edge Caching**: Static assets and public API responses (1hr TTL)
2. **Redis Cache**: User-specific data and session state (5min TTL)
3. **Application Memory Cache**: Frequently accessed reference data (1min TTL)

## Alternatives Considered
1. **Database Query Caching Only**: Simpler but limited improvement (200ms reduction)
2. **Full Page Caching**: Better performance but stale data issues
3. **No Caching**: Maintains data freshness but poor performance

## Consequences

### Positive
- 75% reduction in average response time (800ms → 200ms)
- Reduced database load by 60%
- Better user experience and satisfaction

### Negative
- Increased infrastructure complexity
- Cache invalidation challenges
- Additional Redis infrastructure cost ($200/month)

### Neutral
- Requires monitoring and cache hit rate optimization
- Team needs Redis expertise

## Implementation Plan
1. Week 1: Set up Redis cluster and connection pooling
2. Week 2: Implement caching layer with invalidation logic
3. Week 3: Add cache warming and monitoring
4. Week 4: Performance testing and optimization
```

## 5. Debugging Domain Examples

### Investigation Template

```bash
# Debug production issue
ginko reflect --domain debugging "investigate intermittent login failures in production"
```

**Generated Investigation Plan:**
```markdown
# Debug Investigation: Intermittent Login Failures

## Symptoms
- 5% of login attempts fail with "Service Unavailable"
- Occurs during high traffic periods (10am-2pm)
- No pattern in affected users
- Started after deployment on 2025-09-10

## Hypothesis
1. **Database connection pool exhaustion** (Most likely)
2. Rate limiting triggering false positives
3. JWT token validation timeout
4. Redis session store connectivity issues

## Investigation Steps

### Step 1: Check Database Connections
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```
Result: Max connections (100) being reached during peak

### Step 2: Analyze Application Logs
```bash
grep "connection timeout" app.log | wc -l
# Result: 1,247 timeouts in last 24h
```

### Step 3: Review Recent Changes
```bash
git diff v2.1.0..v2.2.0 -- src/auth/
```
Found: Connection pool size reduced from 50 to 20

## Root Cause
Database connection pool size was inadvertently reduced in commit abc123, causing connection exhaustion during peak traffic.

## Fix Approach
1. Immediate: Increase pool size to 50
2. Short-term: Implement connection pooling metrics
3. Long-term: Auto-scaling connection pool based on load

## Verification
- Monitor connection pool metrics
- Load test with expected peak traffic
- Track login success rate for 24h
```

## 6. Pattern Domain Examples

### Creating Reusable Patterns

```bash
# Create a new pattern
ginko reflect --domain pattern "create error handling pattern for async operations"
```

**Generated Pattern:**
```typescript
/**
 * Async Error Handling Pattern
 * 
 * Problem: Inconsistent error handling in async operations leading to 
 * unhandled rejections and poor error messages.
 * 
 * Solution: Wrapper pattern with consistent error handling, logging,
 * and retry logic.
 */

export interface AsyncOperationOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  onError?: (error: Error) => void;
}

export class AsyncOperation<T> {
  constructor(
    private operation: () => Promise<T>,
    private options: AsyncOperationOptions = {}
  ) {
    this.options = {
      retries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options
    };
  }
  
  async execute(): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.options.retries!; attempt++) {
      try {
        return await this.executeWithTimeout();
      } catch (error) {
        lastError = error as Error;
        
        // Log error with context
        console.error(`Attempt ${attempt + 1} failed:`, {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        
        // Call error handler if provided
        this.options.onError?.(error);
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry
        if (attempt < this.options.retries!) {
          await this.delay(this.options.retryDelay! * (attempt + 1));
        }
      }
    }
    
    throw new Error(`Operation failed after ${this.options.retries} retries: ${lastError!.message}`);
  }
  
  private async executeWithTimeout(): Promise<T> {
    return Promise.race([
      this.operation(),
      new Promise<T>((_, reject) => 
        setTimeout(
          () => reject(new Error('Operation timeout')),
          this.options.timeout
        )
      )
    ]);
  }
  
  private isNonRetryableError(error: any): boolean {
    return [
      'ValidationError',
      'AuthenticationError',
      'PermissionError'
    ].includes(error.name);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage Example:
const fetchUserData = new AsyncOperation(
  async () => {
    const response = await fetch('/api/user');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  {
    retries: 5,
    retryDelay: 2000,
    onError: (error) => {
      // Send to error tracking
      trackError(error);
    }
  }
);

const userData = await fetchUserData.execute();
```

## 7. Composite Reflection Examples

### Full Feature Implementation

```bash
# Generate everything needed for a feature
ginko reflect --composite "implement user dashboard with analytics"
```

This would trigger multiple domain reflections:

1. **Architecture**: Design decisions for dashboard
2. **Backlog**: Create feature and story items
3. **Documentation**: API and user documentation
4. **Testing**: Test plan and test suites

## Tips for Effective Reflection

### 1. Be Specific in Your Intent

```bash
# Too vague
ginko reflect "improve performance"

# Better
ginko reflect "optimize database queries for user search endpoint"

# Best
ginko reflect --domain debugging "investigate and fix N+1 queries in /api/users endpoint causing 2s response times"
```

### 2. Provide Context When Needed

```bash
# Include context for better results
ginko reflect --domain backlog "create story for migrating from MongoDB to PostgreSQL - this is part of our Q4 scaling initiative"
```

### 3. Use Domain Shortcuts

```bash
# Instead of:
ginko reflect --domain backlog "create feature"

# Use:
ginko backlog ai "feature description"
# Or even shorter:
ginko feature "description"
```

### 4. Chain Reflections

```bash
# Design first
ginko reflect --domain architecture "decide on state management approach" > adr.md

# Then implement
ginko reflect --domain backlog "implement state management based on ADR-016" > backlog.md

# Then document
ginko reflect --domain documentation "document state management patterns" > docs.md
```

### 5. Use Raw Output for Automation

```bash
# Pipe to AI tool
ginko reflect --raw --domain testing "generate tests" | claude

# Save for later
ginko reflect --raw --domain documentation "api docs" > reflection-prompt.txt
```

## Common Patterns Across Domains

### The Investigation Pattern
Used in debugging, architecture, and testing:
1. Define the problem clearly
2. Form multiple hypotheses
3. Gather evidence systematically
4. Draw conclusions based on data
5. Propose and validate solutions

### The Specification Pattern
Used in backlog, documentation, and testing:
1. Define clear requirements
2. Specify acceptance criteria
3. Include examples and edge cases
4. Define success metrics
5. Plan verification approach

### The Evolution Pattern
Used in refactoring, architecture, and patterns:
1. Document current state
2. Identify pain points
3. Propose improvements
4. Plan migration path
5. Define rollback strategy

## Advanced Techniques

### Context Injection

Provide additional context for better reflections:

```bash
# Set session context
export GINKO_CONTEXT="Working on payment system refactor"

# Reflection will include this context
ginko reflect "create tests for new payment flow"
```

### Template Customization

Override default templates:

```bash
# Use custom template
ginko reflect --template ./my-templates/feature.md "create feature"

# Use team-specific rules
ginko reflect --rules ./team-rules.json "generate documentation"
```

### Batch Processing

Generate multiple reflections:

```bash
# Create reflections for multiple items
for feature in "auth" "payments" "notifications"; do
  ginko reflect --domain documentation "document $feature module" > docs/$feature.md
done
```

## Measuring Success

### Quality Metrics
- **Completeness**: All template sections filled
- **Accuracy**: Reflects actual implementation
- **Consistency**: Follows team patterns
- **Actionability**: Clear next steps

### Efficiency Metrics
- **Time Saved**: 70% faster than manual creation
- **Iteration Reduction**: 50% fewer revisions needed
- **Pattern Reuse**: 80% of patterns reused
- **Error Reduction**: 60% fewer inconsistencies

## Troubleshooting Common Issues

### Issue: "Cannot detect domain"
**Solution**: Use explicit --domain flag or improve intent clarity

### Issue: "Insufficient context gathered"
**Solution**: Ensure git repository is initialized and has history

### Issue: "Template too generic"
**Solution**: Provide more specific intent or use domain shortcuts

### Issue: "Output doesn't match expectations"
**Solution**: Review template requirements and provide more context

## Conclusion

The Reflection Pattern transforms how we collaborate with AI by:
- Providing structure while preserving creativity
- Ensuring consistency across team output
- Capturing context and patterns automatically
- Enabling rapid, high-quality content generation

By mastering these patterns, teams can achieve 10x productivity gains while maintaining or improving quality.