import { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService.js';

/**
 * React hook for Supabase integration and real-time updates
 * Provides conversation management, session handling, and real-time features
 */
export const useSupabase = (sessionId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Supabase connection and load data
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        setLoading(true);
        
        // Check health and initialize database
        const health = await supabaseService.healthCheck();
        if (health.healthy) {
          setIsConnected(true);
          
          // Initialize database tables if needed
          await supabaseService.initializeDatabase();
          
          // Load existing conversations for session
          if (sessionId) {
            const existingConversations = await supabaseService.getConversations(sessionId);
            setConversations(existingConversations);
            
            // Load messages for the first conversation if exists
            if (existingConversations.length > 0) {
              const firstConversation = existingConversations[0];
              setActiveConversation(firstConversation);
              const conversationMessages = await supabaseService.getMessages(firstConversation.conversation_id);
              setMessages(conversationMessages);
            }
          }
        } else {
          setError('Failed to connect to Supabase');
        }
      } catch (err) {
        console.error('Supabase initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeSupabase();
  }, [sessionId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    // Subscribe to conversation updates
    const conversationSubscription = supabaseService.subscribeToConversationUpdates(
      sessionId,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setConversations(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev => 
            prev.map(conv => 
              conv.conversation_id === payload.new.conversation_id ? payload.new : conv
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setConversations(prev => 
            prev.filter(conv => conv.conversation_id !== payload.old.conversation_id)
          );
        }
      }
    );

    // Subscribe to messages for active conversation
    let messageSubscription = null;
    if (activeConversation) {
      messageSubscription = supabaseService.subscribeToConversationMessages(
        activeConversation.conversation_id,
        (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
        }
      );
    }

    return () => {
      if (conversationSubscription) {
        supabaseService.unsubscribe(`conversations:${sessionId}`);
      }
      if (messageSubscription && activeConversation) {
        supabaseService.unsubscribe(`messages:${activeConversation.conversation_id}`);
      }
    };
  }, [isConnected, sessionId, activeConversation]);

  // Conversation management functions
  const createNewConversation = async (title = 'New Conversation', metadata = {}) => {
    try {
      const conversationData = {
        conversationId: `conv-${Date.now()}`,
        sessionId,
        userId: 'anonymous', // Replace with actual user ID when auth is implemented
        title,
        metadata
      };

      const newConversation = await supabaseService.createConversation(conversationData);
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setMessages([]);
      
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.message);
      return null;
    }
  };

  const switchToConversation = async (conversationId) => {
    try {
      const conversation = conversations.find(c => c.conversation_id === conversationId);
      if (!conversation) return;

      setActiveConversation(conversation);
      
      // Load messages for this conversation
      const conversationMessages = await supabaseService.getMessages(conversationId);
      setMessages(conversationMessages);
    } catch (err) {
      console.error('Error switching conversation:', err);
      setError(err.message);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      await supabaseService.deleteConversation(conversationId);
      
      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      
      // If we deleted the active conversation, switch to another one
      if (activeConversation?.conversation_id === conversationId) {
        const remainingConversations = conversations.filter(c => c.conversation_id !== conversationId);
        if (remainingConversations.length > 0) {
          await switchToConversation(remainingConversations[0].conversation_id);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err.message);
    }
  };

  const updateConversationTitle = async (conversationId, newTitle) => {
    try {
      const updatedConversation = await supabaseService.updateConversationTitle(conversationId, newTitle);
      
      setConversations(prev => 
        prev.map(conv => 
          conv.conversation_id === conversationId ? updatedConversation : conv
        )
      );

      if (activeConversation?.conversation_id === conversationId) {
        setActiveConversation(updatedConversation);
      }
    } catch (err) {
      console.error('Error updating conversation title:', err);
      setError(err.message);
    }
  };

  // Message management functions
  const addMessage = async (messageData) => {
    if (!activeConversation) return null;

    try {
      const fullMessageData = {
        messageId: `msg-${Date.now()}`,
        conversationId: activeConversation.conversation_id,
        ...messageData
      };

      const newMessage = await supabaseService.addMessage(fullMessageData);
      
      // Messages will be updated via real-time subscription
      // But add locally for immediate feedback
      setMessages(prev => [...prev, newMessage]);
      
      return newMessage;
    } catch (err) {
      console.error('Error adding message:', err);
      setError(err.message);
      return null;
    }
  };

  // Session management
  const createAnalysisSession = async (sessionData) => {
    try {
      const session = await supabaseService.createAnalysisSession(sessionData);
      return session;
    } catch (err) {
      console.error('Error creating analysis session:', err);
      setError(err.message);
      return null;
    }
  };

  // Saved queries management
  const saveQuery = async (queryData) => {
    try {
      const savedQuery = await supabaseService.saveQuery({
        userId: 'anonymous', // Replace with actual user ID
        ...queryData
      });
      return savedQuery;
    } catch (err) {
      console.error('Error saving query:', err);
      setError(err.message);
      return null;
    }
  };

  const getSavedQueries = async (tags = null) => {
    try {
      const queries = await supabaseService.getSavedQueries('anonymous', tags);
      return queries;
    } catch (err) {
      console.error('Error getting saved queries:', err);
      setError(err.message);
      return [];
    }
  };

  // Analytics
  const getAnalyticsData = async (timeRange = '7 days') => {
    try {
      const analytics = await supabaseService.getAnalyticsData('anonymous', timeRange);
      return analytics;
    } catch (err) {
      console.error('Error getting analytics:', err);
      setError(err.message);
      return null;
    }
  };

  return {
    // Connection state
    isConnected,
    loading,
    error,
    
    // Conversation state
    conversations,
    activeConversation,
    messages,
    
    // Conversation actions
    createNewConversation,
    switchToConversation,
    deleteConversation,
    updateConversationTitle,
    
    // Message actions
    addMessage,
    
    // Session actions
    createAnalysisSession,
    
    // Query management
    saveQuery,
    getSavedQueries,
    
    // Analytics
    getAnalyticsData,
    
    // Utility
    clearError: () => setError(null)
  };
};