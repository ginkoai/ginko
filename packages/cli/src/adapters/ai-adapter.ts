/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-28
 * @tags: [adapter, ai, model-agnostic, interface]
 * @related: [ai-instructions-template.ts, claude-adapter.ts, openai-adapter.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

export interface AiAdapter {
  name: string;
  fileExtension: string;
  generateInstructions(template: string): string;
  getModelSpecificSections(): string;
  getQuickReferenceCommands(): string;
}

export abstract class BaseAiAdapter implements AiAdapter {
  abstract name: string;
  abstract fileExtension: string;
  
  generateInstructions(template: string): string {
    // Base implementation that all models share
    return template
      .replace(/\{\{MODEL_NAME\}\}/g, this.name)
      .replace(/\{\{FILE_EXTENSION\}\}/g, this.fileExtension)
      .replace(/\{\{MODEL_SPECIFIC_SECTIONS\}\}/g, this.getModelSpecificSections())
      .replace(/\{\{QUICK_REFERENCE\}\}/g, this.getQuickReferenceCommands());
  }
  
  abstract getModelSpecificSections(): string;
  abstract getQuickReferenceCommands(): string;
}