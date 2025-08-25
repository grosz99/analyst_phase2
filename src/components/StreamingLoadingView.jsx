import React, { useState, useEffect } from 'react';
import './StreamingLoadingView.css';

const StreamingLoadingView = ({ 
  isVisible, 
  currentStep, 
  progress, 
  estimatedTimeRemaining,
  statusMessage,
  onCancel 
}) => {
  const [dots, setDots] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const analysisSteps = [
    {
      id: 'discovering',
      title: '🔍 Discovering Data Sources',
      description: 'Finding the most relevant data for your analysis',
      tips: 'We\'re examining your data structure and identifying key patterns',
      estimatedTime: '2-4 seconds'
    },
    {
      id: 'loading',
      title: '📊 Loading Data',
      description: 'Retrieving and preparing your data for analysis',
      tips: 'Large datasets may take longer - we\'re optimizing for performance',
      estimatedTime: '3-8 seconds'
    },
    {
      id: 'analyzing',
      title: '🤖 AI Analysis in Progress',
      description: 'Our AI is examining patterns and generating insights',
      tips: 'The AI is looking for trends, anomalies, and key business insights',
      estimatedTime: '8-12 seconds'
    },
    {
      id: 'generating',
      title: '📈 Creating Visualizations',
      description: 'Building charts and tables to present your results',
      tips: 'We\'re selecting the best visualization types for your data',
      estimatedTime: '2-4 seconds'
    }
  ];

  const currentStepData = analysisSteps.find(step => step.id === currentStep) || analysisSteps[0];

  if (!isVisible) return null;

  return (
    <div className="streaming-loading-overlay">
      <div className="streaming-loading-container">
        
        {/* Main Loading Header */}
        <div className="loading-header">
          <div className="loading-icon">
            <div className="pulse-ring"></div>
            <div className="ai-brain">🧠</div>
          </div>
          
          <h2 className="loading-title">
            {currentStepData.title}{dots}
          </h2>
          
          <p className="loading-description">
            {statusMessage || currentStepData.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {progress}% complete
            {estimatedTimeRemaining && (
              <span className="time-remaining">
                • ~{estimatedTimeRemaining}s remaining
              </span>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="steps-indicator">
          {analysisSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`step ${step.id === currentStep ? 'active' : ''} ${
                analysisSteps.findIndex(s => s.id === currentStep) > index ? 'completed' : ''
              }`}
            >
              <div className="step-dot">
                {analysisSteps.findIndex(s => s.id === currentStep) > index ? '✓' : index + 1}
              </div>
              <span className="step-label">{step.title.replace(/[🔍📊🤖📈]/g, '').trim()}</span>
            </div>
          ))}
        </div>

        {/* Current Step Details */}
        <div className="current-step-info">
          <div className="step-tip">
            <div className="tip-icon">💡</div>
            <span>{currentStepData.tips}</span>
          </div>
          
          <div className="step-timing">
            <div className="timing-icon">⏱️</div>
            <span>Typically takes {currentStepData.estimatedTime}</span>
          </div>
        </div>

        {/* Expandable Technical Details */}
        <div className="technical-details">
          <button 
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▲' : '▼'} Technical Details
          </button>
          
          {showDetails && (
            <div className="details-content">
              <div className="detail-item">
                <strong>Current Operation:</strong> {currentStep}
              </div>
              <div className="detail-item">
                <strong>Processing Mode:</strong> Anthropic Claude AI Analysis
              </div>
              <div className="detail-item">
                <strong>Data Security:</strong> All processing happens securely in real-time
              </div>
              <div className="detail-item">
                <strong>Expected Output:</strong> Insights, visualizations, and actionable recommendations
              </div>
            </div>
          )}
        </div>

        {/* Interactive Elements */}
        <div className="loading-actions">
          <button 
            className="cancel-button" 
            onClick={onCancel}
            title="Cancel analysis"
          >
            Cancel Analysis
          </button>
          
          <div className="loading-tips">
            <div className="tip-carousel">
              <div className="tip-item">
                <strong>Pro Tip:</strong> Ask follow-up questions to dive deeper into specific insights
              </div>
            </div>
          </div>
        </div>

        {/* Fun Facts Carousel */}
        <div className="fun-facts">
          <div className="fact-item">
            <div className="fact-icon">🚀</div>
            <span>Our AI can process thousands of data points in seconds</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StreamingLoadingView;