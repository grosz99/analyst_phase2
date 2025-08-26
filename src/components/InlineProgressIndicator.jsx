import React, { useState, useEffect } from 'react';
import './InlineProgressIndicator.css';

const InlineProgressIndicator = ({ 
  isVisible, 
  currentStep, 
  progress, 
  estimatedTimeRemaining,
  statusMessage 
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