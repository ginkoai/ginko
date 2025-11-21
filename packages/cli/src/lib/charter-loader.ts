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
 * Charter graph structure for syncing to Neo4j
 * Represents nodes and relationships extracted from charter
 */
export interface CharterGraph {
  epic: {
    id: string;
    name: string;
    vision: string;
    purpose: string;
  };
  problems: Array<{
    id: string;
    description: string;
  }>;
  goals: Array<{
    id: string;
    text: string;
    type: 'qualitative' | 'quantitative';
  }>;
  users: Array<{
    id: string;
    description: string;
    segment: 'primary' | 'secondary' | 'long-term';
  }>;
  relationships: {
    epicSolvesProblems: string[][]; // [epicId, problemId][]
    epicHasGoals: string[][];        // [epicId, goalId][]
    problemsImpactUsers: string[][]; // [problemId, userId][]
  };
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

/**
 * Parse charter markdown into graph structure (TASK-1)
 * Extracts Epic, Problem, Goal, and User nodes with relationships
 *
 * @param content - Raw charter markdown content
 * @returns Structured graph data ready for Neo4j sync
 */
export function parseCharterToGraph(content: string): CharterGraph {
  const charter = parseCharterMarkdown(content);

  // Generate unique IDs
  const epicId = `epic_ginko_${Date.now()}`;

  // Extract epic (project-level)
  const epic = {
    id: epicId,
    name: 'Ginko',
    vision: charter.goals[0] || charter.purpose,
    purpose: charter.purpose,
  };

  // Extract problems from Purpose section
  const problems: CharterGraph['problems'] = [];
  const purposeMatch = content.match(/##\s+Purpose\s+([\s\S]*?)(?=\n##|\n---|$)/);

  if (purposeMatch) {
    const purposeText = purposeMatch[1];

    // Extract problem bullets from "**Problem:**" section
    const problemSection = purposeText.match(/\*\*Problem:\*\*\s+([\s\S]*?)(?=\*\*Solution:\*\*|$)/);
    if (problemSection) {
      const problemBullets = problemSection[1].match(/^[-*]\s+\*\*([^*]+)\*\*:/gm);
      if (problemBullets) {
        problemBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*:/);
          if (match) {
            const problemId = `problem_${index + 1}_${Date.now()}`;
            problems.push({
              id: problemId,
              description: match[1].trim(),
            });
          }
        });
      }
    }
  }

  // Extract goals from Success Criteria (qualitative and quantitative)
  const goals: CharterGraph['goals'] = [];

  // Qualitative goals
  const qualitativeMatch = content.match(/###\s+Qualitative\s+\(Primary\)\s+([\s\S]*?)(?=\n###|$)/);
  if (qualitativeMatch) {
    const checkboxes = qualitativeMatch[1].match(/- \[.\]\s+\*\*([^*]+)\*\*:?([^\n]*)/g);
    if (checkboxes) {
      checkboxes.forEach((line, index) => {
        const match = line.match(/\*\*([^*]+)\*\*:?\s*([^\n]*)/);
        if (match) {
          const goalId = `goal_qual_${index + 1}_${Date.now()}`;
          goals.push({
            id: goalId,
            text: match[1].trim(),
            type: 'qualitative',
          });
        }
      });
    }
  }

  // Quantitative goals (no bold formatting)
  const quantitativeMatch = content.match(/###\s+Quantitative\s+\(Secondary\)\s+([\s\S]*?)(?=\n###|$)/);
  if (quantitativeMatch) {
    const checkboxes = quantitativeMatch[1].match(/- \[.\]\s+([^\n]+)/g);
    if (checkboxes) {
      checkboxes.forEach((line, index) => {
        const match = line.match(/- \[.\]\s+(.+)/);
        if (match) {
          const goalId = `goal_quant_${index + 1}_${Date.now()}`;
          goals.push({
            id: goalId,
            text: match[1].trim(),
            type: 'quantitative',
          });
        }
      });
    }
  }

  // Extract users from Users section
  const users: CharterGraph['users'] = [];
  const usersMatch = content.match(/##\s+Users\s+([\s\S]*?)(?=\n##|$)/);

  if (usersMatch) {
    const usersText = usersMatch[1];

    // Primary users
    const primaryMatch = usersText.match(/\*\*Primary[^:]*:\*\*\s+([\s\S]*?)(?=\n\*\*Secondary|$)/);
    if (primaryMatch) {
      const primaryBullets = primaryMatch[1].match(/^[-*]\s+\*\*([^*]+)\*\*/gm);
      if (primaryBullets) {
        primaryBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*/);
          if (match) {
            const userId = `user_primary_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: match[1].trim(),
              segment: 'primary',
            });
          }
        });
      }
    }

    // Secondary users
    const secondaryMatch = usersText.match(/\*\*Secondary[^:]*:\*\*\s+([\s\S]*?)(?=\n\*\*Long-term|$)/);
    if (secondaryMatch) {
      const secondaryBullets = secondaryMatch[1].match(/^[-*]\s+\*\*([^*]+)\*\*/gm);
      if (secondaryBullets) {
        secondaryBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*/);
          if (match) {
            const userId = `user_secondary_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: match[1].trim(),
              segment: 'secondary',
            });
          }
        });
      }
    }

    // Long-term users
    const longTermMatch = usersText.match(/\*\*Long-term Vision:\*\*\s+([\s\S]*?)(?=\n\*\*|$)/);
    if (longTermMatch) {
      const longTermBullets = longTermMatch[1].match(/^[-*]\s+([^\n]+)/gm);
      if (longTermBullets) {
        longTermBullets.forEach((bullet, index) => {
          const text = bullet.replace(/^[-*]\s+/, '').trim();
          if (text) {
            const userId = `user_long_term_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: text,
              segment: 'long-term',
            });
          }
        });
      }
    }
  }

  // Build relationships
  const epicSolvesProblems = problems.map(p => [epicId, p.id]);
  const epicHasGoals = goals.map(g => [epicId, g.id]);

  // Each problem impacts all primary users
  const problemsImpactUsers: string[][] = [];
  const primaryUsers = users.filter(u => u.segment === 'primary');
  problems.forEach(problem => {
    primaryUsers.forEach(user => {
      problemsImpactUsers.push([problem.id, user.id]);
    });
  });

  return {
    epic,
    problems,
    goals,
    users,
    relationships: {
      epicSolvesProblems,
      epicHasGoals,
      problemsImpactUsers,
    },
  };
}
