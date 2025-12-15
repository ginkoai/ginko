/**
 * @fileType: module-index
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, analyzers, module]
 * @related: [efficiency.ts, patterns.ts, quality.ts, anti-patterns.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

export { EfficiencyAnalyzer } from './efficiency.js';
export { PatternAnalyzer } from './patterns.js';
export { QualityAnalyzer } from './quality.js';
export { AntiPatternDetector } from './anti-patterns.js';

import { EfficiencyAnalyzer } from './efficiency.js';
import { PatternAnalyzer } from './patterns.js';
import { QualityAnalyzer } from './quality.js';
import { AntiPatternDetector } from './anti-patterns.js';
import type { InsightAnalyzer } from '../types.js';

/**
 * Get all analyzer instances.
 */
export function getAllAnalyzers(): InsightAnalyzer[] {
  return [
    new EfficiencyAnalyzer(),
    new PatternAnalyzer(),
    new QualityAnalyzer(),
    new AntiPatternDetector(),
  ];
}

/**
 * Get analyzer by category.
 */
export function getAnalyzer(category: string): InsightAnalyzer | undefined {
  const analyzers = getAllAnalyzers();
  return analyzers.find(a => a.category === category);
}
