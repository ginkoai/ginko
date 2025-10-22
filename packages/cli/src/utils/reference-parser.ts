/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [references, parsing, navigation, context-linking, prd-009, task-010]
 * @related: [config-loader.ts, log.ts, session-log-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path, glob]
 */

/**
 * Reference Parser
 *
 * Extracts and resolves references between documentation (TASK-XXX, PRD-YYY, ADR-ZZZ, etc.)
 * Enables bidirectional navigation: session logs → sprints → PRDs → ADRs
 *
 * Based on PRD-009 and TASK-010
 */

import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import { resolveProjectPath, loadProjectConfig } from './config-loader.js';

// Promisify glob for async/await usage
const globAsync = promisify(glob);

/**
 * Reference types supported by the system
 */
export type ReferenceType = 'task' | 'feature' | 'prd' | 'adr' | 'sprint';

/**
 * A parsed reference with type and ID
 */
export interface Reference {
  type: ReferenceType;
  id: string;
  rawText: string;
}

/**
 * A resolved reference with file path
 */
export interface ResolvedReference extends Reference {
  filePath: string | null;
  exists: boolean;
}

/**
 * Reference chain showing document relationships
 */
export interface ReferenceChain {
  source: string;
  chain: ResolvedReference[];
  depth: number;
}

/**
 * Reference patterns for extraction
 * Matches: TASK-009, PRD-009, ADR-033, FEATURE-024, SPRINT-2025-10-22-name
 */
const REFERENCE_PATTERNS: Record<ReferenceType, RegExp> = {
  task: /\bTASK-(\d+)\b/g,
  feature: /\bFEATURE-(\d+)\b/g,
  prd: /\bPRD-(\d+)\b/g,
  adr: /\bADR-(\d+)\b/g,
  sprint: /\bSPRINT-(\d{4}-\d{2}-\d{2})-[\w-]+\b/g
};

/**
 * Cache for resolved paths to avoid repeated filesystem operations
 */
const resolvedPathCache = new Map<string, string | null>();

/**
 * Extract all references from text
 *
 * @param text - Text to search for references
 * @returns Array of Reference objects
 *
 * @example
 * const refs = extractReferences("Fixed TASK-006 per PRD-009 and ADR-033");
 * // → [
 * //   { type: 'task', id: '006', rawText: 'TASK-006' },
 * //   { type: 'prd', id: '009', rawText: 'PRD-009' },
 * //   { type: 'adr', id: '033', rawText: 'ADR-033' }
 * // ]
 */
export function extractReferences(text: string): Reference[] {
  const references: Reference[] = [];
  const seen = new Set<string>(); // Deduplicate

  for (const [type, pattern] of Object.entries(REFERENCE_PATTERNS)) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawText = match[0];
      const id = match[1] || rawText.split('-').slice(1).join('-');

      // Deduplicate based on rawText
      if (!seen.has(rawText)) {
        seen.add(rawText);
        references.push({
          type: type as ReferenceType,
          id,
          rawText
        });
      }
    }
  }

  return references;
}

/**
 * Resolve a reference to its file path
 * Uses config-loader to map reference types to directory paths
 *
 * @param reference - Reference to resolve
 * @returns ResolvedReference with file path and exists flag
 *
 * @example
 * const resolved = await resolveReference({ type: 'task', id: '006', rawText: 'TASK-006' });
 * // → {
 * //   type: 'task',
 * //   id: '006',
 * //   rawText: 'TASK-006',
 * //   filePath: '/path/to/backlog/items/TASK-006.md',
 * //   exists: true
 * // }
 */
export async function resolveReference(reference: Reference): Promise<ResolvedReference> {
  // Check cache first
  const cacheKey = `${reference.type}:${reference.id}`;
  if (resolvedPathCache.has(cacheKey)) {
    const cachedPath = resolvedPathCache.get(cacheKey);
    return {
      ...reference,
      filePath: cachedPath || null,
      exists: cachedPath !== null
    };
  }

  try {
    const config = await loadProjectConfig();

    // Map reference type to config path key
    let pathKey: string;
    let filePattern: string;

    switch (reference.type) {
      case 'task':
      case 'feature':
        pathKey = 'backlog';
        filePattern = `${reference.rawText}*.md`;
        break;
      case 'prd':
        pathKey = 'prds';
        filePattern = `PRD-${reference.id}*.md`;
        break;
      case 'adr':
        pathKey = 'adrs';
        filePattern = `ADR-${reference.id}*.md`;
        break;
      case 'sprint':
        pathKey = 'sprints';
        filePattern = `${reference.rawText}*.md`;
        break;
      default:
        resolvedPathCache.set(cacheKey, null);
        return { ...reference, filePath: null, exists: false };
    }

    // Resolve directory path
    const dirPath = await resolveProjectPath(pathKey);

    // Handle different directory structures
    let searchPath: string;
    if (reference.type === 'task' || reference.type === 'feature') {
      // Tasks and features are in backlog/items/
      searchPath = path.join(dirPath, 'items', filePattern);
    } else {
      // PRDs, ADRs, sprints are directly in their directories
      searchPath = path.join(dirPath, filePattern);
    }

    // Use glob to find matching files (paths are already absolute)
    const matches = await globAsync(searchPath);

    if (matches.length > 0) {
      // Take first match (should be unique per reference ID)
      const resolvedPath = matches[0];
      resolvedPathCache.set(cacheKey, resolvedPath);
      return {
        ...reference,
        filePath: resolvedPath,
        exists: true
      };
    }

    // No match found
    resolvedPathCache.set(cacheKey, null);
    return {
      ...reference,
      filePath: null,
      exists: false
    };
  } catch (error) {
    // Config loading failed or other error
    resolvedPathCache.set(cacheKey, null);
    return {
      ...reference,
      filePath: null,
      exists: false
    };
  }
}

