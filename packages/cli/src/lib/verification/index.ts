/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, barrel-export, epic-004, sprint-3]
 * @related: [test-runner.ts, build-check.ts, lint-check.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Verification utilities for task acceptance criteria
 * EPIC-004 Sprint 3: Verification & Quality
 */

export { runTests } from './test-runner.js';
export type { TestResult, TestOptions } from './test-runner.js';

export { runLint } from './lint-check.js';
export type { LintResult, LintOptions } from './lint-check.js';
