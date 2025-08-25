#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class LegacyContextMigration {
  buildConnectionString() {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    
    if (!host || !database || !user || !password) {
      return null;
    }
    
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  constructor() {
    // Build connection string from individual env vars or use full connection string
    const connectionString = process.env.DATABASE_URL || 
                           process.env.SUPABASE_DB_URL ||
                           this.buildConnectionString();
    
    if (!connectionString) {
      throw new Error('Missing database configuration. Please set DATABASE_URL or individual DB_* environment variables');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.legacyPath = path.join(process.cwd(), '.contextmcp/sessions');
    this.backupPath = path.join(process.cwd(), '.contextmcp/sessions-backup');
    this.results = [];
    this.checksums = new Map();
  }

  calculateChecksum(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  async createBackup() {
    console.log('📦 Creating backup of legacy sessions...');
    
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }

    const files = fs.readdirSync(this.legacyPath).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const sourcePath = path.join(this.legacyPath, file);
      const destPath = path.join(this.backupPath, file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`  ✓ Backed up ${file}`);
    }
    
    console.log(`✅ Backup complete: ${files.length} files`);
  }

  async validateDatabase() {
    console.log('🔍 Validating database connection...');
    
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection validated');
      
      // Check if sessions table exists
      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sessions'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('⚠️  Sessions table does not exist, creating...');
        // Run the migration schema
        const schemaPath = path.join(process.cwd(), 'database/migrations/003-legacy-session-migration.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(schema);
        console.log('✅ Sessions table created');
      }
      
      return true;
    } catch (err) {
      console.error('❌ Database validation error:', err);
      return false;
    }
  }

  transformSession(legacy) {
    // Transform legacy session to new schema
    const title = legacy.currentTask || 'Legacy Session';
    const description = legacy.conversationSummary || '';
    
    // Build comprehensive content object
    const content = {
      workingDirectory: legacy.workingDirectory,
      currentTask: legacy.currentTask,
      focusAreas: legacy.focusAreas,
      conversationSummary: legacy.conversationSummary,
      keyDecisions: legacy.keyDecisions,
      recentFiles: legacy.recentFiles,
      openTasks: legacy.openTasks,
      activeFeatures: legacy.activeFeatures,
      currentChallenges: legacy.currentChallenges,
      discoveries: legacy.discoveries,
      recentCommands: legacy.recentCommands,
      // Preserve original IDs for reference
      originalId: legacy.id,
      originalTeamId: legacy.teamId,
      originalProjectId: legacy.projectId
    };

    // Calculate quality score based on content completeness
    let qualityScore = 50; // Base score
    if (legacy.keyDecisions?.length > 0) qualityScore += 10;
    if (legacy.recentFiles?.length > 0) qualityScore += 10;
    if (legacy.openTasks?.length > 0) qualityScore += 10;
    if (legacy.discoveries?.length > 0) qualityScore += 10;
    if (legacy.metadata?.contextQuality) {
      qualityScore = Math.round(legacy.metadata.contextQuality * 100);
    }

    // Extract tags from focus areas and active features
    const tags = [...(legacy.focusAreas || [])];
    legacy.activeFeatures?.forEach((feature) => {
      if (feature.name && !tags.includes(feature.name)) {
        tags.push(feature.name);
      }
    });

    // For now, we'll use a placeholder user_id since we don't have auth context
    // This will need to be updated after migration
    const MIGRATION_USER_ID = '00000000-0000-0000-0000-000000000000';

    return {
      user_id: MIGRATION_USER_ID,
      title: title.substring(0, 200),
      description: description.substring(0, 1000),
      content: JSON.stringify(content),
      metadata: JSON.stringify({
        ...legacy.metadata,
        migrated: true,
        migrationDate: new Date().toISOString(),
        originalCreatedAt: legacy.createdAt,
        originalUpdatedAt: legacy.updatedAt
      }),
      quality_score: Math.min(100, qualityScore),
      tags: tags,
      is_archived: false,
      is_public: false,
      created_at: legacy.createdAt,
      updated_at: legacy.updatedAt
    };
  }

  async migrateSession(filePath) {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Migrating ${fileName}...`);

    try {
      // Read and parse legacy session
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const legacy = JSON.parse(fileContent);
      
      // Calculate checksum of original
      const originalChecksum = this.calculateChecksum(legacy);
      this.checksums.set(fileName, originalChecksum);
      
      // Transform to new schema
      const transformed = this.transformSession(legacy);
      
      // Insert into database
      const query = `
        INSERT INTO sessions (
          user_id, title, description, content, metadata, 
          quality_score, tags, is_archived, is_public, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING id
      `;
      
      const values = [
        transformed.user_id,
        transformed.title,
        transformed.description,
        transformed.content,
        transformed.metadata,
        transformed.quality_score,
        transformed.tags,
        transformed.is_archived,
        transformed.is_public,
        transformed.created_at,
        transformed.updated_at
      ];
      
      const result = await this.pool.query(query, values);
      const sessionId = result.rows[0].id;
      
      console.log(`  ✓ Migrated successfully (ID: ${sessionId})`);
      
      return {
        success: true,
        sessionId,
        originalFile: fileName,
        checksum: originalChecksum
      };
    } catch (error) {
      console.error(`  ❌ Migration failed: ${error.message}`);
      
      return {
        success: false,
        sessionId: '',
        originalFile: fileName,
        checksum: '',
        error: error.message
      };
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✓ Successful: ${successful.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);
    console.log(`  📁 Total: ${this.results.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed migrations:');
      failed.forEach(f => {
        console.log(`  - ${f.originalFile}: ${f.error}`);
      });
    }
    
    // Write migration report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        successful: successful.length,
        failed: failed.length
      },
      checksums: Object.fromEntries(this.checksums),
      results: this.results
    };
    
    const reportPath = path.join(process.cwd(), '.contextmcp/migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Migration report saved to: ${reportPath}`);
  }

  async execute() {
    console.log('🚀 Starting Legacy Context Migration (MIGRATE-001)');
    console.log('================================================');
    
    try {
      // Phase 1: Discovery & Analysis
      console.log('\n📋 Phase 1: Discovery & Analysis');
      const files = fs.readdirSync(this.legacyPath).filter(f => f.endsWith('.json'));
      console.log(`  Found ${files.length} legacy session files`);
      
      // Phase 2: Pre-Migration Validation
      console.log('\n📋 Phase 2: Pre-Migration Validation');
      await this.createBackup();
      
      const dbValid = await this.validateDatabase();
      if (!dbValid) {
        throw new Error('Database validation failed');
      }
      
      // Phase 3: Migration Execution
      console.log('\n📋 Phase 3: Migration Execution');
      for (const file of files) {
        const filePath = path.join(this.legacyPath, file);
        const result = await this.migrateSession(filePath);
        this.results.push(result);
      }
      
      // Phase 4: Verification & Testing
      console.log('\n📋 Phase 4: Verification & Testing');
      await this.verifyMigration();
      
      // Phase 5: Cutover & Cleanup
      console.log('\n📋 Phase 5: Cutover & Cleanup');
      console.log('  ⚠️  Manual steps required:');
      console.log('  1. Update MCP client configuration to production endpoints');
      console.log('  2. Stop legacy Socket.IO server on port 3031');
      console.log('  3. Archive legacy session files after confirming migration');
      console.log('  4. Update user_id fields to actual user IDs post-migration');
      
      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('⚠️  Rollback: Legacy files preserved in original location');
      console.error('⚠️  Backup available at:', this.backupPath);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Execute migration if run directly
const migration = new LegacyContextMigration();
migration.execute().catch(console.error);

export default LegacyContextMigration;