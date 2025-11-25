/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [sprint, graph-sync, epic-001, task-2]
 * @related: [_cloud-graph-client.ts, active/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/sprint/sync
 *
 * Sync sprint markdown to graph (TASK-2)
 *
 * Creates Sprint and Task nodes with relationships:
 * - (Sprint)-[:CONTAINS]->(Task)
 * - (Sprint)-[:NEXT_TASK]->(Task) - First incomplete task
 *
 * Request Body:
 * - graphId: Graph namespace identifier
 * - sprintContent: Sprint markdown content to parse and sync
 *
 * Returns:
 * - success: boolean
 * - nodes: Count of nodes created
 * - relationships: Count of relationships created
 * - sprint: Sprint node data
 * - nextTask: ID of next incomplete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';

interface SprintGraph {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    progress: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'complete';
    effort: string;
    priority: string;
    files: string[];
    relatedADRs: string[];
    relatedPatterns: string[]; // EPIC-002 Sprint 2: Pattern references
    relatedGotchas: string[]; // EPIC-002 Sprint 2: Gotcha warnings
    owner?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Parse request body
    const body = await request.json();
    const { graphId, sprintContent } = body;

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    if (!sprintContent) {
      return NextResponse.json(
        { error: 'Missing required parameter: sprintContent' },
        { status: 400 }
      );
    }

    // Create graph client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Parse sprint to graph structure
    const sprintGraph = parseSprintToGraph(sprintContent);

    // Sync to graph
    const result = await syncSprintToGraph(client, sprintGraph);

    return NextResponse.json({
      success: true,
      ...result,
      sprint: sprintGraph.sprint,
      nextTask: result.nextTaskId,
    });

  } catch (error) {
    console.error('[Sprint Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse sprint markdown into graph structure
 * Extracts Sprint and Task nodes with relationships
 *
 * Sprint format expected:
 * - Sprint name from filename: SPRINT-YYYY-MM-name.md
 * - Goal from top section
 * - Tasks from sections starting with "### TASK-XXX:"
 */
function parseSprintToGraph(content: string): SprintGraph {
  // Extract sprint metadata from header
  const sprintNameMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
  const sprintName = sprintNameMatch ? sprintNameMatch[1].trim() : 'Unknown Sprint';

  // Extract sprint ID and dates from title
  // Format: "SPRINT-2025-12-graph-infrastructure"
  const sprintIdMatch = sprintName.match(/SPRINT[- ](\d{4})[- ](\d{2})[- ](.+)/i);
  const sprintId = sprintIdMatch
    ? `sprint_${sprintIdMatch[1]}_${sprintIdMatch[2]}_${sprintIdMatch[3].toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    : `sprint_${Date.now()}`;

  // Extract start and end dates
  const dateRangeMatch = content.match(/\*\*(?:Duration|Timeline|Dates?):\*\*\s*([^\n]+)/i);
  let startDate = '';
  let endDate = '';

  if (dateRangeMatch) {
    const dateText = dateRangeMatch[1];
    // Try to parse date range like "2025-11-20 to 2025-12-04"
    const rangeMatch = dateText.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/);
    if (rangeMatch) {
      startDate = rangeMatch[1];
      endDate = rangeMatch[2];
    }
  }

  // Extract goal
  const goalMatch = content.match(/\*\*(?:Goal|Sprint Goal):\*\*\s*([^\n]+)/i);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  // Extract progress
  const progressMatch = content.match(/\*\*Progress:\*\*\s*(\d+)%/i);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  // Build sprint object
  const sprint = {
    id: sprintId,
    name: sprintName,
    goal,
    startDate,
    endDate,
    progress,
  };

  // Extract tasks
  const tasks: SprintGraph['tasks'] = [];

  // Match task sections: ### TASK-XXX: Title
  const taskSections = content.split(/\n### TASK-/);

  for (let i = 1; i < taskSections.length; i++) {
    const section = taskSections[i];

    // Extract task ID and title from first line
    const firstLine = section.split('\n')[0];
    const taskMatch = firstLine.match(/^(\d+):\s*(.+)$/);

    if (!taskMatch) continue;

    const taskNumber = taskMatch[1];
    const taskTitle = taskMatch[2].trim();
    const taskId = `task_${taskNumber}_${Date.now()}`;

    // Extract status
    let status: 'not_started' | 'in_progress' | 'complete' = 'not_started';
    const statusMatch = section.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
    if (statusMatch) {
      const statusText = statusMatch[1].trim().toLowerCase();
      if (statusText.includes('complete') || statusText.includes('done')) {
        status = 'complete';
      } else if (statusText.includes('in progress') || statusText.includes('in-progress')) {
        status = 'in_progress';
      }
    }

    // Extract effort
    const effortMatch = section.match(/\*\*Effort:\*\*\s*([^\n]+)/i);
    const effort = effortMatch ? effortMatch[1].trim() : '';

    // Extract priority
    const priorityMatch = section.match(/\*\*Priority:\*\*\s*([^\n]+)/i);
    const priority = priorityMatch ? priorityMatch[1].trim().toUpperCase() : 'MEDIUM';

    // Extract owner
    const ownerMatch = section.match(/\*\*Owner:\*\*\s*([^\n]+)/i);
    const owner = ownerMatch ? ownerMatch[1].trim() : undefined;

    // Extract files
    const filesMatch = section.match(/\*\*Files:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    const files: string[] = [];
    if (filesMatch) {
      const fileLines = filesMatch[1].match(/[-*]\s*(?:Create|Update|Modify):\s*`([^`]+)`/gi);
      if (fileLines) {
        fileLines.forEach(line => {
          const fileMatch = line.match(/`([^`]+)`/);
          if (fileMatch) {
            files.push(fileMatch[1]);
          }
        });
      }
    }

    // Extract related ADRs
    const relatedADRs: string[] = [];
    const adrPattern = /ADR-(\d{3})/g;
    let adrMatch;
    while ((adrMatch = adrPattern.exec(section)) !== null) {
      const adrId = `adr_${adrMatch[1]}`;
      if (!relatedADRs.includes(adrId)) {
        relatedADRs.push(adrId);
      }
    }

    // Extract related patterns (EPIC-002 Sprint 2)
    // Patterns can be referenced as:
    // - "Use pattern from file.ts" or "pattern in file.ts"
    // - "See file.ts for example"
    // - Explicit pattern IDs like "pattern_xxx"
    const relatedPatterns: string[] = [];

    // Match "pattern from/in file.ts" references
    const patternFileMatches = section.matchAll(/(?:use|apply|see|follow)\s+(?:the\s+)?(?:pattern|example)\s+(?:from|in)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"]?/gi);
    for (const match of patternFileMatches) {
      const patternId = `pattern_${match[1].replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!relatedPatterns.includes(patternId)) {
        relatedPatterns.push(patternId);
      }
    }

    // Match explicit pattern IDs
    const explicitPatternMatches = section.matchAll(/pattern[_-]([a-zA-Z0-9_]+)/gi);
    for (const match of explicitPatternMatches) {
      const patternId = `pattern_${match[1]}`;
      if (!relatedPatterns.includes(patternId)) {
        relatedPatterns.push(patternId);
      }
    }

    // Extract related gotchas (EPIC-002 Sprint 2)
    const relatedGotchas: string[] = [];

    // Match "avoid X", "watch out for X", "gotcha: X"
    const gotchaWarningMatches = section.matchAll(/(?:avoid|watch out for|beware of|gotcha:)\s+[`"]?([^`".\n]+)[`"]?/gi);
    for (const match of gotchaWarningMatches) {
      const gotchaId = `gotcha_${match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      if (!relatedGotchas.includes(gotchaId)) {
        relatedGotchas.push(gotchaId);
      }
    }

    // Match explicit gotcha names (kebab-case with -gotcha suffix)
    const explicitGotchaMatches = section.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha)\b/gi);
    for (const match of explicitGotchaMatches) {
      const gotchaId = `gotcha_${match[1].replace(/-/g, '_')}`;
      if (!relatedGotchas.includes(gotchaId)) {
        relatedGotchas.push(gotchaId);
      }
    }

    tasks.push({
      id: taskId,
      title: taskTitle,
      status,
      effort,
      priority,
      files,
      relatedADRs,
      relatedPatterns,
      relatedGotchas,
      owner,
    });
  }

  return {
    sprint,
    tasks,
  };
}

/**
 * Sync sprint graph to Neo4j
 * Creates all nodes and relationships
 *
 * TASK-3: Now creates File nodes and MODIFIES relationships
 *
 * @param client - CloudGraphClient instance
 * @param graph - Parsed sprint graph structure
 * @returns Sync result with counts and next task
 */
async function syncSprintToGraph(
  client: CloudGraphClient,
  graph: SprintGraph
): Promise<{
  nodes: number;
  relationships: number;
  nextTaskId: string | null;
}> {
  let nodeCount = 0;
  let relCount = 0;

  // Create Sprint node
  await client.createNode('Sprint', {
    id: graph.sprint.id,
    name: graph.sprint.name,
    goal: graph.sprint.goal,
    startDate: graph.sprint.startDate,
    endDate: graph.sprint.endDate,
    progress: graph.sprint.progress,
  });
  nodeCount++;

  // Collect all unique files across tasks (TASK-3)
  const allFiles = new Set<string>();
  for (const task of graph.tasks) {
    task.files.forEach(file => allFiles.add(file));
  }

  // Create File nodes (TASK-3)
  for (const filePath of allFiles) {
    await client.createNode('File', {
      id: `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      path: filePath,
      status: 'current', // Default status
    });
    nodeCount++;
  }

  // Create Task nodes
  for (const task of graph.tasks) {
    await client.createNode('Task', {
      id: task.id,
      title: task.title,
      status: task.status,
      effort: task.effort,
      priority: task.priority,
      files: task.files,
      relatedADRs: task.relatedADRs,
      owner: task.owner || '',
    });
    nodeCount++;
  }

  // Find first incomplete task (for NEXT_TASK relationship)
  const nextTask = graph.tasks.find(
    t => t.status === 'not_started' || t.status === 'in_progress'
  );

  // Create Sprint → Task relationships (CONTAINS)
  for (const task of graph.tasks) {
    await client.createRelationship(graph.sprint.id, task.id, {
      type: 'CONTAINS',
    });
    relCount++;
  }

  // Create Sprint → Next Task relationship
  if (nextTask) {
    await client.createRelationship(graph.sprint.id, nextTask.id, {
      type: 'NEXT_TASK',
    });
    relCount++;
  }

  // Create Task → File relationships (MODIFIES) - TASK-3
  for (const task of graph.tasks) {
    for (const filePath of task.files) {
      const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await client.createRelationship(task.id, fileId, {
        type: 'MODIFIES',
      });
      relCount++;
    }
  }

  // Create Task → ADR relationships (MUST_FOLLOW) - EPIC-002 Sprint 1
  // Enables AI constraint awareness: when picking up a task, AI knows which ADRs to follow
  for (const task of graph.tasks) {
    for (const adrId of task.relatedADRs) {
      // Ensure ADR node exists (merge pattern)
      await client.createNode('ADR', {
        id: adrId,
        // Minimal data - ADR details loaded separately via adr-loader
      });
      nodeCount++;

      // Create MUST_FOLLOW relationship
      await client.createRelationship(task.id, adrId, {
        type: 'MUST_FOLLOW',
        source: 'sprint_definition', // Where the reference came from
        extracted_at: new Date().toISOString(),
      });
      relCount++;
    }
  }

  // Create Task → Pattern relationships (APPLIES_PATTERN) - EPIC-002 Sprint 2
  // Enables AI pattern reuse: when picking up a task, AI knows which patterns to apply
  for (const task of graph.tasks) {
    for (const patternId of task.relatedPatterns) {
      // Ensure Pattern node exists (merge pattern)
      await client.createNode('Pattern', {
        id: patternId,
        category: 'pattern',
        // Pattern details enriched via context module API
      });
      nodeCount++;

      // Create APPLIES_PATTERN relationship
      await client.createRelationship(task.id, patternId, {
        type: 'APPLIES_PATTERN',
        source: 'sprint_definition',
        extracted_at: new Date().toISOString(),
      });
      relCount++;

      // Create Pattern → File relationships (APPLIED_IN)
      // If the pattern references a file, link the pattern to that file
      for (const filePath of task.files) {
        const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await client.createRelationship(patternId, fileId, {
          type: 'APPLIED_IN',
          context: `Referenced in task ${task.id}`,
          extracted_at: new Date().toISOString(),
        });
        relCount++;
      }
    }
  }

  // Create Task → Gotcha relationships (AVOID_GOTCHA) - EPIC-002 Sprint 2
  // Enables AI gotcha awareness: when picking up a task, AI knows what pitfalls to avoid
  for (const task of graph.tasks) {
    for (const gotchaId of task.relatedGotchas) {
      // Ensure Gotcha node exists (merge pattern)
      await client.createNode('Gotcha', {
        id: gotchaId,
        category: 'gotcha',
        severity: 'medium', // Default severity
        // Gotcha details enriched via context module API or ginko log --category=gotcha
      });
      nodeCount++;

      // Create AVOID_GOTCHA relationship
      await client.createRelationship(task.id, gotchaId, {
        type: 'AVOID_GOTCHA',
        source: 'sprint_definition',
        extracted_at: new Date().toISOString(),
      });
      relCount++;
    }
  }

  return {
    nodes: nodeCount,
    relationships: relCount,
    nextTaskId: nextTask ? nextTask.id : null,
  };
}
