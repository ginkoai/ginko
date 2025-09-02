/**
 * Ginko Agent for Cursor
 * Custom AI agent for context management and session handoffs
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class GinkoAgent {
  constructor() {
    this.workspace = process.cwd();
    this.ginkoDir = path.join(this.workspace, '.ginko');
  }

  /**
   * Start a new session
   */
  async start(args, context) {
    try {
      // Execute ginko start
      await this.exec('ginko start');
      
      // Load current session
      const session = await this.loadCurrentSession();
      
      if (session) {
        return {
          success: true,
          message: `🌿 Session started!\n\nPrevious context loaded:\n- Last work: ${session.lastTask || 'None'}\n- Branch: ${session.branch || 'unknown'}\n\nReady to continue.`
        };
      }
      
      return {
        success: true,
        message: '🌿 New session started! No previous context found.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start session: ${error.message}`
      };
    }
  }

  /**
   * Create a handoff
   */
  async handoff(args, context) {
    try {
      const message = args.join(' ') || 'Session progress';
      
      // Execute ginko handoff
      await this.exec(`ginko handoff "${message}"`);
      
      // Get git status
      const gitStatus = await this.getGitStatus();
      
      return {
        success: true,
        message: `✅ Handoff saved!\n\n**Message**: ${message}\n\n**Git Status**:\n- Modified: ${gitStatus.modified} files\n- Branch: ${gitStatus.branch}\n\nHandoff saved to .ginko/sessions/`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create handoff: ${error.message}`
      };
    }
  }

  /**
   * Vibecheck - quick realignment
   */
  async vibecheck(args, context) {
    const session = await this.loadCurrentSession();
    
    let response = `🎯 **Vibecheck**\n\nLet's recalibrate:\n\n`;
    response += `1. **What are we actually trying to achieve?**\n`;
    response += `2. **Is this the right approach?**\n`;
    response += `3. **Should we pivot?**\n\n`;
    
    if (session && session.currentTask) {
      response += `**Current Task**: ${session.currentTask}\n\n`;
    }
    
    response += `**Next Steps**:\n`;
    response += `- Clarify the goal\n`;
    response += `- Agree on approach\n`;
    response += `- Continue with fresh perspective`;
    
    return {
      success: true,
      message: response
    };
  }

  /**
   * Load context modules
   */
  async context(args, context) {
    try {
      const modulesDir = path.join(this.ginkoDir, 'context', 'modules');
      const files = await fs.readdir(modulesDir);
      
      let response = `📚 **Available Context Modules**\n\n`;
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(modulesDir, file), 'utf-8');
          const name = file.replace('.md', '');
          
          // Extract metadata
          const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
          const tags = tagsMatch ? tagsMatch[1] : 'none';
          
          response += `**${name}**\n`;
          response += `- Tags: ${tags}\n`;
          response += `- Path: .ginko/context/modules/${file}\n\n`;
        }
      }
      
      return {
        success: true,
        message: response
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load context: ${error.message}`
      };
    }
  }

  // Helper methods
  
  async loadCurrentSession() {
    try {
      const sessionsDir = path.join(this.ginkoDir, 'sessions');
      const dirs = await fs.readdir(sessionsDir);
      
      for (const dir of dirs) {
        const currentPath = path.join(sessionsDir, dir, 'current.md');
        try {
          const content = await fs.readFile(currentPath, 'utf-8');
          
          // Parse session metadata
          const session = {};
          const lines = content.split('\n');
          
          for (const line of lines) {
            if (line.includes('session_id:')) {
              session.id = line.split(':')[1].trim();
            } else if (line.includes('branch:')) {
              session.branch = line.split(':')[1].trim();
            } else if (line.includes('Next session:')) {
              session.lastTask = line.replace('Next session:', '').trim();
            }
          }
          
          return session;
        } catch {
          // Try next directory
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  async getGitStatus() {
    try {
      const branch = await this.exec('git branch --show-current');
      const status = await this.exec('git status --porcelain');
      const lines = status.split('\n').filter(Boolean);
      
      return {
        branch: branch.trim(),
        modified: lines.filter(l => l.startsWith(' M')).length,
        staged: lines.filter(l => l.startsWith('M ')).length,
        untracked: lines.filter(l => l.startsWith('??')).length
      };
    } catch {
      return { branch: 'unknown', modified: 0, staged: 0, untracked: 0 };
    }
  }
  
  exec(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.workspace }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }
}

// Export for Cursor
module.exports = new GinkoAgent();