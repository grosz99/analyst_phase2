import React, { useState, useEffect } from 'react';
import ConversationContainer from './ConversationContainer.jsx';
import aiAnalysisService from '../services/aiAnalysisService.js';
import './ConversationManager.css';

const ConversationManager = ({ 
  initialData, 
  cachedDataset, 
  sessionId,
  datasetInfo,
  selectedFilters,
  selectedDataSource,
  onReset
}) => {
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with single conversation if we have data
  useEffect(() => {
    if ((initialData || cachedDataset) && !conversation) {
      createConversation();
    }
  }, [initialData, cachedDataset]);

  const createConversation = () => {
    const newConversation = {
      id: Date.now(),
      title: 'Analysis Conversation',
      createdAt: new Date().toISOString(),
      messageCount: 0
    };
    
    setConversation(newConversation);
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
        {!conversation ? (
          <div className="empty-state">
            <h3>Loading Conversation...</h3>
            <p>Preparing your analysis workspace.</p>
          </div>
        ) : (
          <ConversationContainer
            key={conversation.id}
            conversationId={conversation.id}
            initialData={initialData}
            cachedDataset={cachedDataset}
            sessionId={sessionId}
            aiAnalysisService={aiAnalysisService}
            onClose={() => {}} // Remove close functionality for single conversation
            isActive={true} // Always active since it's the only one
            onActivate={() => {}} // No need to activate
            selectedDataSource={selectedDataSource}
            showCloseButton={false} // Hide close button
          />
        )}
      </div>

      <div className="new-conversation-section">
        <button 
          className="new-conversation-btn"
          onClick={onReset}
          disabled={isLoading}
        >
          🔄 Reset & Ask Question On Another Source
        </button>
      </div>

    </div>
  );
};

export default ConversationManager;