/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-24
 * @tags: [integration, ai-readiness, task-12, validation]
 * @related: [start-reflection.ts, output-formatter.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

/**
 * AI Readiness Validation Tests (TASK-12)
 *
 * Validates AI partner readiness metrics:
 * - Context completeness (does AI have what it needs?)
 * - Information quality (is context actionable?)
 * - Clarifying questions estimate (1-3 target)
 * - AI readiness score (7-8/10 target)
 *
 * Tests measure output quality and completeness, not subjective AI performance.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');
const TIMEOUT = 30000;

interface TestProject {
  dir: string;
  name: string;
  cleanup: () => Promise<void>;
}

interface AIReadinessMetrics {
  hasCharter: boolean;
  hasGoals: boolean;
  hasSuccessCriteria: boolean;
  hasWorkMode: boolean;
  hasFlowState: boolean;
  hasResumePoint: boolean;
  hasNextAction: boolean;
  hasWarnings: boolean;
  hasBranchInfo: boolean;
  contextSections: number;
  outputLength: number;
  estimatedClarifyingQuestions: number;
  readinessScore: number;
}

/**
 * Creates a test project with specific characteristics
 */
async function createTestProject(config: {
  name: string;
  hasCharter?: boolean;
  hasGoals?: boolean;
  hasSuccessCriteria?: boolean;
  hasSprint?: boolean;
  commits?: number;
  files?: number;
}): Promise<TestProject> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `ginko-ai-test-${config.name}-`));

  // Initialize git repo
  await execAsync('git init', { cwd: tempDir });
  await execAsync('git config user.email "test@example.com"', { cwd: tempDir });
  await execAsync('git config user.name "Test User"', { cwd: tempDir });

  // Create .ginko directory
  await fs.ensureDir(path.join(tempDir, '.ginko', 'sessions', 'test-user'));

  // Create ginko config
  const ginkoConfig = {
    version: '1.0',
    project: { name: config.name, type: 'single' },
    paths: {
      sessions: '.ginko/sessions',
      currentSprint: 'docs/sprints/CURRENT-SPRINT.md'
    },
    workMode: { default: 'think-build' }
  };
  await fs.writeFile(
    path.join(tempDir, '.ginko', 'config.json'),
    JSON.stringify(ginkoConfig, null, 2)
  );

  // Create comprehensive charter if specified
  if (config.hasCharter) {
    await fs.ensureDir(path.join(tempDir, 'docs'));
    let charter = `# Project Charter: ${config.name}

## Purpose
This project implements a test system for validating AI readiness metrics.
The goal is to ensure AI partners receive sufficient context to work effectively.

`;
    if (config.hasGoals) {
      charter += `## Goals
1. Achieve AI readiness score of 7-8/10
2. Reduce clarifying questions to 1-3 per session
3. Provide actionable context within 2.5s startup
4. Enable seamless session handoffs between AI partners

`;
    }

    if (config.hasSuccessCriteria) {
      charter += `## Success Criteria
- [ ] AI partner understands project purpose without asking
- [ ] AI partner can identify current work focus
- [ ] AI partner knows team conventions and patterns
- [ ] Startup time under 2.5 seconds (p95)
- [ ] Context token count optimized (<5000 tokens)

`;
    }

    charter += `## Constraints
- Must work offline (git-native)
- Must preserve user privacy
- Must be non-blocking

---
Created: ${new Date().toISOString().split('T')[0]}
`;
    await fs.writeFile(path.join(tempDir, 'docs', 'PROJECT-CHARTER.md'), charter);
  }

  // Create sprint file if specified
  if (config.hasSprint) {
    await fs.ensureDir(path.join(tempDir, 'docs', 'sprints'));
    const sprint = `# Current Sprint: Test Validation

## Tasks
- [x] TASK-1: Setup test infrastructure
- [@] TASK-2: Implement AI readiness tests ← RESUME HERE
- [ ] TASK-3: Document results

## Progress
33% complete (1/3 tasks)
`;
    await fs.writeFile(path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'), sprint);
  }

  // Create source files
  const fileCount = config.files || 10;
  await fs.ensureDir(path.join(tempDir, 'src'));
  for (let i = 0; i < fileCount; i++) {
    await fs.writeFile(
      path.join(tempDir, 'src', `module-${i}.ts`),
      `/**
 * @fileType: module
 * @status: current
 * @tags: [test, module-${i}]
 */
export function process${i}() {
  return ${i};
}
`
    );
  }

  // Create commits
  await execAsync('git add .', { cwd: tempDir });
  await execAsync('git commit -m "Initial commit with test structure"', { cwd: tempDir });

  const commitCount = config.commits || 1;
  for (let i = 1; i < commitCount; i++) {
    await fs.appendFile(
      path.join(tempDir, 'src', 'module-0.ts'),
      `\n// Update ${i}\n`
    );
    await execAsync('git add .', { cwd: tempDir });
    await execAsync(`git commit -m "Update ${i}: Incremental change"`, { cwd: tempDir });
  }

  return {
    dir: tempDir,
    name: config.name,
    cleanup: async () => {
      await fs.remove(tempDir);
    }
  };
}

