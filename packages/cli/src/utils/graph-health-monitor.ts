/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-21
 * @tags: [monitoring, health-check, graph, reliability, task-013]
 * @related: [../commands/graph/api-client.ts, event-logger.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Graph Health Monitor (TASK-013)
 *
 * Tracks graph operation metrics for reliability monitoring.
 * Provides simple in-memory metrics for:
 * - Event creation success/failure rates
 * - Request latencies
 * - Retry counts
 *
 * Future: Export to external monitoring (Datadog, New Relic, etc.)
 */

export interface GraphMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryCount: number;
  totalLatencyMs: number;
  lastError?: {
    timestamp: Date;
    message: string;
    operation: string;
  };
}

class GraphHealthMonitor {
  private metrics: GraphMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retryCount: 0,
    totalLatencyMs: 0,
  };

  /**
   * Record a successful graph operation
   */
  recordSuccess(latencyMs: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.totalLatencyMs += latencyMs;
  }

  /**
   * Record a failed graph operation
   */
  recordFailure(operation: string, errorMessage: string): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastError = {
      timestamp: new Date(),
      message: errorMessage,
      operation,
    };
  }

  /**
   * Record a retry attempt
   */
  recordRetry(): void {
    this.metrics.retryCount++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): GraphMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 100;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.metrics.successfulRequests === 0) return 0;
    return this.metrics.totalLatencyMs / this.metrics.successfulRequests;
  }

  /**
   * Check if graph health is good (target: 99.9% uptime)
   */
  isHealthy(): boolean {
    return this.getSuccessRate() >= 99.9;
  }

  /**
   * Get health status summary
   */
  getHealthSummary(): string {
    const successRate = this.getSuccessRate();
    const avgLatency = this.getAverageLatency();
    const health = this.isHealthy() ? '✅ Healthy' : '⚠️  Degraded';

    return `
Graph Health: ${health}
──────────────────────────────────────
Total Requests:    ${this.metrics.totalRequests}
Successful:        ${this.metrics.successfulRequests} (${successRate.toFixed(2)}%)
Failed:            ${this.metrics.failedRequests}
Retries:           ${this.metrics.retryCount}
Avg Latency:       ${avgLatency.toFixed(0)}ms
──────────────────────────────────────
Target:            99.9% success rate
Status:            ${successRate >= 99.9 ? '✅ Meeting target' : '⚠️  Below target'}
`;
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryCount: 0,
      totalLatencyMs: 0,
    };
  }
}

// Singleton instance
export const graphHealthMonitor = new GraphHealthMonitor();
