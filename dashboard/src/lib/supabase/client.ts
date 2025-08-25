/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-31
 * @tags: [supabase, client, browser, database, auth]
 * @related: [server.ts, providers.tsx, auth-form.tsx, api.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [supabase-ssr]
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )