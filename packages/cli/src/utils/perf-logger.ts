/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-05
 * @tags: [performance, timing, metrics, EPIC-018]
 * @related: [context-loader-events.ts, start-reflection.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * Performance Logger for Context Loading (EPIC-018 Sprint 1 TASK-04)
 *
 * Provides timing instrumentation for context loading operations.
 * Enabled via GINKO_PERF_LOG=true environment variable.
 *
 * Usage:
 * ```typescript
 * const perf = PerfLogger.create('contextLoad');
 * perf.mark('apiCall');
 * await fetchData();
 * perf.measure('apiCall', 'API call completed');
 * perf.summary();
 * ```
 */

export interface PerfMark {
  name: string;
  timestamp: number;
}

export interface PerfMeasure {
  name: string;
  duration: number;
  label?: string;
}

export interface PerfSummary {
  operation: string;
  totalDuration: number;
  measures: PerfMeasure[];
  startedAt: number;
  endedAt: number;
}

/**
 * Performance logger for measuring operation timing
 */
export class PerfLogger {
  private operation: string;
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private measures: PerfMeasure[] = [];
  private enabled: boolean;

  private constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    this.enabled = process.env.GINKO_PERF_LOG === 'true' ||
                   process.env.GINKO_DEBUG === 'true';
  }

  /**
   * Create a new performance logger for an operation
   */
  static create(operation: string): PerfLogger {
    return new PerfLogger(operation);
  }

  /**
   * Mark the start of a timed section
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * Measure duration since a mark was set
   * @returns duration in milliseconds
   */
  measure(markName: string, label?: string): number {
    const markTime = this.marks.get(markName);
    if (!markTime) {
      return 0;
    }

    const duration = Date.now() - markTime;
    this.measures.push({
      name: markName,
      duration,
      label,
    });

    if (this.enabled) {
      console.log(`[perf] ${label || markName}: ${duration}ms`);
    }

    return duration;
  }

  /**
   * Quick measure from operation start
   */
  elapsed(label?: string): number {
    const duration = Date.now() - this.startTime;
    if (this.enabled && label) {
      console.log(`[perf] ${label}: ${duration}ms (total)`);
    }
    return duration;
  }

  /**
   * Log a summary of all measurements
   */
  summary(): PerfSummary {
    const endedAt = Date.now();
    const totalDuration = endedAt - this.startTime;

    if (this.enabled) {
      console.log(`[perf] === ${this.operation} Summary ===`);
      console.log(`[perf] Total duration: ${totalDuration}ms`);
      for (const m of this.measures) {
        const pct = Math.round((m.duration / totalDuration) * 100);
        console.log(`[perf]   ${m.label || m.name}: ${m.duration}ms (${pct}%)`);
      }
    }

    return {
      operation: this.operation,
      totalDuration,
      measures: this.measures,
      startedAt: this.startTime,
      endedAt,
    };
  }

  /**
   * Check if performance logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get total elapsed time in ms
   */
  getTotalDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Utility to time a promise and log result
 */
export async function timeAsync<T>(
  operation: string,
  promise: Promise<T>,
  options?: { silent?: boolean }
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await promise;
  const duration = Date.now() - start;

  if (!options?.silent && (process.env.GINKO_PERF_LOG === 'true' || process.env.GINKO_DEBUG === 'true')) {
    console.log(`[perf] ${operation}: ${duration}ms`);
  }

  return { result, duration };
}

/**
 * Time multiple parallel operations
 */
export async function timeParallel<T extends readonly unknown[]>(
  operation: string,
  promises: { [K in keyof T]: Promise<T[K]> },
  labels?: string[]
): Promise<{ results: T; duration: number }> {
  const start = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - start;

  if (process.env.GINKO_PERF_LOG === 'true' || process.env.GINKO_DEBUG === 'true') {
    console.log(`[perf] ${operation} (${promises.length} parallel): ${duration}ms`);
    if (labels) {
      labels.forEach((label, i) => {
        console.log(`[perf]   ${label}: completed`);
      });
    }
  }

  return { results: results as unknown as T, duration };
}
