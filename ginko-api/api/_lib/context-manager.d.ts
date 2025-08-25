/**
 * @fileType: service
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, context, analysis, files, scanning, project-overview]
 * @related: [api/mcp/tools/call.ts, best-practices.ts, git-integration.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs, path, child_process]
 */
export interface ProjectFile {
    path: string;
    size: number;
    type: string;
    lastModified: Date;
}
export interface FileContext {
    path: string;
    content: string;
    dependencies: string[];
    size: number;
    lastModified: Date;
}
export declare class ContextManager {
    private readonly MAX_FILE_SIZE;
    private readonly RELEVANT_EXTENSIONS;
    getProjectOverview(projectPath?: string): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    findRelevantCode(query: string, fileTypes?: string[]): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    getFileContext(filePath: string, includeDependencies?: boolean): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    getRecentChanges(since?: string): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    private scanDirectory;
    private identifyKeyFiles;
    private buildProjectStructure;
    private getFileTypeDistribution;
    private calculateRelevanceScore;
    private findTextMatches;
    private extractDependencies;
    private getLanguageFromExtension;
    private findGitRoot;
}
//# sourceMappingURL=context-manager.d.ts.map