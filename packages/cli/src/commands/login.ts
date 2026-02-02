/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-06
 * @tags: [cli, auth, device-flow, login, github, production]
 * @related: [logout.ts, auth-storage.ts, api/auth/device/*]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [open, chalk, ora]
 */

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

interface DeviceInitResponse {
  device_id: string;
  user_code: string;
  expires_in: number;
  verification_uri: string;
}

interface DeviceStatusResponse {
  status: 'pending' | 'authorized' | 'expired' | 'denied';
  message?: string;
  api_key?: string;
  user?: {
    id: string;
    email?: string;
    github_username?: string;
  };
}

/**
 * Login command - Authenticate CLI with Device Code Flow
 *
 * Device Code Flow (like GitHub CLI):
 * 1. CLI requests device code from API
 * 2. Display code to user
 * 3. Open browser to verification page
 * 4. User logs in (if needed) and enters code
 * 5. CLI polls for authorization
 * 6. Receive API key when authorized
 */
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  // Check if already authenticated
  if (!options.force && await isAuthenticated()) {
    const user = await getCurrentUser();
    console.log(chalk.green('✓ Already authenticated'));
    console.log(chalk.dim(`  User: ${user?.email || user?.github_username || 'Unknown'}`));
    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.cyan('  ginko create <name>') + chalk.dim('  Create a new project'));
    console.log(chalk.cyan('  ginko init') + chalk.dim('          Initialize Ginko in existing project'));
    console.log(chalk.dim('\n  (Or use `ginko login --force` to re-authenticate)\n'));
    process.exit(0);
  }

  console.log(chalk.cyan('🔐 Authenticating Ginko CLI\n'));

  const spinner = ora('Initializing device authentication...').start();

  try {
    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

    // Step 1: Request device code
    const initResponse = await fetch(`${apiUrl}/api/auth/device/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({ error: 'Failed to initialize' })) as { error: string };
      throw new Error(errorData.error || 'Failed to initialize device authentication');
    }

    const deviceData = await initResponse.json() as DeviceInitResponse;

    spinner.succeed('Device code generated');

    // Step 2: Display code to user
    console.log('\n' + chalk.bold('  Enter this code in your browser:\n'));
    console.log(chalk.bgWhite.black.bold(`    ${deviceData.user_code}    `));
    console.log();

    // Step 3: Open browser
    spinner.start('Opening browser...');
    await open(deviceData.verification_uri);
    spinner.succeed('Browser opened');

    console.log(chalk.dim(`\n  Verification URL: ${deviceData.verification_uri}`));
    console.log();

    // Step 4: Poll for authorization
    spinner.start('Waiting for authorization...');

    const authResult = await pollForAuthorization(
      deviceData.device_id,
      apiUrl,
      deviceData.expires_in,
      spinner
    );

    // Step 5: Save credentials
    const session: AuthSession = {
      api_key: authResult.api_key!,
      user: {
        id: authResult.user!.id,
        email: authResult.user!.email || '',
        github_username: authResult.user!.github_username
      }
    };

    await saveAuthSession(session);

    spinner.succeed(chalk.green('Authentication successful!'));

    console.log(chalk.green('\n✓ Successfully authenticated'));
    console.log(chalk.dim(`  User: ${session.user.email || session.user.github_username}`));
    if (session.user.github_username) {
      console.log(chalk.dim(`  GitHub: @${session.user.github_username}`));
    }
    console.log(chalk.dim('  Your credentials are stored in ~/.ginko/auth.json'));

    // Sync current project's local.json if we're inside a ginko project (BUG-021)
    try {
      const { findGinkoRoot } = await import('../utils/ginko-root.js');
      const projectRoot = await findGinkoRoot();
      if (projectRoot) {
        const { syncLocalIdentity } = await import('../utils/identity.js');
        const ginkoDir = (await import('path')).default.join(projectRoot, '.ginko');
        const result = await syncLocalIdentity(ginkoDir);
        if (result.updated) {
          console.log(chalk.cyan(`\n✓ Updated project identity: ${result.oldEmail || '(unset)'} → ${result.newEmail}`));
        }
      }
    } catch {
      // Not in a ginko project or sync failed — that's fine
    }

    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.cyan('  ginko create <name>') + chalk.dim('  Create a new project'));
    console.log(chalk.cyan('  ginko init') + chalk.dim('          Initialize Ginko in existing project\n'));

    // Exit cleanly after successful authentication
    process.exit(0);

  } catch (error) {
    spinner.fail('Authentication failed');

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('expired')) {
        console.error(chalk.red('\n✗ Authentication timed out'));
        console.error(chalk.dim('  Please try again and complete authentication within 10 minutes'));
      } else if (error.message.includes('denied')) {
        console.error(chalk.red('\n✗ Authentication was denied'));
        console.error(chalk.dim('  You or someone else denied the authorization request'));
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
 * Poll for device authorization status
 */
async function pollForAuthorization(
  deviceId: string,
  apiUrl: string,
  expiresIn: number,
  spinner: Ora
): Promise<DeviceStatusResponse> {
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = Math.floor((expiresIn * 1000) / pollInterval);
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const response = await fetch(
        `${apiUrl}/api/auth/device/status?device_id=${deviceId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Device request not found. Please start over.');
        }
        throw new Error('Failed to check authorization status');
      }

      const data = await response.json() as DeviceStatusResponse;

      switch (data.status) {
        case 'authorized':
          return data;

        case 'pending':
          const timeRemaining = Math.floor((maxAttempts - attempts) * pollInterval / 1000);
          spinner.text = `Waiting for authorization... (${timeRemaining}s remaining)`;
          await sleep(pollInterval);
          continue;

        case 'expired':
          throw new Error('Authorization code expired. Please try again.');

        case 'denied':
          throw new Error('Authorization was denied.');

        default:
          await sleep(pollInterval);
          continue;
      }

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
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
