/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, ai-detection, adapters]
 * @priority: high
 * @complexity: medium
 */

export type AIModel = 'claude' | 'gpt4' | 'gemini' | 'llama' | 'universal';

export interface AIEnvironment {
  model: AIModel;
  confidence: number;
  reason: string;
}

/**
 * Detect which AI model is being used based on environment
 */
export function detectAIModel(): AIEnvironment {
  // Check for explicit environment variable
  if (process.env.GINKO_AI_MODEL) {
    return {
      model: process.env.GINKO_AI_MODEL as AIModel,
      confidence: 1.0,
      reason: 'Explicitly set via GINKO_AI_MODEL'
    };
  }
  
  // Check for MCP (Claude)
  if (process.env.MCP_SERVER_URL || process.env.CLAUDE_CODE) {
    return {
      model: 'claude',
      confidence: 0.9,
      reason: 'MCP environment detected'
    };
  }
  
  // Check for OpenAI
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_BASE) {
    return {
      model: 'gpt4',
      confidence: 0.9,
      reason: 'OpenAI environment detected'
    };
  }
  
  // Check for Google AI
  if (process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY) {
    return {
      model: 'gemini',
      confidence: 0.9,
      reason: 'Google AI environment detected'
    };
  }
  
  // Check for local LLM indicators
  if (process.env.OLLAMA_HOST || process.env.LLAMA_SERVER) {
    return {
      model: 'llama',
      confidence: 0.8,
      reason: 'Local LLM server detected'
    };
  }
  
  // Check parent process name
  const parentProcess = process.env.TERM_PROGRAM || process.env.SHELL || '';
  if (parentProcess.toLowerCase().includes('cursor')) {
    return {
      model: 'gpt4',
      confidence: 0.7,
      reason: 'Cursor IDE detected'
    };
  }
  
  // Default to universal
  return {
    model: 'universal',
    confidence: 0.5,
    reason: 'No specific AI environment detected'
  };
}

/**
 * Get optimal settings for detected AI model
 */
export function getModelDefaults(model: AIModel) {
  switch (model) {
    case 'claude':
      return {
        format: 'markdown',
        colors: true,
        emojis: true,
        verbosity: 'normal',
        contextWindow: 200000
      };
    
    case 'gpt4':
      return {
        format: 'json',
        colors: false,
        emojis: false,
        verbosity: 'structured',
        contextWindow: 128000
      };
    
    case 'gemini':
      return {
        format: 'xml',
        colors: false,
        emojis: false,
        verbosity: 'hierarchical',
        contextWindow: 1000000
      };
    
    case 'llama':
      return {
        format: 'minimal',
        colors: false,
        emojis: false,
        verbosity: 'compressed',
        contextWindow: 32000
      };
    
    default:
      return {
        format: 'text',
        colors: true,
        emojis: true,
        verbosity: 'normal',
        contextWindow: 100000
      };
  }
}