/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, discord, webhook, epic-004]
 * @related: [index.ts, notification-hooks.ts, slack.ts, teams.ts, webhook.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { NotificationPayload } from '../notification-hooks.js';
import { retryWithBackoff, truncate } from './index.js';

/**
 * Discord notification configuration
 */
interface DiscordConfig {
  webhook_url: string;
}

/**
 * Send notification to Discord via webhook
 *
 * @param config - Discord configuration (must include webhook_url)
 * @param payload - Notification payload
 * @returns Promise<boolean> - True if notification sent successfully
 */
export async function sendNotification(
  config: Record<string, string>,
  payload: NotificationPayload
): Promise<boolean> {
  const discordConfig = config as unknown as DiscordConfig;

  // Validate required config
  if (!discordConfig.webhook_url) {
    console.error('[DiscordNotification] Missing webhook_url in config');
    return false;
  }

  try {
    // Build Discord message
    const message = buildDiscordMessage(payload);

    // Send with retry logic
    await retryWithBackoff(async () => {
      const response = await fetch(discordConfig.webhook_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}: ${response.statusText}`);
      }

      return response;
    });

    return true;
  } catch (error) {
    console.error('[DiscordNotification] Failed to send notification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Build Discord message with embed
 *
 * @param payload - Notification payload
 * @returns Discord message object
 */
function buildDiscordMessage(payload: NotificationPayload): DiscordMessage {
  const embed: DiscordEmbed = {
    title: truncate(payload.title, 256), // Discord limit: 256 chars
    description: truncate(payload.description, 4096), // Discord limit: 4096 chars
    color: getSeverityColor(payload.severity),
    fields: [],
    timestamp: payload.timestamp,
    footer: {
      text: `Ginko ${payload.event}`,
    },
  };

  // Add fields
  if (payload.severity) {
    embed.fields!.push({
      name: 'Severity',
      value: capitalizeFirst(payload.severity),
      inline: true,
    });
  }

  if (payload.taskId) {
    embed.fields!.push({
      name: 'Task',
      value: payload.taskId,
      inline: true,
    });
  }

  if (payload.epicId) {
    embed.fields!.push({
      name: 'Epic',
      value: payload.epicId,
      inline: true,
    });
  }

  if (payload.agentId) {
    embed.fields!.push({
      name: 'Agent',
      value: payload.agentId,
      inline: true,
    });
  }

  // Add custom metadata fields (limit to 25 fields total - Discord limit)
  if (payload.metadata) {
    for (const [key, value] of Object.entries(payload.metadata)) {
      if (embed.fields!.length >= 25) break;

      embed.fields!.push({
        name: capitalizeFirst(key),
        value: truncate(String(value), 1024), // Discord limit: 1024 chars per field
        inline: true,
      });
    }
  }

  return { embeds: [embed] };
}

/**
 * Get color for severity level (Discord uses decimal color codes)
 *
 * @param severity - Severity level
 * @returns Discord color code
 */
function getSeverityColor(severity: string): number {
  switch (severity) {
    case 'critical':
      return 0xFF0000; // Red
    case 'high':
      return 0xFF8C00; // Orange
    case 'medium':
      return 0xFFD700; // Yellow/Gold
    case 'low':
      return 0x1E90FF; // Blue
    default:
      return 0x808080; // Gray
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

interface DiscordMessage {
  embeds: DiscordEmbed[];
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp: string;
  footer?: {
    text: string;
  };
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline: boolean;
}
