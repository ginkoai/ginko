/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [sprint, router, pipeline, safe-defaults]
 * @related: [./sprint-pipeline.ts, ./sprint-pipeline-enhanced.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { SprintPipeline } from './sprint-pipeline.js';
import { EnhancedSprintPipeline, SprintOptions } from './sprint-pipeline-enhanced.js';

/**
 * Sprint command router
 * Routes to enhanced pipeline by default (ADR-014 Safe Defaults)
 */
export async function sprintCommand(intent: string = '', options: any = {}): Promise<void> {
  // Use basic pipeline if explicitly requested
  if (options.basic) {
    const pipeline = new SprintPipeline(intent);
    await pipeline.build();
    return;
  }

  // Use enhanced pipeline by default (ADR-014)
  const sprintOptions: SprintOptions = {
    wbs: options.wbs || false,
    trace: options.trace || false,
    dryrun: options.dryrun || false,
    strict: options.strict || false,
    nodep: options.nodep || false,
    nowarn: options.nowarn || false
  };

  const pipeline = new EnhancedSprintPipeline(intent, sprintOptions);
  await pipeline.build();
}

// Export both for direct usage
export { SprintPipeline, EnhancedSprintPipeline };
export type { SprintOptions };

export default sprintCommand;