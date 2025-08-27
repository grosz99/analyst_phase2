# 🚀 Migration Guide: OpenAI GPT-4.1 + Enhanced Supabase Integration

This guide covers the complete migration from Anthropic Claude to OpenAI GPT-4.1 as the primary AI backend, plus enhanced Supabase integration for real-time features.

## 📋 Prerequisites

1. **OpenAI Account** with GPT-4.1 access
   - Sign up at https://platform.openai.com
   - Get API key from https://platform.openai.com/api-keys
   - Ensure you have credits/billing set up

2. **Supabase Project**
   - Sign up at https://app.supabase.com
   - Create a new project
   - Get project URL and API keys

## 🔧 Step 1: Environment Configuration

### Backend (.env in /api directory)
```bash
# Required for OpenAI GPT-4.1
OPENAI_API_KEY=your_openai_api_key_here

# Required for Supabase backend
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required for session security
SESSION_SECRET=your_secure_random_string

# Optional: Keep Anthropic for dual backend support
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Snowflake integration
SNOWFLAKE_ACCOUNT=your_account.snowflakecomputing.com
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_ROLE=your_role
```

### Frontend (.env in root directory)
```bash
# API Configuration
VITE_API_URL=http://localhost:3001

# Required for Supabase frontend
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional development flags
VITE_DEBUG_MODE=true
```

## 🏗️ Step 2: Supabase Database Setup

### Option A: Auto Setup (Recommended)
The app will automatically create the required tables on first run. No manual setup needed.

### Option B: Manual Setup (Advanced)
If you prefer manual control, run these SQL commands in your Supabase SQL editor:

```sql
-- Analysis Sessions Table
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  dataset_source TEXT,
  dataset_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversations Table  
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('user', 'assistant', 'error', 'system')),
  content TEXT,
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Saved Queries Table
CREATE TABLE IF NOT EXISTS saved_queries (
  id BIGSERIAL PRIMARY KEY,
  query_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  data_source TEXT,
  analysis_result JSONB,
  python_code TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_tags ON saved_queries USING GIN(tags);
```

## 🔄 Step 3: Migration Process

### 3.1 Install New Dependencies
```bash
# Backend
cd api
npm install openai

# Frontend  
cd ..
npm install @supabase/supabase-js
```

### 3.2 Backend Changes
✅ **Already Complete**: 
- OpenAI GPT-4.1 service created at `/api/services/openai/openaiService.js`
- API routes updated to support dual backends (OpenAI + Anthropic)
- Default backend changed to OpenAI GPT-4.1

### 3.3 Frontend Changes
✅ **Already Complete**:
- Supabase client configuration at `/src/config/supabase.js`
- Enhanced Supabase service at `/src/services/supabaseService.js`
- React hook for Supabase integration at `/src/hooks/useSupabase.js`
- Frontend services updated to use OpenAI backend by default

## 🚀 Step 4: Testing the Migration

### 4.1 Start the Services
```bash
# Terminal 1: Backend
cd api
npm run dev

# Terminal 2: Frontend
cd ..
npm run dev
```

### 4.2 Test Health Endpoints
```bash
# Check AI backend status
curl http://localhost:3001/api/ai/health

# Expected response:
{
  "success": true,
  "backends": {
    "anthropic": { "healthy": true/false },
    "openai": { "healthy": true, "model": "gpt-4.1-2025-04-14" }
  }
}

# Check available backends
curl http://localhost:3001/api/ai/backends

# Expected: Should list OpenAI as default backend
```

### 4.3 Test Analysis Flow
1. Load a dataset in the frontend
2. Ask a question (should now use GPT-4.1)
3. Verify the response includes `"model": "gpt-4.1-2025-04-14"` in metadata
4. Check that conversations are saved to Supabase

## 💡 Step 5: Key Changes and Features

### New OpenAI GPT-4.1 Features
- **Enhanced Reasoning**: 8-point improvement in coding tasks
- **Function Calling**: Better tool usage and structured outputs
- **Larger Context**: Up to 1M token context window
- **Cost Effective**: 26% less expensive than GPT-4o
- **Better Instruction Following**: 87.4% vs 81.0% for GPT-4o

