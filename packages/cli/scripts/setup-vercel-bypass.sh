#!/bin/bash

# Vercel Bypass Token Setup
# This script helps you configure the Vercel deployment protection bypass token

echo "🔐 Vercel Bypass Token Setup"
echo "=============================="
echo ""

echo "To get your Vercel bypass token:"
echo ""
echo "1. Go to: https://vercel.com/chris-nortons-projects/ginko/settings/deployment-protection"
echo "2. Scroll to 'Protection Bypass for Automation'"
echo "3. Click 'Create Token' or copy existing token"
echo "4. Copy the secret that starts with 'XOFXxR...' or similar"
echo ""
echo "Then run:"
echo "  export VERCEL_AUTOMATION_BYPASS_SECRET='your_secret_here'"
echo ""
echo "Or add to your .env file:"
echo "  echo 'VERCEL_AUTOMATION_BYPASS_SECRET=your_secret_here' >> ../../.env"
echo ""

read -p "Do you want to open the Vercel settings page? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://vercel.com/chris-nortons-projects/ginko/settings/deployment-protection"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://vercel.com/chris-nortons-projects/ginko/settings/deployment-protection"
    else
        echo "Please open this URL in your browser:"
        echo "https://vercel.com/chris-nortons-projects/ginko/settings/deployment-protection"
    fi
fi

echo ""
echo "After getting your token, paste it here:"
read -p "VERCEL_AUTOMATION_BYPASS_SECRET: " token

if [ -n "$token" ]; then
    # Add to .env file
    PROJECT_ROOT="$(cd ../../ && pwd)"
    if grep -q "VERCEL_AUTOMATION_BYPASS_SECRET" "$PROJECT_ROOT/.env"; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/VERCEL_AUTOMATION_BYPASS_SECRET=.*/VERCEL_AUTOMATION_BYPASS_SECRET=$token/" "$PROJECT_ROOT/.env"
        else
            sed -i "s/VERCEL_AUTOMATION_BYPASS_SECRET=.*/VERCEL_AUTOMATION_BYPASS_SECRET=$token/" "$PROJECT_ROOT/.env"
        fi
        echo "✅ Updated VERCEL_AUTOMATION_BYPASS_SECRET in .env"
    else
        # Add new
        echo "" >> "$PROJECT_ROOT/.env"
        echo "# Vercel Deployment Protection Bypass (for automated testing)" >> "$PROJECT_ROOT/.env"
        echo "VERCEL_AUTOMATION_BYPASS_SECRET=$token" >> "$PROJECT_ROOT/.env"
        echo "✅ Added VERCEL_AUTOMATION_BYPASS_SECRET to .env"
    fi

    echo ""
    echo "Token configured! You can now run:"
    echo "  ./scripts/run-live-tests.sh"
else
    echo "No token provided. Exiting."
fi
