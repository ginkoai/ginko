/**
 * @fileType: script
 * @status: current
 * @updated: 2025-11-24
 * @tags: [performance, profiling, task-3, epic-002]
 * @related: [task/[id]/constraints/route.ts, _cloud-graph-client.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * TASK-3: Profile /api/v1/task/{id}/constraints endpoint
 *
 * Measures response times to verify < 200ms target (ADR-043)
 *
 * Usage:
 *   GINKO_BEARER_TOKEN=gk_xxx npx tsx scripts/profile-constraints-api.ts
 */

const API_BASE = process.env.GINKO_GRAPH_API_URL || 'https://app.ginkoai.com';
const BEARER_TOKEN = process.env.GINKO_BEARER_TOKEN;
const GRAPH_ID = process.env.GINKO_GRAPH_ID || 'gin_1762125961056_dg4bsd';

// Test task IDs - use dynamic IDs from sprint sync
// Note: Sprint sync generates timestamped IDs like task_1_1764031658008
const TEST_TASK_IDS = [
  'task_1_1764031658008',
  'task_2_1764031658008',
  'task_3_1764031658008',
  'task_4_1764031658008',
  'task_nonexistent', // Edge case: missing task
];

interface ProfileResult {
  taskId: string;
  statusCode: number;
  responseTimeMs: number;
  constraintCount: number;
  success: boolean;
  error?: string;
}

async function profileConstraintsEndpoint(taskId: string): Promise<ProfileResult> {
  const url = `${API_BASE}/api/v1/task/${taskId}/constraints?graphId=${GRAPH_ID}`;
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const endTime = performance.now();
    const responseTimeMs = Math.round((endTime - startTime) * 100) / 100;

    const data = await response.json();

    return {
      taskId,
      statusCode: response.status,
      responseTimeMs,
      constraintCount: data.count || 0,
      success: response.ok,
      error: response.ok ? undefined : data.error,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      taskId,
      statusCode: 0,
      responseTimeMs: Math.round((endTime - startTime) * 100) / 100,
      constraintCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runProfiler(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK-3: Constraints API Performance Profile               ║');
  console.log('║  Target: < 200ms per request (ADR-043)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!BEARER_TOKEN) {
    console.error('❌ Missing GINKO_BEARER_TOKEN environment variable');
    console.log('\nUsage:');
    console.log('  GINKO_BEARER_TOKEN=gk_xxx npx tsx scripts/profile-constraints-api.ts\n');
    process.exit(1);
  }

  console.log(`API Base: ${API_BASE}`);
  console.log(`Graph ID: ${GRAPH_ID}`);
  console.log(`Tasks to profile: ${TEST_TASK_IDS.length}\n`);

  const results: ProfileResult[] = [];

  // Warm-up request (first request often slower due to cold start)
  console.log('🔥 Warming up connection...');
  await profileConstraintsEndpoint(TEST_TASK_IDS[0]);
  console.log('   Done\n');

  // Profile each task
  console.log('📊 Profiling tasks:\n');
  console.log('┌──────────────────────┬────────┬───────────────┬─────────────┐');
  console.log('│ Task ID              │ Status │ Response (ms) │ Constraints │');
  console.log('├──────────────────────┼────────┼───────────────┼─────────────┤');

  for (const taskId of TEST_TASK_IDS) {
    const result = await profileConstraintsEndpoint(taskId);
    results.push(result);

    const statusIcon = result.success ? '✓' : '✗';
    const timeColor = result.responseTimeMs < 200 ? '🟢' : '🔴';

    console.log(
      `│ ${taskId.padEnd(20)} │ ${String(result.statusCode).padStart(3)}${statusIcon.padStart(2)} │ ${timeColor} ${String(result.responseTimeMs).padStart(8)} │ ${String(result.constraintCount).padStart(11)} │`
    );

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('└──────────────────────┴────────┴───────────────┴─────────────┘\n');

  // Calculate statistics
  const successfulResults = results.filter(r => r.success);
  const times = successfulResults.map(r => r.responseTimeMs);

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p50 = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    console.log('📈 Performance Summary:');
    console.log('┌──────────────────────────────────────────────────┐');
    console.log(`│ Average Response Time:     ${String(avgTime.toFixed(2)).padStart(8)} ms           │`);
    console.log(`│ Min Response Time:         ${String(minTime.toFixed(2)).padStart(8)} ms           │`);
    console.log(`│ Max Response Time:         ${String(maxTime.toFixed(2)).padStart(8)} ms           │`);
    console.log(`│ P50 (Median):              ${String(p50.toFixed(2)).padStart(8)} ms           │`);
    console.log(`│ P95:                       ${String(p95.toFixed(2)).padStart(8)} ms           │`);
    console.log('├──────────────────────────────────────────────────┤');

    const meetsTarget = maxTime < 200;
    const targetIcon = meetsTarget ? '✅' : '❌';
    console.log(`│ Target (< 200ms):          ${targetIcon} ${meetsTarget ? 'PASS' : 'FAIL'}                  │`);
    console.log('└──────────────────────────────────────────────────┘\n');

    if (!meetsTarget) {
      console.log('⚠️  Performance target not met. Consider:');
      console.log('   - Adding Neo4j indexes on Task.id');
      console.log('   - Optimizing MUST_FOLLOW relationship queries');
      console.log('   - Reviewing connection pool settings');
    }
  } else {
    console.log('❌ No successful requests to analyze');
  }

  // Detailed results for debugging
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n⚠️  Failed Requests:');
    failures.forEach(f => {
      console.log(`   - ${f.taskId}: ${f.error}`);
    });
  }
}

// Run the profiler
runProfiler().catch(console.error);
