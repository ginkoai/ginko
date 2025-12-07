/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, teams, webhook, epic-004]
 * @related: [index.ts, notification-hooks.ts, slack.ts, discord.ts, webhook.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import { NotificationPayload } from '../notification-hooks.js';
import { retryWithBackoff, formatSeverity, truncate } from './index.js';

/**
 * Teams notification configuration
 */
interface TeamsConfig {
  webhook_url: string;
}

/**
 * Send notification to Microsoft Teams via webhook
 *
 * @param config - Teams configuration (must include webhook_url)
 * @param payload - Notification payload
 * @returns Promise<boolean> - True if notification sent successfully
 */
export async function sendNotification(
  config: Record<string, string>,
  payload: NotificationPayload
): Promise<boolean> {
  const teamsConfig = config as unknown as TeamsConfig;

  // Validate required config
  if (!teamsConfig.webhook_url) {
    console.error('[TeamsNotification] Missing webhook_url in config');
    return false;
  }

  try {
    // Build Teams message (Adaptive Card format)
    const message = buildTeamsMessage(payload);

    // Send with retry logic
    await retryWithBackoff(async () => {
      const response = await fetch(teamsConfig.webhook_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Teams webhook returned ${response.status}: ${response.statusText}`);
      }

      return response;
    });

    return true;
  } catch (error) {
    console.error('[TeamsNotification] Failed to send notification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Build Microsoft Teams message with Adaptive Card
 *
 * @param payload - Notification payload
 * @returns Teams message object
 */
function buildTeamsMessage(payload: NotificationPayload): TeamsMessage {
  const themeColor = getSeverityColor(payload.severity);

  // Build facts array for metadata
  const facts: TeamsFact[] = [
    {
      title: 'Severity',
      value: formatSeverity(payload.severity)
    },
    {
      title: 'Event',
      value: payload.event
    },
  ];

  if (payload.taskId) {
    facts.push({
      title: 'Task',
      value: payload.taskId
    });
  }

  if (payload.epicId) {
    facts.push({
      title: 'Epic',
      value: payload.epicId
    });
  }

  if (payload.agentId) {
    facts.push({
      title: 'Agent',
      value: payload.agentId
    });
  }

  // Add custom metadata
  if (payload.metadata) {
    for (const [key, value] of Object.entries(payload.metadata)) {
      // Limit to 10 facts total
      if (facts.length >= 10) break;

      facts.push({
        title: capitalizeFirst(key),
        value: String(value)
      });
    }
  }

  // Build message card
  const message: TeamsMessage = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: truncate(payload.title, 100),
    themeColor,
    sections: [
      {
        activityTitle: payload.title,
        activitySubtitle: new Date(payload.timestamp).toLocaleString(),
        facts,
        text: truncate(payload.description, 5000)
      }
    ]
  };

  return message;
}

/**
 * Get theme color for severity level (Teams uses hex colors)
 *
 * @param severity - Severity level
 * @returns Hex color string
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'FF0000'; // Red
    case 'high':
      return 'FF8C00'; // Orange
    case 'medium':
      return 'FFD700'; // Yellow/Gold
    case 'low':
      return '1E90FF'; // Blue
    default:
      return '808080'; // Gray
  }
}

/**
 * Capitalize first letter of string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Microsoft Teams message card format
 */
interface TeamsMessage {
  '@type': 'MessageCard';
  '@context': string;
  summary: string;
  themeColor: string;
  sections: TeamsSection[];
}

interface TeamsSection {
  activityTitle: string;
  activitySubtitle?: string;
  facts: TeamsFact[];
  text: string;
}

interface TeamsFact {
  title: string;
  value: string;
}
