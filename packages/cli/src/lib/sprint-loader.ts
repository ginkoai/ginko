/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-21
 * @tags: [sprint, task-checklist, epic-001, session-context]
 * @related: [charter-loader.ts, start-reflection.ts, context-loader-events.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Sprint Loader (EPIC-001 TASK-5)
 *
 * Loads active sprint from filesystem (docs/sprints/SPRINT-*.md)
 * and parses into task checklist with [@] symbol support.
 *
 * Provides AI partners with:
 * - Clear task progress ([ ] / [@] / [x] states)
 * - Current task identification (first [@] or [ ])
 * - Progress visibility (N/M complete, X in progress)
 * - Eliminates task priority ambiguity
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Task state enumeration
 * - todo: [ ] Not started
 * - in_progress: [@] Currently being worked on
 * - paused: [Z] Temporarily on hold (sleeping)
 * - complete: [x] Finished
 */
export type TaskState = 'todo' | 'in_progress' | 'paused' | 'complete';

/**
 * Acceptance criterion type - auto-detected from description (EPIC-004 Sprint 3)
 * - test: Unit tests, specs, test suites
 * - build: Compilation, build process
 * - lint: Linting, code style checks
 * - performance: Response time, latency metrics
 * - manual: Human review, approval
 * - custom: Other criteria with custom commands
 */
export type CriterionType = 'test' | 'build' | 'lint' | 'performance' | 'manual' | 'custom';

/**
 * Acceptance criterion for task verification (EPIC-004 Sprint 3)
 */
export interface AcceptanceCriterion {
  id: string;                    // e.g., "AC-1"
  description: string;           // Human-readable criterion
  type: CriterionType;           // Auto-detected type
  threshold?: number;            // For performance criteria (in ms)
  command?: string;              // For custom criteria
}

/**
 * Individual task from sprint checklist
 */
export interface Task {
  id: string;           // e.g., "TASK-5"
  title: string;        // Task description
  state: TaskState;     // [ ], [@], [Z], or [x]
  files?: string[];     // Files mentioned in task
  pattern?: string;     // Pattern reference (e.g., "log.ts:45-67")
  effort?: string;      // Time estimate (e.g., "4-6h")
  priority?: string;    // Priority level
  relatedADRs?: string[]; // ADR references (e.g., ["ADR-002", "ADR-043"]) - EPIC-002 Sprint 1
  relatedPatterns?: string[]; // Pattern references (e.g., ["retry-pattern", "event-queue"]) - EPIC-002 Sprint 2
  relatedGotchas?: string[]; // Gotcha warnings (e.g., ["timer-unref", "async-cleanup"]) - EPIC-002 Sprint 2
  acceptanceCriteria?: AcceptanceCriterion[]; // Verification criteria (EPIC-004 Sprint 3)
  dependsOn?: string[]; // Task dependencies (e.g., ["TASK-1", "TASK-2"]) - EPIC-004 Sprint 4
}

/**
 * Sprint checklist with task states and progress
 */
export interface SprintChecklist {
  name: string;                    // Sprint name
  file: string;                    // Sprint file path
  progress: {
    complete: number;              // Count of [x] tasks
    inProgress: number;            // Count of [@] tasks
    paused: number;                // Count of [Z] tasks
    todo: number;                  // Count of [ ] tasks
    total: number;                 // Total tasks
  };
  tasks: Task[];                   // All tasks in order
  currentTask?: Task;              // First [@] or first [ ] task
  recentCompletions: Task[];       // Last 3 completed tasks
  dependencyWarnings?: string[];   // Missing or circular dependency warnings - EPIC-004 Sprint 4
}

/**
 * Find git root directory
 */
async function findGitRoot(): Promise<string> {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return root;
  } catch {
    return process.cwd();
  }
}

/**
 * Parse YAML frontmatter from markdown content
 *
 * @param content - Markdown content with optional frontmatter
 * @returns Parsed frontmatter object or empty object
 */
function parseFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

