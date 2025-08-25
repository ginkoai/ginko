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
export interface ContextMetadata {
    gitCommitHash: string;
    generatedAt: Date;
    architecturalFingerprint: string;
    sessionCount: number;
    projectPath: string;
    branch: string;
    validationVersion: string;
}
export interface StalenessResult {
    isStale: boolean;
    staleness: 'fresh' | 'minor' | 'moderate' | 'critical';
    score: number;
    reasons: string[];
    recommendations: string[];
    commitsBehind: number;
    hoursSinceGeneration: number;
    architecturalChanges: string[];
}
export interface ContextValidationWarning {
    severity: 'info' | 'warning' | 'critical';
    message: string;
    action?: string;
    affectedContexts?: string[];
}
/**
 * Manages context staleness detection and architectural change validation
 * Prevents Claude from operating with outdated project context
 */
export declare class ContextValidator {
    private readonly STALENESS_THRESHOLDS;
    private readonly ARCHITECTURAL_FILES;
    private readonly VALIDATION_VERSION;
    /**
     * Generate context metadata for new context creation
     */
    generateContextMetadata(projectPath?: string): Promise<ContextMetadata>;
    /**
     * Validate context staleness against current project state
     */
    validateContextStaleness(metadata: ContextMetadata, projectPath?: string): Promise<StalenessResult>;
    /**
     * Generate architectural fingerprint based on key configuration files
     */
    private generateArchitecturalFingerprint;
    /**
     * Detect architectural changes by comparing fingerprints
     */
    private detectArchitecturalChanges;
    /**
     * Get current git commit hash
     */
    private getCurrentCommitHash;
    /**
     * Get current git branch
     */
    private getCurrentBranch;
    /**
     * Get number of commits between two commits
     */
    private getCommitsBehind;
    /**
     * Calculate hours since a given date
     */
    private getHoursSince;
    /**
     * Calculate time-based staleness score (0.0 to 1.0)
     */
    private calculateTimeScore;
    /**
     * Calculate commit-based staleness score (0.0 to 1.0)
     */
    private calculateCommitScore;
    /**
     * Categorize overall staleness level
     */
    private categorizeStaleness;
    /**
     * Generate human-readable staleness reasons
     */
    private generateStalenessReasons;
    /**
     * Generate actionable recommendations based on staleness
     */
    private generateRecommendations;
    /**
     * Create validation warning for display to user
     */
    createValidationWarning(result: StalenessResult): ContextValidationWarning | null;
}
export default ContextValidator;
//# sourceMappingURL=context-validation.d.ts.map