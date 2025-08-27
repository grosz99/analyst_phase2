import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set:');
  console.error('VITE_SUPABASE_URL');
  console.error('VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database schema helper functions
export const createTablesIfNotExists = async () => {
  try {
    // Analysis sessions table
    const { error: sessionsError } = await supabase.rpc('create_analysis_sessions_table');
    if (sessionsError && !sessionsError.message.includes('already exists')) {
      console.error('Error creating sessions table:', sessionsError);
    }

    // Conversations table
    const { error: conversationsError } = await supabase.rpc('create_conversations_table');
    if (conversationsError && !conversationsError.message.includes('already exists')) {
      console.error('Error creating conversations table:', conversationsError);
    }

    // Messages table
    const { error: messagesError } = await supabase.rpc('create_messages_table');
    if (messagesError && !messagesError.message.includes('already exists')) {
      console.error('Error creating messages table:', messagesError);
    }

    // Saved queries table
    const { error: queriesError } = await supabase.rpc('create_saved_queries_table');
    if (queriesError && !queriesError.message.includes('already exists')) {
      console.error('Error creating queries table:', queriesError);
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
  }
};

export default supabase;