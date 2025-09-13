/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [reflection, universal, ai, router]
 * @related: [../core/reflection-pattern.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, reflection-pattern]
 */

import chalk from 'chalk';
import { detectDomain, createReflectionCommand } from '../core/reflection-pattern.js';
import { BacklogReflectionCommand } from './backlog/backlog-reflection.js';

interface ReflectOptions {
  domain?: string;
  raw?: boolean;
  verbose?: boolean;
  save?: boolean;
}

/**
 * Universal reflection command
 * Routes to appropriate domain-specific reflection
 */
export async function reflectCommand(intent: string, options: ReflectOptions = {}) {
  try {
    // Detect domain from intent or use specified
    const detectedDomain = options.domain || detectDomain(intent);
    
    if (!detectedDomain) {
      handleUnknownDomain(intent);
      return;
    }
    
    if (options.verbose) {
      console.log(chalk.dim(`Detected domain: ${detectedDomain}`));
    }
    
    // Create appropriate reflection command
    const reflectionCommand = await createDomainReflection(detectedDomain);
    
    if (!reflectionCommand) {
      console.log(chalk.yellow(`Domain '${detectedDomain}' not yet implemented`));
      console.log(chalk.dim('Available domains: start, handoff, prd, architecture, backlog, documentation'));
      console.log(chalk.dim('Coming soon: testing, sprint, git, overview'));
      return;
    }
    
    // Execute reflection pattern
    await reflectionCommand.execute(intent, options);
    
  } catch (error) {
    console.error(chalk.red('Reflection failed:'));
    console.error(error);
    process.exit(1);
  }
}

/**
 * Create domain-specific reflection command
 */
async function createDomainReflection(domain: string): Promise<any> {
  switch (domain) {
    // Core system domains
    case 'start':
      const { StartReflectionCommand } = await import('./start/start-reflection.js');
      return new StartReflectionCommand();

    case 'handoff':
      const { HandoffReflectionCommand } = await import('./handoff/handoff-reflection.js');
      return new HandoffReflectionCommand();

    case 'backlog':
      return new BacklogReflectionCommand();

    case 'prd':
      const { PRDReflectionCommand } = await import('./prd/prd-reflection.js');
      return new PRDReflectionCommand();

    case 'architecture':
      const { ArchitectureReflectionCommand } = await import('./architecture/architecture-reflection.js');
      return new ArchitectureReflectionCommand();

    case 'documentation':
      const { DocumentationReflectionCommand } = await import('./documentation/documentation-reflection.js');
      return new DocumentationReflectionCommand();

    // Future domains - using generic implementation for now
    case 'testing':
    case 'debugging':
    case 'review':
    case 'refactor':
    case 'pattern':
    case 'sprint':
    case 'overview':
    case 'git':
      // These would have their own reflection implementations
      return createReflectionCommand(domain as any);

    default:
      return null;
  }
}

/**
 * Handle unknown domain
 */
function handleUnknownDomain(intent: string): void {
  console.log(chalk.yellow('Could not detect domain for this intent'));
  console.log(chalk.dim('\nTry specifying domain explicitly:'));
  console.log(chalk.green('  ginko reflect --domain backlog "your intent"'));
  console.log(chalk.green('  ginko reflect --domain documentation "your intent"'));
  console.log(chalk.green('  ginko reflect --domain testing "your intent"'));
  
  console.log(chalk.dim('\nOr use domain-specific commands:'));
  console.log(chalk.green('  ginko backlog ai "create feature"'));
  console.log(chalk.green('  ginko docs generate "API documentation"'));
  console.log(chalk.green('  ginko test create "payment flow"'));
  
  console.log(chalk.dim('\nFor simple queries, just ask the AI directly!'));
}