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
import { 
  InsightQualityController,
  QualityAssessment,
  SimilarityResult,
  CreationDecision
} from './insight-quality-controller.js';

/**
 * Service for generating context modules from insights with quality control
 */
export class ModuleGenerator {
  private modulesDir: string;
  private existingModules: Set<string> = new Set();
  private qualityController: InsightQualityController;
  
  constructor(ginkoDir: string) {
    this.modulesDir = path.join(ginkoDir, 'context', 'modules');
    this.qualityController = new InsightQualityController();
  }
  
  /**
   * Initialize the generator and load existing modules
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.modulesDir);
    await this.loadExistingModules();
    await this.qualityController.loadExistingModules(this.modulesDir);
  }
  
  /**
   * Generate context modules from insights with quality control
   */
  async generateModules(insights: SessionInsight[]): Promise<GenerationResult> {
    const modules: ContextModule[] = [];
    const skipped: SkippedInsight[] = [];
    const created: CreatedModule[] = [];
    
    for (const insight of insights) {
      // Step 1: Quality assessment
      const quality = this.qualityController.assessInsightQuality(insight);
      
      if (!quality.shouldCreate) {
        skipped.push({
          insight,
          reason: quality.recommendation,
          issues: quality.issues
        });
        continue;
      }
      
      // Step 2: Similarity check
      const similar = this.qualityController.findSimilarModules(insight);
      const decision = this.qualityController.shouldCreateDespiteSimilarity(insight, similar);
      
      if (!decision.shouldCreate) {
        skipped.push({
          insight,
          reason: decision.reason,
          existingModule: decision.existingModule
        });
        continue;
      }
      
      // Step 3: Generate module with enhancements
      const module = await this.generateModule(insight, decision);
      modules.push(module);
      
      // Step 4: Write to filesystem
      await this.writeModule(module);
      
      // Step 5: Track creation details
      created.push({
        module,
        quality: quality.score,
        action: decision.action,
        relatedModule: decision.relatedModule
      });
      
      // Track for deduplication
      this.existingModules.add(this.getModuleSignature(insight));
    }
    
    // Update module index
    if (modules.length > 0) {
      await this.updateModuleIndex(modules);
    }
    
    return {
      created: modules,
      skipped,
      createdDetails: created,
      summary: this.generateSummary(modules, skipped, insights)
    };
  }
  
  /**
   * Generate a single context module from an insight with decision context
   */
  private async generateModule(
    insight: SessionInsight, 
    decision?: CreationDecision
  ): Promise<ContextModule> {
    const filename = this.generateFilename(insight);
    let content = this.generateContent(insight);
    
    // Add relationship information if applicable
    if (decision?.relatedModule) {
      content = this.addRelationshipInfo(content, decision);
    }
    
    const metadata = this.generateMetadata(insight);
    
    return {
      filename,
      content,
      metadata
    };
  }
  
  /**
   * Add relationship information to module content
   */
  private addRelationshipInfo(content: string, decision: CreationDecision): string {
    let relationshipSection = '\n## Related Modules\n\n';
    
    switch (decision.action) {
      case 'create-variant':
        relationshipSection += `- **Variant of**: \`${decision.relatedModule}\`\n`;
        relationshipSection += `  - ${decision.reason}\n`;
        break;
      case 'create-alternative':
        relationshipSection += `- **Alternative to**: \`${decision.relatedModule}\`\n`;
        relationshipSection += `  - Different approach to similar problem\n`;
        break;
      case 'create-evolution':
        relationshipSection += `- **Evolves**: \`${decision.relatedModule}\`\n`;
        relationshipSection += `  - Refinement with improved solution\n`;
        break;
      case 'create-contextual':
        relationshipSection += `- **Related pattern**: \`${decision.relatedModule}\`\n`;
        relationshipSection += `  - Similar concept in different context\n`;
        break;
    }
    
    if (decision.suggestion) {
      relationshipSection += `\n💡 ${decision.suggestion}\n`;
    }
    
    // Insert before the closing separator
    const closingIndex = content.lastIndexOf('\n---');
    if (closingIndex > 0) {
      content = content.slice(0, closingIndex) + relationshipSection + content.slice(closingIndex);
    } else {
      content += relationshipSection;
    }
    
    return content;
  }
  
  /**
   * Generate summary of module generation results
   */
  private generateSummary(
    created: ContextModule[],
    skipped: SkippedInsight[],
    total: SessionInsight[]
  ): string {
    const qualitySkipped = skipped.filter(s => s.issues?.length > 0).length;
    const duplicateSkipped = skipped.filter(s => s.existingModule).length;
    
    const lines = [
      `Processed ${total.length} insights:`,
      `  ✅ Created ${created.length} modules`,
    ];
    
    if (qualitySkipped > 0) {
      lines.push(`  ⚠️  ${qualitySkipped} skipped (quality issues)`);
    }
    
    if (duplicateSkipped > 0) {
      lines.push(`  🔄 ${duplicateSkipped} skipped (similar exists)`);
    }
    
    if (created.length === 0 && total.length > 0) {
      lines.push(`\n💡 No modules created - insights didn't meet quality thresholds or were duplicates`);
    }
    
    return lines.join('\n');
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

// Type definitions for generation results
interface GenerationResult {
  created: ContextModule[];
  skipped: SkippedInsight[];
  createdDetails: CreatedModule[];
  summary: string;
}

interface SkippedInsight {
  insight: SessionInsight;
  reason: string;
  issues?: string[];
  existingModule?: string;
}

interface CreatedModule {
  module: ContextModule;
  quality: number;
  action: string;
  relatedModule?: string;
}

export { GenerationResult, SkippedInsight, CreatedModule };