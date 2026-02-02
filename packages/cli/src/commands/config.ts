/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, config, settings, privacy]
 * @priority: medium
 * @complexity: low
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

/**
 * Keys that are stored in .ginko/local.json (project-local identity config)
 * rather than .ginko/config.json (shared config)
 */
const LOCAL_CONFIG_KEYS = ['userEmail', 'userSlug', 'workMode'];

export async function configCommand(key?: string, value?: string, options?: any) {
  try {
    const ginkoDir = await getGinkoDir();
    const configFile = path.join(ginkoDir, 'config.json');
    const localFile = path.join(ginkoDir, 'local.json');
    const config = await fs.readJSON(configFile);

    // List all config
    if (options?.list || (!key && !value)) {
      console.log(chalk.green('\n⚙️  Ginko Configuration\n'));
      console.log(JSON.stringify(config, null, 2));
      console.log(chalk.dim('\nConfig file: .ginko/config.json'));

      // Also show local config if it exists
      if (await fs.pathExists(localFile)) {
        const localConfig = await fs.readJSON(localFile);
        console.log(chalk.green('\n📋 Local Configuration (project-specific)\n'));
        console.log(JSON.stringify(localConfig, null, 2));
        console.log(chalk.dim('\nLocal config file: .ginko/local.json'));
      }
      return;
    }

    // Determine if this key targets local.json
    const rootKey = key?.split('.')[0] || '';
    const isLocalKey = LOCAL_CONFIG_KEYS.includes(rootKey);

    // Get specific value
    if (key && !value && !options?.set) {
      const targetConfig = isLocalKey && await fs.pathExists(localFile)
        ? await fs.readJSON(localFile)
        : config;

      const keys = key.split('.');
      let current = targetConfig;
      for (const k of keys) {
        current = current[k];
        if (current === undefined) {
          console.log(chalk.yellow(`Config key not found: ${key}`));
          return;
        }
      }
      console.log(`${key}: ${JSON.stringify(current)}`);
      return;
    }

    // Set value
    if (key && value) {
      // Route to correct config file
      if (isLocalKey) {
        await setLocalConfig(localFile, key, value);
      } else {
        await setSharedConfig(configFile, config, key, value);
      }
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Set a value in .ginko/local.json (project-local config)
 */
async function setLocalConfig(localFile: string, key: string, value: string): Promise<void> {
  let localConfig: Record<string, any> = {};
  if (await fs.pathExists(localFile)) {
    localConfig = await fs.readJSON(localFile);
  }

  const keys = key.split('.');
  let current = localConfig;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  const oldValue = current[lastKey];

  // Parse value
  let parsedValue: any = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  current[lastKey] = parsedValue;

  // If setting userEmail, also update userSlug
  if (key === 'userEmail' && typeof parsedValue === 'string') {
    localConfig.userSlug = parsedValue.replace('@', '-at-').replace(/\./g, '-');
  }

  await fs.writeJSON(localFile, localConfig, { spaces: 2 });

  console.log(chalk.green(`✅ Local configuration updated`));
  console.log(`  ${key}: ${oldValue ?? '(unset)'} → ${parsedValue}`);
  console.log(chalk.dim('  File: .ginko/local.json'));
}

/**
 * Set a value in .ginko/config.json (shared config)
 */
async function setSharedConfig(
  configFile: string,
  config: Record<string, any>,
  key: string,
  value: string
): Promise<void> {
  const keys = key.split('.');
  let current = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  const oldValue = current[lastKey];

  // Parse value
  let parsedValue: any = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  current[lastKey] = parsedValue;

  await fs.writeJSON(configFile, config, { spaces: 2 });

  console.log(chalk.green(`✅ Configuration updated`));
  console.log(`  ${key}: ${oldValue} → ${parsedValue}`);

  // Special handling for privacy settings
  if (key.startsWith('privacy')) {
    if (key.includes('analytics') && parsedValue === true) {
      console.log(chalk.yellow('\n⚠️  Analytics enabled (anonymous only)'));
      console.log(chalk.dim('No code or file contents will be sent'));
      console.log(chalk.dim('Only anonymous metrics will be collected'));
    } else if (parsedValue === false) {
      console.log(chalk.green('\n🔐 Privacy setting disabled'));
      console.log(chalk.dim('No data will be sent to servers'));
    }
  }
}