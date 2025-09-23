/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [templates, hooks, platform, cross-platform, generation]
 * @related: [platform-adapter.ts, hook-migrator.ts, types.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import type { Platform } from './types';

export interface HookTemplate {
  name: string;
  platform: Platform;
  content: string;
  description: string;
  executable: boolean;
}

export class PlatformTemplates {
  /**
   * Get all available hook templates for a platform
   */
  public getHookTemplates(platform: Platform): HookTemplate[] {
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
  public getHookTemplate(name: string, platform: Platform): HookTemplate | null {
    const templates = this.getHookTemplates(platform);
    return templates.find(template => template.name === name) || null;
  }

  /**
   * Generate hook content for specific platform
   */
  public generateHookContent(hookName: string, platform: Platform, customContent?: string): string {
    const template = this.getHookTemplate(hookName, platform);

    if (template) {
      return customContent ? this.insertCustomContent(template.content, customContent) : template.content;
    }

    // Return basic template if specific hook not found
    return this.getBasicTemplate(hookName, platform, customContent);
  }

  /**
   * Windows batch templates
   */
  private getWindowsTemplates(): HookTemplate[] {
    return [
      {
        name: 'post_tool_use',
        platform: 'windows',
        executable: true,
        description: 'Windows post-tool-use hook for ginko integration',
        content: `@echo off
REM Windows post-tool-use hook for ginko CLI
REM This hook is called after Claude uses a tool via MCP

REM Set error handling
setlocal enableextensions

REM Check if ginko is installed
where ginko >nul 2>&1
if %errorlevel% neq 0 (
    echo Ginko CLI not found in PATH
    exit /b 0
)

REM Check if we're in a git repository with ginko initialized
if not exist ".git" (
    echo Not in a git repository
    exit /b 0
)

if not exist ".ginko" (
    echo Ginko not initialized in this project
    exit /b 0
)

REM Custom logic goes here
REM Add your Windows-specific ginko integration

REM Example: Auto-capture context after tool use
echo Capturing context after tool use...
ginko capture-context --auto --quiet

REM Example: Update session state
ginko update-session --tool-used --quiet

echo Post-tool-use hook completed successfully
exit /b 0`
      },
      {
        name: 'pre_conversation',
        platform: 'windows',
        executable: true,
        description: 'Windows pre-conversation hook for ginko setup',
        content: `@echo off
REM Windows pre-conversation hook for ginko CLI
REM This hook is called before starting a conversation with Claude

setlocal enableextensions

REM Check ginko installation
where ginko >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Ginko CLI not found in PATH
    exit /b 0
)

REM Initialize ginko if in git repo but not initialized
if exist ".git" (
    if not exist ".ginko" (
        echo Initializing ginko for this project...
        ginko init --quiet
    )
)

REM Load project context
if exist ".ginko" (
    echo Loading project context...
    ginko start --quiet
)

echo Pre-conversation hook completed
exit /b 0`
      },
      {
        name: 'post_conversation',
        platform: 'windows',
        executable: true,
        description: 'Windows post-conversation hook for ginko cleanup',
        content: `@echo off
REM Windows post-conversation hook for ginko CLI
REM This hook is called after ending a conversation with Claude

setlocal enableextensions

REM Check if ginko is available
where ginko >nul 2>&1
if %errorlevel% neq 0 (
    exit /b 0
)

REM Save session if in ginko project
if exist ".ginko" (
    echo Saving conversation context...
    ginko handoff "Conversation completed" --quiet
)

echo Post-conversation hook completed
exit /b 0`
      }
    ];
  }

  /**
   * Unix shell templates (macOS and Linux)
   */
  private getUnixTemplates(): HookTemplate[] {
    return [
      {
        name: 'post_tool_use',
        platform: 'linux', // Also used for macOS
        executable: true,
        description: 'Unix post-tool-use hook for ginko integration',
        content: `#!/bin/bash
# Unix/macOS post-tool-use hook for ginko CLI
# This hook is called after Claude uses a tool via MCP

set -e  # Exit on error

# Check if ginko is installed
if ! command -v ginko >/dev/null 2>&1; then
    echo "Ginko CLI not found in PATH"
    exit 0
fi

# Check if we're in a git repository with ginko initialized
if [ ! -d ".git" ]; then
    echo "Not in a git repository"
    exit 0
fi

if [ ! -d ".ginko" ]; then
    echo "Ginko not initialized in this project"
    exit 0
fi

# Custom logic goes here
# Add your Unix-specific ginko integration

# Example: Auto-capture context after tool use
echo "Capturing context after tool use..."
ginko capture-context --auto --quiet

# Example: Update session state
ginko update-session --tool-used --quiet

echo "Post-tool-use hook completed successfully"
exit 0`
      },
      {
        name: 'pre_conversation',
        platform: 'linux', // Also used for macOS
        executable: true,
        description: 'Unix pre-conversation hook for ginko setup',
        content: `#!/bin/bash
# Unix/macOS pre-conversation hook for ginko CLI
# This hook is called before starting a conversation with Claude

set -e  # Exit on error

# Check ginko installation
if ! command -v ginko >/dev/null 2>&1; then
    echo "Warning: Ginko CLI not found in PATH"
    exit 0
fi

# Initialize ginko if in git repo but not initialized
if [ -d ".git" ] && [ ! -d ".ginko" ]; then
    echo "Initializing ginko for this project..."
    ginko init --quiet
fi

# Load project context
if [ -d ".ginko" ]; then
    echo "Loading project context..."
    ginko start --quiet
fi

echo "Pre-conversation hook completed"
exit 0`
      },
      {
        name: 'post_conversation',
        platform: 'linux', // Also used for macOS
        executable: true,
        description: 'Unix post-conversation hook for ginko cleanup',
        content: `#!/bin/bash
# Unix/macOS post-conversation hook for ginko CLI
# This hook is called after ending a conversation with Claude

set -e  # Exit on error

# Check if ginko is available
if ! command -v ginko >/dev/null 2>&1; then
    exit 0
fi

# Save session if in ginko project
if [ -d ".ginko" ]; then
    echo "Saving conversation context..."
    ginko handoff "Conversation completed" --quiet
fi

echo "Post-conversation hook completed"
exit 0`
      }
    ];
  }

  /**
   * Insert custom content into template
   */
  private insertCustomContent(template: string, customContent: string): string {
    const marker = platform === 'windows'
      ? 'REM Custom logic goes here'
      : '# Custom logic goes here';

    return template.replace(marker, customContent);
  }

  /**
   * Generate basic template for unknown hooks
   */
  private getBasicTemplate(hookName: string, platform: Platform, customContent?: string): string {
    if (platform === 'windows') {
      return `@echo off
REM Windows ${hookName} hook for ginko CLI
REM Generated automatically

setlocal enableextensions

REM Check if ginko is available
where ginko >nul 2>&1
if %errorlevel% neq 0 (
    echo Ginko CLI not found
    exit /b 0
)

${customContent || 'REM Add your custom logic here'}

echo ${hookName} hook completed
exit /b 0`;
    } else {
      return `#!/bin/bash
# Unix/macOS ${hookName} hook for ginko CLI
# Generated automatically

set -e

# Check if ginko is available
if ! command -v ginko >/dev/null 2>&1; then
    echo "Ginko CLI not found"
    exit 0
fi

${customContent || '# Add your custom logic here'}

echo "${hookName} hook completed"
exit 0`;
    }
  }

  /**
   * Get list of standard hook names
   */
  public getStandardHookNames(): string[] {
    return [
      'post_tool_use',
      'pre_conversation',
      'post_conversation',
      'on_error',
      'on_success'
    ];
  }

  /**
   * Validate hook name
   */
  public isValidHookName(name: string): boolean {
    // Allow alphanumeric, underscore, and hyphen
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  /**
   * Generate installation instructions for hooks
   */
  public getInstallationInstructions(platform: Platform): string {
    const config = platform === 'windows'
      ? {
          dir: '%USERPROFILE%\\.claude\\hooks',
          ext: '.bat',
          cmd: 'mkdir "%USERPROFILE%\\.claude\\hooks"'
        }
      : {
          dir: '~/.claude/hooks',
          ext: '.sh',
          cmd: 'mkdir -p ~/.claude/hooks'
        };

    return `Installation Instructions for ${platform.charAt(0).toUpperCase() + platform.slice(1)}:

1. Create the hooks directory:
   ${config.cmd}

2. Create your hook file:
   ${config.dir}/your_hook_name${config.ext}

3. ${platform === 'windows' ? 'Ensure the file is executable (Windows batch files are executable by default)' : 'Make the file executable:'}
   ${platform === 'windows' ? '' : `chmod +x ${config.dir}/your_hook_name${config.ext}`}

4. Test your hook:
   ${platform === 'windows' ? `${config.dir}\\your_hook_name${config.ext}` : `${config.dir}/your_hook_name${config.ext}`}

Standard hook names: ${this.getStandardHookNames().join(', ')}`;
  }
}

// Export singleton instance
export const platformTemplates = new PlatformTemplates();