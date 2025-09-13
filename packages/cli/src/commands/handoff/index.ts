/**
 * @fileType: command
 * @status: current
 * @updated: 2025-01-13
 * @tags: [handoff, router, reflection, legacy]
 * @related: [./handoff-reflection.ts, ../handoff-enhanced-orig.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

import { HandoffReflectionCommand } from './handoff-reflection.js';

/**
 * Handoff command router
 * Routes between reflection-based and legacy implementations
 */
export async function handoffCommand(options: any = {}) {
  // Use legacy implementation if requested
  if (options.legacy) {
    // Try enhanced version first, fall back to basic
    try {
      const { enhancedHandoffCommand } = await import('../handoff-enhanced-orig.js');
      return enhancedHandoffCommand(options);
    } catch {
      const { handoffCommand: origCommand } = await import('../handoff-orig.js');
      return origCommand(options);
    }
  }

  // Use reflection domain (new default)
  const reflection = new HandoffReflectionCommand();
  const intent = options.message || 'Create comprehensive session handoff';

  // Pass through any options
  return reflection.execute(intent, options);
}

// Also export for direct 'ginko reflect --domain handoff' usage
export { HandoffReflectionCommand };

export default handoffCommand;