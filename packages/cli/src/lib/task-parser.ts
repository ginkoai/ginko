/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-19
 * @tags: [task-parser, sprint, epic-015, sprint-0a]
 * @related: [sprint-parser.ts, task-graph-sync.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra]
 */

/**
 * Task Parser for Sprint Markdown (EPIC-015 Sprint 0a Task 1)
 *
 * Parses task definitions from sprint markdown files into structured data
 * for syncing to Neo4j graph. Handles multiple task ID formats:
 * - Standard: e{NNN}_s{NN}_t{NN} (e.g., e015_s00a_t01)
 * - Legacy: TASK-N (e.g., TASK-1)
 * - Ad-hoc: adhoc_{YYMMDD}_s{NN}_t{NN} (e.g., adhoc_260119_s01_t01)
 *
 * Key principle (ADR-060): Content from Git, State from Graph.
 * Parser extracts CONTENT fields only (title, goal, priority, estimate).
 * Status in markdown is only used for initial creation, not updates.
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Task status values (aligned with Status API)
 */
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete' | 'paused';

/**
 * Task content quality assessment (EPIC-018)
 */
export type TaskContentQuality = 'thin' | 'adequate' | 'rich';

/**
 * Parsed task from sprint markdown
 *
 * EPIC-018: Rich task content follows WHY-WHAT-HOW structure:
 * - problem: WHY this task exists (motivation)
 * - solution: WHAT we're achieving (outcome)
 * - approach: HOW we'll implement it (strategy)
 * - scope: boundaries (in/out of scope)
 * - acceptance_criteria: done when (definition of done)
 */
export interface ParsedTask {
  /** Task ID (e.g., e015_s00a_t01, TASK-1, adhoc_260119_s01_t01) */
  id: string;
  /** Derived sprint ID (e.g., e015_s00a, adhoc_260119_s01) */
  sprint_id: string;
  /** Derived epic ID (e.g., e015, adhoc_260119) */
  epic_id: string;
  /** Task title */
  title: string;
  /** Estimated effort (e.g., "3h", "4-6h") */
  estimate: string | null;
  /** Priority level */
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Assignee email or null */
  assignee: string | null;
  /** Initial status from checkbox (used only on CREATE) */
  initial_status: TaskStatus;

  // WHY-WHAT-HOW structure (EPIC-018)
  /** WHY: Problem/motivation - why this task exists */
  problem: string | null;
  /** WHAT: Solution/outcome - what we're achieving */
  solution: string | null;
  /** HOW: Approach/strategy - implementation notes */
  approach: string | null;
  /** Boundaries: What's in/out of scope */
  scope: string | null;

  /** @deprecated Use 'solution' instead. Kept for backward compatibility. */
  goal: string | null;

  /** Acceptance criteria list (definition of done) */
  acceptance_criteria: string[];
  /** Referenced files */
  files: string[];
  /** Related ADR references */
  related_adrs: string[];

  // Quality metadata (EPIC-018)
  /** AI confidence score (0-100) when task was created */
  confidence: number | null;
  /** Assessed content quality */
  content_quality: TaskContentQuality;
}

/**
 * Sprint metadata extracted alongside tasks
 */
export interface ParsedSprint {
  /** Sprint ID (derived from filename or content) */
  id: string;
  /** Sprint name */
  name: string;
  /** Epic ID */
  epic_id: string;
  /** Sprint file path */
  file_path: string;
}

/**
 * Result of parsing a sprint file
 */
export interface SprintParseResult {
  sprint: ParsedSprint;
  tasks: ParsedTask[];
}

/**
 * Parse task hierarchy from task ID
 *
 * @param taskId - Task ID in various formats
 * @returns Object with sprint_id and epic_id, or null if invalid
 */