/**
 * Validate references - check if all targets exist
 * Non-blocking, returns validation results with warnings
 *
 * @param references - Array of references to validate
 * @returns Validation results with broken references
 *
 * @example
 * const validation = await validateReferences(refs);
 * if (validation.broken.length > 0) {
 *   console.warn('Broken references:', validation.broken);
 * }
 */
export async function validateReferences(
  references: Reference[]
): Promise<{
  valid: ResolvedReference[];
  broken: ResolvedReference[];
}> {
  const resolved = await Promise.all(references.map(ref => resolveReference(ref)));

  const valid = resolved.filter(r => r.exists);
  const broken = resolved.filter(r => !r.exists);

  return { valid, broken };
}

/**
 * Load content of a referenced document
 *
 * @param reference - Resolved reference to load
 * @returns File content or null if doesn't exist
 *
 * @example
 * const content = await getReferencedContent(resolvedRef);
 * if (content) {
 *   // Parse and use content
 * }
 */
export async function getReferencedContent(
  reference: ResolvedReference
): Promise<string | null> {
  if (!reference.exists || !reference.filePath) {
    return null;
  }

  try {
    return await fs.readFile(reference.filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Follow reference chain recursively (with depth limit)
 * Detects circular references
 *
 * @param sourceRef - Starting reference to follow
 * @param maxDepth - Maximum depth to traverse (default: 3)
 * @returns ReferenceChain object
 *
 * @example
 * const chain = await getReferenceChain(taskRef, 3);
 * // → {
 * //   source: 'TASK-006',
 * //   chain: [
 * //     { type: 'feature', id: '024', rawText: 'FEATURE-024', ... },
 * //     { type: 'prd', id: '009', rawText: 'PRD-009', ... },
 * //     { type: 'adr', id: '037', rawText: 'ADR-037', ... }
 * //   ],
 * //   depth: 3
 * // }
 */
export async function getReferenceChain(
  sourceRef: Reference,
  maxDepth: number = 3
): Promise<ReferenceChain> {
  const chain: ResolvedReference[] = [];
  const visited = new Set<string>(); // Circular reference detection

  async function followRef(ref: Reference, depth: number): Promise<void> {
    if (depth >= maxDepth) return;

    const resolved = await resolveReference(ref);
    const refKey = `${ref.type}:${ref.id}`;

    // Circular reference detection
    if (visited.has(refKey)) {
      return;
    }
    visited.add(refKey);

    if (!resolved.exists || !resolved.filePath) {
      return;
    }

    chain.push(resolved);

    // Load content and extract more references
    const content = await getReferencedContent(resolved);
    if (!content) return;

    const nestedRefs = extractReferences(content);

    // Follow nested references
    for (const nestedRef of nestedRefs) {
      await followRef(nestedRef, depth + 1);
    }
  }

  await followRef(sourceRef, 0);

  return {
    source: sourceRef.rawText,
    chain,
    depth: chain.length
  };
}

/**
 * Format reference chain as human-readable string
 *
 * @param chain - Reference chain to format
 * @returns Formatted string like "TASK-006 → FEATURE-024 → PRD-009 → ADR-037"
 *
 * @example
 * const formatted = formatReferenceChain(chain);
 * console.log(formatted);
 * // → "TASK-006 → FEATURE-024 → PRD-009 → ADR-037"
 */
export function formatReferenceChain(chain: ReferenceChain): string {
  if (chain.chain.length === 0) {
    return chain.source;
  }

  const refs = [chain.source, ...chain.chain.map(r => r.rawText)];
  return refs.join(' → ');
}

/**
 * Get backlinks - find all documents referencing a given document
 * Useful for understanding what depends on a document
 *
 * @param targetRef - Reference to find backlinks for
 * @param searchPaths - Array of directory paths to search (defaults to all doc paths)
 * @returns Array of file paths containing references to target
 *
 * @example
 * const backlinks = await getBacklinks({ type: 'prd', id: '009', rawText: 'PRD-009' });
 * // → [
 * //   '/path/to/backlog/items/TASK-006.md',
 * //   '/path/to/backlog/items/TASK-010.md',
 * //   '/path/to/docs/sprints/SPRINT-2025-10-22-configuration-system.md'
 * // ]
 */
export async function getBacklinks(
  targetRef: Reference,
  searchPaths?: string[]
): Promise<string[]> {
  try {
    const config = await loadProjectConfig();

    // Default search paths: all documentation directories
    if (!searchPaths) {
      const pathKeys = ['backlog', 'prds', 'adrs', 'sprints', 'sessions'];
      searchPaths = await Promise.all(
        pathKeys.map(key => resolveProjectPath(key))
      );
    }

    const backlinks: string[] = [];

    // Search all markdown files in search paths
    for (const searchPath of searchPaths) {
      const pattern = path.join(searchPath, '**', '*.md');
      const files = await globAsync(pattern);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const refs = extractReferences(content);

          // Check if this file references our target
          const hasReference = refs.some(
            r => r.type === targetRef.type && r.id === targetRef.id
          );

          if (hasReference) {
            backlinks.push(file);
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    }

    return backlinks;
  } catch {
    return [];
  }
}

/**
 * Clear the resolved path cache
 * Useful after file changes or for testing
 */
export function clearResolvedPathCache(): void {
  resolvedPathCache.clear();
}

/**
 * Get all references from a file
 * Convenience wrapper around extractReferences
 *
 * @param filePath - Path to file to extract references from
 * @returns Array of Reference objects
 */
export async function getReferencesFromFile(filePath: string): Promise<Reference[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return extractReferences(content);
  } catch {
    return [];
  }
}
