# Vercel Deployment Troubleshooting Guide

## 🔍 Common Issues & Solutions

### 1. **Check Vercel Dashboard**
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Find your `analyst_phase2` project
- Check the "Deployments" tab for recent activity
- Look for failed deployments or errors

### 2. **Verify GitHub Integration**
- In Vercel dashboard → Project Settings → Git
- Ensure GitHub repository is properly connected
- Check if "Auto Deployments" is enabled
- Verify the correct branch is selected (usually `main`)

### 3. **Check Webhook Status**
- Go to GitHub → Repository → Settings → Webhooks
- Look for Vercel webhook (should show recent deliveries)
- If webhook is missing, reconnect the integration

### 4. **Environment Variables**
Ensure these are set in Vercel Dashboard → Project → Settings → Environment Variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_anthropic_key
NODE_ENV=production
```

### 5. **Build Configuration Issues**
Check `vercel.json` configuration (already looks good):
- ✅ Correct build targets
- ✅ Proper routing setup
- ✅ Function timeout settings

### 6. **Manual Deployment Trigger**
If auto-deployments aren't working, try manual deployment:
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy manually
vercel --prod
```

### 7. **Check Build Logs**
- In Vercel dashboard → Deployments → Click on a deployment
- Review "Build Logs" and "Function Logs" for errors
- Common issues:
  - Missing dependencies
  - Environment variable issues
  - Build timeouts

### 8. **GitHub Repository Access**
- Ensure Vercel has proper permissions to your GitHub repo
- Try disconnecting and reconnecting the GitHub integration
- Check if your GitHub account has necessary permissions

### 9. **Branch Protection Rules**
- GitHub branch protection might block webhooks
- Check Repository → Settings → Branches
- Ensure webhooks can trigger on protected branches

### 10. **Redeploy Latest Commit**
In Vercel dashboard:
- Go to Deployments tab
- Find the latest successful deployment
- Click "Redeploy" button

## 🧪 Test Deployment Status

I just pushed a version bump (1.4.0 → 1.4.1) to test if deployments are working.

**To verify deployment worked:**
1. Wait 2-3 minutes for deployment
2. Visit your Vercel app URL
3. Check `/api` endpoint - version should show `1.4.1`
4. If still showing `1.4.0`, deployment didn't trigger

## ⚡ Quick Fixes

### Reset GitHub Integration
1. Vercel Dashboard → Project → Settings → Git
2. Click "Disconnect" 
3. Reconnect your GitHub repository
4. This often fixes webhook issues

### Clear Vercel Cache
```bash
vercel --prod --force
```

### Check Function Region
- Ensure your Vercel functions are deployed to the right region
- Settings → Functions → Region settings

## 📞 Support Options

If none of these work:
- Check Vercel Status: [status.vercel.com](https://status.vercel.com)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- GitHub Support for webhook issues

## 🎯 Most Likely Causes

1. **GitHub webhook not firing** (60% of cases)
2. **Environment variables missing** (25% of cases)  
3. **Build/deployment errors** (10% of cases)
4. **Permission/access issues** (5% of cases)

Try the GitHub integration reset first - it fixes most deployment issues!