export function parseTaskHierarchy(taskId: string): { sprint_id: string; epic_id: string } | null {
  // Standard format: e015_s00a_t01 or e015_s00_t01
  const standardMatch = taskId.match(/^(e\d{3})_(s\d{2}[a-z]?)_(t\d{2})$/i);
  if (standardMatch) {
    const epicId = standardMatch[1].toLowerCase();
    const sprintSuffix = standardMatch[2].toLowerCase();
    return {
      sprint_id: `${epicId}_${sprintSuffix}`,
      epic_id: epicId,
    };
  }

  // Ad-hoc format: adhoc_260119_s01_t01
  const adhocMatch = taskId.match(/^(adhoc_\d{6})_(s\d{2})_(t\d{2})$/i);
  if (adhocMatch) {
    const adhocId = adhocMatch[1].toLowerCase();
    const sprintSuffix = adhocMatch[2].toLowerCase();
    return {
      sprint_id: `${adhocId}_${sprintSuffix}`,
      epic_id: adhocId,
    };
  }

  // Legacy TASK-N format - derive from context (requires sprint info)
  // For legacy format, we cannot derive hierarchy without sprint context
  if (taskId.match(/^TASK-\d+$/i)) {
    return null; // Caller must provide sprint context
  }

  return null;
}

/**
 * Map checkbox character to task status
 *
 * @param checkbox - Single character from checkbox ([x], [@], [ ], [Z])
 * @returns TaskStatus value
 */
function mapCheckboxToStatus(checkbox: string | undefined): TaskStatus {
  if (!checkbox) return 'not_started';

  const char = checkbox.trim().toLowerCase();
  switch (char) {
    case 'x':
      return 'complete';
    case '@':
      return 'in_progress';
    case 'z':
      return 'paused';
    case ' ':
    default:
      return 'not_started';
  }
}

/**
 * Normalize priority value
 */
function normalizePriority(priority: string | undefined): ParsedTask['priority'] {
  if (!priority) return 'MEDIUM';

  const upper = priority.trim().toUpperCase();
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(upper)) {
    return upper as ParsedTask['priority'];
  }
  return 'MEDIUM';
}

/**
 * Extract approach/implementation notes from task block (e014_s02_t04)
 *
 * Parses the **Approach:** section which contains 2-3 sentences describing
 * how to implement the task.
 */
