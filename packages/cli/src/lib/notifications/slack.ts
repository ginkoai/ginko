/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, slack, webhook, epic-004]
 * @related: [index.ts, notification-hooks.ts, discord.ts, teams.ts, webhook.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { NotificationPayload } from '../notification-hooks.js';
import { retryWithBackoff, formatSeverity, truncate } from './index.js';

/**
 * Slack notification configuration
 */
interface SlackConfig {
  webhook_url: string;
  channel?: string;      // Optional: override default webhook channel
  username?: string;     // Optional: override default webhook username
  icon_emoji?: string;   // Optional: override default webhook icon
}

/**
 * Slack message block format
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: any;
}

/**
 * Send notification to Slack via webhook
 *
 * @param config - Slack configuration (must include webhook_url)
 * @param payload - Notification payload
 * @returns Promise<boolean> - True if notification sent successfully
 */
export async function sendNotification(
  config: Record<string, string>,
  payload: NotificationPayload
): Promise<boolean> {
  const slackConfig = config as unknown as SlackConfig;

  // Validate required config
  if (!slackConfig.webhook_url) {
    console.error('[SlackNotification] Missing webhook_url in config');
    return false;
  }

  try {
    // Build Slack message
    const message = buildSlackMessage(slackConfig, payload);

    // Send with retry logic
    await retryWithBackoff(async () => {
      const response = await fetch(slackConfig.webhook_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}: ${response.statusText}`);
      }

      return response;
    });

    return true;
  } catch (error) {
    console.error('[SlackNotification] Failed to send notification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Build Slack message with rich formatting
 *
 * @param config - Slack configuration
 * @param payload - Notification payload
 * @returns Slack message object
 */
function buildSlackMessage(config: SlackConfig, payload: NotificationPayload): any {
  const blocks: SlackBlock[] = [];

  // Header block with severity emoji
  const severityEmoji = getSeverityEmoji(payload.severity);
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${severityEmoji} ${payload.title}`,
    },
  });

  // Description block
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: truncate(payload.description, 3000), // Slack limit: 3000 chars per text block
    },
  });

  // Details block (if metadata available)
  const fields = buildFields(payload);
  if (fields.length > 0) {
    blocks.push({
      type: 'section',
      fields,
    });
  }

  // Context block with timestamp
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Event:* ${payload.event} | *Time:* <!date^${Math.floor(new Date(payload.timestamp).getTime() / 1000)}^{date_short_pretty} at {time}|${payload.timestamp}>`,
      },
    ],
  } as any);

  // Build final message
  const message: any = {
    blocks,
  };

  // Add optional overrides
  if (config.channel) {
    message.channel = config.channel;
  }
  if (config.username) {
    message.username = config.username;
  }
  if (config.icon_emoji) {
    message.icon_emoji = config.icon_emoji;
  }

  return message;
}

/**
 * Build fields for Slack message
 *
 * @param payload - Notification payload
 * @returns Array of Slack fields
 */
function buildFields(payload: NotificationPayload): Array<{ type: string; text: string }> {
  const fields: Array<{ type: string; text: string }> = [];

  if (payload.severity) {
    fields.push({
      type: 'mrkdwn',
      text: `*Severity:*\n${formatSeverity(payload.severity)}`,
    });
  }

  if (payload.taskId) {
    fields.push({
      type: 'mrkdwn',
      text: `*Task:*\n${payload.taskId}`,
    });
  }

  if (payload.epicId) {
    fields.push({
      type: 'mrkdwn',
      text: `*Epic:*\n${payload.epicId}`,
    });
  }

  if (payload.agentId) {
    fields.push({
      type: 'mrkdwn',
      text: `*Agent:*\n${payload.agentId}`,
    });
  }

  // Add custom metadata fields
  if (payload.metadata) {
    for (const [key, value] of Object.entries(payload.metadata)) {
      // Limit to 10 fields total (Slack limit)
      if (fields.length >= 10) break;

      fields.push({
        type: 'mrkdwn',
        text: `*${capitalizeFirst(key)}:*\n${String(value)}`,
      });
    }
  }

  return fields;
}

/**
 * Get severity emoji
 *
 * @param severity - Severity level
 * @returns Emoji string
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '💡';
    case 'low':
      return 'ℹ️';
    default:
      return '📢';
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
