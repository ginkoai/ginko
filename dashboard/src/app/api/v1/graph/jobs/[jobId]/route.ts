/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-08
 * @tags: [api, graph, jobs, status]
 * @related: [../documents/route.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * GET /api/v1/graph/jobs/:jobId
 *
 * Get job status. Since document uploads complete synchronously,
 * this endpoint always returns 'completed' status.
 */

import { NextRequest, NextResponse } from 'next/server';

interface JobStatusResponse {
  job: {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
    progress: {
      uploaded: number;
      parsed: number;
      embedded: number;
      total: number;
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  console.log(`[Jobs API] GET /api/v1/graph/jobs/${jobId}`);

  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Include Bearer token in Authorization header.',
        },
      },
      { status: 401 }
    );
  }

  // Since uploads complete synchronously, always return completed
  // In the future, this could track async job progress
  const response: JobStatusResponse = {
    job: {
      jobId,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: {
        uploaded: 100,
        parsed: 100,
        embedded: 100,
        total: 100,
      },
    },
  };

  return NextResponse.json(response);
}
