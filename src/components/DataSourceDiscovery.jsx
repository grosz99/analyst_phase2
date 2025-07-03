import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Database, CheckCircle, Search, List } from 'lucide-react';
import './DataSourceDiscovery.css';

// Semantic model information - in production this would come from the API
const SEMANTIC_MODEL = {
  tables: {
    'Sales Data': {
      description: 'Comprehensive sales data including orders, customers, products, and financial metrics',
      keywords: ['sales', 'revenue', 'orders', 'purchase', 'transaction', 'money', 'financial'],
      dimensions: ['customer', 'product', 'category', 'region', 'segment', 'date', 'location'],
      metrics: ['sales', 'profit', 'quantity', 'discount', 'margin'],
      questions: [
        'sales performance',
        'revenue analysis',
        'order analysis',
        'purchase history',
        'transaction data'
      ]
    },
    'Customer Data': {
      description: 'Customer information including demographics, segments, and location data',
      keywords: ['customer', 'client', 'buyer', 'consumer', 'demographics', 'segment'],
      dimensions: ['customer_name', 'customer_id', 'segment', 'location', 'city', 'state'],
      metrics: ['customer_count', 'unique_customers'],
      questions: [
        'customer analysis',
        'customer segments',
        'buyer behavior',
        'client information'
      ]
    },
    'Product Data': {
      description: 'Product catalog with categories, sub-categories, and product details',
      keywords: ['product', 'item', 'category', 'inventory', 'catalog', 'merchandise'],
      dimensions: ['product_name', 'product_id', 'category', 'sub_category'],
      metrics: ['product_count', 'categories'],
      questions: [
        'product performance',
        'category analysis',
        'inventory analysis',
        'product catalog'
      ]
    }
  }
};

