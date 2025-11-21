/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-19
 * @tags: [synthesis, blocked-detection, unit-test]
 * @related: [../../src/utils/synthesis.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Unit tests for blocked event detection logic in synthesis.ts
 *
 * Tests the smart regex-based detection that avoids false positives
 * from words like "unblocks" being detected as "blocked".
 */

describe('Blocked Event Detection', () => {
  // Regex patterns from synthesis.ts (keep in sync!)
  const blockingWords = /\b(block(s|ed|ing)?|stuck|waiting|can'?t proceed|impediment)\b/i;
  const unblockingWords = /\b(unblock(s|ed|ing)?|resolv(e|ed|ing)?|fixed|completed?|solved?)\b/i;

  const isBlocked = (description: string): boolean => {
    return blockingWords.test(description) && !unblockingWords.test(description);
  };

  describe('True Blockers (should be detected)', () => {
    it('should detect "blocked" as a blocker', () => {
      expect(isBlocked('Project is blocked waiting for API access')).toBe(true);
    });

    it('should detect "stuck" as a blocker', () => {
      expect(isBlocked('I am stuck on this TypeScript compilation error')).toBe(true);
    });

    it('should detect "waiting" as a blocker', () => {
      expect(isBlocked('Waiting for PR approval before proceeding')).toBe(true);
    });

    it('should detect "can\'t proceed" as a blocker', () => {
      expect(isBlocked('Can\'t proceed until database migration completes')).toBe(true);
    });

    it('should detect "impediment" as a blocker', () => {
      expect(isBlocked('Major impediment: missing API credentials')).toBe(true);
    });

    it('should be case-insensitive for blockers', () => {
      expect(isBlocked('BLOCKED by missing dependencies')).toBe(true);
      expect(isBlocked('Stuck on authentication flow')).toBe(true);
    });
  });

  describe('False Positives (should NOT be detected)', () => {
    it('should NOT detect "unblocks" as blocked', () => {
      expect(isBlocked('This change unblocks the team')).toBe(false);
    });

    it('should NOT detect "unblocking" as blocked', () => {
      expect(isBlocked('Unblocking the deployment pipeline')).toBe(false);
    });

    it('should NOT detect "unblocked" as blocked', () => {
      expect(isBlocked('Successfully unblocked the build process')).toBe(false);
    });

    it('should NOT detect events that mention blocking but also resolution', () => {
      expect(isBlocked('Fixed the blocking issue in authentication flow')).toBe(false);
      expect(isBlocked('Resolved the blocked state by updating dependencies')).toBe(false);
      expect(isBlocked('Completed the work that was blocking deployment')).toBe(false);
    });

    it('should NOT detect "solved" in conjunction with blocking words', () => {
      expect(isBlocked('Solved the blocking problem with database migration')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple blocking indicators with resolution', () => {
      expect(isBlocked('Was stuck and blocked but now fixed')).toBe(false);
    });

    it('should handle blocking word as part of larger word without word boundary', () => {
      // "blocking" contains "block" but should still be caught by \b
      expect(isBlocked('The blocking issue is still present')).toBe(true);
    });

    it('should handle empty descriptions', () => {
      expect(isBlocked('')).toBe(false);
    });

    it('should handle descriptions with no blocking words', () => {
      expect(isBlocked('Implemented new feature for user dashboard')).toBe(false);
    });

    it('should detect blocking word at start of sentence', () => {
      expect(isBlocked('Blocked: Cannot access production database')).toBe(true);
    });

    it('should detect blocking word at end of sentence', () => {
      expect(isBlocked('Progress is currently blocked')).toBe(true);
    });
  });

  describe('Real-World Examples from UAT', () => {
    it('should NOT detect OAuth achievement as blocked', () => {
      const oauthEvent = 'BREAKTHROUGH: Complete OAuth authentication flow now working end-to-end. ' +
        'Fixed Row Level Security (RLS) blocking API key generation by implementing service role client bypass. ' +
        'Impact: Unblocks UAT testing and v1.4.1 release.';

      expect(isBlocked(oauthEvent)).toBe(false);
    });

    it('should detect actual blockers from session logs', () => {
      expect(isBlocked('Blocked by Neo4j API returning 405 on event creation')).toBe(true);
      expect(isBlocked('Sprint file parsing fails - stuck on regex issue')).toBe(true);
    });

    it('should NOT detect fixes that mention blocking in context', () => {
      expect(isBlocked('Fixed EventQueue timer that was blocking process exit')).toBe(false);
      expect(isBlocked('Resolved the issue blocking deployment to production')).toBe(false);
    });
  });

  describe('Multiple Word Variations', () => {
    it('should handle different forms of "block"', () => {
      expect(isBlocked('This blocks the deployment')).toBe(true);
      expect(isBlocked('Deployment is blocked')).toBe(true);
    });

    it('should handle different forms of "unblock"', () => {
      expect(isBlocked('This unblocks the team')).toBe(false);
      expect(isBlocked('Team was unblocked by this change')).toBe(false);
    });

    it('should handle different forms of "fix"', () => {
      expect(isBlocked('Blocked by API error but fixed now')).toBe(false);
      expect(isBlocked('The blocking issue was fixed')).toBe(false);
      expect(isBlocked('Blocked - still investigating')).toBe(true); // No resolution word
    });

    it('should handle different forms of "resolve"', () => {
      expect(isBlocked('Stuck on this issue but resolved it')).toBe(false);
      expect(isBlocked('Resolving the blocking problem')).toBe(false);
    });
  });
});
