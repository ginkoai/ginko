# Agent Coordination Integration Tests

## Overview

Comprehensive integration tests for EPIC-004 Sprint 1 Agent Coordination features.

**File:** `agent-coordination.test.ts`
**Coverage:** Agent registration, task claiming (with race condition prevention), heartbeat, task release, and worker context loading flow.

## Test Suites

### 1. Agent Registration Flow
- ✅ Register new agent successfully
- ✅ Fail registration without name
- ✅ Fail registration without capabilities
- ✅ Fail registration with empty capabilities array
- ✅ Fail registration with invalid status

### 2. Agent List
- ✅ List all agents
- ✅ Filter agents by status
- ✅ Filter agents by capability
- ✅ Respect pagination limit
- ✅ Respect pagination offset

### 3. Task Claiming - Race Condition Prevention
- ✅ Allow first agent to claim available task
- ✅ Prevent second agent from claiming already-claimed task
- ✅ **Handle concurrent claim attempts (race condition)**
- ✅ Fail claim for non-existent task
- ✅ Fail claim for non-existent agent

### 4. Task Release and Re-Claim
- ✅ Allow claiming agent to release task
- ✅ Prevent non-claiming agent from releasing task
- ✅ Allow re-claiming task after release
- ✅ Update agent status to active after release

### 5. Agent Heartbeat
- ✅ Update heartbeat timestamp
- ✅ Update heartbeat multiple times
- ✅ Fail heartbeat for non-existent agent
- ✅ Preserve agent status during heartbeat

### 6. Worker Context Loading Flow
- ✅ Complete full worker context loading flow
- ✅ Handle worker failure and task re-assignment

### 7. Authentication and Authorization
- ✅ Reject requests without bearer token
- ✅ Reject requests with invalid bearer token format

### 8. Error Handling
- ✅ Handle database connection failures gracefully
- ✅ Validate request body schema

## Running Tests

### Prerequisites

1. **Neo4j Database Running**
   ```bash
   # Ensure Neo4j is running (locally or via Docker)
   docker run -d \
     --name neo4j-test \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/testpassword \
     neo4j:latest
   ```

2. **Environment Variables**
   ```bash
   export GINKO_API_URL=https://app.ginkoai.com
   export GINKO_TEST_TOKEN=your_test_bearer_token

   # Or use local development server
   export GINKO_API_URL=http://localhost:3000
   ```

3. **Authentication Token**
   ```bash
   # Get a test token via ginko login
   ginko login

   # Extract token from auth storage
   export GINKO_TEST_TOKEN=$(cat ~/.ginko/auth.json | jq -r .api_key)
   ```

### Run Integration Tests

```bash
# Run all agent coordination tests
npm test -- agent-coordination.test.ts

# Run specific test suite
npm test -- agent-coordination.test.ts -t "Agent Registration Flow"

# Run with verbose output
npm test -- agent-coordination.test.ts --verbose

# Run with coverage
npm test -- agent-coordination.test.ts --coverage
```

### Local Development Testing

For local development, start the dashboard server:

```bash
# Terminal 1: Start dashboard (includes API routes)
cd dashboard
npm run dev

# Terminal 2: Run tests against local server
cd packages/cli
export GINKO_API_URL=http://localhost:3000
npm test -- agent-coordination.test.ts
```

## Test Architecture

### API Request Helper
```typescript
async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<{ data?: T; error?: ApiError; status: number }>
```

Handles:
- Bearer token authentication
- JSON request/response serialization
- Error handling and status codes

### Test Data Helpers
```typescript
async function createTestAgent(name: string, capabilities: string[]): Promise<Agent>
async function createTestTask(title: string): Promise<Task>
```

Automates test data creation and cleanup.

### Race Condition Test
```typescript
// Simulate concurrent claims
const [result1, result2] = await Promise.all([
  apiRequest('POST', `/api/v1/task/${taskId}/claim`, { agentId: agent1.id }),
  apiRequest('POST', `/api/v1/task/${taskId}/claim`, { agentId: agent2.id }),
]);

// Verify exactly one succeeds, one fails
expect(successes.length).toBe(1);
expect(failures.length).toBe(1);
```

## Coverage Report

Run tests with coverage to verify >80% coverage:

```bash
npm test -- agent-coordination.test.ts --coverage --coveragePathIgnorePatterns="test/"
```

Expected coverage:
- **Agent API routes:** >90%
- **Task claiming logic:** >95%
- **Heartbeat mechanism:** >85%
- **Overall:** >80%

## Known Limitations

1. **Task Creation:** Tests use mock task IDs since task creation endpoint may not be implemented yet. Update `createTestTask()` helper when endpoint is available.

2. **Cleanup:** Test agents and tasks are not automatically cleaned up. In production, implement cleanup in `afterAll()` hook.

3. **Stale Detection:** Tests don't verify stale agent detection (5-minute timeout). Add long-running test if needed.

## Troubleshooting

### Test Failures

**"API request failed: Unknown error"**
- Check `GINKO_API_URL` is correct
- Verify server is running
- Check network connectivity

**"Authentication required"**
- Verify `GINKO_TEST_TOKEN` is set
- Run `ginko login` to get fresh token
- Check token hasn't expired

**"Graph database is unavailable"**
- Ensure Neo4j is running
- Check connection string in dashboard `.env`
- Verify Neo4j credentials

### Race Condition Test Failures

If race condition test is flaky:
1. Increase test timeout (currently 30s)
2. Add retry logic for network failures
3. Check database transaction isolation level

## Next Steps

1. **Implement Task Creation Endpoint:** Update `createTestTask()` to use real API
2. **Add Cleanup Logic:** Implement `afterAll()` cleanup for test data
3. **Add Performance Tests:** Measure claim latency under load
4. **Add Stale Detection Test:** Verify agents marked offline after 5 minutes

## Related Files

- **API Routes:**
  - `dashboard/src/app/api/v1/agent/route.ts`
  - `dashboard/src/app/api/v1/agent/[id]/heartbeat/route.ts`
  - `dashboard/src/app/api/v1/task/[id]/claim/route.ts`
  - `dashboard/src/app/api/v1/task/[id]/release/route.ts`

- **CLI Commands:**
  - `packages/cli/src/commands/agent/agent-client.ts`
  - `packages/cli/src/commands/agent/register.ts`
  - `packages/cli/src/commands/agent/list.ts`

- **Documentation:**
  - `docs/sprints/SPRINT-2025-12-05-agent-coordination.md`
