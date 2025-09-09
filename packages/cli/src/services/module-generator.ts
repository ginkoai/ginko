/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-09
 * @tags: [modules, context, generation, insights]
 * @related: [../types/session.ts, ./insight-extractor.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import path from 'path';
import { 
  SessionInsight, 
  ContextModule, 
  ModuleMetadata,
  InsightType 
} from '../types/session.js';

/**
 * Service for generating context modules from insights
 */
export class ModuleGenerator {
  private modulesDir: string;
  private existingModules: Set<string> = new Set();
  
  constructor(ginkoDir: string) {
    this.modulesDir = path.join(ginkoDir, 'context', 'modules');
  }
  
  /**
   * Initialize the generator and load existing modules
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.modulesDir);
    await this.loadExistingModules();
  }
  
  /**
   * Generate context modules from insights
   */
  async generateModules(insights: SessionInsight[]): Promise<ContextModule[]> {
    const modules: ContextModule[] = [];
    
    for (const insight of insights) {
      // Check for duplicates
      if (this.isDuplicate(insight)) {
        continue;
      }
      
      // Generate module
      const module = await this.generateModule(insight);
      modules.push(module);
      
      // Write to filesystem
      await this.writeModule(module);
      
      // Track for deduplication
      this.existingModules.add(this.getModuleSignature(insight));
    }
    
    // Update module index
    await this.updateModuleIndex(modules);
    
    return modules;
  }
  
  /**
   * Generate a single context module from an insight
   */
  private async generateModule(insight: SessionInsight): Promise<ContextModule> {
    const filename = this.generateFilename(insight);
    const content = this.generateContent(insight);
    const metadata = this.generateMetadata(insight);
    
    return {
      filename,
      content,
      metadata
    };
  }
  
  /**
   * Generate a kebab-case filename from insight
   */
  private generateFilename(insight: SessionInsight): string {
    const prefix = insight.type;
    const slug = insight.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50); // Limit length
    
    return `${prefix}-${slug}.md`;
  }
  
  /**
   * Generate markdown content for the module
   */
  private generateContent(insight: SessionInsight): string {
    const template = this.getTemplate(insight.type);
    
    return template
      .replace('{{TITLE}}', insight.title)
      .replace('{{TYPE}}', insight.type)
      .replace('{{TAGS}}', insight.tags?.join(', ') || '')
      .replace('{{PROBLEM}}', insight.problem)
      .replace('{{SOLUTION}}', insight.solution)
      .replace('{{IMPACT}}', insight.impact)
      .replace('{{CODE_EXAMPLE}}', this.formatCodeExample(insight))
      .replace('{{PREVENTION}}', insight.preventedError || 'N/A')
      .replace('{{TIME_SAVING}}', `${insight.timeSavingPotential} minutes`)
      .replace('{{REUSABILITY}}', `${Math.round(insight.reusabilityScore * 100)}%`)
      .replace('{{DATE}}', new Date().toISOString().split('T')[0])
      .replace('{{SESSION_ID}}', insight.sessionId)
      .replace('{{RELATED_FILES}}', this.formatRelatedFiles(insight));
  }
  
  /**
   * Get template for insight type
   */
  private getTemplate(type: InsightType): string {
    const templates: Record<InsightType, string> = {
      gotcha: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  
**Session**: {{SESSION_ID}}  

## The Gotcha

{{PROBLEM}}

## The Solution

{{SOLUTION}}

## Code Example

{{CODE_EXAMPLE}}

## How to Avoid

{{PREVENTION}}

## Impact

- **Time Saved**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}
- {{IMPACT}}

## Related Files

{{RELATED_FILES}}

---
*This context module was automatically generated from session insights.*`,

      pattern: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## Pattern Description

{{PROBLEM}}

## Implementation

{{SOLUTION}}

## Code Example

{{CODE_EXAMPLE}}

## When to Use

{{IMPACT}}

## Benefits

- **Time Saved**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}

## Related Files

{{RELATED_FILES}}`,

      decision: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## Context

{{PROBLEM}}

## Decision

{{SOLUTION}}

## Rationale

{{IMPACT}}

## Implementation

{{CODE_EXAMPLE}}

## Consequences

- **Time Impact**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}

## Related Files

{{RELATED_FILES}}`,

      discovery: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## What Was Discovered

{{PROBLEM}}

## How It Works

{{SOLUTION}}

## Example Usage

{{CODE_EXAMPLE}}

## Value

{{IMPACT}}

- **Time Saved**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}

## Related Files

{{RELATED_FILES}}`,

      optimization: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## Performance Issue

{{PROBLEM}}

## Optimization Applied

{{SOLUTION}}

## Implementation

{{CODE_EXAMPLE}}

## Results

{{IMPACT}}

- **Time Saved**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}

## Related Files

