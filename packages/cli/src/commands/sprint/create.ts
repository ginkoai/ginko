/**
 * @fileType: command
 * @status: current
 * @updated: 2026-02-05
 * @tags: [sprint, create, ai-mediated, reflection, epic-018]
 * @related: [index.ts, quick-fix.ts, ../../templates/sprint-template.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: [prompts, chalk, ora, ai-service, fs]
 */

/**
 * Sprint Creation Command (EPIC-018)
 *
 * Two modes following ADR-032 Reflection Pattern:
 *
 * 1. AI-Mediated (default): Outputs sprint-template.md for AI partner to read.
 *    The AI conducts natural conversation, gathers context from graph,
 *    generates rich tasks with WHY-WHAT-HOW, and creates the sprint file.
 *
 * 2. Direct (--no-ai): Interactive prompts with AI service breakdown.
 *    For humans using CLI directly without AI partner.
 */

import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
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

/**
 * Rich task breakdown with WHY-WHAT-HOW structure (EPIC-018)
 */
interface TaskBreakdown {
  title: string;
  problem: string;      // WHY: motivation/pain point
  solution: string;     // WHAT: desired outcome
  approach: string;     // HOW: implementation strategy
  scope: string;        // Boundaries: in/out of scope
  acceptance_criteria: string[];  // Done when
  estimate: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;   // 0-100: AI confidence in task clarity
}

interface SprintPlan {
  name: string;
  goal: string;
  tasks: TaskBreakdown[];
  /** Average confidence across all tasks */
  composite_confidence?: number;
}

/**
 * Low-confidence task flagged for clarification
 */
