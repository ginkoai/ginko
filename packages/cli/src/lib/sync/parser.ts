/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [sync, parser, markdown, yaml, task-026]
 * @related: [scanner.ts, sync.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [gray-matter, crypto]
 */

/**
 * Markdown Parser (TASK-026)
 *
 * Parses markdown files with YAML frontmatter to extract:
 * - Title (from frontmatter or first h1)
 * - Content (full markdown)
 * - Metadata (YAML frontmatter)
 * - Status, tags, dependencies
 * - Relationships (IMPLEMENTS, REFERENCES, TAGGED_WITH)
 *
 * Supports both ADR and PRD formats with flexible parsing
 */

import fs from 'fs/promises';
import matter from 'gray-matter';
import crypto from 'crypto';

export interface ParsedNode {
  title: string;
  content: string;
  hash: string;
  status: string;
  tags: string[];
  frontmatter: Record<string, any>;
  relationships: Array<{
    type: 'IMPLEMENTS' | 'REFERENCES' | 'TAGGED_WITH';
    targetId?: string;
    targetTitle?: string;
  }>;
}

/**
 * Parse markdown file with YAML frontmatter
 */
export async function parseMarkdownFile(filePath: string): Promise<ParsedNode> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Generate content hash for duplicate detection
    const hash = generateHash(content);

    // Extract title
    const title = extractTitle(frontmatter, content, filePath);

    // Extract status
    const status = extractStatus(frontmatter, content);

    // Extract tags
    const tags = extractTags(frontmatter, content);

    // Extract relationships
    const relationships = extractRelationships(frontmatter, content);

    return {
      title,
      content: fileContent, // Full content including frontmatter
      hash,
      status,
      tags,
      frontmatter,
      relationships,
    };

  } catch (error: any) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}

/**
 * Extract title from frontmatter or content
 */
function extractTitle(frontmatter: any, content: string, filePath: string): string {
  // Try frontmatter title
  if (frontmatter.title) {
    return frontmatter.title;
  }

  // Try first h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fallback to filename
  const filename = filePath.split('/').pop() || 'Unknown';
  return filename.replace(/\.md$/, '').replace(/-/g, ' ');
}

/**
 * Extract status from frontmatter or content
 */
function extractStatus(frontmatter: any, content: string): string {
  // Try frontmatter
  if (frontmatter.status) {
    const status = frontmatter.status.toLowerCase();
    // Normalize common status values
    if (['accepted', 'approved', 'active', 'current'].includes(status)) {
      return 'active';
    }
    if (['proposed', 'draft', 'pending'].includes(status)) {
      return 'draft';
    }
    if (['deprecated', 'superseded', 'archived'].includes(status)) {
      return 'archived';
    }
    return status;
  }

  // Try to find status in content (ADR format)
  const statusMatch = content.match(/\*\*Status:\*\*\s+(\w+)/i);
  if (statusMatch) {
    return statusMatch[1].toLowerCase();
  }

  // Default to active
  return 'active';
}

/**
 * Extract tags from frontmatter or content
 */
function extractTags(frontmatter: any, content: string): string[] {
  const tags: string[] = [];

  // From frontmatter
  if (Array.isArray(frontmatter.tags)) {
    tags.push(...frontmatter.tags);
  } else if (typeof frontmatter.tags === 'string') {
    tags.push(...frontmatter.tags.split(',').map((t: string) => t.trim()));
  }

  // From content (look for tags in metadata section)
  const tagsMatch = content.match(/tags?:\s*\[([^\]]+)\]/i);
  if (tagsMatch) {
    const contentTags = tagsMatch[1].split(',').map((t: string) => t.trim());
    tags.push(...contentTags);
  }

  // Deduplicate
  return [...new Set(tags)];
}

/**
 * Extract relationships from frontmatter and content
 */
function extractRelationships(frontmatter: any, content: string): Array<{
  type: 'IMPLEMENTS' | 'REFERENCES' | 'TAGGED_WITH';
  targetId?: string;
  targetTitle?: string;
}> {
  const relationships: Array<{
    type: 'IMPLEMENTS' | 'REFERENCES' | 'TAGGED_WITH';
    targetId?: string;
    targetTitle?: string;
  }> = [];

  // IMPLEMENTS relationships (from frontmatter or content)
  if (frontmatter.implements) {
    const implements_ = Array.isArray(frontmatter.implements)
      ? frontmatter.implements
      : [frontmatter.implements];

    implements_.forEach((target: string) => {
      relationships.push({
        type: 'IMPLEMENTS',
        targetTitle: target,
      });
    });
  }

  // REFERENCES relationships (from frontmatter.related)
  if (Array.isArray(frontmatter.related)) {
    frontmatter.related.forEach((target: string) => {
      // Clean up markdown file extensions
      const cleanTarget = target.replace(/\.md$/, '');
      relationships.push({
        type: 'REFERENCES',
        targetTitle: cleanTarget,
      });
    });
  }

  // References in content (ADR-### or PRD-### mentions)
  const adrRefs = content.match(/\b(ADR-\d+)\b/g) || [];
  const prdRefs = content.match(/\b(PRD-\d+)\b/g) || [];

  [...adrRefs, ...prdRefs].forEach(ref => {
    // Avoid duplicates
    if (!relationships.some(r => r.targetTitle === ref)) {
      relationships.push({
        type: 'REFERENCES',
        targetTitle: ref,
      });
    }
  });

  return relationships;
}

/**
 * Generate content hash for duplicate detection
 */
function generateHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Validate parsed node has required fields
 */
export function validateParsedNode(node: ParsedNode): boolean {
  return !!(node.title && node.content && node.hash);
}
