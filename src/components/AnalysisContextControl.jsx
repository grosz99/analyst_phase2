import React, { useState, useEffect } from 'react';
import analysisContextManager from '../services/analysisContextManager.js';
import './AnalysisContextControl.css';

const AnalysisContextControl = ({ 
  onModeChange, 
  currentQuestion, 
  lastQuestion,
  filteredDataCount,
  originalDataCount,
  activeFilters 
}) => {
  const [mode, setMode] = useState('fresh');
  const [showModeSuggestion, setShowModeSuggestion] = useState(false);
  const [suggestedMode, setSuggestedMode] = useState(null);
  const contextSummary = analysisContextManager.getContextSummary();

  // Update context manager when filters change
  useEffect(() => {
    if (activeFilters) {
      analysisContextManager.setDatasetFilters(activeFilters);
    }
  }, [activeFilters]);

  // Check for mode suggestions based on question
  useEffect(() => {
    if (currentQuestion && currentQuestion.length > 5) {
      const suggestion = analysisContextManager.shouldSuggestModeSwitch(currentQuestion);
      if (suggestion && suggestion.confidence === 'high') {
        setSuggestedMode(suggestion.suggestMode);
        setShowModeSuggestion(true);
      } else {
        setShowModeSuggestion(false);
      }
    }
  }, [currentQuestion]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    analysisContextManager.setMode(newMode);
    setShowModeSuggestion(false);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const acceptSuggestion = () => {
    if (suggestedMode) {
      handleModeChange(suggestedMode);
    }
  };

  const getFilterSummary = () => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) {
      return null;
    }
    
    const filterCount = Object.keys(activeFilters).length;
    const filterEntries = Object.entries(activeFilters);
    
    if (filterCount === 1) {
      const [field, values] = filterEntries[0];
      const valueCount = Array.isArray(values) ? values.length : 1;
      return `${field}: ${valueCount} value${valueCount > 1 ? 's' : ''}`;
    }
    
    return `${filterCount} filters active`;
  };

  return (
    <div className="analysis-context-control">
      {/* Mode Selector */}
      <div className="mode-selector">
        <button 
          className={`mode-btn ${mode === 'continue' ? 'active' : ''}`}
          onClick={() => handleModeChange('continue')}
          disabled={!lastQuestion}
          title={!lastQuestion ? "No previous analysis to continue from" : "Continue from your last analysis"}
        >
          <span className="mode-icon">🔍</span>
          <span className="mode-text">
            <span className="mode-title">Continue Analysis</span>
            <span className="mode-hint">Build on current results & context</span>
          </span>
        </button>
        
        <button 
          className={`mode-btn ${mode === 'fresh' ? 'active' : ''}`}
          onClick={() => handleModeChange('fresh')}
        >
          <span className="mode-icon">✨</span>
          <span className="mode-text">
            <span className="mode-title">Fresh Start</span>
            <span className="mode-hint">Analyze full dataset, no assumptions</span>
          </span>
        </button>
      </div>

      {/* Mode Suggestion */}
      {showModeSuggestion && (
        <div className="mode-suggestion">
          <span className="suggestion-icon">💡</span>
          <span className="suggestion-text">
            Based on your question, try "{suggestedMode === 'continue' ? 'Continue Analysis' : 'Fresh Start'}" mode
          </span>
          <button className="suggestion-accept" onClick={acceptSuggestion}>
            Switch
          </button>
          <button className="suggestion-dismiss" onClick={() => setShowModeSuggestion(false)}>
            ×
          </button>
        </div>
      )}

      {/* Context Indicator */}
      <div className="context-indicator">
        {mode === 'continue' && lastQuestion && (
          <div className="context-details continue-mode">
            <div className="context-header">
              <span className="context-icon">📊</span>
              <strong>Continuing Analysis From:</strong>
            </div>
            <div className="context-info">
              <div className="previous-question">"{lastQuestion}"</div>
              {filteredDataCount > 0 && (
                <div className="data-scope">
                  Working with {filteredDataCount.toLocaleString()} filtered records
                  {originalDataCount && ` (from ${originalDataCount.toLocaleString()} total)`}
                </div>
              )}
              {contextSummary.questionCount > 1 && (
                <div className="analysis-depth">
                  Question {contextSummary.questionCount} in this analysis thread
                </div>
              )}
            </div>
          </div>
        )}
        
        {mode === 'fresh' && (
          <div className="context-details fresh-mode">
            <div className="context-header">
              <span className="context-icon">🆕</span>
              <strong>Fresh Analysis Mode</strong>
            </div>
            <div className="context-info">
              <div className="mode-description">
                Starting with complete dataset
                {getFilterSummary() && ` (${getFilterSummary()})`}
              </div>
              {originalDataCount && (
                <div className="data-scope">
                  {originalDataCount.toLocaleString()} total records available
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Benefits Indicator */}
      <div className="mode-benefits">
        {mode === 'continue' ? (
          <div className="benefit-text">
            <span className="benefit-icon">✅</span>
            <span>AI maintains context from previous analysis, reducing hallucinations about unrelated data</span>
          </div>
        ) : (
          <div className="benefit-text">
            <span className="benefit-icon">✅</span>
            <span>AI starts fresh without assumptions, preventing context contamination</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisContextControl;