# 🚀 Deployment Guide - Secure Environment Configuration

## Environment Variables for Production (Vercel)

### Required Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

#### Anthropic API Configuration
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-anthropic-api-key-here
```

#### Snowflake Configuration  
```bash
SNOWFLAKE_ACCOUNT=your-snowflake-account
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=your-warehouse
SNOWFLAKE_DATABASE=your-database
SNOWFLAKE_SCHEMA=your-schema
SNOWFLAKE_ROLE=SYSADMIN
```

#### Application Configuration
```bash
NODE_ENV=production
```

---

## 🔒 Security Best Practices

### 1. **Credential Priority (Secure)**
- ✅ **Production**: Environment variables (Vercel)
- ✅ **Development**: Local `snowcred.env` file (gitignored)
- ✅ **Fallback**: Graceful degradation when missing

### 2. **Environment Variable Scope**
Set for **all environments** in Vercel:
- ☑️ Production
- ☑️ Preview  
- ☑️ Development

### 3. **API Key Security**
- ✅ Never commit API keys to git
- ✅ Use Vercel's encrypted environment variables
- ✅ Rotate keys regularly
- ✅ Monitor usage in Anthropic dashboard

---

## 📋 Deployment Checklist

### Before Deployment:
- [ ] Add `ANTHROPIC_API_KEY` to Vercel environment variables
- [ ] Add all Snowflake credentials to Vercel environment variables  
- [ ] Verify `snowcred.env` is in `.gitignore` (✅ already configured)
- [ ] Test API endpoints locally first

### After Deployment:
- [ ] Test `/api/ai/health` endpoint
- [ ] Test `/api/ai/status` endpoint
- [ ] Verify Snowflake connection in production
- [ ] Test end-to-end AI analysis flow

---

## 🧪 Testing Environment Variables

### Local Testing with Environment Variables:
```bash
# Set temporarily for testing
export ANTHROPIC_API_KEY="your-key-here"
node index.js

# Check if loaded correctly
curl http://localhost:3001/api/ai/status
```

### Vercel Testing:
```bash
# Deploy to preview first
vercel --prod=false

# Test preview deployment
curl https://your-preview-url.vercel.app/api/ai/status
```

---

## 🔍 Troubleshooting

### AI Service Not Initialized:
1. Check Vercel environment variables are set correctly
2. Verify API key format: `sk-ant-api03-...`
3. Check logs: `vercel logs your-project-name`

### Snowflake Connection Issues:
1. Verify all Snowflake credentials in Vercel
2. Check network connectivity from Vercel to Snowflake
3. Verify role permissions

### API Endpoint 404 Errors:
1. Ensure deployment succeeded
2. Check if serverless functions are deployed
3. Verify API routes in deployment logs

---

## 📊 Monitoring

### Production Health Checks:
- **API Health**: `GET /api/health`
- **AI Health**: `GET /api/ai/health`  
- **Snowflake Status**: `GET /api/status`

### Usage Monitoring:
- Monitor Anthropic API usage in dashboard
- Track Vercel function execution time
- Monitor Snowflake query performance

---

## 🔄 Local Development

For local development, credentials are loaded in this order:
1. **Environment variables** (if set)
2. **`snowcred.env` file** (local development)
3. **Graceful degradation** (disable services if missing)

This ensures seamless development while maintaining production security.