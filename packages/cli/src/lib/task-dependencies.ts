/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [task, dependencies, topological-sort, orchestration, epic-004, sprint-4]
 * @related: [sprint-loader.ts, ../commands/orchestrate.ts, ../commands/sprint/deps.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Task Dependencies (EPIC-004 Sprint 4 TASK-6)
 *
 * Provides topological ordering and dependency management for tasks:
 * - Compute execution order in waves (parallel execution within waves)
 * - Detect circular dependencies
 * - Find available tasks (dependencies satisfied)
 * - Validate dependency graph
 */

/**
 * Task with dependency information
 */
export interface Task {
  id: string;
  dependsOn: string[];
  status?: 'pending' | 'in_progress' | 'complete' | 'blocked';
  title?: string;
  effort?: string;
  priority?: number;
}

/**
 * Group of tasks that can execute in parallel
 */
export interface ExecutionWave {
  wave: number;
  tasks: Task[];
}

/**
 * Dependency validation error
 */
export interface DependencyError {
  type: 'missing' | 'self_reference' | 'circular';
  taskId: string;
  details: string;
}

/**
 * Dependency graph statistics
 */
export interface DependencyStats {
  totalTasks: number;
  tasksWithDeps: number;
  tasksWithoutDeps: number;
  maxDepth: number;
  avgDepsPerTask: number;
}

/**
 * Detect circular dependencies using three-color DFS
 *
 * Colors:
 * - white (0): Not visited
 * - gray (1): Currently in recursion stack (visiting)
 * - black (2): Fully processed
 *
 * A back edge to a gray node indicates a cycle.
 *
 * @param tasks - Array of tasks with dependencies
 * @returns Array of cycles found, e.g., [['TASK-1', 'TASK-2', 'TASK-1']]
 */
export function detectCircularDependencies(tasks: Task[]): string[][] {
  const cycles: string[][] = [];
  const taskMap = new Map<string, Task>();
  const color = new Map<string, number>(); // 0=white, 1=gray, 2=black

  // Build task map
  for (const task of tasks) {
    taskMap.set(task.id, task);
    color.set(task.id, 0); // white
  }

  function dfs(taskId: string, path: string[]): boolean {
    const task = taskMap.get(taskId);
    if (!task) return false;

    color.set(taskId, 1); // gray - visiting
    path.push(taskId);

    for (const depId of task.dependsOn) {
      const depColor = color.get(depId);

      if (depColor === 1) {
        // Back edge found - cycle detected
        const cycleStart = path.indexOf(depId);
        const cycle = [...path.slice(cycleStart), depId];
        cycles.push(cycle);
        return true;
      }

      if (depColor === 0) {
        // White node - recurse
        dfs(depId, path);
      }
      // Black nodes are fully processed, skip
    }

    path.pop();
    color.set(taskId, 2); // black - done
    return false;
  }

  // Run DFS from each unvisited node
  for (const task of tasks) {
    if (color.get(task.id) === 0) {
      dfs(task.id, []);
    }
  }

  return cycles;
}

/**
 * Validate dependencies for common errors
 *
 * Checks for:
 * - Self-referential dependencies (TASK-1 depends on TASK-1)
 * - Missing dependencies (depends on non-existent task)
 *
 * @param tasks - Array of tasks with dependencies
 * @returns Array of validation errors
 */
export function validateDependencies(tasks: Task[]): DependencyError[] {
  const errors: DependencyError[] = [];
  const taskIds = new Set(tasks.map(t => t.id));

  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      // Self-reference check
      if (depId === task.id) {
        errors.push({
          type: 'self_reference',
          taskId: task.id,
          details: `Task ${task.id} depends on itself`,
        });
        continue;
      }

      // Missing dependency check
      if (!taskIds.has(depId)) {
        errors.push({
          type: 'missing',
          taskId: task.id,
          details: `Task ${task.id} depends on non-existent task ${depId}`,
        });
      }
    }
  }

  // Also check for circular dependencies
  const cycles = detectCircularDependencies(tasks);
  for (const cycle of cycles) {
    errors.push({
      type: 'circular',
      taskId: cycle[0],
      details: `Circular dependency: ${cycle.join(' → ')}`,
    });
  }

  return errors;
}

/**
 * Compute execution order using modified Kahn's algorithm
 *
 * Groups tasks into waves where:
 * - Wave 1: Tasks with no dependencies
 * - Wave N: Tasks that depend only on tasks in waves 1..N-1
 *
 * Tasks within a wave can execute in parallel.
 *
 * @param tasks - Array of tasks with dependencies
 * @returns Array of execution waves
 * @throws Error if circular dependencies detected
 */
