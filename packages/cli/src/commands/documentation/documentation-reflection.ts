/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [documentation, reflection, ai, universal-pattern]
 * @related: [../../core/reflection-pattern.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Documentation-specific implementation of the Reflection Pattern
 */
export class DocumentationReflectionCommand extends ReflectionCommand {
  constructor() {
    super('documentation');
  }
  
  /**
   * Load documentation-specific template
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'overview',
        'installation',
        'getting_started',
        'api_reference',
        'configuration',
        'examples',
        'troubleshooting',
        'contributing',
        'changelog'
      ],
      contextToConsider: [
        'package_json_metadata',
        'public_api_interfaces',
        'existing_documentation',
        'code_comments_and_jsdoc',
        'test_examples',
        'common_issues_from_git_history',
        'dependency_documentation'
      ],
      rulesAndConstraints: [
        'Use clear, concise language appropriate for target audience',
        'Include working code examples for all major features',
        'Follow team documentation standards and style guide',
        'Link to related documentation and external resources',
        'Include version compatibility information',
        'Provide clear migration guides for breaking changes',
        'Use semantic versioning in examples',
        'Include performance considerations where relevant'
      ],
      outputExample: `
# Project Name

## Overview
[Brief description of what the project does and why it exists]

## Installation
\`\`\`bash
npm install package-name
\`\`\`

## Getting Started
[Quick example showing basic usage]

## API Reference

### Core Functions

#### functionName(params)
[Description]

**Parameters:**
- \`param1\` (Type): Description

**Returns:** Type - Description

**Example:**
\`\`\`javascript
const result = functionName({ option: 'value' });
\`\`\`

## Configuration
[Configuration options and examples]

## Examples

### Basic Usage
[Code example]

### Advanced Features
[Code example]

## Troubleshooting

### Common Issues
- **Issue**: Description
  **Solution**: How to fix

## Contributing
[Guidelines for contributors]

## Changelog
[Recent changes and version history]`
    };
  }
  
  /**
   * Gather documentation-specific context
   */
  async gatherContext(intent: any): Promise<any> {
    const context = {
      conversationContext: {
        intent: intent.raw,
        timestamp: intent.timestamp
      },
      systemState: await this.gatherSystemState(),
      domainKnowledge: await this.gatherDomainKnowledge(),
      pastPatterns: await this.gatherPastPatterns()
    };
    
    return context;
  }
  
  /**
   * Gather system state relevant to documentation
   */
  private async gatherSystemState(): Promise<any> {
    const state: any = {};
    
    // Get package.json if it exists
    try {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      state.packageInfo = JSON.parse(packageJson);
    } catch (error) {
      state.packageInfo = null;
    }
    
    // Get README if it exists
    try {
      state.existingReadme = await fs.readFile('README.md', 'utf-8');
    } catch (error) {
      state.existingReadme = null;
    }
    
    // Get current git branch and recent commits
    try {
      const { stdout: branch } = await execAsync('git branch --show-current');
      state.currentBranch = branch.trim();
      
      const { stdout: commits } = await execAsync('git log --oneline -10');
      state.recentCommits = commits.trim().split('\n');
    } catch (error) {
      state.currentBranch = 'unknown';
      state.recentCommits = [];
    }
    
    return state;
  }
  
  /**
   * Gather domain knowledge about the codebase
   */
  private async gatherDomainKnowledge(): Promise<any> {
    const knowledge: any = {};
    
    // Find main entry points
    try {
      const { stdout } = await execAsync('find . -name "index.ts" -o -name "index.js" -o -name "main.ts" -o -name "main.js" | head -5');
      knowledge.entryPoints = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      knowledge.entryPoints = [];
    }
    
    // Find test files
    try {
      const { stdout } = await execAsync('find . -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" | head -10');
      knowledge.testFiles = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      knowledge.testFiles = [];
    }
    
    // Find existing documentation
    try {
      const { stdout } = await execAsync('find . -name "*.md" | grep -v node_modules | head -10');
      knowledge.existingDocs = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      knowledge.existingDocs = [];
    }
    
    // Detect frameworks and technologies
    knowledge.technologies = await this.detectTechnologies();
    
    return knowledge;
  }
  
  /**
   * Gather past patterns from existing documentation
   */
  private async gatherPastPatterns(): Promise<any> {
    const patterns: any = {};
    
    // Analyze existing markdown files for patterns
    try {
      const { stdout } = await execAsync('find . -name "*.md" -type f | xargs grep -h "^#" | sort | uniq -c | sort -rn | head -10');
      patterns.commonHeaders = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      patterns.commonHeaders = [];
    }
    
    // Look for code examples in existing docs
    try {
      const { stdout } = await execAsync('find . -name "*.md" -type f | xargs grep -l "```" | head -5');
      patterns.docsWithExamples = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      patterns.docsWithExamples = [];
    }
    
    return patterns;
  }
  
  /**
   * Detect technologies used in the project
   */
  private async detectTechnologies(): Promise<string[]> {
    const technologies = [];
    
    try {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      const pkg = JSON.parse(packageJson);
      
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };
      
      // Detect major frameworks
      if (allDeps['react']) technologies.push('React');
      if (allDeps['vue']) technologies.push('Vue');
      if (allDeps['@angular/core']) technologies.push('Angular');
      if (allDeps['next']) technologies.push('Next.js');
      if (allDeps['express']) technologies.push('Express');
      if (allDeps['fastify']) technologies.push('Fastify');
      if (allDeps['typescript']) technologies.push('TypeScript');
      if (allDeps['jest']) technologies.push('Jest');
      if (allDeps['vitest']) technologies.push('Vitest');
      if (allDeps['mocha']) technologies.push('Mocha');
      
    } catch (error) {
      // If no package.json, try to detect from files
      try {
        const { stdout: tsFiles } = await execAsync('find . -name "*.ts" -o -name "*.tsx" | head -1');
        if (tsFiles.trim()) technologies.push('TypeScript');
        
        const { stdout: jsFiles } = await execAsync('find . -name "*.js" -o -name "*.jsx" | head -1');
        if (jsFiles.trim()) technologies.push('JavaScript');
        
        const { stdout: pyFiles } = await execAsync('find . -name "*.py" | head -1');
        if (pyFiles.trim()) technologies.push('Python');
      } catch (err) {
        // Ignore errors in technology detection
      }
    }
    
    return technologies;
  }
  
  /**
   * Generate documentation-specific reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    const technologies = context.domainKnowledge.technologies?.join(', ') || 'unknown';
    const hasTests = context.domainKnowledge.testFiles?.length > 0;
    const hasExistingDocs = context.domainKnowledge.existingDocs?.length > 0;
    
    return `
<reflection-task domain="documentation">

INTENT: "${intent.raw}"

PROJECT INFORMATION:
- Name: ${context.systemState.packageInfo?.name || 'Unknown'}
- Version: ${context.systemState.packageInfo?.version || 'Unknown'}
- Technologies: ${technologies}
- Has tests: ${hasTests}
- Has existing docs: ${hasExistingDocs}

EXISTING STRUCTURE:
- Entry points: ${context.domainKnowledge.entryPoints?.join(', ') || 'none found'}
- Test files: ${context.domainKnowledge.testFiles?.length || 0} found
- Documentation files: ${context.domainKnowledge.existingDocs?.length || 0} found

TEMPLATE REQUIREMENTS:
${template.requiredSections.map((s: string) => `- ${s}`).join('\n')}

CONTEXT TO CONSIDER:
${template.contextToConsider.map((c: string) => `- ${c}`).join('\n')}

RULES TO FOLLOW:
${template.rulesAndConstraints.map((r: string) => `- ${r}`).join('\n')}

REFLECTION INSTRUCTIONS:
1. Analyze the intent to understand what documentation is needed
2. Review existing documentation to avoid duplication
3. Consider the target audience (developers, users, contributors)
4. Create comprehensive documentation following the template
5. Include real, working code examples from the codebase
6. Add troubleshooting for common issues
7. Ensure all links and references are valid
8. Follow the project's existing documentation style

OUTPUT FORMAT:
${template.outputExample}

</reflection-task>`;
  }
}

/**
 * Factory function for creating documentation reflection command
 */
export function createDocumentationReflection() {
  return new DocumentationReflectionCommand();
}