/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, client, config, environment, settings]
 * @related: [client.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, path, os, dotenv]
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';

export interface ConfigOptions {
  serverUrl: string;
  apiKey?: string;
  userId: string;
  teamId: string;
  projectId: string;
  timeout?: number;
}

export class Config {
  public readonly serverUrl: string;
  public readonly apiKey?: string;
  public readonly userId: string;
  public readonly teamId: string;
  public readonly projectId: string;
  public readonly timeout: number;

  constructor() {
    // Load environment variables
    dotenv.config();
    
    // Try to load from config file first, then environment variables, then defaults
    const config = this.loadFromFile() || this.loadFromEnv() || this.getDefaults();
    
    this.serverUrl = config.serverUrl;
    this.apiKey = config.apiKey;
    this.userId = config.userId;
    this.teamId = config.teamId;
    this.projectId = config.projectId;
    this.timeout = config.timeout || 30000;

    this.validateConfig();
  }

  private loadFromFile(): ConfigOptions | null {
    try {
      const configPath = join(homedir(), '.ginko', 'config.json');
      const configData = require(configPath);
      return configData;
    } catch (error) {
      // Config file doesn't exist or is invalid, fall back to env vars
      return null;
    }
  }

  private loadFromEnv(): ConfigOptions | null {
    const serverUrl = process.env.GINKO_MCP_SERVER_URL;
    const userId = process.env.GINKO_USER_ID;
    const teamId = process.env.GINKO_TEAM_ID;
    const projectId = process.env.GINKO_PROJECT_ID;

    if (!serverUrl || !userId || !teamId || !projectId) {
      return null;
    }

    return {
      serverUrl,
      apiKey: process.env.GINKO_API_KEY,
      userId,
      teamId,
      projectId,
      timeout: process.env.GINKO_TIMEOUT ? parseInt(process.env.GINKO_TIMEOUT) : undefined
    };
  }

  private getDefaults(): ConfigOptions {
    // Extract project name from current directory
    const cwd = process.cwd();
    const projectName = cwd.split('/').pop() || 'unknown-project';
    
    return {
      serverUrl: 'https://mcp.ginko.ai',
      userId: this.requireValidUserId(),
      teamId: 'default-team',
      projectId: projectName,
      timeout: 30000
    };
  }

  private requireValidUserId(): string {
    // Never allow "current-user" placeholder - require proper UUID
    const envUserId = process.env.GINKO_USER_ID;
    if (envUserId && envUserId !== 'current-user' && this.isValidUUID(envUserId)) {
      return envUserId;
    }
    
    throw new Error(
      'Valid User ID is required. Please:\n' +
      '1. Authenticate via GitHub OAuth at https://app.ginko.ai\n' +
      '2. Get your API key from Settings\n' +
      '3. Set GINKO_USER_ID environment variable to your UUID\n' +
      '4. Or create ~/.ginko/config.json with your user details\n\n' +
      'Found: ' + (envUserId || 'undefined') + ' (must be valid UUID)'
    );
  }

  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private validateConfig(): void {
    if (!this.serverUrl) {
      throw new Error('Server URL is required. Set GINKO_MCP_SERVER_URL environment variable or create ~/.ginko/config.json');
    }

    if (!this.userId) {
      throw new Error('User ID is required. Set GINKO_USER_ID environment variable or create ~/.ginko/config.json');
    }

    if (!this.teamId) {
      throw new Error('Team ID is required. Set GINKO_TEAM_ID environment variable or create ~/.ginko/config.json');
    }

    if (!this.projectId) {
      throw new Error('Project ID is required. Set GINKO_PROJECT_ID environment variable or create ~/.ginko/config.json');
    }

    // Validate URL format
    try {
      new URL(this.serverUrl);
    } catch (error) {
      throw new Error(`Invalid server URL: ${this.serverUrl}`);
    }
  }

  /**
   * Create a configuration file in the user's home directory
   */
  static async createConfigFile(config: ConfigOptions): Promise<void> {
    const configDir = join(homedir(), '.ginko');
    const configPath = join(configDir, 'config.json');

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get example configuration for documentation
   */
  static getExampleConfig(): ConfigOptions {
    return {
      serverUrl: 'https://mcp.ginko.ai',
      apiKey: 'your-api-key-here',
      userId: 'your-user-id',
      teamId: 'your-team-id',  
      projectId: 'your-project-id',
      timeout: 30000
    };
  }
}