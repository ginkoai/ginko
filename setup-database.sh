#!/bin/bash
# @fileType: script
# @status: deprecated
# @updated: 2025-09-22
# @tags: [database, postgresql, setup, legacy, contextmcp]
# @related: [setup-billing.sh]
# @priority: low
# @complexity: medium
# @dependencies: [postgresql, psql, createdb, brew]
# @description: Deprecated database setup script - references old ContextMCP branding and credentials

echo "🗄️  Setting up PostgreSQL for ContextMCP"
echo "========================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew install postgresql@14
        brew services start postgresql@14
    else
        echo "❌ Homebrew not found. Please install PostgreSQL manually:"
        echo "   https://www.postgresql.org/download/"
        exit 1
    fi
else
    echo "✅ PostgreSQL already installed"
fi

# Start PostgreSQL service
echo "🚀 Starting PostgreSQL service..."
if command -v brew &> /dev/null; then
    brew services start postgresql || brew services restart postgresql
else
    # Try common service managers
    sudo systemctl start postgresql || sudo service postgresql start || pg_ctl start
fi

sleep 3

# Create database and user
echo "🔧 Setting up database and user..."

# Create database user if not exists
psql postgres -c "CREATE USER contextmcp WITH PASSWORD 'contextmcp123';" 2>/dev/null || echo "User already exists"

# Grant privileges
psql postgres -c "ALTER USER contextmcp CREATEDB;" 2>/dev/null

# Create database
createdb -O contextmcp contextmcp 2>/dev/null || echo "Database already exists"

# Run schema
echo "📋 Creating database schema..."
psql -U contextmcp -d contextmcp -f database/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "🔧 Environment variables to set:"
    echo "export DB_HOST=localhost"
    echo "export DB_PORT=5432"
    echo "export DB_NAME=contextmcp"
    echo "export DB_USER=contextmcp"
    echo "export DB_PASSWORD=contextmcp123"
    echo ""
    echo "🚀 Start server with database:"
    echo "DB_HOST=localhost DB_PORT=5432 DB_NAME=contextmcp DB_USER=contextmcp DB_PASSWORD=contextmcp123 node dist/remote-server.js"
    echo ""
    echo "🧪 Test connection:"
    echo "psql -U contextmcp -d contextmcp -c 'SELECT NOW();'"
else
    echo "❌ Schema creation failed. Check database connection."
fi