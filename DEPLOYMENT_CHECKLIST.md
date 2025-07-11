# Vercel Deployment Checklist

## Pre-Deployment Steps

1. **Verify Build Configuration**
   - ✅ Updated `vercel.json` with correct build settings
   - ✅ Added `vercel-build` script to package.json
   - ✅ Vite configured to output to `dist` directory

2. **UI Updates Applied**
   - ✅ Updated color scheme to Beacon green (#187955)
   - ✅ Added BCG logo to header
   - ✅ Updated fonts to Segoe UI
   - ✅ Applied Material Design patterns from Beacon

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update UI to match Beacon styling"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import the GitHub repository
   - Select the analyst_phase2 directory

3. **Configure Environment Variables in Vercel Dashboard**
   
   Required variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   SNOWFLAKE_ACCOUNT=your-account
   SNOWFLAKE_USERNAME=your-username
   SNOWFLAKE_PASSWORD=your-password
   SNOWFLAKE_DATABASE=SUPERSTOREDB
   SNOWFLAKE_SCHEMA=DATA
   SNOWFLAKE_WAREHOUSE=your-warehouse
   SNOWFLAKE_ROLE=your-role
   ```

4. **Deploy**
   - Click "Deploy" in Vercel
   - Wait for build to complete

## Post-Deployment Verification

- [ ] Check `/api/health` endpoint
- [ ] Verify BCG logo appears in header
- [ ] Confirm green color scheme is applied
- [ ] Test data source discovery functionality
- [ ] Verify API connections work

## Troubleshooting

If you get a 400 Bad Request error:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY`
3. Redeploy the application

If build fails:
1. Check Vercel build logs
2. Ensure all dependencies are in package.json
3. Verify node version compatibility (>=18.0.0)