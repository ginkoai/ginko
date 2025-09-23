/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, path-resolver, variables, substitution, unit-test]
 * @related: [../../../src/core/config/path-resolver.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [assert, path, os]
 */

import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import {
  PathResolver,
  ResolverContext,
  ResolutionResult,
  CircularReferenceError,
  VariableNotFoundError,
  PathResolverUtils
} from '../../../src/core/config/path-resolver.js';

/**
 * Test Suite: Path Resolution with Variable Substitution
 */
describe('PathResolver', () => {
  let resolver: PathResolver;
  let testContext: ResolverContext;

  beforeEach(() => {
    testContext = {
      variables: {
        'root': '/test/root',
        'docs.root': '/test/docs',
        'docs.adr': '${docs.root}/adr',
        'ginko.root': '/test/.ginko',
        'ginko.sessions': '${ginko.root}/sessions',
        'platform.home': '/home/test',
        'platform.type': 'linux'
      },
      env: {
        'HOME': '/home/test',
        'USER': 'testuser',
        'PATH': '/usr/bin:/bin'
      },
      platform: {
        type: 'linux',
        separator: '/',
        homeDir: '/home/test'
      }
    };

    resolver = new PathResolver(testContext);
  });

  describe('Basic Resolution', () => {
    it('should resolve simple variables', () => {
      const result = resolver.resolve('${root}/files');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved.includes('/test/root'), true);
      assert.strictEqual(result.substituted.length, 1);
      assert.strictEqual(result.substituted[0].variable, 'root');
      assert.strictEqual(result.substituted[0].value, '/test/root');
    });

    it('should resolve nested variables', () => {
      const result = resolver.resolve('${docs.adr}/files');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved.includes('/test/docs/adr'), true);
      assert.strictEqual(result.substituted.length >= 1, true);
    });

    it('should resolve environment variables', () => {
      const result = resolver.resolve('${env.HOME}/config');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved.includes('/home/test'), true);
    });

    it('should return original path if no variables', () => {
      const result = resolver.resolve('/absolute/path');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.substituted.length, 0);
      assert.strictEqual(result.original, '/absolute/path');
    });

    it('should handle multiple variables in one path', () => {
      const result = resolver.resolve('${root}/${ginko.root}/combined');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.substituted.length, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing variables', () => {
      const result = resolver.resolve('${nonexistent}/path');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.missing.length, 1);
      assert.strictEqual(result.missing[0], 'nonexistent');
    });

    it('should detect circular references', () => {
      const circularContext: ResolverContext = {
        variables: {
          'a': '${b}/path',
          'b': '${c}/path',
          'c': '${a}/path'
        },
        env: {},
        platform: testContext.platform
      };

      const circularResolver = new PathResolver(circularContext);

      assert.throws(() => {
        circularResolver.resolve('${a}');
      }, CircularReferenceError);
    });

    it('should handle invalid variable syntax', () => {
      const result = resolver.resolve('${}/invalid');
      assert.strictEqual(result.success, false);
    });

    it('should handle unclosed braces', () => {
      const result = resolver.resolve('${unclosed/path');
      // Should treat as literal text, not a variable
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.substituted.length, 0);
    });
  });

  describe('Platform Detection', () => {
    it('should detect platform correctly', () => {
      const detectedType = PathResolver.detectPlatform();
      const validTypes = ['windows', 'macos', 'linux'];
      assert.strictEqual(validTypes.includes(detectedType), true);
    });

    it('should create resolver with auto-detection', () => {
      const autoResolver = PathResolver.create();
      assert.strictEqual(autoResolver instanceof PathResolver, true);

      const stats = autoResolver.getStats();
      assert.strictEqual(typeof stats.platformInfo.type, 'string');
      assert.strictEqual(typeof stats.platformInfo.homeDir, 'string');
    });
  });

  describe('Context Management', () => {
    it('should update context variables', () => {
      resolver.updateContext({ 'new.var': '/new/value' });
      const result = resolver.resolve('${new.var}/test');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved.includes('/new/value'), true);
    });

    it('should clear cache on context update', () => {
      const path1 = '${root}/test';
      const result1 = resolver.resolve(path1);
      const cacheSize1 = resolver.getStats().cacheSize;

      resolver.updateContext({ 'root': '/different/root' });
      const cacheSize2 = resolver.getStats().cacheSize;

      assert.strictEqual(cacheSize1 > 0, true);
      assert.strictEqual(cacheSize2, 0); // Cache should be cleared
    });

    it('should get available variables', () => {
      const variables = resolver.getAvailableVariables();
      assert.strictEqual(variables.includes('root'), true);
      assert.strictEqual(variables.includes('docs.root'), true);
      assert.strictEqual(variables.includes('env.HOME'), true);
    });
  });

  describe('Validation', () => {
    it('should validate paths successfully', () => {
      const validation = resolver.validatePath('${root}/valid/path');
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    it('should return validation errors for invalid paths', () => {
      const validation = resolver.validatePath('${invalid.var}/path');
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.errors.length > 0, true);
    });
  });

  describe('Multiple Path Resolution', () => {
    it('should resolve multiple paths at once', () => {
      const paths = {
        docs: '${docs.root}/files',
        sessions: '${ginko.sessions}/current',
        custom: '${root}/custom'
      };

      const results = resolver.resolveMultiple(paths);

      assert.strictEqual(Object.keys(results).length, 3);
      assert.strictEqual(results.docs.success, true);
      assert.strictEqual(results.sessions.success, true);
      assert.strictEqual(results.custom.success, true);
    });

    it('should handle mixed success/failure in multiple resolution', () => {
      const paths = {
        valid: '${root}/files',
        invalid: '${nonexistent}/files'
      };

      const results = resolver.resolveMultiple(paths);

      assert.strictEqual(results.valid.success, true);
      assert.strictEqual(results.invalid.success, false);
    });
  });

  describe('Caching', () => {
    it('should cache resolution results', () => {
      const pathTemplate = '${root}/cached/path';

      resolver.resolve(pathTemplate);
      const stats1 = resolver.getStats();

      resolver.resolve(pathTemplate); // Should use cache
      const stats2 = resolver.getStats();

      assert.strictEqual(stats2.cacheSize >= stats1.cacheSize, true);
    });

    it('should clear cache manually', () => {
      resolver.resolve('${root}/test');
      assert.strictEqual(resolver.getStats().cacheSize > 0, true);

      resolver.clearCache();
      assert.strictEqual(resolver.getStats().cacheSize, 0);
    });

    it('should not cache failed resolutions', () => {
      const initialCacheSize = resolver.getStats().cacheSize;
      resolver.resolve('${nonexistent}/path');
      const finalCacheSize = resolver.getStats().cacheSize;

      assert.strictEqual(finalCacheSize, initialCacheSize);
    });
  });

  describe('Cross-Platform Paths', () => {
    it('should normalize paths for current platform', () => {
      const result = resolver.resolve('${root}/mixed\\path/separators');
      assert.strictEqual(result.success, true);
      // Should use platform-appropriate separators
      assert.strictEqual(result.resolved.includes(path.sep), true);
    });

    it('should handle Windows-style paths on Unix', () => {
      if (testContext.platform.type !== 'windows') {
        const result = resolver.resolve('C:\\Windows\\System32');
        assert.strictEqual(result.success, true);
      }
    });

    it('should resolve relative paths', () => {
      const result = resolver.resolve('./relative/${root}');
      assert.strictEqual(result.success, true);
      assert.strictEqual(path.isAbsolute(result.resolved), true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path templates', () => {
      const result = resolver.resolve('');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.substituted.length, 0);
    });

    it('should handle paths with only variables', () => {
      const result = resolver.resolve('${root}');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.resolved, path.resolve('/test/root'));
    });

    it('should handle escaped braces', () => {
      // This would need special handling if we support escaping
      const result = resolver.resolve('literal${notavariable}');
      assert.strictEqual(result.success, false); // Should fail to find variable
    });

    it('should handle very long paths', () => {
      const longPath = '${root}/' + 'very/'.repeat(100) + 'long/path';
      const result = resolver.resolve(longPath);
      assert.strictEqual(result.success, true);
    });

    it('should handle special characters in variable values', () => {
      resolver.updateContext({
        'special': '/path with spaces/and-dashes/and_underscores'
      });

      const result = resolver.resolve('${special}/file.txt');
      assert.strictEqual(result.success, true);
    });
  });

  describe('Performance', () => {
    it('should resolve paths quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        resolver.resolve('${root}/performance/test');
      }

      const elapsed = Date.now() - start;
      assert.strictEqual(elapsed < 100, true, `1000 resolutions took ${elapsed}ms, expected < 100ms`);
    });

    it('should handle complex nested resolution efficiently', () => {
      const complexPath = '${docs.adr}/${ginko.sessions}/${platform.home}/complex';
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        resolver.resolve(complexPath);
      }

      const elapsed = Date.now() - start;
      assert.strictEqual(elapsed < 50, true, `100 complex resolutions took ${elapsed}ms, expected < 50ms`);
    });
  });
});

