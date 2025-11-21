/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-21
 * @tags: [charter, graph-sync, epic-001, task-1]
 * @related: [_cloud-graph-client.ts, charter-loader.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, fs-extra]
 */

/**
 * POST /api/v1/charter/sync
 *
 * Sync project charter to graph (TASK-1)
 *
 * Creates Epic, Problem, Goal, and User nodes with relationships:
 * - (Epic)-[:SOLVES]->(Problem)
 * - (Epic)-[:HAS_GOAL]->(Goal)
 * - (Problem)-[:IMPACTS]->(User)
 *
 * Request Body:
 * - graphId: Graph namespace identifier
 * - charterContent: Charter markdown content to parse and sync
 *
 * Returns:
 * - success: boolean
 * - nodes: Count of nodes created
 * - relationships: Count of relationships created
 * - epic: Epic node data
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';

interface CharterGraph {
  epic: {
    id: string;
    name: string;
    vision: string;
    purpose: string;
  };
  problems: Array<{
    id: string;
    description: string;
  }>;
  goals: Array<{
    id: string;
    text: string;
    type: 'qualitative' | 'quantitative';
  }>;
  users: Array<{
    id: string;
    description: string;
    segment: 'primary' | 'secondary' | 'long-term';
  }>;
  relationships: {
    epicSolvesProblems: string[][];
    epicHasGoals: string[][];
    problemsImpactUsers: string[][];
  };
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
    const { graphId, charterContent } = body;

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    if (!charterContent) {
      return NextResponse.json(
        { error: 'Missing required parameter: charterContent' },
        { status: 400 }
      );
    }

    // Create graph client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Parse charter to graph structure
    const charterGraph = parseCharterToGraph(charterContent);

    // Sync to graph
    const result = await syncCharterToGraph(client, charterGraph);

    return NextResponse.json({
      success: true,
      ...result,
      epic: charterGraph.epic,
    });

  } catch (error) {
    console.error('[Charter Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse charter markdown into graph structure
 * Extracts Epic, Problem, Goal, and User nodes with relationships
 *
 * This is a duplicate of the function in charter-loader.ts to avoid
 * cross-package imports in the API route.
 */
