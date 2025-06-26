import React, { useState, useEffect } from 'react';
import './FiltersStep.css';

const FiltersStep = ({ 
  selectedFilters, 
  setSelectedFilters, 
  availableFields, 
  mockDataPreviews, 
  selectedDataSource 
}) => {

  const categoricalFields = availableFields.filter(field => field.type === 'string' || field.type === 'boolean');
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (categoricalFields.length > 0 && !activeTab) {
      setActiveTab(categoricalFields[0].name);
    } else if (categoricalFields.length > 0 && !categoricalFields.find(f => f.name === activeTab)) {
      // If the active tab is no longer a valid field (e.g., data source changed), reset it
      setActiveTab(categoricalFields[0].name);
    } else if (categoricalFields.length === 0) {
      setActiveTab('');
    }
  }, [categoricalFields, activeTab, selectedDataSource]);

  const handleFilterChange = (field, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      if (value === '') {
        delete newFilters[field];
      } else {
        newFilters[field] = value;
      }
      return newFilters;
    });
  };

  const getUniqueValues = (fieldName) => {
    if (!selectedDataSource || !mockDataPreviews[selectedDataSource] || !fieldName) return [];
    const data = mockDataPreviews[selectedDataSource];
    const values = data.map(row => row[fieldName]);
    return [...new Set(values)].sort();
  };

  const activeFilterOptions = getUniqueValues(activeTab);
  const activeFilters = Object.entries(selectedFilters);

  return (
    <div className="filters-step-container">
      {categoricalFields.length > 0 ? (
        <>
          <div className="filter-tabs">
            {categoricalFields.map(field => (
              <button
                key={field.name}
                onClick={() => setActiveTab(field.name)}
                className={`filter-tab ${activeTab === field.name ? 'active' : ''}`}
              >
                {field.name.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab && (
            <div className="filter-dropdown-container">
                <div className="filter-input-wrapper">
                    <label htmlFor={activeTab} className="filter-dropdown-label">{activeTab}</label>
                    <select
                        id={activeTab}
                        name={activeTab}
                        value={selectedFilters[activeTab] || ''}
                        onChange={(e) => handleFilterChange(activeTab, e.target.value)}
                        className="filter-dropdown"
                    >
                        <option value="" disabled hidden></option>
                        {activeFilterOptions.map(value => (
                        <option key={value} value={value}>{String(value)}</option>
                        ))}
                    </select>
                </div>
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="active-filters-display">
              <h3 className="active-filters-title">Active Filters:</h3>
              <div className="active-filters-list">
                {activeFilters.map(([filter, value]) => (
                  <div key={filter} className="active-filter-chip">
                    <span><strong>{filter}:</strong> {value}</span>
                    <button onClick={() => handleFilterChange(filter, '')} title={`Remove ${filter} filter`}>&times;</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500">No available filters for the selected data source.</p>
      )}
    </div>
  );
};

export default FiltersStep;
