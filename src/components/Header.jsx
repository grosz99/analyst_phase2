import React from 'react';
import './Header.css';

const Header = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Data Sources' },
    { id: 2, name: 'Filters & Columns' },
    { id: 3, name: 'Analysis' },
  ];

  // Maps the 4 app steps to the 3 header steps for accurate display
  const getActiveHeaderStep = (appStep) => {
    if (appStep <= 1) return 1; // App step 1 (Data Sources) -> Header step 1
    if (appStep === 2 || appStep === 3) return 2; // App steps 2 (Filters) & 3 (Columns) -> Header step 2
    return 3; // App step 4 (Analysis) -> Header step 3
  };
  const activeHeaderStep = getActiveHeaderStep(currentStep);

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="logo-text">Beacon</h1>
        <div className="step-indicator-container">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`step ${activeHeaderStep >= step.id ? 'active' : ''}`}>
                <div className="step-number">{step.id}</div>
                <div className="step-name">{step.name}</div>
              </div>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
