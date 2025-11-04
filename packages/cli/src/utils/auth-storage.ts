/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [auth, storage, token, cli, security]
 * @related: [commands/login.ts, commands/logout.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, os]
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
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
 * Check if the current session is expired
 */
export async function isSessionExpired(): Promise<boolean> {
  const session = await loadAuthSession();

  if (!session) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;

  // Consider expired if less than 5 minutes remaining
  return (expiresAt - now) < 300;
}

/**
 * Get the current access token (refresh if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await loadAuthSession();

  if (!session) {
    return null;
  }

  // Check if token is expired
  if (await isSessionExpired()) {
    // Token is expired, need to refresh
    const refreshed = await refreshAccessToken(session.refresh_token);
    if (refreshed) {
      return refreshed.access_token;
    }
    return null;
  }

  return session.access_token;
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<AuthSession | null> {
  try {
    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

    const response = await fetch(`${apiUrl}/api/auth/cli`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', response.statusText);
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    // Load current session to preserve user info
    const currentSession = await loadAuthSession();

    if (!currentSession) {
      return null;
    }

    const newSession: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: currentSession.user,
    };

    await saveAuthSession(newSession);

    return newSession;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
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
