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

  const stepIcons = {
    discovering: '🔍',
    loading: '📊',
    analyzing: '🧠',
    generating: '✨'
  };

  const stepTitles = {
    discovering: 'Finding data',
    loading: 'Loading',
    analyzing: 'Analyzing',
    generating: 'Finalizing'
  };

  if (!isVisible) return null;

  return (
    <div className="inline-progress-container">
      {/* Minimal progress bar */}
      <div className="inline-progress-bar">
        <div 
          className="inline-progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Status line */}
      <div className="inline-status">
        <span className="status-icon">
          {stepIcons[currentStep]}
        </span>
        <span className="status-text">
          {stepTitles[currentStep]}{dots}
        </span>
        {estimatedTimeRemaining > 0 && (
          <span className="status-time">
            ~{estimatedTimeRemaining}s
          </span>
        )}
      </div>
    </div>
  );
};

export default InlineProgressIndicator;