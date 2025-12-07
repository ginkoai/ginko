/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [context-metrics, token-estimation, pressure-monitoring, epic-004, sprint-4]
 * @related: [orchestrate.ts, event-logger.ts, agent-heartbeat.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Context Metrics Module (EPIC-004 Sprint 4 TASK-9)
 *
 * Provides external measurement of context pressure for orchestrator agents.
 * Unlike model self-reported metrics, this tracks observable indicators:
 * - Token estimation via character counting heuristic
 * - Message/conversation turn counts
 * - Tool call frequency
 * - Session activity volume
 *
 * The orchestrator uses these metrics to decide when to checkpoint and respawn.
 */

// ============================================================
// Types
// ============================================================

/**
 * Context metrics for orchestrator monitoring
 */
export interface ContextMetrics {
  /** Estimated token count via character-based heuristic */
  estimatedTokens: number;
  /** Model's maximum context window */
  contextLimit: number;
  /** Pressure ratio: estimatedTokens / contextLimit (0.0 - 1.0) */
  pressure: number;
  /** Number of conversation turns/messages */
  messageCount: number;
  /** Number of tool invocations */
  toolCallCount: number;
  /** Events logged since session start */
  eventsSinceStart: number;
  /** Model identifier for limit lookup */
  model: string;
  /** Timestamp of measurement */
  measuredAt: Date;
}

/**
 * Pressure zone classification
 */
export type PressureZone = 'optimal' | 'elevated' | 'warning' | 'critical';

/**
 * Pressure thresholds for zone classification
 */
export interface PressureThresholds {
  /** Below this is optimal (default: 0.5) */
  optimal: number;
  /** Below this is elevated (default: 0.7) */
  elevated: number;
  /** Below this is warning (default: 0.85) */
  warning: number;
  /** Above warning is critical */
}

/**
 * Model context limits configuration
 * Values are approximate and based on model documentation
 */
export const MODEL_LIMITS: Record<string, number> = {
  // Claude models
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,

  // OpenAI models
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,

  // Google models
  'gemini-pro': 1000000,
  'gemini-1.5-pro': 1000000,
  'gemini-1.5-flash': 1000000,

  // Default fallback
  default: 128000,
};

/**
 * Default pressure thresholds
 */
export const DEFAULT_THRESHOLDS: PressureThresholds = {
  optimal: 0.5,
  elevated: 0.7,
  warning: 0.85,
};

// ============================================================
// Token Estimation
// ============================================================

/**
 * Estimate token count from text using character-based heuristic.
 *
 * Heuristic: ~4 characters per token for English text.
 * This is a rough approximation that works well for typical code/prose.
 *
 * More accurate methods:
 * - tiktoken (OpenAI's tokenizer)
 * - Anthropic SDK count_tokens
 *
 * We use character heuristic for:
 * - Zero dependencies
 * - Fast calculation
 * - Good enough for pressure monitoring (within ~10%)
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Heuristic: ~4 characters per token for English/code
  // This aligns with typical tokenizer behavior for mixed content
  const charCount = text.length;
  const estimated = Math.ceil(charCount / 4);

  return estimated;
}

/**
 * Estimate tokens for structured content (messages, tool calls, etc.)
 *
 * @param content - Structured content to estimate
 * @returns Estimated token count with breakdown
 */
export function estimateStructuredTokens(content: {
  messages?: Array<{ role: string; content: string }>;
  toolCalls?: Array<{ name: string; input: unknown; output?: unknown }>;
  systemPrompt?: string;
  context?: string;
}): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let total = 0;

  // System prompt
  if (content.systemPrompt) {
    breakdown.systemPrompt = estimateTokens(content.systemPrompt);
    total += breakdown.systemPrompt;
  }

  // Context/preamble
  if (content.context) {
    breakdown.context = estimateTokens(content.context);
    total += breakdown.context;
  }

  // Messages
  if (content.messages && content.messages.length > 0) {
    let messageTokens = 0;
    for (const msg of content.messages) {
      // Role tokens (~3-5 tokens per message for formatting)
      messageTokens += 4;
      messageTokens += estimateTokens(msg.content);
    }
    breakdown.messages = messageTokens;
    total += messageTokens;
  }

  // Tool calls
  if (content.toolCalls && content.toolCalls.length > 0) {
    let toolTokens = 0;
    for (const call of content.toolCalls) {
      // Tool name and structure (~10 tokens overhead per call)
      toolTokens += 10;
      toolTokens += estimateTokens(call.name);
      toolTokens += estimateTokens(JSON.stringify(call.input));
      if (call.output) {
        toolTokens += estimateTokens(JSON.stringify(call.output));
      }
    }
    breakdown.toolCalls = toolTokens;
    total += toolTokens;
  }

  return { total, breakdown };
}

