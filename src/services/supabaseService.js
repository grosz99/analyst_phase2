import { supabase } from '../config/supabase.js';

/**
 * Enhanced Supabase Service for Real-time Data Management
 * Handles conversations, analysis results, user sessions, and real-time updates
 */
class SupabaseService {
  constructor() {
    this.subscriptions = new Map();
  }

  // ============ ANALYSIS SESSIONS ============
  
  async createAnalysisSession(sessionData) {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .insert([{
          session_id: sessionData.sessionId || `session-${Date.now()}`,
          user_id: sessionData.userId || 'anonymous',
          dataset_source: sessionData.dataSource,
          dataset_info: sessionData.datasetInfo,
          created_at: new Date().toISOString(),
          metadata: sessionData.metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Analysis session created:', data.session_id);
      return data;
    } catch (error) {
      console.error('❌ Error creating analysis session:', error);
      throw error;
    }
  }

  async getAnalysisSession(sessionId) {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error getting analysis session:', error);
      return null;
    }
  }

  async updateAnalysisSession(sessionId, updates) {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating analysis session:', error);
      throw error;
    }
  }

  // ============ CONVERSATIONS ============

  async createConversation(conversationData) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          conversation_id: conversationData.conversationId || `conv-${Date.now()}`,
          session_id: conversationData.sessionId,
          user_id: conversationData.userId || 'anonymous',
          title: conversationData.title || 'New Conversation',
          created_at: new Date().toISOString(),
          metadata: conversationData.metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Conversation created:', data.conversation_id);
      return data;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw error;
    }
  }

  async getConversations(sessionId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      return [];
    }
  }

  async updateConversationTitle(conversationId, title) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({ 
          title: title,
          updated_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating conversation title:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      // Delete messages first (cascade)
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) throw error;
      console.log('✅ Conversation deleted:', conversationId);
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      throw error;
    }
  }

  // ============ MESSAGES ============

  async addMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          message_id: messageData.messageId || `msg-${Date.now()}`,
          conversation_id: messageData.conversationId,
          type: messageData.type, // 'user', 'assistant', 'error', 'system'
          content: messageData.content,
          analysis_result: messageData.analysisResult || null,
          metadata: messageData.metadata || {},
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Message added:', data.message_id);
      return data;
    } catch (error) {
      console.error('❌ Error adding message:', error);
      throw error;
    }
  }

  async getMessages(conversationId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  async updateMessage(messageId, updates) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating message:', error);
      throw error;
    }
  }

  // ============ SAVED QUERIES ============

  async saveQuery(queryData) {
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert([{
          query_id: queryData.queryId || `query-${Date.now()}`,
          user_id: queryData.userId || 'anonymous',
          title: queryData.title,
          question: queryData.question,
          data_source: queryData.dataSource,
          analysis_result: queryData.analysisResult,
          python_code: queryData.pythonCode,
          tags: queryData.tags || [],
          created_at: new Date().toISOString(),
          metadata: queryData.metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Query saved:', data.query_id);
      return data;
    } catch (error) {
      console.error('❌ Error saving query:', error);
      throw error;
    }
  }

  async getSavedQueries(userId = 'anonymous', tags = null) {
    try {
      let query = supabase
        .from('saved_queries')
        .select('*')
        .eq('user_id', userId);

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting saved queries:', error);
      return [];
    }
  }

  async deleteSavedQuery(queryId) {
    try {
      const { error } = await supabase
        .from('saved_queries')
        .delete()
        .eq('query_id', queryId);

      if (error) throw error;
      console.log('✅ Saved query deleted:', queryId);
    } catch (error) {
      console.error('❌ Error deleting saved query:', error);
      throw error;
    }
  }

  // ============ REAL-TIME SUBSCRIPTIONS ============

  subscribeToConversationMessages(conversationId, callback) {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload.new);
          callback(payload.new);
        }
      )
      .subscribe();

    this.subscriptions.set(`messages:${conversationId}`, subscription);
    console.log('🔔 Subscribed to conversation messages:', conversationId);
    return subscription;
  }

  subscribeToConversationUpdates(sessionId, callback) {
    const subscription = supabase
      .channel(`conversations:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📝 Conversation updated:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(`conversations:${sessionId}`, subscription);
    console.log('🔔 Subscribed to conversation updates:', sessionId);
    return subscription;
  }

  unsubscribe(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(subscriptionKey);
      console.log('🔕 Unsubscribed from:', subscriptionKey);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach((subscription, key) => {
      supabase.removeChannel(subscription);
      console.log('🔕 Unsubscribed from:', key);
    });
    this.subscriptions.clear();
  }

  // ============ ANALYTICS & INSIGHTS ============

  async getAnalyticsData(userId = 'anonymous', timeRange = '7 days') {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversations?.map(c => c.conversation_id) || []);

      if (sessionsError || conversationsError || messagesError) {
        throw new Error('Failed to fetch analytics data');
      }

      return {
        totalSessions: sessions?.length || 0,
        totalConversations: conversations?.length || 0,
        totalMessages: messages?.length || 0,
        sessionsThisWeek: sessions || [],
        conversationsThisWeek: conversations || [],
        averageMessagesPerConversation: conversations?.length > 0 
          ? (messages?.length || 0) / conversations.length 
          : 0
      };
    } catch (error) {
      console.error('❌ Error getting analytics data:', error);
      return {
        totalSessions: 0,
        totalConversations: 0,
        totalMessages: 0,
        sessionsThisWeek: [],
        conversationsThisWeek: [],
        averageMessagesPerConversation: 0
      };
    }
  }

  // ============ UTILITY FUNCTIONS ============

  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('session_id')
        .limit(1);

      return {
        healthy: !error,
        connected: true,
        timestamp: new Date().toISOString(),
        error: error?.message || null
      };
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async initializeDatabase() {
    try {
      // Create tables with proper schema
      const createTablesSQL = `
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
      `;

      const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
      
      if (error) {
        console.warn('⚠️ Could not create tables via RPC, tables may already exist:', error.message);
      } else {
        console.log('✅ Database schema initialized successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      return false;
    }
  }
}

// Export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;