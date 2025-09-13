/**
 * @fileType: command
 * @status: current
 * @updated: 2025-01-13
 * @tags: [start, router, reflection, legacy]
 * @related: [./start-reflection.ts, ../start-enhanced-orig.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

import { StartReflectionCommand } from './start-reflection.js';

/**
 * Start command router
 * Routes between reflection-based and legacy implementations
 */
export async function startCommand(options: any = {}) {
  // Use legacy implementation if requested
  if (options.legacy) {
    // Try enhanced version first, fall back to basic
    try {
      const { startEnhancedCommand } = await import('../start-enhanced-orig.js');
      return startEnhancedCommand(options);
    } catch {
      const { startCommand: origCommand } = await import('../start-orig.js');
      return origCommand(options);
    }
  }

  // Use reflection domain (new default)
  const reflection = new StartReflectionCommand();
  const intent = 'Initialize development session with optimal context';

  // Pass through any options
  return reflection.execute(intent, options);
}

// Also export for direct 'ginko reflect --domain start' usage
export { StartReflectionCommand };

export default startCommand;