{{RELATED_FILES}}`,

      workaround: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## Issue

{{PROBLEM}}

## Temporary Solution

{{SOLUTION}}

## Implementation

{{CODE_EXAMPLE}}

## Notes

{{IMPACT}}

- **Time Saved**: {{TIME_SAVING}}
- **Applies to Similar Issues**: {{REUSABILITY}}

⚠️ **This is a workaround** - Check for permanent fixes in future updates.

## Related Files

{{RELATED_FILES}}`,

      configuration: `# {{TITLE}}

**Type**: {{TYPE}}  
**Tags**: {{TAGS}}  
**Created**: {{DATE}}  

## Configuration Need

{{PROBLEM}}

## Settings Applied

{{SOLUTION}}

## Configuration Example

{{CODE_EXAMPLE}}

## Impact

{{IMPACT}}

- **Setup Time Saved**: {{TIME_SAVING}}
- **Reusability**: {{REUSABILITY}}

## Related Files

{{RELATED_FILES}}`
    };
    
    return templates[type] || templates.discovery;
  }
  
  /**
   * Format code example for markdown
   */
  private formatCodeExample(insight: SessionInsight): string {
    if (!insight.codeExample) {
      return '*No code example available*';
    }
    
    const { language, before, after, explanation } = insight.codeExample;
    
    let formatted = '';
    
    if (before) {
      formatted += `### Before\n\`\`\`${language}\n${before}\n\`\`\`\n\n`;
    }
    
    formatted += `### After\n\`\`\`${language}\n${after}\n\`\`\`\n`;
    
    if (explanation) {
      formatted += `\n${explanation}`;
    }
    
    return formatted;
  }
  
  /**
   * Format related files list
   */
  private formatRelatedFiles(insight: SessionInsight): string {
    if (!insight.relatedFiles || insight.relatedFiles.length === 0) {
      return '*No specific files*';
    }
    
    return insight.relatedFiles
      .map(file => `- \`${file}\``)
      .join('\n');
  }
  
  /**
   * Generate module metadata
   */
  private generateMetadata(insight: SessionInsight): ModuleMetadata {
    return {
      type: insight.type,
      tags: insight.tags || [],
      relevance: this.calculateRelevanceLevel(insight.relevanceScore),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      dependencies: insight.dependencies || [],
      sessionId: insight.sessionId,
      insightId: insight.id
    };
  }
  
  /**
   * Calculate relevance level from score
   */
  private calculateRelevanceLevel(score: number): ModuleMetadata['relevance'] {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
  
  /**
   * Write module to filesystem
   */
  private async writeModule(module: ContextModule): Promise<void> {
    const filepath = path.join(this.modulesDir, module.filename);
    
    // Add frontmatter
    const frontmatter = `---
type: ${module.metadata.type}
tags: [${module.metadata.tags.join(', ')}]
relevance: ${module.metadata.relevance}
created: ${module.metadata.created}
updated: ${module.metadata.updated}
dependencies: [${module.metadata.dependencies.join(', ')}]
sessionId: ${module.metadata.sessionId}
insightId: ${module.metadata.insightId}
---

`;
    
    const fullContent = frontmatter + module.content;
    
    await fs.writeFile(filepath, fullContent, 'utf8');
  }
  
  /**
   * Load existing modules for deduplication
   */
  private async loadExistingModules(): Promise<void> {
    try {
      const files = await fs.readdir(this.modulesDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(
            path.join(this.modulesDir, file),
            'utf8'
          );
          
          // Extract title for signature
          const titleMatch = content.match(/^# (.+)$/m);
          if (titleMatch) {
            this.existingModules.add(titleMatch[1].toLowerCase());
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
  
  /**
   * Check if insight is duplicate of existing module
   */
  private isDuplicate(insight: SessionInsight): boolean {
    const signature = this.getModuleSignature(insight);
    return this.existingModules.has(signature);
  }
  
  /**
   * Get signature for deduplication
   */
  private getModuleSignature(insight: SessionInsight): string {
    return insight.title.toLowerCase();
  }
  
  /**
   * Update module index file
   */
  private async updateModuleIndex(newModules: ContextModule[]): Promise<void> {
    const indexPath = path.join(this.modulesDir, '..', 'index.json');
    
    let index: any = {};
    try {
      index = await fs.readJSON(indexPath);
    } catch (error) {
      // Index doesn't exist yet
      index = {
        modules: [],
        lastUpdated: null,
        totalModules: 0
      };
    }
    
    // Add new modules to index
    for (const module of newModules) {
      index.modules.push({
        filename: module.filename,
        type: module.metadata.type,
        tags: module.metadata.tags,
        relevance: module.metadata.relevance,
        created: module.metadata.created,
        sessionId: module.metadata.sessionId
      });
    }
    
    // Update metadata
    index.lastUpdated = new Date().toISOString();
    index.totalModules = index.modules.length;
    
    // Write updated index
    await fs.writeJSON(indexPath, index, { spaces: 2 });
  }
}