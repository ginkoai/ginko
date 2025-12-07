/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, adapters, epic-004, resilience]
 * @related: [notification-hooks.ts, slack.ts, discord.ts, teams.ts, webhook.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { NotificationPayload } from '../notification-hooks.js';

/**
 * Standard notification adapter interface
 * All adapters must implement this interface
 */
export interface NotificationAdapter {
  /**
   * Send a notification via this adapter
   *
   * @param config - Adapter-specific configuration
   * @param payload - Notification payload
   * @returns Promise<boolean> - True if notification sent successfully
   */
  sendNotification(
    config: Record<string, string>,
    payload: NotificationPayload
  ): Promise<boolean>;
}

/**
 * Retry configuration for notification dispatches
 */
export interface RetryConfig {
  maxAttempts: number;      // Default: 3
  initialDelayMs: number;   // Default: 1000
  maxDelayMs: number;       // Default: 5000
  backoffMultiplier: number; // Default: 2
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2
};

/**
 * Retry helper for notification dispatches
 * Implements exponential backoff with configurable limits
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable (4xx errors are not retryable)
      if (isNonRetryableError(error)) {
        throw lastError;
      }

      if (attempt < finalConfig.maxAttempts) {
        console.log(`[NotificationRetry] Attempt ${attempt}/${finalConfig.maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential backoff with max delay cap
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if an error is non-retryable (client errors)
 *
 * @param error - Error to check
 * @returns True if error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  // Check for HTTP client errors (4xx)
  if (error.response?.status) {
    const status = error.response.status;
    return status >= 400 && status < 500 && status !== 429; // Retry 429 (rate limit)
  }

  // Check for specific error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('invalid') || message.includes('unauthorized') || message.includes('forbidden')) {
      return true;
    }
  }

  return false;
}

/**
 * Format severity with emoji for notifications
 *
 * @param severity - Severity level
 * @returns Formatted severity string with emoji
 */
export function formatSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨 Critical';
    case 'high':
      return '⚠️  High';
    case 'medium':
      return '💡 Medium';
    case 'low':
      return 'ℹ️  Low';
    default:
      return severity;
  }
}

/**
 * Truncate text to a maximum length
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format timestamp for display
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted timestamp
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}
