/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [sync, scanner, filesystem, task-026]
 * @related: [sync.ts, parser.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [glob]
 */

/**
 * File Scanner (TASK-026)
 *
 * Scans local filesystem for knowledge files:
 * - ADRs: docs/adr/ADR-*.md
 * - PRDs: docs/PRD/PRD-*.md
 * - Modules: .ginko/modules/*.md (future support)
 *
 * Returns structured LocalNode objects with metadata and relationships
 */

import glob from 'glob';
import path from 'path';
import { promisify } from 'util';
import { parseMarkdownFile, ParsedNode } from './parser.js';

const globAsync = promisify(glob);

export interface LocalNode {
  type: 'ADR' | 'PRD' | 'ContextModule';
  title: string;
  content: string;
  filePath: string;
  status: string;
  tags: string[];
  hash: string;
  metadata: Record<string, any>;
  relationships: Array<{
    type: 'IMPLEMENTS' | 'REFERENCES' | 'TAGGED_WITH';
    targetId?: string;
    targetTitle?: string;
  }>;
}

/**
 * Scan local filesystem for knowledge files
 */
export async function scanLocalKnowledge(basePath: string): Promise<LocalNode[]> {
  const nodes: LocalNode[] = [];

  try {
    // Scan ADRs
    const adrPattern = path.join(basePath, 'docs/adr/ADR-*.md');
    const adrFiles = await globAsync(adrPattern);

    for (const filePath of adrFiles) {
      try {
        const parsed = await parseMarkdownFile(filePath);
        const node = convertToLocalNode(parsed, 'ADR', filePath);
        nodes.push(node);
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse ${filePath}: ${error.message}`);
      }
    }

    // Scan PRDs
    const prdPattern = path.join(basePath, 'docs/PRD/PRD-*.md');
    const prdFiles = await globAsync(prdPattern);

    for (const filePath of prdFiles) {
      try {
        const parsed = await parseMarkdownFile(filePath);
        const node = convertToLocalNode(parsed, 'PRD', filePath);
        nodes.push(node);
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse ${filePath}: ${error.message}`);
      }
    }

    // Future: Scan modules
    // const modulePattern = path.join(basePath, '.ginko/modules/*.md');
    // const moduleFiles = await glob(modulePattern);

  } catch (error: any) {
    throw new Error(`Failed to scan knowledge files: ${error.message}`);
  }

  return nodes;
}

/**
 * Convert parsed markdown to LocalNode structure
 */
function convertToLocalNode(
  parsed: ParsedNode,
  type: 'ADR' | 'PRD' | 'ContextModule',
  filePath: string
): LocalNode {
  return {
    type,
    title: parsed.title,
    content: parsed.content,
    filePath,
    status: parsed.status || 'active',
    tags: parsed.tags || [],
    hash: parsed.hash,
    metadata: {
      ...parsed.frontmatter,
      priority: parsed.frontmatter?.priority || 'medium',
      audience: parsed.frontmatter?.audience || [],
      dependencies: parsed.frontmatter?.dependencies || [],
    },
    relationships: parsed.relationships,
  };
}

/**
 * Get file statistics for reporting
 */
export function getFileStats(nodes: LocalNode[]): Record<string, number> {
  return nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
