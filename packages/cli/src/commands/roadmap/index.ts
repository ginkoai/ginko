/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, cli, epic, product-management, ADR-056, now-next-later]
 * @related: [../graph/api-client.ts, ADR-056]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { GraphApiClient } from '../graph/api-client.js';
import { loadGraphConfig } from '../graph/config.js';

type RoadmapLane = 'now' | 'next' | 'later';

interface EpicRoadmapItem {
  id: string;
  title: string;
  description?: string;
  roadmap_lane: RoadmapLane;
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  priority?: number;
  decision_factors?: string[];
  roadmap_visible: boolean;
  tags?: string[];
}

interface LaneGroup {
  lane: RoadmapLane;
  label: string;
  epics: EpicRoadmapItem[];
}

interface RoadmapResponse {
  epics: EpicRoadmapItem[];
  lanes: LaneGroup[];
  summary: {
    total: number;
    byLane: Record<RoadmapLane, number>;
    byStatus: Record<string, number>;
  };
}

interface RoadmapOptions {
  all?: boolean;
  lane?: string;
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
 * Get lane header with icon
 */
function getLaneHeader(lane: RoadmapLane, count: number): string {
  switch (lane) {
    case 'now':
      return chalk.green(`⚡ Now`) + chalk.dim(` (${count})`);
    case 'next':
      return chalk.cyan(`📋 Next`) + chalk.dim(` (${count})`);
    case 'later':
      return chalk.yellow(`💭 Later`) + chalk.dim(` (${count})`);
  }
}

/**
 * Format decision factors as tags
 */
function formatDecisionFactors(factors: string[] | undefined): string {
  if (!factors || factors.length === 0) return '';
  return chalk.dim(`[${factors.slice(0, 2).join(', ')}]`);
}

/**
 * Display roadmap in CLI format
 */
function displayRoadmap(response: RoadmapResponse, options: RoadmapOptions): void {
  const { lanes, summary } = response;

  // Header
  console.log(chalk.bold('\n🗺️  Product Roadmap\n'));

  // Summary line
  const summaryParts = [];
  if (summary.byLane.now > 0) {
    summaryParts.push(chalk.green(`${summary.byLane.now} now`));
  }
  if (summary.byLane.next > 0) {
    summaryParts.push(chalk.cyan(`${summary.byLane.next} next`));
  }
  if (options.all && summary.byLane.later > 0) {
    summaryParts.push(chalk.yellow(`${summary.byLane.later} later`));
  }
  if (summary.byStatus.in_progress) {
    summaryParts.push(chalk.blue(`${summary.byStatus.in_progress} in progress`));
  }

  if (summaryParts.length > 0) {
    console.log(chalk.dim(`   ${summaryParts.join(' · ')}\n`));
  }

  // Check if empty
  const hasContent = lanes.some(l => l.epics.length > 0);
  if (!hasContent) {
    console.log(chalk.yellow('   No epics found on the roadmap.\n'));
    console.log(chalk.dim('   Tip: Run `ginko roadmap --all` to include Later items.'));
    return;
  }

  // Display each lane
  for (const laneGroup of lanes) {
    if (laneGroup.epics.length === 0) continue;

    console.log(getLaneHeader(laneGroup.lane, laneGroup.epics.length));
    console.log(chalk.dim('   ' + '─'.repeat(50)));

    for (const epic of laneGroup.epics) {
      const icon = getStatusIcon(epic.roadmap_status);
      const title = epic.title;
      const id = chalk.dim(`(${epic.id})`);

      // Build extra info
      const extras: string[] = [];

      // Show decision factors for Later items
      if (laneGroup.lane === 'later' && epic.decision_factors) {
        extras.push(formatDecisionFactors(epic.decision_factors));
      }

      // Show tags if present
      if (epic.tags && epic.tags.length > 0) {
        extras.push(chalk.dim(epic.tags.slice(0, 2).join(', ')));
      }

      console.log(`   ${icon} ${title} ${id}${extras.length ? ' ' + extras.join(' ') : ''}`);
    }
    console.log('');
  }

  // Footer
  if (!options.all && summary.byLane.later > 0) {
    console.log(chalk.dim(`   ${summary.byLane.later} items in Later. Use --all to show.`));
  }
  console.log(chalk.dim('   Tip: Use --lane or --status to filter'));
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
    if (options.lane) {
      params.set('lane', options.lane);
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
    .description('View product roadmap (Now/Next/Later priority lanes)')
    .option('-a, --all', 'Include Later items (ideas/backlog)')
    .option('-l, --lane <lane>', 'Filter by lane (now, next, later)')
    .option('-s, --status <status>', 'Filter by status (not_started, in_progress, completed, cancelled)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
${chalk.gray('Lanes (ADR-056):')}
  ${chalk.green('⚡ Now')}    Fully planned, committed, ready for implementation
  ${chalk.cyan('📋 Next')}   Committed but may need additional planning
  ${chalk.yellow('💭 Later')}  Proposed but not yet committed (has decision factors)

${chalk.gray('Examples:')}
  ${chalk.green('ginko roadmap')}                    ${chalk.gray('# Show Now and Next lanes')}
  ${chalk.green('ginko roadmap --all')}              ${chalk.gray('# Include Later items')}
  ${chalk.green('ginko roadmap --lane now')}         ${chalk.gray('# Show only Now lane')}
  ${chalk.green('ginko roadmap --status in_progress')} ${chalk.gray('# Show only in-progress epics')}

${chalk.gray('Status Icons:')}
  ${chalk.gray('○')} not_started    ${chalk.blue('◐')} in_progress
  ${chalk.green('●')} completed      ${chalk.red('✗')} cancelled

${chalk.gray('Decision Factors (for Later items):')}
  planning, value, feasibility, architecture, design, risks, market-fit, dependencies
`)
    .action(roadmapAction);

  return roadmap;
}
