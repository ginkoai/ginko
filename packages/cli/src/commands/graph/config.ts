/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, config, storage]
 * @related: [init.ts, load.ts, status.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs-extra]
 */

import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../../utils/helpers.js';

export interface GraphConfig {
  version: string;
  graphId: string;
  namespace: string;
  projectName: string;
  visibility: 'private' | 'organization' | 'public';
  apiEndpoint: string;
  documents: {
    adr: { enabled: boolean; path: string };
    prd: { enabled: boolean; path: string };
    patterns: { enabled: boolean; path: string };
    sessions: { enabled: boolean; path: string };
  };
  hashes: Record<string, string>;
  lastSync: string;
}

/**
 * Get path to graph config file
 */
export async function getGraphConfigPath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  return path.join(ginkoDir, 'graph', 'config.json');
}

/**
 * Load graph configuration
 */
export async function loadGraphConfig(): Promise<GraphConfig | null> {
  const configPath = await getGraphConfigPath();

  if (!await fs.pathExists(configPath)) {
    return null;
  }

  try {
    return await fs.readJson(configPath);
  } catch (error) {
    console.error('Error reading graph config:', error);
    return null;
  }
}

/**
 * Save graph configuration
 */
export async function saveGraphConfig(config: GraphConfig): Promise<void> {
  const configPath = await getGraphConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Check if graph is initialized
 */
export async function isGraphInitialized(): Promise<boolean> {
  const config = await loadGraphConfig();
  return config !== null && !!config.graphId;
}

/**
 * Get graph ID from config
 */
export async function getGraphId(): Promise<string | null> {
  const config = await loadGraphConfig();
  return config?.graphId || null;
}

/**
 * Update document hash
 */
export async function updateDocumentHash(filePath: string, hash: string): Promise<void> {
  const config = await loadGraphConfig();

  if (!config) {
    throw new Error('Graph not initialized. Run "ginko graph init" first.');
  }

  config.hashes[filePath] = hash;
  config.lastSync = new Date().toISOString();

  await saveGraphConfig(config);
}

/**
 * Get document hash
 */
export async function getDocumentHash(filePath: string): Promise<string | null> {
  const config = await loadGraphConfig();
  return config?.hashes[filePath] || null;
}

/**
 * Create default graph config
 */
export function createDefaultConfig(
  graphId: string,
  namespace: string,
  projectName: string,
  visibility: 'private' | 'organization' | 'public' = 'private'
): GraphConfig {
  return {
    version: '1.0',
    graphId,
    namespace,
    projectName,
    visibility,
    apiEndpoint: process.env.GINKO_API_URL || 'https://api.ginko.ai',
    documents: {
      adr: { enabled: true, path: 'docs/adr' },
      prd: { enabled: true, path: 'docs/PRD' },
      patterns: { enabled: true, path: '.ginko/context/modules' },
      sessions: { enabled: true, path: '.ginko/sessions' },
    },
    hashes: {},
    lastSync: new Date().toISOString(),
  };
}
