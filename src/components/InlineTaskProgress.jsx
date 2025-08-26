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

  // Clean 4-stage progress messaging
  const getCurrentTask = () => {
    if (progress <= 20) return "Gathering data";
    if (progress <= 50) return "Applying data manipulation";
    if (progress <= 80) return "Finalizing logic";
    return "Preparing output";
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