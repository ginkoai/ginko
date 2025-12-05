/**
 * @fileType: example
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, demo, epic-004]
 * @related: [../src/lib/verification/test-runner.ts]
 * @priority: medium
 * @complexity: low
 */

/**
 * Demonstration of test runner integration
 * EPIC-004 Sprint 3 TASK-3
 *
 * Run with: tsx packages/cli/examples/verification-demo.ts
 */

import { runTests } from '../src/lib/verification/test-runner.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Test Runner Integration Demo');
  console.log('EPIC-004 Sprint 3 TASK-3');
  console.log('='.repeat(60));
  console.log();

  // Demo 1: Run tests on ginko CLI package
  console.log('Demo 1: Testing ginko CLI package');
  console.log('-'.repeat(60));

  const projectRoot = '/Users/cnorton/Development/ginko/packages/cli';
  console.log(`Project root: ${projectRoot}`);
  console.log('Running tests with 30s timeout...');
  console.log();

  const result = await runTests(projectRoot, {
    timeout: 30000,
  });

  console.log('Test Result:');
  console.log(`  Passed: ${result.passed ? '✓ YES' : '✗ NO'}`);
  console.log(`  Pass Count: ${result.passCount}`);
  console.log(`  Fail Count: ${result.failCount}`);
  console.log(`  Coverage: ${result.coverage ? result.coverage + '%' : 'N/A'}`);
  console.log(`  Duration: ${(result.duration_ms / 1000).toFixed(2)}s`);
  console.log();

  console.log('Output Preview (first 500 chars):');
  console.log('-'.repeat(60));
  console.log(result.output.substring(0, 500));
  console.log();

  // Demo 2: Show framework detection
  console.log('Demo 2: Framework Detection');
  console.log('-'.repeat(60));
  console.log('The test runner automatically detects:');
  console.log('  - Jest (from package.json scripts or jest.config.*)');
  console.log('  - Vitest (from package.json deps or vitest.config.*)');
  console.log('  - Mocha (from package.json or .mocharc.*)');
  console.log('  - Falls back to npm test');
  console.log();

  // Demo 3: Show acceptance criteria integration
  console.log('Demo 3: Acceptance Criteria Integration');
  console.log('-'.repeat(60));
  console.log('Example sprint task definition:');
  console.log(`
### TASK-1: Implement feature
**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] No new lint errors
- [ ] API response < 200ms
  `);
  console.log('The verification API will:');
  console.log('  1. Parse criteria from sprint file');
  console.log('  2. Run runTests() for "Unit tests pass"');
  console.log('  3. Check result.passed === true');
  console.log('  4. Return structured pass/fail');
  console.log();

  console.log('='.repeat(60));
  console.log('Demo Complete!');
  console.log('Files created:');
  console.log('  - packages/cli/src/lib/verification/test-runner.ts');
  console.log('  - packages/cli/src/lib/verification/index.ts');
  console.log('  - packages/cli/test/unit/verification/test-runner.test.ts');
  console.log('  - packages/cli/src/lib/verification/README.md');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
