/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-01
 * @tags: [test, pressure-monitor, context-pressure, adr-033]
 * @related: [../../src/core/pressure-monitor.ts]
 * @priority: critical
 * @complexity: low
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PressureMonitor, PRESSURE_THRESHOLDS } from '../../src/core/pressure-monitor.js';

describe('PressureMonitor', () => {
  let monitor: PressureMonitor;

  beforeEach(() => {
    monitor = new PressureMonitor();
  });

  describe('getCurrentPressure', () => {
    it('should return 0 by default', () => {
      expect(monitor.getCurrentPressure()).toBe(0);
    });

    it('should return set pressure value', () => {
      monitor.setCurrentPressure(0.5);
      expect(monitor.getCurrentPressure()).toBe(0.5);
    });
  });

  describe('setCurrentPressure', () => {
    it('should set valid pressure values', () => {
      monitor.setCurrentPressure(0.42);
      expect(monitor.getCurrentPressure()).toBe(0.42);
    });

    it('should reject pressure below 0', () => {
      expect(() => monitor.setCurrentPressure(-0.1))
        .toThrow('Pressure must be between 0 and 1');
    });

    it('should reject pressure above 1', () => {
      expect(() => monitor.setCurrentPressure(1.1))
        .toThrow('Pressure must be between 0 and 1');
    });

    it('should accept boundary values', () => {
      monitor.setCurrentPressure(0);
      expect(monitor.getCurrentPressure()).toBe(0);

      monitor.setCurrentPressure(1);
      expect(monitor.getCurrentPressure()).toBe(1);
    });
  });

  describe('getPressureZone', () => {
    it('should return "optimal" for pressure <= 50%', () => {
      monitor.setCurrentPressure(0);
      expect(monitor.getPressureZone()).toBe('optimal');

      monitor.setCurrentPressure(0.25);
      expect(monitor.getPressureZone()).toBe('optimal');

      monitor.setCurrentPressure(0.5);
      expect(monitor.getPressureZone()).toBe('optimal');
    });

    it('should return "degradation" for pressure 50-85%', () => {
      monitor.setCurrentPressure(0.51);
      expect(monitor.getPressureZone()).toBe('degradation');

      monitor.setCurrentPressure(0.7);
      expect(monitor.getPressureZone()).toBe('degradation');

      monitor.setCurrentPressure(0.85);
      expect(monitor.getPressureZone()).toBe('degradation');
    });

    it('should return "critical" for pressure > 85%', () => {
      monitor.setCurrentPressure(0.86);
      expect(monitor.getPressureZone()).toBe('critical');

      monitor.setCurrentPressure(0.95);
      expect(monitor.getPressureZone()).toBe('critical');

      monitor.setCurrentPressure(1.0);
      expect(monitor.getPressureZone()).toBe('critical');
    });

    it('should use correct threshold constants', () => {
      expect(PRESSURE_THRESHOLDS.OPTIMAL_MAX).toBe(0.5);
      expect(PRESSURE_THRESHOLDS.DEGRADATION_MAX).toBe(0.85);
      expect(PRESSURE_THRESHOLDS.CRITICAL_MAX).toBe(1.0);
    });
  });

  describe('shouldLogEvent', () => {
    it('should allow logging in optimal zone', () => {
      monitor.setCurrentPressure(0.25);
      expect(monitor.shouldLogEvent()).toBe(true);

      monitor.setCurrentPressure(0.5);
      expect(monitor.shouldLogEvent()).toBe(true);
    });

    it('should allow logging in degradation zone', () => {
      monitor.setCurrentPressure(0.6);
      expect(monitor.shouldLogEvent()).toBe(true);

      monitor.setCurrentPressure(0.84);
      expect(monitor.shouldLogEvent()).toBe(true);
    });

    it('should prevent logging at degradation threshold', () => {
      monitor.setCurrentPressure(0.85);
      expect(monitor.shouldLogEvent()).toBe(false);
    });

    it('should prevent logging in critical zone', () => {
      monitor.setCurrentPressure(0.9);
      expect(monitor.shouldLogEvent()).toBe(false);

      monitor.setCurrentPressure(1.0);
      expect(monitor.shouldLogEvent()).toBe(false);
    });
  });

  describe('estimateQuality', () => {
    it('should return 100% quality at 0-50% pressure', () => {
      monitor.setCurrentPressure(0);
      expect(monitor.estimateQuality()).toBe(100);

      monitor.setCurrentPressure(0.25);
      expect(monitor.estimateQuality()).toBe(100);

      monitor.setCurrentPressure(0.5);
      expect(monitor.estimateQuality()).toBe(100);
    });

    it('should return 95% quality at 50-70% pressure', () => {
      monitor.setCurrentPressure(0.51);
      expect(monitor.estimateQuality()).toBe(95);

      monitor.setCurrentPressure(0.6);
      expect(monitor.estimateQuality()).toBe(95);

      monitor.setCurrentPressure(0.7);
      expect(monitor.estimateQuality()).toBe(95);
    });

    it('should return 85% quality at 70-85% pressure', () => {
      monitor.setCurrentPressure(0.71);
      expect(monitor.estimateQuality()).toBe(85);

      monitor.setCurrentPressure(0.8);
      expect(monitor.estimateQuality()).toBe(85);

      monitor.setCurrentPressure(0.85);
      expect(monitor.estimateQuality()).toBe(85);
    });

    it('should return 65% quality at 85-95% pressure', () => {
      monitor.setCurrentPressure(0.86);
      expect(monitor.estimateQuality()).toBe(65);

      monitor.setCurrentPressure(0.9);
      expect(monitor.estimateQuality()).toBe(65);

      monitor.setCurrentPressure(0.95);
      expect(monitor.estimateQuality()).toBe(65);
    });

    it('should return 40% quality at 95-100% pressure', () => {
      monitor.setCurrentPressure(0.96);
      expect(monitor.estimateQuality()).toBe(40);

      monitor.setCurrentPressure(0.99);
      expect(monitor.estimateQuality()).toBe(40);

      monitor.setCurrentPressure(1.0);
      expect(monitor.estimateQuality()).toBe(40);
    });
  });

  describe('shouldTriggerHandoff', () => {
    it('should not trigger handoff in optimal zone', () => {
      monitor.setCurrentPressure(0.5);
      expect(monitor.shouldTriggerHandoff()).toBe(false);
    });

    it('should not trigger handoff in degradation zone', () => {
      monitor.setCurrentPressure(0.7);
      expect(monitor.shouldTriggerHandoff()).toBe(false);

      monitor.setCurrentPressure(0.85);
      expect(monitor.shouldTriggerHandoff()).toBe(false);
    });

    it('should trigger handoff in critical zone', () => {
      monitor.setCurrentPressure(0.86);
      expect(monitor.shouldTriggerHandoff()).toBe(true);

      monitor.setCurrentPressure(0.95);
      expect(monitor.shouldTriggerHandoff()).toBe(true);

      monitor.setCurrentPressure(1.0);
      expect(monitor.shouldTriggerHandoff()).toBe(true);
    });
  });

  describe('getPressureStatus', () => {
    it('should format status with pressure, zone, and quality', () => {
      monitor.setCurrentPressure(0.42);
      const status = monitor.getPressureStatus();

      expect(status).toContain('42%');
      expect(status).toContain('optimal');
      expect(status).toContain('100% quality');
    });

    it('should show degradation zone status', () => {
      monitor.setCurrentPressure(0.75);
      const status = monitor.getPressureStatus();

      expect(status).toContain('75%');
      expect(status).toContain('degradation');
      expect(status).toContain('85% quality');
    });

    it('should show critical zone status', () => {
      monitor.setCurrentPressure(0.92);
      const status = monitor.getPressureStatus();

      expect(status).toContain('92%');
      expect(status).toContain('critical');
      expect(status).toContain('65% quality');
    });

    it('should round pressure percentage', () => {
      monitor.setCurrentPressure(0.427);
      const status = monitor.getPressureStatus();

      expect(status).toContain('43%'); // Rounded from 42.7%
    });
  });

  describe('integration scenarios', () => {
    it('should support full pressure lifecycle', () => {
      // Start at optimal
      monitor.setCurrentPressure(0.3);
      expect(monitor.getPressureZone()).toBe('optimal');
      expect(monitor.shouldLogEvent()).toBe(true);
      expect(monitor.shouldTriggerHandoff()).toBe(false);

      // Move to degradation
      monitor.setCurrentPressure(0.7);
      expect(monitor.getPressureZone()).toBe('degradation');
      expect(monitor.shouldLogEvent()).toBe(true);
      expect(monitor.shouldTriggerHandoff()).toBe(false);

      // Enter critical
      monitor.setCurrentPressure(0.9);
      expect(monitor.getPressureZone()).toBe('critical');
      expect(monitor.shouldLogEvent()).toBe(false);
      expect(monitor.shouldTriggerHandoff()).toBe(true);
    });
  });
});
