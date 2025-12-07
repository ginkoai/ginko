/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-07
 * @tags: [epic, decomposition, ai, planning, task-generation, epic-004, sprint-4]
 * @related: [../../task/available/route.ts, ../../sprint/sync/route.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [@anthropic-ai/sdk]
 */

/**
 * POST /api/v1/epic/decompose
 *
 * AI-assisted epic decomposition into actionable tasks
 *
 * Uses Claude to analyze epic content and suggest a breakdown of tasks with:
 * - Effort estimates (small/medium/large)
 * - Required capabilities/skills
 * - Task dependencies
 * - Clear, actionable descriptions
 *
 * Request Body:
 * - epicId: Epic ID (e.g., "EPIC-004")
 * - epicContent: Epic markdown content
 * - maxTasks: Maximum tasks to suggest (default: 10)
 * - context: Additional context for LLM (optional)
 *
 * Returns:
 * - epicId: The epic ID
 * - suggestedTasks: Array of task suggestions
 * - reasoning: AI's analysis and reasoning
 * - estimatedTotalEffort: Overall effort estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface DecomposeRequest {
  epicId: string;
  epicContent: string;
  maxTasks?: number;
  context?: string;
}

interface TaskSuggestion {
  id: string;
  title: string;
  description: string;
  effort: 'small' | 'medium' | 'large';
  capabilities: string[];
  dependsOn: string[];
}

interface DecompositionResult {
  epicId: string;
  suggestedTasks: TaskSuggestion[];
  reasoning: string;
  estimatedTotalEffort: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * System prompt for epic decomposition
 */
const SYSTEM_PROMPT = `You are a software architect and product manager expert at decomposing epics into actionable tasks.

Your role is to analyze epic descriptions and break them down into well-structured, implementable tasks that:
1. Are specific and actionable (clear completion criteria)
2. Have realistic effort estimates
3. Identify necessary technical capabilities
4. Consider dependencies between tasks
5. Follow a logical implementation sequence

Guidelines:
- Small tasks: 2-4 hours of focused work
- Medium tasks: 1-2 days of work
- Large tasks: 3+ days of work (try to break these down further if possible)
- Capabilities should be specific technical skills (e.g., "typescript", "react", "api-design", "testing", "database", "devops")
- Dependencies use task IDs like T1, T2, etc. (numbered in suggested order)
- Each task should be independently testable when its dependencies are complete
- Consider parallelization - identify tasks that can run concurrently`;

/**
 * Build the decomposition prompt
 */
function buildDecompositionPrompt(
  epicContent: string,
  maxTasks: number,
  context?: string
): string {
  return `Analyze this epic and suggest a breakdown of up to ${maxTasks} actionable tasks.

EPIC CONTENT:
${epicContent}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

Please provide a JSON response with this exact structure:
{
  "suggestedTasks": [
    {
      "id": "T1",
      "title": "Task title",
      "description": "What needs to be done and why (2-3 sentences)",
      "effort": "small" | "medium" | "large",
      "capabilities": ["typescript", "api-design"],
      "dependsOn": []
    }
  ],
  "reasoning": "Brief explanation of your decomposition approach",
  "estimatedTotalEffort": "e.g., '2-3 weeks' or '5-7 days'"
}

Important:
- Use T1, T2, T3 etc. for task IDs
- dependsOn should reference other task IDs (e.g., ["T1", "T2"])
- Tasks with no dependencies have dependsOn: []
- Order tasks logically - foundation tasks first
- Identify tasks that can run in parallel (both depend on same predecessor)`;
}

export async function POST(request: NextRequest) {
  console.log('[Epic Decompose API] POST /api/v1/epic/decompose called');

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        } as ErrorResponse,
        { status: 401 }
      );
    }

    // Parse request body
    const body: DecomposeRequest = await request.json();

    // Validate required fields
    if (!body.epicId || !body.epicContent) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_FIELDS',
            message: 'epicId and epicContent are required',
          },
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate maxTasks
    const maxTasks = body.maxTasks && body.maxTasks > 0 ? Math.min(body.maxTasks, 20) : 10;

    // Check for Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: 'AI_SERVICE_NOT_CONFIGURED',
            message: 'AI service not configured. Please set ANTHROPIC_API_KEY.',
          },
        } as ErrorResponse,
        { status: 503 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build prompt
    const prompt = buildDecompositionPrompt(body.epicContent, maxTasks, body.context);

    console.log('[Epic Decompose API] Calling Claude API...');

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for consistent, structured output
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    if (!responseText) {
      return NextResponse.json(
        {
          error: {
            code: 'EMPTY_RESPONSE',
            message: 'Empty response from AI service',
          },
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Parse JSON response
    let decomposition: {
      suggestedTasks: TaskSuggestion[];
      reasoning: string;
      estimatedTotalEffort: string;
    };

    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      decomposition = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Epic Decompose API] Failed to parse AI response:', parseError);
      console.error('[Epic Decompose API] Response text:', responseText.substring(0, 500));
      return NextResponse.json(
        {
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse AI response as JSON',
            details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          },
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Validate response structure
    if (!decomposition.suggestedTasks || !Array.isArray(decomposition.suggestedTasks)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_RESPONSE',
            message: 'Invalid response structure from AI service - missing suggestedTasks array',
          },
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Build final result
    const result: DecompositionResult = {
      epicId: body.epicId,
      suggestedTasks: decomposition.suggestedTasks,
      reasoning: decomposition.reasoning || 'No reasoning provided',
      estimatedTotalEffort: decomposition.estimatedTotalEffort || 'Unknown',
    };

    console.log(
      `[Epic Decompose API] Success: ${result.suggestedTasks.length} tasks suggested for ${body.epicId}`
    );

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[Epic Decompose API] ERROR:', error);

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          error: {
            code: 'AI_SERVICE_ERROR',
            message: error.message,
          },
        } as ErrorResponse,
        { status: error.status || 500 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to decompose epic',
        },
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