// ============================================================
// Pressure Calculation
// ============================================================

/**
 * Get context limit for a model
 *
 * @param model - Model identifier
 * @returns Context limit in tokens
 */
export function getContextLimit(model: string): number {
  // Check for exact match
  if (MODEL_LIMITS[model]) {
    return MODEL_LIMITS[model];
  }

  // Check for partial match (e.g., "claude-3" matches "claude-3-opus")
  for (const [key, value] of Object.entries(MODEL_LIMITS)) {
    if (model.includes(key) || key.includes(model)) {
      return value;
    }
  }

  // Default fallback
  return MODEL_LIMITS.default;
}

/**
 * Calculate pressure ratio
 *
 * @param estimatedTokens - Current estimated token usage
 * @param contextLimit - Model's context limit
 * @returns Pressure ratio (0.0 - 1.0, clamped)
 */
export function calculatePressure(estimatedTokens: number, contextLimit: number): number {
  if (contextLimit <= 0) return 1.0;
  const pressure = estimatedTokens / contextLimit;
  return Math.min(1.0, Math.max(0.0, pressure));
}

/**
 * Classify pressure into zones
 *
 * @param pressure - Pressure ratio (0.0 - 1.0)
 * @param thresholds - Optional custom thresholds
 * @returns Pressure zone classification
 */
export function getPressureZone(
  pressure: number,
  thresholds: PressureThresholds = DEFAULT_THRESHOLDS
): PressureZone {
  if (pressure < thresholds.optimal) return 'optimal';
  if (pressure < thresholds.elevated) return 'elevated';
  if (pressure < thresholds.warning) return 'warning';
  return 'critical';
}

/**
 * Get pressure zone color for display
 *
 * @param zone - Pressure zone
 * @returns Chalk color name
 */
export function getPressureColor(zone: PressureZone): string {
  switch (zone) {
    case 'optimal':
      return 'green';
    case 'elevated':
      return 'yellow';
    case 'warning':
      return 'red';
    case 'critical':
      return 'magenta';
  }
}

// ============================================================
// Context Monitor Class
// ============================================================

/**
 * Context pressure monitor for orchestrator agents.
 *
 * Tracks metrics over time and provides pressure monitoring.
 * Designed to be updated each orchestration cycle.
 */
export class ContextMonitor {
  private model: string;
  private contextLimit: number;
  private thresholds: PressureThresholds;

  // Tracked metrics
  private messageCount: number = 0;
  private toolCallCount: number = 0;
  private eventsSinceStart: number = 0;
  private accumulatedTokens: number = 0;

  // History for trend analysis
  private pressureHistory: Array<{ timestamp: Date; pressure: number }> = [];
  private readonly maxHistorySize = 100;

  constructor(options: {
    model?: string;
    contextLimit?: number;
    thresholds?: Partial<PressureThresholds>;
  } = {}) {
    this.model = options.model || 'claude-opus-4-5-20251101';
    this.contextLimit = options.contextLimit || getContextLimit(this.model);
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  }

  /**
   * Record a message (increments counter and estimates tokens)
   */
  recordMessage(content: string): void {
    this.messageCount++;
    this.accumulatedTokens += estimateTokens(content);
    this.recordPressure();
  }

