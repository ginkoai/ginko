#!/usr/bin/env node

/**
 * Development database setup script
 * Creates a basic in-memory setup for testing without requiring PostgreSQL
 */

console.log('='.repeat(60));
console.log('🗄️  ContextMCP Database Setup Guide');
console.log('='.repeat(60));
console.log();

console.log('📋 For development testing without PostgreSQL:');
console.log('   The server will automatically fall back to in-memory storage');
console.log('   if database connection fails.');
console.log();

console.log('🐘 For production with PostgreSQL:');
console.log('   1. Install PostgreSQL: brew install postgresql');
console.log('   2. Start PostgreSQL: brew services start postgresql');
console.log('   3. Create database: createdb contextmcp');
console.log('   4. Run schema: psql contextmcp < database/schema.sql');
console.log('   5. Set environment variables:');
console.log('      export DB_HOST=localhost');
console.log('      export DB_PORT=5432');
console.log('      export DB_NAME=contextmcp');
console.log('      export DB_USER=postgres');
console.log('      export DB_PASSWORD=your_password');
console.log();

console.log('🚀 Start the server with:');
console.log('   npm start');
console.log();

console.log('💡 The server will show:');
console.log('   - "Database persistence: ENABLED" if PostgreSQL connected');
console.log('   - "Database persistence: DISABLED" if using in-memory storage');
console.log();