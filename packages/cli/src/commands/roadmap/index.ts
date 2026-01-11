/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, cli, epic, product-management, ADR-056]
 * @related: [../graph/api-client.ts, ADR-056]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { GraphApiClient } from '../graph/api-client.js';
import { loadGraphConfig } from '../graph/config.js';

interface EpicRoadmapItem {
  id: string;
  title: string;
  description?: string;
  commitment_status: 'uncommitted' | 'committed';
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  target_start_quarter?: string;
  target_end_quarter?: string;
  roadmap_visible: boolean;
  tags?: string[];
}

interface QuarterGroup {
  quarter: string;
  epics: EpicRoadmapItem[];
}

interface RoadmapResponse {
  epics: EpicRoadmapItem[];
  quarters: QuarterGroup[];
  uncommitted: EpicRoadmapItem[];
  summary: {
    total: number;
    committed: number;
    uncommitted: number;
    byStatus: Record<string, number>;
  };
}

interface RoadmapOptions {
  all?: boolean;
  status?: string;
  json?: boolean;
}

/**
 * Get status icon based on roadmap_status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'not_started':
      return chalk.gray('○');
    case 'in_progress':
      return chalk.blue('◐');
    case 'completed':
      return chalk.green('●');
    case 'cancelled':
      return chalk.red('✗');
    default:
      return chalk.gray('?');
  }
}

/**
 * Format quarter header
 */
function formatQuarterHeader(quarter: string): string {
  if (quarter === 'Unscheduled') {
    return chalk.yellow('📅 Unscheduled');
  }
  // Parse Q1-2026 format
  const match = quarter.match(/^Q(\d)-(\d{4})$/);
  if (match) {
    const [, q, year] = match;
    return chalk.cyan(`📅 Q${q} ${year}`);
  }
  return chalk.cyan(`📅 ${quarter}`);
}

/**
 * Display roadmap in CLI format
 */
function displayRoadmap(response: RoadmapResponse, options: RoadmapOptions): void {
  const { quarters, uncommitted, summary } = response;

  // Header
  console.log(chalk.bold('\n🗺️  Product Roadmap\n'));

  // Summary line
  const summaryParts = [
    chalk.green(`${summary.committed} committed`),
  ];
  if (options.all && summary.uncommitted > 0) {
    summaryParts.push(chalk.gray(`${summary.uncommitted} uncommitted`));
  }
  if (summary.byStatus.in_progress) {
    summaryParts.push(chalk.blue(`${summary.byStatus.in_progress} in progress`));
  }
  if (summary.byStatus.completed) {
    summaryParts.push(chalk.green(`${summary.byStatus.completed} completed`));
  }
  console.log(chalk.dim(`   ${summaryParts.join(' · ')}\n`));

  // Display quarters with committed epics
  if (quarters.length === 0 && uncommitted.length === 0) {
    console.log(chalk.yellow('   No epics found on the roadmap.\n'));
    console.log(chalk.dim('   Tip: Run `ginko roadmap --all` to include uncommitted items.'));
    return;
  }

  for (const group of quarters) {
    console.log(formatQuarterHeader(group.quarter));
    console.log(chalk.dim('   ' + '─'.repeat(40)));

    for (const epic of group.epics) {
      const icon = getStatusIcon(epic.roadmap_status);
      const title = epic.title;
      const id = chalk.dim(`(${epic.id})`);

      // Build status tags
      const tags: string[] = [];
      if (epic.target_end_quarter && epic.target_end_quarter !== epic.target_start_quarter) {
        tags.push(chalk.dim(`→ ${epic.target_end_quarter}`));
      }
      if (epic.tags && epic.tags.length > 0) {
        tags.push(chalk.dim(epic.tags.slice(0, 2).join(', ')));
      }

      console.log(`   ${icon} ${title} ${id}${tags.length ? ' ' + tags.join(' ') : ''}`);
    }
    console.log('');
  }

  // Display uncommitted items if --all flag is set
  if (options.all && uncommitted.length > 0) {
    console.log(chalk.yellow('💭 Uncommitted (Ideas/Backlog)'));
    console.log(chalk.dim('   ' + '─'.repeat(40)));

    for (const epic of uncommitted) {
      const icon = chalk.gray('○');
      const title = epic.title;
      const id = chalk.dim(`(${epic.id})`);
      console.log(`   ${icon} ${title} ${id}`);
    }
    console.log('');
  }

  // Footer with help
  console.log(chalk.dim('   Tip: Use --status to filter (not_started, in_progress, completed)'));
}

/**
 * Main roadmap command
 */
export async function roadmapAction(options: RoadmapOptions): Promise<void> {
  try {
    // Get graph config
    const config = await loadGraphConfig();
    if (!config || !config.graphId) {
      console.log(chalk.red('\n✗ Graph not initialized. Run `ginko graph init` first.\n'));
      process.exit(1);
    }

    // Build query params
    const params = new URLSearchParams();
    params.set('graphId', config.graphId);
    if (options.all) {
      params.set('all', 'true');
    }
    if (options.status) {
      params.set('status', options.status);
    }

    // Call the API
    const client = new GraphApiClient();
    const response = await client.request<RoadmapResponse>(
      'GET',
      `/api/v1/graph/roadmap?${params.toString()}`
    );

    // Output
    if (options.json) {
      console.log(JSON.stringify(response, null, 2));
    } else {
      displayRoadmap(response, options);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n✗ Failed to load roadmap: ${message}\n`));
    process.exit(1);
  }
}

/**
 * Create the roadmap command
 */
export function roadmapCommand() {
  const roadmap = new Command('roadmap')
    .description('View product roadmap (committed epics by quarter)')
    .option('-a, --all', 'Include uncommitted items (ideas/backlog)')
    .option('-s, --status <status>', 'Filter by status (not_started, in_progress, completed, cancelled)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
${chalk.gray('Examples:')}
  ${chalk.green('ginko roadmap')}                    ${chalk.gray('# Show committed epics by quarter')}
  ${chalk.green('ginko roadmap --all')}              ${chalk.gray('# Include uncommitted ideas')}
  ${chalk.green('ginko roadmap --status in_progress')} ${chalk.gray('# Show only in-progress epics')}
  ${chalk.green('ginko roadmap --json')}             ${chalk.gray('# Output as JSON for scripting')}

${chalk.gray('Status Icons:')}
  ${chalk.gray('○')} not_started    ${chalk.blue('◐')} in_progress
  ${chalk.green('●')} completed      ${chalk.red('✗')} cancelled

${chalk.gray('Learn More:')}
  ${chalk.dim('See ADR-056: Roadmap as Epic View')}
`)
    .action(roadmapAction);

  return roadmap;
}
