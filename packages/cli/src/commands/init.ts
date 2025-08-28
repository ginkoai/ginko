/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, init, setup, git-native, enhanced]
 * @priority: high
 * @complexity: medium
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import { ProjectAnalyzer } from '../analysis/project-analyzer.js';
import { AiInstructionsTemplate, TemplateVariables, ProjectContext } from '../templates/ai-instructions-template.js';
import { AiAdapter } from '../adapters/ai-adapter.js';
import { ClaudeAdapter } from '../adapters/claude-adapter.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { GenericAdapter } from '../adapters/generic-adapter.js';
import { findGinkoRoot } from '../utils/ginko-root.js';

export async function initCommand(options: { quick?: boolean; analyze?: boolean; model?: string } = {}) {
  const spinner = ora('Initializing Ginko...').start();
  
  try {
    const projectRoot = process.cwd();
    const ginkoDir = path.join(projectRoot, '.ginko');
    
    // Check if already initialized in current directory
    if (await fs.pathExists(ginkoDir)) {
      spinner.warn('Ginko already initialized in this directory');
      return;
    }
    
    // Check if already initialized in a parent directory
    const existingRoot = await findGinkoRoot();
    if (existingRoot && existingRoot !== projectRoot) {
      spinner.warn(`Ginko already initialized in parent directory: ${existingRoot}`);
      console.log(chalk.yellow('\nTip: Run ginko commands from any subdirectory - they will use the parent .ginko'));
      return;
    }
    
    // Create directory structure
    await fs.ensureDir(path.join(ginkoDir, 'sessions'));
    await fs.ensureDir(path.join(ginkoDir, 'patterns'));
    await fs.ensureDir(path.join(ginkoDir, 'best-practices'));
    await fs.ensureDir(path.join(ginkoDir, 'context'));
    await fs.ensureDir(path.join(ginkoDir, 'context', 'modules'));
    
    // Get user info from git config
    let userEmail = 'user@example.com';
    let userName = 'Developer';
    try {
      userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
      userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
    } catch (e) {
      // Git not configured, use defaults
    }
    
    // Create user session directory
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    await fs.ensureDir(path.join(ginkoDir, 'sessions', userSlug));
    await fs.ensureDir(path.join(ginkoDir, 'sessions', userSlug, 'archive'));
    
    // Create default configuration (privacy-first)
    const config = {
      version: '0.1.0',
      user: {
        email: userEmail
      },
      privacy: {
        analytics: {
          enabled: false,  // Disabled by default
          anonymous: true   // Always anonymous when enabled
        },
        telemetry: {
          enabled: false
        }
      },
      git: {
        autoCommit: false,
        signCommits: false
      },
      ai: {
        model: 'auto-detect',
        output: {
          format: 'human',
          colors: true,
          emojis: true
        }
      }
    };
    
    await fs.writeJSON(path.join(ginkoDir, 'config.json'), config, { spaces: 2 });
    
    // Analyze project and generate AI instructions (unless --quick is used)
    if (!options.quick) {
      spinner.text = 'Analyzing project structure...';
      
      const projectContext = await ProjectAnalyzer.quickAnalyze(projectRoot);
      
      // Select AI adapter based on model or auto-detect
      const adapter = selectAiAdapter(options.model);
      
      // Generate AI instructions with project-specific content
      const templateVars: TemplateVariables = {
        ...projectContext,
        userEmail,
        userName,
        date: new Date().toISOString().split('T')[0],
        aiModel: adapter.name,
      };
      
      const modelContent = adapter.getModelSpecificSections() + adapter.getQuickReferenceCommands();
      const aiInstructions = AiInstructionsTemplate.generate(templateVars, modelContent);
      await fs.writeFile(path.join(projectRoot, adapter.fileExtension), aiInstructions);
      
      // Generate initial context modules based on detected patterns
      await generateContextModules(ginkoDir, projectContext);
    }
    
    // Create context rules
    const contextRules = `# Context Rules

## Auto-Load
- Current file being edited
- Files in same directory
- Recent files (last 5 edited)

## Exclude
- node_modules/
- .git/
- dist/
- build/
- *.log
- *.tmp

## Boundaries
- Module: Current package/workspace
- Project: Repository root
- Focus: Active feature branch
`;
    
    await fs.writeFile(path.join(ginkoDir, 'context', 'rules.md'), contextRules);
    
    // Create initial best practice
    const bestPractice = `# Local Best Practices

## Code Style
- Follow existing patterns in the codebase
- Maintain consistent naming conventions
- Document complex logic

## Git Workflow
- Commit early and often
- Write clear commit messages
- Create handoffs at natural breakpoints

## AI Collaboration
- Keep context focused
- Use vibecheck when stuck
- Archive sessions when complete
`;
    
    await fs.writeFile(path.join(ginkoDir, 'best-practices', 'local.md'), bestPractice);
    
    // Add .ginko to .gitignore if it doesn't exist
    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignore.includes('.ginko/config.json')) {
        await fs.appendFile(gitignorePath, '\n# Ginko local config (contains preferences)\n.ginko/config.json\n');
      }
    }
    
    spinner.succeed('Ginko initialized successfully!');
    
    console.log('\n' + chalk.green('✨ Enhanced setup complete!'));
    
    if (!options.quick) {
      console.log('\n' + chalk.bold('📋 Generated Files:'));
      const adapter = selectAiAdapter(options.model);
      console.log(chalk.green('  ✓') + ` ${adapter.fileExtension} - ${adapter.name} collaboration guide with project-specific instructions`);
      console.log(chalk.green('  ✓') + ' .ginko/context/modules/ - Context modules for your tech stack');
      console.log(chalk.green('  ✓') + ' Frontmatter templates configured');
    }
    
    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.cyan('  ginko start') + ' - Begin a new session with AI-optimized context');
    console.log(chalk.cyan('  ginko handoff') + ' - Save your progress for seamless continuation');
    console.log(chalk.cyan('  ginko vibecheck') + ' - Quick realignment when stuck');
    
    console.log('\n' + chalk.dim('📁 Created .ginko/ directory (git-tracked)'));
    console.log(chalk.dim('🔐 Privacy: All data stays local. No analytics enabled.'));
    console.log(chalk.dim('⚡ AI-optimized: Use `head -12 file.ts` for instant context'));
    
  } catch (error) {
    spinner.fail('Failed to initialize Ginko');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Generate initial context modules based on project analysis
async function generateContextModules(ginkoDir: string, context: ProjectContext): Promise<void> {
  const modulesDir = path.join(ginkoDir, 'context', 'modules');
  
  // Generate frontmatter best practices module
  const frontmatterModule = `---
type: pattern
tags: [frontmatter, ai-optimization, discovery]
priority: critical
---

# Frontmatter Best Practices

Always add frontmatter to new TypeScript/JavaScript files:

\`\`\`typescript
/**
 * @fileType: [type]
 * @status: current
 * @updated: ${new Date().toISOString().split('T')[0]}
 * @tags: [relevant, tags]
 * @related: [related-files.ts]
 * @priority: [critical|high|medium|low]
 * @complexity: [low|medium|high]
 */
\`\`\`

This enables 70% faster AI context discovery.
`;
  
  await fs.writeFile(path.join(modulesDir, 'frontmatter-required.md'), frontmatterModule);
  
  // Generate project-specific modules
  if (context.frameworks.includes('react') || context.frameworks.includes('nextjs')) {
    const reactModule = `---
type: pattern
tags: [react, components, hooks]
priority: high
---

# React Patterns in This Project

## Component Structure
- Components in \`src/components/\` or \`app/\`
- Use existing component patterns as templates
- Hooks prefixed with \`use\` in \`src/hooks/\`

## Common Patterns
- Check existing components with similar functionality
- Follow state management patterns already in use
- Maintain consistent prop typing approach
`;
    
    await fs.writeFile(path.join(modulesDir, 'react-patterns.md'), reactModule);
  }
  
  if (context.hasTests) {
    const testModule = `---
type: requirement
tags: [testing, quality]
priority: high
---

# Testing Requirements

## Test Command
\`\`\`bash
${context.testCommand || 'npm test'}
\`\`\`

## Requirements
- Write tests for new features
- Run tests before committing
- Maintain existing coverage levels
- Fix failing tests immediately
`;
    
    await fs.writeFile(path.join(modulesDir, 'testing-required.md'), testModule);
  }
}

// Select appropriate AI adapter based on model or environment
function selectAiAdapter(model?: string): AiAdapter {
  const modelName = model?.toLowerCase() || detectAiModel();
  
  switch (modelName) {
    case 'claude':
    case 'anthropic':
      return new ClaudeAdapter();
    case 'gpt':
    case 'openai':
    case 'gpt-4':
    case 'gpt-3.5':
      return new OpenAIAdapter();
    default:
      // Default to Claude for backward compatibility,
      // but could be made configurable
      return new ClaudeAdapter();
  }
}

// Auto-detect AI model from environment or config
function detectAiModel(): string {
  // Check common environment variables
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'gpt';
  
  // Check for Claude Code environment
  if (process.env.CLAUDE_CODE || process.env.CLAUDE_PROJECT_ID) return 'claude';
  
  // Default to generic if no model detected
  return 'generic';
}