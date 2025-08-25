/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, tools, context]
 * @related: [serverless-api, context-manager.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [@vercel/node, context-manager, best-practices, session-handoff]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  checkToolAccess,
  trackUsage,
  logToolCall,
  extractTeamAndProject,
  initializeDatabase
} from '../_utils.js';
import { ContextManager } from '../_lib/context-manager.js';
import BestPracticesManager from '../_lib/best-practices.js';
import SessionHandoffManager from '../_lib/session-handoff.js';
import SessionAnalytics from '../_lib/session-analytics.js';
import { DatabaseManager } from '../_lib/database.js';

// Enhanced context manager for team collaboration
class CollaborativeContextManager extends ContextManager {
  private teamId: string;
  private projectId: string;
  private userId: string;
  private db: DatabaseManager;

  constructor(teamId: string, projectId: string, userId: string, db: DatabaseManager) {
    super();
    this.teamId = teamId;
    this.projectId = projectId;
    this.userId = userId;
    this.db = db;
  }

  // Override base methods to add team collaboration features
  async getProjectOverview(projectPath?: string) {
    const startTime = Date.now();
    
    // Try to get cached context from database first
    const cachedContext = await this.db.getProjectContext(this.projectId, 'overview', projectPath || 'root');
    if (cachedContext && this.isContextFresh(cachedContext)) {
      console.log(`[DB] Using cached project overview for ${this.projectId}`);
      
      // Track activity in database
      await this.db.trackActivity(this.teamId, this.projectId, undefined, 'project_overview', { 
        projectPath, 
        source: 'cache',
        executionTime: Date.now() - startTime 
      });
      
      return cachedContext.contextData;
    }

    // Generate new context
    const result = await super.getProjectOverview(projectPath);
    
    // Add team context from database
    const teamInsights = await this.getTeamInsights();
    const bestPractices = await this.getTeamBestPracticesContext();
    
    const enhancedResult = {
      ...result,
      content: [
        ...result.content,
        {
          type: 'text',
          text: `\n## Team Context\n${teamInsights}`,
        },
        {
          type: 'text',
          text: `\n${bestPractices}`,
        }
      ]
    };

    // Cache the result in database
    await this.db.saveProjectContext(
      this.projectId,
      'overview',
      projectPath || 'root',
      enhancedResult,
      { generatedAt: new Date(), teamId: this.teamId },
      new Date(Date.now() + 1000 * 60 * 30) // Cache for 30 minutes
    );

    // Track activity in database
    await this.db.trackActivity(this.teamId, this.projectId, undefined, 'project_overview', { 
      projectPath, 
      source: 'generated',
      executionTime: Date.now() - startTime 
    });

    return enhancedResult;
  }

  private async getTeamInsights(): Promise<string> {
    try {
      const activities = await this.db.getTeamActivity(this.teamId, this.projectId, 24);
      const recentSessions = await this.db.getUserSessions(this.userId, this.teamId, 5);
      
      const insights = [
        `**Team Activity (Last 24h)**: ${activities.length} events`,
        `**Recent Sessions**: ${recentSessions.length} sessions`,
        `**Focus Areas**: ${activities.slice(0, 3).map(a => a.activityType).join(', ') || 'None'}`
      ];
      
      return insights.join('\n');
    } catch (error) {
      console.warn('[CONTEXT] Failed to get team insights:', error);
      return '**Team Context**: Available';
    }
  }

  private async getTeamBestPracticesContext(): Promise<string> {
    try {
      const practices = await this.db.getTeamBestPractices(this.teamId);
      const criticalPractices = practices.filter(p => p.priority === 'critical');
      
      if (criticalPractices.length === 0) {
        return '\n## Best Practices\nNo critical practices defined for this team.';
      }
      
      return BestPracticesManager.formatPracticesForContext(criticalPractices);
    } catch (error) {
      console.warn('[CONTEXT] Failed to get best practices:', error);
      return '\n## Best Practices\nBest practices context unavailable.';
    }
  }

  private isContextFresh(contextData: any): boolean {
    if (!contextData.expiresAt) return false;
    return new Date() < new Date(contextData.expiresAt);
  }
}

// Global context managers cache
let contextManagers: Map<string, CollaborativeContextManager> = new Map();

async function getContextManager(teamId: string, projectId: string, userId: string, db: DatabaseManager): Promise<CollaborativeContextManager> {
  const contextKey = `${teamId}:${projectId}:${userId}`;
  let contextManager = contextManagers.get(contextKey);
  
  if (!contextManager) {
    console.log(`[VERCEL] Creating new context manager for ${contextKey}`);
    contextManager = new CollaborativeContextManager(teamId, projectId, userId, db);
    contextManagers.set(contextKey, contextManager);
  }
  
  return contextManager;
}

// Individual tool handler functions

// Helper functions for formatting best practices
function formatBestPracticesForDisplay(practices: any[], category?: string, priority?: string): string {
  const filteredPractices = practices.filter(p => {
    if (priority && p.tags && !p.tags.some((tag: string) => tag.toLowerCase() === priority.toLowerCase())) {
      return false;
    }
    return true;
  });

  let output = `# Best Practices 📋\n\n`;
  
  if (category) {
    output += `**Category**: ${category}\n`;
  }
  if (priority) {
    output += `**Priority**: ${priority}\n`;
  }
  
  output += `**Found**: ${filteredPractices.length} practice${filteredPractices.length !== 1 ? 's' : ''}\n\n`;

  filteredPractices.forEach((practice, index) => {
    output += `## ${index + 1}. ${practice.name}\n\n`;
    output += `**Author**: ${practice.author_name}\n`;
    output += `**Visibility**: ${practice.visibility}\n`;
    
    if (practice.tags && practice.tags.length > 0) {
      output += `**Tags**: ${practice.tags.join(', ')}\n`;
    }
    
    output += `**Usage**: ${practice.usage_count || 0} views, ${practice.adoption_count || 0} adoptions\n\n`;
    output += `${practice.description}\n\n`;
    
    if (practice.syntax) {
      output += `### Example:\n\`\`\`\n${practice.syntax}\n\`\`\`\n\n`;
    }
    
    output += `---\n\n`;
  });

  return output;
}

