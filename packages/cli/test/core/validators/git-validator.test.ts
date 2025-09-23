/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, unit-test, git, validation, jest]
 * @related: [../../../src/core/validators/git-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import { GitValidator } from '../../../src/core/validators/git-validator.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { simpleGit } from 'simple-git';

describe('GitValidator', () => {
  let tempDir: string;
  let validator: GitValidator;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-git-test-'));
    validator = new GitValidator(tempDir);
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await fs.remove(tempDir);
  });

  describe('validate()', () => {
    it('should fail when not in a git repository', async () => {
      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in a git repository');
      expect(result.suggestions).toContain('Initialize git: git init');
    });

    it('should pass when in a valid git repository', async () => {
      // Initialize git repository in temp directory
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.repositoryPath).toBeTruthy();
    });

    it('should include metadata for valid repositories', async () => {
      // Initialize git repository and create commit
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      // Create a test file and commit
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
      await git.add('test.txt');
      await git.commit('Initial commit');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata).toMatchObject({
        gitVersion: expect.any(String),
        repositoryPath: expect.any(String),
        currentBranch: expect.any(String),
        hasUncommittedChanges: false
      });
    });

    it('should detect uncommitted changes', async () => {
      // Initialize git repository
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      // Create uncommitted file
      await fs.writeFile(path.join(tempDir, 'uncommitted.txt'), 'uncommitted content');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.hasUncommittedChanges).toBe(true);
    });

    it('should handle repositories with no commits gracefully', async () => {
      // Initialize git repository without commits
      const git = simpleGit(tempDir);
      await git.init();

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.warning).toContain('No commits found');
    });
  });

  describe('getErrorMessage()', () => {
    it('should return appropriate error message after validation failure', async () => {
      await validator.validate(); // This should fail since no git repo

      const errorMessage = validator.getErrorMessage();
      expect(errorMessage).toContain('not in a git repository');
    });

    it('should return default message when no validation has been run', () => {
      const errorMessage = validator.getErrorMessage();
      expect(errorMessage).toBe('Git validation failed');
    });
  });

  describe('getSuggestions()', () => {
    it('should return helpful suggestions after validation failure', async () => {
      await validator.validate(); // This should fail since no git repo

      const suggestions = validator.getSuggestions();
      expect(suggestions).toContain('Initialize git: git init');
      expect(suggestions).toContain('Navigate to an existing repository: cd /path/to/your/repo');
    });

    it('should return empty array when no validation has been run', () => {
      const suggestions = validator.getSuggestions();
      expect(suggestions).toEqual([]);
    });
  });

  describe('Static methods', () => {
    describe('isGitRepository()', () => {
      it('should return false for non-git directory', async () => {
        const isRepo = await GitValidator.isGitRepository(tempDir);
        expect(isRepo).toBe(false);
      });

      it('should return true for git repository', async () => {
        // Initialize git repository
        const git = simpleGit(tempDir);
        await git.init();

        const isRepo = await GitValidator.isGitRepository(tempDir);
        expect(isRepo).toBe(true);
      });

      it('should use current directory by default', async () => {
        // This test assumes the test is run from within a git repository
        const isRepo = await GitValidator.isGitRepository();
        expect(typeof isRepo).toBe('boolean');
      });
    });

    describe('getGitInfo()', () => {
      it('should return empty object for non-git directory', async () => {
        const info = await GitValidator.getGitInfo(tempDir);
        expect(info).toEqual({});
      });

      it('should return git info for valid repository', async () => {
        // Initialize git repository
        const git = simpleGit(tempDir);
        await git.init();
        await git.config('user.email', 'test@example.com');
        await git.config('user.name', 'Test User');

        const info = await GitValidator.getGitInfo(tempDir);
        expect(info).toHaveProperty('gitVersion');
        expect(info).toHaveProperty('repositoryPath');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a directory with no permissions (Unix only)
      if (process.platform !== 'win32') {
        const restrictedDir = path.join(tempDir, 'restricted');
        await fs.mkdir(restrictedDir);
        await fs.chmod(restrictedDir, 0o000);

        const restrictedValidator = new GitValidator(restrictedDir);
        const result = await restrictedValidator.validate();

        expect(result.valid).toBe(false);
        expect(result.suggestions).toContain('Ensure repository is properly initialized');

        // Cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });

    it('should handle corrupted git repositories', async () => {
      // Create a fake .git directory
      const gitDir = path.join(tempDir, '.git');
      await fs.mkdir(gitDir);
      await fs.writeFile(path.join(gitDir, 'HEAD'), 'invalid content');

      const result = await validator.validate();

      // This might still pass validation depending on simple-git behavior
      // The test verifies that we don't crash on corrupted repositories
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('Integration with different git states', () => {
    it('should handle freshly cloned repository', async () => {
      // Initialize repository with remote-like structure
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      // Create multiple commits to simulate real repository
      await fs.writeFile(path.join(tempDir, 'README.md'), '# Test Repository');
      await git.add('README.md');
      await git.commit('Initial commit');

      await fs.writeFile(path.join(tempDir, 'package.json'), '{"name": "test"}');
      await git.add('package.json');
      await git.commit('Add package.json');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.currentBranch).toBeTruthy();
      expect(result.metadata?.hasUncommittedChanges).toBe(false);
    });

    it('should handle repository with staged changes', async () => {
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      // Create and stage changes
      await fs.writeFile(path.join(tempDir, 'staged.txt'), 'staged content');
      await git.add('staged.txt');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.metadata?.hasUncommittedChanges).toBe(true);
    });
  });
});