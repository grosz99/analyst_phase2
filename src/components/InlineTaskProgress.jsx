import React, { useState, useEffect } from 'react';
import './InlineTaskProgress.css';

const InlineTaskProgress = ({ 
  isVisible, 
  currentStep, 
  progress, 
  estimatedTimeRemaining,
  userQuestion 
}) => {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

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
    <div className="inline-task-progress">
      <div className="task-description">
        {getCurrentTask()}{dots}
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default InlineTaskProgress;