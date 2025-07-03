# Vercel Deployment Configuration

## ⚠️ QUICK FIX for 400 Bad Request Error

If you're getting a 400 Bad Request error, the issue is likely a missing API key:

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Add this variable**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-actual-api-key-here`
3. **Select all environments**: Production, Preview, Development
4. **Click "Save"**
5. **Redeploy** your application

## Required Environment Variables

The following environment variables must be set in your Vercel project settings for the API to work properly:

### 1. Anthropic API Configuration
```
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### 2. Snowflake Configuration (for Cortex Analyst)
```
SNOWFLAKE_ACCOUNT=your-account-identifier
SNOWFLAKE_USERNAME=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_DATABASE=SUPERSTOREDB
SNOWFLAKE_SCHEMA=DATA
SNOWFLAKE_WAREHOUSE=your-warehouse-name
SNOWFLAKE_ROLE=your-role
```

### 3. API Configuration (optional)
```
NODE_ENV=production
PORT=3001
```

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable listed above
4. Make sure to select the appropriate environments (Production, Preview, Development)
5. Click "Save" after adding each variable

## Common Issues and Solutions

### 400 Bad Request Error - IMMEDIATE FIX NEEDED
- **Cause**: Missing ANTHROPIC_API_KEY environment variable
- **Solution**: 
  1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  2. Add: `ANTHROPIC_API_KEY` with value: `sk-ant-your-api-key-here`
  3. Select Production, Preview, and Development environments
  4. Click "Save"
  5. Redeploy your application

### Missing Dependencies Error
- **Cause**: Excel/PowerPoint export dependencies not installed
- **Solution**: Run `npm install xlsx file-saver html2canvas pptxgenjs` before deployment

### "AI analysis service temporarily unavailable"
- **Cause**: API services failing to initialize
- **Solution**: Check API keys are valid and have proper permissions

### CORS Errors
- **Cause**: Frontend and backend URLs mismatch
- **Solution**: Ensure your frontend is using the correct API URL

## Debugging Steps

1. Check Vercel Function Logs:
   - Go to Functions tab in Vercel dashboard
   - Look for error messages in the logs

2. Verify Environment Variables:
   - In Vercel Settings, confirm all variables are present
   - Test API keys locally first

3. Test API Endpoints:
   - `/api/health` - Should return status
   - `/api/ai/backends` - Should list available backends
   - `/api/available-datasets` - Should show data sources

## Local Testing

Before deploying, test locally with a `.env` file:

```bash
# Create .env file in api directory
cp api/.env.example api/.env

# Add your credentials
# Test locally
npm run dev
```

## Build Configuration

Ensure your `vercel.json` is properly configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

## Post-Deployment Checklist

- [ ] **CRITICAL**: ANTHROPIC_API_KEY set in Vercel environment variables
- [ ] All other environment variables set in Vercel  
- [ ] API health check endpoint responding: `/api/health`
- [ ] Anthropic API key validated: `/api/ai/health`
- [ ] Snowflake credentials working (if using Cortex): `/api/snowflake/test`
- [ ] Frontend able to connect to API endpoints
- [ ] No CORS errors in browser console
- [ ] Excel/PowerPoint export dependencies installed: `npm install xlsx file-saver html2canvas pptxgenjs`

## Support

If issues persist after following these steps:
1. Check Vercel function logs for specific errors
2. Verify API keys have proper permissions
3. Test each service independently
4. Review browser console for detailed error messages