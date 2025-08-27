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

export async function configCommand(key?: string, value?: string, options?: any) {
  try {
    const ginkoDir = await getGinkoDir();
    const configFile = path.join(ginkoDir, 'config.json');
    const config = await fs.readJSON(configFile);
    
    // List all config
    if (options?.list || (!key && !value)) {
      console.log(chalk.green('\n⚙️  Ginko Configuration\n'));
      console.log(JSON.stringify(config, null, 2));
      console.log(chalk.dim('\nConfig file: .ginko/config.json'));
      return;
    }
    
    // Get specific value
    if (key && !value && !options?.set) {
      const keys = key.split('.');
      let current = config;
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
      const keys = key.split('.');
      let current = config;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the value
      const lastKey = keys[keys.length - 1];
      const oldValue = current[lastKey];
      
      // Parse value if it's a boolean or number
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      current[lastKey] = parsedValue;
      
      // Save config
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
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}