/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [hooks, cross-platform, conversion, claude, scripts]
 * @related: [platform-detector.ts, path-normalizer.ts, index.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, path, platform-detector]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { PlatformDetector, Platform, Shell } from './platform-detector.js';
import { PathNormalizer } from './path-normalizer.js';

export interface HookInfo {
  name: string;
  originalPath: string;
  targetPath: string;
  originalContent: string;
  convertedContent: string;
  platform: Platform;
  shell: Shell;
  extension: string;
}

export interface ConversionResult {
  success: boolean;
  hooks: HookInfo[];
  errors: string[];
  warnings: string[];
  backupPath?: string;
}

export interface HookTemplate {
  name: string;
  description: string;
  shellScript: string;
  batchScript: string;
  powershellScript: string;
}

/**
 * Converts Claude Code hooks between different platforms
 * Handles .sh ↔ .bat ↔ .ps1 conversions with Claude-specific patterns
 */
export class HookAdapter {
  private platformDetector: PlatformDetector;
  private pathNormalizer: PathNormalizer;

  constructor() {
    this.platformDetector = new PlatformDetector();
    this.pathNormalizer = new PathNormalizer();
  }

  /**
   * Convert hooks to the current platform
   */
  async convertHooks(hooksDirectory: string): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: false,
      hooks: [],
      errors: [],
      warnings: []
    };

    try {
      const platformInfo = await this.platformDetector.detect();

      // Check if hooks directory exists
      if (!(await fs.pathExists(hooksDirectory))) {
        result.warnings.push(`Hooks directory does not exist: ${hooksDirectory}`);
        return result;
      }

      // Find all hook files
      const hookFiles = await this.findHookFiles(hooksDirectory);

      if (hookFiles.length === 0) {
        result.warnings.push('No hook files found to convert');
        result.success = true;
        return result;
      }

      // Create backup
      const backupPath = await this.createBackup(hooksDirectory);
      result.backupPath = backupPath;

      // Convert each hook
      for (const hookFile of hookFiles) {
        try {
          const hookInfo = await this.convertSingleHook(
            hookFile,
            hooksDirectory,
            platformInfo.platform,
            platformInfo.shell
          );

          if (hookInfo) {
            result.hooks.push(hookInfo);
          }
        } catch (error) {
          result.errors.push(`Failed to convert ${hookFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Generate platform-specific hook templates
   */
  async generateHookTemplates(hooksDirectory: string): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: false,
      hooks: [],
      errors: [],
      warnings: []
    };

    try {
      const platformInfo = await this.platformDetector.detect();
      await fs.ensureDir(hooksDirectory);

      const templates = this.getClaudeHookTemplates();

      for (const template of templates) {
        try {
          const hookPath = path.join(
            hooksDirectory,
            `${template.name}${platformInfo.scriptExtension}`
          );

          // Skip if hook already exists
          if (await fs.pathExists(hookPath)) {
            result.warnings.push(`Hook already exists: ${hookPath}`);
            continue;
          }

          const content = this.getTemplateForPlatform(template, platformInfo.platform, platformInfo.shell);
          await fs.writeFile(hookPath, content, 'utf8');

          // Make executable on Unix-like systems
          if (platformInfo.platform !== 'windows') {
            await fs.chmod(hookPath, 0o755);
          }

          result.hooks.push({
            name: template.name,
            originalPath: '',
            targetPath: hookPath,
            originalContent: '',
            convertedContent: content,
            platform: platformInfo.platform,
            shell: platformInfo.shell,
            extension: platformInfo.scriptExtension
          });

        } catch (error) {
          result.errors.push(`Failed to create template ${template.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Template generation failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Convert script content between platforms
   */
  convertScriptContent(content: string, fromPlatform: Platform, toPlatform: Platform, toShell?: Shell): string {
    if (fromPlatform === toPlatform) {
      return content;
    }

    // Unix to Windows conversion
    if ((fromPlatform === 'linux' || fromPlatform === 'macos') && toPlatform === 'windows') {
      if (toShell === 'powershell') {
        return this.convertUnixToPowerShell(content);
      } else {
        return this.convertUnixToBatch(content);
      }
    }

    // Windows to Unix conversion
    if (fromPlatform === 'windows' && (toPlatform === 'linux' || toPlatform === 'macos')) {
      if (this.isPowerShellScript(content)) {
        return this.convertPowerShellToUnix(content);
      } else {
        return this.convertBatchToUnix(content);
      }
    }

    return content;
  }

  /**
   * Find all hook files in directory
   */
  private async findHookFiles(directory: string): Promise<string[]> {
    const files = await fs.readdir(directory);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.sh', '.bat', '.ps1'].includes(ext);
    });
  }

  /**
   * Convert a single hook file
   */
  private async convertSingleHook(
    fileName: string,
    hooksDirectory: string,
    targetPlatform: Platform,
    targetShell: Shell
  ): Promise<HookInfo | null> {
    const filePath = path.join(hooksDirectory, fileName);
    const originalContent = await fs.readFile(filePath, 'utf8');

    const currentExt = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, currentExt);

    // Determine source platform
    const sourcePlatform = this.getPlatformFromExtension(currentExt);

    // Skip if already correct platform
    if (this.isCorrectPlatform(currentExt, targetPlatform, targetShell)) {
      return null;
    }

    // Convert content
    const convertedContent = this.convertScriptContent(
      originalContent,
      sourcePlatform,
      targetPlatform,
      targetShell
    );

    // Determine target extension
    const targetExtension = this.getExtensionForPlatform(targetPlatform, targetShell);
    const targetPath = path.join(hooksDirectory, `${baseName}${targetExtension}`);

    // Write converted file
    await fs.writeFile(targetPath, convertedContent, 'utf8');

    // Make executable on Unix-like systems
    if (targetPlatform !== 'windows') {
      await fs.chmod(targetPath, 0o755);
    }

    // Remove original if different
    if (targetPath !== filePath) {
      await fs.remove(filePath);
    }

    return {
      name: baseName,
      originalPath: filePath,
      targetPath,
      originalContent,
      convertedContent,
      platform: targetPlatform,
      shell: targetShell,
      extension: targetExtension
    };
  }

  /**
   * Create backup of hooks directory
   */
  private async createBackup(hooksDirectory: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${hooksDirectory}.backup.${timestamp}`;
    await fs.copy(hooksDirectory, backupPath);
    return backupPath;
  }

  /**
   * Get platform from file extension
   */
  private getPlatformFromExtension(extension: string): Platform {
    switch (extension.toLowerCase()) {
      case '.bat':
        return 'windows';
      case '.ps1':
        return 'windows';
      case '.sh':
      default:
        return 'linux'; // Default to linux for .sh and unknown
    }
  }

  /**
   * Check if file is already correct for target platform
   */
  private isCorrectPlatform(extension: string, targetPlatform: Platform, targetShell: Shell): boolean {
    if (targetPlatform === 'windows') {
      return (targetShell === 'powershell' && extension === '.ps1') ||
             (targetShell !== 'powershell' && extension === '.bat');
    } else {
      return extension === '.sh';
    }
  }

  /**
   * Get appropriate extension for platform and shell
   */
  private getExtensionForPlatform(platform: Platform, shell: Shell): string {
    if (platform === 'windows') {
      return shell === 'powershell' ? '.ps1' : '.bat';
    }
    return '.sh';
  }

  /**
   * Check if content is PowerShell script
   */
  private isPowerShellScript(content: string): boolean {
    const powershellIndicators = [
      'param(',
      '$_',
      'Write-Host',
      'Get-',
      'Set-',
      'New-',
      'Remove-',
      '[Parameter',
      'Process {',
      '-eq',
      '-ne',
      '-lt',
      '-gt'
    ];

    return powershellIndicators.some(indicator =>
      content.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Convert Unix shell script to Windows batch
   */
  private convertUnixToBatch(content: string): string {
    let converted = content;

    // Convert shebang
    converted = converted.replace(/^#!\/.*$/, '@echo off');

    // Convert echo commands
    converted = converted.replace(/echo\s+"([^"]+)"/g, 'echo $1');
    converted = converted.replace(/echo\s+'([^']+)'/g, 'echo $1');

    // Convert variable assignments
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]+)"$/gm, 'set $1=$2');
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*'([^']+)'$/gm, 'set $1=$2');
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*([^\s]+)$/gm, 'set $1=$2');

    // Convert variable references
    converted = converted.replace(/\$\{([^}]+)\}/g, '%$1%');
    converted = converted.replace(/\$([A-Z_][A-Z0-9_]*)/g, '%$1%');

    // Convert common commands
    converted = converted.replace(/\bls\b/g, 'dir');
    converted = converted.replace(/\bcp\b/g, 'copy');
    converted = converted.replace(/\bmv\b/g, 'move');
    converted = converted.replace(/\brm\b/g, 'del');
    converted = converted.replace(/\bcat\b/g, 'type');

    // Convert paths
    converted = this.pathNormalizer.convertPath(converted, 'linux', 'windows');

    // Add error handling
    if (!converted.includes('@echo off')) {
      converted = '@echo off\n' + converted;
    }

    return converted;
  }

  /**
   * Convert Unix shell script to PowerShell
   */
  private convertUnixToPowerShell(content: string): string {
    let converted = content;

    // Remove shebang
    converted = converted.replace(/^#!\/.*$/, '');

    // Convert echo commands
    converted = converted.replace(/echo\s+"([^"]+)"/g, 'Write-Host "$1"');
    converted = converted.replace(/echo\s+'([^']+)'/g, 'Write-Host \'$1\'');

    // Convert variable assignments
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]+)"$/gm, '$$$1 = "$2"');
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*'([^']+)'$/gm, '$$$1 = \'$2\'');
    converted = converted.replace(/^([A-Z_][A-Z0-9_]*)\s*=\s*([^\s]+)$/gm, '$$$1 = $2');

    // Convert variable references
    converted = converted.replace(/\$\{([^}]+)\}/g, '$$($$$1)');
    converted = converted.replace(/\$([A-Z_][A-Z0-9_]*)/g, '$$$1');

    // Convert common commands
    converted = converted.replace(/\bls\b/g, 'Get-ChildItem');
    converted = converted.replace(/\bcp\b/g, 'Copy-Item');
    converted = converted.replace(/\bmv\b/g, 'Move-Item');
    converted = converted.replace(/\brm\b/g, 'Remove-Item');
    converted = converted.replace(/\bcat\b/g, 'Get-Content');

    // Convert paths
    converted = this.pathNormalizer.convertPath(converted, 'linux', 'windows');

    return converted;
  }

  /**
   * Convert Windows batch to Unix shell
   */
  private convertBatchToUnix(content: string): string {
    let converted = content;

    // Add shebang
    if (!converted.startsWith('#!')) {
      converted = '#!/bin/bash\n' + converted;
    }

    // Remove @echo off
    converted = converted.replace(/@echo off\s*\n?/gi, '');

    // Convert set commands
    converted = converted.replace(/set\s+([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/gmi, '$1="$2"');

    // Convert variable references
    converted = converted.replace(/%([A-Z_][A-Z0-9_]*)%/g, '${$1}');

    // Convert common commands
    converted = converted.replace(/\bdir\b/g, 'ls');
    converted = converted.replace(/\bcopy\b/g, 'cp');
    converted = converted.replace(/\bmove\b/g, 'mv');
    converted = converted.replace(/\bdel\b/g, 'rm');
    converted = converted.replace(/\btype\b/g, 'cat');

    // Convert paths
    converted = this.pathNormalizer.convertPath(converted, 'windows', 'linux');

    return converted;
  }

  /**
   * Convert PowerShell to Unix shell
   */
  private convertPowerShellToUnix(content: string): string {
    let converted = content;

    // Add shebang
    if (!converted.startsWith('#!')) {
      converted = '#!/bin/bash\n' + converted;
    }

    // Convert variable assignments
    converted = converted.replace(/\$([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]+)"/gi, '$1="$2"');
    converted = converted.replace(/\$([A-Z_][A-Z0-9_]*)\s*=\s*'([^']+)'/gi, '$1=\'$2\'');

    // Convert Write-Host to echo
    converted = converted.replace(/Write-Host\s+"([^"]+)"/g, 'echo "$1"');
    converted = converted.replace(/Write-Host\s+'([^']+)'/g, 'echo \'$1\'');

    // Convert common PowerShell commands
    converted = converted.replace(/Get-ChildItem/g, 'ls');
    converted = converted.replace(/Copy-Item/g, 'cp');
    converted = converted.replace(/Move-Item/g, 'mv');
    converted = converted.replace(/Remove-Item/g, 'rm');
    converted = converted.replace(/Get-Content/g, 'cat');

    // Convert variable references
    converted = converted.replace(/\$\((\$[A-Z_][A-Z0-9_]*)\)/g, '${$1}');

    // Convert paths
    converted = this.pathNormalizer.convertPath(converted, 'windows', 'linux');

    return converted;
  }

  /**
   * Get Claude-specific hook templates
   */
  private getClaudeHookTemplates(): HookTemplate[] {
    return [
      {
        name: 'post_tool_use',
        description: 'Executes after Claude Code tool usage',
        shellScript: `#!/bin/bash
# Claude Code Post Tool Use Hook
# Executes after any tool is used in Claude Code

TOOL_NAME="$1"
STATUS="$2"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Tool used: $TOOL_NAME (Status: $STATUS)"

# Add your custom logic here
# Example: Log to file, send notifications, update tracking, etc.

# Log to ginko session if available
if command -v ginko &> /dev/null; then
    ginko log "Tool used: $TOOL_NAME (Status: $STATUS)"
fi

exit 0`,
        batchScript: `@echo off
REM Claude Code Post Tool Use Hook
REM Executes after any tool is used in Claude Code

set TOOL_NAME=%1
set STATUS=%2
set TIMESTAMP=%date% %time%

echo [%TIMESTAMP%] Tool used: %TOOL_NAME% (Status: %STATUS%)

REM Add your custom logic here
REM Example: Log to file, send notifications, update tracking, etc.

REM Log to ginko session if available
where ginko >nul 2>nul
if %errorlevel% equ 0 (
    ginko log "Tool used: %TOOL_NAME% (Status: %STATUS%)"
)

exit /b 0`,
        powershellScript: `# Claude Code Post Tool Use Hook
# Executes after any tool is used in Claude Code

param(
    [string]$ToolName,
    [string]$Status
)

$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$Timestamp] Tool used: $ToolName (Status: $Status)"

# Add your custom logic here
# Example: Log to file, send notifications, update tracking, etc.

# Log to ginko session if available
if (Get-Command ginko -ErrorAction SilentlyContinue) {
    ginko log "Tool used: $ToolName (Status: $Status)"
}

exit 0`
      },
      {
        name: 'pre_session_start',
        description: 'Executes before Claude Code session starts',
        shellScript: `#!/bin/bash
# Claude Code Pre Session Start Hook
# Executes before a new Claude Code session begins

SESSION_ID="$1"
WORKSPACE="$2"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting Claude Code session: $SESSION_ID in $WORKSPACE"

# Add your custom logic here
# Example: Environment setup, dependency checks, notifications, etc.

# Check git status
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git repository detected"
    git status --short
fi

exit 0`,
        batchScript: `@echo off
REM Claude Code Pre Session Start Hook
REM Executes before a new Claude Code session begins

set SESSION_ID=%1
set WORKSPACE=%2
set TIMESTAMP=%date% %time%

echo [%TIMESTAMP%] Starting Claude Code session: %SESSION_ID% in %WORKSPACE%

REM Add your custom logic here
REM Example: Environment setup, dependency checks, notifications, etc.

REM Check git status
git rev-parse --git-dir >nul 2>nul
if %errorlevel% equ 0 (
    echo Git repository detected
    git status --short
)

exit /b 0`,
        powershellScript: `# Claude Code Pre Session Start Hook
# Executes before a new Claude Code session begins

param(
    [string]$SessionId,
    [string]$Workspace
)

$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$Timestamp] Starting Claude Code session: $SessionId in $Workspace"

# Add your custom logic here
# Example: Environment setup, dependency checks, notifications, etc.

# Check git status
try {
    git rev-parse --git-dir 2>$null | Out-Null
    Write-Host "Git repository detected"
    git status --short
} catch {
    # Not a git repository
}

exit 0`
      }
    ];
  }

  /**
   * Get template content for specific platform
   */
  private getTemplateForPlatform(template: HookTemplate, platform: Platform, shell: Shell): string {
    if (platform === 'windows') {
      return shell === 'powershell' ? template.powershellScript : template.batchScript;
    } else {
      return template.shellScript;
    }
  }
}