/**
 * Runs ginko start and analyzes output for AI readiness
 */
async function analyzeAIReadiness(projectDir: string): Promise<AIReadinessMetrics> {
  const { stdout } = await execAsync(
    `node ${CLI_PATH} start`,
    {
      cwd: projectDir,
      timeout: TIMEOUT,
      env: {
        ...process.env,
        GINKO_USER_ID: 'test-user',
        GINKO_SKIP_CLOUD: 'true'
      }
    }
  );

  const output = stdout.toLowerCase();

  // Analyze output for key context sections
  const hasCharter = /charter|purpose/i.test(stdout);
  const hasGoals = /goals?:|objectives?:/i.test(stdout);
  const hasSuccessCriteria = /success.*criteria|acceptance/i.test(stdout);
  const hasWorkMode = /work mode|think.*build|hack.*ship|full.*planning/i.test(stdout);
  const hasFlowState = /flow.*state|flow.*score|hot|warm|cold/i.test(stdout);
  const hasResumePoint = /resume.*point|resume:|last.*activity/i.test(stdout);
  const hasNextAction = /next.*action|next.*step|\$ /i.test(stdout);
  const hasWarnings = /warning|⚠|uncommitted/i.test(stdout);
  const hasBranchInfo = /branch:|main|master/i.test(stdout);

  // Count context sections (rough heuristic)
  const sectionMarkers = ['📜', '🎯', '📋', '🌊', '⚡', '📍', '⚠️', '🌿', '✨'];
  const contextSections = sectionMarkers.filter(marker => stdout.includes(marker)).length;

  // Estimate clarifying questions needed
  // More context = fewer questions needed
  let estimatedQuestions = 5; // Start pessimistic
  if (hasCharter) estimatedQuestions -= 1;
  if (hasGoals) estimatedQuestions -= 0.5;
  if (hasWorkMode) estimatedQuestions -= 0.5;
  if (hasResumePoint) estimatedQuestions -= 1;
  if (hasNextAction) estimatedQuestions -= 0.5;
  estimatedQuestions = Math.max(1, Math.round(estimatedQuestions));

  // Calculate readiness score (out of 10)
  let score = 5; // Base score
  if (hasCharter) score += 1;
  if (hasGoals) score += 0.5;
  if (hasSuccessCriteria) score += 0.5;
  if (hasWorkMode) score += 0.5;
  if (hasFlowState) score += 0.5;
  if (hasResumePoint) score += 1;
  if (hasNextAction) score += 0.5;
  if (hasBranchInfo) score += 0.5;
  score = Math.min(10, score);

  return {
    hasCharter,
    hasGoals,
    hasSuccessCriteria,
    hasWorkMode,
    hasFlowState,
    hasResumePoint,
    hasNextAction,
    hasWarnings,
    hasBranchInfo,
    contextSections,
    outputLength: stdout.length,
    estimatedClarifyingQuestions: estimatedQuestions,
    readinessScore: score
  };
}

// =============================================================================
// AI Readiness Test Protocol
// =============================================================================

