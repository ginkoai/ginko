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
import { promises as fs } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
export class ContextManager {
    MAX_FILE_SIZE = 1024 * 1024; // 1MB
    RELEVANT_EXTENSIONS = [
        '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
        '.json', '.yaml', '.yml', '.md', '.txt', '.config.js', '.config.ts'
    ];
    async getProjectOverview(projectPath) {
        const rootPath = projectPath || process.cwd();
        try {
            const files = await this.scanDirectory(rootPath);
            const keyFiles = this.identifyKeyFiles(files);
            const structure = this.buildProjectStructure(files, rootPath);
            const overview = [
                `# Project Overview: ${rootPath}`,
                '',
                `**Total Files**: ${files.length}`,
                `**Key Files Identified**: ${keyFiles.length}`,
                '',
                '## Project Structure',
                structure,
                '',
                '## Key Files',
                ...keyFiles.map(file => `- \`${file.path}\` (${file.type})`),
                '',
                '## File Type Distribution',
                ...this.getFileTypeDistribution(files),
            ].join('\n');
            return {
                content: [{
                        type: 'text',
                        text: overview,
                    }],
            };
        }
        catch (error) {
            throw new Error(`Failed to get project overview: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findRelevantCode(query, fileTypes) {
        const rootPath = process.cwd();
        const files = await this.scanDirectory(rootPath);
        const targetExtensions = fileTypes || this.RELEVANT_EXTENSIONS;
        const relevantFiles = files.filter(file => targetExtensions.includes(extname(file.path).toLowerCase()));
        const matches = [];
        for (const file of relevantFiles) {
            try {
                const content = await fs.readFile(file.path, 'utf-8');
                const score = this.calculateRelevanceScore(content, query);
                const textMatches = this.findTextMatches(content, query);
                if (score > 0) {
                    matches.push({ file, score, matches: textMatches });
                }
            }
            catch (error) {
                // Skip files that can't be read
                continue;
            }
        }
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 10);
        const result = [
            `# Relevant Code for: "${query}"`,
            '',
            `Found ${matches.length} relevant files. Showing top ${topMatches.length}:`,
            '',
            ...topMatches.map((match, index) => [
                `## ${index + 1}. ${relative(rootPath, match.file.path)} (Score: ${match.score})`,
                `**Size**: ${match.file.size} bytes | **Modified**: ${match.file.lastModified.toISOString()}`,
                '',
                '**Relevant matches**:',
                ...match.matches.slice(0, 3).map(m => `- ${m}`),
                '',
            ].join('\n')),
        ].join('\n');
        return {
            content: [{
                    type: 'text',
                    text: result,
                }],
        };
    }
    async getFileContext(filePath, includeDependencies = true) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.size > this.MAX_FILE_SIZE) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${this.MAX_FILE_SIZE})`);
            }
            const content = await fs.readFile(filePath, 'utf-8');
            const dependencies = includeDependencies ? this.extractDependencies(content) : [];
            const context = [
                `# File Context: ${filePath}`,
                '',
                `**Size**: ${stats.size} bytes`,
                `**Last Modified**: ${stats.mtime.toISOString()}`,
                `**Type**: ${extname(filePath)}`,
                '',
            ];
            if (dependencies.length > 0) {
                context.push('## Dependencies', ...dependencies.map(dep => `- ${dep}`), '');
            }
            context.push('## File Content', '```' + this.getLanguageFromExtension(extname(filePath)), content, '```');
            return {
                content: [{
                        type: 'text',
                        text: context.join('\n'),
                    }],
            };
        }
        catch (error) {
            throw new Error(`Failed to get file context: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getRecentChanges(since = '1 day') {
        try {
            // Find git root directory in case we're in a monorepo structure
            const gitRoot = this.findGitRoot(process.cwd());
            const gitLog = execSync(`git log --since="${since}" --pretty=format:"%h|%an|%ad|%s" --date=short`, {
                encoding: 'utf-8',
                cwd: gitRoot,
            });
            const gitStatus = execSync('git status --porcelain', {
                encoding: 'utf-8',
                cwd: gitRoot,
            });
            const changes = [
                `# Recent Changes (since ${since})`,
                '',
            ];
            if (gitStatus.trim()) {
                changes.push('## Current Uncommitted Changes', ...gitStatus.trim().split('\n').map(line => `- ${line}`), '');
            }
            if (gitLog.trim()) {
                changes.push('## Recent Commits', ...gitLog.trim().split('\n').map(line => {
                    const [hash, author, date, message] = line.split('|');
                    return `- **${hash}** (${date}) ${author}: ${message}`;
                }));
            }
            else {
                changes.push('No recent commits found.');
            }
            return {
                content: [{
                        type: 'text',
                        text: changes.join('\n'),
                    }],
            };
        }
        catch (error) {
            throw new Error(`Failed to get recent changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async scanDirectory(dirPath, maxDepth = 10, currentDepth = 0) {
        if (currentDepth >= maxDepth)
            return [];
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') && !entry.name.match(/\.(gitignore|env)$/)) {
                    continue; // Skip hidden files except important ones
                }
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry.name)) {
                        files.push(...await this.scanDirectory(fullPath, maxDepth, currentDepth + 1));
                    }
                }
                else {
                    const stats = await fs.stat(fullPath);
                    files.push({
                        path: fullPath,
                        size: stats.size,
                        type: extname(entry.name),
                        lastModified: stats.mtime,
                    });
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
        }
        return files;
    }
    identifyKeyFiles(files) {
        const keyPatterns = [
            /package\.json$/,
            /tsconfig\.json$/,
            /README\.md$/i,
            /index\.(ts|js|tsx|jsx)$/,
            /main\.(ts|js|tsx|jsx)$/,
            /app\.(ts|js|tsx|jsx)$/,
            /server\.(ts|js|tsx|jsx)$/,
            /config\.(ts|js|json)$/,
            /\.config\.(ts|js)$/,
        ];
        return files.filter(file => keyPatterns.some(pattern => pattern.test(file.path)));
    }
    buildProjectStructure(files, rootPath) {
        const structure = new Map();
        for (const file of files) {
            const relativePath = relative(rootPath, file.path);
            const parts = relativePath.split('/');
            for (let i = 1; i <= parts.length; i++) {
                const dir = parts.slice(0, i).join('/');
                structure.set(dir, (structure.get(dir) || 0) + 1);
            }
        }
        const sorted = Array.from(structure.entries())
            .filter(([path]) => !path.includes('.'))
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, 20);
        return sorted.map(([path, count]) => `${path}/ (${count} files)`).join('\n');
    }
    getFileTypeDistribution(files) {
        const distribution = new Map();
        for (const file of files) {
            const ext = file.type || 'no extension';
            distribution.set(ext, (distribution.get(ext) || 0) + 1);
        }
        return Array.from(distribution.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([ext, count]) => `- ${ext}: ${count} files`);
    }
    calculateRelevanceScore(content, query) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/);
        let score = 0;
        // Exact phrase match
        if (lowerContent.includes(lowerQuery)) {
            score += 10;
        }
        // Individual word matches
        for (const word of queryWords) {
            const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
            score += matches;
        }
        return score;
    }
    findTextMatches(content, query) {
        const lines = content.split('\n');
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/);
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            const lowerLine = lines[i].toLowerCase();
            // Check for exact phrase match first
            if (lowerLine.includes(lowerQuery)) {
                matches.push(`Line ${i + 1}: ${lines[i].trim()}`);
            }
            else {
                // Check for individual word matches
                const wordMatches = queryWords.filter(word => lowerLine.includes(word));
                if (wordMatches.length >= Math.ceil(queryWords.length / 2)) {
                    matches.push(`Line ${i + 1}: ${lines[i].trim()} (matched: ${wordMatches.join(', ')})`);
                }
            }
        }
        return matches;
    }
    extractDependencies(content) {
        const dependencies = [];
        // JavaScript/TypeScript imports
        const importMatches = content.match(/^import .+ from ['"]([^'"]+)['"];?$/gm);
        if (importMatches) {
            dependencies.push(...importMatches.map(match => match.replace(/^import .+ from ['"]([^'"]+)['"];?$/, '$1')));
        }
        // Require statements
        const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
        if (requireMatches) {
            dependencies.push(...requireMatches.map(match => match.replace(/require\(['"]([^'"]+)['"]\)/, '$1')));
        }
        return [...new Set(dependencies)].filter(dep => !dep.startsWith('.'));
    }
    getLanguageFromExtension(ext) {
        const languageMap = {
            '.ts': 'typescript',
            '.js': 'javascript',
            '.tsx': 'tsx',
            '.jsx': 'jsx',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
        };
        return languageMap[ext.toLowerCase()] || '';
    }
    findGitRoot(startPath) {
        let currentPath = startPath;
        while (currentPath !== dirname(currentPath)) {
            if (existsSync(join(currentPath, '.git'))) {
                return currentPath;
            }
            currentPath = dirname(currentPath);
        }
        // Fallback to original path if no git root found
        return startPath;
    }
}
//# sourceMappingURL=context-manager.js.map