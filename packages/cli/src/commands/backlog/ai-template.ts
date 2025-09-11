/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, ai, templates, content-generation]
 * @related: [base.ts, context-gatherer.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, fs-extra]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { ContextGatherer } from './context-gatherer.js';
import { BacklogBase } from './base.js';

interface AiTemplateOptions {
  verbose?: boolean;
  edit?: boolean;
}

/**
 * Generate rich content templates for AI to fill
 * This is valuable prompt generation - guiding content creation, not explaining commands
 */
export async function aiTemplateCommand(request: string, options: AiTemplateOptions = {}) {
  try {
    const intent = detectContentIntent(request);
    
    if (!intent) {
      // Not a content generation request - let user handle directly
      console.log(chalk.yellow('This request doesn\'t need AI content generation.'));
      console.log(chalk.dim('Just ask the AI directly or use: ginko backlog --help'));
      return;
    }
    
    // Gather context for rich template
    const context = await new ContextGatherer().gatherContext();
    const template = await generateContentTemplate(intent, request, context);
    
    // Output the template for AI to fill
    console.log(chalk.cyan('═══ AI Content Generation ═════════════════════════════'));
    console.log(template);
    console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
    console.log(chalk.dim('\n// AI: Please create this content following the template'));
    
  } catch (error) {
    console.error(chalk.red('Failed to generate template'));
    console.error(error);
  }
}

/**
 * Detect if this request needs content generation
 */
function detectContentIntent(request: string): string | null {
  const lower = request.toLowerCase();
  
  // Content generation patterns
  if (lower.match(/create.*(feature|story|task|item)/)) return 'create-item';
  if (lower.match(/write.*(prd|spec|requirements)/)) return 'write-prd';
  if (lower.match(/plan.*(sprint|work|implementation)/)) return 'plan-sprint';
  if (lower.match(/break.*down|decompose|split/)) return 'decompose';
  
  // These don't need templates - AI can handle directly
  if (lower.match(/list|show|count|how many|status|what.*working/)) return null;
  if (lower.match(/update|complete|done|finish/)) return null;
  
  return null;
}

/**
 * Generate rich content template based on intent
 */
async function generateContentTemplate(
  intent: string,
  request: string,
  context: any
): Promise<string> {
  switch (intent) {
    case 'create-item':
      return generateCreateItemTemplate(request, context);
    case 'write-prd':
      return generatePRDTemplate(request, context);
    case 'plan-sprint':
      return generateSprintPlanTemplate(request, context);
    case 'decompose':
      return generateDecomposeTemplate(request, context);
    default:
      return generateGenericTemplate(request, context);
  }
}

/**
 * Template for creating a complete backlog item
 */
function generateCreateItemTemplate(request: string, context: any): string {
  const contextSummary = new ContextGatherer().generateContextSummary(context);
  
  return `
<ai-task>
Create a complete backlog item from this request.

REQUEST: "${request}"

CONTEXT:
${contextSummary}

CREATE A COMPLETE ITEM WITH:

1. METADATA:
   - Type: [feature|story|task] based on request
   - Title: Concise, specific (max 60 chars)
   - Priority: [critical|high|medium|low] based on:
     * Critical: Security, blocking, data loss
     * High: User-facing, revenue impact
     * Medium: Improvements, performance
     * Low: Nice-to-have, cosmetic
   - Size: [S|M|L|XL] based on complexity

2. PROBLEM STATEMENT:
   - What problem does this solve?
   - Who is affected?
   - What's the current pain point?

3. SOLUTION APPROACH:
   - High-level technical approach
   - Key architectural decisions
   - Alternative approaches considered

4. ACCEPTANCE CRITERIA:
   - [ ] Specific, measurable outcomes
   - [ ] User-visible behaviors
   - [ ] Edge cases handled
   - [ ] Performance requirements

5. TECHNICAL NOTES:
   - Dependencies (packages, APIs)
   - Security considerations
   - Performance implications
   - Testing approach

6. RELATIONSHIPS:
   - Parent feature (if this is a story/task)
   - Related items in backlog
   - Blocking/blocked by

EXECUTE:
1. First, create the item:
   \`\`\`bash
   ginko backlog create [type] "[title]" -p [priority] -s [size]
   \`\`\`

2. Then edit the file at backlog/items/[ID].md with the complete content above

EXAMPLE OUTPUT:
\`\`\`bash
ginko backlog create feature "OAuth2 Social Login Integration" -p high -s L
\`\`\`

Then add to backlog/items/FEATURE-XXX.md:

## Problem Statement
Users currently must create new accounts, leading to 47% cart abandonment...

## Solution Approach  
Implement OAuth2 with Google, GitHub, and Microsoft providers using Passport.js...

## Acceptance Criteria
- [ ] Users can sign in with Google in < 3 clicks
- [ ] Existing accounts auto-link via email match
- [ ] Session persists across browser restart
- [ ] Rate limiting prevents abuse (100 req/min)

## Technical Notes
- Dependencies: passport, passport-google-oauth20
- Security: PKCE flow for public clients
- Store refresh tokens encrypted in database
- Test with mock OAuth provider in dev
</ai-task>`;
}

