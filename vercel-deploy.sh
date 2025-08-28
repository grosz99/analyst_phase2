#!/bin/bash
# Vercel deployment script for handling Rollup platform dependencies

set -e  # Exit on any error

echo "🔄 Starting Vercel deployment process..."

# Clean npm cache to prevent conflicts
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Remove node_modules to ensure clean install
if [ -d "node_modules" ]; then
    echo "🗑️  Removing existing node_modules..."
    rm -rf node_modules
fi

# Install dependencies with force flag to handle platform binaries
echo "📦 Installing dependencies..."
npm install --force --no-optional=false --no-audit --no-fund

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✅ Build completed successfully!"