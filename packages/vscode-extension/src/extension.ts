/**
 * @fileType: extension
 * @status: current
 * @updated: 2025-08-28
 * @tags: [vscode, extension, chat-participant, copilot]
 * @priority: critical
 * @complexity: high
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Try to find ginko CLI in various locations
async function findGinkoCLI(): Promise<string> {
  const possiblePaths = [
    'ginko', // Global installation
    './node_modules/.bin/ginko', // Local node_modules
    path.join(__dirname, '../../cli/dist/index.js'), // Development path
    path.join(__dirname, '../../../cli/dist/index.js'), // Alternative dev path
  ];
  
  for (const ginkPath of possiblePaths) {
    try {
      await execAsync(`${ginkPath} --version`);
      return ginkPath;
    } catch {
      // Try next path
    }
  }
  
  // If no CLI found, we'll use mock responses
  return '';
}

let ginkoCLI = '';

/**
 * Ginko VS Code Extension
 * Works with: VS Code, Cursor, GitHub Copilot, Continue, Windsurf
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Ginko extension activating...');

  // Find ginko CLI
  ginkoCLI = await findGinkoCLI();
  if (!ginkoCLI) {
    console.warn('Ginko CLI not found - running in mock mode');
    vscode.window.showWarningMessage('Ginko CLI not found. Install with: npm install -g @ginkoai/cli');
  }

  // Register as Chat Participant for Copilot/Cursor integration
  const participant = vscode.chat.createChatParticipant('ginko', ginkoHandler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'ginko-icon.svg');
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ginko.start', startSession),
    vscode.commands.registerCommand('ginko.handoff', createHandoff),
    vscode.commands.registerCommand('ginko.vibecheck', vibecheck),
    vscode.commands.registerCommand('ginko.initializeCursor', initializeCursor),
    vscode.commands.registerCommand('ginko.uninstallCursor', uninstallCursor),
    vscode.commands.registerCommand('ginko.initializeCopilot', initializeCopilot),
    vscode.commands.registerCommand('ginko.uninstallCopilot', uninstallCopilot),
    participant
  );

  // Auto-inject context on activation
  if (vscode.workspace.getConfiguration('ginko').get('autoLoadContext')) {
    loadContextInBackground();
  }
  
  console.log('Ginko extension activated successfully');
}

async function initializeCursor() {
  try {
    // 1) Run CLI preview (non-destructive)
    const cli = ginkoCLI || 'ginko';
    try {
      await execAsync(`${cli} init-cursor --preview`);
    } catch (e) {
      // Fallback to dev path run via node if CLI not found
      console.warn('Falling back: running bundled CLI dev path');
      const devCli = path.join(__dirname, '../../cli/dist/index.js');
      await execAsync(`node ${devCli} init-cursor --preview`);
    }

    // 2) Read generated .cursorrules and copy to clipboard
    const cursorrulesPath = path.join(vscode.workspace.rootPath || process.cwd(), '.ginko', 'generated', '.cursorrules');
    const content = await fs.readFile(cursorrulesPath, 'utf8');
    await vscode.env.clipboard.writeText(content);

    // 3) Show next steps with action buttons
    const selection = await vscode.window.showInformationMessage(
      'Ginko: Cursor setup preview ready. Rules copied to clipboard. Open Custom Modes settings to paste?',
      'Open Instructions',
      'Dismiss'
    );

    if (selection === 'Open Instructions') {
      const guidePath = path.join(vscode.workspace.rootPath || process.cwd(), '.ginko', 'generated', 'CURSOR-SETUP-STEPS.md');
      const doc = await vscode.workspace.openTextDocument(guidePath);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Ginko initialization failed: ${error?.message || error}`);
  }
}

async function uninstallCursor() {
  try {
    const selection = await vscode.window.showWarningMessage(
      'Ginko: Remove Cursor integration? This will delete .cursorrules and .ginko/generated/',
      'Remove Files Only',
      'Remove + Revert Git',
      'Cancel'
    );

    if (selection === 'Cancel') return;

    const cli = ginkoCLI || 'ginko';
    const revertCommit = selection === 'Remove + Revert Git';
    
    try {
      const command = revertCommit ? 'uninstall-cursor --revert-commit' : 'uninstall-cursor --force';
      await execAsync(`${cli} ${command}`);
      
      vscode.window.showInformationMessage(
        'Ginko: Cursor integration removed successfully!'
      );
    } catch (e) {
      // Fallback to dev path
      const devCli = path.join(__dirname, '../../cli/dist/index.js');
      const command = revertCommit ? 'uninstall-cursor --revert-commit' : 'uninstall-cursor --force';
      await execAsync(`node ${devCli} ${command}`);
      
      vscode.window.showInformationMessage(
        'Ginko: Cursor integration removed successfully!'
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Ginko uninstall failed: ${error?.message || error}`);
  }
}

async function initializeCopilot() {
  try {
    // Show options to user
    const selection = await vscode.window.showQuickPick([
      { label: '👁️ Preview Mode', description: 'Generate files without applying', value: 'preview' },
      { label: '✅ Apply to Repository', description: 'Create .github/copilot-instructions.md and commit', value: 'apply' },
      { label: '⚙️ Workspace Settings Only', description: 'Update VS Code settings locally', value: 'workspace' }
    ], {
      placeHolder: 'How would you like to set up GitHub Copilot?'
    });

    if (!selection) return;

    const cli = ginkoCLI || 'ginko';
    let command = 'init-copilot';
    
    if (selection.value === 'apply') {
      command += ' --apply';
    } else if (selection.value === 'workspace') {
      command += ' --workspace';
    } else {
      command += ' --preview';
    }

    try {
      await execAsync(`${cli} ${command}`);
    } catch (e) {
      // Fallback to dev path
      const devCli = path.join(__dirname, '../../cli/dist/index.js');
      await execAsync(`node ${devCli} ${command}`);
    }

    // Show appropriate next steps based on selection
    if (selection.value === 'preview') {
      const docSelection = await vscode.window.showInformationMessage(
        'Ginko: GitHub Copilot preview generated in .ginko/generated/',
        'View Instructions',
        'View Copilot Instructions',
        'Dismiss'
      );

      if (docSelection === 'View Instructions') {
        const guidePath = path.join(vscode.workspace.rootPath || process.cwd(), '.ginko', 'generated', 'COPILOT-SETUP-GUIDE.md');
        const doc = await vscode.workspace.openTextDocument(guidePath);
        await vscode.window.showTextDocument(doc, { preview: false });
      } else if (docSelection === 'View Copilot Instructions') {
        const instructionsPath = path.join(vscode.workspace.rootPath || process.cwd(), '.ginko', 'generated', 'copilot-instructions.md');
        const doc = await vscode.workspace.openTextDocument(instructionsPath);
        await vscode.window.showTextDocument(doc, { preview: false });
      }
    } else if (selection.value === 'apply') {
      vscode.window.showInformationMessage(
        'Ginko: GitHub Copilot configured successfully! Files created in .github/ and .vscode/'
      );
    } else if (selection.value === 'workspace') {
      vscode.window.showInformationMessage(
        'Ginko: Workspace settings updated for GitHub Copilot!'
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Ginko Copilot initialization failed: ${error?.message || error}`);
  }
}

async function uninstallCopilot() {
  try {
    const selection = await vscode.window.showWarningMessage(
      'Ginko: Remove GitHub Copilot integration?',
      'Remove Files Only',
      'Remove + Revert Git',
      'Cancel'
    );

    if (selection === 'Cancel') return;

    const cli = ginkoCLI || 'ginko';
    const revertCommit = selection === 'Remove + Revert Git';
    
    try {
      const command = revertCommit ? 'uninstall-copilot --revert-commit' : 'uninstall-copilot --force';
      await execAsync(`${cli} ${command}`);
      
      vscode.window.showInformationMessage(
        'Ginko: GitHub Copilot integration removed successfully!'
      );
    } catch (e) {
      // Fallback to dev path
      const devCli = path.join(__dirname, '../../cli/dist/index.js');
      const command = revertCommit ? 'uninstall-copilot --revert-commit' : 'uninstall-copilot --force';
      await execAsync(`node ${devCli} ${command}`);
      
      vscode.window.showInformationMessage(
        'Ginko: GitHub Copilot integration removed successfully!'
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Ginko Copilot uninstall failed: ${error?.message || error}`);
  }
}

/**
 * Chat participant handler - responds to @ginko mentions
 */
