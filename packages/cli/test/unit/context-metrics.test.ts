/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, context-metrics, token-estimation, pressure-monitoring, epic-004, sprint-4, task-9]
 * @related: [../../src/lib/context-metrics.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  estimateTokens,
  estimateStructuredTokens,
  getContextLimit,
  calculatePressure,
  getPressureZone,
  getPressureColor,
  ContextMonitor,
  getContextMonitor,
  resetContextMonitor,
  MODEL_LIMITS,
  DEFAULT_THRESHOLDS,
} from '../../src/lib/context-metrics.js';

describe('context-metrics', () => {
  describe('estimateTokens', () => {
    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('returns 0 for null/undefined input', () => {
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);
    });

    it('estimates tokens using ~4 chars per token heuristic', () => {
      // 12 characters should be ~3 tokens
      expect(estimateTokens('Hello World!')).toBe(3);

      // 100 characters should be ~25 tokens
      const text100 = 'a'.repeat(100);
      expect(estimateTokens(text100)).toBe(25);

      // 1000 characters should be ~250 tokens
      const text1000 = 'b'.repeat(1000);
      expect(estimateTokens(text1000)).toBe(250);
    });

    it('handles code content appropriately', () => {
      const code = `
function calculatePressure(tokens: number, limit: number): number {
  return tokens / limit;
}
      `.trim();
      const estimated = estimateTokens(code);
      // Code has ~100 chars, should estimate ~25 tokens
      expect(estimated).toBeGreaterThan(20);
      expect(estimated).toBeLessThan(40);
    });
  });

  describe('estimateStructuredTokens', () => {
    it('returns 0 total for empty content', () => {
      const result = estimateStructuredTokens({});
      expect(result.total).toBe(0);
      expect(Object.keys(result.breakdown).length).toBe(0);
    });

    it('estimates system prompt tokens', () => {
      const result = estimateStructuredTokens({
        systemPrompt: 'You are a helpful assistant.',
      });
      expect(result.total).toBeGreaterThan(5);
      expect(result.breakdown.systemPrompt).toBeDefined();
    });

    it('estimates message tokens with overhead', () => {
      const result = estimateStructuredTokens({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      });
      // 2 messages * 4 overhead + content tokens
      expect(result.total).toBeGreaterThan(8);
      expect(result.breakdown.messages).toBeDefined();
    });

    it('estimates tool call tokens', () => {
      const result = estimateStructuredTokens({
        toolCalls: [
          { name: 'readFile', input: { path: '/test.txt' } },
          { name: 'writeFile', input: { path: '/out.txt', content: 'data' }, output: { success: true } },
        ],
      });
      // Should include overhead + JSON serialization
      expect(result.total).toBeGreaterThan(20);
      expect(result.breakdown.toolCalls).toBeDefined();
    });

    it('combines all content types', () => {
      const result = estimateStructuredTokens({
        systemPrompt: 'System prompt here',
        context: 'Additional context',
        messages: [{ role: 'user', content: 'Test message' }],
        toolCalls: [{ name: 'test', input: {} }],
      });

      expect(result.breakdown.systemPrompt).toBeDefined();
      expect(result.breakdown.context).toBeDefined();
      expect(result.breakdown.messages).toBeDefined();
      expect(result.breakdown.toolCalls).toBeDefined();

      const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
      expect(result.total).toBe(sum);
    });
  });

  describe('getContextLimit', () => {
    it('returns correct limits for Claude models', () => {
      expect(getContextLimit('claude-opus-4-5-20251101')).toBe(200000);
      expect(getContextLimit('claude-sonnet-4-20250514')).toBe(200000);
      expect(getContextLimit('claude-3-5-sonnet-20241022')).toBe(200000);
    });

    it('returns correct limits for OpenAI models', () => {
      expect(getContextLimit('gpt-4-turbo')).toBe(128000);
      expect(getContextLimit('gpt-4o')).toBe(128000);
      expect(getContextLimit('gpt-4')).toBe(8192);
    });

    it('returns correct limits for Google models', () => {
      expect(getContextLimit('gemini-pro')).toBe(1000000);
      expect(getContextLimit('gemini-1.5-pro')).toBe(1000000);
    });

    it('returns default for unknown models', () => {
      expect(getContextLimit('unknown-model-xyz')).toBe(MODEL_LIMITS.default);
    });

    it('handles partial model name matching', () => {
      // Should match by substring
      expect(getContextLimit('claude-3')).toBe(200000);
    });
  });

  describe('calculatePressure', () => {
    it('returns 0 for 0 tokens', () => {
      expect(calculatePressure(0, 200000)).toBe(0);
    });

    it('returns correct ratio', () => {
      expect(calculatePressure(100000, 200000)).toBe(0.5);
      expect(calculatePressure(50000, 200000)).toBe(0.25);
      expect(calculatePressure(150000, 200000)).toBe(0.75);
    });

    it('clamps to 1.0 when over limit', () => {
      expect(calculatePressure(250000, 200000)).toBe(1.0);
      expect(calculatePressure(1000000, 200000)).toBe(1.0);
    });

    it('returns 1.0 for zero or negative limit', () => {
      expect(calculatePressure(100, 0)).toBe(1.0);
      expect(calculatePressure(100, -100)).toBe(1.0);
    });
  });

  describe('getPressureZone', () => {
    it('returns optimal for low pressure', () => {
      expect(getPressureZone(0)).toBe('optimal');
      expect(getPressureZone(0.3)).toBe('optimal');
      expect(getPressureZone(0.49)).toBe('optimal');
    });

    it('returns elevated for medium pressure', () => {
      expect(getPressureZone(0.5)).toBe('elevated');
      expect(getPressureZone(0.6)).toBe('elevated');
      expect(getPressureZone(0.69)).toBe('elevated');
    });

    it('returns warning for high pressure', () => {
      expect(getPressureZone(0.7)).toBe('warning');
      expect(getPressureZone(0.8)).toBe('warning');
      expect(getPressureZone(0.84)).toBe('warning');
    });

    it('returns critical for very high pressure', () => {
      expect(getPressureZone(0.85)).toBe('critical');
      expect(getPressureZone(0.9)).toBe('critical');
      expect(getPressureZone(1.0)).toBe('critical');
    });

    it('respects custom thresholds', () => {
      const customThresholds = {
        optimal: 0.3,
        elevated: 0.5,
        warning: 0.7,
      };
      expect(getPressureZone(0.25, customThresholds)).toBe('optimal');
      expect(getPressureZone(0.4, customThresholds)).toBe('elevated');
      expect(getPressureZone(0.6, customThresholds)).toBe('warning');
      expect(getPressureZone(0.8, customThresholds)).toBe('critical');
    });
  });

  describe('getPressureColor', () => {
    it('returns correct colors for zones', () => {
      expect(getPressureColor('optimal')).toBe('green');
      expect(getPressureColor('elevated')).toBe('yellow');
      expect(getPressureColor('warning')).toBe('red');
      expect(getPressureColor('critical')).toBe('magenta');
    });
  });

  describe('ContextMonitor', () => {
    let monitor: ContextMonitor;

    beforeEach(() => {
      monitor = new ContextMonitor({
        model: 'claude-opus-4-5-20251101',
      });
    });

    describe('initialization', () => {
      it('starts with zero metrics', () => {
        const metrics = monitor.getMetrics();
        expect(metrics.estimatedTokens).toBe(0);
        expect(metrics.messageCount).toBe(0);
        expect(metrics.toolCallCount).toBe(0);
        expect(metrics.eventsSinceStart).toBe(0);
        expect(metrics.pressure).toBe(0);
      });

      it('uses correct model and limit', () => {
        const metrics = monitor.getMetrics();
        expect(metrics.model).toBe('claude-opus-4-5-20251101');
        expect(metrics.contextLimit).toBe(200000);
      });

      it('allows custom context limit', () => {
        const customMonitor = new ContextMonitor({
          contextLimit: 50000,
        });
        const metrics = customMonitor.getMetrics();
        expect(metrics.contextLimit).toBe(50000);
      });
    });

    describe('recordMessage', () => {
      it('increments message count', () => {
        monitor.recordMessage('Hello');
        monitor.recordMessage('World');
        expect(monitor.getMetrics().messageCount).toBe(2);
      });

      it('accumulates token estimates', () => {
        monitor.recordMessage('a'.repeat(100)); // ~25 tokens
        monitor.recordMessage('b'.repeat(100)); // ~25 tokens
        expect(monitor.getMetrics().estimatedTokens).toBe(50);
      });
    });

    describe('recordToolCall', () => {
      it('increments tool call count', () => {
        monitor.recordToolCall('read', {});
        monitor.recordToolCall('write', { data: 'test' });
        expect(monitor.getMetrics().toolCallCount).toBe(2);
      });

      it('estimates tokens from tool calls', () => {
        monitor.recordToolCall('readFile', { path: '/test.txt' });
        expect(monitor.getMetrics().estimatedTokens).toBeGreaterThan(10);
      });

      it('includes output tokens when provided', () => {
        monitor.recordToolCall('read', {});
        const tokensWithoutOutput = monitor.getMetrics().estimatedTokens;

        monitor.recordToolCall('read', {}, { data: 'output content here' });
        const tokensWithOutput = monitor.getMetrics().estimatedTokens;

        expect(tokensWithOutput).toBeGreaterThan(tokensWithoutOutput);
      });
    });

    describe('recordEvent', () => {
      it('increments event counter', () => {
        monitor.recordEvent();
        monitor.recordEvent();
        monitor.recordEvent();
        expect(monitor.getMetrics().eventsSinceStart).toBe(3);
      });
    });

    describe('addTokens', () => {
      it('adds tokens directly', () => {
        monitor.addTokens(1000);
        monitor.addTokens(500);
        expect(monitor.getMetrics().estimatedTokens).toBe(1500);
      });
    });

    describe('pressure calculation', () => {
      it('calculates pressure correctly', () => {
        monitor.addTokens(100000); // 50% of 200k limit
        expect(monitor.getPressure()).toBe(0.5);
      });

      it('returns correct zone', () => {
        monitor.addTokens(30000); // 15%
        expect(monitor.getZone()).toBe('optimal');

        monitor.addTokens(80000); // 55%
        expect(monitor.getZone()).toBe('elevated');

        monitor.addTokens(50000); // 80%
        expect(monitor.getZone()).toBe('warning');

        monitor.addTokens(20000); // 90%
        expect(monitor.getZone()).toBe('critical');
      });
    });

    describe('thresholds', () => {
      it('shouldWarn returns true above 70%', () => {
        monitor.addTokens(139000); // 69.5%
        expect(monitor.shouldWarn()).toBe(false);

        monitor.addTokens(2000); // 70.5%
        expect(monitor.shouldWarn()).toBe(true);
      });

      it('shouldRespawn returns true above 80%', () => {
        monitor.addTokens(159000); // 79.5%
        expect(monitor.shouldRespawn()).toBe(false);

        monitor.addTokens(2000); // 80.5%
        expect(monitor.shouldRespawn()).toBe(true);
      });

      it('isAboveThreshold works with custom values', () => {
        monitor.addTokens(120000); // 60%
        expect(monitor.isAboveThreshold(0.5)).toBe(true);
        expect(monitor.isAboveThreshold(0.7)).toBe(false);
      });
    });

    describe('trend analysis', () => {
      it('returns stable for insufficient history', () => {
        expect(monitor.getTrend()).toBe('stable');
        monitor.addTokens(1000);
        expect(monitor.getTrend()).toBe('stable');
      });

      it('detects increasing trend', () => {
        // Add tokens in increasing amounts to create increasing pressure
        for (let i = 0; i < 6; i++) {
          monitor.addTokens(10000);
        }
        expect(monitor.getTrend()).toBe('increasing');
      });
    });

    describe('reset', () => {
      it('resets all metrics', () => {
        monitor.recordMessage('test');
        monitor.recordToolCall('test', {});
        monitor.recordEvent();
        monitor.addTokens(10000);

        monitor.reset();

        const metrics = monitor.getMetrics();
        expect(metrics.estimatedTokens).toBe(0);
        expect(metrics.messageCount).toBe(0);
        expect(metrics.toolCallCount).toBe(0);
        expect(metrics.eventsSinceStart).toBe(0);
      });
    });

    describe('formatMetrics', () => {
      it('formats metrics as readable string', () => {
        monitor.addTokens(50000);
        const formatted = monitor.formatMetrics();

        expect(formatted).toContain('50.0K');
        expect(formatted).toContain('200K');
        expect(formatted).toContain('25.0%');
        expect(formatted).toContain('optimal');
      });
    });
  });

  describe('global monitor', () => {
    beforeEach(() => {
      resetContextMonitor();
    });

    it('creates singleton instance', () => {
      const monitor1 = getContextMonitor();
      const monitor2 = getContextMonitor();
      expect(monitor1).toBe(monitor2);
    });

    it('resets global monitor', () => {
      const monitor = getContextMonitor();
      monitor.addTokens(10000);
      expect(monitor.getMetrics().estimatedTokens).toBe(10000);

      resetContextMonitor();

      const newMonitor = getContextMonitor();
      expect(newMonitor.getMetrics().estimatedTokens).toBe(0);
    });

    it('passes options to first creation', () => {
      const monitor = getContextMonitor({
        model: 'gpt-4-turbo',
        contextLimit: 128000,
      });
      expect(monitor.getMetrics().contextLimit).toBe(128000);
    });
  });

  describe('MODEL_LIMITS constant', () => {
    it('has default limit', () => {
      expect(MODEL_LIMITS.default).toBeDefined();
      expect(MODEL_LIMITS.default).toBeGreaterThan(0);
    });

    it('has Claude model limits', () => {
      expect(MODEL_LIMITS['claude-opus-4-5-20251101']).toBe(200000);
    });

    it('has OpenAI model limits', () => {
      expect(MODEL_LIMITS['gpt-4-turbo']).toBe(128000);
    });
  });

  describe('DEFAULT_THRESHOLDS constant', () => {
    it('has expected threshold values', () => {
      expect(DEFAULT_THRESHOLDS.optimal).toBe(0.5);
      expect(DEFAULT_THRESHOLDS.elevated).toBe(0.7);
      expect(DEFAULT_THRESHOLDS.warning).toBe(0.85);
    });
  });
});
