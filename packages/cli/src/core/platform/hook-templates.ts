/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-21
 * @tags: [hooks, templates, cross-platform, windows, macos, linux, path-config]
 * @related: [platform-adapter.ts, hook-migration.ts, path-config.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [platform-adapter, path-config]
 */

import { Platform } from './platform-adapter';
import { pathManager } from '../config/path-config.js';

export interface HookTemplate {
  name: string;
  platform: Platform;
  extension: string;
  content: string;
  description: string;
}

/**
 * Platform-specific hook templates for ginko integration
 * Now uses pathManager for configuration-based paths
 */
export class HookTemplates {
  /**
   * Get all available hook templates for a platform
   */
  static getTemplatesForPlatform(platform: Platform): HookTemplate[] {
    switch (platform) {
      case 'windows':
        return this.getWindowsTemplates();
      case 'macos':
      case 'linux':
        return this.getUnixTemplates();
      default:
        return this.getUnixTemplates();
    }
  }

  /**
   * Get specific hook template by name and platform
   */
  static getTemplate(hookName: string, platform: Platform): HookTemplate | null {
    const templates = this.getTemplatesForPlatform(platform);
    return templates.find(t => t.name === hookName) || null;
  }

  /**
   * Get template with dynamic path variables substituted
   */
  static getTemplateWithPaths(hookName: string, platform: Platform): HookTemplate | null {
    const template = this.getTemplate(hookName, platform);
    if (!template) return null;

    // Get paths from pathManager
    const pathConfig = pathManager.getConfig();
    const tempDir = platform === 'windows'
      ? process.env.TEMP || 'C:\\\\temp'
      : '/tmp';

    // Replace path variables in template content
    let content = template.content;
    content = content.replace(/\\.ginko/g, pathManager.getRelativePath(pathConfig.ginko.root));
    content = content.replace(/\/tmp\/ginko-\*/g, `${tempDir}/ginko-*`);

    return {
      ...template,
      content
    };
  }

  /**
   * Windows batch script templates
   */
  private static getWindowsTemplates(): HookTemplate[] {
    return [
      {
        name: 'session_start',
        platform: 'windows',
        extension: '.bat',
        description: 'Executes when a Claude session starts',
        content: `@echo off
REM Ginko session-start hook for Windows
REM This script runs when a Claude session starts

echo Starting ginko session on Windows...

REM Example: Load previous session context
if exist "{{GINKO_ROOT}}" (
    ginko start --resume
) else (
    echo No previous session found, starting fresh
)

REM Example: Set environment variables
set GINKO_SESSION_START=%DATE% %TIME%

REM Example: Log session start
echo Session started at %GINKO_SESSION_START% >> "{{GINKO_ROOT}}\\sessions\\session.log"

exit 0`
      },
      {
        name: 'session_end',
        platform: 'windows',
        extension: '.bat',
        description: 'Executes when a Claude session ends',
        content: `@echo off
REM Ginko session-end hook for Windows
REM This script runs when a Claude session ends

echo Ending ginko session on Windows...

REM Example: Save session data
if exist "{{GINKO_ROOT}}" (
    ginko handoff --auto "Session ended on Windows"
)

REM Example: Cleanup temporary files
del /q "{{TEMP_DIR}}\\ginko-*" 2>nul

REM Example: Log session end
echo Session ended at %DATE% %TIME% >> "{{GINKO_ROOT}}\\sessions\\session.log"

exit 0`
      },
      {
        name: 'pre_commit',
        platform: 'windows',
        extension: '.bat',
        description: 'Executes before git commits',
        content: `@echo off
REM Ginko pre-commit hook for Windows
REM This script runs before git commits

echo Running ginko pre-commit checks...

REM Example: Update context before commit
if exist "{{GINKO_ROOT}}" (
    ginko context --update
)

REM Example: Run tests if they exist
if exist "package.json" (
    npm test
    if errorlevel 1 (
        echo Tests failed, commit aborted
        exit 1
    )
)

echo Pre-commit checks passed
exit 0`
      },
      {
        name: 'post_commit',
        platform: 'windows',
        extension: '.bat',
        description: 'Executes after git commits',
        content: `@echo off
REM Ginko post-commit hook for Windows
REM This script runs after git commits

echo Running ginko post-commit actions...

REM Example: Update session with commit info
if exist "{{GINKO_ROOT}}" (
    for /f "delims=" %%i in ('git log -1 --pretty=format:"%%h %%s"') do set LAST_COMMIT=%%i
    echo Last commit: !LAST_COMMIT! >> "{{GINKO_ROOT}}\\sessions\\commits.log"
)

exit 0`
      }
    ];
  }

  /**
   * Unix shell script templates (macOS/Linux)
   */
  private static getUnixTemplates(): HookTemplate[] {
    return [
      {
        name: 'session_start',
        platform: 'linux',
        extension: '.sh',
        description: 'Executes when a Claude session starts',
        content: `#!/bin/bash
# Ginko session-start hook for Unix systems (macOS/Linux)
# This script runs when a Claude session starts

set -e

echo "Starting ginko session on $(uname)..."

# Example: Load previous session context
if [ -d "{{GINKO_ROOT}}" ]; then
    ginko start --resume
else
    echo "No previous session found, starting fresh"
fi

# Example: Set environment variables
export GINKO_SESSION_START="$(date)"

# Example: Log session start
echo "Session started at $GINKO_SESSION_START" >> "{{GINKO_ROOT}}/sessions/session.log"

exit 0`
      },
      {
        name: 'session_end',
        platform: 'linux',
        extension: '.sh',
        description: 'Executes when a Claude session ends',
        content: `#!/bin/bash
# Ginko session-end hook for Unix systems (macOS/Linux)
# This script runs when a Claude session ends

set -e

echo "Ending ginko session on $(uname)..."

# Example: Save session data
if [ -d "{{GINKO_ROOT}}" ]; then
    ginko handoff --auto "Session ended on $(uname)"
fi

# Example: Cleanup temporary files
rm -f "{{TEMP_DIR}}/ginko-*"

# Example: Platform-specific cleanup
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS-specific cleanup
    :
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux-specific cleanup
    :
fi

exit 0`
      },
      {
        name: 'pre_commit',
        platform: 'linux',
        extension: '.sh',
        description: 'Executes before git commits',
        content: `#!/bin/bash
# Ginko pre-commit hook for Unix systems (macOS/Linux)
# This script runs before git commits

set -e

echo "Running ginko pre-commit checks..."

# Example: Update context before commit
if [ -d "{{GINKO_ROOT}}" ]; then
    ginko context --update
fi

# Example: Run tests if they exist
if [ -f "package.json" ]; then
    npm test
fi

echo "Pre-commit checks passed"
exit 0`
      },
      {
        name: 'post_commit',
        platform: 'linux',
        extension: '.sh',
        description: 'Executes after git commits',
        content: `#!/bin/bash
# Ginko post-commit hook for Unix systems (macOS/Linux)
# This script runs after git commits

set -e

echo "Running ginko post-commit actions..."

# Example: Update session with commit info
if [ -d "{{GINKO_ROOT}}" ]; then
    LAST_COMMIT=$(git log -1 --pretty=format:"%h %s")
    echo "Last commit: $LAST_COMMIT" >> "{{GINKO_ROOT}}/sessions/commits.log"
fi

exit 0`
      }
    ];
  }

  /**
   * Get default hook template content for a platform with path substitution
   */
  static getDefaultTemplate(platform: Platform): string {
    const pathConfig = pathManager.getConfig();
    const ginkoRoot = pathManager.getRelativePath(pathConfig.ginko.root);
    const tempDir = platform === 'windows'
      ? process.env.TEMP || 'C:\\\\temp'
      : '/tmp';

    switch (platform) {
      case 'windows':
        return `@echo off
REM Ginko hook for Windows
REM Replace this with your custom logic

echo Ginko hook executed on Windows

REM Check if ginko is available
if exist "${ginkoRoot}" (
    echo Ginko directory found
) else (
    echo Ginko not initialized
)

exit 0`;

      default:
        return `#!/bin/bash
# Ginko hook for Unix systems (macOS/Linux)
# Replace this with your custom logic

set -e

echo "Ginko hook executed on $(uname)"

# Check if ginko is available
if [ -d "${ginkoRoot}" ]; then
    echo "Ginko directory found"
else
    echo "Ginko not initialized"
fi

exit 0`;
    }
  }

  /**
   * Get available hook names for a platform
   */
  static getAvailableHooks(platform: Platform): string[] {
    const templates = this.getTemplatesForPlatform(platform);
    return templates.map(t => t.name);
  }

  /**
   * Validate hook template content
   */
  static validateTemplate(template: HookTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('Hook name is required');
    }

    if (!template.content || template.content.trim() === '') {
      errors.push('Hook content is required');
    }

    if (template.platform === 'windows' && !template.content.includes('@echo off')) {
      errors.push('Windows batch scripts should start with "@echo off"');
    }

    if ((template.platform === 'linux' || template.platform === 'macos') &&
        !template.content.includes('#!/bin/bash')) {
      errors.push('Unix shell scripts should start with "#!/bin/bash"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}