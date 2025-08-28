/**
 * @fileType: test
 * @status: current
 * @updated: 2025-08-28
 * @tags: [test, template, ai-instructions, model-agnostic]
 * @related: [ai-instructions-template.ts]
 * @priority: high
 * @complexity: low
 */

import { describe, it, expect } from 'vitest';
import { AiInstructionsTemplate, ProjectContext, TemplateVariables } from './ai-instructions-template';

describe('AiInstructionsTemplate', () => {
  const baseContext: ProjectContext = {
    projectName: 'test-project',
    techStack: ['React', 'Node.js'],
    projectType: 'webapp',
    hasTests: true,
    testCommand: 'npm test',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint',
    packageManager: 'npm',
    frameworks: ['react', 'express'],
    languages: ['typescript', 'javascript'],
  };

  const baseVariables: TemplateVariables = {
    ...baseContext,
    userEmail: 'test@example.com',
    userName: 'Test User',
    date: '2025-08-28',
  };

  describe('generate', () => {
    it('should generate valid markdown with all sections', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('# test-project - AI Assistant Collaboration Guide');
      expect(result).toContain('## Project Context');
      expect(result).toContain('## Quick Commands');
      expect(result).toContain('## AI-Optimized File Discovery');
      expect(result).toContain('## Development Workflow');
      expect(result).toContain('## Testing Requirements');
      expect(result).toContain('## Git Workflow');
    });

    it('should include project-specific information', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('React, Node.js');
      expect(result).toContain('webapp');
      expect(result).toContain('npm');
      expect(result).toContain('Test User');
      expect(result).toContain('test@example.com');
    });

    it('should include quick commands when available', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('npm run build');
      expect(result).toContain('npm test');
      expect(result).toContain('npm run lint');
      expect(result).toContain('npm install');
    });

    it('should include React-specific patterns for React projects', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('React/Next.js Conventions');
      expect(result).toContain('Components in');
      expect(result).toContain('Hooks prefixed with `use`');
    });

    it('should include API patterns for API projects', () => {
      const apiVariables: TemplateVariables = {
        ...baseVariables,
        projectType: 'api',
      };
      const result = ClaudeMdTemplate.generate(apiVariables);
      
      expect(result).toContain('API Conventions');
      expect(result).toContain('Route handlers');
      expect(result).toContain('Middleware');
    });

    it('should include CLI patterns for CLI projects', () => {
      const cliVariables: TemplateVariables = {
        ...baseVariables,
        projectType: 'cli',
      };
      const result = ClaudeMdTemplate.generate(cliVariables);
      
      expect(result).toContain('CLI Conventions');
      expect(result).toContain('Commands in');
      expect(result).toContain('User-friendly error messages');
    });

    it('should include TypeScript guidelines when TypeScript is detected', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('TypeScript Guidelines');
      expect(result).toContain('Prefer interfaces over types');
      expect(result).toContain('Avoid `any`');
    });

    it('should handle missing test setup gracefully', () => {
      const noTestVariables: TemplateVariables = {
        ...baseVariables,
        hasTests: false,
        testCommand: undefined,
      };
      const result = ClaudeMdTemplate.generate(noTestVariables);
      
      expect(result).toContain('No test framework detected');
      expect(result).toContain('Consider adding tests');
    });

    it('should handle unknown package manager', () => {
      const unknownPmVariables: TemplateVariables = {
        ...baseVariables,
        packageManager: 'unknown',
        buildCommand: undefined,
        testCommand: undefined,
        lintCommand: undefined,
      };
      const result = ClaudeMdTemplate.generate(unknownPmVariables);
      
      expect(result).toContain('No commands detected yet');
    });

    it('should include frontmatter section with correct format', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('@fileType:');
      expect(result).toContain('@status: current');
      expect(result).toContain('@updated: YYYY-MM-DD');
      expect(result).toContain('@tags:');
      expect(result).toContain('@complexity:');
      expect(result).toContain('head -12 filename.ts');
    });

    it('should include vibecheck pattern', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('The Vibecheck Pattern');
      expect(result).toContain('What are we actually trying to achieve?');
    });

    it('should include session management commands', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('ginko start');
      expect(result).toContain('ginko handoff');
      expect(result).toContain('ginko vibecheck');
      expect(result).toContain('ginko ship');
    });

    it('should include privacy and security notice', () => {
      const result = AiInstructionsTemplate.generate(baseVariables);
      
      expect(result).toContain('Privacy & Security');
      expect(result).toContain('All context stored locally');
      expect(result).toContain('No data leaves your machine');
    });
  });
});