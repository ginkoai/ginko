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
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
export class AuthenticationError extends Error {
    code;
    constructor(message, code = 'AUTH_ERROR') {
        super(message);
        this.code = code;
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends Error {
    code;
    constructor(message, code = 'AUTHZ_ERROR') {
        super(message);
        this.code = code;
        this.name = 'AuthorizationError';
    }
}
/**
 * Manages API key generation, validation, and user authentication
 * Implements secure key management with bcrypt hashing and prefix display
 */
export class AuthManager {
    db;
    KEY_PREFIX = 'wmcp'; // Ginko MCP prefix
    LEGACY_PREFIX = 'cmcp'; // Legacy ContextMCP prefix for backward compatibility
    KEY_LENGTH = 32; // 32 bytes = 256 bits
    HASH_ROUNDS = 12; // Bcrypt rounds
    constructor(db) {
        this.db = db;
    }
    /**
     * Generate a new API key for a user
     * Format: wmcp_sk_live_<32_random_bytes_base64>
     */
    async generateApiKey(options) {
        // Generate cryptographically secure random key
        const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
        const keySecret = randomBytes.toString('base64url'); // URL-safe base64
        // Construct full API key with new Ginko prefix
        const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
        const fullKey = `${this.KEY_PREFIX}_sk_${environment}_${keySecret}`;
        // Extract prefix for display (first 8 chars after environment)
        const prefix = keySecret.substring(0, 8);
        // Hash the full key for secure storage
        const keyHash = await bcrypt.hash(fullKey, this.HASH_ROUNDS);
        // Store in database
        const keyId = crypto.randomUUID();
        await this.db.query(`
      UPDATE user_profiles 
      SET api_key_hash = $1, api_key_prefix = $2, api_key_created_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [keyHash, prefix, options.userId]);
        console.log(`[AUTH] Generated API key for user ${options.userId} (prefix: ${prefix})`);
        return {
            id: keyId,
            key: fullKey,
            prefix,
            hash: keyHash,
            userId: options.userId,
            description: options.description,
            scopes: options.scopes || ['full_access'],
            expiresAt: options.expiresAt,
            createdAt: new Date(),
        };
    }
    /**
     * Validate an API key and return authenticated user
     */
    async authenticateApiKey(apiKey) {
        // Support both new wmcp_ and legacy cmcp_ prefixes
        const isNewFormat = apiKey && apiKey.startsWith(this.KEY_PREFIX);
        const isLegacyFormat = apiKey && apiKey.startsWith(this.LEGACY_PREFIX);
        if (!apiKey || (!isNewFormat && !isLegacyFormat)) {
            throw new AuthenticationError('Invalid API key format', 'INVALID_KEY_FORMAT');
        }
        // Extract environment from key
        const keyParts = apiKey.split('_');
        const keyPrefix = keyParts[0];
        if (keyParts.length !== 4 || (keyPrefix !== this.KEY_PREFIX && keyPrefix !== this.LEGACY_PREFIX) || keyParts[1] !== 'sk') {
            throw new AuthenticationError('Invalid API key format', 'INVALID_KEY_FORMAT');
        }
        const environment = keyParts[2]; // live or test
        const expectedEnv = process.env.NODE_ENV === 'production' ? 'live' : 'test';
        if (environment !== expectedEnv) {
            throw new AuthenticationError(`API key environment mismatch: expected ${expectedEnv}, got ${environment}`, 'ENVIRONMENT_MISMATCH');
        }
        // Find users with hashed API keys in MVP schema
        const result = await this.db.query(`
      SELECT 
        up.id,
        up.email,
        up.api_key_hash,
        up.api_key_prefix,
        up.subscription_tier,
        up.is_active,
        up.full_name,
        up.github_username,
        up.usage_stats
      FROM user_profiles up
      WHERE up.api_key_hash IS NOT NULL 
        AND up.is_active = true
    `);
        // Check each user's hashed key (necessary for bcrypt comparison)
        let authenticatedRow = null;
        for (const row of result.rows) {
            const isValidKey = await bcrypt.compare(apiKey, row.api_key_hash);
            if (isValidKey) {
                authenticatedRow = row;
                break;
            }
        }
        if (!authenticatedRow) {
            throw new AuthenticationError('Invalid API key', 'INVALID_KEY');
        }
        const row = authenticatedRow;
        // Update last active timestamp in usage_stats
        await this.db.query(`
      UPDATE user_profiles 
      SET usage_stats = jsonb_set(
        COALESCE(usage_stats, '{}'),
        '{last_active}', 
        to_jsonb(NOW()::text)
      )
      WHERE id = $1
    `, [row.id]);
        // Create simplified user model for MVP
        const authenticatedUser = {
            id: row.id,
            email: row.email,
            organizationId: row.id, // MVP: user_id = org_id (1:1 mapping)
            planTier: (row.subscription_tier || 'free'),
            planStatus: 'active', // MVP: all OAuth users are active
            role: 'owner', // MVP: simplified role model
            permissions: ['*'], // MVP: all users get full permissions
            apiKeyPrefix: row.api_key_prefix,
            lastActive: new Date(),
        };
        console.log(`[AUTH] Authenticated user ${row.email} (${row.subscription_tier || 'free'})`);
        return authenticatedUser;
    }
    /**
     * Revoke an API key for a user
     */
    async revokeApiKey(userId) {
        await this.db.query(`
      UPDATE user_profiles 
      SET api_key_hash = NULL, api_key_prefix = NULL, updated_at = NOW()
      WHERE id = $1
    `, [userId]);
        console.log(`[AUTH] Revoked API key for user ${userId}`);
    }
    /**
     * Rotate API key - generate new one and revoke old
     */
    async rotateApiKey(userId, options) {
        const newKey = await this.generateApiKey({ userId, ...options });
        console.log(`[AUTH] Rotated API key for user ${userId}`);
        return newKey;
    }
    /**
     * Get permissions for a user role
     */
    getRolePermissions(role) {
        const rolePermissions = {
            owner: [
                'organization:manage',
                'billing:manage',
                'users:manage',
                'teams:manage',
                'projects:manage',
                'contexts:manage',
                'analytics:view',
                'settings:manage'
            ],
            admin: [
                'users:manage',
                'teams:manage',
                'projects:manage',
                'contexts:manage',
                'analytics:view',
                'settings:view'
            ],
            member: [
                'projects:access',
                'contexts:access',
                'sessions:manage',
                'analytics:view'
            ],
            viewer: [
                'projects:view',
                'contexts:view',
                'analytics:view'
            ]
        };
        return rolePermissions[role] || rolePermissions.viewer;
    }
    /**
     * Check if user has specific permission
     */
    async checkPermission(user, permission) {
        return user.permissions.includes(permission) ||
            user.permissions.includes('*') ||
            user.role === 'owner';
    }
    /**
     * Middleware function for Express routes
     */
    createAuthMiddleware() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({
                        error: 'Authorization header required',
                        code: 'MISSING_AUTH_HEADER'
                    });
                }
                const apiKey = authHeader.substring(7); // Remove 'Bearer '
                const user = await this.authenticateApiKey(apiKey);
                req.user = user;
                next();
            }
            catch (error) {
                if (error instanceof AuthenticationError) {
                    return res.status(401).json({
                        error: error.message,
                        code: error.code
                    });
                }
                console.error('[AUTH] Authentication middleware error:', error);
                return res.status(500).json({
                    error: 'Internal authentication error',
                    code: 'AUTH_INTERNAL_ERROR'
                });
            }
        };
    }
    /**
     * Optional authentication middleware for development environments
     * Attempts authentication but allows requests to proceed with fallback user
     */
    createOptionalAuthMiddleware() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                // If auth header is provided, attempt authentication
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        const apiKey = authHeader.substring(7);
                        const user = await this.authenticateApiKey(apiKey);
                        req.user = user;
                        console.log(`[AUTH] Authenticated request from ${user.email}`);
                    }
                    catch (authError) {
                        // Log authentication failure but continue
                        console.warn('[AUTH] Optional auth failed:', authError instanceof Error ? authError.message : String(authError));
                    }
                }
                // Proceed with or without authentication
                next();
            }
            catch (error) {
                console.error('[AUTH] Optional auth middleware error:', error);
                // Continue even if middleware fails
                next();
            }
        };
    }
    /**
     * Create permission checking middleware
     */
    requirePermission(permission) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Authentication required',
                        code: 'NOT_AUTHENTICATED'
                    });
                }
                const hasPermission = await this.checkPermission(req.user, permission);
                if (!hasPermission) {
                    return res.status(403).json({
                        error: `Permission denied: ${permission}`,
                        code: 'INSUFFICIENT_PERMISSIONS'
                    });
                }
                next();
            }
            catch (error) {
                console.error('[AUTH] Permission middleware error:', error);
                return res.status(500).json({
                    error: 'Internal authorization error',
                    code: 'AUTHZ_INTERNAL_ERROR'
                });
            }
        };
    }
    /**
     * Validate API key format without database lookup
     */
    static validateKeyFormat(apiKey) {
        if (!apiKey)
            return false;
        // Support both wmcp_ (new) and cmcp_ (legacy) prefixes
        const keyPattern = /^(wmcp|cmcp)_sk_(live|test)_[A-Za-z0-9_-]{43}$/;
        return keyPattern.test(apiKey);
    }
    /**
     * Extract key prefix for display purposes
     */
    static extractKeyPrefix(apiKey) {
        if (!AuthManager.validateKeyFormat(apiKey)) {
            return '';
        }
        const keyParts = apiKey.split('_');
        const keySecret = keyParts[3];
        return keySecret.substring(0, 8);
    }
}
export default AuthManager;
//# sourceMappingURL=auth-manager.js.map