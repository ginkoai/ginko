/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-04
 * @tags: [cli, auth, oauth, login, github, production]
 * @related: [logout.ts, auth-storage.ts, api/auth/cli/session/route.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [open, chalk, ora, crypto]
 */

import { randomUUID } from 'crypto';
import open from 'open';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import {
  saveAuthSession,
  isAuthenticated,
  getCurrentUser,
  type AuthSession
} from '../utils/auth-storage.js';

interface LoginOptions {
  force?: boolean;
}

/**
 * Login command - Authenticate CLI with GitHub via Supabase OAuth
 *
 * Production OAuth Flow:
 * 1. Generate unique session_id
 * 2. Open browser to dashboard authorize page
 * 3. Dashboard handles OAuth and stores session
 * 4. CLI polls dashboard for session tokens
 * 5. Generate long-lived API key from session
 * 6. Save API key locally
 */
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  // Check if already authenticated
  if (!options.force && await isAuthenticated()) {
    const user = await getCurrentUser();
    console.log(chalk.green('✓ Already authenticated'));
    console.log(chalk.dim(`  User: ${user?.email || user?.github_username || 'Unknown'}`));
    console.log(chalk.dim('\n  Use `ginko login --force` to re-authenticate'));
    return;
  }

  console.log(chalk.cyan('🔐 Authenticating Ginko CLI\n'));

  const spinner = ora('Starting authentication flow...').start();

  try {
    // Generate unique session ID for this login attempt
    const sessionId = randomUUID();

    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
    const authorizeUrl = `${apiUrl}/auth/cli/authorize?session_id=${sessionId}`;

    spinner.succeed('Session initialized');
    spinner.start('Opening browser for authentication...');

    // Open browser to dashboard authorize page
    await open(authorizeUrl);

    spinner.succeed('Browser opened');
    spinner.start('Waiting for authentication...');
    spinner.text = 'Complete authentication in your browser...';

    // Poll dashboard for session tokens
    const oauthSession = await pollForSession(sessionId, apiUrl, spinner);

    spinner.text = 'Generating API key...';

    // Generate long-lived API key
    const apiKeySession = await generateApiKey(oauthSession.access_token, apiUrl, oauthSession.user);

    // Save API key session locally
    await saveAuthSession(apiKeySession);

    spinner.succeed(chalk.green('Authentication successful!'));

    console.log(chalk.green('\n✓ Successfully authenticated'));
    console.log(chalk.dim(`  User: ${apiKeySession.user.email || apiKeySession.user.github_username}`));
    if (apiKeySession.user.github_username) {
      console.log(chalk.dim(`  GitHub: @${apiKeySession.user.github_username}`));
    }
    console.log(chalk.dim('\n  Your credentials are stored in ~/.ginko/auth.json'));

  } catch (error) {
    spinner.fail('Authentication failed');

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error(chalk.red('\n✗ Authentication timed out'));
        console.error(chalk.dim('  Please try again and complete authentication within 5 minutes'));
      } else if (error.message.includes('User denied')) {
        console.error(chalk.red('\n✗ Authentication was cancelled'));
        console.error(chalk.dim('  You cancelled the authentication request'));
      } else {
        console.error(chalk.red(`\n✗ ${error.message}`));
      }
    } else {
      console.error(chalk.red('\n✗ Unknown error occurred'));
    }

    process.exit(1);
  }
}

/**
 * OAuth session returned from dashboard (temporary tokens)
 */
interface OAuthSession {
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
 * Poll dashboard API for session tokens
 *
 * Polls every 2 seconds for up to 5 minutes
 */
async function pollForSession(
  sessionId: string,
  apiUrl: string,
  spinner: Ora
): Promise<OAuthSession> {
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = 150; // 5 minutes total (150 * 2s = 300s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const response = await fetch(
        `${apiUrl}/api/auth/cli/session?session_id=${sessionId}`
      );

      if (response.status === 200) {
        const data = await response.json() as OAuthSession;
        return data;
      }

      if (response.status === 404) {
        // Session not ready yet, continue polling
        const timeRemaining = Math.floor((maxAttempts - attempts) * pollInterval / 1000);
        spinner.text = `Waiting for authentication... (${timeRemaining}s remaining)`;
        await sleep(pollInterval);
        continue;
      }

      if (response.status === 410) {
        // Session expired or denied
        const error = await response.json().catch(() => ({ error: 'Session expired' })) as { error: string };
        throw new Error(error.error || 'Session expired');
      }

      // Other error - log details for debugging
      const errorBody = await response.text();
      console.error(`\nDebug: HTTP ${response.status} from ${apiUrl}/api/auth/cli/session`);
      console.error(`Response: ${errorBody}`);

      let errorMessage = 'Failed to retrieve session';
      try {
        const errorJson = JSON.parse(errorBody) as { error: string };
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Not JSON, use status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(errorMessage);

    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        // Network error, continue polling
        await sleep(pollInterval);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Authentication timeout - please try again');
}

/**
 * Generate long-lived API key from OAuth session
 */
async function generateApiKey(
  accessToken: string,
  apiUrl: string,
  user: OAuthSession['user']
): Promise<AuthSession> {
  const url = `${apiUrl}/api/generate-api-key`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    let errorMessage = 'Failed to generate API key';
    try {
      const errorJson = JSON.parse(errorBody) as { error: string };
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json() as { api_key: string };

  return {
    api_key: data.api_key,
    user,
  };
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
