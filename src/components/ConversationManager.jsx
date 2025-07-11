import React, { useState, useEffect } from 'react';
import ConversationContainer from './ConversationContainer.jsx';
import aiAnalysisService from '../services/aiAnalysisService.js';
import './ConversationManager.css';

const ConversationManager = ({ 
  initialData, 
  cachedDataset, 
  sessionId,
  datasetInfo,
  selectedFilters
}) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with first conversation if we have data
  useEffect(() => {
    if ((initialData || cachedDataset) && conversations.length === 0) {
      createNewConversation();
    }
  }, [initialData, cachedDataset]);

  // No longer needed - suggested questions are handled per conversation

  const createNewConversation = () => {
    const newConversation = {
      id: Date.now(),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messageCount: 0
    };
    
    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  const closeConversation = (conversationId) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    // If we closed the active conversation, switch to another one
    if (activeConversationId === conversationId) {
      const remainingConversations = conversations.filter(c => c.id !== conversationId);
      if (remainingConversations.length > 0) {
        setActiveConversationId(remainingConversations[0].id);
      } else {
        setActiveConversationId(null);
      }
    }
  };

  // No longer needed - suggested questions are handled within each conversation

  const getDataToAnalyze = () => {
    return cachedDataset || initialData;
  };

  const hasData = () => {
    const data = getDataToAnalyze();
    return data && data.length > 0;
  };

  if (!hasData()) {
    return (
      <div className="conversation-manager">
        <div className="no-data-message">
          <h3>No Data Available</h3>
          <p>Please load a dataset first to start analyzing your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-manager">
      <div className="conversations-container">
        {conversations.length === 0 ? (
          <div className="empty-state">
            <h3>Start Your First Conversation</h3>
            <p>Click "New Conversation" to begin analyzing your data.</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationContainer
              key={conversation.id}
              conversationId={conversation.id}
              initialData={initialData}
              cachedDataset={cachedDataset}
              sessionId={sessionId}
              aiAnalysisService={aiAnalysisService}
              onClose={closeConversation}
              isActive={activeConversationId === conversation.id}
              onActivate={setActiveConversationId}
            />
          ))
        )}
      </div>

      <div className="new-conversation-section">
        <button 
          className="new-conversation-btn"
          onClick={createNewConversation}
          disabled={isLoading}
        >
          ➕ New Conversation
        </button>
      </div>

    </div>
  );
};

export default ConversationManager;