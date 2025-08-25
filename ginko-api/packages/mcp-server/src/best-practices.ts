#!/usr/bin/env node

/**
 * @fileType: service
 * @status: current
 * @updated: 2025-08-01
 * @tags: [best-practices, context-server, team-standards, mcp, collaboration]
 * @related: [context-manager.ts, serverless-api, session-handoff.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [none]
 */

export interface BestPractice {
  id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  examples?: {
    good?: string[];
    bad?: string[];
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

export interface TeamBestPractices {
  teamId: string;
  practices: BestPractice[];
  customPractices?: BestPractice[];
  disabledPracticeIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class BestPracticesManager {
  private static defaultPractices: BestPractice[] = [
    // Development Process
    {
      id: 'dev-process-001',
      category: 'Development Process',
      title: 'Understand Before Implementing',
      description: 'Always read and understand existing code before making changes. Use search and analysis tools to explore the codebase first.',
      rationale: 'Prevents duplicate code, maintains consistency, and reduces bugs from misunderstanding existing patterns.',
      examples: {
        good: [
          'Search for existing implementations before creating new ones',
          'Read related files and understand the data flow',
          'Check for existing utilities and helpers'
        ],
        bad: [
          'Immediately writing new code without checking existing patterns',
          'Creating duplicate functionality'
        ]
      },
      priority: 'critical',
      tags: ['process', 'analysis', 'efficiency']
    },
    {
      id: 'dev-process-002',
      category: 'Development Process',
      title: 'Plan Before Coding',
      description: 'Create a clear plan or outline before implementing features. Break down complex tasks into smaller, manageable steps.',
      rationale: 'Reduces trial-and-error development, prevents scope creep, and ensures all requirements are considered.',
      examples: {
        good: [
          'Write a step-by-step plan for complex features',
          'Identify dependencies and potential issues upfront',
          'Use TODO lists to track progress'
        ],
        bad: [
          'Jumping straight into coding without planning',
          'Discovering requirements mid-implementation'
        ]
      },
      priority: 'high',
      tags: ['process', 'planning', 'efficiency']
    },
    {
      id: 'dev-process-003',
      category: 'Development Process',
      title: 'Test Changes Before Committing',
      description: 'Always run tests, linters, and type checkers before considering a task complete.',
      rationale: 'Catches errors early, maintains code quality, and prevents broken builds.',
      examples: {
        good: [
          'Run npm test before committing',
          'Execute linters and fix all warnings',
          'Verify type checking passes'
        ],
        bad: [
          'Committing untested code',
          'Ignoring linter warnings'
        ]
      },
      priority: 'critical',
      tags: ['testing', 'quality', 'process']
    },
    {
      id: 'dev-process-004',
      category: 'Development Process',
      title: 'Hypothesis-Driven Debugging Approach',
      description: 'When facing complex technical issues with multiple potential causes, use a systematic hypothesis-driven approach rather than random trial-and-error.',
      rationale: 'Proven Impact: During OAuth deployment debugging (Aug 3, 2025), this approach: solved a 4-hour deployment blocker systematically, prevented infinite debugging loops, created clear documentation of what was tried and why, led to the root cause discovery (.vercelignore exclusion issue)',
      examples: {
        good: [
          'HYPOTHESIS 1: Complex vercel.json configuration causing conflicts → Remove conflicting properties → Still 404, but learned configuration was issue',
          'HYPOTHESIS 3: .vercelignore itself is fundamentally broken → Remove .vercelignore entirely → SUCCESS',
          'State hypothesis clearly before making changes',
          'Make one change at a time with specific success criteria',
          'Document failed attempts for team learning',
          'Follow THINK, PLAN, VALIDATE, ACT, TEST methodology'
        ],
        bad: [
          'Make multiple changes simultaneously without clear hypothesis',
          'Skip documenting failed attempts',
          'Continue without clear success criteria',
          'Abandon systematic approach when frustrated',
          'Assume the first hypothesis is correct'
        ]
      },
      priority: 'high',
      tags: ['debugging', 'problem-solving', 'systematic-approach', 'deployment', 'methodology']
    },

    // Code Quality
    {
      id: 'code-quality-001',
      category: 'Code Quality',
      title: 'Follow Existing Patterns',
      description: 'Match the coding style, patterns, and conventions already present in the codebase.',
      rationale: 'Maintains consistency, reduces cognitive load, and makes code more maintainable.',
      examples: {
        good: [
          'Use the same naming conventions as existing code',
          'Follow established file organization patterns',
          'Reuse existing utilities and abstractions'
        ],
        bad: [
          'Introducing new patterns without discussion',
          'Mixing naming conventions'
        ]
      },
      priority: 'high',
      tags: ['consistency', 'maintainability', 'style']
    },
    {
      id: 'code-quality-002',
      category: 'Code Quality',
      title: 'Write Self-Documenting Code',
      description: 'Use clear variable names, function names, and code structure that explains intent without excessive comments.',
      rationale: 'Reduces maintenance burden, improves readability, and helps new team members understand the code faster.',
      examples: {
        good: [
          'const isUserAuthenticated = checkAuth(user)',
          'function calculateTotalPriceWithTax(items, taxRate)'
        ],
        bad: [
          'const flag = check(u)',
          'function calc(x, y)'
        ]
      },
      priority: 'medium',
      tags: ['readability', 'maintainability', 'documentation']
    },
    {
      id: 'code-quality-003',
      category: 'Code Quality',
      title: 'Handle Errors Gracefully',
      description: 'Always handle potential errors and edge cases. Provide meaningful error messages and fallback behavior.',
      rationale: 'Improves reliability, aids debugging, and provides better user experience.',
      examples: {
        good: [
          'try/catch blocks with specific error handling',
          'Validation of inputs with clear error messages',
          'Graceful degradation when services are unavailable'
        ],
        bad: [
          'Ignoring potential null/undefined values',
          'Generic catch-all error handlers without context'
        ]
      },
      priority: 'high',
      tags: ['reliability', 'error-handling', 'robustness']
    },

    // Architecture
    {
      id: 'architecture-001',
      category: 'Architecture',
      title: 'Maintain Separation of Concerns',
      description: 'Keep different aspects of the application separated into appropriate layers and modules.',
      rationale: 'Improves testability, maintainability, and allows for easier changes and scaling.',
      examples: {
        good: [
          'Separate business logic from UI components',
          'Keep database queries in repository/service layers',
          'Use dependency injection for testability'
        ],
        bad: [
          'Mixing database queries in UI components',
          'Business logic in route handlers'
        ]
      },
      priority: 'high',
      tags: ['architecture', 'design', 'maintainability']
    },
    {
      id: 'architecture-002',
      category: 'Architecture',
      title: 'Design for Testability',
      description: 'Structure code in a way that makes it easy to test individual components in isolation.',
      rationale: 'Enables comprehensive testing, faster debugging, and more confident refactoring.',
      examples: {
        good: [
          'Use dependency injection',
          'Create pure functions where possible',
          'Mock external dependencies in tests'
        ],
        bad: [
          'Hardcoding dependencies',
          'Functions with side effects that are hard to test'
        ]
      },
      priority: 'medium',
      tags: ['architecture', 'testing', 'design']
    },

    // Security
    {
      id: 'security-001',
      category: 'Security',
      title: 'Never Expose Secrets',
      description: 'Keep sensitive information like API keys, passwords, and tokens out of code and logs.',
      rationale: 'Prevents security breaches and protects user data.',
      examples: {
        good: [
          'Use environment variables for secrets',
          'Add .env files to .gitignore',
          'Use secret management services'
        ],
        bad: [
          'Hardcoding API keys in source code',
          'Logging sensitive information'
        ]
      },
      priority: 'critical',
      tags: ['security', 'best-practice']
    },
    {
      id: 'security-002',
      category: 'Security',
      title: 'Validate All Inputs',
      description: 'Always validate and sanitize user inputs, API parameters, and external data.',
      rationale: 'Prevents injection attacks, data corruption, and unexpected behavior.',
      examples: {
        good: [
          'Validate request parameters against schemas',
          'Sanitize user input before database queries',
          'Use parameterized queries'
        ],
        bad: [
          'Trusting user input without validation',
          'String concatenation for SQL queries'
        ]
      },
      priority: 'critical',
      tags: ['security', 'validation', 'safety']
    },

    // Performance
    {
      id: 'performance-001',
      category: 'Performance',
      title: 'Optimize for the Common Case',
      description: 'Focus optimization efforts on the most frequently used code paths and features.',
      rationale: 'Maximizes performance improvements while minimizing development time.',
      examples: {
        good: [
          'Cache frequently accessed data',
          'Optimize database queries for common operations',
          'Lazy load infrequently used features'
        ],
        bad: [
          'Premature optimization of rarely used features',
          'Complex optimizations without profiling'
        ]
      },
      priority: 'medium',
      tags: ['performance', 'optimization', 'efficiency']
    },

    // Collaboration
    {
      id: 'collaboration-001',
      category: 'Collaboration',
      title: 'Write Meaningful Commit Messages',
      description: 'Create clear, concise commit messages that explain what changed and why.',
      rationale: 'Helps team members understand changes, aids in debugging, and improves project history.',
      examples: {
        good: [
          'fix: resolve null pointer in user authentication',
          'feat: add pagination to search results',
          'refactor: extract email validation to utility function'
        ],
        bad: [
          'fix bug',
          'updates',
          'WIP'
        ]
      },
      priority: 'high',
      tags: ['git', 'collaboration', 'documentation']
    },
    {
      id: 'collaboration-002',
      category: 'Collaboration',
      title: 'Document Decisions and Trade-offs',
      description: 'Document important architectural decisions, trade-offs, and the reasoning behind them.',
      rationale: 'Helps future developers understand why certain choices were made and prevents repeating discussions.',
      examples: {
        good: [
          'ADR (Architecture Decision Records)',
          'Comments explaining non-obvious implementations',
          'README sections on design choices'
        ],
        bad: [
          'Implementing complex solutions without explanation',
          'Making architectural changes without documentation'
        ]
      },
      priority: 'medium',
      tags: ['documentation', 'collaboration', 'architecture']
    }
  ];

  /**
   * Get default best practices, optionally filtered by category or tags
   */
  static getDefaultPractices(filters?: {
    categories?: string[];
    tags?: string[];
    priority?: string[];
  }): BestPractice[] {
    let practices = [...this.defaultPractices];

    if (filters) {
      if (filters.categories?.length) {
        practices = practices.filter(p => 
          filters.categories!.includes(p.category)
        );
      }

      if (filters.tags?.length) {
        practices = practices.filter(p => 
          p.tags.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters.priority?.length) {
        practices = practices.filter(p => 
          filters.priority!.includes(p.priority)
        );
      }
    }

    return practices;
  }

  /**
   * Get all unique categories from default practices
   */
  static getCategories(): string[] {
    const categories = new Set(this.defaultPractices.map(p => p.category));
    return Array.from(categories);
  }

  /**
   * Get all unique tags from default practices
   */
  static getTags(): string[] {
    const allTags = this.defaultPractices.flatMap(p => p.tags);
    const uniqueTags = new Set(allTags);
    return Array.from(uniqueTags);
  }

  /**
   * Format practices for context inclusion
   */
  static formatPracticesForContext(practices: BestPractice[]): string {
    const grouped = practices.reduce((acc, practice) => {
      if (!acc[practice.category]) {
        acc[practice.category] = [];
      }
      acc[practice.category].push(practice);
      return acc;
    }, {} as Record<string, BestPractice[]>);

    const sections: string[] = [
      '# Team Development Best Practices',
      '',
      'Follow these practices to maintain code quality and team efficiency:',
      ''
    ];

    // Add critical practices first
    const criticalPractices = practices.filter(p => p.priority === 'critical');
    if (criticalPractices.length > 0) {
      sections.push('## 🚨 Critical Practices (Must Follow)');
      sections.push('');
      criticalPractices.forEach(practice => {
        sections.push(`### ${practice.title}`);
        sections.push(practice.description);
        sections.push(`**Why:** ${practice.rationale}`);
        sections.push('');
      });
    }

    // Add other practices by category
    Object.entries(grouped).forEach(([category, categoryPractices]) => {
      const nonCritical = categoryPractices.filter(p => p.priority !== 'critical');
      if (nonCritical.length === 0) return;

      sections.push(`## ${category}`);
      sections.push('');

      nonCritical.forEach(practice => {
        sections.push(`### ${practice.title} (${practice.priority} priority)`);
        sections.push(practice.description);
        
        if (practice.examples?.good?.length) {
          sections.push('**Good:**');
          practice.examples.good.forEach(example => {
            sections.push(`- ${example}`);
          });
        }

        if (practice.examples?.bad?.length) {
          sections.push('**Avoid:**');
          practice.examples.bad.forEach(example => {
            sections.push(`- ${example}`);
          });
        }

        sections.push('');
      });
    });

    return sections.join('\n');
  }

  /**
   * Merge team custom practices with defaults
   */
  static mergeWithDefaults(
    customPractices: BestPractice[] = [],
    disabledIds: string[] = []
  ): BestPractice[] {
    // Start with defaults, excluding disabled ones
    const enabledDefaults = this.defaultPractices.filter(
      p => !disabledIds.includes(p.id)
    );

    // Add custom practices
    return [...enabledDefaults, ...customPractices];
  }
}

export default BestPracticesManager;