import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Database, CheckCircle } from 'lucide-react';
import './DataSourceChatAgent.css';

const DataSourceChatAgent = ({ 
  mockDataSources, 
  selectedDataSource, 
  setSelectedDataSource, 
  availableFields, 
  isLoadingDataSources = false 
}) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I can help you find the right data source. What kind of data are you looking for? You can describe it in natural language, like 'customer purchase history' or 'sales performance data'.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedSources, setSuggestedSources] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus on input after processing
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const findMatchingDataSources = (query) => {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    // Score each data source based on keyword matches
    const scoredSources = mockDataSources.map(source => {
      const sourceLower = source.toLowerCase();
      let score = 0;
      
      // Exact match gets highest score
      if (sourceLower === queryLower) {
        score += 100;
      }
      
      // Check for keyword matches
      keywords.forEach(keyword => {
        if (sourceLower.includes(keyword)) {
          score += 10;
        }
      });
      
      // Special keyword matching
      if (queryLower.includes('customer') && sourceLower.includes('customer')) score += 20;
      if (queryLower.includes('sale') && sourceLower.includes('sale')) score += 20;
      if (queryLower.includes('product') && sourceLower.includes('product')) score += 20;
      if (queryLower.includes('order') && (sourceLower.includes('order') || sourceLower.includes('sale'))) score += 15;
      if (queryLower.includes('revenue') && sourceLower.includes('sale')) score += 15;
      if (queryLower.includes('purchase') && (sourceLower.includes('sale') || sourceLower.includes('order'))) score += 15;
      
      return { source, score };
    });
    
    // Return sources with score > 0, sorted by score
    return scoredSources
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.source);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      const matchingSources = findMatchingDataSources(inputValue);
      
      let botResponse;
      if (matchingSources.length === 0) {
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: "I couldn't find any data sources matching your description. Here are all available sources:",
          timestamp: new Date(),
          sources: mockDataSources
        };
      } else if (matchingSources.length === 1) {
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `I found a perfect match: "${matchingSources[0]}". Would you like to use this data source?`,
          timestamp: new Date(),
          sources: matchingSources,
          autoSelect: true
        };
      } else {
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `I found ${matchingSources.length} data sources that might match what you're looking for:`,
          timestamp: new Date(),
          sources: matchingSources
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setSuggestedSources(matchingSources);
      setIsProcessing(false);
    }, 800);
  };

  const handleSelectDataSource = (source) => {
    setSelectedDataSource(source);
    
    const confirmMessage = {
      id: Date.now(),
      type: 'bot',
      content: `Great! I've selected "${source}" for you. The available fields are shown on the right. You can ask me to find a different data source anytime.`,
      timestamp: new Date(),
      confirmed: true
    };
    
    setMessages(prev => [...prev, confirmMessage]);
    setSuggestedSources([]);
  };

  const getFieldSummary = () => {
    if (!availableFields || availableFields.length === 0) return null;
    
    const fieldTypes = availableFields.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(fieldTypes).map(([type, count]) => 
      `${count} ${type.toLowerCase()} field${count > 1 ? 's' : ''}`
    ).join(', ');
  };

  return (
    <div className="data-source-chat-container">
      {/* Left Panel - Chat Interface */}
      <div className="chat-panel">
        <div className="chat-header">
          <MessageCircle size={20} />
          <h3>Data Source Assistant</h3>
        </div>
        
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.content}
              </div>
              
              {message.sources && message.sources.length > 0 && (
                <div className="source-suggestions">
                  {message.sources.map((source) => (
                    <button
                      key={source}
                      className={`source-button ${selectedDataSource === source ? 'selected' : ''}`}
                      onClick={() => handleSelectDataSource(source)}
                    >
                      <Database size={16} />
                      <span>{source}</span>
                      {selectedDataSource === source && <CheckCircle size={16} />}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="message bot">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSendMessage} className="chat-input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe the data you're looking for..."
            disabled={isProcessing || isLoadingDataSources}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isProcessing || isLoadingDataSources}
            className="send-button"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Right Panel - Available Fields */}
      <div className="fields-preview-panel">
        <div className="fields-header">
          <h3>Available Fields</h3>
          {selectedDataSource && (
            <div className="selected-source-badge">
              <Database size={16} />
              <span>{selectedDataSource}</span>
            </div>
          )}
        </div>
        
        {selectedDataSource ? (
          <>
            <div className="fields-summary">
              {getFieldSummary() || 'Loading fields...'}
            </div>
            
            <div className="fields-grid">
              {availableFields.map((field) => (
                <div key={field.name} className="field-card">
                  <div className="field-name">{field.name}</div>
                  <div className="field-type">{field.type}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-source-selected">
            <Database size={48} className="empty-icon" />
            <p>Select a data source to see available fields</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourceChatAgent;