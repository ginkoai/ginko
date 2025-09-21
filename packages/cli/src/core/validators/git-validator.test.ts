/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-20
 * @tags: [test, validation, git, safety]
 * @related: [git-validator.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

import { GitValidator } from './git-validator';

describe('GitValidator', () => {
  let validator: GitValidator;

  beforeEach(() => {
    validator = new GitValidator();
  });

  test('should have validate method', () => {
    expect(typeof validator.validate).toBe('function');
  });

  test('should return validation result structure', async () => {
    const result = await validator.validate();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('message');
    expect(['pass', 'warning', 'error']).toContain(result.status);
  });

  test('should detect git availability', async () => {
    const result = await validator.validate();

    // In our environment, git should be available
    expect(result.status).not.toBe('error');
    expect(result.message).toBeTruthy();
  });

  test('should handle timeout gracefully', async () => {
    // Test that validation completes within reasonable time
    const startTime = Date.now();
    await validator.validate();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
  });
});