/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-11
 * @tags: [reflection, pattern, core, ai, universal]
 * @related: [../commands/backlog/ai-template.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk]
 */

import chalk from 'chalk';

/**
 * Universal Reflection Pattern
 * The core pattern for Human+AI+Structure collaboration
 */
export interface ReflectionPattern {
  // 1. Human provides intent
  intent: string;
  
  // 2. System provides structure
  template: {
    requiredSections: string[];
    contextToConsider: string[];
    rulesAndConstraints: string[];
  };
  
  // 3. AI reflects and creates
  reflection: {
    conversationContext: any;
    systemState: any;
    domainKnowledge: any;
    pastPatterns: any;
  };
  
  // 4. Output follows structure
  output: {
    format: 'markdown' | 'code' | 'json';
    location: string;
    validation: string[];
  };
}

/**
 * Domain types that can use reflection
 */
export type ReflectionDomain = 
  | 'backlog'
  | 'documentation'
  | 'testing'
  | 'architecture'
  | 'debugging'
  | 'review'
  | 'refactor'
  | 'pattern';

/**
 * Domain configuration
 */
export interface DomainConfig {
  name: ReflectionDomain;
  description: string;
  detectPatterns: RegExp[];
  templatePath: string;
  outputFormat: 'markdown' | 'code' | 'json';
  outputLocation: string;
  contextGatherers: string[];
}

/**
 * Base class for reflection-based commands
 */
export abstract class ReflectionCommand {
  protected domain: ReflectionDomain;
  protected config: DomainConfig;
  
  constructor(domain: ReflectionDomain) {
    this.domain = domain;
    this.config = this.loadDomainConfig(domain);
  }
  