### Enhanced Supabase Integration
- **Real-time Updates**: Live conversation and message updates
- **Session Management**: Persistent analysis sessions
- **Saved Queries**: Store and reuse successful analyses
- **Analytics Dashboard**: Usage metrics and insights
- **Multi-conversation Support**: Multiple parallel conversations per session

### Backward Compatibility
- Anthropic backend still available (set `backend: 'anthropic'` in API calls)
- Existing analysis flows unchanged
- All previous functionality preserved

## 🔍 Step 6: Verification Checklist

### ✅ Backend Health
- [ ] OpenAI API key configured and working
- [ ] Supabase connection established  
- [ ] Database tables created automatically
- [ ] `/api/ai/health` returns healthy for OpenAI
- [ ] `/api/ai/backends` shows OpenAI as default

### ✅ Frontend Integration
- [ ] Supabase client connects successfully
- [ ] New conversations created and saved
- [ ] Messages persist across page reloads
- [ ] Real-time updates working
- [ ] Analysis results use GPT-4.1

### ✅ Analysis Quality
- [ ] GPT-4.1 provides better reasoning
- [ ] Function calling generates better code
- [ ] Analysis results are more accurate
- [ ] Processing time acceptable
- [ ] Cost tracking available in metadata

## 🚨 Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Verify `OPENAI_API_KEY` is set in `/api/.env`
- Restart the backend server
- Check API key has sufficient credits

**"Supabase connection failed"** 
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `/api/.env`
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in root `.env`
- Ensure Supabase project is active

**"Function calls failing"**
- Check OpenAI account has GPT-4.1 access
- Verify billing is set up
- Try with simpler analysis first

**"Database tables not created"**
- Check Supabase service role key permissions
- Run SQL commands manually from Step 2
- Verify database connection in Supabase dashboard

### Performance Tips

**Cost Optimization**
- GPT-4.1 is 26% cheaper than GPT-4o
- Use prompt caching for repeated content (75% discount)
- Consider GPT-4.1-mini for simpler analyses

**Speed Optimization** 
- Use GPT-4.1-nano for fastest responses
- Implement request queuing and batching
- Cache common analysis patterns

## 📊 Expected Improvements

### Analysis Quality
- **Reasoning**: 8-point improvement in complex logical tasks
- **Code Generation**: Better pandas/data manipulation code
- **Instruction Following**: More accurate analysis results
- **Context Understanding**: Better handling of large datasets

### User Experience  
- **Real-time Updates**: See conversations update live
- **Persistence**: All conversations saved automatically
- **Multi-conversation**: Work on multiple analyses simultaneously
- **Query Library**: Reuse successful analysis patterns

### Performance
- **Cost**: 26% reduction in analysis costs
- **Speed**: Better request handling and queuing
- **Reliability**: Dual backend support with fallback
- **Scalability**: Database-backed session management

## 🎯 Success Metrics

After migration, you should see:

1. **API Responses** include `"model": "gpt-4.1-2025-04-14"`
2. **Better Analysis Quality** with more accurate insights
3. **Persistent Conversations** that survive page reloads  
4. **Real-time Updates** when multiple users collaborate
5. **Lower Costs** compared to previous GPT-4o usage
6. **Improved Reliability** with dual backend support

## 🔄 Rollback Plan

If issues arise, you can rollback by:

1. **Change Default Backend** in `/api/index.js`:
   ```javascript
   const selectedBackend = backend || 'anthropic'; // Change from 'openai'
   ```

2. **Update Frontend Service** in `/src/services/streamingAnalysisService.js`:
   ```javascript
   backend: 'anthropic', // Change from 'openai'
   ```

3. **Restart Services** and verify Anthropic backend works

The migration maintains full backward compatibility, so rollback is seamless.

---

## 📞 Support

- **OpenAI Issues**: Check https://platform.openai.com/docs
- **Supabase Issues**: Check https://supabase.com/docs  
- **Application Issues**: Check the health endpoints first

Migration complete! 🎉 Your app now runs on GPT-4.1 with enhanced Supabase integration.