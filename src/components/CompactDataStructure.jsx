import React, { useState } from 'react';
import './CompactDataStructure.css';

const CompactDataStructure = ({ 
  dataSource = "NCC",
  fieldCounts = { string: 6, number: 3 },
  isCollapsed = false
}) => {
  const [expanded, setExpanded] = useState(!isCollapsed);

  const dataStructures = {
    NCC: {
      title: "NCC Data Structure",
      description: "Net Cash Contribution financial data",
      metrics: [
        { name: "NCC", type: "$", description: "Key KPI - Net Cash Contribution" },
        { name: "Timesheet_Charges", type: "$", description: "Revenue component" },
        { name: "Adjustments", type: "$", description: "Variance component" }
      ],
      dimensions: [
        { name: "Month", type: "string", description: "Time period (2023-2024)" },
        { name: "Office", type: "string", description: "Location (15 offices)" },
        { name: "Region", type: "string", description: "Geographic area (4 regions)" },
        { name: "Sector", type: "string", description: "Practice area (8 sectors)" },
        { name: "Client", type: "string", description: "Client name (250+ active)" },
        { name: "Project_ID", type: "string", description: "Unique identifier" }
      ],
      suggestions: [
        "Show me NCC trends by region",
        "Which offices had the highest adjustments?",
        "Compare sector performance this month"
      ]
    }
  };

  const structure = dataStructures[dataSource] || dataStructures.NCC;
  const totalFields = structure.metrics.length + structure.dimensions.length;

  return (
    <div className="compact-data-structure">
      <div className="data-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-content">
          <span className="data-icon">📊</span>
          <span className="data-title">{structure.title}</span>
          <span className="field-count">({totalFields} fields)</span>
        </div>
        <div className="header-actions">
          <button className="sample-data-btn">View Sample Data →</button>
          <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {expanded && (
        <div className="data-content">
          <div className="data-grid">
            <div className="data-column">
              <h4 className="column-title">
                Financial Metrics ({structure.metrics.length})
                <span className="column-hint">Ask about: trends, performance, variances</span>
              </h4>
              <ul className="field-list">
                {structure.metrics.map((field, index) => (
                  <li key={index} className="field-item primary-field">
                    <span className="field-name">{field.name}</span>
                    <span className="field-type">({field.type})</span>
                    {field.name === "NCC" && <span className="key-indicator">KEY KPI</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="data-column">
              <h4 className="column-title">
                Dimensions ({structure.dimensions.length})
                <span className="column-hint">Ask about: breakdowns, comparisons, segments</span>
              </h4>
              <ul className="field-list">
                {structure.dimensions.map((field, index) => (
                  <li key={index} className={`field-item ${index < 3 ? 'primary-field' : 'secondary-field'}`}>
                    <span className="field-name">{field.name}</span>
                    <span className="field-type">({field.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="suggestions-section">
            <div className="suggestions-header">
              <span className="suggestions-icon">💡</span>
              <span className="suggestions-title">Try asking:</span>
            </div>
            <div className="suggestions-list">
              {structure.suggestions.map((suggestion, index) => (
                <button 
                  key={index} 
                  className="suggestion-btn"
                  onClick={() => {
                    // Emit event for parent component to handle
                    const event = new CustomEvent('suggestedQuestion', { 
                      detail: suggestion 
                    });
                    window.dispatchEvent(event);
                  }}
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactDataStructure;