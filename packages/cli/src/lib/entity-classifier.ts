/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-30
 * @tags: [entity, classifier, push, pull, ADR-077]
 * @related: [git-change-detector.ts, ../commands/push/push-command.ts, ../commands/graph/load.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Entity Type Classifier (ADR-077)
 *
 * Maps file paths to entity types for push/pull operations.
 * Extracted from graph/load.ts for shared use.
 */

import type { DocumentUpload } from '../commands/graph/api-client.js';

export type EntityType = DocumentUpload['type'];

export interface ClassifiedFile {
  filePath: string;
  entityType: EntityType;
  warning?: string;
}

/**
 * Classify a file path into an entity type
 *
 * Uses path-based detection matching the patterns in graph/load.ts:
 * - docs/adr/       → ADR
 * - docs/PRD/       → PRD
 * - docs/epics/     → Epic
 * - docs/sprints/   → Sprint (with misfiled epic detection)
 * - PROJECT-CHARTER → Charter
 * - *pattern*       → Pattern
 * - *gotcha*        → Gotcha
 * - .ginko/sessions → Session
 * - everything else → ContextModule
 */
export function classifyFile(filePath: string, content?: string): ClassifiedFile {
  // Detect misfiled epics in sprints directory
  if (filePath.includes('/sprints/') && (
    filePath.includes('EPIC-') ||
    (content && content.match(/^#\s*EPIC-\d+:/m))
  )) {
    return {
      filePath,
      entityType: 'Epic',
      warning: `Epic file found in sprints directory: ${filePath}. Move to docs/epics/ for correct processing.`,
    };
  }

  if (filePath.includes('/adr/') || filePath.includes('/ADR/')) return { filePath, entityType: 'ADR' };
  if (filePath.includes('/PRD/')) return { filePath, entityType: 'PRD' };
  if (filePath.includes('/epics/')) return { filePath, entityType: 'Epic' };
  if (filePath.includes('/sprints/')) return { filePath, entityType: 'Sprint' };
  if (filePath.includes('PROJECT-CHARTER')) return { filePath, entityType: 'Charter' };
  if (filePath.includes('pattern')) return { filePath, entityType: 'Pattern' };
  if (filePath.includes('gotcha')) return { filePath, entityType: 'Gotcha' };
  if (filePath.includes('/sessions/')) return { filePath, entityType: 'Session' };
  return { filePath, entityType: 'ContextModule' };
}

/**
 * Classify multiple files and group by entity type
 */
export function classifyFiles(filePaths: string[]): Map<EntityType, ClassifiedFile[]> {
  const groups = new Map<EntityType, ClassifiedFile[]>();

  for (const filePath of filePaths) {
    const classified = classifyFile(filePath);
    const existing = groups.get(classified.entityType) || [];
    existing.push(classified);
    groups.set(classified.entityType, existing);
  }

  return groups;
}

/**
 * Filter classified files by entity type name (case-insensitive)
 * Supports subcommand arguments like "epic", "sprint", "charter", "adr"
 */
export function filterByType(files: ClassifiedFile[], typeFilter: string): ClassifiedFile[] {
  const normalized = typeFilter.toLowerCase();
  return files.filter(f => f.entityType.toLowerCase() === normalized);
}

/**
 * Check if a file path matches a pushable content pattern
 * (excludes node_modules, .git, etc.)
 */
export function isPushableFile(filePath: string): boolean {
  // Must be a markdown file
  if (!filePath.endsWith('.md') && !filePath.endsWith('.jsonl')) return false;

  // Exclude common non-content paths
  if (filePath.includes('node_modules/')) return false;
  if (filePath.includes('.git/')) return false;
  if (filePath.startsWith('dist/')) return false;

  // Must be in a known content directory
  return (
    filePath.startsWith('docs/') ||
    filePath.includes('PROJECT-CHARTER') ||
    filePath.startsWith('.ginko/sessions/') ||
    filePath.startsWith('.ginko/context/')
  );
}
