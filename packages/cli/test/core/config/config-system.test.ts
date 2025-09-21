/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-20
 * @tags: [test, config, paths, validation, integration]
 * @related: [config-loader.ts, project-detector.ts, git-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigLoader } from '../../../src/core/config/config-loader.js';
import { ProjectDetector } from '../../../src/core/config/project-detector.js';
import { GitValidator } from '../../../src/core/validators/git-validator.js';
import { InteractiveConfigSetup } from '../../../src/core/config/interactive-config.js';
import { GinkoConfig, DEFAULT_CONFIG } from '../../../src/types/config.js';

describe('Configuration System', () => {
  let tempDir: string;
  let configLoader: ConfigLoader;
  let projectDetector: ProjectDetector;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-config-test-'));
    process.chdir(tempDir);

    // Initialize test instances
    configLoader = new ConfigLoader();
    projectDetector = new ProjectDetector();

    // Clear any cached configuration
    configLoader.clearCache();
  });

  afterEach(async () => {
    // Cleanup
    process.chdir('/');
    await fs.remove(tempDir);
  });

  describe('ConfigLoader', () => {
    it('should load default configuration when no ginko.json exists', async () => {
      const config = await configLoader.loadConfig(tempDir);

      expect(config.version).toBe(DEFAULT_CONFIG.version);
      expect(config.paths.docs.root).toBe('docs');
      expect(config.features.autoCapture).toBe(true);
    });

    it('should load and merge custom configuration', async () => {
      const customConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: 'documentation',
            adr: 'architecture/decisions'
          }
        },
        features: {
          autoCapture: false
        }
      };

      await fs.writeJSON(path.join(tempDir, 'ginko.json'), customConfig);

      const config = await configLoader.loadConfig(tempDir);

      expect(config.paths.docs.root).toBe('documentation');
      expect(config.paths.docs.adr).toBe('architecture/decisions');
      expect(config.features.autoCapture).toBe(false);
      expect(config.features.gitIntegration).toBe(true); // Should merge defaults
    });

    it('should resolve path variables correctly', async () => {
      const configWithVariables = {
        version: '1.0.0',
        paths: {
          docs: {
            root: 'docs',
            adr: '${docs.root}/adr',
            prd: '${docs.root}/PRD'
          },
          ginko: {
            root: '.ginko',
            context: '${ginko.root}/context'
          }
        }
      };

      await fs.writeJSON(path.join(tempDir, 'ginko.json'), configWithVariables);

      const config = await configLoader.loadConfig(tempDir);

      expect(config.paths.docs.adr).toBe('docs/adr');
      expect(config.paths.docs.prd).toBe('docs/PRD');
      expect(config.paths.ginko.context).toBe('.ginko/context');
    });

    it('should save configuration correctly', async () => {
      const config: GinkoConfig = {
        ...DEFAULT_CONFIG,
        paths: {
          docs: {
            root: 'custom-docs',
            adr: 'custom-docs/architecture',
            prd: 'custom-docs/requirements',
            sprints: 'custom-docs/sprints'
          },
          ginko: DEFAULT_CONFIG.paths.ginko
        }
      };

      await configLoader.saveConfig(config, tempDir);

      const savedFile = path.join(tempDir, 'ginko.json');
      expect(await fs.pathExists(savedFile)).toBe(true);

      const savedConfig = await fs.readJSON(savedFile);
      expect(savedConfig.paths.docs.root).toBe('custom-docs');
    });

    it('should get resolved paths correctly', async () => {
      const config = {
        version: '1.0.0',
        paths: {
          docs: {
            root: 'docs',
            adr: '${docs.root}/adr'
          },
          ginko: {
            root: '.ginko',
            context: '${ginko.root}/context'
          }
        }
      };

      await fs.writeJSON(path.join(tempDir, 'ginko.json'), config);

      const adrPath = await configLoader.getPath('docs.adr');
      const contextPath = await configLoader.getPath('ginko.context');

      expect(adrPath).toBe('docs/adr');
      expect(contextPath).toBe('.ginko/context');
    });

    it('should ensure all configured paths exist', async () => {
      const config = {
        version: '1.0.0',
        paths: {
          docs: {
            root: 'docs',
            adr: 'docs/adr',
            prd: 'docs/PRD'
          },
          ginko: {
            root: '.ginko',
            context: '.ginko/context'
          }
        }
      };

      await fs.writeJSON(path.join(tempDir, 'ginko.json'), config);
      await configLoader.ensurePaths();

      expect(await fs.pathExists(path.join(tempDir, 'docs/adr'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'docs/PRD'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko/context'))).toBe(true);
    });
  });

  describe('ProjectDetector', () => {
    it('should detect existing documentation structure', async () => {
      // Create existing docs structure
      await fs.ensureDir(path.join(tempDir, 'docs', 'adr'));
      await fs.ensureDir(path.join(tempDir, 'docs', 'requirements'));
      await fs.writeFile(path.join(tempDir, 'docs', 'adr', 'ADR-001-test.md'), '# Test ADR');
      await fs.writeFile(path.join(tempDir, 'docs', 'requirements', 'user-auth.md'), '# User Auth');

      const analysis = await projectDetector.analyzeProject(tempDir);

      expect(analysis.hasDocsFolder).toBe(true);
      expect(analysis.hasExistingAdr).toBe(true);
      expect(analysis.existingPaths).toContain('docs');
    });

    it('should generate configuration options for existing projects', async () => {
      await fs.ensureDir(path.join(tempDir, 'docs'));

      const options = await projectDetector.generateConfigOptions(tempDir);

      expect(options).toHaveLength(4); // existing-docs, subdirectory, custom, minimal
      expect(options[0].name).toContain('existing docs');
      expect(options[1].name).toContain('subdirectory');
    });

    it('should validate project compatibility', async () => {
      // Create git repository
      await fs.ensureDir(path.join(tempDir, '.git'));

      const validation = await projectDetector.validateProjectCompatibility(tempDir);

      expect(validation.compatible).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect incompatible projects', async () => {
      // Create existing .ginko directory
      await fs.ensureDir(path.join(tempDir, '.ginko'));

      const validation = await projectDetector.validateProjectCompatibility(tempDir);

      expect(validation.compatible).toBe(false);
      expect(validation.issues).toContain('Ginko already initialized');
    });
  });

  describe('GitValidator', () => {
    beforeEach(async () => {
      // Create a basic git repository
      await fs.ensureDir(path.join(tempDir, '.git'));
    });

    it('should detect git repository correctly', async () => {
      const isGitRepo = await GitValidator.isGitRepository(tempDir);
      expect(isGitRepo).toBe(true);
    });

    it('should validate initialization location', async () => {
      const validation = await GitValidator.validateInitLocation(tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).not.toContain('Not in a git repository');
    });

    it('should detect parent .ginko directories', async () => {
      const parentDir = path.dirname(tempDir);
      await fs.ensureDir(path.join(parentDir, '.ginko'));

      const parentGinko = await GitValidator.findParentGinko(tempDir);
      expect(parentGinko).toBe(parentDir);
    });

    it('should detect existing .ginko in current directory', async () => {
      await fs.ensureDir(path.join(tempDir, '.ginko'));

      const validation = await GitValidator.validateInitLocation(tempDir);

      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('Ginko already initialized in this directory');
    });
  });

  describe('InteractiveConfigSetup', () => {
    let interactiveConfig: InteractiveConfigSetup;

    beforeEach(() => {
      interactiveConfig = new InteractiveConfigSetup();
    });

    it('should perform quick setup for simple projects', async () => {
      const config = await interactiveConfig.quickSetup(tempDir);

      expect(config.version).toBe('1.0.0');
      expect(config.paths).toBeDefined();
      expect(config.features).toBeDefined();
    });

    it('should validate configuration correctly', async () => {
      const config: GinkoConfig = {
        ...DEFAULT_CONFIG,
        paths: {
          docs: {
            root: 'docs',
            adr: 'docs/adr',
            prd: 'docs/PRD',
            sprints: 'docs/sprints'
          },
          ginko: {
            root: '.ginko',
            context: '.ginko/context',
            sessions: '.ginko/sessions',
            backlog: '.ginko/backlog'
          }
        }
      };

      const validation = await interactiveConfig.validateConfiguration(config, tempDir);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete initialization workflow', async () => {
      // Create git repository
      await fs.ensureDir(path.join(tempDir, '.git'));

      // Create existing docs structure
      await fs.ensureDir(path.join(tempDir, 'docs'));
      await fs.writeFile(path.join(tempDir, 'docs', 'README.md'), '# Project Docs');

      // Validate git repository
      await expect(GitValidator.validateOrExit()).resolves.not.toThrow();

      // Analyze project
      const analysis = await projectDetector.analyzeProject(tempDir);
      expect(analysis.hasDocsFolder).toBe(true);

      // Generate configuration
      const config = analysis.recommendedConfig as GinkoConfig;

      // Save configuration
      await configLoader.saveConfig(config, tempDir);

      // Verify configuration was saved and can be loaded
      const loadedConfig = await configLoader.loadConfig(tempDir);
      expect(loadedConfig.paths.docs.root).toBe(config.paths.docs.root);

      // Ensure paths exist
      await configLoader.ensurePaths();

      // Verify directories were created
      expect(await fs.pathExists(path.join(tempDir, '.ginko'))).toBe(true);
    });

    it('should handle custom path configurations', async () => {
      const customConfig: GinkoConfig = {
        version: '1.0.0',
        paths: {
          docs: {
            root: 'documentation',
            adr: 'architecture/decisions',
            prd: 'requirements/product',
            sprints: 'planning/sprints'
          },
          ginko: {
            root: '.ginko',
            context: '.ginko/context',
            sessions: '.ginko/sessions',
            backlog: '.ginko/backlog'
          }
        },
        features: {
          autoCapture: true,
          gitIntegration: true,
          aiEnhancement: true,
          documentNaming: true,
          crossPlatform: true
        }
      };

      await configLoader.saveConfig(customConfig, tempDir);
      await configLoader.ensurePaths();

      // Test path resolution
      const adrPath = await configLoader.getPath('docs.adr');
      const prdPath = await configLoader.getPath('docs.prd');

      expect(adrPath).toBe('architecture/decisions');
      expect(prdPath).toBe('requirements/product');

      // Verify directories exist
      expect(await fs.pathExists(path.join(tempDir, 'architecture/decisions'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, 'requirements/product'))).toBe(true);
    });
  });
});