/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-21
 * @tags: [sprint, graph-sync, task-1, epic-001]
 * @related: [charter-loader.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, path, child_process]
 */

/**
 * Sprint Parser (EPIC-001 TASK-2)
 *
 * Parses sprint markdown files (docs/sprints/SPRINT-*.md) into structured
 * graph data for syncing to Neo4j. Extracts Sprint and Task nodes with
 * metadata (status, effort, priority, files, ADRs).
 *
 * Enables EPIC-002's AI-native sprint graphs by providing:
 * - Sprint → Task relationships (CONTAINS, NEXT_TASK)
 * - Task metadata (status, effort, priority)
 * - Task → File relationships (MODIFIES)
 * - Task → ADR references
 *
 * Sprint File Structure:
 * - Title: `# SPRINT: [name] (EPIC-XXX Sprint N)`
 * - Metadata: Duration, Type, Success Criteria
 * - Tasks: `### TASK-N: [title] (effort)`
 *   - Status: **Status:** Not Started | In Progress | Complete
 *   - Metadata: Owner, Priority, Effort
 *   - Files: Listed under **Files:** section
 *   - ADRs: Referenced in **Implementation:** sections
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Structured sprint graph data
 * Ready for Neo4j sync via graph API
 */
export interface SprintGraph {
  sprint: {
    id: string;
    name: string;
    goal: string;
    epicId: string;
    startDate: Date;
    endDate: Date;
    duration: string;
    type: string;
    successCriteria: string[];
    progress: number; // 0-100
  };
  tasks: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'complete';
    effort: string; // "4-6h", "8-10h"
    priority: string; // "CRITICAL", "HIGH", "MEDIUM", "LOW"
    owner?: string;
    goal: string;
    acceptanceCriteria: string[];
    files: string[];
    relatedADRs: string[];
  }>;
  relationships: {
    sprintContainsTasks: string[][]; // [sprintId, taskId][]
    sprintNextTask: string | null; // First incomplete task ID
  };
}

/**
 * Load sprint from filesystem
 *
 * @param sprintPath - Path to sprint markdown file (optional, defaults to active sprint)
 * @returns Parsed sprint graph or null if not found
 */
export async function loadSprint(sprintPath?: string): Promise<SprintGraph | null> {
  try {
    const filePath = sprintPath || await findActiveSprint();

    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return parseSprint(content);
  } catch (error) {
    console.error('Failed to load sprint:', (error as Error).message);
    return null;
  }
}

/**
 * Find active sprint file
 * Looks for SPRINT-*.md files in docs/sprints/
 *
 * @returns Path to active sprint or null
 */
