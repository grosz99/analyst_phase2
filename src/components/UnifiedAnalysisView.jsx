import React, { useState, useEffect, useRef } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import AIAnalysisResults from './AIAnalysisResults.jsx';
import ResultsTable from './ResultsTable.jsx';
import './UnifiedAnalysisView.css';

const DataPreview = ({ previewData, totalRows, onExport }) => {
  if (!previewData || previewData.length === 0) {
    return (
      <div className="data-preview-container">
        <h3 className="preview-title">📊 Data Preview</h3>
        <p className="placeholder-text">No data available for preview.</p>
      </div>
    );
  }

  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="data-preview-container">
      <div className="preview-header">
        <h3 className="preview-title">📊 Data Preview ({totalRows || previewData.length} rows)</h3>
        <div className="preview-actions">
          <button onClick={() => onExport('csv')} className="export-btn">
            📊 Export CSV
          </button>
          <button onClick={() => onExport('json')} className="export-btn">
            📄 Export JSON
          </button>
        </div>
      </div>
      <ResultsTable data={previewData} headers={headers} />
      {totalRows > previewData.length && (
        <p className="preview-note">Showing first {previewData.length} rows of {totalRows} total rows</p>
      )}
    </div>
  );
};

function UnifiedAnalysisView({ initialData, previewData, datasetInfo, sessionId, onReset }) {
  // AI Analysis State
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [aiServiceStatus, setAiServiceStatus] = useState(null);
  
  // Suggested Questions State
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [analysisTypes, setAnalysisTypes] = useState([]);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('general');
  
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
        
        // Generate suggested questions based on data
        if (initialData && initialData.length > 0) {
          const suggestions = aiAnalysisService.generateSuggestedQuestions(initialData);
          setSuggestedQuestions(suggestions);
        }
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        setError('AI service initialization failed');
      }
    };

    initializeAI();
  }, [initialData]);

  // Handle AI Analysis
  const handleAnalyzeData = async (question = '', analysisType = 'general') => {
    if (!initialData || initialData.length === 0) {
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
      console.log('🤖 Starting AI analysis:', { question, analysisType, dataRows: initialData.length });
      
      const result = await aiAnalysisService.analyzeData(
        initialData,
        question || `Perform ${analysisType} analysis`,
        analysisType,
        sessionId
      );

      console.log('✅ AI analysis result:', result);
      setAnalysisResult(result);

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

  // Reset analysis or handle new analysis from compact input
  const handleNewAnalysis = (newResult = null, newQuestion = '') => {
    if (newResult && newQuestion) {
      // Handle new analysis from compact input
      setAnalysisResult(newResult);
      setCurrentQuestion(newQuestion);
      setError(null);
    } else {
      // Reset analysis
      setAnalysisResult(null);
      setCurrentQuestion('');
      setError(null);
      setSelectedAnalysisType('general');
      questionInputRef.current?.focus();
    }
  };

  return (
    <div className="unified-analysis-view">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-content">
          <h1 className="header-title">🤖 AI-Powered Data Analysis</h1>
          <p className="header-subtitle">{datasetInfo}</p>
          
          {/* AI Service Status */}
          {aiServiceStatus && (
            <div className="ai-status">
              {aiServiceStatus.success ? (
                <span className="status-badge status-healthy">
                  ✅ AI Analysis Ready
                </span>
              ) : (
                <span className="status-badge status-error">
                  ❌ AI Service Unavailable
                </span>
              )}
            </div>
          )}
        </div>
        
        <button onClick={onReset} className="reset-btn">
          🔄 New Dataset
        </button>
      </div>

      {/* Data Preview */}
      <DataPreview 
        previewData={previewData || initialData?.slice(0, 10)} 
        totalRows={initialData?.length} 
        onExport={handleExportData} 
      />

      {/* Compact Analysis Interface */}
      {!analysisResult && (
        <div className="analysis-interface">
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
                  disabled={isAnalyzing || !aiServiceStatus?.success}
                />
                <button 
                  type="submit" 
                  disabled={!currentQuestion.trim() || isAnalyzing || !aiServiceStatus?.success}
                  className="analyze-btn"
                >
                  {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
                </button>
              </div>
              
              {/* Analysis Type Selector */}
              {analysisTypes.length > 0 && (
                <div className="analysis-type-selector">
                  <label htmlFor="analysis-type">Analysis Type:</label>
                  <select 
                    id="analysis-type"
                    value={selectedAnalysisType} 
                    onChange={(e) => handleAnalysisTypeChange(e.target.value)}
                    className="analysis-type-dropdown"
                    disabled={isAnalyzing}
                  >
                    {analysisTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  disabled={!aiServiceStatus?.success}
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

      {/* AI Analysis Results */}
      <AIAnalysisResults
        analysisResult={analysisResult}
        originalData={initialData}
        question={currentQuestion}
        onNewAnalysis={handleNewAnalysis}
        isLoading={isAnalyzing}
      />

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
  );
}

export default UnifiedAnalysisView;