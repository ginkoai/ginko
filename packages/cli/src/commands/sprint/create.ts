/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-26
 * @tags: [sprint, create, conversational, ai, epic-016-s04]
 * @related: [index.ts, quick-fix.ts, ../../lib/planning-menu.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [prompts, chalk, ora, ai-service]
 */

/**
 * Conversational Sprint Creation (EPIC-016 Sprint 4 t03)
 *
 * Lightweight flow for creating feature sprints:
 * 1. User describes what they're building
 * 2. AI breaks down into tasks
 * 3. User confirms or edits
 * 4. Sprint created and assigned
 */

import prompts from 'prompts';
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

interface TaskBreakdown {
  title: string;
  estimate: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface SprintPlan {
  name: string;
  goal: string;
  tasks: TaskBreakdown[];
}

export interface CreateSprintResult {
  success: boolean;
  sprintId?: string;
  taskCount?: number;
  message?: string;
}

interface CreateSprintOptions {
  adhoc?: boolean;
  epic?: string;
  description?: string;
  yes?: boolean;
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
    // Query existing sprints to find next sequence number
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
    // Fallback to s01 if query fails
    return `adhoc_${dateStr}_s01`;
  }
}

// =============================================================================
// AI Task Breakdown
// =============================================================================

/**
 * Use AI to break down a feature description into tasks
 */
async function breakdownFeatureWithAI(description: string): Promise<SprintPlan | null> {
  try {
    const { createAIService } = await import('../../services/ai-service.js');
    const aiService = createAIService();

    const prompt = `You are a software project manager. Given a feature description, break it down into 2-6 actionable tasks.

Feature: ${description}

Return JSON with this structure:
{
  "name": "Sprint name (3-5 words, no quotes)",
  "goal": "One sentence describing the sprint goal",
  "tasks": [
    { "title": "Task title (action-oriented)", "estimate": "2h", "priority": "HIGH" }
  ]
}

Guidelines:
- Sprint name should be concise and descriptive
- Each task should be completable in 1-4 hours
- Use CRITICAL/HIGH/MEDIUM/LOW for priority
- First task should enable the core feature
- Include a testing/validation task
- Estimates should be realistic (1h, 2h, 3h, 4h)`;

    const plan = await aiService.extractJSON<SprintPlan>(prompt);
    return plan;
  } catch (error) {
    console.error(chalk.dim('AI breakdown failed, using simple structure'));
    return null;
  }
}

/**
 * Create a simple sprint plan without AI
 */
function createSimpleSprintPlan(description: string): SprintPlan {
  return {
    name: description.slice(0, 50),
    goal: description,
    tasks: [
      { title: 'Implement core functionality', estimate: '2h', priority: 'HIGH' },
      { title: 'Test and validate', estimate: '1h', priority: 'MEDIUM' },
    ]
  };
}

// =============================================================================
// Sprint Markdown Generation
// =============================================================================

/**
 * Generate sprint markdown compatible with sync API
 */
function generateSprintMarkdown(
  sprintId: string,
  plan: SprintPlan,
  userEmail: string
): string {
  const today = new Date();
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  let markdown = `# SPRINT: ${plan.name}

## Sprint Overview

**Sprint Goal**: ${plan.goal}
**Duration**: ${formatDate(today)} to ${formatDate(endDate)}
**Type**: Feature
**Progress:** 0% (0/${plan.tasks.length} tasks complete)
**ID:** \`${sprintId}\`

**Success Criteria:**
- Feature implemented and tested
- Code reviewed and merged

---

## Sprint Tasks

`;

  plan.tasks.forEach((task, i) => {
    const taskNum = String(i + 1).padStart(2, '0');
    const taskId = `${sprintId}_t${taskNum}`;

    markdown += `### ${taskId}: ${task.title} (${task.estimate})
**Status:** [ ] Not Started
**Priority:** ${task.priority}
**Owner:** ${userEmail}

**Goal:** ${task.title}

**Acceptance Criteria:**
- [ ] Implementation complete
- [ ] Tests passing

---

`;
  });

  markdown += `## Related Documents

- **Epic**: Ad-Hoc Work

---

**Sprint Status**: Active
**Start Date**: ${formatDate(today)}
**Created By**: ${userEmail}
`;

  return markdown;
}

// =============================================================================
// Main Command
// =============================================================================

/**
 * Create a new feature sprint (conversational flow)
 */
export async function createSprintCommand(
  options: CreateSprintOptions = {}
): Promise<CreateSprintResult> {
  // 1. Check prerequisites
  if (!await isGraphInitialized()) {
    console.log(chalk.yellow('Graph not initialized.'));
    console.log(chalk.dim('Run `ginko graph init` to enable sprint tracking.'));
    return { success: false, message: 'Graph not initialized' };
  }

  const graphId = await getGraphId();
  if (!graphId) {
    return { success: false, message: 'No graph ID found' };
  }

  // 2. Get feature description (from flag or prompt)
  let description = options.description;
  if (!description) {
    const isTTY = process.stdin.isTTY;
    if (!isTTY) {
      console.error(chalk.red('Error: --description (-d) is required in non-interactive mode.'));
      console.error(chalk.dim('  Usage: ginko sprint create -d "Feature description"'));
      return { success: false, message: 'Description required in non-interactive mode' };
    }

    const response = await prompts({
      type: 'text',
      name: 'description',
      message: 'What are you building?',
      validate: (value) => value.trim().length >= 10
        ? true
        : 'Please describe your feature in more detail (10+ chars)',
    });
    description = response.description;
  }

  if (!description) {
    return { success: false, message: 'Cancelled' };
  }

  // 3. Break down into tasks
  const spinner = ora('Breaking down into tasks...').start();

  let plan: SprintPlan;
  const aiPlan = await breakdownFeatureWithAI(description);

  if (aiPlan && Array.isArray(aiPlan.tasks) && aiPlan.tasks.length > 0) {
    plan = aiPlan;
    spinner.succeed('Tasks generated');
  } else {
    plan = createSimpleSprintPlan(description);
    spinner.info('Using simple task structure');
  }

  // 4. Display plan for confirmation
  console.log('');
  console.log(chalk.cyan('Sprint: ') + chalk.bold(plan.name));
  console.log(chalk.dim('Goal: ') + plan.goal);
  console.log('');
  console.log(chalk.dim('Tasks:'));
  plan.tasks.forEach((task, i) => {
    console.log(chalk.dim(`  ${i + 1}. ${task.title} (${task.estimate})`));
  });
  console.log('');
  console.log(chalk.dim('This will be tracked under the Ad-Hoc Epic.'));

  // 5. Confirm (skip with --yes flag or non-TTY)
  if (!options.yes) {
    const isTTY = process.stdin.isTTY;
    if (!isTTY) {
      // Non-TTY without --yes: auto-confirm
    } else {
      const { action } = await prompts({
        type: 'select',
        name: 'action',
        message: 'Look good?',
        choices: [
          { title: 'Yes, create it', value: 'yes' },
          { title: 'Cancel', value: 'cancel' },
        ],
      });

      if (action !== 'yes') {
        console.log(chalk.dim('Cancelled.'));
        return { success: false, message: 'Cancelled by user' };
      }
    }
  }

  // 6. Generate sprint ID and markdown
  const createSpinner = ora('Creating sprint...').start();

  const sprintId = await generateNextAdhocSprintId(graphId);
  const userEmail = await getUserEmail();
  const markdown = generateSprintMarkdown(sprintId, plan, userEmail);

  // 7. Sync to graph
  try {
    const client = new GraphApiClient();
    await client.request<{ sprint: { id: string } }>(
      'POST',
      '/api/v1/sprint/sync',
      { graphId, sprintContent: markdown }
    );

    // 8. Auto-assign sprint to user
    await setUserCurrentSprint(createAssignmentFromSprintId(sprintId, plan.name));

    // 9. Start first task
    const firstTaskId = `${sprintId}_t01`;
    try {
      await client.updateTaskStatus(graphId, firstTaskId, 'in_progress');
    } catch {
      // Non-critical - task might not have been created yet
    }

    createSpinner.succeed('Sprint created');

    console.log('');
    console.log(chalk.green(`✓ Created sprint ${chalk.bold(sprintId)} with ${plan.tasks.length} tasks`));
    console.log(chalk.cyan(`  Starting task 1: ${plan.tasks[0].title}`));

    return {
      success: true,
      sprintId,
      taskCount: plan.tasks.length,
      message: 'Sprint created successfully'
    };
  } catch (error) {
    createSpinner.fail('Failed to create sprint');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to sync sprint to graph' };
  }
}

// Export for CLI registration
export default createSprintCommand;
