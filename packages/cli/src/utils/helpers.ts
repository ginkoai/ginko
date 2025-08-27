/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, utils, helpers, git]
 * @priority: medium
 * @complexity: low
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export async function getGinkoDir(): Promise<string> {
  const projectRoot = process.cwd();
  const ginkoDir = path.join(projectRoot, '.ginko');
  
  if (!await fs.pathExists(ginkoDir)) {
    throw new Error('Ginko not initialized. Run `ginko init` first.');
  }
  
  return ginkoDir;
}

export async function getUserEmail(): Promise<string> {
  try {
    // Try git config first
    const email = execSync('git config user.email', { encoding: 'utf8' }).trim();
    if (email) return email;
  } catch (e) {
    // Git not configured
  }
  
  // Try config file
  try {
    const ginkoDir = await getGinkoDir();
    const config = await fs.readJSON(path.join(ginkoDir, 'config.json'));
    if (config.user?.email) return config.user.email;
  } catch (e) {
    // Config not found or invalid
  }
  
  return 'user@example.com';
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'just now';
}

export async function detectWorkMode(gitStatus: any): Promise<string> {
  const { modified, staged, not_added } = gitStatus;
  
  // Detect patterns
  const hasTests = modified.some((f: string) => f.includes('test') || f.includes('spec'));
  const hasMany = modified.length > 5;
  const hasConfig = modified.some((f: string) => 
    f.includes('config') || f.includes('package.json') || f.includes('tsconfig')
  );
  
  // Heuristic mode detection
  if (hasTests) return 'Testing';
  if (hasConfig) return 'Configuring';
  if (hasMany) return 'Refactoring';
  if (staged.length > 0) return 'Implementing';
  if (not_added.length > modified.length) return 'Exploring';
  
  return 'Developing';
}

export async function getProjectInfo(): Promise<{
  name: string;
  type: string;
  language: string;
}> {
  const projectRoot = process.cwd();
  
  // Check for package.json (Node project)
  if (await fs.pathExists(path.join(projectRoot, 'package.json'))) {
    const pkg = await fs.readJSON(path.join(projectRoot, 'package.json'));
    return {
      name: pkg.name || path.basename(projectRoot),
      type: 'node',
      language: 'javascript/typescript'
    };
  }
  
  // Check for other project types
  if (await fs.pathExists(path.join(projectRoot, 'Cargo.toml'))) {
    return { name: path.basename(projectRoot), type: 'rust', language: 'rust' };
  }
  
  if (await fs.pathExists(path.join(projectRoot, 'go.mod'))) {
    return { name: path.basename(projectRoot), type: 'go', language: 'go' };
  }
  
  if (await fs.pathExists(path.join(projectRoot, 'requirements.txt'))) {
    return { name: path.basename(projectRoot), type: 'python', language: 'python' };
  }
  
  return {
    name: path.basename(projectRoot),
    type: 'unknown',
    language: 'unknown'
  };
}