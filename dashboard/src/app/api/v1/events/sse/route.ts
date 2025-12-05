/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [events, sse, server-sent-events, realtime, adr-051, multi-agent]
 * @related: [../stream/route.ts, ../../graph/events/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * GET /api/v1/events/sse
 *
 * Server-Sent Events endpoint for real-time event streaming (EPIC-004 Sprint 2 TASK-3)
 *
 * Query Parameters:
 * - graphId: Required - the graph to stream events from
 * - since: Optional event ID to start from (exclusive)
 * - categories: Filter by event categories (comma-separated)
 * - agent_id: Filter by agent ID (for agent-specific streams)
 *
 * SSE Events:
 * - event: Event data as JSON
 * - heartbeat: Keep-alive ping (every 15s)
 * - error: Error message
 * - connected: Initial connection confirmation
 *
 * Headers:
 * - Last-Event-ID: Client can send this to resume from a specific event
 *
 * Reconnection:
 * - Client should reconnect if connection drops
 * - Use Last-Event-ID header to resume from last received event
 * - Automatic retry with exponential backoff recommended
 *
 * Implementation:
 * - Uses edge runtime for better SSE support on Vercel
 * - Internally polls the /api/v1/events/stream endpoint
 * - Falls back gracefully if stream endpoint unavailable
 */

import { NextRequest } from 'next/server';

// Use edge runtime for better SSE support on Vercel
export const runtime = 'edge';

// Keep connection alive for up to 5 minutes
export const maxDuration = 300;

// Poll interval for checking new events (in ms)
const POLL_INTERVAL_MS = 1000;

// Heartbeat interval to keep connection alive (in ms)
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * Format an SSE message
 */
function formatSSE(event: string, data: any, id?: string): string {
  let message = '';
  if (id) {
    message += `id: ${id}\n`;
  }
  message += `event: ${event}\n`;
  message += `data: ${JSON.stringify(data)}\n\n`;
  return message;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const graphId = searchParams.get('graphId');
  const categoriesStr = searchParams.get('categories');
  const agentId = searchParams.get('agent_id');

  // Get since from query param or Last-Event-ID header (SSE reconnection)
  let sinceEventId = searchParams.get('since') || request.headers.get('Last-Event-ID');

  // Validate graphId
  if (!graphId) {
    return new Response(
      JSON.stringify({ error: { code: 'MISSING_GRAPH_ID', message: 'graphId is required' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build stream endpoint URL (use internal URL if available)
  const baseUrl = request.nextUrl.origin;
  const streamUrl = new URL(`${baseUrl}/api/v1/events/stream`);
  streamUrl.searchParams.set('graphId', graphId);
  streamUrl.searchParams.set('timeout', '5'); // Short timeout for quick polling
  streamUrl.searchParams.set('limit', '50');
  if (categoriesStr) streamUrl.searchParams.set('categories', categoriesStr);
  if (agentId) streamUrl.searchParams.set('agent_id', agentId);

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastEventId = sinceEventId;
      let isClosing = false;
      let lastHeartbeat = Date.now();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          formatSSE('connected', {
            message: 'SSE connection established',
            graphId,
            since: lastEventId,
          })
        )
      );

      // Handle abort signal (client disconnect)
      request.signal?.addEventListener('abort', () => {
        isClosing = true;
      });

      // Main event loop
      while (!isClosing) {
        try {
          // Build URL with current cursor
          const pollUrl = new URL(streamUrl.toString());
          if (lastEventId) {
            pollUrl.searchParams.set('since', lastEventId);
          }

          // Fetch from stream endpoint
          const response = await fetch(pollUrl.toString(), {
            headers: {
              Authorization: authHeader,
            },
            signal: request.signal,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            controller.enqueue(
              encoder.encode(
                formatSSE('error', {
                  code: response.status,
                  message: error.error?.message || error.message || 'Stream error',
                })
              )
            );
            // Wait before retrying on error
            await sleep(5000);
            continue;
          }

          const data = await response.json();

          // Send events
          if (data.events && data.events.length > 0) {
            for (const event of data.events) {
              if (isClosing) break;
              controller.enqueue(encoder.encode(formatSSE('event', event, event.id)));
              lastEventId = event.id;
            }
          }

          // Update cursor
          if (data.lastEventId) {
            lastEventId = data.lastEventId;
          }

          // Send heartbeat if needed
          const now = Date.now();
          if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
            controller.enqueue(
              encoder.encode(
                formatSSE('heartbeat', { timestamp: new Date().toISOString() })
              )
            );
            lastHeartbeat = now;
          }

          // Small delay between polls (stream endpoint handles long-poll)
          if (!data.events || data.events.length === 0) {
            await sleep(POLL_INTERVAL_MS);
          }
        } catch (error) {
          if (isClosing) break;

          // Handle abort errors gracefully
          if (error instanceof Error && error.name === 'AbortError') {
            break;
          }

          console.error('[SSE] Error:', error);
          controller.enqueue(
            encoder.encode(
              formatSSE('error', {
                message: error instanceof Error ? error.message : 'Connection error',
              })
            )
          );

          // Wait before retrying
          await sleep(5000);
        }
      }

      // Close the stream
      try {
        controller.close();
      } catch (e) {
        // Already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
