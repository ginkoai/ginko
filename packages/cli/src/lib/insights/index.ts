/**
 * @fileType: module-index
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, module]
 * @related: [types.ts, data-collector.ts, analyzers/]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// Types
export * from './types';

// Data Collection
export {
  collectInsightData,
  collectEvents,
  collectTasks,
  collectCommits,
  collectSessions,
  collectPatterns,
  collectGotchas,
  detectUserId,
  detectProjectId,
  type CollectorOptions,
} from './data-collector';

// Analyzers
export {
  EfficiencyAnalyzer,
  PatternAnalyzer,
  QualityAnalyzer,
  AntiPatternDetector,
  getAllAnalyzers,
  getAnalyzer,
} from './analyzers';
