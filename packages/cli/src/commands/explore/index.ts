/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-01
 * @tags: [explore, router, reflection, legacy]
 * @related: [./explore-reflection-pipeline.ts, ../explore.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { ExplorePipeline, ExploreReflectionCommand } from './explore-reflection-pipeline.js';

interface ExploreOptions {
  store?: boolean;
  id?: string;
  content?: string;
  type?: 'prd' | 'backlog';
  review?: boolean;
  verbose?: boolean;
  noai?: boolean;
  legacy?: boolean;
}

/**
 * Explore command router
 * Routes between AI-enhanced pipeline and legacy implementations
 */
export async function exploreCommand(topic: string | undefined, options: ExploreOptions = {}): Promise<void> {
  // Use legacy implementation if AI enhancement is disabled
  if (options.noai || options.legacy) {
    const { exploreCommand: origCommand } = await import('../explore.js');
    await origCommand(topic, options);
    return;
  }

  // Use AI-enhanced pipeline implementation (default - ADR-013 Simple Builder Pattern)
  const pipeline = new ExplorePipeline(topic, options);
  await pipeline.build();
}

// Also export for direct 'ginko reflect --domain explore' usage
export { ExploreReflectionCommand, ExplorePipeline };

export default exploreCommand;
