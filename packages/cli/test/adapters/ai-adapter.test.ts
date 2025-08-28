/**
 * @fileType: test
 * @status: current
 * @updated: 2025-08-28
 * @tags: [test, adapter, model-agnostic]
 * @related: [ai-adapter.ts, claude-adapter.ts, openai-adapter.ts]
 * @priority: high
 * @complexity: low
 */

import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from './claude-adapter';
import { OpenAIAdapter } from './openai-adapter';
import { GenericAdapter } from './generic-adapter';

describe('AI Adapters', () => {
  describe('ClaudeAdapter', () => {
    const adapter = new ClaudeAdapter();
    
    it('should have correct name and extension', () => {
      expect(adapter.name).toBe('Claude');
      expect(adapter.fileExtension).toBe('CLAUDE.md');
    });
    
    it('should generate Claude-specific sections', () => {
      const sections = adapter.getModelSpecificSections();
      expect(sections).toContain('Claude-Specific Features');
      expect(sections).toContain('Artifacts');
      expect(sections).toContain('Context Windows');
    });
    
    it('should generate Claude quick reference', () => {
      const quickRef = adapter.getQuickReferenceCommands();
      expect(quickRef).toContain('Claude Quick Reference');
      expect(quickRef).toContain('Clear context');
      expect(quickRef).toContain('Code artifacts');
    });
  });
  
  describe('OpenAIAdapter', () => {
    const adapter = new OpenAIAdapter();
    
    it('should have correct name and extension', () => {
      expect(adapter.name).toBe('GPT');
      expect(adapter.fileExtension).toBe('GPT.md');
    });
    
    it('should generate GPT-specific sections', () => {
      const sections = adapter.getModelSpecificSections();
      expect(sections).toContain('GPT-Specific Features');
      expect(sections).toContain('Code Interpreter');
      expect(sections).toContain('Function Calling');
    });
    
    it('should generate GPT quick reference', () => {
      const quickRef = adapter.getQuickReferenceCommands();
      expect(quickRef).toContain('GPT Quick Reference');
      expect(quickRef).toContain('Code execution');
      expect(quickRef).toContain('Structured output');
    });
  });
  
  describe('GenericAdapter', () => {
    const adapter = new GenericAdapter();
    
    it('should have correct name and extension', () => {
      expect(adapter.name).toBe('AI');
      expect(adapter.fileExtension).toBe('AI.md');
    });
    
    it('should generate generic AI sections', () => {
      const sections = adapter.getModelSpecificSections();
      expect(sections).toContain('AI Assistant Guidelines');
      expect(sections).toContain('General Best Practices');
      expect(sections).toContain('Code Collaboration');
    });
    
    it('should generate generic quick reference', () => {
      const quickRef = adapter.getQuickReferenceCommands();
      expect(quickRef).toContain('AI Quick Reference');
      expect(quickRef).toContain('New features');
      expect(quickRef).toContain('Bug fixes');
    });
  });
  
  describe('Template substitution', () => {
    it('should correctly substitute template variables', () => {
      const adapter = new ClaudeAdapter();
      const template = 'Working with {{MODEL_NAME}} in {{FILE_EXTENSION}}';
      const result = adapter.generateInstructions(template);
      
      expect(result).toBe('Working with Claude in CLAUDE.md');
    });
    
    it('should handle model-specific sections', () => {
      const adapter = new OpenAIAdapter();
      const template = '{{MODEL_SPECIFIC_SECTIONS}}';
      const result = adapter.generateInstructions(template);
      
      expect(result).toContain('GPT-Specific Features');
    });
  });
});