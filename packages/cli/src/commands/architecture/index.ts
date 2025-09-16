/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-16
 * @tags: [architecture, adr, router, pipeline, safe-defaults]
 * @related: [./architecture-pipeline.ts, ./architecture-pipeline-enhanced.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { ArchitecturePipeline } from './architecture-pipeline.js';
import { EnhancedArchitecturePipeline, ArchitectureOptions } from './architecture-pipeline-enhanced.js';

/**
 * Architecture command router
 * Routes to enhanced pipeline by default (ADR-014 Safe Defaults)
 */
export async function architectureCommand(intent: string = '', options: any = {}): Promise<void> {
  // Use basic pipeline if explicitly requested
  if (options.basic) {
    const pipeline = new ArchitecturePipeline(intent);
    await pipeline.build();
    return;
  }

  // Use enhanced pipeline by default (ADR-014)
  const archOptions: ArchitectureOptions = {
    alternatives: options.alternatives || false,
    tradeoffs: options.tradeoffs || false,
    impacts: options.impacts || false,
    dryrun: options.dryrun || false,
    strict: options.strict || false,
    noconflict: options.noconflict || false,
    novalidate: options.novalidate || false,
    nowarn: options.nowarn || false
  };

  const pipeline = new EnhancedArchitecturePipeline(intent, archOptions);
  await pipeline.build();
}

// Export both for direct usage
export { ArchitecturePipeline, EnhancedArchitecturePipeline };
export type { ArchitectureOptions };

export default architectureCommand;