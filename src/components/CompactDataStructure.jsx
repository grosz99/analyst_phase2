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
      keyMetrics: [
        { name: "NCC", type: "$", isKey: true, description: "Primary profitability metric" },
        { name: "Timesheet_Charges", type: "$", isKey: true, description: "Billable revenue" },
        { name: "Adjustments", type: "$", isKey: true, description: "Revenue adjustments" }
      ],
      aggregationDimensions: [
        { name: "Month", type: "string", description: "Time-based analysis", priority: "high" },
        { name: "Office", type: "string", description: "Location-based grouping", priority: "high" },
        { name: "Region", type: "string", description: "Geographic aggregation", priority: "high" },
        { name: "Sector", type: "string", description: "Practice-based segmentation", priority: "medium" },
        { name: "Client", type: "string", description: "Client-level analysis", priority: "medium" },
        { name: "Project_ID", type: "string", description: "Project-level detail", priority: "low" }
      ],
      suggestions: [
        "Show me NCC trends by region",
        "Which offices had the highest adjustments?",
        "Compare sector performance this month"
      ]
    }
  };

  const structure = dataStructures[dataSource] || dataStructures.NCC;
  const totalFields = structure.keyMetrics.length + structure.aggregationDimensions.length;

  return (
    <div className="compact-data-structure">
      <div className="data-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-content">
          <span className="data-title">{structure.title}</span>
          <span className="field-count">({totalFields} fields)</span>
        </div>
        <div className="header-actions">
          <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {expanded && (
        <div className="data-content">
          <div className="data-grid">
            <div className="data-column">
              <h4 className="column-title">
                Key Metrics ({structure.keyMetrics.length})
                <span className="column-hint">Core financial measures for analysis</span>
              </h4>
              <ul className="field-list">
                {structure.keyMetrics.map((field, index) => (
                  <li key={index} className="field-item primary-field">
                    <span className="field-name">{field.name}</span>
                    <span className="field-type">({field.type})</span>
                    {field.name === "NCC" && <span className="key-indicator">PRIMARY KPI</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="data-column">
              <h4 className="column-title">
                Aggregation Dimensions ({structure.aggregationDimensions.length})
                <span className="column-hint">Group and segment data by these attributes</span>
              </h4>
              <ul className="field-list">
                {structure.aggregationDimensions.map((field, index) => (
                  <li key={index} className={`field-item ${field.priority === 'high' ? 'primary-field' : field.priority === 'medium' ? 'medium-field' : 'secondary-field'}`}>
                    <span className="field-name">{field.name}</span>
                    <span className="field-type">({field.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="suggestions-section">
            <div className="suggestions-header">
              <span className="suggestions-title">Try asking:</span>
            </div>
            <div className="suggestions-list">
              {structure.suggestions.map((suggestion, index) => (
                <div key={index} className="suggestion-item">
                  "{suggestion}"
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactDataStructure;