/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-08-14
 * @tags: [api, mcp, best-practices, proxy, forwarding]
 * @related: [mcp-server, best-practices/[id]/route.ts, dashboard]
 * @priority: medium
 * @complexity: low
 * @dependencies: [next/server]
 */
import { NextRequest, NextResponse } from 'next/server';

// Proxy to the real API endpoints in /api/mcp/best-practices/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Forward to the real Vercel function
    const apiUrl = new URL('/api/mcp/best-practices', 'http://localhost:3000');
    searchParams.forEach((value, key) => {
      apiUrl.searchParams.append(key, value);
    });
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If the real API is not available, return empty state
    if (!response.ok) {
      return NextResponse.json({
        best_practices: [],
        pagination: {
          total: 0,
          limit: parseInt(searchParams.get('limit') || '50'),
          offset: parseInt(searchParams.get('offset') || '0'),
          has_more: false
        },
        filters: {
          q: searchParams.get('q'),
          tags: searchParams.getAll('tags'),
          visibility: searchParams.get('visibility') || 'all',
          sort: searchParams.get('sort') || 'created',
          order: searchParams.get('order') || 'desc'
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API Proxy Error:', error);
    // Return empty state instead of error to show empty marketplace
    return NextResponse.json({
      best_practices: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        has_more: false
      },
      filters: {}
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('http://localhost:3000/api/mcp/best-practices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to create best practice' },
      { status: 500 }
    );
  }
}