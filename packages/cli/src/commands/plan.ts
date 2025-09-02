/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, plan, sprint, implementation, phases]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, chalk, commander]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

interface PlanOptions {
  store?: boolean;
  id?: string;
  content?: string;
  days?: number;
  review?: boolean;
  verbose?: boolean;
}

export async function planCommand(feature: string | undefined, options: PlanOptions) {
  try {
    // Phase 2: Store AI-generated sprint plan
    if (options.store && options.id) {
      await storeSprintPlan(options.id, options.content || '');
      if (!options.verbose) {
        console.log('done');
      }
      return;
    }

    // Phase 1 requires feature/ADR reference
    if (!feature) {
      process.stdout.write(chalk.red('error: feature or ADR reference required') + '\n');
      process.stdout.write(chalk.dim('usage: ginko plan "implement ADR-023" --days 5') + '\n');
      process.exit(1);
    }

    // Phase 1: Generate sprint plan framework
    const ginkoDir = await getGinkoDir();
    const planId = `plan-${Date.now()}`;
    const projectRoot = path.dirname(ginkoDir);
    
    // Default to 5-day sprint if not specified
    const sprintDays = options.days || 5;
    
    // Try to detect if this references an ADR
    const adrReference = await findADRReference(feature, projectRoot);
    
    // Create plan framework
    const framework = generatePlanFramework(feature, sprintDays, adrReference);
    
    // Store context for phase 2
    const tempPath = path.join(ginkoDir, '.temp', `${planId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJSON(tempPath, { 
      feature,
      sprintDays,
      adrReference,
      planId,
      timestamp: new Date().toISOString()
    });

    if (options.verbose) {
      console.log(chalk.dim('Starting sprint planning mode...'));
      console.log(chalk.dim(`Sprint Duration: ${sprintDays} days`));
      console.log(chalk.dim(`ID: ${planId}`));
      if (adrReference) {
        console.log(chalk.dim(`ADR: ${adrReference}`));
      }
    }

    // Output plan framework (to stdout to avoid stderr)
    process.stdout.write(chalk.magenta('\n📋 Sprint Planning Mode') + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write(framework + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write(generatePlanInstructions(planId, sprintDays) + '\n');

    // Ensure stdout is flushed before exit
    await new Promise(resolve => process.stdout.write('', resolve));

    // Exit with code 0 to avoid stderr interpretation
    // The AI prompt is expected behavior, not an error
    process.exit(0);
    
  } catch (error) {
    process.stdout.write(chalk.red('error: ') + (error instanceof Error ? error.message : String(error)) + '\n');
    process.exit(1);
  }
}

function generatePlanFramework(feature: string, days: number, adrRef?: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  const phases = generatePhases(days);
  
  return `# Sprint Plan: ${feature}

## Overview
**Start Date**: ${date}
**Duration**: ${days} days
**ADR Reference**: ${adrRef || chalk.yellow('[AI: Link to relevant ADR if applicable]')}

## Success Criteria
${chalk.yellow('[AI: What specific, measurable outcomes define success?]')}
- [ ] ${chalk.yellow('[AI: Acceptance criterion 1]')}
- [ ] ${chalk.yellow('[AI: Acceptance criterion 2]')}
- [ ] ${chalk.yellow('[AI: Acceptance criterion 3]')}

## Implementation Phases

${phases.map((phase, i) => `
### ${phase.name}
**Duration**: ${phase.duration}
**Goal**: ${chalk.yellow(`[AI: What will be accomplished in ${phase.name}?]`)}

**Tasks**:
${chalk.yellow('[AI: List specific, actionable tasks]')}
- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}
- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}
- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}

**Deliverables**:
${chalk.yellow('[AI: What tangible outputs will exist after this phase?]')}

**Risk Factors**:
${chalk.yellow('[AI: What could block or delay this phase?]')}
`).join('')}

## Dependencies
${chalk.yellow('[AI: What needs to be in place before starting?]')}
- ${chalk.yellow('[AI: External dependencies]')}
- ${chalk.yellow('[AI: Team dependencies]')}
- ${chalk.yellow('[AI: Technical prerequisites]')}

## Testing Strategy
${chalk.yellow('[AI: How will we verify each phase?]')}
- **Unit Tests**: ${chalk.yellow('[AI: What will be unit tested?]')}
- **Integration Tests**: ${chalk.yellow('[AI: What integration points need testing?]')}
- **Manual Testing**: ${chalk.yellow('[AI: What requires manual verification?]')}

## Rollback Plan
${chalk.yellow('[AI: If something goes wrong, how do we revert?]')}

## Daily Standup Topics
${Array.from({length: days}, (_, i) => `
**Day ${i + 1}**:
- Focus: ${chalk.yellow(`[AI: Main focus for day ${i + 1}]`)}
- Check: ${chalk.yellow(`[AI: What should be done by end of day ${i + 1}?]`)}
- Risk: ${chalk.yellow(`[AI: What could block day ${i + 2}?]`)}
`).join('')}`;
}

function generatePhases(days: number): Array<{name: string, duration: string}> {
  if (days <= 2) {
    return [
      { name: 'Phase 1: Implementation', duration: '1 day' },
      { name: 'Phase 2: Testing & Polish', duration: '1 day' }
    ];
  } else if (days <= 5) {
    return [
      { name: 'Phase 1: Foundation', duration: `${Math.floor(days * 0.3)} day(s)` },
      { name: 'Phase 2: Core Implementation', duration: `${Math.floor(days * 0.4)} day(s)` },
      { name: 'Phase 3: Testing & Refinement', duration: `${Math.ceil(days * 0.3)} day(s)` }
    ];
  } else {
    return [
      { name: 'Phase 1: Architecture & Setup', duration: `${Math.floor(days * 0.2)} day(s)` },
      { name: 'Phase 2: Core Features', duration: `${Math.floor(days * 0.3)} day(s)` },
      { name: 'Phase 3: Integration', duration: `${Math.floor(days * 0.2)} day(s)` },
      { name: 'Phase 4: Testing & Documentation', duration: `${Math.floor(days * 0.2)} day(s)` },
      { name: 'Phase 5: Polish & Deploy', duration: `${Math.ceil(days * 0.1)} day(s)` }
    ];
  }
}

function generatePlanInstructions(planId: string, days: number): string {
  return chalk.magenta(`
Sprint Planning Instructions:

This is PLANNING MODE - we're creating a concrete implementation roadmap.
Be realistic about velocity and include buffer time.

1. Break down the work into clear, measurable phases
2. Each task should be 0.5-4 hours (larger = break down further)
3. Include specific acceptance criteria
4. Consider team capacity and dependencies
5. Build in time for code review and testing
6. Account for meetings and context switching (~20% overhead)

Guidelines:
- ${days} days = ~${days * 6} hours of focused coding time
- Include daily checkpoints for progress assessment
- Front-load risky or blocking work
- Back-load polish and nice-to-haves

After planning is complete, store the sprint plan:

ginko plan --store --id=${planId} --content="[complete sprint plan]"

The plan will be stored in: docs/SPRINTS/SPRINT-${new Date().toISOString().split('T')[0]}-[feature].md

This plan will guide daily standups and progress tracking.`);
}

async function storeSprintPlan(planId: string, content: string) {
  const ginkoDir = await getGinkoDir();
  const projectRoot = path.dirname(ginkoDir);
  
  // Extract title from content
  const titleMatch = content.match(/^#\s+Sprint Plan:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Sprint';
  const date = new Date().toISOString().split('T')[0];
  const filename = `SPRINT-${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
  
  // Store sprint plan
  const sprintDir = path.join(projectRoot, 'docs', 'SPRINTS');
  await fs.ensureDir(sprintDir);
  
  const sprintPath = path.join(sprintDir, filename);
  await fs.writeFile(sprintPath, content);
  
  // Also update current sprint symlink
  const currentPath = path.join(sprintDir, 'CURRENT-SPRINT.md');
  if (await fs.pathExists(currentPath)) {
    await fs.remove(currentPath);
  }
  
  // Create symlink to current sprint
  await fs.symlink(sprintPath, currentPath).catch(() => {
    // If symlink fails (Windows), copy instead
    fs.copyFile(sprintPath, currentPath);
  });
  
  console.log(chalk.green(`✅ Sprint plan created: ${path.relative(projectRoot, sprintPath)}`));
  console.log(chalk.dim(`   Current sprint: ${path.relative(projectRoot, currentPath)}`));
  
  // Provide phase transition options
  console.log();
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold('Planning phase complete. Next steps:'));
  console.log();
  console.log(chalk.cyan('  ginko start') + chalk.dim(' - Begin implementation'));
  console.log(chalk.cyan('  ginko capture') + chalk.dim(' - Document implementation decisions'));
  console.log(chalk.cyan('  ginko ship') + chalk.dim(' - Commit and push your work'));
  console.log();
  console.log(chalk.dim('Note: Sprint plan is now active and ready for execution.'));
  
  // Clean up temp file
  const tempPath = path.join(ginkoDir, '.temp', `${planId}.json`);
  await fs.remove(tempPath).catch(() => {});
}

async function findADRReference(feature: string, projectRoot: string): Promise<string | undefined> {
  // Check if feature mentions an ADR
  const adrMatch = feature.match(/ADR-(\d+)/i);
  if (adrMatch) {
    return adrMatch[0].toUpperCase();
  }
  
  // Check if feature matches recent ADR titles
  const adrDir = path.join(projectRoot, 'docs', 'reference', 'architecture');
  if (await fs.pathExists(adrDir)) {
    const files = await fs.readdir(adrDir);
    const recentADRs = files
      .filter(f => f.startsWith('ADR-'))
      .sort()
      .reverse()
      .slice(0, 5); // Check last 5 ADRs
    
    for (const adrFile of recentADRs) {
      const content = await fs.readFile(path.join(adrDir, adrFile), 'utf8');
      const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
      if (titleMatch) {
        const title = titleMatch[1].toLowerCase();
        if (feature.toLowerCase().includes(title) || title.includes(feature.toLowerCase())) {
          return adrFile.match(/ADR-\d+/)![0];
        }
      }
    }
  }
  
  return undefined;
}