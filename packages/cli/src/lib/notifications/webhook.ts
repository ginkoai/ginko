/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, webhook, generic, epic-004]
 * @related: [index.ts, notification-hooks.ts, slack.ts, discord.ts, teams.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { NotificationPayload } from '../notification-hooks.js';
import { retryWithBackoff } from './index.js';

/**
 * Generic webhook notification configuration
 */
interface WebhookConfig {
  webhook_url: string;
  headers?: string; // JSON string of headers
}

/**
 * Send notification to generic webhook endpoint
 *
 * Sends the raw notification payload as JSON to any webhook URL.
 * Supports custom headers for authentication.
 *
 * @param config - Webhook configuration (must include webhook_url)
 * @param payload - Notification payload
 * @returns Promise<boolean> - True if notification sent successfully
 */
export async function sendNotification(
  config: Record<string, string>,
  payload: NotificationPayload
): Promise<boolean> {
  const webhookConfig = config as unknown as WebhookConfig;

  // Validate required config
  if (!webhookConfig.webhook_url) {
    console.error('[WebhookNotification] Missing webhook_url in config');
    return false;
  }

  try {
    // Parse custom headers if provided
    let customHeaders: Record<string, string> = {};
    if (webhookConfig.headers) {
      try {
        customHeaders = JSON.parse(webhookConfig.headers);
      } catch (error) {
        console.warn('[WebhookNotification] Failed to parse custom headers, using defaults');
      }
    }

    // Build headers - custom headers can override defaults
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Send with retry logic
    await retryWithBackoff(async () => {
      const response = await fetch(webhookConfig.webhook_url!, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      return response;
    });

    return true;
  } catch (error) {
    console.error('[WebhookNotification] Failed to send notification:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