/**
 * Find active sprint file
 *
 * Priority:
 * 1. Check CURRENT-SPRINT.md for "Between Sprints" status → return null
 * 2. Check CURRENT-SPRINT.md for sprint reference → return that file
 * 3. Fall back to scanning SPRINT-*.md files for first incomplete one
 *    - Respects frontmatter `status` field: active > not_started > (skip paused/complete)
 *
 * Valid status values:
 * - active: Currently being worked on
 * - not_started: Planned but not yet started
 * - paused: Temporarily on hold (skipped by auto-detection)
 * - complete: Finished (skipped by auto-detection)
 * - proposed: Not yet approved (skipped by auto-detection)
 * - abandoned: Cancelled (skipped by auto-detection)
 *
 * @param projectRoot - Project root directory
 * @returns Path to active sprint file or null (if between sprints)
 */
export async function findActiveSprint(projectRoot?: string): Promise<string | null> {
  try {
    const root = projectRoot || await findGitRoot();
    const sprintsDir = path.join(root, 'docs', 'sprints');

    if (!fs.existsSync(sprintsDir)) {
      return null;
    }

    // Check CURRENT-SPRINT.md first (source of truth)
    const currentSprintPath = path.join(sprintsDir, 'CURRENT-SPRINT.md');
    if (fs.existsSync(currentSprintPath)) {
      const currentContent = await fs.readFile(currentSprintPath, 'utf-8');

      // Check for "Between Sprints" or "No active sprint" status
      if (currentContent.includes('Between Sprints') ||
          currentContent.includes('No active sprint') ||
          currentContent.match(/\*\*Status\*\*:\s*Between Sprints/i)) {
        return null; // Explicitly between sprints
      }

      // Look for sprint reference: See: SPRINT-YYYY-MM-DD-name.md
      const sprintRefMatch = currentContent.match(/See:\s*(SPRINT-[\w-]+\.md)/i);
      if (sprintRefMatch) {
        const referencedPath = path.join(sprintsDir, sprintRefMatch[1]);
        if (fs.existsSync(referencedPath)) {
          // Validate referenced sprint isn't complete before returning
          const referencedContent = await fs.readFile(referencedPath, 'utf-8');
          const refFrontmatter = parseFrontmatter(referencedContent);
          const refStatus = refFrontmatter.status?.toLowerCase();

          // If referenced sprint is complete, don't return it - fall through to scanning
          if (refStatus !== 'complete') {
            // Also check progress percentage
            const refProgressMatch = referencedContent.match(/\*\*Progress:?\*\*:?\s*(\d+)%/);
            const refProgress = refProgressMatch ? parseInt(refProgressMatch[1]) : 0;
            if (refProgress < 100) {
              return referencedPath;
            }
          }
          // Fall through to scan for next active sprint
        }
      }

      // Look for **Last Completed**: SPRINT-XXX pattern (means between sprints)
      if (currentContent.match(/\*\*Last Completed\*\*:/)) {
        return null;
      }

      // NEW: Check if CURRENT-SPRINT.md contains actual sprint content
      // (not just a reference to another file)
      // This supports the pattern where CURRENT-SPRINT.md IS the sprint file
      const hasSprintContent = currentContent.includes('## Sprint Tasks') ||
                               currentContent.includes('### TASK-') ||
                               currentContent.match(/\*\*Sprint Goal\*\*:/);
      if (hasSprintContent) {
        return currentSprintPath;
      }
    }

    // Fall back: Get all sprint files sorted by date (newest first)
    const sprintFiles = (await fs.readdir(sprintsDir))
      .filter(f => f.startsWith('SPRINT-') && f.endsWith('.md') && f !== 'CURRENT-SPRINT.md')
      .sort()
      .reverse();

    // Two-pass approach:
    // Pass 1: Find sprints that are actively in progress (1-99% progress or [@] tasks)
    // Pass 2: Find sprints that haven't started yet (0% progress)
    // This ensures we resume in-progress work before starting new sprints

    interface SprintCandidate {
      file: string;
      progress: number;
      hasInProgress: boolean;
      frontmatterStatus?: string;
    }

    const candidates: SprintCandidate[] = [];

    // Status values that should be skipped during auto-detection
    const skipStatuses = ['paused', 'complete', 'proposed', 'abandoned'];

    for (const file of sprintFiles) {
      const filePath = path.join(sprintsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter for status field
      const frontmatter = parseFrontmatter(content);
      const frontmatterStatus = frontmatter.status?.toLowerCase();

      // Skip sprints with paused/complete/proposed/abandoned status in frontmatter
      if (frontmatterStatus && skipStatuses.includes(frontmatterStatus)) {
        continue;
      }

      // Check if sprint is marked complete
      // Note: Support both **Progress:** and **Progress**: formats
      const statusMatch = content.match(/\*\*Sprint Status:?\*\*:?\s*(.+)/);
      const progressMatch = content.match(/\*\*Progress:?\*\*:?\s*(\d+)%/);

      // Skip if explicitly marked complete or 100% progress
      if (statusMatch && statusMatch[1].toLowerCase().includes('complete') &&
          !statusMatch[1].includes('[@]')) {
        continue;
      }

      const progress = progressMatch ? parseInt(progressMatch[1]) : 0;
      if (progress === 100) {
        continue;
      }

      // Check for in-progress tasks ([@] markers)
      const hasInProgress = content.includes('[@]') || (progress > 0 && progress < 100);

      candidates.push({ file: filePath, progress, hasInProgress, frontmatterStatus });
    }

    // Prioritize by frontmatter status first, then by progress
    // Priority: active > in-progress work > not_started
    const activeSprints = candidates.filter(c => c.frontmatterStatus === 'active');
    if (activeSprints.length > 0) {
      // Return the active sprint with highest progress
      activeSprints.sort((a, b) => b.progress - a.progress);
      return activeSprints[0].file;
    }

    // Prioritize in-progress sprints over not-started ones
    const inProgressSprints = candidates.filter(c => c.hasInProgress);
    if (inProgressSprints.length > 0) {
      // Return the one with highest progress (closest to completion)
      inProgressSprints.sort((a, b) => b.progress - a.progress);
      return inProgressSprints[0].file;
    }

    // Fall back to first not-started sprint
    if (candidates.length > 0) {
      return candidates[0].file;
    }

    // No active sprint found
    return null;

  } catch (error) {
    console.error('Failed to find active sprint:', (error as Error).message);
    return null;
  }
}

/**
 * Parse task state from checkbox symbol
 *
 * @param symbol - Checkbox content: ' ', '@', 'Z', or 'x'
 * @returns Task state enum
 */
function parseTaskState(symbol: string): TaskState {
  const trimmed = symbol.trim();
  if (trimmed === 'x' || trimmed === 'X') return 'complete';
  if (trimmed === '@') return 'in_progress';
  if (trimmed === 'Z' || trimmed === 'z') return 'paused';
  return 'todo';
}

/**
 * Detect acceptance criterion type from description (EPIC-004 Sprint 3 TASK-1)
 *
 * Pattern matching based on keywords:
 * - test: "test", "spec", "unit", "integration"
 * - build: "build", "compile", "tsc"
 * - lint: "lint", "eslint", "prettier", "format"
 * - performance: "response", "latency", "ms", "seconds", "<", ">"
 * - manual: "review", "approve", "verify manually"
 * - custom: anything else
 *
 * @param description - Criterion description text
 * @returns Detected criterion type
 */
function detectCriterionType(description: string): CriterionType {
  const lower = description.toLowerCase();

  // Test criteria
  if (/\b(test|spec|unit|integration|e2e|coverage)\b/.test(lower)) {
    return 'test';
  }

  // Build criteria
  if (/\b(build|compile|tsc|typescript|compilation)\b/.test(lower)) {
    return 'build';
  }

  // Lint criteria
  if (/\b(lint|eslint|prettier|format|style)\b/.test(lower)) {
    return 'lint';
  }

  // Performance criteria (contains time thresholds)
  if (/\b(response|latency|performance|load\s+time)\b/.test(lower) ||
      /[<>]\s*\d+\s*(ms|seconds?|s\b)/.test(lower) ||
      /under\s+\d+\s*(ms|seconds?)/.test(lower)) {
    return 'performance';
  }

  // Manual criteria
  if (/\b(review|approve|manual|verify\s+manually|human)\b/.test(lower)) {
    return 'manual';
  }

  return 'custom';
}

/**
 * Parse performance threshold from description (EPIC-004 Sprint 3 TASK-1)
 *
 * Examples:
 * - "API response < 200ms" → 200
 * - "Load time under 3 seconds" → 3000
 * - "Latency below 50 ms" → 50
 *
 * @param description - Criterion description
 * @returns Threshold in milliseconds, or undefined if not found
 */
function parsePerformanceThreshold(description: string): number | undefined {
  // Match patterns like "< 200ms", "> 100ms", "under 3 seconds"
  const patterns = [
    /[<>]\s*(\d+)\s*ms\b/i,           // < 200ms, > 100ms
    /[<>]\s*(\d+)\s*seconds?\b/i,     // < 3 seconds
    /under\s+(\d+)\s*ms\b/i,          // under 200ms
    /under\s+(\d+)\s*seconds?\b/i,    // under 3 seconds
    /below\s+(\d+)\s*ms\b/i,          // below 200ms
    /below\s+(\d+)\s*seconds?\b/i,    // below 3 seconds
    /within\s+(\d+)\s*ms\b/i,         // within 200ms
    /within\s+(\d+)\s*seconds?\b/i,   // within 3 seconds
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      // Convert seconds to milliseconds if needed
      if (/seconds?/i.test(match[0])) {
        return value * 1000;
      }
      return value;
    }
  }

  return undefined;
}

