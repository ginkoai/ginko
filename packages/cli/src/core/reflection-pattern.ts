/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-21
 * @tags: [reflection, pattern, core, ai, universal, path-config]
 * @related: [../commands/backlog/ai-template.ts, config/path-config.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, path-config]
 */

import chalk from 'chalk';
import { pathManager } from './config/path-config.js';

/**
 * Universal Reflection Pattern
 * The core pattern for Human+AI+Structure collaboration
 * Now uses pathManager for configuration-based path management
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
    analysisOfIntent: string;
    suggestedStructure: string;
    keyInsights: string[];
    risks: string[];
    nextSteps: string[];
  };

  // 4. Output artifact
  artifact: {
    title: string;
    content: string;
    type: 'markdown' | 'code' | 'json' | 'yaml';
  };
}

export type ReflectionDomain =
  | 'start' | 'handoff' | 'prd' | 'backlog' | 'documentation'
  | 'testing' | 'architecture' | 'debugging' | 'review' | 'refactor'
  | 'pattern' | 'sprint' | 'overview' | 'git' | 'ai-collaboration';

export interface DomainConfig {
  name: string;
  description: string;
  detectPatterns: RegExp[];
  templatePath: string;
  outputFormat: string;
  outputLocation: string;
  contextGatherers: string[];
}

/**
 * Base class for reflection commands with configuration-based paths
 */
export abstract class ReflectionCommand {
  protected domain: string;
  private pathConfig = pathManager.getConfig();

  constructor(domain: string) {
    this.domain = domain;
  }

  abstract execute(intent: string, options?: any): Promise<void>;

  /**
   * Generate prompt for AI reflection
   */
  protected async generatePrompt(intent: string, template: any, context: any): Promise<string> {
    const formattedContext = this.formatContext(context);
    const formattedRules = this.formatRules(template.rulesAndConstraints);

    return `
Intent: ${intent}

Template Sections Required:
${template.requiredSections?.map((s: string) => `- ${s}`).join('\n') || 'No sections specified'}

Context to Consider:
${template.contextToConsider?.map((c: string) => `- ${c}`).join('\n') || 'No context specified'}

Current Context:
${formattedContext}

Rules and Constraints:
${formattedRules}

Please provide a structured response addressing all required sections.
    `.trim();
  }

  /**
   * Get dynamic output paths based on pathManager configuration
   */
  protected getOutputPath(domain: ReflectionDomain): string {
    const pathMappings: Record<ReflectionDomain, string> = {
      'start': this.pathConfig.ginko.sessions,
      'handoff': this.pathConfig.ginko.sessions,
      'prd': this.pathConfig.docs.prd,
      'backlog': this.pathConfig.ginko.backlog,
      'documentation': this.pathConfig.docs.root,
      'testing': pathManager.joinPaths(this.pathConfig.project.root, 'tests'),
      'architecture': this.pathConfig.docs.adr,
      'debugging': pathManager.joinPaths(this.pathConfig.project.root, 'debug'),
      'review': pathManager.joinPaths(this.pathConfig.project.root, 'reviews'),
      'refactor': pathManager.joinPaths(this.pathConfig.project.root, 'refactors'),
      'pattern': pathManager.joinPaths(this.pathConfig.ginko.root, 'patterns'),
      'sprint': this.pathConfig.docs.sprints,
      'overview': this.pathConfig.docs.root,
      'git': this.pathConfig.project.root,
      'ai-collaboration': pathManager.joinPaths(this.pathConfig.ginko.root, 'ai-collab')
    };

    return pathMappings[domain] || this.pathConfig.docs.root;
  }

