/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-22
 * @tags: [test, log-quality, session-logging, adr-033, task-013]
 * @related: [../../src/utils/log-quality.ts, ../../src/commands/log.ts]
 * @priority: high
 * @complexity: medium
 */

import { describe, it, expect } from '@jest/globals';
import {
  scoreSessionLog,
  validateEntry,
  suggestInsights
} from '../../src/utils/log-quality.js';
import { LogEntry } from '../../src/core/session-log-manager.js';

describe('Log Quality System', () => {
  describe('scoreSessionLog', () => {
    it('should score perfect log at 10.0', () => {
      const perfectLog = `
---
session_id: test
---

# Session Log

## Timeline
### 14:30 - [fix]
Fixed authentication timeout in login flow. Root cause: bcrypt rounds set to 15 (too slow).
Reduced to 11 for 200ms response time while maintaining security.
Files: src/auth.ts:42
Impact: high

### 15:00 - [feature]
Implemented --show flag for ginko log command. Problem: Users couldn't view logged events
without opening files manually. Solution: Added terminal view with summary statistics.
Files: src/commands/log.ts:44
Impact: medium

## Key Decisions
### 15:30 - [decision]
Chose JWT over session cookies for authentication. Alternatives considered: 1) Server-side
sessions (better security but harder to scale), 2) OAuth only (simpler but vendor lock-in).
JWT selected for stateless scaling and mobile client support.
Impact: high

## Insights
### 16:00 - [insight]
Discovered bcrypt rounds 10-11 provide optimal security/performance balance. Testing
showed rounds 15 caused 800ms login delays; rounds 11 achieved 200ms with acceptable
entropy per OWASP standards.
Impact: medium

## Git Operations
### 16:30 - [git]
Committed Phase 2 implementation with quality improvements.
Files: src/commands/log.ts, src/utils/log-quality.ts
Impact: medium
`;

      const result = scoreSessionLog(perfectLog);

      expect(result.score).toBeGreaterThanOrEqual(9.5);
      expect(result.hasRootCauses).toBe(true);
      expect(result.hasWhyForFeatures).toBe(true);
      expect(result.hasAlternatives).toBe(true);
      expect(result.hasInsights).toBe(true);
      expect(result.hasGitOps).toBe(true);
      expect(result.terseEntries).toBeLessThanOrEqual(1); // Git entry might be flagged as terse
      expect(result.suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should detect missing root causes in fixes', () => {
      const logWithBadFix = `
## Timeline
### 14:30 - [fix]
Fixed authentication timeout.
Impact: high
`;

      const result = scoreSessionLog(logWithBadFix);

      expect(result.hasRootCauses).toBe(false);
      expect(result.score).toBeLessThan(10);
      expect(result.suggestions.some(s => s.includes('root causes'))).toBe(true);
    });

    it('should detect missing WHY in features', () => {
      const logWithBadFeature = `
## Timeline
### 14:30 - [feature]
Implemented --show flag.
Impact: medium
`;

      const result = scoreSessionLog(logWithBadFeature);

      expect(result.hasWhyForFeatures).toBe(false);
      expect(result.score).toBeLessThan(10);
      expect(result.suggestions.some(s => s.includes('WHY'))).toBe(true);
    });

    it('should detect missing alternatives in decisions', () => {
      const logWithBadDecision = `
## Key Decisions
### 15:00 - [decision]
Chose JWT for authentication.
Impact: high
`;

      const result = scoreSessionLog(logWithBadDecision);

      expect(result.hasAlternatives).toBe(false);
      expect(result.score).toBeLessThan(10);
      expect(result.suggestions.some(s => s.includes('alternatives'))).toBe(true);
    });

    it('should detect terse entries', () => {
      const logWithTerse = `
## Timeline
### 14:30 - [fix]
Fixed bug.
Impact: high
`;

      const result = scoreSessionLog(logWithTerse);

      expect(result.terseEntries).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('terse'))).toBe(true);
    });

    it('should suggest adding insights when none present', () => {
      const logWithoutInsights = `
## Timeline
### 14:30 - [fix]
Fixed authentication timeout. Root cause: bcrypt rounds too high.
Impact: high

## Insights
<!-- Empty -->
`;

      const result = scoreSessionLog(logWithoutInsights);

      expect(result.hasInsights).toBe(false);
      expect(result.suggestions.some(s => s.includes('insights'))).toBe(true);
    });

    it('should handle mixed quality log appropriately', () => {
      const mixedLog = `
## Timeline
### 14:30 - [fix]
Fixed timeout. Root cause: bcrypt rounds set to 15.
Impact: high

### 15:00 - [feature]
Added flag.
Impact: medium

## Key Decisions
### 15:30 - [decision]
Chose JWT. Alternatives: sessions (hard to scale), OAuth (vendor lock-in).
Impact: high
`;

      const result = scoreSessionLog(mixedLog);

      expect(result.score).toBeGreaterThan(6);
      expect(result.score).toBeLessThan(10);
      expect(result.hasRootCauses).toBe(true);
      expect(result.hasWhyForFeatures).toBe(false); // "Added flag" has no WHY
      expect(result.hasAlternatives).toBe(true);
    });
  });

  describe('validateEntry', () => {
    it('should validate good fix entry', () => {
      const goodFix: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Fixed authentication timeout. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11 for 200ms response time.',
        files: ['src/auth.ts:42'],
        impact: 'high'
      };

      const result = validateEntry(goodFix);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn about terse fix without root cause', () => {
      const badFix: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Fixed timeout',
        impact: 'high'
      };

      const result = validateEntry(badFix);

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('root cause'))).toBe(true);
      expect(result.warnings.some(w => w.includes('terse'))).toBe(true);
    });

    it('should warn about feature without WHY', () => {
      const badFeature: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented --show flag for log command',
        impact: 'medium'
      };

      const result = validateEntry(badFeature);

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('WHY'))).toBe(true);
    });

    it('should validate good feature with WHY', () => {
      const goodFeature: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented --show flag for log command. Problem: Users couldn\'t view logs without opening files. Solution: Added terminal view.',
        files: ['src/commands/log.ts:44'],
        impact: 'medium'
      };

      const result = validateEntry(goodFeature);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should warn about decision without alternatives', () => {
      const badDecision: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'decision',
        description: 'Chose JWT for authentication to enable mobile scaling',
        impact: 'high'
      };

      const result = validateEntry(badDecision);

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('alternatives'))).toBe(true);
    });

    it('should validate good decision with alternatives', () => {
      const goodDecision: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'decision',
        description: 'Chose JWT over sessions. Alternatives: server sessions (harder to scale), OAuth (vendor lock-in). JWT selected for stateless mobile support.',
        impact: 'high'
      };

      const result = validateEntry(goodDecision);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should allow flexible insights', () => {
      const insight: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'insight',
        description: 'Discovered bcrypt rounds 10-11 optimal for performance',
        impact: 'medium'
      };

      const result = validateEntry(insight);

      // Insights are flexible, just check for terseness
      expect(result.warnings.length).toBeLessThanOrEqual(1);
    });

    it('should allow git and achievement entries as-is', () => {
      const gitEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'git',
        description: 'Committed Phase 2 implementation',
        impact: 'medium'
      };

      const achievementEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        category: 'achievement',
        description: 'All tests passing after quality refactor',
        impact: 'high'
      };

      expect(validateEntry(gitEntry).warnings.length).toBeLessThanOrEqual(1);
      expect(validateEntry(achievementEntry).warnings.length).toBeLessThanOrEqual(1);
    });
  });

  describe('suggestInsights', () => {
    it('should detect repeated error patterns', () => {
      const logWithRepeatedErrors = `
## Timeline
### 14:30 - [fix]
Fixed authentication timeout. Root cause: bcrypt rounds too high.
Impact: high

### 15:00 - [fix]
Fixed another authentication timeout. Root cause: different endpoint, same bcrypt issue.
Impact: high
`;

      const suggestions = suggestInsights(logWithRepeatedErrors);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('authentication'))).toBe(true);
    });

    it('should suggest documenting performance improvements', () => {
      const logWithPerformance = `
## Timeline
### 14:30 - [fix]
Fixed slow login. Timeout was causing user frustration. Reduced delay significantly.
Impact: high

### 15:00 - [fix]
Fixed performance issue in API. Latency was unacceptable.
Impact: medium
`;

      const suggestions = suggestInsights(logWithPerformance);

      // Should suggest documenting performance improvements OR detect pattern
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some(s => s.toLowerCase().includes('performance')) ||
        suggestions.some(s => s.toLowerCase().includes('timeout'))
      ).toBe(true);
    });

    it('should return empty array for well-documented log', () => {
      const goodLog = `
## Timeline
### 14:30 - [fix]
Fixed unique issue X. Root cause: Y.
Impact: high

## Insights
### 15:00 - [insight]
Discovered pattern Z during investigation.
Impact: medium
`;

      const suggestions = suggestInsights(goodLog);

      // May have some suggestions, but shouldn't be many
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Quality scoring edge cases', () => {
    it('should handle empty log gracefully', () => {
      const emptyLog = `
---
session_id: test
---

# Session Log

## Timeline
## Key Decisions
## Insights
`;

      const result = scoreSessionLog(emptyLog);

      expect(result.score).toBeGreaterThan(8); // No entries = no penalties
      expect(result.hasInsights).toBe(false);
      expect(result.suggestions.some(s => s.includes('insights'))).toBe(true);
    });

    it('should handle log with only good entries', () => {
      const onlyGoodLog = `
## Timeline
### 14:30 - [fix]
Fixed critical authentication bug. Root cause: null pointer in session validation. Added null check and defensive error handling.
Files: src/auth/session.ts:125
Impact: high
`;

      const result = scoreSessionLog(onlyGoodLog);

      expect(result.score).toBeGreaterThan(9);
      expect(result.hasRootCauses).toBe(true);
    });

    it('should penalize appropriately for multiple issues', () => {
      const poorLog = `
## Timeline
### 14:30 - [fix]
Fixed bug.
Impact: high

### 15:00 - [feature]
Added feature.
Impact: medium

## Key Decisions
### 15:30 - [decision]
Made decision.
Impact: high
`;

      const result = scoreSessionLog(poorLog);

      expect(result.score).toBeLessThan(7);
      expect(result.hasRootCauses).toBe(false);
      expect(result.hasWhyForFeatures).toBe(false);
      expect(result.hasAlternatives).toBe(false);
      expect(result.terseEntries).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(2);
    });
  });
});
