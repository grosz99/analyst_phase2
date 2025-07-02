import React, { useState, useEffect, useRef } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import AIAnalysisResults from './AIAnalysisResults.jsx';
import ResultsTable from './ResultsTable.jsx';
import './UnifiedAnalysisView.css';

const DataPreview = ({ previewData, totalRows, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!previewData || previewData.length === 0) {
    return (
      <div className="data-preview-container">
        <button 
          className="preview-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          📊 Data Preview {isExpanded ? '▼' : '▶'} 
        </button>
        {isExpanded && (
          <div className="preview-content">
            <p className="placeholder-text">No data available for preview.</p>
          </div>
        )}
      </div>
    );
  }

  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="data-preview-container">
      <div className="preview-header">
        <button 
          className="preview-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          📊 Data Preview ({totalRows || previewData.length} rows) {isExpanded ? '▼' : '▶'}
        </button>
        {isExpanded && (
          <div className="preview-actions">
            <button onClick={() => onExport('csv')} className="export-btn">
              📊 Export CSV
            </button>
            <button onClick={() => onExport('json')} className="export-btn">
              📄 Export JSON
            </button>
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="preview-content">
          <ResultsTable data={previewData} headers={headers} />
          {totalRows > previewData.length && (
            <p className="preview-note">Showing first {previewData.length} rows of {totalRows} total rows</p>
          )}
        </div>
      )}
    </div>
  );
};