  /**
   * Record a tool call (increments counter and estimates tokens)
   */
  recordToolCall(name: string, input: unknown, output?: unknown): void {
    this.toolCallCount++;
    this.accumulatedTokens += 10; // Overhead
    this.accumulatedTokens += estimateTokens(name);
    this.accumulatedTokens += estimateTokens(JSON.stringify(input));
    if (output) {
      this.accumulatedTokens += estimateTokens(JSON.stringify(output));
    }
    this.recordPressure();
  }

  /**
   * Record an event (session activity)
   */
  recordEvent(): void {
    this.eventsSinceStart++;
  }

  /**
   * Add tokens directly (for bulk updates)
   */
  addTokens(count: number): void {
    this.accumulatedTokens += count;
    this.recordPressure();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): ContextMetrics {
    const pressure = calculatePressure(this.accumulatedTokens, this.contextLimit);

    return {
      estimatedTokens: this.accumulatedTokens,
      contextLimit: this.contextLimit,
      pressure,
      messageCount: this.messageCount,
      toolCallCount: this.toolCallCount,
      eventsSinceStart: this.eventsSinceStart,
      model: this.model,
      measuredAt: new Date(),
    };
  }

  /**
   * Get current pressure ratio
   */
  getPressure(): number {
    return calculatePressure(this.accumulatedTokens, this.contextLimit);
  }

  /**
   * Get current pressure zone
   */
  getZone(): PressureZone {
    return getPressureZone(this.getPressure(), this.thresholds);
  }

  /**
   * Check if pressure exceeds a threshold
   */
  isAboveThreshold(threshold: number): boolean {
    return this.getPressure() >= threshold;
  }

  /**
   * Check if respawn is recommended (pressure > 80%)
   */
  shouldRespawn(): boolean {
    return this.isAboveThreshold(0.8);
  }

  /**
   * Check if warning should be logged (pressure > 70%)
   */
  shouldWarn(): boolean {
    return this.isAboveThreshold(0.7);
  }

  /**
   * Get pressure trend (increasing, stable, decreasing)
   */
  getTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.pressureHistory.length < 5) return 'stable';

    const recent = this.pressureHistory.slice(-5);
    const first = recent[0].pressure;
    const last = recent[recent.length - 1].pressure;
    const delta = last - first;

    if (delta > 0.05) return 'increasing';
    if (delta < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Reset metrics (for new session)
   */
  reset(): void {
    this.messageCount = 0;
    this.toolCallCount = 0;
    this.eventsSinceStart = 0;
    this.accumulatedTokens = 0;
    this.pressureHistory = [];
  }

  /**
   * Record pressure snapshot for history
   */
  private recordPressure(): void {
    const pressure = this.getPressure();
    this.pressureHistory.push({ timestamp: new Date(), pressure });

    // Trim history if too large
    if (this.pressureHistory.length > this.maxHistorySize) {
      this.pressureHistory = this.pressureHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Format metrics for display
   */
  formatMetrics(): string {
    const metrics = this.getMetrics();
    const zone = this.getZone();
    const trend = this.getTrend();

    const pressurePercent = (metrics.pressure * 100).toFixed(1);
    const tokenK = (metrics.estimatedTokens / 1000).toFixed(1);
    const limitK = (metrics.contextLimit / 1000).toFixed(0);

    const trendIcon = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';

    return `${tokenK}K/${limitK}K tokens (${pressurePercent}% ${trendIcon}) [${zone}]`;
  }
}

// ============================================================
// Singleton Instance
// ============================================================

let globalMonitor: ContextMonitor | null = null;

/**
 * Get or create the global context monitor
 */
export function getContextMonitor(options?: {
  model?: string;
  contextLimit?: number;
  thresholds?: Partial<PressureThresholds>;
}): ContextMonitor {
  if (!globalMonitor) {
    globalMonitor = new ContextMonitor(options);
  }
  return globalMonitor;
}

/**
 * Reset the global context monitor (for testing or session restart)
 */
export function resetContextMonitor(): void {
  if (globalMonitor) {
    globalMonitor.reset();
  }
  globalMonitor = null;
}

export default ContextMonitor;
