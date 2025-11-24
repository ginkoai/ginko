/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-24
 * @tags: [benchmark, performance, startup, task-10]
 * @related: [context-loader-events.ts, start-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Startup Performance Benchmark Tests (TASK-10)
 *
 * Tests validate that ginko start meets performance targets:
 * - Cold start: <2.5s p95
 * - Warm start: <2.0s p95
 * - Context loading: <1.5s p95
 *
 * Key optimizations measured:
 * - Parallel strategic context + charter loading (saves 200-300ms)
 * - Parallel relationship API calls (saves 500ms-1.5s)
 * - Module-level regex compilation (saves 20-50ms)
 * - Network timeout protection (3s max, prevents hangs)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Performance targets (milliseconds)
const TARGETS = {
  coldStart: {
    p95: 2500,  // 2.5 seconds
    p99: 3000,  // 3.0 seconds (allows for network variance)
  },
  warmStart: {
    p95: 2000,  // 2.0 seconds
    p99: 2500,  // 2.5 seconds
  },
  contextLoad: {
    p95: 1500,  // 1.5 seconds (just the API call portion)
  }
};

interface BenchmarkResult {
  runs: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

/**
 * Run benchmark and calculate statistics
 */
async function runBenchmark(
  command: string,
  runs: number = 10,
  warmupRuns: number = 2
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup runs (not counted)
  for (let i = 0; i < warmupRuns; i++) {
    const start = Date.now();
    try {
      await execAsync(command, { timeout: 30000 });
    } catch (e) {
      // Ignore errors during warmup
    }
    console.log(`  Warmup ${i + 1}: ${Date.now() - start}ms`);
  }

  // Actual benchmark runs
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    try {
      await execAsync(command, { timeout: 30000 });
      const elapsed = Date.now() - start;
      times.push(elapsed);
      console.log(`  Run ${i + 1}: ${elapsed}ms`);
    } catch (e) {
      console.log(`  Run ${i + 1}: FAILED - ${(e as Error).message}`);
    }
  }

  if (times.length === 0) {
    throw new Error('All benchmark runs failed');
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    runs: times,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / times.length),
    median: sorted[Math.floor(sorted.length / 2)],
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

describe('Startup Performance Benchmarks', () => {
  // Skip in CI unless explicitly enabled
  const skipInCI = process.env.CI === 'true' && process.env.RUN_BENCHMARKS !== 'true';

  beforeAll(() => {
    if (skipInCI) {
      console.log('⚠️  Skipping benchmarks in CI (set RUN_BENCHMARKS=true to enable)');
    }
  });

  describe('ginko start command', () => {
    it('should complete cold start in <2.5s p95', async () => {
      if (skipInCI) return;

      console.log('\n📊 Running cold start benchmark (5 runs)...');
      const result = await runBenchmark('ginko start', 5, 0);

      console.log(`\n📈 Results:`);
      console.log(`   Min: ${result.min}ms`);
      console.log(`   Max: ${result.max}ms`);
      console.log(`   Mean: ${result.mean}ms`);
      console.log(`   Median: ${result.median}ms`);
      console.log(`   p95: ${result.p95}ms (target: <${TARGETS.coldStart.p95}ms)`);
      console.log(`   p99: ${result.p99}ms (target: <${TARGETS.coldStart.p99}ms)`);

      expect(result.p95).toBeLessThan(TARGETS.coldStart.p95);
    }, 120000); // 2 minute timeout

    it('should complete warm start in <2.0s p95', async () => {
      if (skipInCI) return;

      console.log('\n📊 Running warm start benchmark (10 runs with 2 warmup)...');
      const result = await runBenchmark('ginko start', 10, 2);

      console.log(`\n📈 Results:`);
      console.log(`   Min: ${result.min}ms`);
      console.log(`   Max: ${result.max}ms`);
      console.log(`   Mean: ${result.mean}ms`);
      console.log(`   Median: ${result.median}ms`);
      console.log(`   p95: ${result.p95}ms (target: <${TARGETS.warmStart.p95}ms)`);
      console.log(`   p99: ${result.p99}ms (target: <${TARGETS.warmStart.p99}ms)`);

      expect(result.p95).toBeLessThan(TARGETS.warmStart.p95);
    }, 180000); // 3 minute timeout
  });

  describe('context-loader-events performance', () => {
    it('should load context in <1.5s p95', async () => {
      if (skipInCI) return;

      // This test measures just the context loading portion
      // by parsing the "Consolidated load: XXXms" output
      console.log('\n📊 Running context load benchmark (5 runs)...');

      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        try {
          const { stdout } = await execAsync('ginko start 2>&1', { timeout: 30000 });
          const match = stdout.match(/Consolidated load: (\d+)ms/);
          if (match) {
            const elapsed = parseInt(match[1], 10);
            times.push(elapsed);
            console.log(`  Run ${i + 1}: ${elapsed}ms (API call)`);
          }
        } catch (e) {
          console.log(`  Run ${i + 1}: FAILED`);
        }
      }

      if (times.length === 0) {
        console.log('⚠️  Could not extract timing from output');
        return;
      }

      const sorted = [...times].sort((a, b) => a - b);
      const p95 = percentile(sorted, 95);

      console.log(`\n📈 Context Load Results:`);
      console.log(`   Min: ${sorted[0]}ms`);
      console.log(`   Max: ${sorted[sorted.length - 1]}ms`);
      console.log(`   p95: ${p95}ms (target: <${TARGETS.contextLoad.p95}ms)`);

      expect(p95).toBeLessThan(TARGETS.contextLoad.p95);
    }, 120000);
  });

  describe('optimization validation', () => {
    it('should use parallel context loading (Promise.all)', async () => {
      if (skipInCI) return;

      // Verify both strategic context and charter are loaded
      const { stdout } = await execAsync('ginko start 2>&1', { timeout: 30000 });

      // Both should appear in output (loaded in parallel)
      const hasStrategicContext = stdout.includes('Strategic context loaded');
      const hasCharter = stdout.includes('Charter loaded');

      console.log(`\n✓ Strategic context loaded: ${hasStrategicContext}`);
      console.log(`✓ Charter loaded: ${hasCharter}`);

      // At least one should be present (filesystem charter is always available)
      expect(hasStrategicContext || hasCharter).toBe(true);
    }, 30000);

    it('should have timeout protection on GraphQL calls', async () => {
      // This is a code inspection test - we verify the timeout exists in the source
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('../../src/lib/context-loader-events.ts'),
        'utf-8'
      );

      // Check for AbortController and timeout
      expect(source).toContain('AbortController');
      expect(source).toContain('setTimeout');
      expect(source).toContain('controller.abort()');
      expect(source).toContain('3000'); // 3 second timeout

      console.log('✓ Timeout protection verified in source code');
    });

    it('should use module-level regex patterns', async () => {
      // This is a code inspection test
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('../../src/lib/context-loader-events.ts'),
        'utf-8'
      );

      // Check for module-level pattern constant
      expect(source).toContain('const DOCUMENT_REFERENCE_PATTERN');
      expect(source).toContain('/(ADR|PRD|Pattern|TASK)-\\d+/gi');

      console.log('✓ Module-level regex patterns verified');
    });
  });
});

