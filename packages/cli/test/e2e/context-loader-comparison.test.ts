/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-04
 * @tags: [test, context-loading, adr-043, comparison, e2e]
 * @related: [context-loader.ts, context-loader-events.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest]
 */

/**
 * Context Loader Comparison Test (ADR-043)
 *
 * Compares handoff-based context loading vs event-based context loading
 * to validate that event-based approach provides equivalent or better context
 * with significantly reduced token usage.
 *
 * Test Scenarios:
 * 1. Token budget comparison (target: 30K vs 88K)
 * 2. Document discovery comparison (same or better coverage)
 * 3. Load time comparison (sub-second goal)
 * 4. Context quality comparison (manual review)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadContextStrategic, StrategyContext } from '../../src/utils/context-loader.js';
import { loadContextFromCursor, LoadedContext, SessionCursor } from '../../src/lib/context-loader-events.js';

describe('Context Loader Comparison (ADR-043)', () => {
  let mockCursor: SessionCursor;

  beforeAll(() => {
    // Create mock cursor for testing
    mockCursor = {
      id: 'cursor_test_001',
      user_id: 'test@example.com',
      project_id: 'ginko',
      started: new Date(),
      last_active: new Date(),
      current_event_id: 'evt_1730736293000_abc123',
      last_loaded_event_id: undefined,
      branch: 'feature/adr-043',
      status: 'active'
    };
  });

  describe('Token Budget Comparison', () => {
    it('should load context with <30K tokens using event-based approach', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });

      expect(eventContext.token_estimate).toBeLessThan(30000);
      console.log(`Event-based tokens: ${eventContext.token_estimate}`);
    });

    it('should show significant token reduction vs handoff-based approach', async () => {
      // Load both approaches
      const handoffContext = await loadContextStrategic({
        workMode: 'think-build',
        maxDepth: 2,
        followReferences: true
      });

      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });

      const handoffTokens = handoffContext.metrics.totalTokens;
      const eventTokens = eventContext.token_estimate;
      const reduction = Math.round(((handoffTokens - eventTokens) / handoffTokens) * 100);

      console.log(`\nToken Comparison:`);
      console.log(`  Handoff-based: ${handoffTokens.toLocaleString()} tokens`);
      console.log(`  Event-based:   ${eventTokens.toLocaleString()} tokens`);
      console.log(`  Reduction:     ${reduction}%`);

      expect(reduction).toBeGreaterThan(50); // Target: >50% reduction
    });
  });

  describe('Document Discovery Comparison', () => {
    it('should discover same or more documents via event-based approach', async () => {
      const handoffContext = await loadContextStrategic({
        workMode: 'think-build',
        maxDepth: 2,
        followReferences: true
      });

      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });

      const handoffDocs = handoffContext.documents.size;
      const eventDocs = eventContext.documents.length + eventContext.relatedDocs.length;

      console.log(`\nDocument Discovery:`);
      console.log(`  Handoff-based: ${handoffDocs} documents`);
      console.log(`  Event-based:   ${eventDocs} documents`);

      // Event-based should discover comparable documents
      expect(eventDocs).toBeGreaterThanOrEqual(handoffDocs * 0.8); // At least 80% coverage
    });

    it('should extract document references from event descriptions', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false
      });

      // Verify documents were extracted from events
      const docTypes = new Set(eventContext.documents.map(d => d.type));

      console.log(`\nDocument Types Found:`);
      console.log(`  Types: ${Array.from(docTypes).join(', ')}`);

      // Should find ADRs, PRDs, etc. mentioned in events
      expect(eventContext.documents.length).toBeGreaterThan(0);
    });
  });

  describe('Load Time Comparison', () => {
    it('should load context in under 1 second (event-based)', async () => {
      const start = Date.now();

      await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });

      const elapsed = Date.now() - start;

      console.log(`\nEvent-based load time: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should be comparable or faster than handoff-based loading', async () => {
      const handoffStart = Date.now();
      await loadContextStrategic({
        workMode: 'think-build',
        maxDepth: 2,
        followReferences: true
      });
      const handoffTime = Date.now() - handoffStart;

      const eventStart = Date.now();
      await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });
      const eventTime = Date.now() - eventStart;

      console.log(`\nLoad Time Comparison:`);
      console.log(`  Handoff-based: ${handoffTime}ms`);
      console.log(`  Event-based:   ${eventTime}ms`);
      console.log(`  Difference:    ${eventTime - handoffTime}ms`);

      // Event-based should be comparable
      expect(eventTime).toBeLessThan(handoffTime * 1.5); // Within 50% tolerance
    });
  });

  describe('Team Context Loading', () => {
    it('should load team high-signal events when enabled', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: true,
        teamEventLimit: 20,
        teamDays: 7
      });

      // Team events should be loaded if available
      if (eventContext.teamEvents) {
        console.log(`\nTeam Events Loaded: ${eventContext.teamEvents.length}`);
        expect(eventContext.teamEvents.length).toBeLessThanOrEqual(20);
      }
    });

    it('should filter team events to high-signal categories only', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: true,
        teamEventLimit: 20
      });

      if (eventContext.teamEvents && eventContext.teamEvents.length > 0) {
        const highSignalCategories = ['decision', 'achievement', 'git'];

        for (const event of eventContext.teamEvents) {
          expect(highSignalCategories).toContain(event.category);
        }
      }
    });
  });

  describe('Context Quality Validation', () => {
    it('should include cursor information in loaded context', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50
      });

      expect(eventContext.cursor).toBeDefined();
      expect(eventContext.cursor.id).toBe(mockCursor.id);
      expect(eventContext.cursor.branch).toBe(mockCursor.branch);
    });

    it('should provide comprehensive context summary', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: true
      });

      expect(eventContext.myEvents).toBeDefined();
      expect(eventContext.documents).toBeDefined();
      expect(eventContext.relatedDocs).toBeDefined();
      expect(eventContext.loaded_at).toBeDefined();
      expect(eventContext.event_count).toBeGreaterThan(0);
      expect(eventContext.token_estimate).toBeGreaterThan(0);
    });

    it('should maintain token budget under 30K even with team events', async () => {
      const eventContext = await loadContextFromCursor(mockCursor, {
        eventLimit: 50,
        includeTeam: true,
        teamEventLimit: 20,
        documentDepth: 2
      });

      expect(eventContext.token_estimate).toBeLessThan(30000);

      console.log(`\nFull Context Token Budget:`);
      console.log(`  My events: ${eventContext.myEvents.length}`);
      console.log(`  Team events: ${eventContext.teamEvents?.length || 0}`);
      console.log(`  Documents: ${eventContext.documents.length}`);
      console.log(`  Related docs: ${eventContext.relatedDocs.length}`);
      console.log(`  Total tokens: ${eventContext.token_estimate.toLocaleString()}`);
    });
  });

  describe('Integration Test', () => {
    it('should successfully load context for active session', async () => {
      const { cursor } = await import('../../src/lib/session-cursor.js').then(m => m.getOrCreateCursor({}));

      const eventContext = await loadContextFromCursor(cursor, {
        eventLimit: 50,
        includeTeam: false,
        documentDepth: 2
      });

      expect(eventContext).toBeDefined();
      expect(eventContext.cursor.id).toBe(cursor.id);
      expect(eventContext.token_estimate).toBeLessThan(30000);

      console.log(`\nActive Session Context:`);
      console.log(`  Cursor: ${cursor.id}`);
      console.log(`  Branch: ${cursor.branch}`);
      console.log(`  Events: ${eventContext.event_count}`);
      console.log(`  Tokens: ${eventContext.token_estimate.toLocaleString()}`);
    });
  });
});
