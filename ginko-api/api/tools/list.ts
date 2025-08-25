/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, tools]
 * @related: [serverless-api, entitlements-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@vercel/node, entitlements-manager]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  checkToolAccess,
  initializeEntitlements
} from '../_utils.js';
import EntitlementsManager, { FeatureFlag } from '../_lib/entitlements-manager.js';

// Simplified MCP interface - exposing only 5 core tools per enhanced handoff consolidation
const tools = [
  {
    name: 'context',
    description: 'Auto-load project context with best practices, team activity, and session resume',
    inputSchema: {
      type: 'object',
      properties: {
        autoResume: {
          type: 'boolean',
          description: 'Whether to auto-resume most recent handoff (default: true)'
        }
      }
    }
  },
  {
    name: 'load_handoff',
    description: 'Load handoff content from previous session (auto-loads most recent if no sessionId provided)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Optional: Session ID to load specific handoff. If omitted, loads most recent handoff.'
        }
      }
    }
  },
  {
    name: 'prepare_handoff',
    description: 'Enhanced two-step handoff: Step 1 generates template, Step 2 saves completed handoff content. CRITICAL: Use REAL markdown formatting with actual newlines (press Enter), NOT escaped characters like \\n. Format for human reading.',
    inputSchema: {
      type: 'object',
      properties: {
        currentTask: {
          type: 'string',
          description: 'Brief description of what you are currently working on'
        },
        handoffContent: {
          type: 'string',
          description: 'Optional: Completed handoff content with REAL markdown formatting (actual newlines, not \\n). Use proper markdown: # Headers, **bold**, - lists. Format for human terminal reading.'
        }
      },
      required: ['currentTask']
    }
  },
  {
    name: 'handoff',
    description: 'Enhanced two-step handoff workflow - generates template then saves completed handoff. CRITICAL: Use REAL markdown formatting with actual newlines (press Enter), NOT escaped characters like \\n. Format for human reading.',
    inputSchema: {
      type: 'object',
      properties: {
        currentTask: {
          type: 'string',
          description: 'Brief description of what you are currently working on'
        },
        handoffContent: {
          type: 'string',
          description: 'Optional: Completed handoff content with REAL markdown formatting (actual newlines, not \\n). Use proper markdown: # Headers, **bold**, - lists. Format for human terminal reading.'
        }
      },
      required: ['currentTask']
    }
  },
  {
    name: 'store_handoff',
    description: 'Store handoff content created by Claude. CRITICAL: Content must use REAL markdown formatting with actual newlines, not escaped \\n characters.',
    inputSchema: {
      type: 'object',
      properties: {
        handoffContent: {
          type: 'string',
          description: 'The handoff content with REAL markdown formatting (actual newlines, not \\n). Must be human-readable markdown.'
        }
      },
      required: ['handoffContent']
    }
  },
  {
    name: 'assess_handoff_quality',
    description: 'Score handoff quality on context completeness, task clarity, emotional continuity, and actionability',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID being assessed'
        },
        contextCompleteness: {
          type: 'number',
          description: 'Score 1-10: Do you have all necessary files, decisions, and background?',
          minimum: 1,
          maximum: 10
        },
        taskClarity: {
          type: 'number', 
          description: 'Score 1-10: Is it crystal clear what you need to do first?',
          minimum: 1,
          maximum: 10
        },
        emotionalContinuity: {
          type: 'number',
          description: 'Score 1-10: Does this feel like continuing a conversation vs starting over?',
          minimum: 1,
          maximum: 10
        },
        actionability: {
          type: 'number',
          description: 'Score 1-10: Can you start working immediately without additional questions?',
          minimum: 1,
          maximum: 10
        },
        feedback: {
          type: 'string',
          description: 'Specific feedback on what is missing or unclear'
        },
        missingItems: {
          type: 'array',
          description: 'List of specific items that should have been included',
          items: {
            type: 'string'
          }
        }
      },
      required: ['sessionId', 'contextCompleteness', 'taskClarity', 'emotionalContinuity', 'actionability']
    }
  },
  {
    name: 'retrospective_handoff_feedback',
    description: 'Record end-of-session feedback on what was missing from the original handoff after completing work',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID for which retrospective feedback is being provided'
        },
        completedTasksReview: {
          type: 'string',
          description: 'Brief review of what was actually accomplished this session'
        },
        unexpectedChallenges: {
          type: 'array',
          description: 'Challenges encountered that were not anticipated from the handoff',
          items: {
            type: 'string'
          }
        },
        missingFromOriginalHandoff: {
          type: 'array',
          description: 'Information that should have been included in the original handoff',
          items: {
            type: 'string'
          }
        },
        wouldHaveBeenHelpful: {
          type: 'array',
          description: 'Things that would have been helpful to know upfront',
          items: {
            type: 'string'
          }
        },
        hiddenDecisions: {
          type: 'array',
          description: 'Important decisions made during work that should be documented for future handoffs',
          items: {
            type: 'string'
          }
        },
        improvementSuggestions: {
          type: 'string',
          description: 'Specific suggestions for improving future handoffs'
        },
        overallExperience: {
          type: 'number',
          description: 'Overall score 1-10: How well did the handoff prepare you for the actual work?',
          minimum: 1,
          maximum: 10
        }
      },
      required: ['sessionId', 'completedTasksReview']
    }
  },
  {
    name: 'score_collaboration_session',
    description: 'AI-driven analysis of collaboration session to generate comprehensive scoring and metrics for dashboard analytics',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Unique session identifier for the collaboration session being scored'
        },
        sessionSummary: {
          type: 'string', 
          description: 'Brief summary of what was accomplished in this session'
        },
        tasksPlanned: {
          type: 'array',
          description: 'List of tasks that were planned at session start',
          items: {
            type: 'string'
          }
        },
        tasksCompleted: {
          type: 'array',
          description: 'List of tasks that were actually completed',
          items: {
            type: 'string'
          }
        },
        unexpectedWork: {
          type: 'array',
          description: 'Unplanned work that emerged during the session',
          items: {
            type: 'string'
          }
        },
        blockers: {
          type: 'array',
          description: 'Obstacles encountered during the session',
          items: {
            type: 'string'
          }
        },
        breakthroughs: {
          type: 'array',
          description: 'Key insights or breakthroughs achieved',
          items: {
            type: 'string'
          }
        }
      },
      required: ['sessionId', 'sessionSummary']
    }
  },
  {
    name: 'generate_coaching_insights',
    description: 'AI-driven generation of personalized coaching insights based on collaboration patterns and session history',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Current session ID for context'
        },
        collaborationContext: {
          type: 'string',
          description: 'Context about the collaboration style and approach used this session'
        },
        challengesFaced: {
          type: 'array',
          description: 'Key challenges encountered during the session',
          items: {
            type: 'string'
          }
        },
        successMoments: {
          type: 'array',
          description: 'Moments where collaboration was particularly effective',
          items: {
            type: 'string'
          }
        },
        workflowObservations: {
          type: 'string',
          description: 'Observations about workflow efficiency, communication patterns, or process improvements'
        }
      },
      required: ['sessionId', 'collaborationContext']
    }
  }
];

