/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-24
 * @tags: [test, unit, adr-extraction, epic-002, task-4]
 * @related: [sprint/sync/route.ts, sprint-loader.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

/**
 * ADR Extraction Unit Tests - TASK-4
 *
 * Tests the extraction of ADR references from sprint task definitions.
 * These references create MUST_FOLLOW relationships in the knowledge graph.
 *
 * Part of EPIC-002: AI-Native Sprint Graphs (Phase 1)
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Extract ADR references from text content
 * Pattern: ADR-XXX (e.g., ADR-002, ADR-043)
 *
 * @param content - Text to search for ADR references
 * @returns Array of unique ADR IDs (e.g., ["adr_002", "adr_043"])
 */
function extractADRReferences(content: string): string[] {
  const relatedADRs: string[] = [];
  const adrPattern = /ADR-(\d{3})/g;
  let match;

  while ((match = adrPattern.exec(content)) !== null) {
    const adrId = `adr_${match[1]}`;
    if (!relatedADRs.includes(adrId)) {
      relatedADRs.push(adrId);
    }
  }

  return relatedADRs;
}

/**
 * Extract task status from text content
 * Patterns: "Status: Complete", "Status: In Progress", "Status: Not Started"
 */
function extractTaskStatus(
  content: string
): 'not_started' | 'in_progress' | 'complete' {
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
  if (statusMatch) {
    const statusText = statusMatch[1].trim().toLowerCase();
    if (statusText.includes('complete') || statusText.includes('done')) {
      return 'complete';
    } else if (statusText.includes('in progress') || statusText.includes('in-progress')) {
      return 'in_progress';
    }
  }
  return 'not_started';
}

describe('ADR Extraction - TASK-4', () => {
  describe('extractADRReferences', () => {
    it('should extract single ADR reference', () => {
      const content = 'This task follows ADR-002 for frontmatter standards.';
      const result = extractADRReferences(content);

      expect(result).toEqual(['adr_002']);
    });

    it('should extract multiple ADR references', () => {
      const content = `
        This task implements features from ADR-002, ADR-043, and ADR-047.
        All patterns must follow these architectural decisions.
      `;
      const result = extractADRReferences(content);

      expect(result).toContain('adr_002');
      expect(result).toContain('adr_043');
      expect(result).toContain('adr_047');
      expect(result).toHaveLength(3);
    });

    it('should deduplicate ADR references', () => {
      const content = `
        ADR-002 is referenced here.
        And ADR-002 is referenced again.
        Plus ADR-043 for good measure.
      `;
      const result = extractADRReferences(content);

      expect(result).toEqual(['adr_002', 'adr_043']);
    });

    it('should extract ADRs from "Follow:" line format', () => {
      const content = `
        ### TASK-1: Example Task
        **Status:** Not Started

        Follow: ADR-002, ADR-043
      `;
      const result = extractADRReferences(content);

      expect(result).toContain('adr_002');
      expect(result).toContain('adr_043');
    });

    it('should extract ADRs from "Related:" line format', () => {
      const content = `
        Related: ADR-002, ADR-043, ADR-047
      `;
      const result = extractADRReferences(content);

      expect(result).toHaveLength(3);
    });

    it('should return empty array when no ADRs found', () => {
      const content = 'This task has no architectural references.';
      const result = extractADRReferences(content);

      expect(result).toEqual([]);
    });

    it('should handle ADRs with leading zeros', () => {
      const content = 'Follow ADR-001, ADR-010, ADR-100 patterns.';
      const result = extractADRReferences(content);

      expect(result).toContain('adr_001');
      expect(result).toContain('adr_010');
      expect(result).toContain('adr_100');
    });

    it('should not extract invalid ADR formats', () => {
      const content = `
        This is not valid: ADR-1 (only 1 digit)
        This is not valid: ADR-12 (only 2 digits)
        This is not valid: ADR-1234 (4 digits)
        This is valid: ADR-123
      `;
      const result = extractADRReferences(content);

      expect(result).toEqual(['adr_123']);
    });

    it('should extract ADRs from sprint task section', () => {
      const taskSection = `
### TASK-2: Sprint → Task Graph Structure Validation
**Status:** In Progress
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Validate existing Sprint → Task relationships work with MUST_FOLLOW

**Acceptance Criteria:**
- [ ] Verify CONTAINS relationships exist
- [ ] Verify NEXT_TASK relationship points to first incomplete
- [ ] Add integration tests for full sprint sync

**Files:**
- Create: \`packages/cli/test/integration/sprint-sync.test.ts\`

Related: ADR-002, ADR-043, ADR-047
      `;

      const result = extractADRReferences(taskSection);

      expect(result).toContain('adr_002');
      expect(result).toContain('adr_043');
      expect(result).toContain('adr_047');
      expect(result).toHaveLength(3);
    });
  });

  describe('extractTaskStatus', () => {
    it('should extract "complete" status', () => {
      const content = '**Status:** Complete';
      expect(extractTaskStatus(content)).toBe('complete');
    });

    it('should extract "complete" status (Done variant)', () => {
      const content = '**Status:** Done';
      expect(extractTaskStatus(content)).toBe('complete');
    });

    it('should extract "in_progress" status', () => {
      const content = '**Status:** In Progress';
      expect(extractTaskStatus(content)).toBe('in_progress');
    });

    it('should extract "in_progress" status (hyphenated)', () => {
      const content = '**Status:** In-Progress';
      expect(extractTaskStatus(content)).toBe('in_progress');
    });

    it('should extract "not_started" status', () => {
      const content = '**Status:** Not Started';
      expect(extractTaskStatus(content)).toBe('not_started');
    });

    it('should default to "not_started" when no status found', () => {
      const content = 'No status line here';
      expect(extractTaskStatus(content)).toBe('not_started');
    });

    it('should handle checkbox format [x] Complete', () => {
      const content = '**Status:** [x] Complete';
      expect(extractTaskStatus(content)).toBe('complete');
    });
  });

  describe('Integration: Full Task Parsing', () => {
    it('should extract both status and ADRs from task section', () => {
      const taskSection = `
### TASK-1: Task → MUST_FOLLOW → ADR Relationships
**Status:** [x] Complete
**Priority:** CRITICAL
**Owner:** Chris Norton

**Goal:** Create MUST_FOLLOW relationships between tasks and ADRs

This task follows ADR-002 (AI-Optimized File Discovery) for constraint extraction
and ADR-043 (Event-Based Context Loading) for graph sync patterns.

**Files:**
- Modify: \`packages/cli/src/lib/sprint-loader.ts\`
- Modify: \`dashboard/src/app/api/v1/sprint/sync/route.ts\`
      `;

      const status = extractTaskStatus(taskSection);
      const adrs = extractADRReferences(taskSection);

      expect(status).toBe('complete');
      expect(adrs).toContain('adr_002');
      expect(adrs).toContain('adr_043');
    });
  });
});
