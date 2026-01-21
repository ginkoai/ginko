/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-21
 * @tags: [version, update, npm, notification]
 * @related: [start-reflection.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: [fs-extra, semver]
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// ES module compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package name for npm registry lookup
const PACKAGE_NAME = '@ginkoai/cli';

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

interface VersionCache {
  latestVersion: string;
  checkedAt: string;
}

/**
 * Get the path to the version cache file
 */
function getCacheFilePath(): string {
  return path.join(os.homedir(), '.ginko', 'version-cache.json');
}

/**
 * Get the current installed version
 * Reads from package.json relative to this module's location
 */
export function getCurrentVersion(): string {
  try {
    // When compiled, this file is at dist/utils/version-check.js
    // package.json is at the package root (../../ from here)
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const packageJson = fs.readJsonSync(packageJsonPath);
    return packageJson.version || '0.0.0';
  } catch {
    // Fallback: try to call ginko --version
    try {
      const { execSync } = require('child_process');
      const output = execSync('ginko --version', {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const match = output.match(/(\d+\.\d+\.\d+)/);
      if (match) return match[1];
    } catch {
      // Version check failed - non-critical
    }
  }
  return '0.0.0';
}

/**
 * Load cached version info
 */
async function loadCache(): Promise<VersionCache | null> {
  try {
    const cachePath = getCacheFilePath();
    if (await fs.pathExists(cachePath)) {
      const cache = await fs.readJson(cachePath);
      return cache as VersionCache;
    }
  } catch {
    // Cache read failed - will fetch fresh
  }
  return null;
}

/**
 * Save version info to cache
 */
async function saveCache(latestVersion: string): Promise<void> {
  try {
    const cachePath = getCacheFilePath();
    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeJson(cachePath, {
      latestVersion,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    // Cache write failed - non-critical
  }
}

/**
 * Check if cache is still valid (less than 24 hours old)
 */
function isCacheValid(cache: VersionCache): boolean {
  const checkedAt = new Date(cache.checkedAt).getTime();
  const now = Date.now();
  return (now - checkedAt) < CACHE_DURATION_MS;
}

/**
 * Fetch latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    // Use dynamic import for fetch (available in Node 18+)
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { version: string };
    return data.version;
  } catch {
    // Network error or timeout - non-critical
    return null;
  }
}

/**
 * Compare semver versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Check for updates and return notification message if available
 * Non-blocking, uses cache to avoid frequent npm requests
 */
export async function checkForUpdates(): Promise<string | null> {
  try {
    const currentVersion = getCurrentVersion();

    // Check cache first
    const cache = await loadCache();
    if (cache && isCacheValid(cache)) {
      // Use cached version
      if (compareVersions(currentVersion, cache.latestVersion) < 0) {
        return formatUpdateMessage(currentVersion, cache.latestVersion);
      }
      return null;
    }

    // Fetch latest version from npm
    const latestVersion = await fetchLatestVersion();
    if (!latestVersion) {
      return null; // Couldn't fetch - fail silently
    }

    // Save to cache
    await saveCache(latestVersion);

    // Compare versions
    if (compareVersions(currentVersion, latestVersion) < 0) {
      return formatUpdateMessage(currentVersion, latestVersion);
    }

    return null;
  } catch {
    // Version check failed - non-critical
    return null;
  }
}

/**
 * Format the update notification message
 */
function formatUpdateMessage(currentVersion: string, latestVersion: string): string {
  return chalk.yellow(`\n  Update available: ${chalk.dim(currentVersion)} → ${chalk.green(latestVersion)}\n`) +
         chalk.dim(`  Run ${chalk.cyan('npm update -g @ginkoai/cli')} to update\n`);
}

/**
 * Run version check in background (fire and forget)
 * Returns a promise that resolves to the message (or null)
 */
export function checkForUpdatesAsync(): Promise<string | null> {
  return checkForUpdates().catch(() => null);
}
