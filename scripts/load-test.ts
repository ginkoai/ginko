/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [load-testing, performance, benchmarking, task-028]
 * @related: [health-check.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Load Testing Script
 * TASK-028: Production Deployment Verification
 *
 * Performs load testing on critical API endpoints:
 * - REST API (knowledge nodes)
 * - GraphQL queries
 * - Measures latency, throughput, error rates
 *
 * Usage:
 *   npx ts-node scripts/load-test.ts
 *   npx ts-node scripts/load-test.ts --concurrent=50 --requests=1000
 *   npx ts-node scripts/load-test.ts --endpoint=rest --auth=<token>
 *
 * Environment Variables:
 *   API_AUTH_TOKEN - Bearer token for authenticated endpoints
 *   GRAPH_ID - Graph ID for testing (default: test-graph)
 */

// Test configuration
interface LoadTestConfig {
  appUrl: string;
  concurrent: number;
  totalRequests: number;
  endpoint: 'rest' | 'graphql' | 'all';
  authToken?: string;
  graphId: string;
  verbose: boolean;
}

interface RequestResult {
  status: number;
  latency: number;
  error?: string;
  timestamp: number;
}

interface LoadTestReport {
  endpoint: string;
  config: {
    concurrent: number;
    totalRequests: number;
  };
  results: {
    successful: number;
    failed: number;
    total: number;
  };
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    totalDuration: number;
  };
  errors: Array<{ status: number; count: number; message?: string }>;
}

// Parse CLI arguments
function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  const config: LoadTestConfig = {
    appUrl: 'https://app.ginkoai.com',
    concurrent: 10,
    totalRequests: 100,
    endpoint: 'all',
    authToken: process.env.API_AUTH_TOKEN,
    graphId: process.env.GRAPH_ID || 'test-graph',
    verbose: args.includes('--verbose'),
  };

  args.forEach(arg => {
    if (arg.startsWith('--concurrent=')) {
      config.concurrent = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--requests=')) {
      config.totalRequests = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--endpoint=')) {
      config.endpoint = arg.split('=')[1] as 'rest' | 'graphql' | 'all';
    } else if (arg.startsWith('--auth=')) {
      config.authToken = arg.split('=')[1];
    } else if (arg.startsWith('--graph-id=')) {
      config.graphId = arg.split('=')[1];
    }
  });

  return config;
}

// Color helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message: string, color?: string) {
  console.log(`${color || ''}${message}${colors.reset}`);
}

// Make a single API request
async function makeRequest(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: any
): Promise<RequestResult> {
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return {
      status: response.status,
      latency: Date.now() - start,
      timestamp: start,
    };
  } catch (error: any) {
    return {
      status: 0,
      latency: Date.now() - start,
      error: error.message,
      timestamp: start,
    };
  }
}

// Run concurrent requests with controlled concurrency
async function runConcurrentRequests(
  requestFn: () => Promise<RequestResult>,
  concurrent: number,
  total: number
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  let completed = 0;
  let inProgress = 0;
  let started = 0;

  return new Promise((resolve) => {
    const startNext = async () => {
      if (started >= total) return;

      started++;
      inProgress++;

      try {
        const result = await requestFn();
        results.push(result);
      } catch (error: any) {
        results.push({
          status: 0,
          latency: 0,
          error: error.message,
          timestamp: Date.now(),
        });
      }

      completed++;
      inProgress--;

      // Print progress every 10 requests
      if (completed % 10 === 0) {
        process.stdout.write(`\r  Progress: ${completed}/${total} requests`);
      }

      if (completed === total) {
        process.stdout.write('\n');
        resolve(results);
      } else {
        startNext();
      }
    };

    // Start initial batch
    for (let i = 0; i < Math.min(concurrent, total); i++) {
      startNext();
    }
  });
}

// Calculate latency percentiles
function calculatePercentile(sortedLatencies: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedLatencies.length) - 1;
  return sortedLatencies[Math.max(0, index)];
}

// Analyze results and generate report
function analyzeResults(
  endpoint: string,
  config: LoadTestConfig,
  results: RequestResult[],
  duration: number
): LoadTestReport {
  const successful = results.filter(r => r.status >= 200 && r.status < 300).length;
  const failed = results.length - successful;

  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  // Count errors by status code
  const errorCounts: Record<number, number> = {};
  results.forEach(r => {
    if (r.status < 200 || r.status >= 300) {
      errorCounts[r.status] = (errorCounts[r.status] || 0) + 1;
    }
  });

  const errors = Object.entries(errorCounts).map(([status, count]) => ({
    status: parseInt(status, 10),
    count,
  }));

  return {
    endpoint,
    config: {
      concurrent: config.concurrent,
      totalRequests: config.totalRequests,
    },
    results: {
      successful,
      failed,
      total: results.length,
    },
    latency: {
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0,
      avg: Math.round(avgLatency),
      p50: calculatePercentile(latencies, 50),
      p90: calculatePercentile(latencies, 90),
      p95: calculatePercentile(latencies, 95),
      p99: calculatePercentile(latencies, 99),
    },
    throughput: {
      requestsPerSecond: Math.round((results.length / duration) * 1000),
      totalDuration: duration,
    },
    errors,
  };
}

