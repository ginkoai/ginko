# Dashboard Development Guide - Next.js Collaboration App

## Overview
This directory contains the **Ginko Dashboard** - a Next.js application focused on human-AI collaboration coaching and analytics.

**Production URL**: https://app.ginko.ai

## Architecture Patterns

### Core Design Principles
- **Single Collaboration-Focused Dashboard**: Consolidated from 4 separate pages into one screen
- **OAuth-Only Authentication**: Supabase Auth with GitHub/Google providers
- **API Route Proxying**: Dashboard serves some API endpoints to MCP server
- **Coaching-Focused UI**: Session insights with embedded coaching tips

### Key Files & Structure
```
dashboard/src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx           # Main consolidated dashboard
│   │   └── settings/page.tsx  # User settings
│   ├── auth/                  # Authentication pages  
│   └── api/                   # Proxy routes to MCP server
├── components/
│   ├── dashboard/             # Dashboard-specific components
│   ├── auth/                  # Authentication components
│   └── ui/                    # Reusable UI components
├── lib/supabase/              # Supabase client configuration
└── types/                     # TypeScript type definitions
```

## Development Patterns

### 1. Component Architecture
```typescript
// components/dashboard/new-component.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface ComponentProps {
  // Define props with TypeScript
}

export default function NewComponent({ }: ComponentProps) {
  // Component logic
  return (
    <Card>
      {/* Component UI */}
    </Card>
  );
}
```

### 2. API Route Integration
```typescript
// app/api/new-endpoint/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Your logic here
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Error message' }, { status: 500 });
  }
}
```

### 3. Authentication Patterns
```typescript
// Using Supabase auth in components
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

const supabase = createClientComponentClient();

export default function AuthenticatedComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (!user) return <div>Please log in</div>;
  
  return <div>Welcome {user.email}</div>;
}
```

## Component Patterns

### Dashboard Components
- **SessionsWithScores**: Main component with collapsible session details and coaching tips
- **CoachingInsights**: Embedded coaching recommendations based on session data
- **CollaborationMetrics**: Session analytics and productivity metrics

### UI Components
Following Shadcn/UI patterns:
- **Card**: Primary container component
- **Button**: Consistent button styling
- **Badge**: Status indicators
- **Alert**: User notifications

## Testing & Debugging

### Production Testing
⚠️ **Note**: Like the API, we test directly in production due to environment level confusion.

```bash
# Build and deploy
npm run build
vercel --prod

# Test production deployment
curl https://app.ginko.ai
```

### Common Issues
- **OAuth callback errors**: Check Supabase Auth settings for correct redirect URLs
- **API proxy failures**: Verify MCP server connectivity in proxy routes
- **Build failures**: Often related to TypeScript errors or missing dependencies

## Key Features

### Consolidated Dashboard
- **Single screen approach**: Replaced 4 separate pages (Overview, Sessions, Analytics, Collaboration)
- **Coaching focus**: Every element serves human-AI collaboration improvement
- **Session insights**: Collapsible details with embedded coaching tips

### Authentication Flow
1. **Login page** → OAuth provider selection
2. **Supabase Auth** → Handle OAuth callback
3. **Dashboard redirect** → Main application interface

### API Integration
- **MCP Server proxy**: `/api/sessions/scorecards` endpoint
- **Best practices**: Integration with MCP best practices system
- **Session data**: Real-time collaboration analytics

## Deployment Notes

### Vercel Configuration
- **Framework**: Next.js 14 with App Router
- **Environment variables**: Supabase keys, API URLs
- **Build command**: `npm run build`
- **Deploy**: Automatic via Git or `vercel --prod`

### Environment Setup
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Integration Points
- **MCP Server**: https://mcp.ginko.ai for session data
- **Authentication**: Production Supabase instance
- **Database**: Shared with MCP server for session analytics

---

**Quick Reference**:
- **Production URL**: https://app.ginko.ai
- **Build command**: `npm run build`
- **Deploy**: `vercel --prod`
- **Main dashboard**: `/dashboard` route
- **Auth pages**: `/auth/login`, `/auth/signup`