import React, { useState } from 'react';
import './ColumnSelectionStep.css';

const ColumnSelectionStep = ({
  availableFields,
  selectedDimensions,
  setSelectedDimensions,
  selectedMetrics,
  setSelectedMetrics
}) => {
  const [activeTab, setActiveTab] = useState('dimensions');

  const handleDimensionToggle = (field) => {
    if (selectedDimensions.includes(field.name)) {
      setSelectedDimensions(selectedDimensions.filter(d => d !== field.name));
    } else {
      setSelectedDimensions([...selectedDimensions, field.name]);
    }
  };
  
  const handleMetricToggle = (field) => {
    if (selectedMetrics.includes(field.name)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== field.name));
    } else {
      setSelectedMetrics([...selectedMetrics, field.name]);
    }
  };

  const dimensionFields = availableFields.filter(field => 
    field.type === 'string' || field.type === 'date' || field.type === 'boolean'
  );
  
  const metricFields = availableFields.filter(field => 
    field.type === 'number' || field.type === 'integer'
  );

  const renderFieldList = (fields, selectedFields, onToggle) => (
    <div className="field-list-panel">
      <div className="field-list-header">
        <span>Field Name</span>
        <span>Type</span>
      </div>
      <div className="field-list-body">
        {fields.length > 0 ? (
          fields.map((field) => {
            const isSelected = selectedFields.includes(field.name);
            return (
              <div
                key={field.name}
                onClick={() => onToggle(field)}
                className={`field-row ${isSelected ? 'selected' : ''}`}>
                <p className={`font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-800'}`}>{field.name}</p>
                <p className={`text-sm ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>{field.type}</p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 p-6 text-center">No fields available for this category.</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Select Columns for Analysis</h1>
        <p className="text-gray-500 mt-2">Choose the dimensions and metrics you want to analyze.</p>
      </div>

      <div className="tabs-container">
        <div className={`tab ${activeTab === 'dimensions' ? 'active' : ''}`} onClick={() => setActiveTab('dimensions')}>
          Dimensions ({selectedDimensions.length})
        </div>
        <div className={`tab ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>
          Metrics ({selectedMetrics.length})
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'dimensions' && (
          <div>
            <p className="text-sm text-gray-600 mb-3">Categorical fields to group your data (e.g., Region, Product).</p>
            {renderFieldList(dimensionFields, selectedDimensions, handleDimensionToggle)}
          </div>
        )}
        {activeTab === 'metrics' && (
          <div>
            <p className="text-sm text-gray-600 mb-3">Numerical fields for measurement (e.g., Sales, Revenue).</p>
            {renderFieldList(metricFields, selectedMetrics, handleMetricToggle)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnSelectionStep;

