# Rollup Dependency Fix for Vercel Deployment

## Issue Description
Vercel deployment failing with: `Error: Cannot find module @rollup/rollup-linux-x64-gnu`

This is caused by npm's handling of optional dependencies in the Rollup ecosystem, particularly affecting Vite builds on Vercel's Linux environment.

## ✅ Solution Implemented

### 1. **Package.json Updates**
- Added explicit `rollup: ^4.24.4` dependency
- Added `overrides` for npm package resolution
- Added `resolutions` for yarn/pnpm compatibility

### 2. **Vercel Configuration (`vercel.json`)**
- Custom `installCommand` with `--force` flag
- Custom `buildCommand` to handle dependency conflicts  
- Environment variables to skip optional dependency issues
- Force npm to ignore optional dependency failures

### 3. **Vite Configuration (`vite.config.js`)**
- External exclusion of problematic Rollup platform binaries
- Manual chunk splitting for better dependency management
- CommonJS transformation options
- Optimized dependency pre-bundling

## 🚀 Deployment Steps

### Step 1: Clean Local Environment
```bash
# Remove existing lock files and node_modules
rm -rf node_modules package-lock.json
```

### Step 2: Fresh Install
```bash
# Install with force flag to handle optional dependency issues
npm install --force
```

### Step 3: Test Local Build
```bash
# Test if build works locally
npm run build
```

### Step 4: Deploy to Vercel
The updated configuration should automatically handle the Rollup dependency issue during Vercel deployment.

## 🔧 Alternative Solutions (if above doesn't work)

### Option A: Use .npmrc File
Create `.npmrc` in project root:
```
optional=false
force=true
@rollup:registry=https://registry.npmjs.org/
```

### Option B: Explicit Rollup Binary Installation
Add to package.json dependencies:
```json
"@rollup/rollup-linux-x64-gnu": "^4.24.4"
```

### Option C: Use Different Build Tool
Switch from Vite to Create React App or Next.js if Rollup issues persist.

## 🛠️ Vercel Environment Variables
Ensure these are set in Vercel Dashboard:
```
NPM_CONFIG_OPTIONAL=false
SKIP_INSTALL_DEPS=false
NODE_OPTIONS=--max_old_space_size=4096
```

## ✅ Expected Build Output
After implementing this fix, you should see:
1. Successful npm install without optional dependency errors
2. Successful Vite build process
3. Proper deployment to Vercel without Rollup module errors

## 🐛 Troubleshooting

### If Build Still Fails:
1. Check Vercel build logs for specific error details
2. Try manual deployment: `vercel --prod --force`
3. Consider downgrading Vite to stable version: `"vite": "^5.4.8"`

### If Rollup Errors Persist:
1. Add explicit binary dependencies for all platforms
2. Use `postinstall` script to handle missing binaries
3. Consider using esbuild instead of Rollup

## 📋 Files Modified
- `/package.json` - Added dependency overrides and explicit Rollup version
- `/vercel.json` - Updated build and install commands with force flags
- `/vite.config.js` - Added Rollup configuration and external exclusions

## 🎯 Root Cause
The issue occurs because:
1. Vite 7.0.0 uses newer Rollup versions with platform-specific optional dependencies
2. npm sometimes fails to properly install these optional binaries
3. Vercel's Linux environment expects the `@rollup/rollup-linux-x64-gnu` binary
4. Package resolution conflicts cause the binary to be missing during build

This fix ensures proper dependency resolution and forces npm to handle optional dependencies correctly.