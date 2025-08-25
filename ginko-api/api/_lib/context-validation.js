/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-06
 * @tags: [context, validation, staleness, git, architecture-detection]
 * @related: [context-manager.ts, git-integration.ts, database.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [crypto, child_process, fs]
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
/**
 * Manages context staleness detection and architectural change validation
 * Prevents Claude from operating with outdated project context
 */
export class ContextValidator {
    STALENESS_THRESHOLDS = {
        MAX_HOURS_FRESH: 2, // Under 2 hours = fresh
        MAX_HOURS_MINOR: 8, // Under 8 hours = minor staleness  
        MAX_HOURS_MODERATE: 24, // Under 24 hours = moderate staleness
        MAX_COMMITS_FRESH: 3, // Under 3 commits = fresh
        MAX_COMMITS_MINOR: 10, // Under 10 commits = minor staleness
        MAX_COMMITS_MODERATE: 25 // Under 25 commits = moderate staleness
    };
    ARCHITECTURAL_FILES = [
        'package.json',
        'tsconfig.json',
        'cargo.toml',
        'requirements.txt',
        'pyproject.toml',
        'go.mod',
        'pom.xml',
        'build.gradle',
        'Dockerfile',
        'docker-compose.yml',
        '.env',
        '.env.local',
        'next.config.js',
        'vite.config.ts',
        'webpack.config.js'
    ];
    VALIDATION_VERSION = '1.0.0';
    /**
     * Generate context metadata for new context creation
     */
    async generateContextMetadata(projectPath = process.cwd()) {
        try {
            const gitCommitHash = this.getCurrentCommitHash(projectPath);
            const branch = this.getCurrentBranch(projectPath);
            const architecturalFingerprint = await this.generateArchitecturalFingerprint(projectPath);
            return {
                gitCommitHash,
                generatedAt: new Date(),
                architecturalFingerprint,
                sessionCount: 1,
                projectPath,
                branch,
                validationVersion: this.VALIDATION_VERSION
            };
        }
        catch (error) {
            console.warn('[CONTEXT-VALIDATION] Failed to generate metadata:', error);
            // Fallback metadata for non-git projects or errors
            return {
                gitCommitHash: 'unknown',
                generatedAt: new Date(),
                architecturalFingerprint: await this.generateArchitecturalFingerprint(projectPath),
                sessionCount: 1,
                projectPath,
                branch: 'unknown',
                validationVersion: this.VALIDATION_VERSION
            };
        }
    }
    /**
     * Validate context staleness against current project state
     */
    async validateContextStaleness(metadata, projectPath = process.cwd()) {
        try {
            // Get current project state
            const currentCommitHash = this.getCurrentCommitHash(projectPath);
            const commitsBehind = this.getCommitsBehind(metadata.gitCommitHash, projectPath);
            const hoursSinceGeneration = this.getHoursSince(metadata.generatedAt);
            const architecturalChanges = await this.detectArchitecturalChanges(metadata.architecturalFingerprint, projectPath);
            // Calculate staleness score (0.0 = fresh, 1.0 = completely stale)
            const timeScore = this.calculateTimeScore(hoursSinceGeneration);
            const commitScore = this.calculateCommitScore(commitsBehind);
            const architecturalScore = architecturalChanges.length > 0 ? 0.8 : 0.0;
            const overallScore = Math.max(timeScore, commitScore, architecturalScore);
            const staleness = this.categorizeStaleness(overallScore, hoursSinceGeneration, commitsBehind);
            // Generate reasons and recommendations
            const reasons = this.generateStalenessReasons(hoursSinceGeneration, commitsBehind, architecturalChanges, metadata.gitCommitHash, currentCommitHash);
            const recommendations = this.generateRecommendations(staleness, architecturalChanges);
            return {
                isStale: overallScore > 0.3, // Stale if score > 30%
                staleness,
                score: overallScore,
                reasons,
                recommendations,
                commitsBehind,
                hoursSinceGeneration,
                architecturalChanges
            };
        }
        catch (error) {
            console.warn('[CONTEXT-VALIDATION] Staleness validation failed:', error);
            // Conservative fallback - assume stale if we can't validate
            return {
                isStale: true,
                staleness: 'moderate',
                score: 0.5,
                reasons: ['Unable to validate context freshness due to git access error'],
                recommendations: ['Consider refreshing context if experiencing issues'],
                commitsBehind: -1,
                hoursSinceGeneration: this.getHoursSince(metadata.generatedAt),
                architecturalChanges: []
            };
        }
    }
    /**
     * Generate architectural fingerprint based on key configuration files
     */
    async generateArchitecturalFingerprint(projectPath) {
        const fingerprints = [];
        for (const file of this.ARCHITECTURAL_FILES) {
            const filePath = join(projectPath, file);
            if (existsSync(filePath)) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const hash = createHash('md5').update(content).digest('hex');
                    fingerprints.push(`${file}:${hash.substring(0, 8)}`);
                }
                catch (error) {
                    // File exists but can't read - include in fingerprint anyway
                    fingerprints.push(`${file}:unreadable`);
                }
            }
        }
        // Create overall fingerprint
        const combined = fingerprints.join('|');
        return createHash('md5').update(combined).digest('hex');
    }
    /**
     * Detect architectural changes by comparing fingerprints
     */
    async detectArchitecturalChanges(originalFingerprint, projectPath) {
        const currentFingerprint = await this.generateArchitecturalFingerprint(projectPath);
        if (originalFingerprint === currentFingerprint) {
            return []; // No changes
        }
        // TODO: Implement detailed change detection
        // For now, just indicate that architectural files have changed
        return ['Architectural configuration files have been modified'];
    }
    /**
     * Get current git commit hash
     */
    getCurrentCommitHash(projectPath) {
        try {
            return execSync('git rev-parse HEAD', {
                cwd: projectPath,
                encoding: 'utf8'
            }).trim();
        }
        catch (error) {
            throw new Error('Failed to get current commit hash');
        }
    }
    /**
     * Get current git branch
     */
    getCurrentBranch(projectPath) {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: projectPath,
                encoding: 'utf8'
            }).trim();
        }
        catch (error) {
            return 'unknown';
        }
    }
    /**
     * Get number of commits between two commits
     */
    getCommitsBehind(oldCommit, projectPath) {
        if (oldCommit === 'unknown')
            return 0;
        try {
            const result = execSync(`git rev-list ${oldCommit}..HEAD --count`, {
                cwd: projectPath,
                encoding: 'utf8'
            });
            return parseInt(result.trim()) || 0;
        }
        catch (error) {
            return -1; // Error determining commits behind
        }
    }
    /**
     * Calculate hours since a given date
     */
    getHoursSince(date) {
        return (Date.now() - date.getTime()) / (1000 * 60 * 60);
    }
    /**
     * Calculate time-based staleness score (0.0 to 1.0)
     */
    calculateTimeScore(hours) {
        if (hours <= this.STALENESS_THRESHOLDS.MAX_HOURS_FRESH)
            return 0.0;
        if (hours <= this.STALENESS_THRESHOLDS.MAX_HOURS_MINOR)
            return 0.2;
        if (hours <= this.STALENESS_THRESHOLDS.MAX_HOURS_MODERATE)
            return 0.5;
        return Math.min(1.0, hours / 48); // Completely stale after 48 hours
    }
    /**
     * Calculate commit-based staleness score (0.0 to 1.0)
     */
    calculateCommitScore(commits) {
        if (commits <= 0)
            return 0.0;
        if (commits <= this.STALENESS_THRESHOLDS.MAX_COMMITS_FRESH)
            return 0.1;
        if (commits <= this.STALENESS_THRESHOLDS.MAX_COMMITS_MINOR)
            return 0.3;
        if (commits <= this.STALENESS_THRESHOLDS.MAX_COMMITS_MODERATE)
            return 0.6;
        return Math.min(1.0, commits / 50); // Completely stale after 50 commits
    }
    /**
     * Categorize overall staleness level
     */
    categorizeStaleness(score, hours, commits) {
        if (score >= 0.8 || commits > 25)
            return 'critical';
        if (score >= 0.5 || hours > 24)
            return 'moderate';
        if (score >= 0.2 || commits > 3)
            return 'minor';
        return 'fresh';
    }
    /**
     * Generate human-readable staleness reasons
     */
    generateStalenessReasons(hours, commits, architecturalChanges, oldCommit, currentCommit) {
        const reasons = [];
        if (hours > this.STALENESS_THRESHOLDS.MAX_HOURS_MODERATE) {
            reasons.push(`Context is ${Math.round(hours)} hours old (>24h threshold)`);
        }
        else if (hours > this.STALENESS_THRESHOLDS.MAX_HOURS_MINOR) {
            reasons.push(`Context is ${Math.round(hours)} hours old (>8h threshold)`);
        }
        if (commits > this.STALENESS_THRESHOLDS.MAX_COMMITS_MODERATE) {
            reasons.push(`${commits} commits behind current HEAD (>25 commit threshold)`);
        }
        else if (commits > this.STALENESS_THRESHOLDS.MAX_COMMITS_MINOR) {
            reasons.push(`${commits} commits behind current HEAD (>10 commit threshold)`);
        }
        else if (commits > 0) {
            reasons.push(`${commits} new commits since context generation`);
        }
        if (architecturalChanges.length > 0) {
            reasons.push('Architectural files have been modified (package.json, configs, etc.)');
        }
        if (oldCommit !== 'unknown' && currentCommit !== oldCommit) {
            reasons.push(`Git HEAD changed from ${oldCommit.substring(0, 7)} to ${currentCommit.substring(0, 7)}`);
        }
        return reasons;
    }
    /**
     * Generate actionable recommendations based on staleness
     */
    generateRecommendations(staleness, architecturalChanges) {
        const recommendations = [];
        switch (staleness) {
            case 'critical':
                recommendations.push('🚨 STRONGLY RECOMMENDED: Refresh context before continuing');
                recommendations.push('Risk of outdated assumptions about project structure');
                break;
            case 'moderate':
                recommendations.push('⚠️ RECOMMENDED: Consider refreshing context');
                recommendations.push('Some project details may be outdated');
                break;
            case 'minor':
                recommendations.push('💡 SUGGESTION: Context refresh may be beneficial');
                break;
            case 'fresh':
                recommendations.push('✅ Context appears current');
                break;
        }
        if (architecturalChanges.length > 0) {
            recommendations.push('🏗️ Architectural changes detected - refresh recommended');
            recommendations.push('Project structure or dependencies may have changed');
        }
        return recommendations;
    }
    /**
     * Create validation warning for display to user
     */
    createValidationWarning(result) {
        if (!result.isStale)
            return null;
        const severity = result.staleness === 'critical' ? 'critical' :
            result.staleness === 'moderate' ? 'warning' : 'info';
        const message = [
            `⏰ Context Staleness Detected (${result.staleness.toUpperCase()})`,
            '',
            'Reasons:',
            ...result.reasons.map(r => `• ${r}`),
            '',
            'Recommendations:',
            ...result.recommendations.map(r => `• ${r}`)
        ].join('\n');
        return {
            severity,
            message,
            action: result.staleness === 'critical' ? 'refresh_context' : undefined,
            affectedContexts: ['project_overview', 'code_search', 'file_analysis']
        };
    }
}
export default ContextValidator;
//# sourceMappingURL=context-validation.js.map