function extractApproach(blockText: string): string | null {
  // Match: **Approach:** followed by text until next section
  const approachMatch = blockText.match(
    /\*\*Approach:\*\*\s+([\s\S]*?)(?=\n\*\*(?!Approach)|\n###|\n---|\n##|$)/i
  );

  if (!approachMatch) return null;

  // Clean up the approach text - join lines and trim
  const approach = approachMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();

  return approach.length > 0 ? approach : null;
}

/**
 * Extract problem/motivation from task block (EPIC-018)
 *
 * Parses the **Problem:** section - WHY this task exists.
 */
function extractProblem(blockText: string): string | null {
  const problemMatch = blockText.match(
    /\*\*Problem:\*\*\s+([\s\S]*?)(?=\n\*\*(?!Problem)|\n###|\n---|\n##|$)/i
  );

  if (!problemMatch) return null;

  const problem = problemMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();

  return problem.length > 0 ? problem : null;
}

/**
 * Extract solution/outcome from task block (EPIC-018)
 *
 * Parses the **Solution:** section - WHAT we're achieving.
 */
function extractSolution(blockText: string): string | null {
  const solutionMatch = blockText.match(
    /\*\*Solution:\*\*\s+([\s\S]*?)(?=\n\*\*(?!Solution)|\n###|\n---|\n##|$)/i
  );

  if (!solutionMatch) return null;

  const solution = solutionMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();

  return solution.length > 0 ? solution : null;
}

/**
 * Extract scope/boundaries from task block (EPIC-018)
 *
 * Parses the **Scope:** section - what's in/out of scope.
 * Handles both inline text and bullet list format.
 */
function extractScope(blockText: string): string | null {
  const scopeMatch = blockText.match(
    /\*\*Scope:\*\*\s+([\s\S]*?)(?=\n\*\*(?!Scope)|\n###|\n---|\n##|$)/i
  );

  if (!scopeMatch) return null;

  // Preserve structure for bullet lists, join inline text
  const lines = scopeMatch[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // If it's a bullet list, preserve newlines
  const hasBullets = lines.some(line => line.startsWith('-'));
  const scope = hasBullets ? lines.join('\n') : lines.join(' ');

  return scope.length > 0 ? scope.trim() : null;
}

/**
 * Extract confidence score from task block (EPIC-018)
 *
 * Parses **Confidence:** N% or **Confidence:** N (0-100)
 */
function extractConfidence(blockText: string): number | null {
  const confidenceMatch = blockText.match(/\*\*Confidence:\*\*\s*(\d+)%?/i);
  if (!confidenceMatch) return null;

  const value = parseInt(confidenceMatch[1], 10);
  return value >= 0 && value <= 100 ? value : null;
}

/**
 * Assess task content quality (EPIC-018)
 *
 * Evaluates whether a task has enough content to work autonomously.
 * - thin: Missing critical fields (problem, acceptance criteria)
 * - adequate: Has basics but missing approach or scope
 * - rich: Complete WHY-WHAT-HOW structure
 */
export function assessTaskContentQuality(task: ParsedTask): TaskContentQuality {
  const hasContent = (s: string | null) => s && s.length >= 20;

  // Thin: Missing problem statement or acceptance criteria
  if (!hasContent(task.problem) && !hasContent(task.goal)) return 'thin';
  if (task.acceptance_criteria.length === 0) return 'thin';

  // Adequate: Has basics but missing approach or scope
  if (!hasContent(task.approach)) return 'adequate';
  if (!hasContent(task.scope) && !hasContent(task.solution)) return 'adequate';

  // Rich: Complete structure
  return 'rich';
}

/**
 * Extract acceptance criteria from task block
 */
function extractAcceptanceCriteria(blockText: string): string[] {
  const criteria: string[] = [];

  // Find acceptance criteria section
  const sectionMatch = blockText.match(
    /\*\*Acceptance Criteria:\*\*\s*([\s\S]*?)(?=\n\*\*|\n###|\n---|\n##|$)/i
  );

  if (!sectionMatch) return criteria;

  // Extract checkbox items: - [ ] or - [x]
  const checkboxMatches = sectionMatch[1].matchAll(/^-\s+\[.\]\s+(.+?)$/gm);
  for (const match of checkboxMatches) {
    criteria.push(match[1].trim());
  }

  // Also extract plain bullets if no checkboxes found
  if (criteria.length === 0) {
    const bulletMatches = sectionMatch[1].matchAll(/^-\s+(.+?)$/gm);
    for (const match of bulletMatches) {
      criteria.push(match[1].trim());
    }
  }

  return criteria;
}

/**
 * Extract file paths from task block
 */
function extractFiles(blockText: string): string[] {
  const files = new Set<string>();

  // Pattern: **Files:** section with bullet list
  const filesSection = blockText.match(/\*\*Files(?:\sto\s(?:Create|Modify))?:\*\*\s*([\s\S]*?)(?=\n\*\*|\n###|\n---|\n##|$)/i);
  if (filesSection) {
    // Match: - Create: `path/to/file.ts` or - Modify: `path/to/file.ts` or just `path`
    const pathMatches = filesSection[1].matchAll(/`([^`]+\.[a-z]+)`/gi);
    for (const match of pathMatches) {
      files.add(match[1]);
    }
  }

  // Pattern: inline code paths that look like file paths
  const inlineMatches = blockText.matchAll(/`((?:packages|dashboard|src|docs)\/[^`]+\.[a-z]+)`/gi);
  for (const match of inlineMatches) {
    files.add(match[1]);
  }

  return Array.from(files).sort();
}

/**
 * Extract related ADR references
 */
function extractRelatedADRs(blockText: string): string[] {
  const adrs = new Set<string>();

  // Match ADR-XXX patterns
  const adrMatches = blockText.matchAll(/ADR-(\d+)/gi);
  for (const match of adrMatches) {
    adrs.add(`ADR-${match[1]}`);
  }

  return Array.from(adrs).sort();
}

/**
 * Parse a single task block
 *
 * @param blockText - Raw markdown text for one task
 * @param sprintContext - Sprint context for legacy TASK-N format
 * @returns ParsedTask or null if invalid
 */
export function parseTaskBlock(
  blockText: string,
  sprintContext?: { sprint_id: string; epic_id: string }
): ParsedTask | null {
  // Extract task header - multiple formats supported
  // Standard: ### e015_s00a_t01: Title (3h)
  // Legacy: ### TASK-1: Title (4-6h)
  // Ad-hoc: ### adhoc_260119_s01_t01 - Title
  // Without time: ### e015_s00a_t01: Title
  const headerPatterns = [
    // Standard with colon and optional time
    /^###\s+([a-z0-9_]+):\s+(.+?)\s*(?:\(([0-9]+(?:-[0-9]+)?h?)\))?$/im,
    // With dash separator (ad-hoc style)
    /^###\s+([a-z0-9_]+)\s+-\s+(.+?)$/im,
    // Legacy TASK-N format
    /^###\s+(TASK-\d+):\s+(.+?)\s*(?:\(([0-9]+(?:-[0-9]+)?h?)\))?$/im,
  ];

  let taskId: string | null = null;
  let title: string | null = null;
  let estimate: string | null = null;

  for (const pattern of headerPatterns) {
    const match = blockText.match(pattern);
    if (match) {
      taskId = match[1];
      title = match[2].trim();
      estimate = match[3] || null;
      break;
    }
  }

  if (!taskId || !title) {
    return null;
  }

  // Parse hierarchy
  let hierarchy = parseTaskHierarchy(taskId);
  let canonicalTaskId = taskId;

  // For legacy TASK-N format, use sprint context and synthesize canonical ID
  if (!hierarchy && sprintContext) {
    hierarchy = {
      sprint_id: sprintContext.sprint_id,
      epic_id: sprintContext.epic_id,
    };

    // Synthesize canonical task ID to avoid collisions across sprints.
    // TASK-3 in sprint e001_s02 → e001_s02_t03
    const taskNumMatch = taskId.match(/^TASK-(\d+)$/i);
    if (taskNumMatch) {
      const taskNum = taskNumMatch[1].padStart(2, '0');
      canonicalTaskId = `${sprintContext.sprint_id}_t${taskNum}`;
    }
  }

  if (!hierarchy) {
    // Cannot determine hierarchy, skip task
    console.warn(`Cannot determine hierarchy for task: ${taskId}`);
    return null;
  }

  // Extract status from checkbox: **Status:** [x]
  const statusMatch = blockText.match(/\*\*Status:\*\*\s+\[(.)\]/i);
  const initialStatus = mapCheckboxToStatus(statusMatch?.[1]);

  // Extract priority
  const priorityMatch = blockText.match(/\*\*Priority:\*\*\s+([A-Z_]+)/i);
  const priority = normalizePriority(priorityMatch?.[1]);

  // Extract assignee (accepts both Assignee and Owner)
  const assigneeMatch = blockText.match(/\*\*(?:Assignee|Owner):\*\*\s+([^\n]+)/i);
  let assignee: string | null = null;
  if (assigneeMatch) {
    const value = assigneeMatch[1].trim();
    // Filter out "TBD", "None", empty values
    if (value && !['tbd', 'none', 'n/a', '-'].includes(value.toLowerCase())) {
      assignee = value;
    }
  }

  // Extract goal (legacy, backward compatibility)
  const goalMatch = blockText.match(/\*\*Goal:\*\*\s+([^\n]+)/i);
  const goal = goalMatch ? goalMatch[1].trim() : null;

  // Extract WHY-WHAT-HOW fields (EPIC-018)
  const problem = extractProblem(blockText);
  const solution = extractSolution(blockText);
  const approach = extractApproach(blockText);
  const scope = extractScope(blockText);
  const confidence = extractConfidence(blockText);

  // Extract acceptance criteria
  const acceptanceCriteria = extractAcceptanceCriteria(blockText);

  // Extract files
  const files = extractFiles(blockText);

  // Extract related ADRs
  const relatedADRs = extractRelatedADRs(blockText);

  // Build the parsed task
  const parsedTask: ParsedTask = {
    id: canonicalTaskId.toLowerCase(),
    sprint_id: hierarchy.sprint_id,
    epic_id: hierarchy.epic_id,
    title,
    estimate,
    priority,
    assignee,
    initial_status: initialStatus,
    // WHY-WHAT-HOW (EPIC-018)
    problem,
    solution,
    approach,
    scope,
    // Legacy
    goal,
    // Done when
    acceptance_criteria: acceptanceCriteria,
    files,
    related_adrs: relatedADRs,
    // Quality metadata
    confidence,
    content_quality: 'thin', // Will be assessed below
  };

  // Assess content quality
  parsedTask.content_quality = assessTaskContentQuality(parsedTask);

  return parsedTask;
}

/**
 * Extract sprint metadata from sprint file
 *
 * @param content - Sprint file content
 * @param filePath - Path to sprint file
 * @returns ParsedSprint metadata
 */
function extractSprintMetadata(content: string, filePath: string): ParsedSprint {
  const filename = path.basename(filePath, '.md');

  // Try to extract sprint ID from filename
  // Pattern: SPRINT-2026-01-e015-s00a-... → e015_s00a
  const filenameMatch = filename.match(/SPRINT-\d{4}-\d{2}-(e\d{3})-(s\d{2}[a-z]?)-/i);
  if (filenameMatch) {
    const epicId = filenameMatch[1].toLowerCase();
    const sprintSuffix = filenameMatch[2].toLowerCase();
    const sprintId = `${epicId}_${sprintSuffix}`;

    // Extract sprint name from title
    const titleMatch = content.match(/^#\s+(?:SPRINT:\s+)?(.+?)(?:\s+\(|$)/m);
    const name = titleMatch ? titleMatch[1].trim() : filename;

    return {
      id: sprintId,
      name,
      epic_id: epicId,
      file_path: filePath,
    };
  }

  // Ad-hoc pattern: SPRINT-adhoc_260119-... or SPRINT-adhoc_251209_s01-...
  const adhocMatch = filename.match(/SPRINT-(adhoc_\d{6}(?:_s\d{2})?)-/i);
  if (adhocMatch) {
    const adhocId = adhocMatch[1].toLowerCase();
    // Default to _s01 if no sprint suffix embedded in the match
    const sprintId = adhocId.match(/_s\d{2}$/) ? adhocId : `${adhocId}_s01`;

    const titleMatch = content.match(/^#\s+(.+?)(?:\s+\(|$)/m);
    const name = titleMatch ? titleMatch[1].trim() : filename;

    return {
      id: sprintId,
      name,
      epic_id: adhocId,
      file_path: filePath,
    };
  }

  // Legacy pattern from content: # SPRINT: Name (EPIC-XXX Sprint N)
  const legacyMatch = content.match(/^#\s+SPRINT:\s+(.+?)\s+\(EPIC-(\d+)\s+Sprint\s+(\d+)\)/m);
  if (legacyMatch) {
    const name = legacyMatch[1].trim();
    const epicNum = legacyMatch[2];
    const sprintNum = legacyMatch[3];
    const epicId = `e${epicNum.padStart(3, '0')}`;
    const sprintId = `${epicId}_s${sprintNum.padStart(2, '0')}`;

    return {
      id: sprintId,
      name,
      epic_id: epicId,
      file_path: filePath,
    };
  }

  // Heuristic: extract sprint number from filename and try to find epic reference in content.
  // Handles AI-generated filenames like SPRINT-2026-02-happyhour-sprint3.md
  const sprintNumFromFilename = filename.match(/sprint[_-]?(\d+)/i);
  if (sprintNumFromFilename) {
    const sprintNum = sprintNumFromFilename[1].padStart(2, '0');

    // Try to find EPIC-NNN reference in file content
    const epicRefInContent = content.match(/EPIC-(\d+)/i);
    // Also try epic_id in frontmatter
    const epicIdFrontmatter = content.match(/epic_id:\s*(?:EPIC-)?(\d+)/i);

    const epicNum = epicRefInContent?.[1] || epicIdFrontmatter?.[1];
    if (epicNum) {
      const epicId = `e${epicNum.padStart(3, '0')}`;
      const sprintId = `${epicId}_s${sprintNum}`;
      const titleMatch = content.match(/^#\s+(?:SPRINT:\s+)?(.+?)(?:\s+\(|$)/m);
      const name = titleMatch ? titleMatch[1].trim() : filename;

      return {
        id: sprintId,
        name,
        epic_id: epicId,
        file_path: filePath,
      };
    }
  }

  // Fallback: generate from filename
  const fallbackId = filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^sprint_/, '');

  return {
    id: fallbackId,
    name: filename,
    epic_id: 'unknown',
    file_path: filePath,
  };
}

/**
 * Parse sprint markdown file to extract all tasks
 *
 * @param content - Raw sprint markdown content
 * @param filePath - Path to sprint file (for metadata extraction)
 * @returns SprintParseResult with sprint metadata and parsed tasks
 */
export function parseSprintTasks(content: string, filePath: string): SprintParseResult {
  // Extract sprint metadata
  const sprint = extractSprintMetadata(content, filePath);

  // Split content by task headers (### followed by task ID pattern)
  // Match: ### e015_s00a_t01:, ### TASK-1:, ### adhoc_..._t01
  const taskSections = content.split(/(?=^###\s+(?:e\d{3}_s\d{2}[a-z]?_t\d{2}|TASK-\d+|adhoc_\d{6}_s\d{2}_t\d{2})[\s:-])/im);

  const tasks: ParsedTask[] = [];
  const sprintContext = {
    sprint_id: sprint.id,
    epic_id: sprint.epic_id,
  };

  for (const section of taskSections) {
    if (!section.trim().startsWith('###')) continue;

    const task = parseTaskBlock(section, sprintContext);
    if (task) {
      tasks.push(task);
    }
  }

  return { sprint, tasks };
}

/**
 * Parse sprint file from filesystem
 *
 * @param filePath - Absolute path to sprint markdown file
 * @returns SprintParseResult or null if file not found
 */
export async function parseSprintFile(filePath: string): Promise<SprintParseResult | null> {
  try {
    if (!await fs.pathExists(filePath)) {
      console.warn(`Sprint file not found: ${filePath}`);
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return parseSprintTasks(content, filePath);
  } catch (error) {
    console.error(`Failed to parse sprint file ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse all sprint files in a directory
 *
 * @param sprintsDir - Path to sprints directory
 * @returns Array of SprintParseResult
 */
export async function parseAllSprints(sprintsDir: string): Promise<SprintParseResult[]> {
  const results: SprintParseResult[] = [];

  try {
    if (!await fs.pathExists(sprintsDir)) {
      console.warn(`Sprints directory not found: ${sprintsDir}`);
      return results;
    }

    const files = await fs.readdir(sprintsDir);
    const sprintFiles = files.filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'));

    for (const file of sprintFiles) {
      const filePath = path.join(sprintsDir, file);
      const result = await parseSprintFile(filePath);
      if (result) {
        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.error(`Failed to parse sprints directory ${sprintsDir}:`, error);
    return results;
  }
}