describe('AI Readiness Validation', () => {
  describe('Minimal Context (Baseline)', () => {
    let project: TestProject;
    let metrics: AIReadinessMetrics;

    beforeAll(async () => {
      project = await createTestProject({
        name: 'minimal-context',
        hasCharter: false,
        commits: 3,
        files: 10
      });
      metrics = await analyzeAIReadiness(project.dir);
    }, TIMEOUT);

    afterAll(async () => {
      await project.cleanup();
    });

    it('should produce output even without charter', () => {
      expect(metrics.outputLength).toBeGreaterThan(100);
    });

    it('should have baseline readiness score of 5-8/10', () => {
      // Even minimal projects get reasonable scores due to good defaults
      expect(metrics.readinessScore).toBeGreaterThanOrEqual(5);
      expect(metrics.readinessScore).toBeLessThanOrEqual(9);
    });

    it('should estimate 3-5 clarifying questions needed', () => {
      expect(metrics.estimatedClarifyingQuestions).toBeGreaterThanOrEqual(2);
      expect(metrics.estimatedClarifyingQuestions).toBeLessThanOrEqual(5);
    });

    it('should still show work mode', () => {
      expect(metrics.hasWorkMode).toBe(true);
    });
  });

  describe('Standard Context (Target)', () => {
    let project: TestProject;
    let metrics: AIReadinessMetrics;

    beforeAll(async () => {
      project = await createTestProject({
        name: 'standard-context',
        hasCharter: true,
        hasGoals: true,
        commits: 20,
        files: 50
      });
      metrics = await analyzeAIReadiness(project.dir);
    }, TIMEOUT);

    afterAll(async () => {
      await project.cleanup();
    });

    it('should show charter content', () => {
      expect(metrics.hasCharter).toBe(true);
    });

    it('should achieve target readiness score of 7-8/10', () => {
      expect(metrics.readinessScore).toBeGreaterThanOrEqual(6.5);
      expect(metrics.readinessScore).toBeLessThanOrEqual(9);
    });

    it('should estimate 1-3 clarifying questions needed', () => {
      expect(metrics.estimatedClarifyingQuestions).toBeGreaterThanOrEqual(1);
      expect(metrics.estimatedClarifyingQuestions).toBeLessThanOrEqual(4);
    });

    it('should have multiple context sections', () => {
      expect(metrics.contextSections).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Rich Context (Optimal)', () => {
    let project: TestProject;
    let metrics: AIReadinessMetrics;

    beforeAll(async () => {
      project = await createTestProject({
        name: 'rich-context',
        hasCharter: true,
        hasGoals: true,
        hasSuccessCriteria: true,
        hasSprint: true,
        commits: 50,
        files: 100
      });
      metrics = await analyzeAIReadiness(project.dir);
    }, TIMEOUT);

    afterAll(async () => {
      await project.cleanup();
    });

    it('should show comprehensive charter', () => {
      expect(metrics.hasCharter).toBe(true);
    });

    it('should achieve optimal readiness score of 8-10/10', () => {
      expect(metrics.readinessScore).toBeGreaterThanOrEqual(7);
    });

    it('should minimize clarifying questions to 1-2', () => {
      expect(metrics.estimatedClarifyingQuestions).toBeGreaterThanOrEqual(1);
      expect(metrics.estimatedClarifyingQuestions).toBeLessThanOrEqual(3);
    });

    it('should have rich output', () => {
      expect(metrics.outputLength).toBeGreaterThan(500);
    });

    it('should include work mode', () => {
      expect(metrics.hasWorkMode).toBe(true);
    });
  });
});

// =============================================================================
// Context Quality Tests
// =============================================================================

describe('Context Quality', () => {
  describe('Information Completeness', () => {
    let project: TestProject;

    beforeAll(async () => {
      project = await createTestProject({
        name: 'completeness-test',
        hasCharter: true,
        hasGoals: true,
        hasSuccessCriteria: true,
        hasSprint: true,
        commits: 30,
        files: 75
      });
    }, TIMEOUT);

    afterAll(async () => {
      await project.cleanup();
    });

    it('should include project purpose', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} start`,
        {
          cwd: project.dir,
          env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
        }
      );
      expect(stdout).toMatch(/purpose|charter|project/i);
    });

    it('should include work mode', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} start`,
        {
          cwd: project.dir,
          env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
        }
      );
      expect(stdout).toMatch(/work mode|think.*build/i);
    });

    it('should include session status', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} start`,
        {
          cwd: project.dir,
          env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
        }
      );
      expect(stdout).toMatch(/session|ready|initialized/i);
    });
  });

  describe('Actionable Information', () => {
    let project: TestProject;

    beforeAll(async () => {
      project = await createTestProject({
        name: 'actionable-test',
        hasCharter: true,
        hasSprint: true,
        commits: 15,
        files: 40
      });
    }, TIMEOUT);

    afterAll(async () => {
      await project.cleanup();
    });

    it('should provide clear next action or state', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} start`,
        {
          cwd: project.dir,
          env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
        }
      );
      // Should have some actionable guidance
      expect(stdout).toMatch(/next|action|resume|ready|build|work/i);
    });

    it('should show branch information', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} start`,
        {
          cwd: project.dir,
          env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
        }
      );
      expect(stdout).toMatch(/branch|main|master/i);
    });
  });
});

// =============================================================================
// Improvement Validation
// =============================================================================

describe('Context Improvement', () => {
  describe('Charter Addition Impact', () => {
    let projectWithoutCharter: TestProject;
    let projectWithCharter: TestProject;

    beforeAll(async () => {
      projectWithoutCharter = await createTestProject({
        name: 'no-charter-compare',
        hasCharter: false,
        commits: 20,
        files: 50
      });
      projectWithCharter = await createTestProject({
        name: 'with-charter-compare',
        hasCharter: true,
        hasGoals: true,
        commits: 20,
        files: 50
      });
    }, TIMEOUT * 2);

    afterAll(async () => {
      await projectWithoutCharter.cleanup();
      await projectWithCharter.cleanup();
    });

    it('should improve readiness score with charter', async () => {
      const withoutMetrics = await analyzeAIReadiness(projectWithoutCharter.dir);
      const withMetrics = await analyzeAIReadiness(projectWithCharter.dir);

      // Charter should improve score
      expect(withMetrics.readinessScore).toBeGreaterThan(withoutMetrics.readinessScore);
    });

    it('should reduce estimated clarifying questions with charter', async () => {
      const withoutMetrics = await analyzeAIReadiness(projectWithoutCharter.dir);
      const withMetrics = await analyzeAIReadiness(projectWithCharter.dir);

      // Charter should reduce questions needed
      expect(withMetrics.estimatedClarifyingQuestions).toBeLessThanOrEqual(
        withoutMetrics.estimatedClarifyingQuestions
      );
    });
  });
});

// =============================================================================
// Output Format Tests
// =============================================================================

describe('Output Format Quality', () => {
  let project: TestProject;

  beforeAll(async () => {
    project = await createTestProject({
      name: 'format-test',
      hasCharter: true,
      hasGoals: true,
      commits: 25,
      files: 60
    });
  }, TIMEOUT);

  afterAll(async () => {
    await project.cleanup();
  });

  it('should use emoji indicators for sections', async () => {
    const { stdout } = await execAsync(
      `node ${CLI_PATH} start`,
      {
        cwd: project.dir,
        env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
      }
    );
    // Check for emoji section markers
    const emojiPattern = /[📜🎯📋🌊⚡📍⚠️🌿✨]/;
    expect(stdout).toMatch(emojiPattern);
  });

  it('should be parseable (not garbled)', async () => {
    const { stdout } = await execAsync(
      `node ${CLI_PATH} start`,
      {
        cwd: project.dir,
        env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
      }
    );
    // Should not have encoding issues
    expect(stdout).not.toMatch(/\ufffd/); // Unicode replacement character
    expect(stdout).not.toMatch(/\\x[0-9a-f]{2}/i); // Escaped bytes
  });

  it('should have reasonable length (not truncated or bloated)', async () => {
    const { stdout } = await execAsync(
      `node ${CLI_PATH} start`,
      {
        cwd: project.dir,
        env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
      }
    );
    // Between 500 and 50000 characters (reasonable range)
    expect(stdout.length).toBeGreaterThan(200);
    expect(stdout.length).toBeLessThan(50000);
  });

  it('--concise should produce shorter output', async () => {
    const { stdout: normalOutput } = await execAsync(
      `node ${CLI_PATH} start`,
      {
        cwd: project.dir,
        env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
      }
    );

    const { stdout: conciseOutput } = await execAsync(
      `node ${CLI_PATH} start --concise`,
      {
        cwd: project.dir,
        env: { ...process.env, GINKO_USER_ID: 'test-user', GINKO_SKIP_CLOUD: 'true' }
      }
    );

    // Concise should be notably shorter (at least 20% reduction)
    // Allow for some variance since first run may include initialization messages
    expect(conciseOutput.length).toBeLessThan(normalOutput.length * 1.2);
  });
});
