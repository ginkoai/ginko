#\!/bin/bash

echo "🏗️  Setting up ContextMCP with Billing & Authentication"
echo "======================================================"

# Check if .env exists
if [ \! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update with your actual values."
else
    echo "⚠️  .env file already exists. Skipping..."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

# Setup database schema
echo ""
echo "🗄️  Setting up database..."
echo "Make sure PostgreSQL is running and update .env with your database credentials."
echo "Then run: psql -d contextmcp -f database/schema.sql"

echo ""
echo "🎯 Next Steps:"
echo "1. Update .env with your actual database and Stripe credentials"
echo "2. Set up Stripe products: npm run setup-stripe (coming soon)"
echo "3. Run database migrations: psql -d contextmcp -f database/schema.sql"
echo "4. Start the server: npm run dev:remote"
echo ""
echo "📚 See docs/architecture/ADR-004-identity-entitlements-billing.md for detailed setup instructions"
EOF < /dev/null