/**
 * PathResolverUtils Tests
 */
describe('PathResolverUtils', () => {
  describe('isValidTemplate', () => {
    it('should validate correct templates', () => {
      assert.strictEqual(PathResolverUtils.isValidTemplate('${valid.variable}'), true);
      assert.strictEqual(PathResolverUtils.isValidTemplate('/path/${var}/file'), true);
      assert.strictEqual(PathResolverUtils.isValidTemplate('${a}/${b}/${c}'), true);
    });

    it('should reject invalid templates', () => {
      assert.strictEqual(PathResolverUtils.isValidTemplate('${'), false);
      assert.strictEqual(PathResolverUtils.isValidTemplate('}invalid'), false);
      assert.strictEqual(PathResolverUtils.isValidTemplate('${invalid variable}'), false);
      assert.strictEqual(PathResolverUtils.isValidTemplate('${invalid-variable}'), false);
    });

    it('should handle edge cases', () => {
      assert.strictEqual(PathResolverUtils.isValidTemplate(''), true);
      assert.strictEqual(PathResolverUtils.isValidTemplate('/no/variables'), true);
      assert.strictEqual(PathResolverUtils.isValidTemplate('${env.HOME}'), true);
    });
  });

  describe('extractAllVariables', () => {
    it('should extract unique variables', () => {
      const templates = {
        path1: '${var1}/${var2}',
        path2: '${var1}/${var3}',
        path3: '/no/variables'
      };

      const variables = PathResolverUtils.extractAllVariables(templates);
      assert.strictEqual(variables.includes('var1'), true);
      assert.strictEqual(variables.includes('var2'), true);
      assert.strictEqual(variables.includes('var3'), true);
      assert.strictEqual(variables.length, 3);
    });
  });

  describe('createDependencyGraph', () => {
    it('should create correct dependency graph', () => {
      const templates = {
        a: '${b}/${c}',
        b: '${d}/path',
        c: '/independent',
        d: '/base'
      };

      const graph = PathResolverUtils.createDependencyGraph(templates);
      assert.strictEqual(graph.a.includes('b'), true);
      assert.strictEqual(graph.a.includes('c'), true);
      assert.strictEqual(graph.b.includes('d'), true);
      assert.strictEqual(graph.c.length, 0);
      assert.strictEqual(graph.d.length, 0);
    });
  });

  describe('detectCircularReferences', () => {
    it('should detect circular references', () => {
      const templates = {
        a: '${b}/path',
        b: '${c}/path',
        c: '${a}/path'
      };

      const issues = PathResolverUtils.detectCircularReferences(templates);
      assert.strictEqual(issues.length > 0, true);
      assert.strictEqual(issues.some(issue => issue.includes('Circular reference')), true);
    });

    it('should not flag valid dependencies', () => {
      const templates = {
        a: '${b}/path',
        b: '/base/path',
        c: '${b}/other'
      };

      const issues = PathResolverUtils.detectCircularReferences(templates);
      assert.strictEqual(issues.length, 0);
    });
  });
});