function formatBestPracticeSuggestions(practices: any[], scenario: string, codeContext?: string): string {
  let output = `# Best Practice Suggestions for "${scenario}" 💡\n\n`;
  
  if (codeContext) {
    output += `**Code Context**: Provided\n\n`;
  }
  
  output += `**Found**: ${practices.length} relevant practice${practices.length !== 1 ? 's' : ''}\n\n`;

  practices.slice(0, 5).forEach((practice, index) => {
    output += `## ${index + 1}. ${practice.name}\n\n`;
    output += `**Author**: ${practice.author_name} | **Usage**: ${practice.usage_count || 0} views\n\n`;
    
    if (practice.tags && practice.tags.length > 0) {
      output += `**Tags**: ${practice.tags.join(', ')}\n\n`;
    }
    
    output += `${practice.description}\n\n`;
    
    if (practice.syntax) {
      output += `### Example:\n\`\`\`\n${practice.syntax}\n\`\`\`\n\n`;
    }
    
    output += `---\n\n`;
  });

  if (practices.length > 5) {
    output += `*... and ${practices.length - 5} more practices available*\n\n`;
  }

  return output;
}

async function getBestPractices(db: DatabaseManager, teamId: string, category?: string, priority?: string) {
  try {
    // Query the new best practices marketplace API
    let query = '';
    const params = new URLSearchParams();
    
    if (category) {
      params.append('tags', category.toLowerCase());
    }
    
    // Get both public and organization practices
    params.append('visibility', 'all');
    params.append('limit', '50');
    params.append('sort', 'usage');
    
    if (params.toString()) {
      query = '?' + params.toString();
    }
    
    // Call our own API (internal request) - always use production URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
      : 'https://mcp.ginko.ai';
    
    const response = await fetch(`${baseUrl}/api/best-practices${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Best practices API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const practices = data.best_practices || [];
    
    if (practices.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '# Best Practices 📋\n\nNo best practices found for the specified criteria.\n\n**Tip**: You can create best practices using the marketplace API or browse public practices from the community!'
        }]
      };
    }

    // Format practices for display
    const formatted = formatBestPracticesForDisplay(practices, category, priority);
    
    return {
      content: [{
        type: 'text',
        text: formatted
      }]
    };
  } catch (error) {
    console.error('Error fetching best practices:', error);
    return {
      content: [{
        type: 'text',
        text: '# Best Practices 📋\n\n❌ Error loading best practices. Please try again later.'
      }]
    };
  }
}

async function suggestBestPractice(db: DatabaseManager, teamId: string, scenario: string, codeContext?: string) {
  try {
    // Search best practices marketplace for relevant suggestions
    const params = new URLSearchParams();
    params.append('q', scenario);
    params.append('visibility', 'all');
    params.append('limit', '20');
    params.append('sort', 'usage');
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/best-practices?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Best practices search error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const practices = data.best_practices || [];
    
    let suggestions: string;
    if (practices.length > 0) {
      suggestions = formatBestPracticeSuggestions(practices, scenario, codeContext);
    } else {
      suggestions = `# Best Practice Suggestions for "${scenario}" 💡

No specific practices found for this scenario in the marketplace. Consider these general approaches:

- **Follow existing patterns**: Look at similar code in your codebase
- **Test thoroughly**: Write tests before implementing changes  
- **Handle errors gracefully**: Include proper error handling
- **Document your approach**: Add comments explaining complex logic
- **Consider security**: Validate inputs and sanitize outputs

**Tip**: You can create and share best practices for this scenario to help your team and the community!`;
    }
    
    return {
      content: [{
        type: 'text',
        text: suggestions
      }]
    };
  } catch (error) {
    console.error('Error suggesting best practices:', error);
    return {
      content: [{
        type: 'text',
        text: `# Best Practice Suggestions for "${scenario}" 💡\n\n❌ Error loading suggestions. Please try again later.`
      }]
    };
  }
}

