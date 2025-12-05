/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, status, cli, epic-004, multi-agent, sprint-2]
 * @related: [index.ts, agent-client.ts, list.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Agent Status Command (EPIC-004 Sprint 2 TASK-6)
 *
 * Enhanced status command that shows:
 * - All agents in the project
 * - Current task for busy agents
 * - Active blockers
 * - Time since last heartbeat
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { requireGinkoRoot } from '../../utils/ginko-root.js';
import { AgentClient } from './agent-client.js';
import { getAccessToken, isAuthenticated } from '../../utils/auth-storage.js';

interface AgentConfig {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  registeredAt: string;
}

interface AgentWithDetails {
  id: string;
  name: string;
  status: string;
  capabilities: string[];
  currentTask?: string;
  lastHeartbeat?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface BlockerEvent {
  id: string;
  description: string;
  blocked_by: string;
  blocking_tasks: string[];
  blocker_severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  agent_id?: string;
}

interface StatusOptions {
  all?: boolean;  // Show all agents (not just current project)
}

/**
 * Enhanced agent status command (Sprint 2 TASK-6)
 */
export async function statusAgentCommand(options: StatusOptions = {}): Promise<void> {
  const spinner = ora('Loading agent status...').start();

  try {
    const projectRoot = await requireGinkoRoot();
    const agentConfigPath = path.join(projectRoot, '.ginko', 'agent.json');

    // Load local agent config if exists
    let localConfig: AgentConfig | null = null;
    try {
      const configData = await fs.readFile(agentConfigPath, 'utf-8');
      localConfig = JSON.parse(configData);
    } catch {
      // No local agent - that's ok
    }

    // Check if authenticated for API access
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      spinner.warn(chalk.yellow('Not authenticated - showing local status only'));
      console.log('');

      if (localConfig) {
        displayLocalAgent(localConfig);
      } else {
        console.log(chalk.dim('  No agent registered locally'));
        console.log('');
        console.log(chalk.dim('💡 Register an agent:'));
        console.log(chalk.dim('  ginko agent register --name "Worker-1" --capabilities typescript,testing'));
      }

      console.log('');
      console.log(chalk.dim('💡 Login to see all agents:'));
      console.log(chalk.dim('  ginko login'));
      return;
    }

    // Fetch all agents from API
    const agentsResponse = await AgentClient.list({ limit: 50 });
    const agents = agentsResponse.agents;

    // Fetch active blockers
    const blockers = await fetchActiveBlockers();

    spinner.succeed(chalk.green('Agent Status'));
    console.log('');

    // Display active agents section
    const activeAgents = agents.filter(a => a.status === 'busy');
    const idleAgents = agents.filter(a => a.status === 'idle' || a.status === 'active');
    const offlineAgents = agents.filter(a => a.status === 'offline');

    console.log(chalk.bold(`Active Agents (${activeAgents.length}):`));
    if (activeAgents.length === 0) {
      console.log(chalk.dim('  No agents currently busy'));
    } else {
      for (const agent of activeAgents) {
        const timeSince = getTimeSince(agent.updatedAt);
        const taskInfo = agent.metadata?.currentTask
          ? chalk.cyan(agent.metadata.currentTask)
          : chalk.dim('(task unknown)');
        console.log(`  ${formatAgentId(agent.id)}  ${chalk.bold(agent.name)}  ${getStatusBadge(agent.status)}    ${taskInfo} ${chalk.dim(`(${timeSince} ago)`)}`);
      }
    }
    console.log('');

    // Display idle agents
    if (idleAgents.length > 0) {
      console.log(chalk.bold(`Idle Agents (${idleAgents.length}):`));
      for (const agent of idleAgents) {
        const timeSince = getTimeSince(agent.updatedAt);
        console.log(`  ${formatAgentId(agent.id)}  ${chalk.bold(agent.name)}  ${getStatusBadge(agent.status)}    ${chalk.dim('-')} ${chalk.dim(`(${timeSince} ago)`)}`);
      }
      console.log('');
    }

    // Display offline agents (condensed)
    if (offlineAgents.length > 0) {
      console.log(chalk.dim(`Offline Agents (${offlineAgents.length}): ${offlineAgents.map(a => a.name).join(', ')}`));
      console.log('');
    }

    // Display blockers section
    if (blockers.length > 0) {
      console.log(chalk.bold(`Blockers (${blockers.length}):`));
      for (const blocker of blockers) {
        const severityBadge = getSeverityBadge(blocker.blocker_severity);
        const affectedTasks = blocker.blocking_tasks?.length
          ? chalk.dim(`Affects: ${blocker.blocking_tasks.join(', ')}`)
          : '';
        console.log(`  ${blocker.blocked_by} ${severityBadge}`);
        console.log(chalk.dim(`    ${truncate(blocker.description, 60)}`));
        if (affectedTasks) {
          console.log(`    ${affectedTasks}`);
        }
      }
      console.log('');
    }

    // Highlight current agent if registered locally
    if (localConfig) {
      const isCurrentActive = agents.find(a => a.id === localConfig!.agentId);
      if (isCurrentActive) {
        console.log(chalk.dim(`You: ${localConfig.name} (${localConfig.agentId})`));
      } else {
        console.log(chalk.yellow(`⚠ Your agent (${localConfig.name}) is not in the active list`));
        console.log(chalk.dim('  It may have been unregistered or is in a different organization'));
      }
      console.log('');
    }

    // Summary
    console.log(chalk.dim(`Total: ${agents.length} agents | ${activeAgents.length} busy | ${blockers.length} blockers`));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load agent status'));

    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}

/**
 * Display local agent config (fallback when not authenticated)
 */
function displayLocalAgent(config: AgentConfig): void {
  console.log(chalk.bold(`  ${config.name}`));
  console.log(chalk.dim(`  ID: ${config.agentId}`));
  console.log(chalk.dim(`  Organization: ${config.organizationId}`));
  console.log(chalk.dim(`  Status: ${getStatusBadge(config.status)}`));
  console.log(chalk.dim(`  Capabilities: ${config.capabilities.join(', ')}`));
  console.log(chalk.dim(`  Registered: ${formatDate(config.registeredAt)}`));
  console.log('');
  console.log(chalk.dim('  Config stored at: .ginko/agent.json'));
}

/**
 * Fetch active blocker events from API
 */
async function fetchActiveBlockers(): Promise<BlockerEvent[]> {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

    // Query events stream for recent blockers (last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `${apiUrl}/api/v1/events/stream?categories=blocker&limit=10&since_time=${encodeURIComponent(since)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { events?: BlockerEvent[] };
    return data.events || [];
  } catch {
    // Blocker fetch is non-critical
    return [];
  }
}

/**
 * Format agent ID (truncated for display)
 */
function formatAgentId(id: string): string {
  return chalk.dim(id.substring(0, 12));
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('● active');
    case 'idle':
      return chalk.yellow('● idle');
    case 'busy':
      return chalk.blue('● busy');
    case 'offline':
      return chalk.gray('● offline');
    default:
      return status;
  }
}

/**
 * Get colored severity badge
 */
function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical':
      return chalk.bgRed.white(' CRITICAL ');
    case 'high':
      return chalk.red('HIGH');
    case 'medium':
      return chalk.yellow('MEDIUM');
    case 'low':
      return chalk.dim('LOW');
    default:
      return severity;
  }
}

/**
 * Format ISO date string to readable format
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

/**
 * Get human-readable time since date
 */
function getTimeSince(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '<1m';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return '?';
  }
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// Re-export for backwards compatibility
export { statusAgentCommand as default };