/**
 * Parse acceptance criteria from task section (EPIC-004 Sprint 3 TASK-1)
 *
 * Looks for:
 * ```
 * **Acceptance:**
 * - [ ] Unit tests pass
 * - [ ] Build succeeds
 * ```
 *
 * @param lines - Lines from the task section
 * @param startIndex - Starting line index
 * @returns Array of parsed acceptance criteria
 */
function parseAcceptanceCriteria(lines: string[], startIndex: number): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  let criterionIndex = 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Stop at next section (### or **Heading:**)
    if (line.match(/^###\s+/) || (line.match(/^\*\*[A-Z]/) && !line.startsWith('**Acceptance'))) {
      break;
    }

    // Match criterion lines: - [ ] Description or - [x] Description
    const criterionMatch = line.match(/^-\s+\[[x\s]\]\s+(.+)/i);
    if (criterionMatch) {
      const description = criterionMatch[1].trim();
      const type = detectCriterionType(description);

      const criterion: AcceptanceCriterion = {
        id: `AC-${criterionIndex}`,
        description,
        type,
      };

      // Add threshold for performance criteria
      if (type === 'performance') {
        const threshold = parsePerformanceThreshold(description);
        if (threshold !== undefined) {
          criterion.threshold = threshold;
        }
      }

      criteria.push(criterion);
      criterionIndex++;
    }
  }

  return criteria;
}

