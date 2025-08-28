import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Database, CheckCircle, Search, List } from 'lucide-react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import CompactDataStructure from './CompactDataStructure.jsx';
import './DataSourceDiscovery.css';

// Real business data semantic model mapped to actual Snowflake tables
const SEMANTIC_MODEL = {
  tables: {
    'ATTENDANCE': {
      description: 'Office attendance tracking across global locations with headcount, attendance rates, and organizational cohorts',
      keywords: ['attendance', 'office', 'headcount', 'cohort', 'presence', 'workplace', 'location', 'hybrid', 'remote', 'onsite'],
      dimensions: ['office', 'date', 'cohort', 'org'],
      metrics: ['headcount', 'people_attended', 'attendance_rate', 'absence_count'],
      questions: [
        'attendance patterns',
        'office utilization',
        'workforce presence',
        'attendance trends',
        'cohort analysis',
        'office capacity',
        'attendance by location'
      ],
      relatedConcepts: ['hybrid work', 'office space', 'workforce', 'utilization', 'trends']
    },
    'NCC': {
      description: 'Net Cash Contribution financial data showing project profitability by office, region, sector, and client',
      keywords: ['ncc', 'net cash contribution', 'financial', 'revenue', 'profit', 'project', 'billing', 'timesheet', 'charges', 'adjustments'],
      dimensions: ['office', 'region', 'sector', 'month', 'client', 'project_id', 'year'],
      metrics: ['timesheet_charges', 'adjustments', 'ncc', 'adjustment_rate'],
      questions: [
        'financial performance',
        'project profitability',
        'revenue analysis',
        'sector performance',
        'regional profitability',
        'client value',
        'billing efficiency'
      ],
      relatedConcepts: ['profitability', 'revenue', 'billing', 'projects', 'clients', 'financial health']
    },
    'PIPELINE': {
      description: 'Sales pipeline opportunities tracking deal stages, potential values, and expected close dates across regions',
      keywords: ['pipeline', 'sales', 'deals', 'opportunities', 'prospects', 'stage', 'close', 'value', 'forecast', 'win'],
      dimensions: ['company', 'stage', 'sector', 'region', 'close_quarter', 'close_year'],
      metrics: ['potential_value_usd', 'days_to_close', 'value_millions'],
      questions: [
        'sales pipeline',
        'deal analysis',
        'revenue forecast',
        'opportunity stages',
        'sales performance',
        'win rates',
        'pipeline health'
      ],
      relatedConcepts: ['sales', 'opportunities', 'forecast', 'deals', 'revenue pipeline', 'conversion']
    }
  }
};

const DataSourceDiscovery = ({ 
  availableDataSources, 
  selectedDataSource, 
  setSelectedDataSource, 
  availableFields, 
  isLoadingDataSources = false 
}) => {
  const [selectedMode, setSelectedMode] = useState('agent'); // 'agent' or 'list'
  
  // Debug: Check if data sources are passed correctly
  console.log('DataSourceDiscovery received availableDataSources:', availableDataSources);
  
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
    
    if (tableName === 'ATTENDANCE') {
      if (queryLower.includes('utilization')) return 'office utilization analysis';
      if (queryLower.includes('trend')) return 'attendance trend analysis';
      if (queryLower.includes('cohort')) return 'cohort attendance analysis';
      return 'attendance analysis';
    } else if (tableName === 'NCC') {
      if (queryLower.includes('profitability')) return 'project profitability analysis';
      if (queryLower.includes('revenue')) return 'revenue analysis';
      if (queryLower.includes('sector')) return 'sector performance analysis';
      if (queryLower.includes('region')) return 'regional financial analysis';
      return 'financial performance analysis';
    } else if (tableName === 'PIPELINE') {
      if (queryLower.includes('forecast')) return 'sales forecast analysis';
      if (queryLower.includes('pipeline')) return 'pipeline health analysis';
      if (queryLower.includes('stage')) return 'deal stage analysis';
      if (queryLower.includes('win')) return 'win rate analysis';
      return 'sales opportunity analysis';
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
    availableDataSources.forEach(source => {
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

        // Special cases for common analysis patterns - Real data
        if (queryLower.includes('attendance') && source === 'ATTENDANCE') score += 40;
        if (queryLower.includes('office') && source === 'ATTENDANCE') score += 30;
        if (queryLower.includes('headcount') && source === 'ATTENDANCE') score += 35;
        if (queryLower.includes('utilization') && source === 'ATTENDANCE') score += 30;
        if (queryLower.includes('ncc') && source === 'NCC') score += 50;
        if (queryLower.includes('profit') && source === 'NCC') score += 35;
        if (queryLower.includes('revenue') && source === 'NCC') score += 30;
        if (queryLower.includes('financial') && source === 'NCC') score += 25;
        if (queryLower.includes('project') && source === 'NCC') score += 25;
        if (queryLower.includes('pipeline') && source === 'PIPELINE') score += 40;
        if (queryLower.includes('sales') && source === 'PIPELINE') score += 35;
        if (queryLower.includes('deals') && source === 'PIPELINE') score += 30;
        if (queryLower.includes('opportunities') && source === 'PIPELINE') score += 30;
        if (queryLower.includes('forecast') && source === 'PIPELINE') score += 25;
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
      if (!availableDataSources || availableDataSources.length === 0) {
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
        availableDataSources,
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
      
      // Smart fallback using local semantic matching
      const matchedSources = findMatchingDataSources(currentQuery);
      
      if (matchedSources.length > 0) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: `Based on your query about "${currentQuery}", here are the recommended data sources:`,
          recommendation: getRecommendationExplanation(matchedSources, currentQuery),
          timestamp: new Date(),
          sources: matchedSources
        };
        
        setMessages(prev => [...prev, botResponse]);
        
        // Auto-select highest confidence match
        if (matchedSources[0] && matchedSources[0].confidence === 'high') {
          setTimeout(() => handleSelectDataSource(matchedSources[0].name), 500);
        }
      } else {
        // Show all sources as final fallback
        const allSources = availableDataSources.map(source => ({
          name: source,
          description: SEMANTIC_MODEL.tables[source]?.description || `${source} from Snowflake`,
          confidence: 'medium'
        }));
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: "Here are all available data sources. Click on the one that best matches your analysis needs:",
          timestamp: new Date(),
          sources: allSources
        };
        
        setMessages(prev => [...prev, botResponse]);
      }
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

  const filteredDataSources = availableDataSources.filter(source =>
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
                    'ATTENDANCE': [
                      { region: 'North America', access: 'Full Access', className: 'full-access' },
                      { region: 'Asia Pacific', access: 'Full Access', className: 'full-access' },
                      { region: 'EMESA', access: 'Read Only', className: 'read-only' }
                    ],
                    'NCC': [
                      { region: 'North America', access: 'Full Access', className: 'full-access' },
                      { region: 'Asia Pacific', access: 'Full Access', className: 'full-access' },
                      { region: 'EMESA', access: 'Full Access', className: 'full-access' }
                    ],
                    'PIPELINE': [
                      { region: 'Americas', access: 'Full Access', className: 'full-access' },
                      { region: 'APAC', access: 'Full Access', className: 'full-access' },
                      { region: 'EMEA', access: 'Read Only', className: 'read-only' }
                    ],
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
        
        {selectedDataSource ? (
          <CompactDataStructure 
            dataSource={selectedDataSource}
            fieldCounts={{
              string: availableFields ? availableFields.filter(f => f.type === 'STRING').length : 0,
              number: availableFields ? availableFields.filter(f => f.type === 'NUMBER').length : 0
            }}
            isCollapsed={false}
          />
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