  /**
   * Main execution flow implementing the Universal Pattern
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // 1. Parse intent
      const parsedIntent = this.parseIntent(intent);
      
      // 2. Load template
      const template = await this.loadTemplate();
      
      // 3. Gather context
      const context = await this.gatherContext(parsedIntent);
      
      // 4. Generate reflection prompt
      const reflectionPrompt = this.generateReflectionPrompt(
        parsedIntent,
        template,
        context
      );
      
      // 5. Output for AI reflection
      this.outputReflectionPrompt(reflectionPrompt, options);
      
    } catch (error) {
      console.error(chalk.red(`Reflection failed: ${error}`));
      throw error;
    }
  }
  
  /**
   * Parse human intent
   */
  protected parseIntent(intent: string): any {
    return {
      raw: intent,
      domain: this.domain,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Load domain-specific template
   */
  protected abstract loadTemplate(): Promise<any>;
  
  /**
   * Gather relevant context
   */
  protected abstract gatherContext(intent: any): Promise<any>;
  
  /**
   * Generate the reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    return `
<reflection-task domain="${this.domain}">

INTENT: ${intent.raw}

TEMPLATE STRUCTURE:
${JSON.stringify(template, null, 2)}

CONTEXT TO REFLECT ON:
${this.formatContext(context)}

RULES AND CONSTRAINTS:
${this.formatRules(template.rules)}

INSTRUCTIONS:
1. Reflect on the intent and context
2. Create comprehensive output following the template
3. Ensure all required sections are complete
4. Maintain consistency with existing patterns
5. Output in ${this.config.outputFormat} format

</reflection-task>`;
  }
  
  /**
   * Output the reflection prompt
   */
  protected outputReflectionPrompt(prompt: string, options: any): void {
    if (options.raw) {
      console.log(prompt);
    } else {
      console.log(chalk.cyan('═══ Reflection Task ════════════════════════════════════'));
      console.log(prompt);
      console.log(chalk.cyan('════════════════════════════════════════════════════════'));
      console.log(chalk.dim('\n// AI: Please reflect and create based on this template'));
    }
  }
  
  /**
   * Format context for display
   */
  protected formatContext(context: any): string {
    return Object.entries(context)
      .map(([key, value]) => `${key}:\n${JSON.stringify(value, null, 2)}`)
      .join('\n\n');
  }
  
  /**
   * Format rules for display
   */
  protected formatRules(rules: string[] = []): string {
    return rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n');
  }
  
  /**
   * Load domain configuration
   */
  protected loadDomainConfig(domain: ReflectionDomain): DomainConfig {
    // This would normally load from config files
    const configs: Record<ReflectionDomain, DomainConfig> = {
      backlog: {
        name: 'backlog',
        description: 'Backlog item creation and management',
        detectPatterns: [/create|feature|story|task|backlog/i],
        templatePath: 'templates/backlog.md',
        outputFormat: 'markdown',
        outputLocation: 'backlog/items/',
        contextGatherers: ['git', 'backlog', 'session']
      },
      documentation: {
        name: 'documentation',
        description: 'Documentation generation',
        detectPatterns: [/doc|api|readme|guide/i],
        templatePath: 'templates/documentation.md',
        outputFormat: 'markdown',
        outputLocation: 'docs/',
        contextGatherers: ['code', 'tests', 'comments']
      },
      testing: {
        name: 'testing',
        description: 'Test generation',
        detectPatterns: [/test|spec|coverage/i],
        templatePath: 'templates/testing.md',
        outputFormat: 'code',
        outputLocation: 'tests/',
        contextGatherers: ['implementation', 'coverage', 'fixtures']
      },
      architecture: {
        name: 'architecture',
        description: 'Architecture decisions',
        detectPatterns: [/architecture|adr|design/i],
        templatePath: 'templates/architecture.md',
        outputFormat: 'markdown',
        outputLocation: 'docs/architecture/',
        contextGatherers: ['current-arch', 'constraints', 'alternatives']
      },
      debugging: {
        name: 'debugging',
        description: 'Debug investigation',
        detectPatterns: [/debug|investigate|error|bug/i],
        templatePath: 'templates/debugging.md',
        outputFormat: 'markdown',
        outputLocation: 'debug/',
        contextGatherers: ['logs', 'errors', 'recent-changes']
      },
      review: {
        name: 'review',
        description: 'Code review',
        detectPatterns: [/review|pr|pull request/i],
        templatePath: 'templates/review.md',
        outputFormat: 'markdown',
        outputLocation: 'reviews/',
        contextGatherers: ['diff', 'conventions', 'history']
      },
      refactor: {
        name: 'refactor',
        description: 'Code refactoring',
        detectPatterns: [/refactor|extract|reorganize/i],
        templatePath: 'templates/refactor.md',
        outputFormat: 'code',
        outputLocation: 'refactors/',
        contextGatherers: ['current-code', 'dependencies', 'tests']
      },
      pattern: {
        name: 'pattern',
        description: 'Pattern creation',
        detectPatterns: [/pattern|template|framework/i],
        templatePath: 'templates/pattern.md',
        outputFormat: 'markdown',
        outputLocation: '.ginko/patterns/',
        contextGatherers: ['existing-patterns', 'use-cases']
      }
    };
    
    return configs[domain];
  }
}

/**
 * Detect domain from intent
 */
export function detectDomain(intent: string): ReflectionDomain | null {
  // Order matters - more specific patterns first
  const domains: Array<[ReflectionDomain, RegExp[]]> = [
    ['debugging', [/debug|investigate|slow|error|bug|issue|broken|failing/i]],
    ['testing', [/test|spec|coverage/i]],
    ['backlog', [/create feature|create story|create task|backlog|todo|implement/i]],
    ['architecture', [/architecture|adr|design decision|system design/i]],
    ['review', [/review|pr |pull request/i]],
    ['refactor', [/refactor|extract|reorganize|clean up|improve code/i]],
    ['pattern', [/pattern|template|framework/i]],
    ['documentation', [/doc|api|readme|guide|document/i]]  // Most general, last
  ];
  
  for (const [domain, patterns] of domains) {
    if (patterns.some(pattern => pattern.test(intent))) {
      return domain;
    }
  }
  
  return null;
}

/**
 * Create reflection command for domain
 */
export function createReflectionCommand(domain: ReflectionDomain): ReflectionCommand {
  // This would instantiate the appropriate domain-specific class
  // For now, returning a generic implementation
  class GenericReflectionCommand extends ReflectionCommand {
    async loadTemplate(): Promise<any> {
      return {
        sections: this.config.contextGatherers,
        rules: ['Be comprehensive', 'Follow conventions', 'Include examples']
      };
    }
    
    async gatherContext(intent: any): Promise<any> {
      return {
        intent: intent.raw,
        domain: this.domain,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  return new GenericReflectionCommand(domain);
}