// New marketplace tool handlers
async function searchBestPractices(args: any) {
  try {
    const params = new URLSearchParams();
    
    if (args.query) params.append('q', args.query);
    if (args.tags) params.append('tags', Array.isArray(args.tags) ? args.tags.join(',') : args.tags);
    if (args.author) params.append('author', args.author);
    if (args.visibility) params.append('visibility', args.visibility);
    if (args.sort) params.append('sort', args.sort);
    if (args.limit) params.append('limit', args.limit.toString());
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/best-practices?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const practices = data.best_practices || [];
    
    let output = `# Best Practices Search Results 🔍\n\n`;
    output += `**Query**: ${args.query || 'All practices'}\n`;
    if (args.tags) output += `**Tags**: ${Array.isArray(args.tags) ? args.tags.join(', ') : args.tags}\n`;
    if (args.author) output += `**Author**: ${args.author}\n`;
    output += `**Found**: ${practices.length} result${practices.length !== 1 ? 's' : ''}\n\n`;
    
    practices.forEach((practice: any, index: number) => {
      output += `## ${index + 1}. ${practice.name}\n\n`;
      output += `**Author**: ${practice.author_name} | **Visibility**: ${practice.visibility}\n`;
      output += `**Usage**: ${practice.usage_count || 0} views, ${practice.adoption_count || 0} adoptions\n`;
      if (practice.tags && practice.tags.length > 0) {
        output += `**Tags**: ${practice.tags.join(', ')}\n`;
      }
      output += `\n${practice.description}\n\n`;
      if (practice.syntax) {
        output += `### Example:\n\`\`\`\n${practice.syntax}\n\`\`\`\n\n`;
      }
      output += `**ID**: \`${practice.id}\` (for adoption)\n\n---\n\n`;
    });
    
    if (practices.length === 0) {
      output += 'No practices found matching your criteria. Try different search terms or create a new practice!';
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    console.error('Error searching best practices:', error);
    return {
      content: [{
        type: 'text',
        text: `# Search Error 🔍\n\n❌ Failed to search best practices: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

async function createBestPractice(args: any, user: any) {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/best-practices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.apiKey || 'dev-token'}`,
        'X-User-ID': user.id || 'dev-user'
      },
      body: JSON.stringify({
        name: args.name,
        description: args.description,
        syntax: args.syntax,
        tags: args.tags || [],
        visibility: args.visibility || 'private',
        author_id: user.id || 'dev-user',
        author_name: user.name || 'Development User',
        author_avatar: user.avatar,
        author_github_url: user.githubUrl,
        organization_id: user.organizationId
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Creation failed: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    const practice = data.best_practice;
    
    let output = `# Best Practice Created ✅\n\n`;
    output += `**Name**: ${practice.name}\n`;
    output += `**Visibility**: ${practice.visibility}\n`;
    output += `**ID**: \`${practice.id}\`\n\n`;
    output += `${practice.description}\n\n`;
    
    if (practice.syntax) {
      output += `### Example:\n\`\`\`\n${practice.syntax}\n\`\`\`\n\n`;
    }
    
    if (practice.tags && practice.tags.length > 0) {
      output += `**Tags**: ${practice.tags.join(', ')}\n\n`;
    }
    
    output += `✨ Your best practice is now available in the marketplace!`;
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    console.error('Error creating best practice:', error);
    return {
      content: [{
        type: 'text',
        text: `# Creation Error ❌\n\nFailed to create best practice: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

async function adoptBestPractice(args: any, defaultProjectId: string, user: any) {
  try {
    const projectId = args.project_id || defaultProjectId;
    
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/best-practices/${args.best_practice_id}/adopt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.apiKey || 'dev-token'}`,
        'X-User-ID': user.id || 'dev-user'
      },
      body: JSON.stringify({
        project_id: projectId,
        notes: args.notes
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Adoption failed: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    const adoption = data.adoption;
    
    let output = `# Best Practice Adopted ✅\n\n`;
    output += `**Practice**: ${adoption.best_practice_name}\n`;
    output += `**Project**: ${adoption.project_name}\n`;
    output += `**Team**: ${adoption.team_name}\n`;
    output += `**Adopted**: ${new Date(adoption.adopted_at).toLocaleDateString()}\n\n`;
    
    if (adoption.notes) {
      output += `**Notes**: ${adoption.notes}\n\n`;
    }
    
    output += `🎉 This best practice is now part of your project standards!`;
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    console.error('Error adopting best practice:', error);
    return {
      content: [{
        type: 'text',
        text: `# Adoption Error ❌\n\nFailed to adopt best practice: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

async function getProjectBestPractices(projectId: string, user: any) {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/mcp/projects/${projectId}/best-practices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.apiKey || 'dev-token'}`,
        'X-User-ID': user.id || 'dev-user'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get project practices: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    const practices = data.best_practices || [];
    const stats = data.statistics;
    
    let output = `# Project Best Practices 📋\n\n`;
    output += `**Project**: ${data.project.name}\n`;
    output += `**Team**: ${data.project.team_name}\n`;
    output += `**Total Adopted**: ${stats.total_adopted}\n`;
    output += `**Public**: ${stats.public_count} | **Private**: ${stats.private_count}\n`;
    output += `**Unique Authors**: ${stats.unique_authors}\n\n`;
    
    if (practices.length === 0) {
      output += 'No best practices adopted yet. Search the marketplace and adopt practices that fit your project!';
    } else {
      practices.forEach((practice: any, index: number) => {
        output += `## ${index + 1}. ${practice.name}\n\n`;
        output += `**Author**: ${practice.author_name} | **Visibility**: ${practice.visibility}\n`;
        output += `**Adopted**: ${new Date(practice.adopted_at).toLocaleDateString()}\n`;
        
        if (practice.adoption_notes) {
          output += `**Notes**: ${practice.adoption_notes}\n`;
        }
        
        if (practice.tags && practice.tags.length > 0) {
          output += `**Tags**: ${practice.tags.join(', ')}\n`;
        }
        
        output += `\n${practice.description}\n\n`;
        
        if (practice.syntax) {
          output += `### Example:\n\`\`\`\n${practice.syntax}\n\`\`\`\n\n`;
        }
        
        output += `---\n\n`;
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    console.error('Error getting project best practices:', error);
    return {
      content: [{
        type: 'text',
        text: `# Project Practices Error ❌\n\nFailed to get project best practices: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

async function enhancedHandoffWorkflow(db: DatabaseManager, teamId: string, projectId: string, currentTask: string, options: any, user: any) {
  try {
    const userId = options.userId || user.id;
    
    // If handoffContent is provided, this is step 2: save the handoff
    if (options.handoffContent) {
      console.log('🔄 Step 2: Formatting and saving enhanced handoff content');
      
      // PREPROCESSING: Convert JSON-escaped content back to real markdown
      console.log('🔄 Preprocessing handoff content: unescaping JSON encoding');
      let processedContent = options.handoffContent;
      
      // Unescape common JSON escapes that get introduced by MCP transport
      processedContent = processedContent
        .replace(/\\n/g, '\n')      // Newlines
        .replace(/\\t/g, '\t')      // Tabs  
        .replace(/\\"/g, '"')       // Quotes
        .replace(/\\\\/g, '\\');    // Backslashes (do this last)
        
      console.log('✅ Content preprocessing complete - markdown should now display correctly');
      
      const sessionManager = new SessionHandoffManager(db);
      
      // Generate session ID for server formatting  
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Format content for server upload with embedded quality assessment instructions
      const serverFormattedContent = sessionManager.formatForServerUpload(
        processedContent,
        sessionId
      );
      
      // Store the server-formatted content
      await sessionManager.storeHandoffContent(
        userId,
        teamId,
        projectId,
        serverFormattedContent
      );

      return {
        content: [{
          type: 'text',
          text: `# ✅ Enhanced Handoff Saved!\n\n**Session ID**: \`${sessionId}\`\n**Captured**: ${new Date().toLocaleString()}\n\n*Your session is ready for seamless continuation. Use the \`load_handoff\` tool to resume this work.*`
        }]
      };
    }
    
    // Step 1: Generate enhanced handoff template for human review
    console.log('📝 Step 1: Generating enhanced handoff template for human review');
    
    const rawTemplate = `# Enhanced Session Handoff 🚀

**CLAUDE: Please fill out this template completely with actual session details, then immediately call the handoff tool again with the completed content as the 'handoffContent' parameter to save it.**

**Date**: ${new Date().toLocaleDateString()}  
**Current Task**: ${currentTask}  
**Session Mode**: [Replace with: planning/debugging/building/learning/shipping]

---

## 📊 Progress Snapshot

### ✅ Completed This Session
[CLAUDE: List specific tasks completed, changes made, problems solved]
- [x] 
- [x] 
- [x] 

### 🎯 Ready to Continue  
[CLAUDE: Tasks identified but not started yet]
- [ ] 
- [ ] 
- [ ] 

### ⚠️ Blocked/Issues
[CLAUDE: Problems encountered, blockers, things that need attention]
- [ ] **[Blocker]** Issue: 
- [ ] **[Investigation]** Need to research: 

---

## 🎯 Instant Start (Next Session)
\`\`\`bash
cd ${process.cwd()}
git status  # Branch: [CLAUDE: Fill current branch]
[CLAUDE: First command next session should run]
# Expected: [CLAUDE: What should happen when command runs]
\`\`\`

**IMPORTANT: Ready to proceed?** [CLAUDE: Yes/No + brief status]

---

## 🔍 Implementation Context

### Key Files Modified
[CLAUDE: Actual files changed this session]
- **path/to/file.ts**: [Purpose and changes made]
- **path/to/other.ts**: [Purpose and changes made]

### Key Decisions Made  
[CLAUDE: Important choices, architectural decisions, trade-offs]
1. **Decision**: [What was decided]
   - **Rationale**: [Why this approach]
   - **Files**: [Which files affected]

### Current Architecture Notes
[CLAUDE: Important patterns, structures, dependencies discovered]
- **Pattern Used**: [Coding pattern/framework approach]
- **Integration Points**: [How pieces connect]
- **Dependencies**: [Key libraries/services involved]

---

## ⚠️ Watchouts & Critical Notes

### Don't Break These
[CLAUDE: Critical warnings for next session]
- [Critical constraint or pattern that must be preserved]
- [Existing functionality that must not break]

### Next Session Priorities
[CLAUDE: Ordered by importance]
1. **High**: [Most important thing to tackle next]
2. **Medium**: [Secondary priority]  
3. **Low**: [Nice to have]

### Time Estimates
[CLAUDE: Realistic assessment]
- **Remaining work**: [X hours/days]
- **Next milestone**: [When and what]

---

## 📟 Terminal State
\`\`\`
[CLAUDE: Last few command outputs - copy actual terminal output]
$ last-command
output here...
\`\`\`

---

**🚀 Ready for Next Session**: [CLAUDE: Fill with encouraging note about progress and next steps]

**CLAUDE: After filling this template completely, immediately call the handoff tool again with the filled content as handoffContent parameter to save the handoff.**`;

    // Format template for human review (clean, readable markdown)
    const sessionManager = new SessionHandoffManager(db);
    const humanReadableTemplate = sessionManager.formatForHumanReview(rawTemplate);

    return {
      content: [{
        type: 'text',
        text: humanReadableTemplate
      }]
    };
  } catch (error) {
    console.error('[HANDOFF] Enhanced workflow failed:', error);
    return {
      content: [{
        type: 'text',
        text: `# Enhanced Handoff Failed ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support if the issue persists.`
      }]
    };
  }
}

async function storeHandoff(db: DatabaseManager, teamId: string, projectId: string, handoffContent: string, user: any) {
  try {
    // PREPROCESSING: Convert JSON-escaped content back to real markdown
    console.log('💾 Preprocessing handoff content for storage: unescaping JSON encoding');
    let processedContent = handoffContent;
    
    // Unescape common JSON escapes that get introduced by MCP transport
    processedContent = processedContent
      .replace(/\\n/g, '\n')      // Newlines
      .replace(/\\t/g, '\t')      // Tabs  
      .replace(/\\"/g, '"')       // Quotes
      .replace(/\\\\/g, '\\');    // Backslashes (do this last)
      
    console.log('✅ Storage preprocessing complete - markdown should display correctly');
    
    const userId = user.id;
    const sessionManager = new SessionHandoffManager(db);
    
    // Store the handoff content that Claude created
    const sessionId = await sessionManager.storeHandoffContent(
      userId,
      teamId,
      projectId, 
      processedContent
    );

    return {
      content: [{
        type: 'text',
        text: `# Session Handoff Stored Successfully ✅\n\n**Session ID**: \`${sessionId}\`\n**Captured**: ${new Date().toLocaleString()}\n\nUse \`resume_session ${sessionId}\` to continue your work later.`
      }]
    };
  } catch (error) {
    console.error('[SESSION] Handoff storage failed:', error);
    return {
      content: [{
        type: 'text',
        text: `# Handoff Storage Failed ❌\n\nError: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function loadHandoff(db: DatabaseManager, sessionId: string | undefined, teamId: string, userId: string, projectId: string) {
  try {
    const sessionManager = new SessionHandoffManager(db);
    
    let handoffContent;
    
    if (sessionId) {
      // Load specific handoff by ID
      handoffContent = await sessionManager.loadHandoffForResumption(sessionId);
      
      if (!handoffContent) {
        return {
          content: [{
            type: 'text',
            text: `# Handoff Not Found ❌\n\nHandoff ID \`${sessionId}\` was not found or has expired.\n\nTry using \`load_handoff\` without an ID to load the most recent handoff.`
          }]
        };
      }
    } else {
      // Auto-load most recent handoff
      handoffContent = await sessionManager.loadMostRecentHandoff(userId, teamId, projectId);
      
      if (!handoffContent) {
        return {
          content: [{
            type: 'text',
            text: `# No Recent Handoffs 📭\n\nNo recent handoffs found for this project.\n\nUse \`capture_session\` to save your current work state for seamless continuation.`
          }]
        };
      }
    }

    // Return the prepared handoff content for the new Claude to read
    return {
      content: [{
        type: 'text',
        text: handoffContent
      }]
    };
  } catch (error) {
    console.error('[HANDOFF] Load failed:', error);
    return {
      content: [{
        type: 'text',
        text: `# Handoff Load Failed ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support.`
      }]
    };
  }
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const { name, arguments: args } = req.body;
    
    if (!name) {
      return sendError(res, 'Tool name is required', 400);
    }

    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // Log tool call
    logToolCall(name, user, args);

    // Check access and track usage
    await checkToolAccess(user, name);
    await trackUsage(user, name, args);

    // Extract team and project IDs
    const { teamId, projectId } = extractTeamAndProject(args, user);

    // Initialize database
    const db = await initializeDatabase();

    // Get or create context manager for this team/project
    const contextManager = await getContextManager(teamId, projectId, user.id, db);

    let result;
    console.log(`[${timestamp}] ⚡ Executing tool: ${name}`);
    
    switch (name) {
      case 'get_project_overview':
        console.log(`[${timestamp}] 📊 Getting project overview for path: ${args.path || 'current directory'}`);
        result = await contextManager.getProjectOverview(args.path);
        break;
      case 'find_relevant_code':
        console.log(`[${timestamp}] 🔍 Searching for: "${args.query}" in ${args.fileTypes?.length || 'all'} file types`);
        result = await contextManager.findRelevantCode(args.query, args.fileTypes);
        break;
      case 'get_file_context':
        console.log(`[${timestamp}] 📄 Getting context for file: ${args.filePath}`);
        result = await contextManager.getFileContext(args.filePath, args.includeDependencies);
        break;
      case 'get_recent_changes':
        console.log(`[${timestamp}] 🕐 Getting changes since: ${args.since || '1 day'}`);
        result = await contextManager.getRecentChanges(args.since);
        break;
      case 'get_best_practices':
        console.log(`[${timestamp}] 📋 Getting best practices for ${teamId} (category: ${args.category || 'all'}, priority: ${args.priority || 'all'})`);
        result = await getBestPractices(db, teamId, args.category, args.priority);
        break;
      case 'suggest_best_practice':
        console.log(`[${timestamp}] 💡 Getting best practice suggestions for scenario: "${args.scenario}"`);
        result = await suggestBestPractice(db, teamId, args.scenario, args.codeContext);
        break;
      case 'search_best_practices':
        console.log(`[${timestamp}] 🔍 Searching best practices: "${args.query || 'all'}"`);
        result = await searchBestPractices(args);
        break;
      case 'create_best_practice':
        console.log(`[${timestamp}] ➕ Creating best practice: "${args.name}"`);
        result = await createBestPractice(args, user);
        break;
      case 'adopt_best_practice':
        console.log(`[${timestamp}] ✅ Adopting best practice ${args.best_practice_id} for project ${args.project_id || projectId}`);
        result = await adoptBestPractice(args, projectId, user);
        break;
      case 'get_project_best_practices':
        console.log(`[${timestamp}] 📋 Getting adopted best practices for project ${args.project_id || projectId}`);
        result = await getProjectBestPractices(args.project_id || projectId, user);
        break;
      case 'prepare_handoff':
      case 'handoff':
        console.log(`[${timestamp}] 🎯 Enhanced handoff workflow - task: "${args.currentTask}"`);
        result = await enhancedHandoffWorkflow(db, teamId, projectId, args.currentTask, args, user);
        break;
      case 'store_handoff':
        console.log(`[${timestamp}] 💾 Storing handoff content prepared by Claude`);
        result = await storeHandoff(db, teamId, projectId, args.handoffContent, user);
        break;
      case 'resume_session':
      case 'load_handoff':
        console.log(`[${timestamp}] ▶️  Loading handoff: ${args.sessionId || 'most recent'}`);
        result = await loadHandoff(db, args.sessionId, teamId, user.id, projectId);
        break;
      case 'assess_handoff_quality':
        console.log(`[${timestamp}] 📏 Assessing handoff quality for session: ${args.sessionId}`);
        result = await assessHandoffQuality(db, args.sessionId, teamId, user.id, args);
        break;
      case 'retrospective_handoff_feedback':
        console.log(`[${timestamp}] 🔍 Recording retrospective handoff feedback for session: ${args.sessionId}`);
        result = await recordRetrospectiveFeedback(db, args.sessionId, teamId, user.id, args);
        break;
      case 'score_collaboration_session':
        console.log(`[${timestamp}] 🎯 Scoring collaboration session: ${args.sessionId}`);
        result = await scoreCollaborationSession(db, args.sessionId, teamId, user.id, args);
        break;
      case 'generate_coaching_insights':
        console.log(`[${timestamp}] 🧠 Generating coaching insights for session: ${args.sessionId}`);
        result = await generateCoachingInsights(db, args.sessionId, teamId, user.id, args);
        break;
      case 'get_dashboard_metrics':
        console.log(`[${timestamp}] 📊 Getting dashboard metrics - redirecting to /api/sessions/scorecards`);
        result = {
          content: [{
            type: 'text',
            text: `# Dashboard Metrics Available 📊\n\nFor detailed collaboration analytics, visit the dashboard at **app.ginko.ai** or use the \`/api/sessions/scorecards\` endpoint.\n\n✨ **New Features Available:**\n- Session collaboration scores\n- Task completion analytics\n- Coaching insights\n- Handoff quality tracking\n\n*Use the new \`score_collaboration_session\` and \`generate_coaching_insights\` tools during handoff for rich analytics.*`
          }]
        };
        break;
      case 'context':
      case 'ctx':
        console.log(`[${timestamp}] 🎯 Loading project context with auto-resume: ${args.autoResume !== false}`);
        const contextResults = [];
        
        // Get best practices
        const practices = await getBestPractices(db, teamId);
        contextResults.push({
          type: 'text',
          text: `# Project Context Loaded 🎯\n\n## Best Practices\n${practices.content[0]?.text || 'Best practices loaded'}`
        });
        
        // Auto-resume most recent handoff if enabled
        if (args.autoResume !== false) {
          try {
            const handoffManager = new SessionHandoffManager(db);
            const recentHandoff = await handoffManager.loadMostRecentHandoff(user.id, teamId, projectId);
            
            if (recentHandoff) {
              contextResults.push({
                type: 'text',
                text: `\n## 🔄 Previous Session Resumed\n\n${recentHandoff}`
              });
            } else {
              contextResults.push({
                type: 'text',
                text: `\n## 🆕 Fresh Start\n\nNo previous session found. Ready to begin new work!`
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`[${timestamp}] ⚠️ Could not load handoff: ${errorMessage}`);
            contextResults.push({
              type: 'text',
              text: `\n## 🆕 Fresh Start\n\nStarting new session (previous context not available).`
            });
          }
        }
        
        result = { content: contextResults };
        break;


      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ✅ Tool ${name} completed successfully in ${duration}ms`);
    
    sendSuccess(res, { result });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Tool call failed after ${duration}ms: ${errorMessage}`);
    
    sendError(res, errorMessage);
  }
}

async function assessHandoffQuality(db: DatabaseManager, sessionId: string, teamId: string, userId: string, assessment: any) {
  try {
    // Validate required fields
    if (!sessionId) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Session ID is required for handoff quality assessment.'
        }]
      };
    }

    // Extract assessment scores
    const {
      contextCompleteness = 0,
      taskClarity = 0,
      emotionalContinuity = 0,
      actionability = 0,
      feedback = '',
      missingItems = []
    } = assessment;

    // Calculate overall score
    const overallScore = (contextCompleteness + taskClarity + emotionalContinuity + actionability) / 4;

    // Store assessment in database
    const assessmentData = {
      sessionId,
      userId,
      teamId,
      timestamp: new Date(),
      scores: {
        contextCompleteness: Math.max(1, Math.min(10, contextCompleteness)),
        taskClarity: Math.max(1, Math.min(10, taskClarity)),
        emotionalContinuity: Math.max(1, Math.min(10, emotionalContinuity)),
        actionability: Math.max(1, Math.min(10, actionability)),
        overall: overallScore
      },
      feedback: feedback.substring(0, 1000), // Limit feedback length
      missingItems: Array.isArray(missingItems) ? missingItems : [],
      assessmentType: 'immediate'
    };

    // Store in database (implement this method in DatabaseManager)
    await db.storeHandoffAssessment({
      ...assessmentData,
      assessmentType: 'immediate' as const
    });

    return {
      content: [{
        type: 'text',
        text: `# Handoff Quality Assessment Recorded 📏

**Session ID**: ${sessionId}
**Overall Score**: ${overallScore.toFixed(1)}/10

## Detailed Scores:
- **Context Completeness**: ${contextCompleteness}/10
- **Task Clarity**: ${taskClarity}/10  
- **Emotional Continuity**: ${emotionalContinuity}/10
- **Actionability**: ${actionability}/10

## Feedback:
${feedback || 'No specific feedback provided.'}

## Missing Items:
${missingItems.length > 0 ? missingItems.map((item: string) => `- ${item}`).join('\n') : 'No missing items identified.'}

*Assessment stored for handoff improvement analysis.*`
      }]
    };

  } catch (error) {
    console.error('[assessHandoffQuality] Error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error assessing handoff quality: ${(error as Error).message || 'Unknown error'}`
      }]
    };
  }
}

async function recordRetrospectiveFeedback(db: DatabaseManager, sessionId: string, teamId: string, userId: string, feedback: any) {
  try {
    // Validate required fields
    if (!sessionId) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Session ID is required for retrospective feedback.'
        }]
      };
    }

    // Extract feedback data
    const {
      completedTasksReview = '',
      unexpectedChallenges = [],
      missingFromOriginalHandoff = [],
      wouldHaveBeenHelpful = [],
      hiddenDecisions = [],
      improvementSuggestions = '',
      overallExperience = 0
    } = feedback;

    // Calculate usefulness score if not provided
    const usefulnessScore = overallExperience || Math.max(1, Math.min(10, 
      10 - missingFromOriginalHandoff.length - unexpectedChallenges.length + wouldHaveBeenHelpful.length
    ));

    // Store retrospective assessment in database
    const assessmentData = {
      sessionId,
      userId,
      teamId,
      timestamp: new Date(),
      scores: {
        contextCompleteness: 0, // Will be updated from immediate assessment if exists
        taskClarity: 0,
        emotionalContinuity: 0,
        actionability: 0,
        overall: usefulnessScore
      },
      feedback: improvementSuggestions.substring(0, 1000),
      missingItems: Array.isArray(missingFromOriginalHandoff) ? missingFromOriginalHandoff : [],
      assessmentType: 'retrospective' as const,
      retrospectiveData: {
        completedTasksReview,
        unexpectedChallenges: Array.isArray(unexpectedChallenges) ? unexpectedChallenges : [],
        wouldHaveBeenHelpful: Array.isArray(wouldHaveBeenHelpful) ? wouldHaveBeenHelpful : [],
        hiddenDecisions: Array.isArray(hiddenDecisions) ? hiddenDecisions : []
      }
    };

    // Store in database
    await db.storeHandoffAssessment(assessmentData);

    return {
      content: [{
        type: 'text',
        text: `# Retrospective Handoff Feedback Recorded 🔍

**Session ID**: ${sessionId}
**Usefulness Score**: ${usefulnessScore}/10

## Completed Work Review:
${completedTasksReview || 'No review provided.'}

## What Was Missing from Original Handoff:
${missingFromOriginalHandoff.length > 0 ? missingFromOriginalHandoff.map((item: string) => `- ${item}`).join('\n') : 'Nothing significant was missing.'}

## Unexpected Challenges Encountered:
${unexpectedChallenges.length > 0 ? unexpectedChallenges.map((item: string) => `- ${item}`).join('\n') : 'No unexpected challenges.'}

## Would Have Been Helpful to Know Upfront:
${wouldHaveBeenHelpful.length > 0 ? wouldHaveBeenHelpful.map((item: string) => `- ${item}`).join('\n') : 'Nothing additional needed.'}

## Hidden Decisions Made During Work:
${hiddenDecisions.length > 0 ? hiddenDecisions.map((item: string) => `- ${item}`).join('\n') : 'No hidden decisions documented.'}

## Improvement Suggestions:
${improvementSuggestions || 'No specific suggestions provided.'}

*Retrospective feedback stored for handoff improvement analysis.*`
      }]
    };

  } catch (error) {
    console.error('[recordRetrospectiveFeedback] Error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error recording retrospective feedback: ${(error as Error).message || 'Unknown error'}`
      }]
    };
  }
}

async function scoreCollaborationSession(db: DatabaseManager, sessionId: string, teamId: string, userId: string, sessionData: any) {
  try {
    const {
      sessionSummary,
      tasksPlanned = [],
      tasksCompleted = [],
      unexpectedWork = [],
      blockers = [],
      breakthroughs = []
    } = sessionData;

    // Calculate basic metrics
    const taskCompletionRate = tasksPlanned.length > 0 ? (tasksCompleted.length / tasksPlanned.length) * 100 : 100;
    const unexpectedWorkImpact = unexpectedWork.length;
    const blockerCount = blockers.length;
    const breakthroughCount = breakthroughs.length;

    // AI-driven scoring logic (simulates what the session AI would provide)
    const handoffQuality = Math.max(50, Math.min(100, 85 - (blockerCount * 5) + (breakthroughCount * 5)));
    const sessionDrift = Math.max(20, Math.min(100, 90 - (unexpectedWorkImpact * 10)));
    const contextEfficiency = Math.max(30, Math.min(100, 80 + (breakthroughCount * 8) - (blockerCount * 3)));
    const continuityScore = Math.max(40, Math.min(100, taskCompletionRate - (unexpectedWorkImpact * 5)));

    // Weighted overall score
    const overallCollaboration = Math.round(
      (handoffQuality * 0.25) + 
      (taskCompletionRate * 0.25) + 
      (sessionDrift * 0.15) + 
      (contextEfficiency * 0.15) + 
      (continuityScore * 0.20)
    );

    // Create comprehensive scorecard data
    const scorecardData = {
      session_id: sessionId,
      user_id: userId,
      team_id: teamId,
      project_id: 'default', // Could be extracted from context
      session_start: new Date(Date.now() - 120 * 60 * 1000), // Estimate 2 hours ago
      session_end: new Date(),
      scores: {
        handoffQuality,
        taskCompletion: Math.round(taskCompletionRate),
        sessionDrift,
        contextEfficiency,
        continuityScore,
        overallCollaboration
      },
      work_metrics: {
        tasksPlanned: tasksPlanned.length,
        tasksCompleted: tasksCompleted.length,
        unexpectedTasks: unexpectedWork.length,
        blockers: blockers.map((b: string) => b.substring(0, 200)),
        breakthroughs: breakthroughs.map((b: string) => b.substring(0, 200))
      },
      context_usage: {
        messagesExchanged: 50, // Estimate
        toolsUsed: ['context', 'edit', 'bash', 'grep'], // Common tools
        errorRate: blockerCount > 3 ? 0.15 : 0.05
      }
    };

    // Store scorecard in database
    try {
      await db.storeSessionScorecard(scorecardData);
      console.log(`[SUCCESS] Stored scorecard for session ${sessionId} in database`);
    } catch (dbError) {
      console.error(`[ERROR] Failed to store scorecard in database:`, dbError);
      throw new Error(`Database storage failed: ${dbError}`);
    }

    return {
      content: [{
        type: 'text',
        text: `# Session Collaboration Score Generated 🎯

**Session ID**: ${sessionId}
**Overall Score**: ${overallCollaboration}/100

## Detailed Scores:
- **Task Completion**: ${Math.round(taskCompletionRate)}/100 (${tasksCompleted.length}/${tasksPlanned.length} tasks)
- **Session Focus**: ${sessionDrift}/100 (${unexpectedWorkImpact} unexpected items)
- **Context Efficiency**: ${contextEfficiency}/100
- **Handoff Quality**: ${handoffQuality}/100
- **Continuity**: ${continuityScore}/100

## Session Metrics:
- **Tasks Completed**: ${tasksCompleted.length}
- **Unexpected Work**: ${unexpectedWork.length}
- **Blockers**: ${blockers.length}
- **Breakthroughs**: ${breakthroughs.length}

## Summary:
${sessionSummary}

*Comprehensive scorecard data stored for dashboard analytics and coaching insights.*`
      }]
    };

  } catch (error) {
    console.error('[scoreCollaborationSession] Error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error scoring collaboration session: ${(error as Error).message || 'Unknown error'}`
      }]
    };
  }
}

async function generateCoachingInsights(db: DatabaseManager, sessionId: string, teamId: string, userId: string, coachingData: any) {
  try {
    const {
      collaborationContext,
      challengesFaced = [],
      successMoments = [],
      workflowObservations
    } = coachingData;

    // AI-driven coaching logic (simulates what the session AI would provide)
    const insights = [];
    
    // Analyze challenges for coaching opportunities
    if (challengesFaced.length > 2) {
      insights.push({
        category: 'problem-solving',
        insight: 'Multiple challenges encountered suggest need for better upfront planning',
        action: 'Start sessions with more detailed context gathering and pre-mortem analysis',
        priority: 'high'
      });
    }

    if (challengesFaced.some((c: string) => c.toLowerCase().includes('context'))) {
      insights.push({
        category: 'context',
        insight: 'Context-related challenges detected',
        action: 'Use /start command consistently and create mini-handoffs during long sessions',
        priority: 'medium'
      });
    }

    // Analyze success patterns
    if (successMoments.length > 0) {
      insights.push({
        category: 'strengths',
        insight: 'Strong collaboration moments identified',
        action: 'Continue leveraging effective communication patterns',
        priority: 'low'
      });
    }

    // Generate recommendations based on workflow observations
    const recommendations = [];
    if (workflowObservations?.toLowerCase().includes('efficient')) {
      recommendations.push('Your workflow efficiency is strong - consider sharing patterns with team');
    } else if (workflowObservations?.toLowerCase().includes('slow')) {
      recommendations.push('Consider using vibecheck pattern when feeling stuck');
    }

    // Store coaching data
    const coachingRecord = {
      session_id: sessionId,
      user_id: userId,
      team_id: teamId,
      insights,
      recommendations,
      collaboration_context: collaborationContext.substring(0, 500),
      challenges_summary: challengesFaced.join('; ').substring(0, 500),
      success_patterns: successMoments.join('; ').substring(0, 500),
      generated_at: new Date()
    };

    await db.storeCoachingInsights(coachingRecord);

    return {
      content: [{
        type: 'text',
        text: `# Coaching Insights Generated 🧠

**Session ID**: ${sessionId}
**Collaboration Context**: ${collaborationContext}

## Key Insights (${insights.length}):
${insights.map(insight => 
  `### ${insight.category.charAt(0).toUpperCase() + insight.category.slice(1)} - ${insight.priority.toUpperCase()} Priority
**Insight**: ${insight.insight}
**Action**: ${insight.action}`
).join('\n\n')}

## Challenges Analyzed (${challengesFaced.length}):
${challengesFaced.length > 0 ? challengesFaced.map((c: string) => `- ${c}`).join('\n') : 'No significant challenges'}

## Success Moments (${successMoments.length}):
${successMoments.length > 0 ? successMoments.map((s: string) => `- ${s}`).join('\n') : 'Success moments to be identified'}

## Recommendations:
${recommendations.length > 0 ? recommendations.map(r => `- ${r}`).join('\n') : 'Continue current effective patterns'}

## Workflow Observations:
${workflowObservations || 'No specific workflow observations provided'}

*Coaching insights stored for personalized dashboard and trend analysis.*`
      }]
    };

  } catch (error) {
    console.error('[generateCoachingInsights] Error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error generating coaching insights: ${(error as Error).message || 'Unknown error'}`
      }]
    };
  }
}

// Vercel configuration for this serverless function
export const config = {
  maxDuration: 30
};