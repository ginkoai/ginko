/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [document, examples, integration, demo]
 * @related: [index.ts, document-namer.ts, document-migrator.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [all document management components]
 */

import {
  createDocumentManagementSystem,
  createBasicDocumentNamer,
  validateDocumentNaming,
  standardizeProjectDocuments
} from './index.js';

/**
 * Example: Basic document naming
 */
export async function exampleBasicNaming(ginkoRoot: string) {
  console.log('=== Basic Document Naming Example ===');

  const { namer } = await createBasicDocumentNamer(ginkoRoot);

  // Generate standard document names
  const adrResult = await namer.generateName({
    type: 'ADR',
    description: 'microservices architecture decision',
    ensureUnique: true
  });

  const prdResult = await namer.generateName({
    type: 'PRD',
    description: 'user authentication system',
    ensureUnique: true
  });

  console.log('Generated names:');
  console.log(`- ADR: ${adrResult.filename}`);
  console.log(`- PRD: ${prdResult.filename}`);
  console.log(`- ADR Path: ${adrResult.fullPath}`);
  console.log(`- PRD Path: ${prdResult.fullPath}`);

  return { adrResult, prdResult };
}

/**
 * Example: Complete project standardization
 */
export async function exampleProjectStandardization(ginkoRoot: string) {
  console.log('=== Project Standardization Example ===');

  // Step 1: Validate current state
  console.log('1. Validating current document naming...');
  const initialValidation = await validateDocumentNaming(ginkoRoot);

  console.log(`- Compliant: ${initialValidation.isCompliant}`);
  console.log(`- Non-compliant files: ${initialValidation.nonCompliantFiles.length}`);

  if (initialValidation.nonCompliantFiles.length > 0) {
    console.log('- Files to rename:');
    initialValidation.nonCompliantFiles.forEach(file => console.log(`  - ${file}`));
  }

  // Step 2: Preview migration (dry run)
  console.log('\n2. Previewing migration plan...');
  const dryRunResult = await standardizeProjectDocuments(ginkoRoot, { dryRun: true });

  console.log(`- Operations planned: ${dryRunResult.operations.length}`);
  dryRunResult.operations.forEach(op => {
    console.log(`  - ${op.originalFilename} → ${op.newFilename}`);
  });

  // Step 3: Execute migration
  if (dryRunResult.operations.length > 0) {
    console.log('\n3. Executing migration...');
    const migrationResult = await standardizeProjectDocuments(ginkoRoot, {
      updateReferences: true
    });

    console.log(`- Successful migrations: ${migrationResult.successfulMigrations}`);
    console.log(`- References updated: ${migrationResult.referencesUpdated.length}`);
    console.log(`- Backup created: ${migrationResult.backupDirectory}`);

    if (migrationResult.errors.length > 0) {
      console.log('- Errors:');
      migrationResult.errors.forEach(error => {
        console.log(`  - ${error.file}: ${error.error}`);
      });
    }
  }

  // Step 4: Final validation
  console.log('\n4. Final validation...');
  const finalValidation = await validateDocumentNaming(ginkoRoot);
  console.log(`- Final compliance: ${finalValidation.isCompliant}`);

  return {
    initialValidation,
    migrationResult: dryRunResult.operations.length > 0 ? await standardizeProjectDocuments(ginkoRoot) : null,
    finalValidation
  };
}

/**
 * Example: Advanced system usage with sequence management
 */
export async function exampleAdvancedUsage(ginkoRoot: string) {
  console.log('=== Advanced System Usage Example ===');

  const system = await createDocumentManagementSystem({
    ginkoRoot,
    updateReferences: true,
    startingNumbers: { ADR: 100, PRD: 200 }
  });

  await system.initialize();

  console.log('1. Initial sequence numbers:');
  const initialSequences = await system.sequenceManager.getAllSequences();
  Object.entries(initialSequences).forEach(([type, number]) => {
    console.log(`- ${type}: ${number}`);
  });

  console.log('\n2. Generating documents with custom sequences...');

  // Generate document with custom sequence
  const customResult = await system.documentNamer.generateName({
    type: 'ADR',
    description: 'special architecture decision',
    customSequence: 999,
    ensureUnique: true
  });

  console.log(`- Custom sequence document: ${customResult.filename}`);

  // Generate normal sequence documents
  const normalResult1 = await system.documentNamer.generateName({
    type: 'ADR',
    description: 'normal sequence document',
    ensureUnique: true
  });

  const normalResult2 = await system.documentNamer.generateName({
    type: 'PRD',
    description: 'product requirements document',
    ensureUnique: true
  });

  console.log(`- Normal ADR: ${normalResult1.filename}`);
  console.log(`- Normal PRD: ${normalResult2.filename}`);

  console.log('\n3. Current sequence numbers:');
  const currentSequences = await system.sequenceManager.getAllSequences();
  Object.entries(currentSequences).forEach(([type, number]) => {
    console.log(`- ${type}: ${number}`);
  });

  // Demonstrate sequence management
  console.log('\n4. Setting custom sequence for STRATEGY...');
  await system.sequenceManager.setSequence('STRATEGY', 50);

  const strategyResult = await system.documentNamer.generateName({
    type: 'STRATEGY',
    description: 'business strategy document',
    ensureUnique: true
  });

  console.log(`- Strategy document: ${strategyResult.filename}`);

  return {
    customResult,
    normalResult1,
    normalResult2,
    strategyResult,
    finalSequences: await system.sequenceManager.getAllSequences()
  };
}

/**
 * Example: Error handling and edge cases
 */
export async function exampleErrorHandling(ginkoRoot: string) {
  console.log('=== Error Handling Examples ===');

  const { namer } = await createBasicDocumentNamer(ginkoRoot);

  console.log('1. Testing invalid inputs...');

  try {
    await namer.generateName({
      type: 'INVALID' as any,
      description: 'test',
      ensureUnique: false
    });
  } catch (error) {
    console.log(`- Invalid document type error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    await namer.generateName({
      type: 'ADR',
      description: '',
      ensureUnique: false
    });
  } catch (error) {
    console.log(`- Empty description error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    await namer.generateName({
      type: 'ADR',
      description: 'a'.repeat(101),
      ensureUnique: false
    });
  } catch (error) {
    console.log(`- Long description error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n2. Testing special characters handling...');

  const specialCharsResult = await namer.generateName({
    type: 'ADR',
    description: 'Special!@#$%Characters & Spaces',
    ensureUnique: false
  });

  console.log(`- Special chars sanitized: ${specialCharsResult.filename}`);

  console.log('\n3. Testing name parsing...');

  const testNames = [
    'ADR-001-valid-name.md',
    'PRD-042-another-valid.md',
    'invalid-name.md',
    'ADR-1-too-short.md',
    'adr-001-lowercase.md'
  ];

  testNames.forEach(name => {
    const parsed = namer.parseDocumentName(name);
    console.log(`- "${name}" → ${parsed ? `${parsed.type}-${parsed.sequence}-${parsed.description}` : 'INVALID'}`);
  });

  return {
    specialCharsResult,
    parsedNames: testNames.map(name => ({ name, parsed: namer.parseDocumentName(name) }))
  };
}

/**
 * Example: CLI integration demonstration
 */
export async function exampleCLIIntegration(ginkoRoot: string) {
  console.log('=== CLI Integration Example ===');

  console.log('This demonstrates how the document management system');
  console.log('would integrate with ginko CLI commands:');

  console.log('\n1. `ginko rename --standardize` command simulation:');
  const result = await standardizeProjectDocuments(ginkoRoot, { dryRun: true });

  if (result.operations.length === 0) {
    console.log('✅ All documents already follow standard naming convention');
  } else {
    console.log('📋 Documents to be renamed:');
    result.operations.forEach(op => {
      console.log(`   ${op.originalFilename} → ${op.newFilename}`);
    });
    console.log('\nRun without --dry-run to execute the migration');
  }

  console.log('\n2. `ginko reflect` command integration:');
  const system = await createDocumentManagementSystem({ ginkoRoot });
  await system.initialize();

  const newDocResult = await system.documentNamer.generateName({
    type: 'ADR',
    description: 'ai-powered-code-reflection',
    ensureUnique: true
  });

  console.log(`   Generated name for new reflection: ${newDocResult.filename}`);
  console.log(`   Full path: ${newDocResult.fullPath}`);

  console.log('\n3. Document validation check:');
  const validation = await validateDocumentNaming(ginkoRoot);
  console.log(`   Project compliance: ${validation.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);

  if (!validation.isCompliant) {
    console.log(`   Non-compliant files: ${validation.nonCompliantFiles.length}`);
    validation.nonCompliantFiles.slice(0, 3).forEach(file => {
      console.log(`     - ${file}`);
    });
    if (validation.nonCompliantFiles.length > 3) {
      console.log(`     ... and ${validation.nonCompliantFiles.length - 3} more`);
    }
  }

  return {
    migrationPlan: result,
    newDocResult,
    validation
  };
}

/**
 * Run all examples
 */
export async function runAllExamples(ginkoRoot: string) {
  console.log('🚀 Document Management System Examples\n');

  try {
    await exampleBasicNaming(ginkoRoot);
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleAdvancedUsage(ginkoRoot);
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleErrorHandling(ginkoRoot);
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleProjectStandardization(ginkoRoot);
    console.log('\n' + '='.repeat(50) + '\n');

    await exampleCLIIntegration(ginkoRoot);

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}