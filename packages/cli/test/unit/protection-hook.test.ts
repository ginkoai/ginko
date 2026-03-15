import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  generatePreCommitHook,
  generateProtectionCheck,
  installPreCommitHook,
  isHookInstalled,
} from '../../src/lib/protection-hook.js';

describe('protection-hook', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-hook-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('generatePreCommitHook', () => {
    it('produces script with shebang and marker', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('# GINKO-PROTECTION-HOOK');
    });

    it('reads PROTECTED manifest', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('.ginko/PROTECTED');
    });

    it('checks git diff for deletions', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('git diff --cached --diff-filter=D');
    });
  });

  describe('generateProtectionCheck', () => {
    it('produces check without shebang (for embedding)', () => {
      const check = generateProtectionCheck();
      expect(check).not.toContain('#!/bin/bash');
      expect(check).toContain('# GINKO-PROTECTION-HOOK');
    });
  });

  describe('installPreCommitHook', () => {
    it('creates hook when none exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.git', 'hooks'));

      const result = await installPreCommitHook(tmpDir);
      expect(result.installed).toBe(true);
      expect(result.message).toBe('Protection hook installed');

      const hookPath = path.join(tmpDir, '.git', 'hooks', 'pre-commit');
      expect(await fs.pathExists(hookPath)).toBe(true);

      const content = await fs.readFile(hookPath, 'utf8');
      expect(content).toContain('# GINKO-PROTECTION-HOOK');
      expect(content).toContain('#!/bin/bash');
    });

    it('preserves existing hook by renaming to pre-commit.user', async () => {
      const hooksDir = path.join(tmpDir, '.git', 'hooks');
      await fs.ensureDir(hooksDir);

      const existingHook = '#!/bin/bash\necho "existing hook"\n';
      await fs.writeFile(path.join(hooksDir, 'pre-commit'), existingHook);

      const result = await installPreCommitHook(tmpDir);
      expect(result.installed).toBe(true);
      expect(result.message).toContain('preserved as pre-commit.user');

      // Original hook should be renamed
      const userHook = await fs.readFile(
        path.join(hooksDir, 'pre-commit.user'),
        'utf8',
      );
      expect(userHook).toBe(existingHook);

      // New hook should call pre-commit.user and include protection
      const newHook = await fs.readFile(
        path.join(hooksDir, 'pre-commit'),
        'utf8',
      );
      expect(newHook).toContain('pre-commit.user');
      expect(newHook).toContain('# GINKO-PROTECTION-HOOK');
    });

    it('is idempotent — skips if marker already present', async () => {
      await fs.ensureDir(path.join(tmpDir, '.git', 'hooks'));

      // Install once
      await installPreCommitHook(tmpDir);
      const firstContent = await fs.readFile(
        path.join(tmpDir, '.git', 'hooks', 'pre-commit'),
        'utf8',
      );

      // Install again
      const result = await installPreCommitHook(tmpDir);
      expect(result.installed).toBe(true);
      expect(result.message).toBe('Protection hook already installed');

      // Content unchanged
      const secondContent = await fs.readFile(
        path.join(tmpDir, '.git', 'hooks', 'pre-commit'),
        'utf8',
      );
      expect(secondContent).toBe(firstContent);
    });

    it('returns not installed when not a git repo', async () => {
      // tmpDir has no .git directory
      const result = await installPreCommitHook(tmpDir);
      expect(result.installed).toBe(false);
      expect(result.message).toBe('Not a git repository');
    });
  });

  describe('isHookInstalled', () => {
    it('returns true when hook has marker', async () => {
      await fs.ensureDir(path.join(tmpDir, '.git', 'hooks'));
      await installPreCommitHook(tmpDir);
      expect(await isHookInstalled(tmpDir)).toBe(true);
    });

    it('returns false when no hook exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.git'));
      expect(await isHookInstalled(tmpDir)).toBe(false);
    });

    it('returns false when hook exists without marker', async () => {
      const hooksDir = path.join(tmpDir, '.git', 'hooks');
      await fs.ensureDir(hooksDir);
      await fs.writeFile(
        path.join(hooksDir, 'pre-commit'),
        '#!/bin/bash\necho "other hook"\n',
      );
      expect(await isHookInstalled(tmpDir)).toBe(false);
    });
  });
});