interface FlaggedTask {
  index: number;
  task: TaskBreakdown;
  reason: string;
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
  noAi?: boolean;  // Use interactive mode instead of AI-mediated
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
 * Use AI to break down a feature description into tasks (EPIC-018)
 *
 * Generates rich task content with WHY-WHAT-HOW structure.
 * Each task includes a confidence score (0-100) indicating
 * how clear the requirements are to the AI.
 */
async function breakdownFeatureWithAI(description: string): Promise<SprintPlan | null> {
  try {
    const { createAIService } = await import('../../services/ai-service.js');
    const aiService = createAIService();

    const prompt = `You are a software project manager breaking down a feature into actionable tasks.

Feature: ${description}

Return JSON with this structure:
{
  "name": "Sprint name (3-5 words)",
  "goal": "One sentence describing the sprint goal",
  "tasks": [
    {
      "title": "Task title (action-oriented verb phrase)",
      "problem": "WHY: 1-2 sentences explaining the pain point or motivation",
      "solution": "WHAT: 1-2 sentences describing the desired outcome",
      "approach": "HOW: 2-3 sentences on implementation strategy",
      "scope": "Includes: X, Y. Excludes: Z (what's explicitly out)",
      "acceptance_criteria": ["Criterion 1", "Criterion 2", "Tests pass"],
      "estimate": "2h",
      "priority": "HIGH",
      "confidence": 85
    }
  ]
}

Guidelines:
- Break into 2-6 tasks, each completable in 1-4 hours
- Use CRITICAL/HIGH/MEDIUM/LOW for priority
- First task should enable the core feature
- Include a testing/validation task at the end

CONFIDENCE SCORING (critical):
- 90-100: Crystal clear requirements, obvious implementation
- 70-89: Good clarity, minor assumptions made
- 50-69: Moderate ambiguity, would benefit from clarification
- Below 50: Significant uncertainty, needs human input

Be honest about confidence. Low scores trigger clarification - this is GOOD.
A score of 60 with questions is better than 90 with hidden assumptions.

If you're uncertain about something, lower the confidence and note it in the approach.`;

    const plan = await aiService.extractJSON<SprintPlan>(prompt);

    // Calculate composite confidence
    if (plan && plan.tasks && plan.tasks.length > 0) {
      const avgConfidence = plan.tasks.reduce((sum, t) => sum + (t.confidence || 50), 0) / plan.tasks.length;
      plan.composite_confidence = Math.round(avgConfidence);
    }

    return plan;
  } catch (error) {
    console.error(chalk.dim('AI breakdown failed, using simple structure'));
    return null;
  }
}

/**
 * Create a simple sprint plan without AI (fallback)
 */
function createSimpleSprintPlan(description: string): SprintPlan {
  return {
    name: description.slice(0, 50),
    goal: description,
    composite_confidence: 50, // Low confidence - needs clarification
    tasks: [
      {
        title: 'Implement core functionality',
        problem: 'Feature needs to be implemented as described.',
        solution: 'Working implementation that meets the requirements.',
        approach: 'Analyze requirements, implement, and verify.',
        scope: 'Includes: Core feature. Excludes: TBD.',
        acceptance_criteria: ['Implementation complete', 'Tests passing'],
        estimate: '2h',
        priority: 'HIGH',
        confidence: 50,
      },
      {
        title: 'Test and validate',
        problem: 'Implementation needs verification.',
        solution: 'Confirmed working feature with test coverage.',
        approach: 'Write tests, run validation, fix issues.',
        scope: 'Includes: Unit tests, manual testing. Excludes: Load testing.',
        acceptance_criteria: ['All tests pass', 'Manual verification complete'],
        estimate: '1h',
        priority: 'MEDIUM',
        confidence: 50,
      },
    ]
  };
}

// =============================================================================
// Sprint Markdown Generation
// =============================================================================

/**
 * Generate sprint markdown compatible with sync API (EPIC-018)
 *
 * Outputs rich task content with WHY-WHAT-HOW structure.
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
**Confidence:** ${task.confidence}%

**Problem:** ${task.problem}

**Solution:** ${task.solution}

**Approach:** ${task.approach}

**Scope:**
${task.scope.split(/[.;]/).filter(s => s.trim()).map(s => `  - ${s.trim()}`).join('\n')}

**Acceptance Criteria:**
${task.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n')}

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
// Inquiry Flow (EPIC-018)
// =============================================================================

const CONFIDENCE_THRESHOLD = 75;

/**
 * Identify tasks that need clarification
 */
function flagLowConfidenceTasks(plan: SprintPlan): FlaggedTask[] {
  return plan.tasks
    .map((task, index) => ({ index, task, confidence: task.confidence || 50 }))
    .filter(t => t.confidence < CONFIDENCE_THRESHOLD)
    .map(t => ({
      index: t.index,
      task: t.task,
      reason: t.confidence < 50
        ? 'Significant uncertainty - needs human input'
        : 'Moderate ambiguity - would benefit from clarification',
    }));
}

/**
 * Display low-confidence tasks and request clarification (EPIC-018)
 *
 * When composite confidence < 75%, this triggers an honest inquiry.
 * Philosophy: Inquiry is a strength, not weakness. Better to ask now
 * than produce wrong work.
 */
async function runInquiryFlow(
  plan: SprintPlan,
  flaggedTasks: FlaggedTask[]
): Promise<SprintPlan | null> {
  console.log('');
  console.log(chalk.yellow('⚠️  Some tasks need clarification before we proceed.'));
  console.log(chalk.dim(`   Composite confidence: ${plan.composite_confidence}% (threshold: ${CONFIDENCE_THRESHOLD}%)`));
  console.log('');
  console.log(chalk.dim('Flagged tasks:'));

  for (const flagged of flaggedTasks) {
    console.log(chalk.yellow(`  ${flagged.index + 1}. ${flagged.task.title}`));
    console.log(chalk.dim(`     Confidence: ${flagged.task.confidence}% - ${flagged.reason}`));
    console.log(chalk.dim(`     Approach: ${flagged.task.approach.slice(0, 80)}...`));
  }

  console.log('');
  console.log(chalk.cyan('This is a good thing! Better to clarify now than build the wrong thing.'));
  console.log('');

  const isTTY = process.stdin.isTTY;
  if (!isTTY) {
    console.log(chalk.yellow('Non-interactive mode: proceeding with current plan.'));
    console.log(chalk.dim('For better results, run interactively or provide more detail in description.'));
    return plan;
  }

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'How would you like to proceed?',
    choices: [
      { title: 'Provide clarification (recommended)', value: 'clarify' },
      { title: 'Proceed anyway - let AI use best judgment', value: 'proceed' },
      { title: 'Cancel and start over with more detail', value: 'cancel' },
    ],
  });

  if (action === 'cancel') {
    return null;
  }

  if (action === 'proceed') {
    console.log(chalk.dim('Proceeding with AI best judgment. Tasks may need refinement later.'));
    return plan;
  }

  // Clarification flow
  console.log('');
  console.log(chalk.cyan('Let\'s clarify the flagged tasks. For each, provide additional context:'));
  console.log('');

  for (const flagged of flaggedTasks) {
    console.log(chalk.bold(`Task ${flagged.index + 1}: ${flagged.task.title}`));
    console.log(chalk.dim(`Current approach: ${flagged.task.approach}`));
    console.log('');

    const { clarification } = await prompts({
      type: 'text',
      name: 'clarification',
      message: 'Additional context or constraints (or press Enter to skip):',
    });

    if (clarification && clarification.trim()) {
      // Append clarification to approach
      plan.tasks[flagged.index].approach += ` User clarification: ${clarification.trim()}`;
      // Boost confidence since human provided input
      plan.tasks[flagged.index].confidence = Math.min(100, (flagged.task.confidence || 50) + 20);
    }
  }

  // Recalculate composite confidence
  const newAvg = plan.tasks.reduce((sum, t) => sum + (t.confidence || 50), 0) / plan.tasks.length;
  plan.composite_confidence = Math.round(newAvg);

  console.log('');
  console.log(chalk.green(`✓ Updated composite confidence: ${plan.composite_confidence}%`));

  return plan;
}

