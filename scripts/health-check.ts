/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [monitoring, health-check, production, neo4j, supabase, vercel, task-028]
 * @related: [load-test.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, node-fetch]
 */

/**
 * Production Health Check Script
 * TASK-028: Production Deployment Verification
 *
 * Checks all production infrastructure components:
 * - Vercel deployment (app.ginkoai.com)
 * - Neo4j AuraDB connection and performance
 * - Supabase authentication
 * - REST API endpoints
 * - GraphQL endpoint
 * - SSL certificates
 * - DNS resolution
 *
 * Usage:
 *   npx ts-node scripts/health-check.ts
 *   npx ts-node scripts/health-check.ts --verbose
 *
 * Environment Variables Required:
 *   NEO4J_URI - Neo4j AuraDB connection string
 *   NEO4J_USER - Neo4j username
 *   NEO4J_PASSWORD - Neo4j password
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 */

import neo4j from 'neo4j-driver';
import * as https from 'https';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveDns = promisify(dns.resolve);

// Configuration
const config = {
  appUrl: 'https://app.ginkoai.com',
  neo4jUri: process.env.NEO4J_URI || '',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  verbose: process.argv.includes('--verbose'),
};

// Test result types
interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
  latency?: number;
}

interface HealthCheckReport {
  timestamp: Date;
  overallStatus: 'green' | 'yellow' | 'red';
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

// Color output helpers
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

function logResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
  const color = result.status === 'pass' ? colors.green : result.status === 'fail' ? colors.red : colors.yellow;
  const latency = result.latency ? ` (${result.latency}ms)` : '';

  log(`  ${icon} ${result.name}${latency}`, color);
  log(`    ${result.message}`, colors.gray);

  if (config.verbose && result.details) {
    console.log('    Details:', result.details);
  }
}

