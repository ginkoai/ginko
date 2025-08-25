#!/usr/bin/env node
/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-01
 * @tags: [authentication, api-keys, security, billing, entitlements]
 * @related: [database.ts, serverless-api, ADR-004-identity-entitlements-billing.md]
 * @priority: critical
 * @complexity: high
 * @dependencies: [crypto, bcrypt]
 */
import { DatabaseManager } from './database.js';
export interface AuthenticatedUser {
    id: string;
    email: string;
    organizationId: string;
    teamId?: string;
    planTier: PlanTier;
    planStatus: PlanStatus;
    role: UserRole;
    permissions: string[];
    apiKeyPrefix: string;
    lastActive: Date;
}
export type PlanTier = 'free' | 'pro' | 'enterprise';
export type PlanStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface ApiKeyGenerationOptions {
    userId: string;
    description?: string;
    expiresAt?: Date;
    scopes?: string[];
}
export interface ApiKey {
    id: string;
    key: string;
    prefix: string;
    hash: string;
    userId: string;
    description?: string;
    scopes: string[];
    expiresAt?: Date;
    createdAt: Date;
    lastUsed?: Date;
}
export declare class AuthenticationError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
export declare class AuthorizationError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
/**
 * Manages API key generation, validation, and user authentication
 * Implements secure key management with bcrypt hashing and prefix display
 */
export declare class AuthManager {
    private db;
    private readonly KEY_PREFIX;
    private readonly LEGACY_PREFIX;
    private readonly KEY_LENGTH;
    private readonly HASH_ROUNDS;
    constructor(db: DatabaseManager);
    /**
     * Generate a new API key for a user
     * Format: wmcp_sk_live_<32_random_bytes_base64>
     */
    generateApiKey(options: ApiKeyGenerationOptions): Promise<ApiKey>;
    /**
     * Validate an API key and return authenticated user
     */
    authenticateApiKey(apiKey: string): Promise<AuthenticatedUser>;
    /**
     * Revoke an API key for a user
     */
    revokeApiKey(userId: string): Promise<void>;
    /**
     * Rotate API key - generate new one and revoke old
     */
    rotateApiKey(userId: string, options?: Omit<ApiKeyGenerationOptions, 'userId'>): Promise<ApiKey>;
    /**
     * Get permissions for a user role
     */
    private getRolePermissions;
    /**
     * Check if user has specific permission
     */
    checkPermission(user: AuthenticatedUser, permission: string): Promise<boolean>;
    /**
     * Middleware function for Express routes
     */
    createAuthMiddleware(): (req: any, res: any, next: any) => Promise<any>;
    /**
     * Optional authentication middleware for development environments
     * Attempts authentication but allows requests to proceed with fallback user
     */
    createOptionalAuthMiddleware(): (req: any, res: any, next: any) => Promise<void>;
    /**
     * Create permission checking middleware
     */
    requirePermission(permission: string): (req: any, res: any, next: any) => Promise<any>;
    /**
     * Validate API key format without database lookup
     */
    static validateKeyFormat(apiKey: string): boolean;
    /**
     * Extract key prefix for display purposes
     */
    static extractKeyPrefix(apiKey: string): string;
}
export default AuthManager;
//# sourceMappingURL=auth-manager.d.ts.map