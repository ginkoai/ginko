/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-16
 * @tags: [prd, router, pipeline, safe-defaults]
 * @related: [./prd-pipeline.ts, ./prd-pipeline-enhanced.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { PRDPipeline } from './prd-pipeline.js';
import { EnhancedPRDPipeline, PRDOptions } from './prd-pipeline-enhanced.js';

/**
 * PRD command router
 * Routes to enhanced pipeline by default (ADR-014 Safe Defaults)
 */
export async function prdCommand(intent: string = '', options: any = {}): Promise<void> {
  // Use basic pipeline if explicitly requested
  if (options.basic) {
    const pipeline = new PRDPipeline(intent);
    await pipeline.build();
    return;
  }

  // Use enhanced pipeline by default (ADR-014)
  const prdOptions: PRDOptions = {
    feasibility: options.feasibility || false,
    competitors: options.competitors || false,
    metrics: options.metrics || false,
    dryrun: options.dryrun || false,
    strict: options.strict || false,
    nodup: options.nodup || false,
    novalidate: options.novalidate || false,
    nowarn: options.nowarn || false
  };

  const pipeline = new EnhancedPRDPipeline(intent, prdOptions);
  await pipeline.build();
}

// Export both for direct usage
export { PRDPipeline, EnhancedPRDPipeline };
export type { PRDOptions };

export default prdCommand;