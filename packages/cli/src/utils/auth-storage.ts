/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-06
 * @tags: [auth, storage, api-key, cli, security]
 * @related: [commands/login.ts, commands/logout.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra, os]
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface AuthSession {
  api_key: string;  // Long-lived gk_ key
  user: {
    id: string;
    email: string;
    github_username?: string;
    github_id?: string;
    full_name?: string;
  };
}

/**
 * Get the path to the auth configuration file
 */
export function getAuthFilePath(): string {
  const homeDir = os.homedir();
  const ginkoDir = path.join(homeDir, '.ginko');
  return path.join(ginkoDir, 'auth.json');
}

/**
 * Ensure the .ginko directory exists
 */
async function ensureGinkoDir(): Promise<void> {
  const homeDir = os.homedir();
  const ginkoDir = path.join(homeDir, '.ginko');
  await fs.ensureDir(ginkoDir);

  // Set restrictive permissions (owner only)
  try {
    await fs.chmod(ginkoDir, 0o700);
  } catch (error) {
    // Ignore chmod errors on Windows
    if (process.platform !== 'win32') {
      throw error;
    }
  }
}

/**
 * Save authentication session to disk
 */
export async function saveAuthSession(session: AuthSession): Promise<void> {
  await ensureGinkoDir();
  const authPath = getAuthFilePath();

  await fs.writeJson(authPath, session, { spaces: 2 });

  // Set restrictive permissions on auth file (owner only)
  try {
    await fs.chmod(authPath, 0o600);
  } catch (error) {
    // Ignore chmod errors on Windows
    if (process.platform !== 'win32') {
      throw error;
    }
  }
}

/**
 * Load authentication session from disk
 */
export async function loadAuthSession(): Promise<AuthSession | null> {
  const authPath = getAuthFilePath();

  if (!await fs.pathExists(authPath)) {
    return null;
  }

  try {
    const session = await fs.readJson(authPath);
    return session;
  } catch (error) {
    console.error('Error reading auth session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await loadAuthSession();
  return session !== null;
}

/**
 * Get the current API key
 * Checks environment variable first, then falls back to stored session
 */
export async function getAccessToken(): Promise<string | null> {
  // Check environment variable first (takes precedence)
  if (process.env.GINKO_API_KEY) {
    return process.env.GINKO_API_KEY;
  }

  // Fall back to stored session
  const session = await loadAuthSession();

  if (!session) {
    return null;
  }

  return session.api_key;
}

/**
 * Clear the authentication session (logout)
 */
export async function clearAuthSession(): Promise<void> {
  const authPath = getAuthFilePath();

  if (await fs.pathExists(authPath)) {
    await fs.remove(authPath);
  }
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<AuthSession['user'] | null> {
  const session = await loadAuthSession();
  return session?.user || null;
}