/**
 * Template for writing a PRD
 */
function generatePRDTemplate(request: string, context: any): string {
  return `
<ai-task>
Write a Product Requirements Document.

REQUEST: "${request}"

CURRENT BACKLOG: ${context.activeItems.length} items, ${context.highPriorityItems.length} high priority

PRD TEMPLATE:

# PRD: [Feature Name]

## Executive Summary
[1-2 paragraphs: problem, solution, impact]

## Problem Statement
### Current State
### Pain Points
### Opportunity Size

## Proposed Solution
### Core Functionality
### User Journey
### Success Metrics

## Requirements
### Functional Requirements
1. MUST have:
2. SHOULD have:
3. COULD have:
4. WON'T have (this version):

### Non-Functional Requirements
- Performance:
- Security:
- Scalability:
- Accessibility:

## Technical Considerations
### Architecture
### Dependencies
### Risks

## Implementation Plan
### Phase 1: MVP
### Phase 2: Enhancement
### Phase 3: Scale

## Success Criteria
- [ ] Measurable outcomes
- [ ] User satisfaction metrics
- [ ] Technical benchmarks

SAVE AS: docs/PRD-XXX-[feature-name].md
</ai-task>`;
}

/**
 * Template for sprint planning
 */
function generateSprintPlanTemplate(request: string, context: any): string {
  return `
<ai-task>
Create a sprint plan.

REQUEST: "${request}"

BACKLOG STATUS:
- In Progress: ${context.inProgressItems.map((i: any) => i.id).join(', ')}
- High Priority: ${context.highPriorityItems.length} items
- Total Active: ${context.activeItems.length} items

SPRINT PLAN TEMPLATE:

# Sprint Plan: [Date Range]

## Sprint Goal
[One clear sentence describing what we'll achieve]

## Capacity
- Days: 5
- Team members: 1
- Story points available: [calculate]

## Committed Items
1. [ID] - [Title] - [Size] - [Priority]
2. ...

## Daily Plan
### Day 1:
- [ ] Morning: 
- [ ] Afternoon:

### Day 2-5:
[Continue breakdown]

## Dependencies
- External:
- Internal:

## Risks
- Risk 1: [mitigation]
- Risk 2: [mitigation]

## Success Metrics
- [ ] All committed items complete
- [ ] Tests passing
- [ ] Deployed to staging

CREATE SPRINT ITEMS:
\`\`\`bash
# Update committed items to in-progress
ginko backlog update [ID] -s in-progress
ginko backlog update [ID] -s in-progress
\`\`\`
</ai-task>`;
}

/**
 * Template for decomposing work
 */
function generateDecomposeTemplate(request: string, context: any): string {
  return `
<ai-task>
Decompose this work into smaller items.

REQUEST: "${request}"

DECOMPOSITION TEMPLATE:

## Original Item
[Identify what needs to be broken down]

## Decomposed Structure

### Parent Feature
- ID: FEATURE-XXX
- Title: [High-level goal]
- Size: XL

### Child Stories
1. Story: [User-facing piece]
   - Size: M
   - Acceptance criteria: [specific outcomes]

2. Story: [Another user-facing piece]
   - Size: L
   - Acceptance criteria: [specific outcomes]

### Implementation Tasks
1. Task: [Technical work]
   - Size: S
   - Dependencies: []

2. Task: [Infrastructure]
   - Size: M
   - Dependencies: [Task 1]

3. Task: [Testing]
   - Size: S
   - Dependencies: [Task 2]

## Execution Order
1. First: [ID] - [Reason]
2. Then: [ID] - [Reason]
3. Finally: [ID] - [Reason]

CREATE ITEMS:
\`\`\`bash
# Create parent feature
ginko backlog create feature "[Parent title]" -p high -s XL

# Create child stories
ginko backlog create story "[Story 1]" -p high -s M
ginko backlog create story "[Story 2]" -p high -s L

# Create tasks
ginko backlog create task "[Task 1]" -p high -s S
ginko backlog create task "[Task 2]" -p medium -s M
\`\`\`

Then update each file to add relationships and details.
</ai-task>`;
}

/**
 * Generic template
 */
function generateGenericTemplate(request: string, context: any): string {
  return `
<ai-task>
Generate content for this request.

REQUEST: "${request}"

CONTEXT:
${new ContextGatherer().generateContextSummary(context)}

Please create appropriate content based on the request.
Consider:
- Current work in progress
- Project conventions
- Team patterns
- Technical constraints

Provide both the command to execute and the content to create.
</ai-task>`;
}