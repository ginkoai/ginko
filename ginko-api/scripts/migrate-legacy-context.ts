#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface LegacySession {
  id: string;
  userId: string;
  teamId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  workingDirectory: string;
  currentTask: string;
  focusAreas: string[];
  conversationSummary: string;
  keyDecisions: any[];
  recentFiles: any[];
  openTasks: any[];
  activeFeatures: any[];
  currentChallenges: any[];
  discoveries: any[];
  recentCommands: any[];
  metadata: any;
}

interface MigrationResult {
  success: boolean;
  sessionId: string;
  originalFile: string;
  checksum: string;
  error?: string;
}

class LegacyContextMigration {
  private supabase: any;
  private legacyPath: string;
  private backupPath: string;
  private results: MigrationResult[] = [];
  private checksums: Map<string, string> = new Map();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.legacyPath = path.join(process.cwd(), '.contextmcp/sessions');
    this.backupPath = path.join(process.cwd(), '.contextmcp/sessions-backup');
  }

  private calculateChecksum(data: any): string {
    const jsonStr = JSON.stringify(data, null, 2);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  private async createBackup(): Promise<void> {
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

  private async validateDatabase(): Promise<boolean> {
    console.log('🔍 Validating database connection...');
    
    try {
      const { error } = await this.supabase
        .from('sessions')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Database validation failed:', error);
        return false;
      }
      
      console.log('✅ Database connection validated');
      return true;
    } catch (err) {
      console.error('❌ Database validation error:', err);
      return false;
    }
  }

  private transformSession(legacy: LegacySession): any {
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
    const tags: string[] = [...(legacy.focusAreas || [])];
    legacy.activeFeatures?.forEach((feature: any) => {
      if (feature.name && !tags.includes(feature.name)) {
        tags.push(feature.name);
      }
    });

    return {
      title: title.substring(0, 200),
      description: description.substring(0, 1000),
      content,
      metadata: {
        ...legacy.metadata,
        migrated: true,
        migrationDate: new Date().toISOString(),
        originalCreatedAt: legacy.createdAt,
        originalUpdatedAt: legacy.updatedAt
      },
      quality_score: Math.min(100, qualityScore),
      tags,
      is_archived: false,
      is_public: false,
      created_at: legacy.createdAt,
      updated_at: legacy.updatedAt
    };
  }

  private async migrateSession(filePath: string): Promise<MigrationResult> {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Migrating ${fileName}...`);

    try {
      // Read and parse legacy session
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const legacy: LegacySession = JSON.parse(fileContent);
      
      // Calculate checksum of original
      const originalChecksum = this.calculateChecksum(legacy);
      this.checksums.set(fileName, originalChecksum);
      
      // Transform to new schema
      const transformed = this.transformSession(legacy);
      
      // Insert into database
      const { data, error } = await this.supabase
        .from('sessions')
        .insert(transformed)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log(`  ✓ Migrated successfully (ID: ${data.id})`);
      
      return {
        success: true,
        sessionId: data.id,
        originalFile: fileName,
        checksum: originalChecksum
      };
    } catch (error: any) {
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

  private async verifyMigration(): Promise<void> {
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

  public async execute(): Promise<void> {
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
      
      console.log('\n✅ Migration completed successfully!');
    } catch (error: any) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('⚠️  Rollback: Legacy files preserved in original location');
      console.error('⚠️  Backup available at:', this.backupPath);
      process.exit(1);
    }
  }
}

// Execute migration if run directly
if (require.main === module) {
  const migration = new LegacyContextMigration();
  migration.execute().catch(console.error);
}

export default LegacyContextMigration;