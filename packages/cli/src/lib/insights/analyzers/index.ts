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

export { EfficiencyAnalyzer } from './efficiency';
export { PatternAnalyzer } from './patterns';
export { QualityAnalyzer } from './quality';
export { AntiPatternDetector } from './anti-patterns';

import { EfficiencyAnalyzer } from './efficiency';
import { PatternAnalyzer } from './patterns';
import { QualityAnalyzer } from './quality';
import { AntiPatternDetector } from './anti-patterns';
import type { InsightAnalyzer } from '../types';

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