function UnifiedAnalysisView({ initialData, cachedDataset, dataLoadedTimestamp, previewData, datasetInfo, sessionId, onReset }) {
  // AI Analysis State
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [aiServiceStatus, setAiServiceStatus] = useState(null);
  
  // Suggested Questions State
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [analysisTypes, setAnalysisTypes] = useState([]);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('general');
  const [selectedBackend, setSelectedBackend] = useState('anthropic');
  const [availableBackends, setAvailableBackends] = useState([]);
  
  const questionInputRef = useRef(null);

  // Initialize AI service and load suggestions
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Check AI service status
        const status = await aiAnalysisService.getStatus();
        setAiServiceStatus(status);
        
        // Load analysis types
        const types = await aiAnalysisService.getAnalysisTypes();
        setAnalysisTypes(types);
        
        // Load available backends
        const backends = await aiAnalysisService.getAvailableBackends();
        setAvailableBackends(backends);
        
        // Generate suggested questions based on data
        if (initialData && initialData.length > 0) {
          const suggestions = aiAnalysisService.generateSuggestedQuestions(initialData);
          setSuggestedQuestions(suggestions);
        }
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        // Don't set error - let user try anyway
        console.warn('AI service initialization had issues, but continuing with fallback');
        
        // Set fallback backends so user can still select
        setAvailableBackends([
          {
            id: 'anthropic',
            name: 'Anthropic Claude',
            description: 'Advanced AI analysis with custom pandas execution',
            features: ['Natural language understanding', 'Python code generation'],
            status: 'available'
          },
          {
            id: 'cortex_analyst',
            name: 'Snowflake Cortex Analyst',
            description: 'Native Snowflake AI analyst with semantic model understanding',
            features: ['SQL generation', 'Semantic model integration'],
            status: 'available'
          }
        ]);
      }
    };

    initializeAI();
  }, [initialData]);

  // Handle AI Analysis
  const handleAnalyzeData = async (question = '', analysisType = 'general') => {
    const dataToAnalyze = cachedDataset || initialData;
    
    if (!dataToAnalyze || dataToAnalyze.length === 0) {
      setError('No data available for analysis');
      return;
    }

    if (!question.trim() && analysisType === 'general') {
      setError('Please enter a question or select an analysis type');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentQuestion('');

    try {
      const loadTime = dataLoadedTimestamp ? new Date(dataLoadedTimestamp) : new Date();
      console.log(`🤖 Starting AI analysis using cached dataset (loaded ${loadTime.toLocaleTimeString()}):`, { 
        question, 
        analysisType, 
        dataRows: dataToAnalyze.length,
        cached: !!cachedDataset 
      });
      
      const result = await aiAnalysisService.analyzeData(
        dataToAnalyze,
        question || `Perform ${analysisType} analysis`,
        analysisType,
        sessionId,
        selectedBackend
      );

      console.log('✅ AI analysis result:', result);
      
      // Add to conversation history instead of replacing
      const newAnalysisItem = {
        id: Date.now(),
        question: question || `Perform ${analysisType} analysis`,
        result: result,
        timestamp: new Date().toISOString()
      };
      
      setAnalysisHistory(prev => [...prev, newAnalysisItem]);

      // Generate new suggestions based on the analysis
      if (result.success && initialData) {
        const newSuggestions = aiAnalysisService.generateSuggestedQuestions(initialData);
        setSuggestedQuestions(newSuggestions);
      }

    } catch (error) {
      console.error('❌ AI analysis error:', error);
      setError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle question submission
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isAnalyzing) return;
    
    await handleAnalyzeData(currentQuestion, selectedAnalysisType);
  };

  // Handle suggested question click
  const handleSuggestedQuestion = async (question) => {
    setCurrentQuestion(question);
    await handleAnalyzeData(question, selectedAnalysisType);
  };

  // Handle analysis type change
  const handleAnalysisTypeChange = (typeId) => {
    setSelectedAnalysisType(typeId);
    if (currentQuestion.trim()) {
      // Re-analyze with new type if there's a current question
      handleAnalyzeData(currentQuestion, typeId);
    }
  };

  // Handle data export
  const handleExportData = async (format) => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `dataset_${timestamp}`;
      
      if (format === 'csv') {
        aiAnalysisService.exportToCSV(initialData, filename);
      } else if (format === 'json') {
        aiAnalysisService.exportToJSON(initialData, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    }
  };

  // Handle new analysis from compact input or reset entire conversation
  const handleNewAnalysis = (newResult = null, newQuestion = '') => {
    if (newResult && newQuestion) {
      // Handle new analysis from compact input - add to conversation history
      const newAnalysisItem = {
        id: Date.now(),
        question: newQuestion,
        result: newResult,
        timestamp: new Date().toISOString()
      };
      setAnalysisHistory(prev => [...prev, newAnalysisItem]);
      setCurrentQuestion('');
      setError(null);
    } else {
      // Reset entire conversation
      setAnalysisHistory([]);
      setCurrentQuestion('');
      setError(null);
      setSelectedAnalysisType('general');
      questionInputRef.current?.focus();
    }
  };

  // Start a completely new analysis (clear conversation)
  const handleStartNewAnalysis = () => {
    setAnalysisHistory([]);
    setCurrentQuestion('');
    setError(null);
    setSelectedAnalysisType('general');
  };

  return (
    <div className="unified-analysis-view">
      {/* Analysis Header */}
      <div className="beacon-header">
        <div className="beacon-logo">
          <div className="logo-icon">⚡</div>
          <h1>AI Data Analysis</h1>
        </div>
        
        {/* 3-Step Process Bar */}
        <div className="process-steps">
          <div className="step completed">
            <div className="step-number">1</div>
            <div className="step-label">Explore Data Sources</div>
          </div>
          <div className="step-divider"></div>
          <div className="step completed">
            <div className="step-number">2</div>
            <div className="step-label">Select Filters</div>
          </div>
          <div className="step-divider"></div>
          <div className="step active">
            <div className="step-number">3</div>
            <div className="step-label">Ask Your Question</div>
          </div>
        </div>
        
        <button onClick={onReset} className="new-dataset-btn">
          New Dataset
        </button>
      </div>
      
      {/* Dataset Info Bar */}
      <div className="dataset-info-bar">
        <span className="dataset-status">
          {cachedDataset ? '⚡ Data Cached in Memory' : '✅ AI Analysis Ready'}
        </span>
        <span className="dataset-details">
          {cachedDataset 
            ? `${cachedDataset.length} rows cached • Loaded ${dataLoadedTimestamp ? new Date(dataLoadedTimestamp).toLocaleTimeString() : 'now'}`
            : datasetInfo
          }
        </span>
      </div>

      <div className="content-area">
        {/* Data Preview */}
        <DataPreview 
        previewData={previewData || initialData?.slice(0, 10)} 
        totalRows={initialData?.length} 
        onExport={handleExportData} 
      />

      {/* Compact Analysis Interface */}
      {analysisHistory.length === 0 && (
        <div className="analysis-interface">
          {/* Backend Selection */}
          {availableBackends.length > 0 && (
            <div className="backend-selector">
              <div className="selector-header">
                <h4>🤖 Choose AI Backend</h4>
                <p>Select the AI engine for your data analysis</p>
              </div>
              <div className="backend-options">
                {availableBackends.map((backend) => (
                  <div
                    key={backend.id}
                    className={`backend-option ${selectedBackend === backend.id ? 'selected' : ''} ${backend.status !== 'available' ? 'disabled' : ''}`}
                    onClick={() => backend.status === 'available' && setSelectedBackend(backend.id)}
                  >
                    <div className="backend-info">
                      <div className="backend-name">
                        {backend.name}
                        {backend.status !== 'available' && <span className="status-badge unavailable">Unavailable</span>}
                        {selectedBackend === backend.id && <span className="status-badge selected">Selected</span>}
                      </div>
                      <div className="backend-description">{backend.description}</div>
                      <div className="backend-features">
                        {backend.features.slice(0, 2).map((feature, idx) => (
                          <span key={idx} className="feature-tag">{feature}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitQuestion} className="question-form">
            <div className="form-header">
              <h3>🔍 Ask a Question About Your Data</h3>
              <p>Use natural language to explore your data with AI analysis</p>
            </div>
            
            <div className="input-group">
              <div className="question-input-wrapper">
                <input
                  ref={questionInputRef}
                  type="text"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="e.g., Who are the most profitable customers?"
                  className="question-input"
                  disabled={isAnalyzing}
                />
                <button 
                  type="submit" 
                  disabled={!currentQuestion.trim() || isAnalyzing}
                  className="analyze-btn"
                >
                  {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
                </button>
              </div>
              
            </div>
          </form>

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && !isAnalyzing && (
          <div className="suggested-questions">
            <h4>💡 Suggested Questions</h4>
            <div className="suggestions-grid">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="suggestion-chip"
                  disabled={isAnalyzing}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        )}
      </div>
      )}

      {/* Conversation History */}
      {analysisHistory.length > 0 && (
        <div className="conversation-container">
          <div className="conversation-header">
            <h2>Analysis Conversation</h2>
            <button onClick={handleStartNewAnalysis} className="new-analysis-btn">
              Start New Analysis
            </button>
          </div>
          
          {/* Render each question/answer pair in conversation */}
          {analysisHistory.map((item, index) => (
            <div key={item.id} className="conversation-item">
              <div className="conversation-number">#{index + 1}</div>
              <AIAnalysisResults
                analysisResult={item.result}
                originalData={cachedDataset || initialData}
                question={item.question}
                onNewAnalysis={handleNewAnalysis}
                isLoading={false}
                showCompactInput={index === analysisHistory.length - 1} // Only show input on last item
                selectedBackend={selectedBackend}
                sessionId={sessionId}
              />
            </div>
          ))}
          
          {/* Loading state for new question */}
          {isAnalyzing && (
            <div className="conversation-item">
              <div className="conversation-number">#{analysisHistory.length + 1}</div>
              <div className="analysis-loading">
                <div className="loading-spinner"></div>
                <p>Analyzing your question...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Unavailable Message */}
      {aiServiceStatus && !aiServiceStatus.success && (
        <div className="service-unavailable">
          <div className="unavailable-content">
            <h3>🚧 AI Analysis Temporarily Unavailable</h3>
            <p>The AI analysis service is currently unavailable. You can still:</p>
            <ul>
              <li>📊 View and export your data</li>
              <li>📋 Download the dataset in CSV or JSON format</li>
              <li>🔄 Try refreshing the page</li>
            </ul>
            <p className="service-error">Error: {aiServiceStatus.error}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default UnifiedAnalysisView;