/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, adapters, factory]
 * @priority: high
 * @complexity: low
 */

import { ClaudeAdapter } from './claude.js';
import { GPT4Adapter } from './gpt4.js';
import { UniversalAdapter } from './universal.js';
import { detectAIModel, getModelDefaults } from './detector.js';
import { AIAdapter, OutputOptions } from './base.js';
import fs from 'fs-extra';
import path from 'path';

let cachedAdapter: AIAdapter | null = null;

/**
 * Get the appropriate adapter for the current environment
 */
export async function getAdapter(forceDetect: boolean = false): Promise<AIAdapter> {
  if (cachedAdapter && !forceDetect) {
    return cachedAdapter;
  }
  
  // Load config if exists
  let configuredOptions: Partial<OutputOptions> = {};
  try {
    const ginkoDir = path.join(process.cwd(), '.ginko');
    if (await fs.pathExists(ginkoDir)) {
      const config = await fs.readJSON(path.join(ginkoDir, 'config.json'));
      if (config.ai?.output) {
        configuredOptions = config.ai.output;
      }
    }
  } catch (e) {
    // Config not found, use defaults
  }
  
  // Detect AI model
  const detected = detectAIModel();
  const defaults = getModelDefaults(detected.model);
  
  // Merge options (config overrides defaults)
  const options: OutputOptions = {
    ...defaults,
    ...configuredOptions
  } as OutputOptions;
  
  // Check for format override from command line
  if (process.env.GINKO_OUTPUT_FORMAT) {
    options.format = process.env.GINKO_OUTPUT_FORMAT as any;
  }
  
  // Create appropriate adapter
  switch (detected.model) {
    case 'claude':
      cachedAdapter = new ClaudeAdapter(options);
      break;
    
    case 'gpt4':
      cachedAdapter = new GPT4Adapter(options);
      break;
    
    default:
      cachedAdapter = new UniversalAdapter(options);
  }
  
  // Log detection if verbose
  if (process.env.GINKO_DEBUG) {
    console.log(`[Ginko] AI detected: ${detected.model} (confidence: ${detected.confidence})`);
    console.log(`[Ginko] Reason: ${detected.reason}`);
    console.log(`[Ginko] Output format: ${options.format}`);
  }
  
  return cachedAdapter;
}

// Export types and utilities
export { AIAdapter } from './base.js';
export { detectAIModel, getModelDefaults } from './detector.js';
export type { AIModel, AIEnvironment } from './detector.js';
export type { OutputOptions, SessionInfo, HandoffInfo } from './base.js';