/**
 * Integration Tests
 */
describe('PathResolver Integration', () => {
  it('should work with realistic ginko configuration', () => {
    const ginkoVariables = {
      'docs.root': './docs',
      'docs.adr': '${docs.root}/adr',
      'docs.prd': '${docs.root}/PRD',
      'ginko.root': './.ginko',
      'ginko.context': '${ginko.root}/context',
      'ginko.sessions': '${ginko.root}/sessions',
      'ginko.modules': '${ginko.context}/modules'
    };

    const resolver = PathResolver.create(ginkoVariables);

    // Test complex resolution
    const result = resolver.resolve('${ginko.modules}/auth-patterns.md');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.resolved.includes('.ginko'), true);
    assert.strictEqual(result.resolved.includes('context'), true);
    assert.strictEqual(result.resolved.includes('modules'), true);
  });

  it('should handle environment integration', () => {
    const resolver = PathResolver.create({
      'config.home': '${env.HOME}/.config/ginko'
    });

    const result = resolver.resolve('${config.home}/settings.json');
    assert.strictEqual(result.success, true);

    if (process.env.HOME) {
      assert.strictEqual(result.resolved.includes(process.env.HOME), true);
    }
  });
});

/**
 * Test runner for environments without a test framework
 */
if (require.main === module) {
  console.log('Running path-resolver tests...');

  const runTests = async () => {
    const testContext: ResolverContext = {
      variables: {
        'root': '/test/root',
        'docs.root': '/test/docs'
      },
      env: { 'HOME': '/home/test' },
      platform: { type: 'linux', separator: '/', homeDir: '/home/test' }
    };

    const resolver = new PathResolver(testContext);

    const tests = [
      () => {
        console.log('✓ Basic variable resolution');
        const result = resolver.resolve('${root}/files');
        assert.strictEqual(result.success, true);
      },
      () => {
        console.log('✓ Environment variable resolution');
        const result = resolver.resolve('${env.HOME}/config');
        assert.strictEqual(result.success, true);
      },
      () => {
        console.log('✓ Missing variable handling');
        const result = resolver.resolve('${nonexistent}/path');
        assert.strictEqual(result.success, false);
      },
      () => {
        console.log('✓ Platform detection');
        const type = PathResolver.detectPlatform();
        assert.strictEqual(['windows', 'macos', 'linux'].includes(type), true);
      },
      () => {
        console.log('✓ Template validation');
        assert.strictEqual(PathResolverUtils.isValidTemplate('${valid}'), true);
        assert.strictEqual(PathResolverUtils.isValidTemplate('${'), false);
      }
    ];

    for (const test of tests) {
      try {
        test();
      } catch (error) {
        console.error('✗ Test failed:', error);
        process.exit(1);
      }
    }

    console.log('✓ All path-resolver tests passed!');
  };

  runTests().catch(console.error);
}