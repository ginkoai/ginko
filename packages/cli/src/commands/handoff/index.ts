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
import { saveSessionLogAsHandoff } from './handoff-save.js';
import { SessionLogManager } from '../../core/session-log-manager.js';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';
import * as path from 'path';

/**
 * Handoff command router (ADR-036: Optional housekeeping tool)
 *
 * Handoff is OPTIONAL - not required for resumption.
 * Use when: feature complete, sprint done, end of day, major milestone
 * Skip for: coffee break, lunch, short pause
 */
export async function handoffCommand(options: any = {}): Promise<void> {
  // Get user directory
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  const userDir = path.join(ginkoDir, 'sessions', userSlug);

  // Check for session log (ADR-033 Strategy 1)
  const hasLog = await SessionLogManager.hasSessionLog(userDir);

  if (hasLog && !options.noai && !options.legacy) {
    // ADR-036: Enhanced handoff with optional housekeeping
    await saveSessionLogAsHandoff(userDir, {
      message: options.message,
      clean: options.clean,
      commit: options.commit,
      noClean: options.noClean,
      noCommit: options.noCommit
    });
    return;
  }

  // Strategy 2: Fallback to AI synthesis
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