/**
 * Parse sprint markdown into task checklist
 *
 * Looks for:
 * - Sprint name from title (# SPRINT: ...)
 * - Tasks from ## Sprint Tasks or ### TASK-N sections
 * - Checkbox states: [ ], [@], [Z], [x]
 * - Task metadata (files, priority, effort)
 *
 * @param markdown - Sprint markdown content
 * @param filePath - Path to sprint file
 * @returns Parsed sprint checklist
 */
export function parseSprintChecklist(markdown: string, filePath: string): SprintChecklist {
  const lines = markdown.split('\n');
  const tasks: Task[] = [];

  // Extract sprint name from title
  const titleMatch = markdown.match(/^#\s+SPRINT:\s*(.+?)$/m);
  const sprintName = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');

  let parsingTask: Partial<Task> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task headers: ### TASK-N: Title
    const taskHeaderMatch = line.match(/^###\s+(TASK-\d+):\s*(.+?)(?:\s*\((.+?)\))?$/);
    if (taskHeaderMatch) {
      // Save previous task if exists
      if (parsingTask?.id && parsingTask?.title) {
        tasks.push(parsingTask as Task);
      }

      // Start new task
      parsingTask = {
        id: taskHeaderMatch[1],
        title: taskHeaderMatch[2].trim(),
        effort: taskHeaderMatch[3]?.trim(),
        state: 'todo', // Default, will update from Status line
        files: [],
      };
      continue;
    }

    // Match task status: **Status:** [@] In Progress
    const statusMatch = line.match(/\*\*Status:\*\*\s*\[([x@\s])\]\s*(.+)/i);
    if (statusMatch && parsingTask) {
      parsingTask.state = parseTaskState(statusMatch[1]);
      continue;
    }

    // Match task priority: **Priority:** HIGH
    const priorityMatch = line.match(/\*\*Priority:\*\*\s*(.+)/i);
    if (priorityMatch && parsingTask) {
      parsingTask.priority = priorityMatch[1].trim();
      continue;
    }

    // Match task dependencies: **Depends:** TASK-1, TASK-2 (EPIC-004 Sprint 4)
    const dependsMatch = line.match(/\*\*Depends:\*\*\s*(.+)/i);
    if (dependsMatch && parsingTask) {
      const depsString = dependsMatch[1].trim();
      // Parse comma-separated task IDs
      const deps = depsString.split(/[,\s]+/)
        .map(d => d.trim())
        .filter(d => /^TASK-\d+$/i.test(d))
        .map(d => d.toUpperCase());
      if (deps.length > 0) {
        parsingTask.dependsOn = deps;
      }
      continue;
    }

    // Match files section
    if (line.match(/^\*\*Files:\*\*/) && parsingTask) {
      // Look ahead for file list
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^-\s+(Create|Modify):/)) {
        const fileMatch = lines[j].match(/^-\s+(?:Create|Modify):\s+`([^`]+)`/);
        if (fileMatch) {
          parsingTask.files = parsingTask.files || [];
          parsingTask.files.push(fileMatch[1]);
        }
        j++;
      }
      continue;
    }

    // Match acceptance criteria section (EPIC-004 Sprint 3 TASK-1)
    if (line.match(/^\*\*Acceptance:\*\*/) && parsingTask) {
      const criteria = parseAcceptanceCriteria(lines, i + 1);
      if (criteria.length > 0) {
        parsingTask.acceptanceCriteria = criteria;
      }
      continue;
    }

    // Extract ADR references from any line in task section (EPIC-002 Sprint 1)
    if (parsingTask) {
      const adrMatches = line.matchAll(/ADR-(\d+)/gi);
      for (const match of adrMatches) {
        const adrId = `ADR-${match[1].padStart(3, '0')}`;
        parsingTask.relatedADRs = parsingTask.relatedADRs || [];
        if (!parsingTask.relatedADRs.includes(adrId)) {
          parsingTask.relatedADRs.push(adrId);
        }
      }

      // Extract pattern references from any line in task section (EPIC-002 Sprint 2)
      // Patterns can be referenced as:
      // - "Use pattern from file.ts" or "pattern in file.ts"
      // - "See file.ts for example"
      // - Explicit pattern names like "retry-pattern", "event-queue-pattern"
      const patternFromFileMatches = line.matchAll(/(?:use|apply|see|follow)\s+(?:the\s+)?(?:pattern|example)\s+(?:from|in)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"]?/gi);
      for (const match of patternFromFileMatches) {
        const patternId = match[1];
        parsingTask.relatedPatterns = parsingTask.relatedPatterns || [];
        if (!parsingTask.relatedPatterns.includes(patternId)) {
          parsingTask.relatedPatterns.push(patternId);
        }
      }

      // Match explicit pattern names (kebab-case with -pattern suffix)
      const explicitPatternMatches = line.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-pattern)\b/gi);
      for (const match of explicitPatternMatches) {
        const patternId = match[1].toLowerCase();
        parsingTask.relatedPatterns = parsingTask.relatedPatterns || [];
        if (!parsingTask.relatedPatterns.includes(patternId)) {
          parsingTask.relatedPatterns.push(patternId);
        }
      }

      // Extract gotcha references from any line in task section (EPIC-002 Sprint 2)
      // Priority: explicit kebab-case gotcha names like "timer-gotcha", "async-gotcha"
      const explicitGotchaMatches = line.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha)\b/gi);
      for (const match of explicitGotchaMatches) {
        const gotchaId = match[1].toLowerCase();
        parsingTask.relatedGotchas = parsingTask.relatedGotchas || [];
        if (!parsingTask.relatedGotchas.includes(gotchaId)) {
          parsingTask.relatedGotchas.push(gotchaId);
        }
      }

      // Fallback: extract from warning phrases only if no explicit gotcha found on this line
      // - "Avoid gotcha: timer keeps process alive"
      // - "Watch out for X"
      // - "Beware of Y"
      if (!line.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha/i)) {
        const gotchaWarningMatches = line.matchAll(/(?:avoid|watch out for|beware of|gotcha:)\s+[`"]?([^`".\n]+)[`"]?/gi);
        for (const match of gotchaWarningMatches) {
          // Skip if the phrase contains "gotcha" - it's likely referring to an explicit gotcha
          if (match[1].toLowerCase().includes('gotcha')) continue;
          const gotchaId = match[1].trim().toLowerCase().replace(/\s+/g, '-');
          // Only add if reasonably short (likely a gotcha name, not a sentence)
          if (gotchaId.length <= 40) {
            parsingTask.relatedGotchas = parsingTask.relatedGotchas || [];
            if (!parsingTask.relatedGotchas.includes(gotchaId)) {
              parsingTask.relatedGotchas.push(gotchaId);
            }
          }
        }
      }
    }
  }

  // Save last task
  if (parsingTask?.id && parsingTask?.title) {
    tasks.push(parsingTask as Task);
  }

  // Calculate progress
  const complete = tasks.filter(t => t.state === 'complete').length;
  const inProgress = tasks.filter(t => t.state === 'in_progress').length;
  const paused = tasks.filter(t => t.state === 'paused').length;
  const todo = tasks.filter(t => t.state === 'todo').length;

  // Find current task: first [@], or first [ ] if no [@] exists
  const firstInProgress = tasks.find(t => t.state === 'in_progress');
  const firstTodo = tasks.find(t => t.state === 'todo');
  const currentTask = firstInProgress || firstTodo;

  // Recent completions: last 3 completed tasks
  const completedTasks = tasks.filter(t => t.state === 'complete');
  const recentCompletions = completedTasks.slice(-3).reverse();

  // Validate dependencies (EPIC-004 Sprint 4)
  const dependencyWarnings: string[] = [];
  const taskIds = new Set(tasks.map(t => t.id));

  // Check for missing dependencies
  for (const task of tasks) {
    if (task.dependsOn) {
      for (const depId of task.dependsOn) {
        if (!taskIds.has(depId)) {
          dependencyWarnings.push(`${task.id} depends on non-existent task: ${depId}`);
        }
      }
    }
  }

  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(taskId: string, path: string[]): string[] | null {
    if (inStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      return [...path.slice(cycleStart), taskId];
    }
    if (visited.has(taskId)) return null;

    visited.add(taskId);
    inStack.add(taskId);
    path.push(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (task?.dependsOn) {
      for (const depId of task.dependsOn) {
        if (taskIds.has(depId)) {
          const cycle = detectCycle(depId, path);
          if (cycle) return cycle;
        }
      }
    }

    path.pop();
    inStack.delete(taskId);
    return null;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      const cycle = detectCycle(task.id, []);
      if (cycle) {
        dependencyWarnings.push(`Circular dependency: ${cycle.join(' → ')}`);
        break; // Only report first cycle
      }
    }
  }

  return {
    name: sprintName,
    file: filePath,
    progress: {
      complete,
      inProgress,
      paused,
      todo,
      total: tasks.length,
    },
    tasks,
    currentTask,
    recentCompletions,
    dependencyWarnings: dependencyWarnings.length > 0 ? dependencyWarnings : undefined,
  };
}

/**
 * Load active sprint checklist
 *
 * Finds active sprint file and parses into structured checklist
 *
 * @param projectRoot - Project root directory (defaults to git root)
 * @returns Parsed sprint checklist or null if no sprint found
 */
export async function loadSprintChecklist(projectRoot?: string): Promise<SprintChecklist | null> {
  try {
    const sprintFile = await findActiveSprint(projectRoot);

    if (!sprintFile) {
      return null;
    }

    const content = await fs.readFile(sprintFile, 'utf-8');
    return parseSprintChecklist(content, sprintFile);

  } catch (error) {
    console.error('Failed to load sprint checklist:', (error as Error).message);
    return null;
  }
}

/**
 * Format sprint checklist for display in ginko start
 *
 * @param checklist - Parsed sprint checklist
 * @param maxTasks - Maximum tasks to display before truncating
 * @returns Formatted string for terminal display
 */
export function formatSprintChecklist(checklist: SprintChecklist, maxTasks: number = 7): string {
  const { name, progress, tasks, currentTask } = checklist;

  let output = '';

  // Header with progress
  output += `📋 Active Sprint: ${name}\n`;

  const progressPercent = progress.total > 0
    ? Math.round((progress.complete / progress.total) * 100)
    : 0;

  let progressLine = `Progress: ${progress.complete}/${progress.total} complete`;
  if (progress.inProgress > 0) {
    progressLine += `, ${progress.inProgress} in progress`;
  }
  if (progress.paused > 0) {
    progressLine += `, ${progress.paused} paused`;
  }
  progressLine += ` (${progressPercent}%)`;
  output += progressLine + '\n\n';

  // Sprint complete celebration
  if (progress.complete === progress.total && progress.total > 0) {
    output += '🎉 Sprint Complete! All tasks done.\n';
    return output;
  }

  // Task list
  output += 'Tasks:\n';
  const displayTasks = tasks.slice(0, maxTasks);

  for (const task of displayTasks) {
    const symbol = task.state === 'complete' ? '[x]' :
                   task.state === 'in_progress' ? '[@]' :
                   task.state === 'paused' ? '[Z]' : '[ ]';

    const marker = currentTask && task.id === currentTask.id ? ' ← RESUME HERE' : '';

    output += `  ${symbol} ${task.id}: ${task.title}${marker}\n`;
  }

  // Truncation indicator
  if (tasks.length > maxTasks) {
    const remaining = tasks.length - maxTasks;
    output += `  ... (${remaining} more tasks)\n`;
  }

  // Multiple in-progress warning
  if (progress.inProgress > 1) {
    const inProgressTasks = tasks.filter(t => t.state === 'in_progress');
    output += `\n⚠️  Multiple tasks in progress (${progress.inProgress})\n`;
    output += `Primary: ${inProgressTasks[0].id}\n`;
    output += `Also active: ${inProgressTasks.slice(1).map(t => t.id).join(', ')}\n`;
  }

  return output;
}

/**
 * Format current task details for display
 *
 * @param task - Current task
 * @returns Formatted task details
 */
export function formatCurrentTaskDetails(task: Task): string {
  let output = `🎯 Current Task (${task.id}):\n`;
  output += `  Status: ${task.state === 'in_progress' ? 'In progress' : 'Ready to start'}\n`;

  if (task.files && task.files.length > 0) {
    output += `  Files: ${task.files.slice(0, 3).join(', ')}`;
    if (task.files.length > 3) {
      output += ` (+${task.files.length - 3} more)`;
    }
    output += '\n';
  }

  if (task.pattern) {
    output += `  Pattern: ${task.pattern}\n`;
  }

  if (task.priority) {
    output += `  Priority: ${task.priority}\n`;
  }

  if (task.effort) {
    output += `  Effort: ${task.effort}\n`;
  }

  // EPIC-002 Sprint 3: Show pattern guidance (TASK-1)
  if (task.relatedPatterns && task.relatedPatterns.length > 0) {
    output += `  Apply: ${task.relatedPatterns.join(', ')}\n`;
  }

  // EPIC-002 Sprint 3: Show gotcha warnings (TASK-1)
  if (task.relatedGotchas && task.relatedGotchas.length > 0) {
    output += `  Avoid: ${task.relatedGotchas.join(', ')}\n`;
  }

  return output;
}
