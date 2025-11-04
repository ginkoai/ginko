/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [auth, cli, session, storage, memory]
 * @related: [api/auth/cli/session/route.ts, auth/callback/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

interface CLISession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email?: string
    github_username?: string
  }
  created_at: number
}

/**
 * In-memory storage for CLI authentication sessions
 * Sessions expire after 5 minutes
 */
class CLISessionStorage {
  private sessions: Map<string, CLISession> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Store a session for CLI polling
   */
  set(sessionId: string, session: Omit<CLISession, 'created_at'>): void {
    this.sessions.set(sessionId, {
      ...session,
      created_at: Date.now()
    })

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.sessions.delete(sessionId)
    }, this.TTL)
  }

  /**
   * Retrieve a session (returns null if not found or expired)
   */
  get(sessionId: string): CLISession | null {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    // Check if expired
    if (Date.now() - session.created_at > this.TTL) {
      this.sessions.delete(sessionId)
      return null
    }

    return session
  }

  /**
   * Delete a session after it's been retrieved
   */
  delete(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * Get number of active sessions (for monitoring)
   */
  size(): number {
    return this.sessions.size
  }
}

// Singleton instance
export const cliSessionStorage = new CLISessionStorage()
