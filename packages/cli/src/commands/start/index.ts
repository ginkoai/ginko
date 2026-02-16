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
import { withOptionalCloud } from '../../utils/cloud-guard.js';

/**
 * Start command router
 * Routes between AI-enhanced reflection and legacy implementations
 */
export async function startCommand(options: any = {}) {
  // Check cloud availability (non-blocking — start works locally)
  const cloud = await withOptionalCloud('start');

  // EPIC-004: Handle --no-realtime-cursor option
  // Commander sets realtimeCursor to false when --no-realtime-cursor is passed
  if (options.realtimeCursor === false) {
    const { setRealtimeCursorEnabled } = await import('../../lib/realtime-cursor.js');
    setRealtimeCursorEnabled(false);
  }

  // ADR-033: Session synthesis now happens in StartReflectionCommand.execute()
  // at optimal 5-15% pressure (fresh AI reads log BEFORE archiving)

  // Use legacy implementation if AI enhancement is disabled
  if (options.noai || options.legacy) {
    // Try enhanced version first, fall back to basic
    try {
      const { startEnhancedCommand } = await import('../start-enhanced-orig.js');
      return startEnhancedCommand(options);
    } catch {
      const { startCommand: origCommand } = await import('../start-orig.js');
      return origCommand(options);
    }
  }

  // Use AI-enhanced reflection (default)
  const reflection = new StartReflectionCommand();
  const intent = 'Initialize development session with optimal context';

  // Pass through any options
  return reflection.execute(intent, options);
}

// Also export for direct 'ginko reflect --domain start' usage
export { StartReflectionCommand };

export default startCommand;