export function getExecutionOrder(tasks: Task[]): ExecutionWave[] {
  if (tasks.length === 0) {
    return [];
  }

  // Validate first
  const errors = validateDependencies(tasks);
  const circularErrors = errors.filter(e => e.type === 'circular');
  if (circularErrors.length > 0) {
    throw new Error(`Cannot compute execution order: ${circularErrors[0].details}`);
  }

  const taskMap = new Map<string, Task>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // task -> tasks that depend on it

  // Initialize
  for (const task of tasks) {
    taskMap.set(task.id, task);
    inDegree.set(task.id, 0);
    dependents.set(task.id, []);
  }

  // Build in-degree and dependents
  for (const task of tasks) {
    let validDeps = 0;
    for (const depId of task.dependsOn) {
      if (taskMap.has(depId)) {
        validDeps++;
        dependents.get(depId)!.push(task.id);
      }
      // Skip missing dependencies (already warned in validation)
    }
    inDegree.set(task.id, validDeps);
  }

  const waves: ExecutionWave[] = [];
  const processed = new Set<string>();

  // Process waves until all tasks are assigned
  while (processed.size < tasks.length) {
    // Find all tasks with in-degree 0 that haven't been processed
    const waveTasks: Task[] = [];

    for (const task of tasks) {
      if (!processed.has(task.id) && inDegree.get(task.id) === 0) {
        waveTasks.push(task);
      }
    }

    if (waveTasks.length === 0) {
      // This shouldn't happen if validation passed, but safety check
      const remaining = tasks.filter(t => !processed.has(t.id));
      throw new Error(`Cannot assign remaining tasks to waves: ${remaining.map(t => t.id).join(', ')}`);
    }

    // Add wave
    waves.push({
      wave: waves.length + 1,
      tasks: waveTasks,
    });

    // Mark as processed and update in-degrees
    for (const task of waveTasks) {
      processed.add(task.id);

      // Decrement in-degree of all dependents
      for (const depId of dependents.get(task.id)!) {
        const currentDegree = inDegree.get(depId)!;
        inDegree.set(depId, currentDegree - 1);
      }
    }
  }

  return waves;
}

/**
 * Get tasks that are ready to execute
 *
 * A task is available if:
 * - Status is 'pending' or undefined
 * - All dependencies have status 'complete'
 *
 * @param tasks - Array of tasks with dependencies and status
 * @returns Tasks ready for execution
 */
export function getAvailableTasks(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  return tasks.filter(task => {
    // Must be pending (not started, not complete, not blocked)
    const status = task.status || 'pending';
    if (status !== 'pending') {
      return false;
    }

    // All dependencies must be complete
    for (const depId of task.dependsOn) {
      const dep = taskMap.get(depId);
      if (!dep || dep.status !== 'complete') {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get tasks that are blocked (have incomplete dependencies)
 *
 * @param tasks - Array of tasks with dependencies and status
 * @returns Tasks that cannot start due to incomplete dependencies
 */
export function getBlockedTasks(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  return tasks.filter(task => {
    const status = task.status || 'pending';
    if (status !== 'pending') {
      return false;
    }

    // Check if any dependency is incomplete
    for (const depId of task.dependsOn) {
      const dep = taskMap.get(depId);
      if (!dep || dep.status !== 'complete') {
        return true; // Blocked
      }
    }

    return false; // All deps complete, not blocked
  });
}

/**
 * Compute dependency graph statistics
 *
 * @param tasks - Array of tasks with dependencies
 * @returns Statistics about the dependency graph
 */
export function getDependencyStats(tasks: Task[]): DependencyStats {
  if (tasks.length === 0) {
    return {
      totalTasks: 0,
      tasksWithDeps: 0,
      tasksWithoutDeps: 0,
      maxDepth: 0,
      avgDepsPerTask: 0,
    };
  }

  const tasksWithDeps = tasks.filter(t => t.dependsOn.length > 0).length;
  const totalDeps = tasks.reduce((sum, t) => sum + t.dependsOn.length, 0);

  // Compute max depth (longest path in DAG)
  let maxDepth = 0;
  try {
    const waves = getExecutionOrder(tasks);
    maxDepth = waves.length;
  } catch {
    // Circular dependency - can't compute depth
    maxDepth = -1;
  }

  return {
    totalTasks: tasks.length,
    tasksWithDeps,
    tasksWithoutDeps: tasks.length - tasksWithDeps,
    maxDepth,
    avgDepsPerTask: totalDeps / tasks.length,
  };
}

/**
 * Build reverse dependency map (who depends on this task)
 *
 * @param tasks - Array of tasks with dependencies
 * @returns Map from task ID to array of dependent task IDs
 */
export function buildReverseDependencyMap(tasks: Task[]): Map<string, string[]> {
  const reverseMap = new Map<string, string[]>();

  // Initialize all tasks
  for (const task of tasks) {
    reverseMap.set(task.id, []);
  }

  // Build reverse relationships
  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      const dependents = reverseMap.get(depId);
      if (dependents) {
        dependents.push(task.id);
      }
    }
  }

  return reverseMap;
}

/**
 * Get all downstream tasks (tasks that transitively depend on this task)
 *
 * @param taskId - Starting task ID
 * @param tasks - Array of tasks with dependencies
 * @returns Array of downstream task IDs
 */
export function getDownstreamTasks(taskId: string, tasks: Task[]): string[] {
  const reverseMap = buildReverseDependencyMap(tasks);
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(id: string) {
    const dependents = reverseMap.get(id) || [];
    for (const depId of dependents) {
      if (!visited.has(depId)) {
        visited.add(depId);
        result.push(depId);
        dfs(depId);
      }
    }
  }

  dfs(taskId);
  return result;
}

/**
 * Get all upstream tasks (tasks that this task transitively depends on)
 *
 * @param taskId - Starting task ID
 * @param tasks - Array of tasks with dependencies
 * @returns Array of upstream task IDs
 */
export function getUpstreamTasks(taskId: string, tasks: Task[]): string[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(id: string) {
    const task = taskMap.get(id);
    if (!task) return;

    for (const depId of task.dependsOn) {
      if (!visited.has(depId)) {
        visited.add(depId);
        result.push(depId);
        dfs(depId);
      }
    }
  }

  dfs(taskId);
  return result;
}
