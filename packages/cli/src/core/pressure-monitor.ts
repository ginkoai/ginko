/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-01
 * @tags: [context-pressure, monitoring, quality-estimation, session-management]
 * @related: [session-log-manager.ts, status.ts, start/index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Context Pressure Monitor
 *
 * Tracks context window utilization and provides quality estimates.
 * Based on ADR-033: Context Pressure Mitigation Strategy.
 */

export type PressureZone = 'optimal' | 'degradation' | 'critical';

export interface PressureReading {
  pressure: number; // 0-1 float
  zone: PressureZone;
  qualityEstimate: number; // 0-100 percentage
  recommendation: string;
  tokensUsed?: number;
  maxTokens?: number;
}

/**
 * Context Pressure Thresholds
 * Based on empirical observations from ADR-033
 */
const PRESSURE_THRESHOLDS = {
  OPTIMAL_MAX: 0.50,      // 0-50%: Full reasoning capacity
  DEGRADATION_MAX: 0.85,  // 50-85%: Noticeable compression
  CRITICAL_MAX: 1.0       // 85-100%: Severe degradation
};

/**
 * Quality Estimation Curve
 * Maps pressure percentage to expected AI quality
 */
const QUALITY_CURVE = [
  { pressure: 0.00, quality: 100 },
  { pressure: 0.50, quality: 100 },
  { pressure: 0.70, quality: 95 },
  { pressure: 0.85, quality: 85 },
  { pressure: 0.95, quality: 65 },
  { pressure: 1.00, quality: 40 }
];

export class PressureMonitor {
  private static estimatedTokens: number = 0;
  private static maxTokens: number = 200000; // Claude Sonnet 4.5 default

  /**
   * Calculate current context pressure
   * @param tokensUsed Optional override for token count
   * @returns Pressure value between 0 and 1
   */
  static getCurrentPressure(tokensUsed?: number): number {
    const used = tokensUsed ?? this.estimatedTokens;
    return Math.min(used / this.maxTokens, 1.0);
  }

  /**
   * Get pressure zone classification
   * @param pressure Optional pressure value (calculated if not provided)
   */
  static getPressureZone(pressure?: number): PressureZone {
    const p = pressure ?? this.getCurrentPressure();

    if (p <= PRESSURE_THRESHOLDS.OPTIMAL_MAX) return 'optimal';
    if (p <= PRESSURE_THRESHOLDS.DEGRADATION_MAX) return 'degradation';
    return 'critical';
  }

  /**
   * Estimate AI quality percentage based on pressure
   * Uses interpolation on the quality curve
   */
  static calculateQualityEstimate(pressure?: number): number {
    const p = pressure ?? this.getCurrentPressure();

    // Find bounding points on quality curve
    let lower = QUALITY_CURVE[0];
    let upper = QUALITY_CURVE[QUALITY_CURVE.length - 1];

    for (let i = 0; i < QUALITY_CURVE.length - 1; i++) {
      if (p >= QUALITY_CURVE[i].pressure && p <= QUALITY_CURVE[i + 1].pressure) {
        lower = QUALITY_CURVE[i];
        upper = QUALITY_CURVE[i + 1];
        break;
      }
    }

    // Linear interpolation
    const range = upper.pressure - lower.pressure;
    const ratio = range > 0 ? (p - lower.pressure) / range : 0;
    const quality = lower.quality + (upper.quality - lower.quality) * ratio;

    return Math.round(quality);
  }

  /**
   * Get actionable recommendation based on pressure and zone
   */
  static getRecommendation(pressure?: number, zone?: PressureZone): string {
    const p = pressure ?? this.getCurrentPressure();
    const z = zone ?? this.getPressureZone(p);

    if (z === 'optimal') {
      return 'Continue working (optimal quality)';
    } else if (z === 'degradation') {
      if (p < 0.75) {
        return 'Quality still good - continue working';
      } else {
        return 'Consider handoff soon to preserve quality';
      }
    } else { // critical
      if (p < 0.95) {
        return 'Quality degrading - recommend handoff now';
      } else {
        return 'Critical pressure - handoff strongly recommended';
      }
    }
  }

  /**
   * Get complete pressure reading
   */
  static getPressureReading(): PressureReading {
    const pressure = this.getCurrentPressure();
    const zone = this.getPressureZone(pressure);
    const qualityEstimate = this.calculateQualityEstimate(pressure);
    const recommendation = this.getRecommendation(pressure, zone);

    return {
      pressure,
      zone,
      qualityEstimate,
      recommendation,
      tokensUsed: this.estimatedTokens,
      maxTokens: this.maxTokens
    };
  }

  /**
   * Determine if event should be logged based on pressure
   * Logging is optimal when pressure < 85%
   */
  static shouldLogEvent(pressure?: number): boolean {
    const p = pressure ?? this.getCurrentPressure();
    return p < PRESSURE_THRESHOLDS.DEGRADATION_MAX;
  }

  /**
   * Update token count estimates
   * This is a rough estimate - actual tokens would come from Claude API
   */
  static updateEstimatedTokens(tokens: number): void {
    this.estimatedTokens = tokens;
  }

  /**
   * Set maximum token limit
   */
  static setMaxTokens(max: number): void {
    this.maxTokens = max;
  }

  /**
   * Reset monitor state
   */
  static reset(): void {
    this.estimatedTokens = 0;
  }

  /**
   * Estimate tokens added (rough heuristic: ~4 chars per token)
   */
  static addEstimatedTokens(text: string): void {
    const estimatedTokens = Math.ceil(text.length / 4);
    this.estimatedTokens += estimatedTokens;
  }
}
