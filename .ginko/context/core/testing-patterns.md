---
module: testing-patterns
type: core-knowledge
status: active
updated: 2025-10-23
tags: [testing, jest, patterns, best-practices]
priority: high
audience: [ai-agent, developer]
estimated-tokens: 600
---

# Testing Patterns

## Test File Location

**Co-locate tests with source:**
```
packages/cli/src/utils/
├── context-loader.ts
└── context-loader.test.ts
```

**Integration tests:**
```
packages/cli/__tests__/
├── integration/
└── fixtures/
```

## Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('ModuleName', () => {
  describe('methodName', () => {
    it('should perform expected behavior', () => {
      // Arrange - Set up test data
      const input = { foo: 'bar' };

      // Act - Execute the code under test
      const result = methodName(input);

      // Assert - Verify expected outcome
      expect(result).toEqual({ foo: 'bar', processed: true });
    });

    it('should handle edge cases', () => {
      expect(() => methodName(null)).toThrow('Invalid input');
    });
  });
});
```

## Common Testing Patterns

**Testing async code:**
```typescript
it('should load configuration', async () => {
  const config = await loadConfig();
  expect(config).toBeDefined();
  expect(config.version).toBe('1.0');
});
```

**Mocking file system:**
```typescript
import fs from 'fs-extra';
jest.mock('fs-extra');

it('should read file', async () => {
  (fs.readFile as jest.Mock).mockResolvedValue('content');
  const result = await readConfigFile();
  expect(result).toBe('content');
});
```

**Testing error conditions:**
```typescript
it('should throw on invalid path', () => {
  expect(() => loadDocument('')).toThrow('Path required');
});

it('should return null for missing file', async () => {
  const result = await loadOptionalFile('nonexistent.md');
  expect(result).toBeNull();
});
```

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- context-loader.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Verbose output
npm test -- --verbose
```

## Coverage Goals

- **Critical paths**: >90% coverage (session, backlog, context-loader)
- **Utilities**: >80% coverage (helpers, parsers)
- **Commands**: >70% coverage (CLI commands)
- **Edge cases**: Always test error conditions

## Test Data Location

- Fixtures: `packages/cli/__tests__/fixtures/`
- Mock data: Define in test file or separate `mocks/` directory
- Test configs: `.test.json` files in fixtures

## Best Practices

1. **Test behavior, not implementation** - Focus on what code does, not how
2. **One assertion per test** - Makes failures easier to debug
3. **Descriptive test names** - Use "should" statements
4. **Clean up after tests** - Use afterEach for cleanup
5. **Independent tests** - Each test should run in isolation
6. **Mock external dependencies** - File system, network calls, time

## Common Test Helpers

```typescript
// Clean up test files
afterEach(async () => {
  await fs.remove('/tmp/test-output');
});

// Mock date/time
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});
```
