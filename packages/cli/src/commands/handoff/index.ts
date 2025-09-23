/**
 * @fileType: command
 * @status: current
 * @updated: 2025-01-13
 * @tags: [handoff, router, reflection, legacy]
 * @related: [./handoff-reflection-pipeline.ts, ../handoff-enhanced-orig.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

import { HandoffPipeline, HandoffReflectionCommand } from './handoff-reflection-pipeline.js';

/**
 * Handoff command router
 * Routes between AI-enhanced pipeline and legacy implementations
 */
export async function handoffCommand(options: any = {}): Promise<void> {
  // Use legacy implementation if AI enhancement is disabled
  if (options.noai || options.legacy) {
    // Try enhanced version first, fall back to basic
    try {
      const { enhancedHandoffCommand } = await import('../handoff-enhanced-orig.js');
      await enhancedHandoffCommand(options);
      return;
    } catch {
      const { handoffCommand: origCommand } = await import('../handoff-orig.js');
      await origCommand(options);
      return;
    }
  }

  // Use AI-enhanced pipeline implementation (default - ADR-013 Simple Builder Pattern)
  const pipeline = new HandoffPipeline(options.message || 'Create comprehensive session handoff');
  await pipeline.build();
}

// Also export for direct 'ginko reflect --domain handoff' usage
export { HandoffReflectionCommand, HandoffPipeline };

export default handoffCommand;