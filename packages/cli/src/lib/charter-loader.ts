/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-19
 * @tags: [charter, strategic-context, epic-001]
 * @related: [context-loader-events.ts, start-reflection.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs-extra, path]
 */

/**
 * Charter Loader (EPIC-001 TASK-1)
 *
 * Loads project charter from filesystem (docs/PROJECT-CHARTER.md)
 * and parses into structured format for strategic context display.
 *
 * Charter provides AI partners with:
 * - Project purpose and vision
 * - Success criteria
 * - Goals and scope boundaries
 * - Constraints and team info
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Structured charter data
 */
export interface Charter {
  purpose: string;
  goals: string[];
  successCriteria: string[];
  scope?: {
    inScope: string[];
    outOfScope: string[];
    tbd: string[];
  };
  constraints?: string;
  team?: string[];
  updatedAt?: Date;
  version?: string;
}

/**
 * Load charter from filesystem
 *
 * @param projectRoot - Project root directory (defaults to git root)
 * @returns Parsed charter or null if not found
 */
export async function loadCharter(projectRoot?: string): Promise<Charter | null> {
  try {
    const root = projectRoot || await findGitRoot();
    const charterPath = path.join(root, 'docs', 'PROJECT-CHARTER.md');

    if (!fs.existsSync(charterPath)) {
      return null;
    }

    const content = await fs.readFile(charterPath, 'utf-8');
    return parseCharterMarkdown(content);
  } catch (error) {
    console.error('Failed to load charter:', (error as Error).message);
    return null;
  }
}

/**
 * Find git root directory
 */
async function findGitRoot(): Promise<string> {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    return gitRoot;
  } catch (error) {
    // Fallback to cwd if not in a git repo
    return process.cwd();
  }
}

/**
 * Parse charter markdown into structured data
 *
 * Extracts key sections:
 * - Purpose (## Purpose)
 * - Goals (extracted from Purpose or Success Criteria)
 * - Success Criteria (## Success Criteria)
 * - Scope (## Scope)
 * - Constraints (## Constraints)
 * - Team (## Team)
 */
function parseCharterMarkdown(content: string): Charter {
  const charter: Charter = {
    purpose: '',
    goals: [],
    successCriteria: [],
  };

  // Extract version from frontmatter
  const versionMatch = content.match(/version:\s*([^\n]+)/);
  if (versionMatch) {
    charter.version = versionMatch[1].trim();
  }

  // Extract updated date from frontmatter
  const updatedMatch = content.match(/updated:\s*([^\n]+)/);
  if (updatedMatch) {
    charter.updatedAt = new Date(updatedMatch[1].trim());
  }

  // Extract Purpose section
  const purposeMatch = content.match(/##\s+Purpose\s+([\s\S]*?)(?=\n##|\n---|$)/);
  if (purposeMatch) {
    // Get first paragraph or "Solution:" section
    const purposeText = purposeMatch[1].trim();
    const solutionMatch = purposeText.match(/\*\*Solution:\*\*\s+([^\n]+(?:\n(?!\*\*)[^\n]+)*)/);
    if (solutionMatch) {
      charter.purpose = solutionMatch[1].trim();
    } else {
      // Take first substantial paragraph
      const firstPara = purposeText.split('\n\n')[0];
      charter.purpose = firstPara.replace(/\*\*[^*]+:\*\*/g, '').trim();
    }
  }

  // Extract Goals from Purpose section (if present)
  if (purposeMatch) {
    const visionMatch = purposeMatch[1].match(/\*\*Vision:\*\*\s+([^\n]+)/);
    if (visionMatch) {
      charter.goals.push(visionMatch[1].trim());
    }
  }

  // Extract Success Criteria
  const successMatch = content.match(/###?\s+(?:Qualitative|Success Criteria)\s+(?:\(Primary\))?\s+([\s\S]*?)(?=\n###?\s+(?:Quantitative|Validation|##)|$)/);
  if (successMatch) {
    const criteriaText = successMatch[1];
    const checkboxes = criteriaText.match(/- \[.\]\s+\*\*([^*]+)\*\*:?([^\n]*)/g);
    if (checkboxes) {
      checkboxes.forEach(line => {
        const match = line.match(/\*\*([^*]+)\*\*:?\s*([^\n]*)/);
        if (match) {
          const criterion = match[2] || match[1];
          charter.successCriteria.push(criterion.trim());
        }
      });
    }
  }

  // Extract Scope
  const scopeInMatch = content.match(/###\s+In Scope[^\n]*\s+([\s\S]*?)(?=\n###|$)/);
  const scopeOutMatch = content.match(/###\s+Out of Scope[^\n]*\s+([\s\S]*?)(?=\n###|$)/);
  const scopeTbdMatch = content.match(/###\s+To Be Determined[^\n]*\s+([\s\S]*?)(?=\n###|$)/);

  if (scopeInMatch || scopeOutMatch || scopeTbdMatch) {
    charter.scope = {
      inScope: extractBulletPoints(scopeInMatch?.[1] || ''),
      outOfScope: extractBulletPoints(scopeOutMatch?.[1] || ''),
      tbd: extractBulletPoints(scopeTbdMatch?.[1] || ''),
    };
  }

  // Extract Constraints section
  const constraintsMatch = content.match(/##\s+Constraints\s+([\s\S]*?)(?=\n##|$)/);
  if (constraintsMatch) {
    charter.constraints = constraintsMatch[1].trim();
  }

  // Extract Team
  const teamMatch = content.match(/##\s+Team\s+([\s\S]*?)(?=\n##|$)/);
  if (teamMatch) {
    const teamText = teamMatch[1];
    const members = teamText.match(/[-*]\s+\*\*([^*]+)\*\*/g);
    if (members) {
      charter.team = members.map(m => m.replace(/[-*]\s+\*\*([^*]+)\*\*.*/, '$1').trim());
    }
  }

  return charter;
}

/**
 * Extract bullet points from markdown section
 */
function extractBulletPoints(text: string): string[] {
  const bullets = text.match(/^[-*]\s+\*\*([^*]+)\*\*:?\s*([^\n]*)/gm);
  if (!bullets) return [];

  return bullets.map(line => {
    const match = line.match(/\*\*([^*]+)\*\*:?\s*([^\n]*)/);
    if (match) {
      return match[2].trim() || match[1].trim();
    }
    return line.replace(/^[-*]\s+/, '').trim();
  }).filter(s => s.length > 0);
}