// =============================================================================
// Main Command
// =============================================================================

/**
 * Output sprint template for AI-mediated creation (EPIC-018)
 * The AI partner will read this, conduct a natural conversation, and create the sprint
 */
async function outputSprintTemplate(): Promise<CreateSprintResult> {
  const templatePath = new URL('../../templates/sprint-template.md', import.meta.url);

  try {
    const template = await fs.readFile(templatePath, 'utf-8');

    // Output template to stdout (AI partner will read this)
    console.log(template);

    return { success: true, message: 'Template output for AI-mediated creation' };
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading sprint template: ${error.message}`));
    return { success: false, message: 'Failed to read sprint template' };
  }
}

/**
 * Create a new feature sprint
 *
 * Default (AI-mediated): Outputs template for AI partner
 * --no-ai: Interactive prompts with AI service breakdown
 */
export async function createSprintCommand(
  options: CreateSprintOptions = {}
): Promise<CreateSprintResult> {
  // AI-mediated mode (default): Output template for AI partner
  if (!options.noAi) {
    return outputSprintTemplate();
  }

  // --no-ai mode: Interactive flow (original behavior)
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
    spinner.succeed(`Tasks generated (confidence: ${plan.composite_confidence}%)`);
  } else {
    plan = createSimpleSprintPlan(description);
    spinner.info('Using simple task structure (low confidence - consider adding detail)');
  }

  // 3.5 Confidence check - trigger inquiry if composite score < threshold (EPIC-018)
  const flaggedTasks = flagLowConfidenceTasks(plan);
  if (plan.composite_confidence && plan.composite_confidence < CONFIDENCE_THRESHOLD) {
    const updatedPlan = await runInquiryFlow(plan, flaggedTasks);
    if (!updatedPlan) {
      return { success: false, message: 'Cancelled during clarification' };
    }
    plan = updatedPlan;
  } else if (flaggedTasks.length > 0) {
    // Individual low-confidence tasks exist but composite is OK
    console.log('');
    console.log(chalk.dim(`Note: ${flaggedTasks.length} task(s) have lower confidence and may need refinement.`));
  }

  // 4. Display plan for confirmation
  console.log('');
  console.log(chalk.cyan('Sprint: ') + chalk.bold(plan.name));
  console.log(chalk.dim('Goal: ') + plan.goal);
  console.log('');
  console.log(chalk.dim('Tasks:'));
  plan.tasks.forEach((task, i) => {
    const confColor = task.confidence >= 80 ? chalk.green : task.confidence >= 60 ? chalk.yellow : chalk.red;
    console.log(chalk.dim(`  ${i + 1}. ${task.title} (${task.estimate}) `) + confColor(`[${task.confidence}%]`));
  });
  console.log('');
  if (plan.composite_confidence) {
    const compColor = plan.composite_confidence >= 80 ? chalk.green : plan.composite_confidence >= 60 ? chalk.yellow : chalk.red;
    console.log(chalk.dim('Composite confidence: ') + compColor(`${plan.composite_confidence}%`));
  }
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
