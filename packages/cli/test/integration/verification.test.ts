/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, integration-test, epic-004, sprint-3, task-9]
 * @related: [../../src/lib/sprint-loader.ts, ../../src/lib/verification/test-runner.ts, ../../src/lib/verification/build-check.ts, ../../src/lib/verification/lint-check.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs, path, os]
 */

/**
 * Integration tests for verification system (EPIC-004 Sprint 3 TASK-9)
 *
 * Tests the complete verification flow from acceptance criteria parsing
 * through test/build/lint execution and result reporting.
 *
 * Test coverage:
 * - Criteria parsing from various markdown formats
 * - Verification pass/fail flows
 * - Test runner integration
 * - Build verification
 * - Lint verification
 * - Edge cases: no tests, build fails, no acceptance criteria
 */

import { parseSprintChecklist, AcceptanceCriterion, Task } from '../../src/lib/sprint-loader.js';
import { runTests } from '../../src/lib/verification/test-runner.js';
import { runBuild } from '../../src/lib/verification/build-check.js';
import { runLint } from '../../src/lib/verification/lint-check.js';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Verification Integration Tests', () => {
  let testProjectRoot: string;
  let sprintFilePath: string;

  beforeEach(() => {
    // Create temporary test project
    const timestamp = Date.now();
    testProjectRoot = join(tmpdir(), `verification-test-${timestamp}`);
    mkdirSync(testProjectRoot, { recursive: true });
    sprintFilePath = join(testProjectRoot, 'SPRINT-test.md');
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('Acceptance Criteria Parsing', () => {
    it('should parse criteria from sprint markdown with various types', () => {
      const markdown = `# SPRINT: Test Sprint

### TASK-1: Implement authentication
**Status:** [ ] Todo

**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] No new lint errors
- [ ] API response < 200ms
- [ ] Code review approved
- [ ] Custom check: npm run security-audit
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);

      expect(result.tasks).toHaveLength(1);
      const task = result.tasks[0];
      expect(task.acceptanceCriteria).toBeDefined();
      expect(task.acceptanceCriteria).toHaveLength(6);

      // Verify each criterion type
      expect(task.acceptanceCriteria![0]).toMatchObject({
        id: 'AC-1',
        description: 'Unit tests pass',
        type: 'test',
      });

      expect(task.acceptanceCriteria![1]).toMatchObject({
        id: 'AC-2',
        description: 'Build succeeds',
        type: 'build',
      });

      expect(task.acceptanceCriteria![2]).toMatchObject({
        id: 'AC-3',
        description: 'No new lint errors',
        type: 'lint',
      });

      expect(task.acceptanceCriteria![3]).toMatchObject({
        id: 'AC-4',
        description: 'API response < 200ms',
        type: 'performance',
        threshold: 200,
      });

      expect(task.acceptanceCriteria![4]).toMatchObject({
        id: 'AC-5',
        description: 'Code review approved',
        type: 'manual',
      });

      expect(task.acceptanceCriteria![5]).toMatchObject({
        id: 'AC-6',
        description: 'Custom check: npm run security-audit',
        type: 'custom',
      });
    });

    it('should auto-detect criterion type from description', () => {
      const markdown = `# SPRINT: Type Detection

### TASK-2: Test type detection
**Status:** [ ] Todo

**Acceptance:**
- [ ] All integration tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint shows no errors
- [ ] Response time under 3 seconds
- [ ] Manual verification by QA
- [ ] Run custom script
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);
      const criteria = result.tasks[0].acceptanceCriteria!;

      expect(criteria[0].type).toBe('test'); // integration tests
      expect(criteria[1].type).toBe('build'); // compilation
      expect(criteria[2].type).toBe('lint'); // eslint
      expect(criteria[3].type).toBe('performance'); // response time
      expect(criteria[3].threshold).toBe(3000); // 3 seconds in ms
      expect(criteria[4].type).toBe('manual'); // manual verification
      expect(criteria[5].type).toBe('custom'); // custom script
    });

    it('should parse performance thresholds in various formats', () => {
      const markdown = `# SPRINT: Performance Thresholds

### TASK-3: Test performance parsing
**Status:** [ ] Todo

**Acceptance:**
- [ ] API latency < 200ms
- [ ] Page load time under 3 seconds
- [ ] Response below 50 ms
- [ ] Response time within 100 ms
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);
      const criteria = result.tasks[0].acceptanceCriteria!;

      expect(criteria[0].threshold).toBe(200);
      expect(criteria[1].threshold).toBe(3000);
      expect(criteria[2].threshold).toBe(50);
      expect(criteria[3].threshold).toBe(100);
    });

    it('should handle missing criteria (return empty array)', () => {
      const markdown = `# SPRINT: No Criteria

### TASK-4: Task without acceptance criteria
**Status:** [ ] Todo

This task has no acceptance criteria defined.
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);
      const task = result.tasks[0];

      expect(task.acceptanceCriteria).toBeUndefined();
    });

    it('should handle multiple tasks with different criteria', () => {
      const markdown = `# SPRINT: Multiple Tasks

### TASK-1: Frontend work
**Status:** [ ] Todo

**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds

### TASK-2: Backend work
**Status:** [ ] Todo

**Acceptance:**
- [ ] Integration tests pass
- [ ] API response < 100ms
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].acceptanceCriteria).toHaveLength(2);
      expect(result.tasks[1].acceptanceCriteria).toHaveLength(2);
      expect(result.tasks[1].acceptanceCriteria![1].type).toBe('performance');
    });
  });

  describe('Verification Flow Integration', () => {
    it('should complete full verification pass (all criteria pass)', async () => {
      // Setup: Create minimal passing project
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "Tests: 5 passed, 0 failed, 5 total"',
          build: 'echo "Build successful"',
          lint: 'echo "✓ 0 problems"',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Run verifications
      const testResult = await runTests(testProjectRoot, { timeout: 5000 });
      const buildResult = await runBuild(testProjectRoot, { timeout: 5000 });
      const lintResult = await runLint(testProjectRoot, { timeout: 5000 });

      // Verify all pass
      expect(testResult.passed).toBe(true);
      expect(testResult.passCount).toBe(5);
      expect(testResult.failCount).toBe(0);

      expect(buildResult.passed).toBe(true);

      expect(lintResult.passed).toBe(true);
      expect(lintResult.errorCount).toBe(0);
    });

    it('should handle partial failure (some criteria fail)', async () => {
      // Setup: Tests pass, build fails
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "Tests: 10 passed, 0 failed, 10 total"',
          build: 'exit 1', // Build fails
          lint: 'echo "✓ 0 problems"',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const testResult = await runTests(testProjectRoot, { timeout: 5000 });
      const buildResult = await runBuild(testProjectRoot, { timeout: 5000 });
      const lintResult = await runLint(testProjectRoot, { timeout: 5000 });

      // Tests and lint pass, build fails
      expect(testResult.passed).toBe(true);
      expect(buildResult.passed).toBe(false);
      expect(lintResult.passed).toBe(true);

      // Overall verification would fail (not all criteria pass)
      const allPassed = testResult.passed && buildResult.passed && lintResult.passed;
      expect(allPassed).toBe(false);
    });

    it('should handle complete failure (all criteria fail)', async () => {
      // Setup: Everything fails
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "Tests: 0 passed, 5 failed, 5 total" && exit 1',
          build: 'echo "Build failed" && exit 1',
          lint: 'echo "✖ 42 problems (23 errors, 19 warnings)" && exit 1',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const testResult = await runTests(testProjectRoot, { timeout: 5000 });
      const buildResult = await runBuild(testProjectRoot, { timeout: 5000 });
      const lintResult = await runLint(testProjectRoot, { timeout: 5000 });

      // All should fail
      expect(testResult.passed).toBe(false);
      expect(testResult.failCount).toBe(5);

      expect(buildResult.passed).toBe(false);

      expect(lintResult.passed).toBe(false);
      expect(lintResult.errorCount).toBe(23);
      expect(lintResult.warningCount).toBe(19);
    });
  });

  describe('Test Runner Integration', () => {
    it('should detect test command from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'jest --verbose',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      // Should attempt to run the test command
      expect(result).toBeDefined();
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should parse Jest output format', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'echo "Tests:       142 passed, 142 total"',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      expect(result.passed).toBe(true);
      expect(result.passCount).toBe(142);
      expect(result.failCount).toBe(0);
    });

    it('should handle test timeout', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'sleep 10', // Will timeout
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runTests(testProjectRoot, { timeout: 1000 });

      expect(result.passed).toBe(false);
      expect(result.output).toContain('timed out');
    });

    it('should handle missing test command gracefully', async () => {
      // No package.json
      const result = await runTests(testProjectRoot, { timeout: 5000 });

      // Should fail but not crash
      expect(result.passed).toBe(false);
      expect(result.output).toBeDefined();
    });
  });

  describe('Build Verification Integration', () => {
    it('should detect build command from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'tsc',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runBuild(testProjectRoot, { timeout: 5000 });

      expect(result).toBeDefined();
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should handle build failures with error details', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'echo "Error: TypeScript compilation failed" >&2 && exit 1',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runBuild(testProjectRoot, { timeout: 5000 });

      expect(result.passed).toBe(false);
      // Error output should contain the build failure message
      expect(result.errorOutput).toBeDefined();
      expect(result.errorOutput || result.output).toContain('TypeScript compilation failed');
    });

    it('should handle projects without build script', async () => {
      const packageJson = {
        name: 'test-project',
        // No build script
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runBuild(testProjectRoot, { timeout: 5000 });

      // Should attempt fallback build command
      expect(result).toBeDefined();
      expect(result.passed).toBe(false); // Will fail since build command doesn't exist
    });
  });

  describe('Lint Verification Integration', () => {
    it('should detect lint command from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          lint: 'eslint .',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runLint(testProjectRoot, { timeout: 5000 });

      expect(result).toBeDefined();
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should parse error counts from lint output', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          lint: 'echo "✖ 42 problems (23 errors, 19 warnings)" && exit 1',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runLint(testProjectRoot, { timeout: 5000 });

      expect(result.errorCount).toBe(23);
      expect(result.warningCount).toBe(19);
      expect(result.passed).toBe(false);
    });

    it('should handle baseline comparison', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          lint: 'echo "✖ 5 errors, 0 warnings" && exit 1',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      // With baseline of 10, should pass (5 <= 10)
      const resultWithBaseline = await runLint(testProjectRoot, { timeout: 5000, baseline: 10 });
      expect(resultWithBaseline.passed).toBe(true);
      expect(resultWithBaseline.errorCount).toBe(5);

      // Without baseline, should fail
      const resultNoBaseline = await runLint(testProjectRoot, { timeout: 5000 });
      expect(resultNoBaseline.passed).toBe(false);
    });

    it('should handle projects without lint configuration', async () => {
      const packageJson = {
        name: 'test-project',
        // No lint script or config
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runLint(testProjectRoot, { timeout: 5000 });

      // Should skip gracefully
      expect(result.passed).toBe(true);
      expect(result.output).toContain('No lint command detected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle project with no tests configured', async () => {
      const packageJson = {
        name: 'test-project',
        // No test script
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runTests(testProjectRoot, { timeout: 5000 });

      // Should fail gracefully
      expect(result.passed).toBe(false);
      expect(result).toBeDefined();
    });

    it('should handle project with no package.json', async () => {
      // Empty project directory
      const testResult = await runTests(testProjectRoot, { timeout: 5000 });
      const buildResult = await runBuild(testProjectRoot, { timeout: 5000 });
      const lintResult = await runLint(testProjectRoot, { timeout: 5000 });

      // All should fail or skip gracefully
      expect(testResult.passed).toBe(false);
      expect(buildResult.passed).toBe(false);
      expect(lintResult.passed).toBe(true); // Lint skips if no config
    });

    it('should handle task with no acceptance criteria', () => {
      const markdown = `# SPRINT: No Criteria Sprint

### TASK-1: Simple task
**Status:** [ ] Todo

No acceptance criteria defined.
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);
      const task = result.tasks[0];

      // Should parse task successfully
      expect(task.id).toBe('TASK-1');
      expect(task.acceptanceCriteria).toBeUndefined();
    });

    it('should handle complex mixed criteria', () => {
      const markdown = `# SPRINT: Complex Criteria

### TASK-1: Full-stack feature
**Status:** [ ] Todo

**Acceptance:**
- [ ] Unit tests pass with 80% coverage
- [ ] Integration tests successful
- [ ] Build completes without errors
- [ ] ESLint shows no new errors
- [ ] Response time < 150ms for API endpoints
- [ ] Load time under 2 seconds for UI
- [ ] Security audit passes
- [ ] Code review approved by tech lead
- [ ] Custom check: npm run e2e-tests
`;

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);
      const criteria = result.tasks[0].acceptanceCriteria!;

      expect(criteria).toHaveLength(9);

      // Verify mixed types
      expect(criteria.filter(c => c.type === 'test')).toHaveLength(3);
      expect(criteria.filter(c => c.type === 'build')).toHaveLength(1);
      expect(criteria.filter(c => c.type === 'lint')).toHaveLength(1);
      expect(criteria.filter(c => c.type === 'performance')).toHaveLength(2);
      expect(criteria.filter(c => c.type === 'manual')).toHaveLength(1);
      expect(criteria.filter(c => c.type === 'custom')).toHaveLength(1);

      // Verify thresholds
      expect(criteria.find(c => c.description.includes('150ms'))?.threshold).toBe(150);
      expect(criteria.find(c => c.description.includes('2 seconds'))?.threshold).toBe(2000);
    });

    it('should handle verification when build command times out', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'sleep 60', // Will timeout
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await runBuild(testProjectRoot, { timeout: 1000 });

      expect(result.passed).toBe(false);
      expect(result.duration_ms).toBeLessThan(2000); // Should timeout quickly
    });

    it('should handle empty sprint file', () => {
      const markdown = '';

      writeFileSync(sprintFilePath, markdown);
      const result = parseSprintChecklist(markdown, sprintFilePath);

      expect(result.tasks).toHaveLength(0);
      expect(result.progress.total).toBe(0);
    });
  });

  describe('End-to-End Verification Scenarios', () => {
    it('should verify complete task workflow with all criteria types', async () => {
      // Setup: Complete project with all verification types
      const packageJson = {
        name: 'complete-project',
        scripts: {
          test: 'echo "Tests: 25 passed, 0 failed, 25 total"',
          build: 'echo "Build successful"',
          lint: 'echo "✓ 0 problems (0 errors, 0 warnings)"',
        },
      };

      writeFileSync(join(testProjectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Parse task with criteria
      const markdown = `# SPRINT: E2E Test

### TASK-1: Complete feature
**Status:** [@] In Progress

**Acceptance:**
- [ ] All unit tests pass
- [ ] Project builds successfully
- [ ] No lint errors
`;

      writeFileSync(sprintFilePath, markdown);
      const sprint = parseSprintChecklist(markdown, sprintFilePath);
      const task = sprint.tasks[0];

      expect(task.acceptanceCriteria).toHaveLength(3);

      // Run verifications for each criterion type
      const results = await Promise.all([
        runTests(testProjectRoot, { timeout: 5000 }),
        runBuild(testProjectRoot, { timeout: 5000 }),
        runLint(testProjectRoot, { timeout: 5000 }),
      ]);

      // All should pass
      const allPassed = results.every(r => r.passed);
      expect(allPassed).toBe(true);

      // Simulate verification result structure
      const verificationResult = {
        taskId: task.id,
        passed: allPassed,
        timestamp: new Date(),
        criteria: task.acceptanceCriteria!.map((criterion, index) => ({
          id: criterion.id,
          description: criterion.description,
          passed: results[index].passed,
          duration_ms: results[index].duration_ms,
        })),
      };

      expect(verificationResult.passed).toBe(true);
      expect(verificationResult.criteria).toHaveLength(3);
      expect(verificationResult.criteria.every(c => c.passed)).toBe(true);
    });
  });
});