// Test implementations
async function testDnsResolution(): Promise<TestResult> {
  const start = Date.now();
  try {
    const addresses = await resolveDns('app.ginkoai.com');
    return {
      name: 'DNS Resolution',
      status: 'pass',
      message: `Resolved to ${addresses.length} address(es)`,
      details: addresses,
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'DNS Resolution',
      status: 'fail',
      message: `Failed to resolve: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

async function testSslCertificate(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.get(config.appUrl, (res) => {
      const cert = (res.socket as any).getPeerCertificate();
      const validTo = new Date(cert.valid_to);
      const daysUntilExpiry = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 7) {
        resolve({
          name: 'SSL Certificate',
          status: 'warn',
          message: `Certificate expires in ${daysUntilExpiry} days`,
          details: { validTo: cert.valid_to, issuer: cert.issuer },
          latency: Date.now() - start,
        });
      } else {
        resolve({
          name: 'SSL Certificate',
          status: 'pass',
          message: `Valid until ${cert.valid_to} (${daysUntilExpiry} days)`,
          details: { issuer: cert.issuer },
          latency: Date.now() - start,
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        name: 'SSL Certificate',
        status: 'fail',
        message: `Failed to verify certificate: ${error.message}`,
        latency: Date.now() - start,
      });
    });
  });
}

async function testVercelDeployment(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(config.appUrl);
    const latency = Date.now() - start;

    if (response.ok) {
      return {
        name: 'Vercel Deployment',
        status: 'pass',
        message: `HTTP ${response.status} - Deployment accessible`,
        details: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
        latency,
      };
    } else {
      return {
        name: 'Vercel Deployment',
        status: 'fail',
        message: `HTTP ${response.status} - ${response.statusText}`,
        latency,
      };
    }
  } catch (error: any) {
    return {
      name: 'Vercel Deployment',
      status: 'fail',
      message: `Connection failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

async function testNeo4jConnection(): Promise<TestResult> {
  if (!config.neo4jUri || !config.neo4jPassword) {
    return {
      name: 'Neo4j AuraDB Connection',
      status: 'warn',
      message: 'Neo4j credentials not configured (set NEO4J_URI, NEO4J_PASSWORD)',
    };
  }

  const start = Date.now();
  let driver: any | null = null;

  try {
    driver = neo4j.driver(
      config.neo4jUri,
      neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
    );

    // Verify connectivity
    await driver.verifyConnectivity();
    const latency = Date.now() - start;

    // Run a simple query to test performance
    const session = driver.session();
    const queryStart = Date.now();
    const result = await session.run('RETURN 1 as num');
    const queryLatency = Date.now() - queryStart;
    await session.close();

    if (queryLatency > 500) {
      return {
        name: 'Neo4j AuraDB Connection',
        status: 'warn',
        message: `Connected but slow query response: ${queryLatency}ms`,
        latency,
      };
    }

    return {
      name: 'Neo4j AuraDB Connection',
      status: 'pass',
      message: `Connected successfully, query latency: ${queryLatency}ms`,
      latency,
    };
  } catch (error: any) {
    return {
      name: 'Neo4j AuraDB Connection',
      status: 'fail',
      message: `Connection failed: ${error.message}`,
      latency: Date.now() - start,
    };
  } finally {
    if (driver) {
      await driver.close();
    }
  }
}

async function testNeo4jPerformance(): Promise<TestResult> {
  if (!config.neo4jUri || !config.neo4jPassword) {
    return {
      name: 'Neo4j Performance',
      status: 'warn',
      message: 'Skipped (Neo4j not configured)',
    };
  }

  const start = Date.now();
  let driver: any | null = null;

  try {
    driver = neo4j.driver(
      config.neo4jUri,
      neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
    );

    const session = driver.session();

    // Test: Count nodes
    const countStart = Date.now();
    const countResult = await session.run('MATCH (n) RETURN count(n) as count');
    const countLatency = Date.now() - countStart;
    const nodeCount = countResult.records[0].get('count').toNumber();

    // Test: Sample graph query
    const graphStart = Date.now();
    await session.run('MATCH (n) RETURN n LIMIT 10');
    const graphLatency = Date.now() - graphStart;

    await session.close();

    const avgLatency = (countLatency + graphLatency) / 2;

    if (avgLatency > 200) {
      return {
        name: 'Neo4j Performance',
        status: 'warn',
        message: `Average query latency: ${Math.round(avgLatency)}ms (>200ms threshold)`,
        details: { nodeCount, countLatency, graphLatency },
        latency: Date.now() - start,
      };
    }

    return {
      name: 'Neo4j Performance',
      status: 'pass',
      message: `${nodeCount} nodes, avg query latency: ${Math.round(avgLatency)}ms`,
      details: { nodeCount, countLatency, graphLatency },
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Neo4j Performance',
      status: 'fail',
      message: `Performance test failed: ${error.message}`,
      latency: Date.now() - start,
    };
  } finally {
    if (driver) {
      await driver.close();
    }
  }
}

async function testSupabaseConnection(): Promise<TestResult> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return {
      name: 'Supabase Connection',
      status: 'warn',
      message: 'Supabase credentials not configured',
    };
  }

  const start = Date.now();
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 404) {
      return {
        name: 'Supabase Connection',
        status: 'pass',
        message: `Connected successfully`,
        latency,
      };
    } else {
      return {
        name: 'Supabase Connection',
        status: 'fail',
        message: `HTTP ${response.status} - ${response.statusText}`,
        latency,
      };
    }
  } catch (error: any) {
    return {
      name: 'Supabase Connection',
      status: 'fail',
      message: `Connection failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

async function testRestApiEndpoint(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test without auth (should return 401)
    const response = await fetch(`${config.appUrl}/api/v1/knowledge/nodes?graphId=test-graph&limit=5`);
    const latency = Date.now() - start;

    if (response.status === 401) {
      const data: any = await response.json();
      if (data.error && data.error.includes('authorization')) {
        return {
          name: 'REST API Endpoint',
          status: 'pass',
          message: 'API endpoint accessible, authentication required (expected)',
          latency,
        };
      }
    }

    return {
      name: 'REST API Endpoint',
      status: 'warn',
      message: `Unexpected response: HTTP ${response.status}`,
      latency,
    };
  } catch (error: any) {
    return {
      name: 'REST API Endpoint',
      status: 'fail',
      message: `API request failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

async function testGraphQlEndpoint(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test without auth (should return error about authorization)
    const response = await fetch(`${config.appUrl}/api/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    });

    const latency = Date.now() - start;
    const data: any = await response.json();

    if (data.errors && data.errors[0]?.message?.includes('authorization')) {
      return {
        name: 'GraphQL Endpoint',
        status: 'pass',
        message: 'GraphQL endpoint accessible, authentication required (expected)',
        latency,
      };
    }

    return {
      name: 'GraphQL Endpoint',
      status: 'warn',
      message: `Unexpected response: ${JSON.stringify(data).substring(0, 100)}`,
      details: data,
      latency,
    };
  } catch (error: any) {
    return {
      name: 'GraphQL Endpoint',
      status: 'fail',
      message: `GraphQL request failed: ${error.message}`,
      latency: Date.now() - start,
    };
  }
}

// Run all health checks
async function runHealthChecks(): Promise<HealthCheckReport> {
  log('\n🔍 Running Production Health Checks...\n', colors.blue);

  const results: TestResult[] = [];

  // Infrastructure tests
  log('Infrastructure:', colors.blue);
  results.push(await testDnsResolution());
  results.push(await testSslCertificate());
  results.push(await testVercelDeployment());

  // Database tests
  log('\nDatabase:', colors.blue);
  results.push(await testNeo4jConnection());
  results.push(await testNeo4jPerformance());

  // Authentication tests
  log('\nAuthentication:', colors.blue);
  results.push(await testSupabaseConnection());

  // API tests
  log('\nAPI Endpoints:', colors.blue);
  results.push(await testRestApiEndpoint());
  results.push(await testGraphQlEndpoint());

  // Print results
  log('');
  results.forEach(logResult);

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warn').length,
  };

  // Determine overall status
  let overallStatus: 'green' | 'yellow' | 'red';
  if (summary.failed > 0) {
    overallStatus = 'red';
  } else if (summary.warnings > 0) {
    overallStatus = 'yellow';
  } else {
    overallStatus = 'green';
  }

  // Print summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.gray);
  log('\n📊 Health Check Summary:\n', colors.blue);
  log(`  Total Tests: ${summary.total}`, colors.gray);
  log(`  Passed: ${summary.passed}`, colors.green);
  log(`  Failed: ${summary.failed}`, summary.failed > 0 ? colors.red : colors.gray);
  log(`  Warnings: ${summary.warnings}`, summary.warnings > 0 ? colors.yellow : colors.gray);

  const statusIcon = overallStatus === 'green' ? '🟢' : overallStatus === 'yellow' ? '🟡' : '🔴';
  const statusColor = overallStatus === 'green' ? colors.green : overallStatus === 'yellow' ? colors.yellow : colors.red;
  log(`\n  Overall Status: ${statusIcon} ${overallStatus.toUpperCase()}`, statusColor);
  log('');

  return {
    timestamp: new Date(),
    overallStatus,
    results,
    summary,
  };
}

// Main execution
async function main() {
  try {
    const report = await runHealthChecks();

    // Exit with appropriate code
    process.exit(report.overallStatus === 'red' ? 1 : 0);
  } catch (error: any) {
    log(`\n❌ Health check failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runHealthChecks, type HealthCheckReport, type TestResult };
