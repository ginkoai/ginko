/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-16
 * @tags: [testing, router, pipeline, safe-defaults]
 * @related: [./testing-pipeline.ts, ./testing-pipeline-enhanced.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { TestingPipeline } from './testing-pipeline.js';
import { EnhancedTestingPipeline, TestingOptions } from './testing-pipeline-enhanced.js';

/**
 * Testing command router
 * Routes to enhanced pipeline by default (ADR-014 Safe Defaults)
 */
export async function testingCommand(intent: string = '', options: any = {}): Promise<void> {
  // Use basic pipeline if explicitly requested
  if (options.basic) {
    const pipeline = new TestingPipeline(intent);
    await pipeline.build();
    return;
  }

  // Use enhanced pipeline by default (ADR-014)
  const testOptions: TestingOptions = {
    fixtures: options.fixtures || false,
    mocks: options.mocks || false,
    ci: options.ci || false,
    dryrun: options.dryrun || false,
    strict: options.strict || false,
    nocoverage: options.nocoverage || false,
    novalidate: options.novalidate || false,
    nowarn: options.nowarn || false
  };

  const pipeline = new EnhancedTestingPipeline(intent, testOptions);
  await pipeline.build();
}

// Export both for direct usage
export { TestingPipeline, EnhancedTestingPipeline };
export type { TestingOptions };

export default testingCommand;