// Feature map for the enhanced handoff interface (9 tools)
const toolFeatureMap: Record<string, FeatureFlag | undefined> = {
  'context': FeatureFlag.SESSION_HANDOFF,
  'load_handoff': FeatureFlag.SESSION_HANDOFF,
  'prepare_handoff': FeatureFlag.SESSION_HANDOFF,
  'handoff': FeatureFlag.SESSION_HANDOFF,
  'store_handoff': FeatureFlag.SESSION_HANDOFF,
  'assess_handoff_quality': FeatureFlag.SESSION_HANDOFF,
  'retrospective_handoff_feedback': FeatureFlag.SESSION_HANDOFF,
  'score_collaboration_session': FeatureFlag.SESSION_HANDOFF,
  'generate_coaching_insights': FeatureFlag.SESSION_HANDOFF
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);

    // Check tool access
    await checkToolAccess(user, 'list_tools');

    // Initialize entitlements and get user's available features
    await initializeEntitlements();
    const availableFeatures = EntitlementsManager.getFeatureAvailability(user.planTier);

    // Filter tools based on available features
    const filteredTools = tools.filter(tool => {
      const requiredFeature = toolFeatureMap[tool.name];
      return !requiredFeature || availableFeatures[requiredFeature];
    });

    sendSuccess(res, {
      tools: filteredTools,
      planTier: user.planTier,
      planStatus: user.planStatus,
      availableFeatures: Object.keys(availableFeatures).filter(f => availableFeatures[f])
    });

  } catch (error) {
    console.error('[VERCEL] Tools list error:', error);
    sendError(res, error instanceof Error ? error : 'Internal server error');
  }
}