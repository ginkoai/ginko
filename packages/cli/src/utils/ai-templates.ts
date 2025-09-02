/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-28
 * @tags: [ai, templates, prompts, enrichment]
 * @related: [../commands/handoff-ai.ts, ../commands/capture.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * AI template and prompt utilities following ADR-024 pattern
 * Provides consistent AI enhancement across all commands
 */

export interface AiTemplate {
  content: string;
  prompt: string;
  markers: string[];
}

export interface AiEnhancementContext {
  command: string;
  id: string;
  data: any;
}

/**
 * DEPRECATED: Special exit codes originally used to signal AI processing
 * These caused stderr output issues as non-zero exit codes are interpreted as errors
 * Now all AI-enhanced commands use exit code 0 for success
 * Keeping for reference only - DO NOT USE
 */
export const AI_PROCESSING_EXIT_CODE = 42;  // DEPRECATED - use 0 instead
export const AI_EXIT_CODES = {
  CAPTURE: 42,      // DEPRECATED
  HANDOFF: 42,      // DEPRECATED
  EXPLORE: 43,      // DEPRECATED
  ARCHITECTURE: 44, // DEPRECATED
  PLAN: 45,         // DEPRECATED
  VIBECHECK: 46,    // DEPRECATED
  SHIP: 47          // DEPRECATED
} as const;

/**
 * AI instruction markers in templates
 */
export const AI_MARKERS = {
  ANALYZE: '[AI: Analyze',
  EXTRACT: '[AI: Extract',
  PROVIDE: '[AI: Provide',
  DESCRIBE: '[AI: Describe',
  SUGGEST: '[AI: Suggest',
  LIST: '[AI: List',
  IDENTIFY: '[AI: Identify',
  NOTE: '[AI: Note'
} as const;

/**
 * Generate a completion prompt for AI enhancement
 */
export function generateCompletionPrompt(
  context: AiEnhancementContext,
  template: string
): string {
  const { command, id, data } = context;
  
  return `Please complete this ${command} template by analyzing the provided context:

${formatContextData(data)}

Instructions:
1. Complete ALL sections marked with ${Object.values(AI_MARKERS).join(', ')}
2. Maintain the exact template structure
3. Use concrete, specific details from the codebase
4. Keep responses concise and actionable
5. When complete, call: ginko ${command} --store --id=${id} --content="[your enriched content]"

Template to complete:
${template}

Remember: Follow the flow state philosophy from ADR-023 - be concise, actionable, and focused.`;
}

/**
 * Format context data for AI consumption
 */
function formatContextData(data: any): string {
  const sections = [];
  
  if (data.files) {
    sections.push(`Files in context:
${data.files.map((f: string) => `   - ${f}`).join('\n')}`);
  }
  
  if (data.commits) {
    sections.push(`Recent commits:
${data.commits.map((c: any) => `   - ${c.hash?.substring(0, 7)} ${c.message}`).join('\n')}`);
  }
  
  if (data.status) {
    sections.push(`Git status:
   - Modified: ${data.status.modified?.length || 0} files
   - Staged: ${data.status.staged?.length || 0} files
   - Untracked: ${data.status.not_added?.length || 0} files`);
  }
  
  if (data.branch) {
    sections.push(`Current branch: ${data.branch}`);
  }
  
  if (data.mode) {
    sections.push(`Work mode: ${data.mode}`);
  }
  
  return sections.join('\n\n');
}

/**
 * Extract AI markers from template
 */
export function extractAiMarkers(template: string): string[] {
  const markers: string[] = [];
  const regex = /\[AI:[^\]]+\]/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    markers.push(match[0]);
  }
  
  return markers;
}

/**
 * Validate AI-enriched content
 */
export function validateEnrichedContent(
  original: string,
  enriched: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check minimum length
  if (enriched.length < original.length * 0.8) {
    issues.push('Enriched content appears incomplete');
  }
  
  // Check for remaining AI markers
  const remainingMarkers = extractAiMarkers(enriched);
  if (remainingMarkers.length > 0) {
    issues.push(`Unprocessed AI markers found: ${remainingMarkers.join(', ')}`);
  }
  
  // Check frontmatter preservation
  if (original.startsWith('---') && !enriched.startsWith('---')) {
    issues.push('Frontmatter was removed');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Create a store command for AI to call back
 */
export function createStoreCommand(
  command: string,
  id: string,
  content: string
): string {
  // Escape content for shell
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
  
  return `ginko ${command} --store --id=${id} --content="${escapedContent}"`;
}

/**
 * Parse store command arguments
 */
export function parseStoreCommand(args: any): {
  id: string;
  content: string;
} | null {
  if (!args.store || !args.id || !args.content) {
    return null;
  }
  
  return {
    id: args.id,
    content: args.content
  };
}

/**
 * Common AI enhancement templates
 */
export const TEMPLATES = {
  handoffSummary: `[AI: Analyze the git history and changes to provide a concise summary of what was accomplished in this session]`,
  
  keyAchievements: `[AI: Based on the commits and changes, list the main achievements of this session]`,
  
  technicalDecisions: `[AI: Extract key technical decisions made during this session from commit messages and file changes]`,
  
  nextSteps: `[AI: Based on the current state and work patterns, suggest logical next steps]`,
  
  knownIssues: `[AI: List any known issues or edge cases discovered during this session]`,
  
  mentalModel: `[AI: Describe the mental model or approach used in this session to help maintain continuity]`,
  
  contextAnalysis: `[AI: Analyze why this was discovered and what problem it solves based on current work]`,
  
  codeExamples: `[AI: Include before/after code examples from actual files being worked on]`,
  
  impact: `[AI: Describe implications, trade-offs, and downstream effects]`
} as const;

/**
 * Generate fallback content when AI is unavailable
 */
export function generateFallbackContent(
  template: string,
  context: any
): string {
  // Remove AI markers and provide basic content
  return template.replace(/\[AI:[^\]]+\]/g, (match) => {
    if (match.includes('summary')) {
      return context.message || 'Session work completed';
    }
    if (match.includes('achievements')) {
      return '- Work in progress';
    }
    if (match.includes('steps')) {
      return '1. Continue current work';
    }
    return '(To be completed)';
  });
}