async function findActiveSprint(): Promise<string | null> {
  try {
    const root = await findGitRoot();
    const sprintsDir = path.join(root, 'docs', 'sprints');

    if (!fs.existsSync(sprintsDir)) {
      return null;
    }

    const files = await fs.readdir(sprintsDir);
    const sprintFiles = files.filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'));

    if (sprintFiles.length === 0) {
      return null;
    }

    // For now, return most recent (last alphabetically)
    // TODO: Add explicit "active sprint" marker
    sprintFiles.sort();
    return path.join(sprintsDir, sprintFiles[sprintFiles.length - 1]);
  } catch (error) {
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
 * Parse sprint markdown into graph structure
 *
 * Extracts:
 * - Sprint metadata (name, goal, dates, progress)
 * - Tasks with status, effort, priority, files, ADRs
 * - Relationships (CONTAINS, NEXT_TASK)
 *
 * @param content - Raw sprint markdown content
 * @returns Structured sprint graph data
 */
export async function parseSprint(markdown: string): Promise<SprintGraph> {
  // Extract sprint ID and name from title
  // Pattern: # SPRINT: [name] (EPIC-XXX Sprint N)
  const titleMatch = markdown.match(/^#\s+SPRINT:\s+(.+?)\s+\(EPIC-(\d+)\s+Sprint\s+\d+\)/m);

  const sprintName = titleMatch ? titleMatch[1].trim() : 'Unknown Sprint';
  const epicId = titleMatch ? `EPIC-${titleMatch[2]}` : 'EPIC-001';

  // Generate sprint ID from name (kebab-case)
  const sprintId = `sprint_${sprintName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  // Extract sprint goal
  const goalMatch = markdown.match(/\*\*Sprint Goal\*\*:\s+(.+?)(?=\n)/);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  // Extract duration
  // Pattern: **Duration**: 2 weeks (YYYY-MM-DD to YYYY-MM-DD)
  const durationMatch = markdown.match(/\*\*Duration\*\*:\s+(.+?)\s+\((\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})\)/);
  const duration = durationMatch ? durationMatch[1].trim() : '';
  const startDate = durationMatch ? new Date(durationMatch[2]) : new Date();
  const endDate = durationMatch ? new Date(durationMatch[3]) : new Date();

  // Extract type
  const typeMatch = markdown.match(/\*\*Type\*\*:\s+(.+?)(?=\n)/);
  const type = typeMatch ? typeMatch[1].trim() : 'Unknown';

  // Extract success criteria
  const successCriteria = extractSuccessCriteria(markdown);

  // Extract progress
  // Pattern: **Progress:** 23% (5/22 tasks complete)
  const progressMatch = markdown.match(/\*\*Progress:\*\*\s+(\d+)%/);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  // Extract all tasks
  const tasks = extractTasks(markdown);

  // Build relationships
  const sprintContainsTasks = tasks.map(t => [sprintId, t.id]);

  // Find first incomplete task for NEXT_TASK relationship
  const nextTask = tasks.find(t => t.status !== 'complete');
  const sprintNextTask = nextTask ? nextTask.id : null;

  return {
    sprint: {
      id: sprintId,
      name: sprintName,
      goal,
      epicId,
      startDate,
      endDate,
      duration,
      type,
      successCriteria,
      progress,
    },
    tasks,
    relationships: {
      sprintContainsTasks,
      sprintNextTask,
    },
  };
}

/**
 * Extract success criteria bullets from Sprint Overview section
 */
function extractSuccessCriteria(markdown: string): string[] {
  const criteriaMatch = markdown.match(/\*\*Success Criteria:\*\*\s+([\s\S]*?)(?=\n\*\*Progress|\n---|\n##|$)/);

  if (!criteriaMatch) {
    return [];
  }

  const criteriaText = criteriaMatch[1];
  const bullets = criteriaText.match(/^-\s+(.+?)$/gm);

  if (!bullets) {
    return [];
  }

  return bullets.map(line => line.replace(/^-\s+/, '').trim());
}

/**
 * Extract all tasks from sprint markdown
 * Pattern: ### TASK-N: [title] (effort)
 */
function extractTasks(markdown: string): SprintGraph['tasks'] {
  const tasks: SprintGraph['tasks'] = [];

  // Split by task headers to get individual sections
  const sections = markdown.split(/(?=^### TASK-)/m);

  // Filter sections that start with "### TASK-"
  const taskSections = sections.filter(s => s.startsWith('### TASK-'));

  for (const taskContent of taskSections) {
    // Extract task header: ### TASK-N: [title] (effort)
    const headerMatch = taskContent.match(/^###\s+TASK-(\d+):\s+(.+?)\s+\((.+?)\)/);

    if (!headerMatch) {
      continue;
    }

    const taskNum = headerMatch[1];
    const title = headerMatch[2].trim();
    const effort = headerMatch[3].trim();
    const taskId = `TASK-${taskNum}`;

    // Extract status
    const statusMatch = taskContent.match(/\*\*Status:\*\*\s+(.+?)(?=\n)/);
    const statusText = statusMatch ? statusMatch[1].trim().toLowerCase() : 'not started';
    const status = normalizeStatus(statusText);

    // Extract priority
    const priorityMatch = taskContent.match(/\*\*Priority:\*\*\s+(.+?)(?=\n)/);
    const priority = priorityMatch ? priorityMatch[1].trim() : 'MEDIUM';

    // Extract owner
    const ownerMatch = taskContent.match(/\*\*Owner:\*\*\s+(.+?)(?=\n)/);
    const owner = ownerMatch ? ownerMatch[1].trim() : undefined;

    // Extract goal
    const goalMatch = taskContent.match(/\*\*Goal:\*\*\s+(.+?)(?=\n)/);
    const goal = goalMatch ? goalMatch[1].trim() : '';

    // Extract acceptance criteria
    const acceptanceCriteria = extractAcceptanceCriteria(taskContent);

    // Extract files
    const files = extractFiles(taskContent);

    // Extract related ADRs
    const relatedADRs = extractRelatedADRs(taskContent);

    tasks.push({
      id: taskId,
      title,
      status,
      effort,
      priority,
      owner,
      goal,
      acceptanceCriteria,
      files,
      relatedADRs,
    });
  }

  return tasks;
}

/**
 * Normalize status text to enum value
 */
function normalizeStatus(statusText: string): 'not_started' | 'in_progress' | 'complete' {
  const lower = statusText.toLowerCase();

  if (lower.includes('complete') || lower.includes('done')) {
    return 'complete';
  }

  if (lower.includes('progress') || lower.includes('working')) {
    return 'in_progress';
  }

  // "Not Started", "not started", "TBD", etc.
  return 'not_started';
}

/**
 * Extract acceptance criteria checkboxes
 * Pattern: - [ ] or - [x]
 */
function extractAcceptanceCriteria(taskContent: string): string[] {
  const criteriaSection = taskContent.match(/\*\*Acceptance Criteria:\*\*\s+([\s\S]*?)(?=\n\*\*Implementation|\n\*\*Files|\n---|\n##|$)/);

  if (!criteriaSection) {
    return [];
  }

  const checkboxes = criteriaSection[1].match(/^-\s+\[.\]\s+(.+?)$/gm);

  if (!checkboxes) {
    return [];
  }

  return checkboxes.map(line => {
    // Remove checkbox and cleanup
    return line.replace(/^-\s+\[.\]\s+/, '').trim();
  });
}

/**
 * Extract file paths from task content
 * Looks in **Files:** sections and code blocks
 */
function extractFiles(taskContent: string): string[] {
  const files = new Set<string>();

  // Pattern 1: **Files:** section with bullet list
  // Matches: "- Modify: `path/to/file.ts`" or "- Create: `path/to/file.ts`"
  const filesSection = taskContent.match(/\*\*Files:\*\*\s+([\s\S]*?)(?=\n---|\n##|$)/);
  if (filesSection) {
    const bullets = filesSection[1].match(/^-\s+(?:Modify|Create):\s+`(.+?)`/gm);
    if (bullets) {
      bullets.forEach(line => {
        const pathMatch = line.match(/`(.+?)`/);
        if (pathMatch) {
          files.add(pathMatch[1]);
        }
      });
    }
  }

  // Pattern 2: Inline file paths in implementation sections
  // Match: packages/*/src/**/*.ts patterns
  const inlinePathMatches = taskContent.matchAll(/`(packages\/[^`]+\.(?:ts|tsx|js|jsx))`/g);
  for (const match of inlinePathMatches) {
    files.add(match[1]);
  }

  // Pattern 3: Dashboard API routes
  const dashboardPathMatches = taskContent.matchAll(/`(dashboard\/src\/app\/api\/[^`]+\.ts)`/g);
  for (const match of dashboardPathMatches) {
    files.add(match[1]);
  }

  return Array.from(files).sort();
}

/**
 * Extract related ADR references
 * Pattern: ADR-XXX or [ADR-XXX]
 */
function extractRelatedADRs(taskContent: string): string[] {
  const adrs = new Set<string>();

  // Match ADR-XXX patterns
  const adrMatches = taskContent.matchAll(/ADR-(\d+)/g);
  for (const match of adrMatches) {
    adrs.add(`ADR-${match[1]}`);
  }

  return Array.from(adrs).sort();
}

/**
 * Sync sprint file to graph (full workflow)
 *
 * Steps:
 * 1. Read sprint markdown file
 * 2. Parse into SprintGraph structure
 * 3. Create/update Sprint node
 * 4. Create/update Task nodes
 * 5. Create relationships (CONTAINS, NEXT_TASK)
 * 6. Create Task→File relationships (MODIFIES)
 *
 * @param sprintFile - Path to sprint markdown file
 * @returns Promise resolving when sync complete
 */
export async function syncSprintToGraph(sprintFile: string): Promise<void> {
  try {
    // Read and parse sprint file
    const content = await fs.readFile(sprintFile, 'utf-8');
    const graph = await parseSprint(content);

    // TODO: Implement graph sync via Neo4j API
    // This will be implemented in TASK-2 once API endpoints are created
    //
    // await createSprintNode(graph.sprint);
    // await createTaskNodes(graph.tasks);
    // await createRelationships(graph.relationships);
    //
    // For now, return parsed graph structure
    console.log('Sprint parsed successfully:', {
      sprint: graph.sprint.id,
      taskCount: graph.tasks.length,
      nextTask: graph.relationships.sprintNextTask,
    });

    return Promise.resolve();
  } catch (error) {
    console.error('Failed to sync sprint to graph:', (error as Error).message);
    throw error;
  }
}
