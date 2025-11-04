/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-28
 * @tags: [cli, auth, oauth, login, github]
 * @related: [logout.ts, auth-storage.ts, api/auth/cli/route.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [http, open, chalk, ora]
 */

import http from 'http';
import { URL } from 'url';
import open from 'open';
import chalk from 'chalk';
import ora from 'ora';
import {
  saveAuthSession,
  isAuthenticated,
  getCurrentUser,
  type AuthSession
} from '../utils/auth-storage.js';

const CALLBACK_PORT = 8765;
const CALLBACK_PATH = '/callback';

interface LoginOptions {
  force?: boolean;
}

/**
 * Login command - Authenticate CLI with GitHub via Supabase OAuth
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
    // Start localhost callback server
    const { server, codePromise } = await startCallbackServer();

    spinner.succeed('Local callback server started');
    spinner.start('Getting OAuth configuration...');

    // Get OAuth URL from API
    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
    const redirectUri = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;

    const configResponse = await fetch(
      `${apiUrl}/api/auth/cli/config?redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    if (!configResponse.ok) {
      throw new Error('Failed to get OAuth configuration');
    }

    const { oauth_url: oauthUrl } = await configResponse.json() as { oauth_url: string };

    spinner.succeed('OAuth configuration retrieved');
    spinner.start('Opening browser for authentication...');

    // Open browser
    await open(oauthUrl);

    spinner.text = 'Waiting for authentication in browser...';

    // Wait for callback with timeout
    const code = await Promise.race([
      codePromise,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout')), 120000) // 2 minute timeout
      )
    ]);

    spinner.text = 'Exchanging code for tokens...';

    // Exchange code for session tokens
    const session = await exchangeCodeForSession(code, apiUrl);

    // Save session
    await saveAuthSession(session);

    spinner.succeed(chalk.green('Authentication successful!'));

    console.log(chalk.green('\n✓ Successfully authenticated'));
    console.log(chalk.dim(`  User: ${session.user.email || session.user.github_username}`));
    console.log(chalk.dim(`  GitHub: @${session.user.github_username || 'N/A'}`));
    console.log(chalk.dim('\n  Your credentials are stored in ~/.ginko/auth.json'));

    // Close server
    server.close();

  } catch (error) {
    spinner.fail('Authentication failed');

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error(chalk.red('\n✗ Authentication timed out'));
        console.error(chalk.dim('  Please try again and complete authentication within 2 minutes'));
      } else if (error.message.includes('EADDRINUSE')) {
        console.error(chalk.red('\n✗ Port already in use'));
        console.error(chalk.dim(`  Another process is using port ${CALLBACK_PORT}`));
        console.error(chalk.dim('  Please close any other Ginko login attempts and try again'));
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
 * Start localhost server to capture OAuth callback
 */
function startCallbackServer(): Promise<{
  server: http.Server;
  codePromise: Promise<string>;
}> {
  return new Promise((resolve, reject) => {
    let codeResolver: (code: string) => void;
    let codeRejecter: (error: Error) => void;

    const codePromise = new Promise<string>((res, rej) => {
      codeResolver = res;
      codeRejecter = rej;
    });

    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname === CALLBACK_PATH) {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          // Send error response to browser
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #dc2626;">Authentication Failed</h1>
                <p>${errorDescription || error}</p>
                <p style="color: #6b7280;">You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);

          codeRejecter(new Error(errorDescription || error));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #dc2626;">Missing Code</h1>
                <p>No authorization code received</p>
                <p style="color: #6b7280;">You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);

          codeRejecter(new Error('No authorization code received'));
          return;
        }

        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #10b981;">Authentication Successful!</h1>
              <p>You can close this window and return to your terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        // Resolve with code
        codeResolver(code);
      } else {
        // Unknown path
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.on('error', (error) => {
      reject(error);
    });

    server.listen(CALLBACK_PORT, 'localhost', () => {
      resolve({ server, codePromise });
    });
  });
}

/**
 * Exchange authorization code for session tokens
 */
async function exchangeCodeForSession(code: string, apiUrl: string): Promise<AuthSession> {
  const response = await fetch(`${apiUrl}/api/auth/cli`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string; details?: string };
    throw new Error(error.error || error.details || 'Failed to exchange code for session');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: AuthSession['user'];
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
  };
}
