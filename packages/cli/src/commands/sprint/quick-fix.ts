/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-26
 * @tags: [sprint, quick-fix, single-task, epic-016-s04]
 * @related: [index.ts, create.ts, ../../lib/planning-menu.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, ora]
 */

/**
 * Quick-Fix Fast Path (EPIC-016 Sprint 4 t04)
 *
 * Minimal friction path for single-task work:
 * 1. User describes the fix in one line
 * 2. Creates a 1-task sprint automatically
 * 3. Auto-assigns and auto-starts the task
 *
 * Two interactions max: describe → working
 */

import chalk from 'chalk';
import ora from 'ora';
import { getUserEmail } from '../../utils/helpers.js';
import { GraphApiClient } from '../graph/api-client.js';
import { getGraphId, isGraphInitialized } from '../graph/config.js';
import {
  setUserCurrentSprint,
  createAssignmentFromSprintId
} from '../../lib/user-sprint.js';

// =============================================================================
// Types
// =============================================================================

export interface QuickFixResult {
  success: boolean;
  taskId?: string;
  sprintId?: string;
  message?: string;
}

// =============================================================================
// Sprint ID Generation
// =============================================================================

/**
 * Generate the next ad-hoc sprint ID for today
 * Format: adhoc_{YYMMDD}_s{NN}
 */
async function generateNextAdhocSprintId(graphId: string): Promise<string> {
  const today = new Date();
  const dateStr = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const client = new GraphApiClient();

  try {
    const response = await client.request<{ sprints: Array<{ id: string }> }>(
      'GET',
      `/api/v1/sprint/list?graphId=${encodeURIComponent(graphId)}&prefix=adhoc_${dateStr}`
    );

    const todayPrefix = `adhoc_${dateStr}_s`;
    const existingNumbers = (response.sprints || [])
      .map(s => s.id)
      .filter(id => id.startsWith(todayPrefix))
      .map(id => parseInt(id.replace(todayPrefix, ''), 10))
      .filter(n => !isNaN(n));

    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `adhoc_${dateStr}_s${String(nextNum).padStart(2, '0')}`;
  } catch {
    return `adhoc_${dateStr}_s01`;
  }
}

// =============================================================================
// Sprint Markdown Generation
// =============================================================================

/**
 * Generate minimal sprint markdown for a single task
 */
function generateQuickFixMarkdown(
  sprintId: string,
  taskId: string,
  description: string,
  userEmail: string
): string {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return `# SPRINT: Quick Fix - ${description.slice(0, 40)}

## Sprint Overview

**Sprint Goal**: ${description}
**Duration**: ${formatDate(today)} (1 task)
**Type**: Bugfix
**Progress:** 0% (0/1 tasks complete)
**ID:** \`${sprintId}\`

**Success Criteria:**
- Fix implemented and verified

---

## Sprint Tasks

### ${taskId}: ${description} (1h)
**Status:** [@] In Progress
**Priority:** HIGH
**Owner:** ${userEmail}

**Goal:** ${description}

**Acceptance Criteria:**
- [ ] Fix implemented
- [ ] Verified working

---

## Related Documents

- **Epic**: Ad-Hoc Work

---

**Sprint Status**: Active
**Start Date**: ${formatDate(today)}
**Created By**: ${userEmail}
`;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Create a quick-fix task with minimal ceremony
 *
 * @param description - One-line description of the fix
 * @returns Result with task and sprint IDs
 */
export async function createQuickFixTask(
  description: string
): Promise<QuickFixResult> {
  // 1. Check prerequisites
  if (!await isGraphInitialized()) {
    return { success: false, message: 'Graph not initialized' };
  }

  const graphId = await getGraphId();
  if (!graphId) {
    return { success: false, message: 'No graph ID found' };
  }

  if (!description || description.trim().length < 5) {
    return { success: false, message: 'Description too short' };
  }

  const spinner = ora('Creating quick-fix task...').start();

  try {
    // 2. Generate IDs
    const sprintId = await generateNextAdhocSprintId(graphId);
    const taskId = `${sprintId}_t01`;
    const userEmail = await getUserEmail();

    // 3. Generate markdown
    const markdown = generateQuickFixMarkdown(sprintId, taskId, description.trim(), userEmail);

    // 4. Sync to graph
    const client = new GraphApiClient();
    await client.request<{ sprint: { id: string } }>(
      'POST',
      '/api/v1/sprint/sync',
      { graphId, sprintContent: markdown }
    );

    // 5. Auto-assign sprint
    await setUserCurrentSprint(createAssignmentFromSprintId(sprintId, `Quick Fix: ${description.slice(0, 30)}`));

    // 6. Start the task
    try {
      await client.updateTaskStatus(graphId, taskId, 'in_progress');
    } catch {
      // Non-critical
    }

    spinner.succeed('Quick-fix task created');

    return {
      success: true,
      taskId,
      sprintId,
      message: 'Quick-fix task created and started'
    };
  } catch (error) {
    spinner.fail('Failed to create quick-fix task');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for CLI registration
export default createQuickFixTask;