function parseCharterToGraph(content: string): CharterGraph {
  // Generate unique IDs
  const epicId = `epic_ginko_${Date.now()}`;

  // Extract purpose/solution from Purpose section
  const purposeMatch = content.match(/##\s+Purpose\s+([\s\S]*?)(?=\n##|\n---|$)/);
  let purpose = '';
  let vision = '';

  if (purposeMatch) {
    const purposeText = purposeMatch[1];
    const visionMatch = purposeText.match(/\*\*Vision:\*\*\s+([^\n]+)/);
    const solutionMatch = purposeText.match(/\*\*Solution:\*\*\s+([^\n]+(?:\n(?!\*\*)[^\n]+)*)/);

    vision = visionMatch ? visionMatch[1].trim() : '';
    purpose = solutionMatch ? solutionMatch[1].trim() : '';
  }

  const epic = {
    id: epicId,
    name: 'Ginko',
    vision,
    purpose,
  };

  // Extract problems from Purpose section
  const problems: CharterGraph['problems'] = [];

  if (purposeMatch) {
    const purposeText = purposeMatch[1];
    const problemSection = purposeText.match(/\*\*Problem:\*\*\s+([\s\S]*?)(?=\*\*Solution:\*\*|$)/);

    if (problemSection) {
      const problemBullets = problemSection[1].match(/^[-*]\s+\*\*([^*]+)\*\*:/gm);
      if (problemBullets) {
        problemBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*:/);
          if (match) {
            const problemId = `problem_${index + 1}_${Date.now()}`;
            problems.push({
              id: problemId,
              description: match[1].trim(),
            });
          }
        });
      }
    }
  }

  // Extract goals from Success Criteria
  const goals: CharterGraph['goals'] = [];

  // Qualitative goals
  const qualitativeMatch = content.match(/###\s+Qualitative\s+\(Primary\)\s+([\s\S]*?)(?=\n###|$)/);
  if (qualitativeMatch) {
    const checkboxes = qualitativeMatch[1].match(/- \[.\]\s+\*\*([^*]+)\*\*:?([^\n]*)/g);
    if (checkboxes) {
      checkboxes.forEach((line, index) => {
        const match = line.match(/\*\*([^*]+)\*\*:?\s*([^\n]*)/);
        if (match) {
          const goalId = `goal_qual_${index + 1}_${Date.now()}`;
          goals.push({
            id: goalId,
            text: match[1].trim(),
            type: 'qualitative',
          });
        }
      });
    }
  }

  // Quantitative goals (no bold formatting)
  const quantitativeMatch = content.match(/###\s+Quantitative\s+\(Secondary\)\s+([\s\S]*?)(?=\n###|$)/);
  if (quantitativeMatch) {
    const checkboxes = quantitativeMatch[1].match(/- \[.\]\s+([^\n]+)/g);
    if (checkboxes) {
      checkboxes.forEach((line, index) => {
        const match = line.match(/- \[.\]\s+(.+)/);
        if (match) {
          const goalId = `goal_quant_${index + 1}_${Date.now()}`;
          goals.push({
            id: goalId,
            text: match[1].trim(),
            type: 'quantitative',
          });
        }
      });
    }
  }

  // Extract users from Users section
  const users: CharterGraph['users'] = [];
  const usersMatch = content.match(/##\s+Users\s+([\s\S]*?)(?=\n##|$)/);

  if (usersMatch) {
    const usersText = usersMatch[1];

    // Primary users
    const primaryMatch = usersText.match(/\*\*Primary[^:]*:\*\*\s+([\s\S]*?)(?=\n\*\*Secondary|$)/);
    if (primaryMatch) {
      const primaryBullets = primaryMatch[1].match(/^[-*]\s+\*\*([^*]+)\*\*/gm);
      if (primaryBullets) {
        primaryBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*/);
          if (match) {
            const userId = `user_primary_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: match[1].trim(),
              segment: 'primary',
            });
          }
        });
      }
    }

    // Secondary users
    const secondaryMatch = usersText.match(/\*\*Secondary[^:]*:\*\*\s+([\s\S]*?)(?=\n\*\*Long-term|$)/);
    if (secondaryMatch) {
      const secondaryBullets = secondaryMatch[1].match(/^[-*]\s+\*\*([^*]+)\*\*/gm);
      if (secondaryBullets) {
        secondaryBullets.forEach((bullet, index) => {
          const match = bullet.match(/\*\*([^*]+)\*\*/);
          if (match) {
            const userId = `user_secondary_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: match[1].trim(),
              segment: 'secondary',
            });
          }
        });
      }
    }

    // Long-term users
    const longTermMatch = usersText.match(/\*\*Long-term Vision:\*\*\s+([\s\S]*?)(?=\n\*\*|$)/);
    if (longTermMatch) {
      const longTermBullets = longTermMatch[1].match(/^[-*]\s+([^\n]+)/gm);
      if (longTermBullets) {
        longTermBullets.forEach((bullet, index) => {
          const text = bullet.replace(/^[-*]\s+/, '').trim();
          if (text) {
            const userId = `user_long_term_${index + 1}_${Date.now()}`;
            users.push({
              id: userId,
              description: text,
              segment: 'long-term',
            });
          }
        });
      }
    }
  }

  // Build relationships
  const epicSolvesProblems = problems.map(p => [epicId, p.id]);
  const epicHasGoals = goals.map(g => [epicId, g.id]);

  // Each problem impacts all primary users
  const problemsImpactUsers: string[][] = [];
  const primaryUsers = users.filter(u => u.segment === 'primary');
  problems.forEach(problem => {
    primaryUsers.forEach(user => {
      problemsImpactUsers.push([problem.id, user.id]);
    });
  });

  return {
    epic,
    problems,
    goals,
    users,
    relationships: {
      epicSolvesProblems,
      epicHasGoals,
      problemsImpactUsers,
    },
  };
}

/**
 * Sync charter graph to Neo4j
 * Creates all nodes and relationships
 *
 * @param client - CloudGraphClient instance
 * @param graph - Parsed charter graph structure
 * @returns Sync result with counts
 */
async function syncCharterToGraph(
  client: CloudGraphClient,
  graph: CharterGraph
): Promise<{
  nodes: number;
  relationships: number;
}> {
  let nodeCount = 0;
  let relCount = 0;

  // Create Epic node
  await client.createNode('Epic', {
    id: graph.epic.id,
    name: graph.epic.name,
    vision: graph.epic.vision,
    purpose: graph.epic.purpose,
  });
  nodeCount++;

  // Create Problem nodes
  for (const problem of graph.problems) {
    await client.createNode('Problem', {
      id: problem.id,
      description: problem.description,
    });
    nodeCount++;
  }

  // Create Goal nodes
  for (const goal of graph.goals) {
    await client.createNode('Goal', {
      id: goal.id,
      text: goal.text,
      type: goal.type,
    });
    nodeCount++;
  }

  // Create User nodes
  for (const user of graph.users) {
    await client.createNode('User', {
      id: user.id,
      description: user.description,
      segment: user.segment,
    });
    nodeCount++;
  }

  // Create Epic → Problem relationships
  for (const [epicId, problemId] of graph.relationships.epicSolvesProblems) {
    await client.createRelationship(epicId, problemId, {
      type: 'SOLVES',
    });
    relCount++;
  }

  // Create Epic → Goal relationships
  for (const [epicId, goalId] of graph.relationships.epicHasGoals) {
    await client.createRelationship(epicId, goalId, {
      type: 'HAS_GOAL',
    });
    relCount++;
  }

  // Create Problem → User relationships
  for (const [problemId, userId] of graph.relationships.problemsImpactUsers) {
    await client.createRelationship(problemId, userId, {
      type: 'IMPACTS',
    });
    relCount++;
  }

  return {
    nodes: nodeCount,
    relationships: relCount,
  };
}
