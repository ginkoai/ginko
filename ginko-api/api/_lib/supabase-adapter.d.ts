/**
 * @fileType: utility
 * @status: new
 * @updated: 2025-08-05
 * @tags: [supabase, database, adapter, serverless]
 * @related: [database.ts, _utils.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@supabase/supabase-js]
 */
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseAdapter {
    client: SupabaseClient;
    constructor();
    /**
     * Get user by API key (for authentication)
     */
    getUserByApiKey(apiKeyHash: string): Promise<any>;
    /**
     * Get user sessions
     */
    getUserSessions(userId: string, teamId: string, limit?: number): Promise<any[]>;
    /**
     * Get team best practices
     */
    getTeamBestPractices(teamId: string): Promise<any[]>;
    /**
     * Save session capture
     */
    saveSession(sessionData: any): Promise<string | null>;
    /**
     * Get session by ID
     */
    getSessionById(sessionId: string): Promise<any>;
    /**
     * Track team activity
     */
    logActivity(activityData: any): Promise<void>;
    /**
     * Update user last active timestamp
     */
    updateUserLastActive(userId: string): Promise<void>;
    /**
     * Health check - test database connectivity
     */
    healthCheck(): Promise<{
        status: string;
        type: string;
        note?: string;
    }>;
}
//# sourceMappingURL=supabase-adapter.d.ts.map