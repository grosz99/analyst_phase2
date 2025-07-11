import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Database, CheckCircle, Search, List } from 'lucide-react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import './DataSourceDiscovery.css';

// Semantic model information mapped to actual Snowflake tables
const SEMANTIC_MODEL = {
  tables: {
    'ORDERS': {
      description: 'Comprehensive sales and order data including transactions, revenue, and financial metrics',
      keywords: ['sales', 'revenue', 'orders', 'purchase', 'transaction', 'money', 'financial', 'profit', 'discount'],
      dimensions: ['order_id', 'order_date', 'ship_date', 'ship_mode', 'customer_id', 'product_id', 'region', 'country', 'city', 'state'],
      metrics: ['sales', 'profit', 'quantity', 'discount', 'revenue'],
      questions: [
        'sales performance',
        'revenue analysis',
        'order analysis',
        'purchase history',
        'transaction data',
        'profit margins',
        'regional performance'
      ],
      relatedConcepts: ['performance', 'trends', 'analysis', 'metrics', 'kpi']
    },
    'CUSTOMERS': {
      description: 'Customer master data including demographics, segments, tiers, and location information',
      keywords: ['customer', 'client', 'buyer', 'consumer', 'demographics', 'segment', 'tier', 'level', 'vip', 'loyalty'],
      dimensions: ['customer_id', 'customer_name', 'segment', 'city', 'state', 'postal_code', 'region'],
      metrics: ['customer_count', 'lifetime_value', 'average_order_value'],
      questions: [
        'customer analysis',
        'customer segments',
        'buyer behavior',
        'customer tiers',
        'customer levels',
        'vip customers',
        'customer demographics'
      ],
      relatedConcepts: ['segmentation', 'demographics', 'behavior', 'loyalty', 'retention']
    },
    'PRODUCTS': {
      description: 'Product catalog with categories, subcategories, pricing, and inventory details',
      keywords: ['product', 'item', 'category', 'inventory', 'catalog', 'merchandise', 'sku', 'price'],
      dimensions: ['product_id', 'product_name', 'category', 'sub_category', 'manufacturer'],
      metrics: ['product_count', 'price', 'cost', 'margin'],
      questions: [
        'product performance',
        'category analysis',
        'inventory analysis',
        'product catalog',
        'pricing analysis',
        'product profitability'
      ],
      relatedConcepts: ['catalog', 'inventory', 'pricing', 'categories', 'assortment']
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
  
  // Debug: Check if data sources are passed correctly
  console.log('DataSourceDiscovery received mockDataSources:', mockDataSources);
  
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

  // Helper function to determine analysis type
  const getAnalysisType = (query, tableName) => {
    const queryLower = query.toLowerCase();
    
    if (tableName === 'CUSTOMERS') {
      if (queryLower.includes('tier')) return 'customer tier analysis';
      if (queryLower.includes('segment')) return 'customer segmentation analysis';
      if (queryLower.includes('demographic')) return 'demographic analysis';
      return 'customer analysis';
    } else if (tableName === 'ORDERS') {
      if (queryLower.includes('performance')) return 'sales performance analysis';
      if (queryLower.includes('revenue')) return 'revenue analysis';
      if (queryLower.includes('trend')) return 'trend analysis';
      return 'order analysis';
    } else if (tableName === 'PRODUCTS') {
      if (queryLower.includes('category')) return 'category performance analysis';
      if (queryLower.includes('price')) return 'pricing analysis';
      return 'product analysis';
    }
    return 'data analysis';
  };

  // Helper function to create recommendation explanations
  const getRecommendationExplanation = (sources, query) => {
    return sources.map((source, index) => {
      const semanticInfo = SEMANTIC_MODEL.tables[source.name];
      let explanation = `${index + 1}. **${source.name}**`;
      
      if (source.confidence === 'high') {
        explanation += ' (Highly Recommended)';
      } else if (source.confidence === 'medium') {
        explanation += ' (Recommended)';
      }
      
      explanation += `\n   - ${semanticInfo?.description || 'Snowflake table'}`;
      
      // Add specific reasons why this table matches
      const queryLower = query.toLowerCase();
      const matchingFeatures = [];
      
      if (semanticInfo) {
        semanticInfo.keywords.forEach(keyword => {
          if (queryLower.includes(keyword)) {
            matchingFeatures.push(keyword);
          }
        });
        
        if (matchingFeatures.length > 0) {
          explanation += `\n   - Matches: ${matchingFeatures.join(', ')}`;
        }
      }
      
      return explanation;
    }).join('\n\n');
  };

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
        if (queryLower.includes('profit') && source === 'ORDERS') score += 30;
        if (queryLower.includes('segment') && source === 'CUSTOMERS') score += 25;
        if (queryLower.includes('category') && source === 'PRODUCTS') score += 25;
        if (queryLower.includes('region') && source === 'ORDERS') score += 20;
        if (queryLower.includes('performance') && source === 'ORDERS') score += 20;
        if ((queryLower.includes('tier') || queryLower.includes('level')) && source === 'CUSTOMERS') score += 40;
        if (queryLower.includes('customer') && source === 'CUSTOMERS') score += 35;
        if (queryLower.includes('customer') && source === 'ORDERS') score += 15;
        if (queryLower.includes('vip') && source === 'CUSTOMERS') score += 35;
        if (queryLower.includes('loyalty') && source === 'CUSTOMERS') score += 30;
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
    const currentQuery = inputValue;
    setInputValue('');
    setIsProcessing(true);

    try {
      // Check if we have data sources
      if (!mockDataSources || mockDataSources.length === 0) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: "No data sources are currently available. Please check your connection or try again later.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botResponse]);
        setIsProcessing(false);
        return;
      }
      
      // Call Anthropic API for intelligent recommendation
      const aiRecommendation = await aiAnalysisService.getDataSourceRecommendation(
        currentQuery,
        mockDataSources,
        SEMANTIC_MODEL
      );
      
      let botResponse;
      let sources = [];
      
      // Process AI recommendation
      if (aiRecommendation.confidence === 'high') {
        // High confidence - auto-select and show strong recommendation
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `Based on your query about "${currentQuery}", I'm confident this is the right data source:`,
          recommendation: `**${aiRecommendation.recommendedSource}** (Highly Recommended)\n   - ${aiRecommendation.reasoning}\n   - Analysis type: ${aiRecommendation.analysisType}\n   - Key features: ${aiRecommendation.keyFeatures.join(', ')}`,
          timestamp: new Date(),
          sources: [{
            name: aiRecommendation.recommendedSource,
            description: SEMANTIC_MODEL.tables[aiRecommendation.recommendedSource]?.description || 'Recommended by AI',
            confidence: 'high'
          }]
        };
        
        // Auto-select the high confidence recommendation
        setTimeout(() => handleSelectDataSource(aiRecommendation.recommendedSource), 500);
      } else {
        // Medium/low confidence - show recommendation with alternatives
        sources = [
          {
            name: aiRecommendation.recommendedSource,
            description: SEMANTIC_MODEL.tables[aiRecommendation.recommendedSource]?.description || 'Primary recommendation',
            confidence: aiRecommendation.confidence
          },
          ...aiRecommendation.alternativeSources.map(source => ({
            name: source,
            description: SEMANTIC_MODEL.tables[source]?.description || `${source} from Snowflake`,
            confidence: 'medium'
          }))
        ];
        
        const confidenceText = aiRecommendation.confidence === 'medium' ? 'likely matches' : 'might help with';
        
        botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `Based on your query about "${currentQuery}", here are data sources that ${confidenceText} your analysis:`,
          recommendation: `**${aiRecommendation.recommendedSource}** (${aiRecommendation.confidence === 'medium' ? 'Recommended' : 'Suggested'})\n   - ${aiRecommendation.reasoning}\n   - Analysis type: ${aiRecommendation.analysisType}\n   - Key features: ${aiRecommendation.keyFeatures.join(', ')}`,
          timestamp: new Date(),
          sources: sources
        };
      }

      setMessages(prev => [...prev, botResponse]);
      
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      
      // Fallback to showing all available sources
      const allSources = mockDataSources.map(source => ({
        name: source,
        description: SEMANTIC_MODEL.tables[source]?.description || `${source} from Snowflake`,
        confidence: 'low'
      }));
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm having trouble analyzing your query right now. Here are all available data sources:",
        timestamp: new Date(),
        sources: allSources
      };
      
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsProcessing(false);
    }
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
                  
                  {message.recommendation && (
                    <div className="recommendation-text">
                      {message.recommendation.split('\n').map((line, idx) => (
                        <div key={idx} className={line.includes('**') ? 'recommendation-item' : 'recommendation-detail'}>
                          {line.replace(/\*\*/g, '')}
                        </div>
                      ))}
                    </div>
                  )}
                  
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
        {/* Security Permissions Section */}
        {selectedDataSource && (
          <div className="security-permissions-section">
            <div className="security-header">
              <h4>🔒 Your Regional Access</h4>
            </div>
            <div className="permissions-content">
              <p className="permissions-description">
                Regions you have access to for {selectedDataSource}:
              </p>
              <div className="permissions-badges">
                {(() => {
                  // Define data source specific permissions
                  const dataSourcePermissions = {
                    'ORDERS': [
                      { region: 'North America', access: 'Full Access', className: 'full-access' },
                      { region: 'Asia Pacific', access: 'Full Access', className: 'full-access' }
                    ],
                    'CUSTOMERS': [
                      { region: 'North America', access: 'Full Access', className: 'full-access' },
                      { region: 'EMESA', access: 'Read Only', className: 'read-only' },
                      { region: 'Asia Pacific', access: 'Full Access', className: 'full-access' }
                    ],
                    'PRODUCTS': [
                      { region: 'North America', access: 'Full Access', className: 'full-access' }
                    ]
                  };
                  
                  const permissions = dataSourcePermissions[selectedDataSource] || [
                    { region: 'North America', access: 'Full Access', className: 'full-access' },
                    { region: 'EMESA', access: 'Read Only', className: 'read-only' }
                  ];
                  
                  return permissions.map((perm, index) => (
                    <span key={index} className={`permission-badge ${perm.className}`}>
                      ✓ {perm.region} ({perm.access})
                    </span>
                  ));
                })()}
              </div>
              <p className="permissions-note">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
        
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