// Print report
function printReport(report: LoadTestReport) {
  log(`\n${report.endpoint} Load Test Results:`, colors.blue);
  log(`  Configuration:`, colors.gray);
  log(`    Concurrent: ${report.config.concurrent}`);
  log(`    Total Requests: ${report.config.totalRequests}`);

  log(`\n  Results:`, colors.gray);
  const successRate = (report.results.successful / report.results.total) * 100;
  const successColor = successRate >= 99 ? colors.green : successRate >= 95 ? colors.yellow : colors.red;
  log(`    Successful: ${report.results.successful}/${report.results.total} (${successRate.toFixed(1)}%)`, successColor);
  if (report.results.failed > 0) {
    log(`    Failed: ${report.results.failed}`, colors.red);
  }

  log(`\n  Latency (ms):`, colors.gray);
  const latencyColor = report.latency.p95 < 200 ? colors.green : report.latency.p95 < 500 ? colors.yellow : colors.red;
  log(`    Min: ${report.latency.min}ms`);
  log(`    Max: ${report.latency.max}ms`);
  log(`    Avg: ${report.latency.avg}ms`);
  log(`    P50: ${report.latency.p50}ms`);
  log(`    P90: ${report.latency.p90}ms`);
  log(`    P95: ${report.latency.p95}ms`, latencyColor);
  log(`    P99: ${report.latency.p99}ms`);

  log(`\n  Throughput:`, colors.gray);
  log(`    ${report.throughput.requestsPerSecond} req/s`);
  log(`    Total Duration: ${Math.round(report.throughput.totalDuration)}ms`);

  if (report.errors.length > 0) {
    log(`\n  Errors:`, colors.red);
    report.errors.forEach(e => {
      log(`    HTTP ${e.status}: ${e.count} occurrences`);
    });
  }
}

// Test REST API endpoint
async function testRestApi(config: LoadTestConfig): Promise<LoadTestReport> {
  log('\n🔄 Testing REST API endpoint...', colors.blue);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }

  const url = `${config.appUrl}/api/v1/knowledge/nodes?graphId=${config.graphId}&limit=10`;

  const start = Date.now();
  const results = await runConcurrentRequests(
    () => makeRequest(url, 'GET', headers),
    config.concurrent,
    config.totalRequests
  );
  const duration = Date.now() - start;

  const report = analyzeResults('REST API', config, results, duration);
  printReport(report);

  return report;
}

// Test GraphQL endpoint
async function testGraphQl(config: LoadTestConfig): Promise<LoadTestReport> {
  log('\n🔄 Testing GraphQL endpoint...', colors.blue);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }

  const url = `${config.appUrl}/api/graphql`;
  const query = {
    query: `query TestQuery {
      nodes(graphId: "${config.graphId}", limit: 10) {
        id
        type
      }
    }`,
  };

  const start = Date.now();
  const results = await runConcurrentRequests(
    () => makeRequest(url, 'POST', headers, query),
    config.concurrent,
    config.totalRequests
  );
  const duration = Date.now() - start;

  const report = analyzeResults('GraphQL', config, results, duration);
  printReport(report);

  return report;
}

// Main execution
async function main() {
  const config = parseArgs();

  log('\n⚡ Ginko Load Testing Tool', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.gray);

  log('Configuration:', colors.gray);
  log(`  Target: ${config.appUrl}`);
  log(`  Concurrent: ${config.concurrent}`);
  log(`  Total Requests: ${config.totalRequests}`);
  log(`  Endpoint: ${config.endpoint}`);
  log(`  Graph ID: ${config.graphId}`);
  log(`  Auth: ${config.authToken ? 'Enabled' : 'Disabled'}`);

  const reports: LoadTestReport[] = [];

  try {
    if (config.endpoint === 'rest' || config.endpoint === 'all') {
      const report = await testRestApi(config);
      reports.push(report);
    }

    if (config.endpoint === 'graphql' || config.endpoint === 'all') {
      const report = await testGraphQl(config);
      reports.push(report);
    }

    // Print summary
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.gray);
    log('\n📊 Load Test Summary:\n', colors.blue);

    reports.forEach(report => {
      const successRate = (report.results.successful / report.results.total) * 100;
      const statusIcon = successRate >= 99 ? '🟢' : successRate >= 95 ? '🟡' : '🔴';
      log(`  ${statusIcon} ${report.endpoint}: ${successRate.toFixed(1)}% success, P95: ${report.latency.p95}ms`);
    });

    log('');

    // Check if any tests failed
    const anyFailed = reports.some(r => (r.results.successful / r.results.total) < 0.95);
    process.exit(anyFailed ? 1 : 0);
  } catch (error: any) {
    log(`\n❌ Load test failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as runLoadTest, type LoadTestConfig, type LoadTestReport };