async function ginkoHandler(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  
  // Parse command from request
  const command = request.prompt.split(' ')[0].toLowerCase();
  
  switch (command) {
    case '/start':
      await handleStartCommand(stream, token);
      break;
      
    case '/handoff':
      await handleHandoffCommand(request.prompt, stream, token);
      break;
      
    case '/vibecheck':
      await handleVibecheckCommand(stream, token);
      break;
      
    case '/context':
      await handleContextCommand(stream, token);
      break;
      
    default:
      // Default behavior: provide context about current session
      await provideSessionContext(request.prompt, stream, token);
  }
}

/**
 * Handle /start command
 */
async function handleStartCommand(
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    if (!ginkoCLI) {
      stream.markdown(`## 🌿 Ginko Session (Mock Mode)\n\n`);
      stream.markdown(`⚠️ Ginko CLI not installed. Install with:\n\n`);
      stream.markdown(`\`\`\`bash\nnpm install -g @ginkoai/cli\n\`\`\`\n\n`);
      stream.markdown(`Once installed, reload the window to use full features.\n`);
      return;
    }
    
    // Run ginko start CLI command
    const { stdout } = await execAsync(`${ginkoCLI} start`);
    
    // Load current session
    const session = await loadCurrentSession();
    
    stream.markdown(`## 🌿 Ginko Session Started\n\n`);
    
    if (session) {
      stream.markdown(`### Previous Context Loaded:\n`);
      stream.markdown(`- **Last work**: ${session.lastTask || 'No previous task'}\n`);
      stream.markdown(`- **Key files**: ${session.keyFiles?.join(', ') || 'None'}\n`);
      stream.markdown(`- **Decisions**: ${session.decisions?.length || 0} technical decisions\n\n`);
    }
    
    stream.markdown(`### Ready to Continue\n`);
    stream.markdown(`Use \`@ginko /handoff\` to save your progress at any time.\n`);
    
    // Add context references
    if (session?.handoffPath) {
      stream.reference(vscode.Uri.file(session.handoffPath));
    }
  } catch (error) {
    stream.markdown(`❌ Error starting session: ${error}\n`);
  }
}

