#!/bin/bash

# =============================================================================
# CRITICAL BACKEND DATABASE CONNECTIVITY FIX - DEPLOYMENT SCRIPT
# =============================================================================

echo "🚀 Starting critical fix deployment for backend database connectivity..."

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please run from project root."
    exit 1
fi

echo "📋 Pre-deployment checklist:"

# 1. Check critical files exist
CRITICAL_FILES=(
    "api/index.js"
    "api/services/supabaseService.js" 
    "api/services/openai/gpt4AgentOrchestrator.js"
    "api/services/pythonExecutor.js"
    "vercel.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing critical file: $file"
        exit 1
    fi
done

# 2. Verify package.json has required dependencies
echo "📦 Checking dependencies..."
if grep -q "@supabase/supabase-js" "api/package.json"; then
    echo "✅ Supabase client dependency found"
else
    echo "❌ Missing @supabase/supabase-js dependency"
    exit 1
fi

# 3. Test Node.js compatibility
echo "🔧 Checking Node.js version compatibility..."
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

# 4. Clean build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf dist/
rm -rf .next/
rm -rf node_modules/.cache

echo "💾 Environment variables that MUST be set in Vercel:"
echo ""
echo "CRITICAL VARIABLES (Required):"
echo "- VITE_SUPABASE_URL=https://your-project.supabase.co"
echo "- VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
echo "- SUPABASE_URL=https://your-project.supabase.co"
echo "- SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key"
echo "- OPENAI_API_KEY=sk-your_openai_key"
echo "- SESSION_SECRET=your_secure_session_secret"
echo ""
echo "OPTIONAL VARIABLES:"
echo "- NODE_ENV=production"
echo "- FRONTEND_URL=https://your-app.vercel.app"
echo ""

# 5. Show deployment command
echo "🚀 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "1. Set environment variables in Vercel Dashboard:"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Select your project"
echo "   - Settings → Environment Variables"
echo "   - Add all variables listed above"
echo ""
echo "2. Deploy using one of these methods:"
echo ""
echo "   OPTION A: Automatic (Git push):"
echo "   git add ."
echo "   git commit -m \"Fix backend database connectivity - disable Python execution in production\""
echo "   git push origin main"
echo ""
echo "   OPTION B: Manual (if you have vercel CLI):"
echo "   vercel --prod"
echo ""

echo "📊 FIXES APPLIED:"
echo "✅ Disabled Python execution in serverless environment"
echo "✅ Added production fallbacks for GPT-4.1 Agent Orchestrator"
echo "✅ Enhanced Vercel configuration with proper memory allocation"
echo "✅ Improved Supabase error handling with environment detection"
echo "✅ Updated error messages for better debugging"

echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "- Python execution will be disabled in production (Vercel serverless)"
echo "- AI analysis will use GPT-4.1 text analysis without Python execution"
echo "- All database operations will use Supabase with fixed metadata fallbacks"
echo "- Error handling now provides clear debugging information"

echo ""
echo "🎯 After deployment, test these endpoints:"
echo "- https://your-app.vercel.app/api/health"
echo "- https://your-app.vercel.app/api/available-datasets"
echo "- https://your-app.vercel.app/api/debug/env"

echo ""
echo "🚀 Ready for deployment! Follow the instructions above."