  /**
   * Load domain configuration with dynamic paths
   */
  protected loadDomainConfig(domain: ReflectionDomain): DomainConfig {
    const configs: Record<ReflectionDomain, DomainConfig> = {
      start: {
        name: 'start',
        description: 'Intelligent session initialization',
        detectPatterns: [/start|begin|resume|init|session/i],
        templatePath: 'templates/start.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('start'),
        contextGatherers: ['handoff', 'git', 'session']
      },
      handoff: {
        name: 'handoff',
        description: 'Session state preservation',
        detectPatterns: [/handoff|stop|pause|save|preserve/i],
        templatePath: 'templates/handoff.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('handoff'),
        contextGatherers: ['git', 'session', 'workstream']
      },
      prd: {
        name: 'prd',
        description: 'Product Requirements Document',
        detectPatterns: [/prd|requirements|product spec|user story|pain point/i],
        templatePath: 'templates/prd.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('prd'),
        contextGatherers: ['product', 'users', 'market']
      },
      backlog: {
        name: 'backlog',
        description: 'Backlog item creation and management',
        detectPatterns: [/create|feature|story|task|backlog/i],
        templatePath: 'templates/backlog.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('backlog'),
        contextGatherers: ['git', 'backlog', 'session']
      },
      documentation: {
        name: 'documentation',
        description: 'Documentation generation',
        detectPatterns: [/doc|api|readme|guide/i],
        templatePath: 'templates/documentation.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('documentation'),
        contextGatherers: ['code', 'tests', 'comments']
      },
      testing: {
        name: 'testing',
        description: 'Test generation',
        detectPatterns: [/test|spec|coverage/i],
        templatePath: 'templates/testing.md',
        outputFormat: 'code',
        outputLocation: this.getOutputPath('testing'),
        contextGatherers: ['implementation', 'coverage', 'fixtures']
      },
      architecture: {
        name: 'architecture',
        description: 'Architecture decisions',
        detectPatterns: [/architecture|adr|design/i],
        templatePath: 'templates/architecture.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('architecture'),
        contextGatherers: ['current-arch', 'constraints', 'alternatives']
      },
      debugging: {
        name: 'debugging',
        description: 'Debug investigation',
        detectPatterns: [/debug|investigate|error|bug/i],
        templatePath: 'templates/debugging.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('debugging'),
        contextGatherers: ['logs', 'errors', 'recent-changes']
      },
      review: {
        name: 'review',
        description: 'Code review',
        detectPatterns: [/review|pr|pull request/i],
        templatePath: 'templates/review.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('review'),
        contextGatherers: ['diff', 'conventions', 'history']
      },
      refactor: {
        name: 'refactor',
        description: 'Code refactoring',
        detectPatterns: [/refactor|extract|reorganize/i],
        templatePath: 'templates/refactor.md',
        outputFormat: 'code',
        outputLocation: this.getOutputPath('refactor'),
        contextGatherers: ['current-code', 'dependencies', 'tests']
      },
      pattern: {
        name: 'pattern',
        description: 'Pattern creation',
        detectPatterns: [/pattern|template|framework/i],
        templatePath: 'templates/pattern.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('pattern'),
        contextGatherers: ['existing-patterns', 'use-cases']
      },
      sprint: {
        name: 'sprint',
        description: 'Sprint planning and work breakdown',
        detectPatterns: [/sprint|planning|breakdown|wbs|iteration/i],
        templatePath: 'templates/sprint.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('sprint'),
        contextGatherers: ['backlog', 'team', 'velocity']
      },
      overview: {
        name: 'overview',
        description: 'System overview and architecture documentation',
        detectPatterns: [/overview|system|big picture|architecture doc/i],
        templatePath: 'templates/overview.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('overview'),
        contextGatherers: ['architecture', 'components', 'principles']
      },
      git: {
        name: 'git',
        description: 'Git workflow automation',
        detectPatterns: [/git|branch|commit|pr|pull request|merge/i],
        templatePath: 'templates/git.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('git'),
        contextGatherers: ['git-status', 'recent-commits', 'branch-info']
      },
      'ai-collaboration': {
        name: 'ai-collaboration',
        description: 'AI collaboration patterns and insights',
        detectPatterns: [/ai|claude|gpt|collaboration|prompt/i],
        templatePath: 'templates/ai-collaboration.md',
        outputFormat: 'markdown',
        outputLocation: this.getOutputPath('ai-collaboration'),
        contextGatherers: ['conversation-history', 'patterns', 'effectiveness']
      }
    };

    return configs[domain];
  }

  // ... rest of the methods remain the same

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
}

/**
 * Factory for creating reflection commands
 */
export class ReflectionFactory {
  static create(domain: ReflectionDomain): ReflectionCommand {
    // This would return specific implementations
    throw new Error(`Reflection command for domain ${domain} not implemented`);
  }

  static detectDomain(intent: string): ReflectionDomain | null {
    const domains: ReflectionDomain[] = [
      'start', 'handoff', 'prd', 'backlog', 'documentation',
      'testing', 'architecture', 'debugging', 'review', 'refactor',
      'pattern', 'sprint', 'overview', 'git', 'ai-collaboration'
    ];

    for (const domain of domains) {
      const config = new (class extends ReflectionCommand {
        async execute() {}
      })(domain).loadDomainConfig(domain);

      if (config.detectPatterns.some(pattern => pattern.test(intent))) {
        return domain;
      }
    }

    return null;
  }
}

/**
 * Utility functions for reflection patterns
 */
export const ReflectionUtils = {
  /**
   * Generate a timestamp for artifacts
   */
  timestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  },

  /**
   * Sanitize filename for cross-platform compatibility
   */
  sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Create relative path from project root
   */
  createRelativePath(absolutePath: string): string {
    return pathManager.getRelativePath(absolutePath);
  }
};