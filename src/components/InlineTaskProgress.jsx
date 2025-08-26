import React, { useState, useEffect, useRef } from 'react';
import './InlineTaskProgress.css';

const InlineTaskProgress = ({ 
  isVisible, 
  currentStep, 
  progress, 
  estimatedTimeRemaining,
  userQuestion 
}) => {
  const [dots, setDots] = useState('');
  const logoRef = useRef(null);
  const trackRef = useRef(null);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animate logo position based on progress
  useEffect(() => {
    if (logoRef.current && trackRef.current && progress > 0) {
      const trackWidth = trackRef.current.offsetWidth;
      const logoOffset = Math.max(0, (trackWidth * progress / 100) - 12); // 12px = half logo width
      logoRef.current.style.transform = `translateX(${logoOffset}px)`;
    }
  }, [progress]);

  // Get contextual activity based on step and specific user question
  const getCurrentTask = () => {
    const question = userQuestion ? userQuestion.toLowerCase() : '';
    
    switch (currentStep) {
      case 'discovering':
        return 'gathering data from sources';
        
      case 'loading':
        if (question.includes('filter') || question.includes('where')) {
          return 'applying filters to dataset';
        } else if (question.includes('top') || question.includes('best')) {
          return 'filtering down to relevant records';
        }
        return 'loading dataset for analysis';
        
      case 'analyzing':
        if (question.includes('top 10') || question.includes('top ten')) {
          return 'applying top 10 ranking';
        } else if (question.includes('top 5') || question.includes('top five')) {
          return 'applying top 5 ranking';  
        } else if (question.includes('top') && question.includes('bottom')) {
          return 'ranking and sorting data';
        } else if (question.includes('top') || question.includes('best') || question.includes('highest')) {
          return 'identifying top performers';
        } else if (question.includes('worst') || question.includes('lowest') || question.includes('bottom')) {
          return 'identifying bottom performers';
        } else if (question.includes('compare') || question.includes('vs') || question.includes('versus')) {
          return 'preparing comparative analysis';
        } else if (question.includes('trend') || question.includes('over time') || question.includes('change')) {
          return 'analyzing trends over time';
        } else if (question.includes('average') || question.includes('mean')) {
          return 'calculating averages';
        } else if (question.includes('total') || question.includes('sum')) {
          return 'calculating totals';
        } else if (question.includes('count') || question.includes('how many')) {
          return 'counting records';
        } else if (question.includes('distribution') || question.includes('breakdown')) {
          return 'analyzing data distribution';
        }
        return 'processing data analysis';
        
      case 'generating':
        if (question.includes('chart') || question.includes('graph')) {
          return 'generating charts and visualizations';
        } else if (question.includes('table') || question.includes('list')) {
          return 'formatting results table';
        }
        return 'preparing final output';
        
      default:
        return 'processing request';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bcg-progress-container">
      <div className="progress-header">
        <span className="progress-label">Analysis in Progress</span>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>
      
      <div className="progress-wrapper">
        <div 
          ref={logoRef}
          className="beacon-logo" 
          aria-hidden="true"
        >
          <img src="/logo.svg" alt="Beacon" width="24" height="24" />
        </div>
        
        <div 
          ref={trackRef}
          className="progress-track" 
          role="progressbar" 
          aria-valuenow={Math.round(progress)} 
          aria-valuemax="100"
          aria-label={`Analysis progress: ${getCurrentTask()}`}
        >
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="progress-description">
        {getCurrentTask()}{dots}
      </div>
      
      <span className="visually-hidden" aria-live="polite">
        Analysis {Math.round(progress)}% complete: {getCurrentTask()}
      </span>
    </div>
  );
};

export default InlineTaskProgress;