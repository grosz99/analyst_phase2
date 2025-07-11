import React from 'react';
import './Header.css';

const Header = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Data Sources' },
    { id: 2, name: 'Filters' },
    { id: 3, name: 'Analysis' },
  ];

  // Direct mapping since we now have 3 app steps matching 3 header steps
  const getActiveHeaderStep = (appStep) => {
    return appStep; // 1:1 mapping: Data Sources -> Filters -> Analysis
  };
  const activeHeaderStep = getActiveHeaderStep(currentStep);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-container">
          <img src="/logo.svg" alt="BCG" className="bcg-logo" />
          <h1 className="logo-text">Beacon</h1>
        </div>
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