const DataSourceDiscovery = ({ 
  mockDataSources, 
  selectedDataSource, 
  setSelectedDataSource, 
  availableFields, 
  isLoadingDataSources = false 
}) => {
  const [selectedMode, setSelectedMode] = useState('agent'); // 'agent' or 'list'
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! Tell me what you're trying to analyze and I'll help you find the right data source. For example: 'I want to analyze customer purchase patterns' or 'Show me sales performance by region'.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isProcessing && selectedMode === 'agent') {
      inputRef.current?.focus();
    }
  }, [isProcessing, selectedMode]);

  // Enhanced matching using semantic model
  const findMatchingDataSources = (query) => {
    const queryLower = query.toLowerCase();
    const scoredSources = [];

    // Check each data source against the semantic model
    mockDataSources.forEach(source => {
      let score = 0;
      const semanticInfo = SEMANTIC_MODEL.tables[source];
      
      if (!semanticInfo) {
        // Fallback for sources not in semantic model
        if (source.toLowerCase().includes(queryLower)) {
          score += 5;
        }
      } else {
        // Check keywords
        semanticInfo.keywords.forEach(keyword => {
          if (queryLower.includes(keyword)) {
            score += 20;
          }
        });

        // Check dimensions
        semanticInfo.dimensions.forEach(dimension => {
          if (queryLower.includes(dimension)) {
            score += 15;
          }
        });

        // Check metrics
        semanticInfo.metrics.forEach(metric => {
          if (queryLower.includes(metric)) {
            score += 15;
          }
        });

        // Check common questions
        semanticInfo.questions.forEach(question => {
          if (queryLower.includes(question) || question.includes(queryLower)) {
            score += 25;
          }
        });

        // Special cases for common analysis patterns
        if (queryLower.includes('profit') && source === 'Sales Data') score += 30;
        if (queryLower.includes('segment') && source === 'Customer Data') score += 25;
        if (queryLower.includes('category') && source === 'Product Data') score += 25;
        if (queryLower.includes('region') && source === 'Sales Data') score += 20;
        if (queryLower.includes('performance') && source === 'Sales Data') score += 20;
      }

      if (score > 0) {
        scoredSources.push({ source, score, semanticInfo });
      }
    });

    // Sort by score and return
    return scoredSources
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        name: item.source,
        description: item.semanticInfo?.description || `${item.source} from Snowflake`,
        confidence: item.score > 50 ? 'high' : item.score > 25 ? 'medium' : 'low'
      }));
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
          content: "I couldn't find any data sources that directly match your query. Here are all available data sources:",
          timestamp: new Date(),
          sources: mockDataSources.map(source => ({
            name: source,
            description: SEMANTIC_MODEL.tables[source]?.description || `${source} from Snowflake`,
            confidence: 'low'
          }))
        };
      } else if (matchingSources.length === 1 && matchingSources[0].confidence === 'high') {
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `Based on your query, I'm confident that "${matchingSources[0].name}" is the right data source for your analysis.`,
          timestamp: new Date(),
          sources: matchingSources,
          autoSelect: true
        };
      } else {
        const highConfidence = matchingSources.filter(s => s.confidence === 'high');
        const intro = highConfidence.length > 0 
          ? `I found ${matchingSources.length} data sources that match your query. Here are my recommendations:`
          : `Here are the data sources that might help with your analysis:`;
        
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: intro,
          timestamp: new Date(),
          sources: matchingSources
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsProcessing(false);

      // Auto-select if high confidence single match
      if (matchingSources.length === 1 && matchingSources[0].confidence === 'high') {
        handleSelectDataSource(matchingSources[0].name);
      }
    }, 800);
  };

  const handleSelectDataSource = (source) => {
    setSelectedDataSource(source);
    
    const semanticInfo = SEMANTIC_MODEL.tables[source];
    const fieldInfo = semanticInfo 
      ? `You'll have access to ${semanticInfo.dimensions.length} dimensions and ${semanticInfo.metrics.length} metrics for your analysis.`
      : 'The available fields are shown on the right.';
    
    const confirmMessage = {
      id: Date.now(),
      type: 'bot',
      content: `Great! I've selected "${source}" for you. ${fieldInfo} Feel free to ask me to find a different data source anytime.`,
      timestamp: new Date(),
      confirmed: true
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };

  const filteredDataSources = mockDataSources.filter(source =>
    source.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="data-source-discovery-container">
      {/* Left Panel - Selection Interface */}
      <div className="selection-panel">
        <div className="panel-header">
          <h3>Choose Data Source</h3>
        </div>
        
        {/* Radio buttons for mode selection */}
        <div className="mode-selector">
          <label className={`mode-option ${selectedMode === 'agent' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="agent"
              checked={selectedMode === 'agent'}
              onChange={(e) => setSelectedMode(e.target.value)}
            />
            <MessageCircle size={18} />
            <span>What are you trying to analyze/search?</span>
          </label>
          
          <label className={`mode-option ${selectedMode === 'list' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="list"
              checked={selectedMode === 'list'}
              onChange={(e) => setSelectedMode(e.target.value)}
            />
            <List size={18} />
            <span>Data sources available</span>
          </label>
        </div>

        {/* Content based on selected mode */}
        {selectedMode === 'agent' ? (
          <div className="agent-interface">
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
                          key={source.name}
                          className={`source-button ${selectedDataSource === source.name ? 'selected' : ''} ${source.confidence ? source.confidence : ''}`}
                          onClick={() => handleSelectDataSource(source.name)}
                        >
                          <Database size={16} />
                          <div className="source-info">
                            <span className="source-name">{source.name}</span>
                            {source.description && (
                              <span className="source-description">{source.description}</span>
                            )}
                          </div>
                          {selectedDataSource === source.name && <CheckCircle size={16} />}
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
                placeholder="Describe what you want to analyze..."
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
        ) : (
          <div className="list-interface">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search data sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingDataSources}
              />
            </div>
            
            <div className="data-sources-list">
              {isLoadingDataSources ? (
                <div className="loading-state">Loading data sources...</div>
              ) : filteredDataSources.length > 0 ? (
                filteredDataSources.map(source => {
                  const semanticInfo = SEMANTIC_MODEL.tables[source];
                  return (
                    <button
                      key={source}
                      className={`source-list-item ${selectedDataSource === source ? 'selected' : ''}`}
                      onClick={() => handleSelectDataSource(source)}
                    >
                      <Database size={20} />
                      <div className="source-details">
                        <div className="source-name">{source}</div>
                        {semanticInfo && (
                          <div className="source-meta">{semanticInfo.description}</div>
                        )}
                      </div>
                      {selectedDataSource === source && <CheckCircle size={20} />}
                    </button>
                  );
                })
              ) : (
                <div className="no-sources">No data sources found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Available Fields */}
      <div className="fields-preview-panel">
        <div className="fields-header">
          <h3>Data Fields</h3>
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

export default DataSourceDiscovery;