/**
 * Handle /handoff command
 */
async function handleHandoffCommand(
  prompt: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    // Extract message from prompt
    const message = prompt.replace('/handoff', '').trim();
    
    // Run ginko handoff with message
    const command = message 
      ? `ginko handoff "${message}"`
      : 'ginko handoff';
      
    const { stdout } = await execAsync(command);
    
    stream.markdown(`## ✅ Handoff Saved\n\n`);
    stream.markdown(`**Message**: ${message || 'Session progress saved'}\n\n`);
    
    // Get git status summary
    const gitStatus = await getGitStatus();
    stream.markdown(`### Git Status:\n`);
    stream.markdown(`- Modified: ${gitStatus.modified} files\n`);
    stream.markdown(`- Staged: ${gitStatus.staged} files\n`);
    stream.markdown(`- Branch: ${gitStatus.branch}\n\n`);
    
    stream.markdown(`💡 **Tip**: Your handoff is saved in \`.ginko/sessions/\`\n`);
  } catch (error) {
    stream.markdown(`❌ Error creating handoff: ${error}\n`);
  }
}

/**
 * Handle /vibecheck command
 */
async function handleVibecheckCommand(
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  stream.markdown(`## 🎯 Vibecheck\n\n`);
  stream.markdown(`Let's recalibrate:\n\n`);
  
  stream.markdown(`1. **What are we actually trying to achieve?**\n`);
  stream.markdown(`2. **Is this the right approach?**\n`);
  stream.markdown(`3. **Should we pivot?**\n\n`);
  
  // Load current context
  const session = await loadCurrentSession();
  if (session?.currentTask) {
    stream.markdown(`### Current Task:\n`);
    stream.markdown(`${session.currentTask}\n\n`);
  }
  
  stream.markdown(`### Next Steps:\n`);
  stream.markdown(`- Clarify the goal\n`);
  stream.markdown(`- Agree on approach\n`);
  stream.markdown(`- Continue with fresh perspective\n`);
}

/**
 * Handle /context command
 */
async function handleContextCommand(
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    const modules = await loadContextModules();
    
    stream.markdown(`## 📚 Available Context Modules\n\n`);
    
    for (const module of modules) {
      stream.markdown(`### ${module.name}\n`);
      stream.markdown(`- **Tags**: ${module.tags?.join(', ') || 'none'}\n`);
      stream.markdown(`- **Priority**: ${module.priority || 'normal'}\n`);
      
      // Add reference to module file
      stream.reference(vscode.Uri.file(module.path));
    }
    
    stream.markdown(`\n💡 **Tip**: Click on modules above to view their content\n`);
  } catch (error) {
    stream.markdown(`❌ Error loading context: ${error}\n`);
  }
}

/**
 * Provide general session context
 */
async function provideSessionContext(
  prompt: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  const session = await loadCurrentSession();
  
  if (!session) {
    stream.markdown(`No active ginko session. Use \`@ginko /start\` to begin.\n`);
    return;
  }
  
  stream.markdown(`## Current Ginko Context\n\n`);
  stream.markdown(`**Session**: ${session.id}\n`);
  stream.markdown(`**Started**: ${session.timestamp}\n`);
  stream.markdown(`**Mode**: ${session.mode || 'development'}\n\n`);
  
  if (session.summary) {
    stream.markdown(`### Summary:\n${session.summary}\n\n`);
  }
  
  if (session.keyAchievements?.length > 0) {
    stream.markdown(`### Key Achievements:\n`);
    session.keyAchievements.forEach((achievement: string) => {
      stream.markdown(`- ${achievement}\n`);
    });
  }
  
  // Reference handoff file for full context
  if (session.handoffPath) {
    stream.reference(vscode.Uri.file(session.handoffPath));
  }
}

// Helper Functions

async function loadCurrentSession(): Promise<any> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) return null;
    
    const ginkoDir = path.join(workspaceRoot, '.ginko');
    const sessionsDir = path.join(ginkoDir, 'sessions');
    
    // Find user directory
    const dirs = await fs.readdir(sessionsDir);
    const userDir = dirs[0]; // TODO: Better user detection
    
    const currentPath = path.join(sessionsDir, userDir, 'current.md');
    const content = await fs.readFile(currentPath, 'utf-8');
    
    // Parse frontmatter and content
    const lines = content.split('\n');
    const session: any = { handoffPath: currentPath };
    
    // Simple frontmatter parsing
    let inFrontmatter = false;
    for (const line of lines) {
      if (line === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (inFrontmatter && line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        session[key] = value;
      }
    }
    
    return session;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

async function loadContextModules(): Promise<any[]> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) return [];
    
    const modulesDir = path.join(workspaceRoot, '.ginko', 'context', 'modules');
    const files = await fs.readdir(modulesDir);
    
    const modules = [];
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(modulesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Parse module metadata
        const module: any = {
          name: file.replace('.md', ''),
          path: filePath
        };
        
        // Extract tags and priority from frontmatter
        const tagMatch = content.match(/tags:\s*\[(.*?)\]/);
        if (tagMatch) {
          module.tags = tagMatch[1].split(',').map(s => s.trim());
        }
        
        const priorityMatch = content.match(/priority:\s*(\w+)/);
        if (priorityMatch) {
          module.priority = priorityMatch[1];
        }
        
        modules.push(module);
      }
    }
    
    return modules;
  } catch (error) {
    console.error('Error loading modules:', error);
    return [];
  }
}

async function getGitStatus(): Promise<any> {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    const lines = stdout.split('\n').filter(Boolean);
    
    return {
      modified: lines.filter(l => l.startsWith(' M')).length,
      staged: lines.filter(l => l.startsWith('M ')).length,
      untracked: lines.filter(l => l.startsWith('??')).length,
      branch: (await execAsync('git branch --show-current')).stdout.trim()
    };
  } catch (error) {
    return { modified: 0, staged: 0, untracked: 0, branch: 'unknown' };
  }
}

async function loadContextInBackground(): Promise<void> {
  // This runs on extension activation to pre-load context
  if (!ginkoCLI) {
    console.log('Ginko CLI not found - skipping background context load');
    return;
  }
  
  try {
    await execAsync(`${ginkoCLI} start --quiet`);
    console.log('Ginko context loaded in background');
  } catch (error) {
    console.error('Failed to load ginko context:', error);
  }
}

// Command implementations for palette
async function startSession(): Promise<void> {
  try {
    await execAsync('ginko start');
    vscode.window.showInformationMessage('Ginko session started');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start session: ${error}`);
  }
}

async function createHandoff(): Promise<void> {
  const message = await vscode.window.showInputBox({
    prompt: 'Handoff message (optional)',
    placeHolder: 'What were you working on?'
  });
  
  try {
    const command = message 
      ? `ginko handoff "${message}"`
      : 'ginko handoff';
    await execAsync(command);
    vscode.window.showInformationMessage('Handoff saved successfully');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create handoff: ${error}`);
  }
}

async function vibecheck(): Promise<void> {
  const items = [
    '✅ Continue - we\'re on track',
    '🔄 Pivot - let\'s change direction',
    '🤔 Discuss - need clarification'
  ];
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'How are we doing?'
  });
  
  if (selected?.includes('Pivot')) {
    const newDirection = await vscode.window.showInputBox({
      prompt: 'What should we focus on instead?'
    });
    if (newDirection) {
      await execAsync(`ginko handoff "Pivoting to: ${newDirection}"`);
      vscode.window.showInformationMessage('Direction updated');
    }
  }
}

export function deactivate() {
  console.log('Ginko extension deactivated');
}