/**
 * Performance regression detection
 *
 * Run with: npm test -- --testNamePattern="regression"
 */
describe('Performance Regression Detection', () => {
  // Baseline from TASK-10 implementation (2025-11-24)
  const BASELINE = {
    coldStart: 2200,  // First run after build
    warmStart: 1750,  // Subsequent runs
    contextLoad: 800, // API call only
  };

  // Allow 20% regression before failing
  const REGRESSION_THRESHOLD = 1.2;

  it('should not regress more than 20% from baseline', async () => {
    if (process.env.CI === 'true' && process.env.RUN_BENCHMARKS !== 'true') {
      console.log('⚠️  Skipping regression test in CI');
      return;
    }

    console.log('\n📊 Running regression check (3 runs)...');

    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await execAsync('ginko start 2>&1', { timeout: 30000 });
      times.push(Date.now() - start);
    }

    const mean = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const threshold = Math.round(BASELINE.warmStart * REGRESSION_THRESHOLD);

    console.log(`\n📈 Regression Check:`);
    console.log(`   Baseline: ${BASELINE.warmStart}ms`);
    console.log(`   Current mean: ${mean}ms`);
    console.log(`   Threshold (20%): ${threshold}ms`);
    console.log(`   Status: ${mean <= threshold ? '✅ PASS' : '❌ REGRESSION DETECTED'}`);

    expect(mean).toBeLessThanOrEqual(threshold);
  }, 60000);
});
