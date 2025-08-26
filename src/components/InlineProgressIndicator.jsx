import React, { useState, useEffect } from 'react';
import './InlineProgressIndicator.css';

const InlineProgressIndicator = ({ 
  isVisible, 
  currentStep, 
  progress, 
  estimatedTimeRemaining,
  statusMessage,
  userQuestion,
  selectedFilters,
  aiReasoning 
}) => {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const stepTitles = {
    discovering: 'Discovering relevant data sources',
    loading: 'Loading and validating data',
    analyzing: 'Processing analysis',
    generating: 'Generating insights'
  };

  const stepNumbers = {
    discovering: '1',
    loading: '2',
    analyzing: '3',
    generating: '4'
  };

  if (!isVisible) return null;

  // Generate contextual reasoning based on step and user input
  const getAIReasoning = () => {
    if (!userQuestion) return null;

    const questionPreview = userQuestion.length > 60 ? 
      `"${userQuestion.substring(0, 60)}..."` : 
      `"${userQuestion}"`;

    switch (currentStep) {
      case 'discovering':
        return `Interpreting your question: ${questionPreview}`;
      case 'loading':
        const filterText = selectedFilters && Object.keys(selectedFilters).length > 0 
          ? `Applying ${Object.keys(selectedFilters).length} filter(s)`
          : 'Loading full dataset';
        return `${filterText} • Preparing data for analysis`;
      case 'analyzing':
        return aiReasoning || `Processing: ${questionPreview}`;
      case 'generating':
        return `Formatting insights for: ${questionPreview}`;
      default:
        return null;
    }
  };

  const currentReasoning = getAIReasoning();

  return (
    <div className="inline-progress-container">
      {/* Status line */}
      <div className="inline-status">
        <span className="status-step">
          Step {stepNumbers[currentStep]} of 4
        </span>
        <span className="status-divider">•</span>
        <span className="status-text">
          {stepTitles[currentStep]}{dots}
        </span>
        {estimatedTimeRemaining > 0 && (
          <>
            <span className="status-divider">•</span>
            <span className="status-time">
              {estimatedTimeRemaining}s remaining
            </span>
          </>
        )}
      </div>

      {/* AI Reasoning Display */}
      {currentReasoning && (
        <div className="ai-reasoning">
          <span className="reasoning-label">AI:</span>
          <span className="reasoning-text">{currentReasoning}</span>
        </div>
      )}
      
      {/* Minimal progress bar */}
      <div className="inline-progress-bar">
        <div 
          className="inline-progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default InlineProgressIndicator;