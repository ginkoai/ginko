# CLI Integration Guide: Verification Result Storage

**EPIC-004 Sprint 3 TASK-7**

Quick guide for integrating the `ginko verify` CLI command with the verification storage API.

## Overview

The verification storage API is ready to receive and store verification results. This guide shows how to integrate the CLI command to optionally push results to the graph.

## API Endpoint

**POST** `https://app.ginkoai.com/api/v1/task/verify`

## Required Changes to CLI

### 1. Add `--store` Flag to Verify Command

**File:** `/Users/cnorton/Development/ginko/packages/cli/src/commands/verify.ts`

```typescript
import { Command } from 'commander';

export function registerVerifyCommand(program: Command) {
  program
    .command('verify <task-id>')
    .description('Verify task acceptance criteria')
    .option('--json', 'Output results as JSON')
    .option('--store', 'Store verification result in graph')  // NEW
    .option('--agent-id <id>', 'Agent ID for attribution')    // NEW
    .action(async (taskId: string, options: any) => {
      // ... existing verification logic ...

      // NEW: Store result if --store flag provided
      if (options.store) {
        await storeVerificationInGraph(result, options.agentId);
      }
    });
}
```

### 2. Add Storage Helper Function

```typescript
/**
 * Store verification result in graph via API
 */
async function storeVerificationInGraph(
  result: VerificationResult,
  agentId?: string
): Promise<void> {
  try {
    // Load auth credentials
    const authConfig = await loadAuthConfig(); // from existing auth system
    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

    // Send to API
    const response = await fetch(`${apiUrl}/api/v1/task/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authConfig.api_key}`,
      },
      body: JSON.stringify({
        taskId: result.taskId,
        taskTitle: result.taskTitle,
        passed: result.passed,
        timestamp: result.timestamp.toISOString(),
        criteria: result.criteria,
        summary: result.summary,
        agentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to store verification result:', error);
      return;
    }

    const data = await response.json();
    console.log(chalk.dim(`✓ Stored in graph: ${data.verificationId}`));
  } catch (error) {
    // Don't fail the command if storage fails
    console.error('Warning: Could not store verification result:', error.message);
  }
}
```

### 3. Import Dependencies

Add to imports at top of file:

```typescript
import { loadAuthConfig } from '../lib/auth-config.js';  // existing auth system
```

## Usage Examples

### Basic Verification (Local Only)

```bash
ginko verify TASK-42
```

Output:
```
Verifying TASK-42: Implement user authentication

Criteria:
  ✓ Unit tests pass (142 passed, 0 failed)
  ✓ Build succeeds (12.3s)
  ✓ No new lint errors (0 new)

Result: PASSED (3/3 criteria passed)
```

### Store Verification in Graph

```bash
ginko verify TASK-42 --store
```

Output:
```
Verifying TASK-42: Implement user authentication

Criteria:
  ✓ Unit tests pass (142 passed, 0 failed)
  ✓ Build succeeds (12.3s)
  ✓ No new lint errors (0 new)

Result: PASSED (3/3 criteria passed)
✓ Stored in graph: ver_TASK-42_1701345678000
```

### Store with Agent Attribution

```bash
ginko verify TASK-42 --store --agent-id=agent-builder-001
```

## Environment Variables

Required for `--store` to work:

```bash
# API endpoint (optional, defaults to production)
export GINKO_API_URL=https://app.ginkoai.com

# Authentication (required for --store)
# Automatically loaded from ~/.ginko/auth.json after `ginko login`
```

## Error Handling

The CLI should handle storage failures gracefully:

1. **Network errors** - Show warning, continue with verification
2. **Auth errors** - Show message about running `ginko login`
3. **API errors** - Display error message, don't fail verification

Example error handling:

```typescript
async function storeVerificationInGraph(
  result: VerificationResult,
  agentId?: string
): Promise<void> {
  try {
    // ... API call ...
  } catch (error) {
    if (error.message.includes('ENOTFOUND')) {
      console.warn(chalk.yellow('Warning: Could not reach API. Verification not stored.'));
    } else if (error.message.includes('401')) {
      console.warn(chalk.yellow('Warning: Not authenticated. Run `ginko login` to store results.'));
    } else {
      console.warn(chalk.yellow(`Warning: ${error.message}`));
    }
  }
}
```

## Testing

Test the integration:

```bash
# 1. Test local verification (should work without auth)
ginko verify TASK-42

# 2. Test with --store flag (requires auth)
ginko login
ginko verify TASK-42 --store

# 3. Verify storage via API
curl -X GET \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  "https://app.ginkoai.com/api/v1/task/verify?taskId=TASK-42&limit=5"
```

## Future Enhancements

1. **Auto-store on success** - `--auto-store-on-pass`
2. **Query history** - `ginko verify TASK-42 --history`
3. **Statistics** - `ginko verify TASK-42 --stats`
4. **Retry failed** - Re-run only failed criteria

## Implementation Checklist

- [ ] Add `--store` flag to verify command
- [ ] Add `--agent-id` option
- [ ] Implement `storeVerificationInGraph()` helper
- [ ] Add error handling for network/auth failures
- [ ] Test with real API endpoint
- [ ] Update CLI help text
- [ ] Add to CLI documentation

## Related Files

- CLI Command: `/Users/cnorton/Development/ginko/packages/cli/src/commands/verify.ts`
- Storage Utility: `/Users/cnorton/Development/ginko/dashboard/src/lib/verification-storage.ts`
- API Endpoint: `/Users/cnorton/Development/ginko/dashboard/src/app/api/v1/task/verify/route.ts`
- Auth System: `/Users/cnorton/Development/ginko/packages/cli/src/lib/auth-config.ts`

---

**Note:** The storage API is ready and deployed. This guide focuses on the CLI integration work needed to connect the two systems.
