import React, { useState } from 'react';
import './ClarificationModal.css';

/**
 * ClarificationModal - BCG-styled modal for disambiguating user queries
 * Displays when analysis is paused due to ambiguous terms
 */
const ClarificationModal = ({ 
  disambiguation, 
  onClarify, 
  onCancel,
  isVisible 
}) => {
  const [selectedOption, setSelectedOption] = useState('');

  if (!isVisible || !disambiguation) {
    return null;
  }

  const { ambiguousTerm, originalQuery, clarificationOptions, context, confidence } = disambiguation;

  const handleConfirm = () => {
    if (selectedOption) {
      onClarify(selectedOption);
    }
  };

  const handleCancel = () => {
    setSelectedOption('');
    onCancel();
  };

  return (
    <div className="clarification-overlay">
      <div className="clarification-modal">
        {/* Header */}
        <div className="clarification-header">
          <h3>Clarification Needed</h3>
          <p className="clarification-subtitle">
            Your question contains an ambiguous term that could mean different things
          </p>
        </div>

        {/* Original Query Display */}
        <div className="original-query-section">
          <label className="section-label">Your Question:</label>
          <div className="original-query">
            "{originalQuery}"
          </div>
        </div>

        {/* Ambiguous Term Highlight */}
        <div className="ambiguous-term-section">
          <label className="section-label">Ambiguous Term:</label>
          <div className="ambiguous-term">
            <span className="term-highlight">"{ambiguousTerm}"</span>
            <span className="confidence-indicator">
              {confidence >= 0.9 ? 'High confidence' : confidence >= 0.8 ? 'Medium confidence' : 'Low confidence'}
            </span>
          </div>
        </div>

        {/* Clarification Options */}
        <div className="clarification-options-section">
          <label className="section-label">Please specify which you meant:</label>
          <div className="clarification-options">
            {clarificationOptions.map((option) => (
              <div 
                key={option.key}
                className={`clarification-option ${selectedOption === option.key ? 'selected' : ''}`}
                onClick={() => setSelectedOption(option.key)}
              >
                <div className="option-header">
                  <input
                    type="radio"
                    name="clarification"
                    value={option.key}
                    checked={selectedOption === option.key}
                    onChange={() => setSelectedOption(option.key)}
                    className="option-radio"
                  />
                  <span className="option-label">{option.label}</span>
                </div>
                <p className="option-description">{option.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Context Information */}
        {context && (
          <div className="context-section">
            <label className="section-label">Context Detected:</label>
            <div className="context-info">
              {context.dataType && <span className="context-tag">Data: {context.dataType}</span>}
              {context.grouping && <span className="context-tag">Grouping: {context.grouping}</span>}
              {context.timeframe && <span className="context-tag">Timeframe: {context.timeframe}</span>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="clarification-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            Cancel Analysis
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedOption}
          >
            Continue with Selection
          </button>
        </div>

        {/* Help Text */}
        <div className="clarification-help">
          <p className="help-text">
            This clarification ensures you get the most accurate analysis results. 
            Your selection will be used to refine the analysis parameters.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClarificationModal;