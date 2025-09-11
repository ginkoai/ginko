/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, context, git, ai-enhancement]
 * @related: [ai-enhanced.ts, base.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [simple-git, fs-extra]
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { BacklogBase, BacklogItem } from './base.js';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';

/**
 * Context structure for AI enhancement
 */
export interface BacklogContext {
  // Git context
  currentBranch: string;
  isDirty: boolean;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  modifiedFiles: string[];
  
  // Backlog context
  activeItems: BacklogItem[];
  inProgressItems: BacklogItem[];
  highPriorityItems: BacklogItem[];
  userAssignedItems: BacklogItem[];
  recentlyUpdated: BacklogItem[];
  
  // Session context
  currentSessionGoals?: string;
  lastHandoff?: string;
  workMode?: string;
  
  // User context
  userEmail: string;
  commandHistory: string[];
  
  // Project context
  projectType?: string;
  mainTechnologies?: string[];
  hasTests: boolean;
  hasCICD: boolean;
}

/**
 * Gathers rich context for AI-enhanced backlog operations
 */
export class ContextGatherer {
  private git: SimpleGit;
  private backlog: BacklogBase;
  
  constructor() {
    this.git = simpleGit();
    this.backlog = new BacklogBase();
  }
  
  /**
   * Gather complete context for AI enhancement
   */
  async gatherContext(): Promise<BacklogContext> {
    await this.backlog.init();
    
    const [
      gitContext,
      backlogContext,
      sessionContext,
      userContext,
      projectContext
    ] = await Promise.all([
      this.gatherGitContext(),
      this.gatherBacklogContext(),
      this.gatherSessionContext(),
      this.gatherUserContext(),
      this.gatherProjectContext()
    ]);
    
    return {
      ...gitContext,
      ...backlogContext,
      ...sessionContext,
      ...userContext,
      ...projectContext
    };
  }
  
  /**
   * Gather git-related context
   */
  private async gatherGitContext() {
    try {
      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 10 });
      
      return {
        currentBranch: status.current || 'main',
        isDirty: status.files.length > 0,
        modifiedFiles: status.files.map(f => f.path),
        recentCommits: log.all.map(commit => ({
          hash: commit.hash.substring(0, 7),
          message: commit.message,
          author: commit.author_name,
          date: commit.date
        }))
      };
    } catch (error) {
      // Gracefully handle if not a git repo
      return {
        currentBranch: 'main',
        isDirty: false,
        modifiedFiles: [],
        recentCommits: []
      };
    }
  }
  
  /**
   * Gather backlog-related context
   */
  private async gatherBacklogContext() {
    const allItems = await this.backlog.listItems();
    const userEmail = await getUserEmail();
    
    // Sort by update time for recently updated
    const sortedByUpdate = [...allItems].sort((a, b) => 
      new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
    
    return {
      activeItems: allItems.filter(i => i.status !== 'done'),
      inProgressItems: allItems.filter(i => i.status === 'in-progress'),
      highPriorityItems: allItems.filter(i => 
        i.priority === 'critical' || i.priority === 'high'
      ),
      userAssignedItems: allItems.filter(i => i.assignee === userEmail),
      recentlyUpdated: sortedByUpdate.slice(0, 5)
    };
  }
  
  /**
   * Gather session context from ginko
   */
  private async gatherSessionContext() {
    try {
      const ginkoDir = await getGinkoDir();
      const userEmail = await getUserEmail();
      const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
      const sessionFile = path.join(ginkoDir, 'sessions', userSlug, 'current.md');
      
      if (await fs.pathExists(sessionFile)) {
        const content = await fs.readFile(sessionFile, 'utf8');
        
        // Extract key information from session
        const goals = content.match(/## 🎯 Key Achievements\n([\s\S]*?)(?=\n##|$)/)?.[1];
        const lastHandoff = content.match(/## 📊 Session Summary\n(.*?)(?=\n|$)/)?.[1];
        const mode = content.match(/mode: (\w+)/)?.[1];
        
        return {
          currentSessionGoals: goals?.trim(),
          lastHandoff: lastHandoff?.trim(),
          workMode: mode
        };
      }
    } catch (error) {
      // Session context is optional
    }
    
    return {};
  }
  
  /**
   * Gather user context
   */
  private async gatherUserContext() {
    const userEmail = await getUserEmail();
    
    // Try to get command history from ginko
    let commandHistory: string[] = [];
    try {
      const ginkoDir = await getGinkoDir();
      const historyFile = path.join(ginkoDir, '.command-history');
      if (await fs.pathExists(historyFile)) {
        const history = await fs.readFile(historyFile, 'utf8');
        commandHistory = history.split('\n').filter(Boolean).slice(-10);
      }
    } catch (error) {
      // History is optional
    }
    
    return {
      userEmail,
      commandHistory
    };
  }
  
  /**
   * Gather project context
   */
  private async gatherProjectContext() {
    const context: any = {
      hasTests: false,
      hasCICD: false
    };
    
    try {
      // Detect project type
      if (await fs.pathExists('package.json')) {
        const pkg = await fs.readJson('package.json');
        context.projectType = 'node';
        context.mainTechnologies = [];
        
        // Detect main technologies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.react) context.mainTechnologies.push('react');
        if (deps.next) context.mainTechnologies.push('nextjs');
        if (deps.express) context.mainTechnologies.push('express');
        if (deps.typescript) context.mainTechnologies.push('typescript');
        
        // Check for tests
        context.hasTests = !!(pkg.scripts?.test);
      } else if (await fs.pathExists('Cargo.toml')) {
        context.projectType = 'rust';
      } else if (await fs.pathExists('go.mod')) {
        context.projectType = 'go';
      }
      
      // Check for CI/CD
      context.hasCICD = await fs.pathExists('.github/workflows') || 
                        await fs.pathExists('.gitlab-ci.yml');
    } catch (error) {
      // Project context is optional
    }
    
    return context;
  }
  
  /**
   * Generate context summary for AI prompt
   */
  generateContextSummary(context: BacklogContext): string {
    const parts = [];
    
    // Git context
    if (context.currentBranch !== 'main') {
      parts.push(`Working on branch: ${context.currentBranch}`);
    }
    if (context.isDirty) {
      parts.push(`Uncommitted changes in: ${context.modifiedFiles.slice(0, 3).join(', ')}`);
    }
    
    // Backlog context
    if (context.inProgressItems.length > 0) {
      parts.push(`Currently working on: ${context.inProgressItems[0].title} (${context.inProgressItems[0].id})`);
    }
    if (context.highPriorityItems.length > 0) {
      parts.push(`High priority items: ${context.highPriorityItems.length}`);
    }
    
    // Session context
    if (context.workMode) {
      parts.push(`Work mode: ${context.workMode}`);
    }
    if (context.lastHandoff) {
      parts.push(`Session goal: ${context.lastHandoff}`);
    }
    
    // Project context
    if (context.projectType && context.mainTechnologies) {
      parts.push(`Project: ${context.projectType} with ${context.mainTechnologies.join(', ')}`);
    }
    
    return parts.join('\n');
  }
}