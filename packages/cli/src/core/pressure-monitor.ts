/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-01
 * @tags: [context-pressure, monitoring, adr-033, quality-degradation]
 * @related: [session-log-manager.ts, ../types/session-log.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Context pressure thresholds based on ADR-033 quality analysis
 */
export const PRESSURE_THRESHOLDS = {
  OPTIMAL_MAX: 0.5,      // 0-50%: Full reasoning capacity
  DEGRADATION_MAX: 0.85, // 50-85%: Noticeable compression
  CRITICAL_MAX: 1.0      // 85-100%: Significant degradation
} as const;

export type PressureZone = 'optimal' | 'degradation' | 'critical';

/**
 * Monitors context window pressure and provides quality assessments
 * Implements ADR-033 Phase 1: Pressure monitoring for session log decisions
 *
 * Quality Estimation:
 * - 0-50%:   100% quality - Full reasoning available
 * - 50-70%:   95% quality - Minor compression
 * - 70-85%:   85% quality - Noticeable compression
 * - 85-95%:   65% quality - Significant degradation
 * - 95-100%:  40% quality - Crisis mode
 */
export class PressureMonitor {
  private currentPressure: number = 0;

  /**
   * Get current context pressure as 0-1 float
   *
   * @returns Current pressure value (0 = empty, 1 = full)
   *
   * @note PHASE 1 IMPLEMENTATION: Returns mock value
   * @todo PHASE 2: Integrate with Claude API token counting
   *
   * Integration point for Claude Code API:
   * - Use conversation.usage.input_tokens / conversation.max_tokens
   * - Or estimate based on message count and average length
   * - Consider implementing exponential smoothing for stability
   */
  getCurrentPressure(): number {
    // PHASE 1: Mock implementation for testing infrastructure
    // In production, this would query the Claude API for actual token usage
    return this.currentPressure;
  }

  /**
   * Set current pressure (for testing and mock purposes)
   * @internal
   */
  setCurrentPressure(pressure: number): void {
    if (pressure < 0 || pressure > 1) {
      throw new Error('Pressure must be between 0 and 1');
    }
    this.currentPressure = pressure;
  }

  /**
   * Determine current pressure zone based on thresholds
   *
   * @returns Zone classification: optimal, degradation, or critical
   */
  getPressureZone(): PressureZone {
    const pressure = this.getCurrentPressure();

    if (pressure <= PRESSURE_THRESHOLDS.OPTIMAL_MAX) {
      return 'optimal';
    } else if (pressure <= PRESSURE_THRESHOLDS.DEGRADATION_MAX) {
      return 'degradation';
    } else {
      return 'critical';
    }
  }

  /**
   * Determine if an event should be logged based on pressure
   *
   * Logging Policy (ADR-033):
   * - Log all events in optimal zone (< 50%)
   * - Log all events in degradation zone (50-85%)
   * - Skip logging in critical zone (> 85%) to preserve context
   *
   * @returns true if event should be logged, false if pressure too high
   */
  shouldLogEvent(): boolean {
    return this.getCurrentPressure() < PRESSURE_THRESHOLDS.DEGRADATION_MAX;
  }

  /**
   * Estimate reasoning quality at current pressure
   *
   * @returns Quality percentage (40-100)
   */
  estimateQuality(): number {
    const pressure = this.getCurrentPressure();

    if (pressure <= 0.5) {
      return 100;
    } else if (pressure <= 0.7) {
      return 95;
    } else if (pressure <= 0.85) {
      return 85;
    } else if (pressure <= 0.95) {
      return 65;
    } else {
      return 40;
    }
  }

  /**
   * Determine if handoff should be triggered based on pressure
   *
   * @returns true if pressure is in critical zone (> 85%)
   */
  shouldTriggerHandoff(): boolean {
    return this.getCurrentPressure() > PRESSURE_THRESHOLDS.DEGRADATION_MAX;
  }

  /**
   * Get human-readable pressure status
   *
   * @returns Descriptive status string
   */
  getPressureStatus(): string {
    const pressure = this.getCurrentPressure();
    const zone = this.getPressureZone();
    const quality = this.estimateQuality();

    return `${(pressure * 100).toFixed(0)}% (${zone} - ${quality}% quality)`;
  }
}
