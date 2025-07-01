import React, { useState, useEffect } from 'react';
import datasetService from '../services/datasetService.js';
import './FiltersStep.css';

const FiltersStep = ({ 
  selectedFilters, 
  setSelectedFilters, 
  availableFields, 
  selectedDataSource 
}) => {

  // Filter to categorical fields - more inclusive type checking
  const categoricalFields = availableFields.filter(field => {
    const fieldType = field.type ? field.type.toLowerCase() : '';
    return fieldType === 'string' || 
           fieldType === 'boolean' || 
           fieldType === 'date' ||
           fieldType === 'utf8'; // Snowflake sometimes uses utf8 for strings
  });

  // Debug logging
  console.log('FiltersStep - Available fields:', availableFields);
  console.log('FiltersStep - Categorical fields:', categoricalFields);
  console.log('FiltersStep - Selected data source:', selectedDataSource);
  const [activeTab, setActiveTab] = useState('');
  const [filterOptions, setFilterOptions] = useState({});
  const [loadingFilters, setLoadingFilters] = useState({});

  // Clear filter options when data source changes
  useEffect(() => {
    setFilterOptions({});
    setLoadingFilters({});
  }, [selectedDataSource]);

  useEffect(() => {
    if (categoricalFields.length > 0 && !activeTab) {
      setActiveTab(categoricalFields[0].name);
    } else if (categoricalFields.length > 0 && !categoricalFields.find(f => f.name === activeTab)) {
      // If the active tab is no longer a valid field (e.g., data source changed), reset it
      setActiveTab(categoricalFields[0].name);
    } else if (categoricalFields.length === 0) {
      setActiveTab('');
    }
  }, [categoricalFields, activeTab]);

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

  const loadFilterValues = async (fieldName) => {
    if (!selectedDataSource || !fieldName) return [];
    
    // Check if we already have cached values
    if (filterOptions[fieldName]) {
      return filterOptions[fieldName];
    }
    
    try {
      setLoadingFilters(prev => ({ ...prev, [fieldName]: true }));
      
      const datasetId = datasetService.mapDataSourceToId(selectedDataSource);
      const values = await datasetService.getSampleDataForFilters(datasetId, fieldName);
      
      // Cache the values
      setFilterOptions(prev => ({ ...prev, [fieldName]: values }));
      
      return values;
    } catch (error) {
      console.error(`Failed to load filter values for ${fieldName}:`, error);
      return [];
    } finally {
      setLoadingFilters(prev => ({ ...prev, [fieldName]: false }));
    }
  };
  
  // Load filter options when activeTab changes
  useEffect(() => {
    if (activeTab && selectedDataSource) {
      console.log(`Loading filter values for ${activeTab} in ${selectedDataSource}`);
      loadFilterValues(activeTab);
    }
  }, [activeTab, selectedDataSource]);

  const activeFilterOptions = filterOptions[activeTab] || [];
  const isLoadingActiveFilter = loadingFilters[activeTab] || false;
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
                        disabled={isLoadingActiveFilter}
                    >
                        <option value="" disabled hidden>
                          {isLoadingActiveFilter ? 'Loading options...' : 'Select a value'}
                        </option>
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
        <div className="text-center text-gray-500">
        <p>No available filters for the selected data source.</p>
        <p className="text-sm">Available fields: {availableFields.length}</p>
        <p className="text-sm">Field types: {availableFields.map(f => f.type).join(', ')}</p>
      </div>
      )}
    </div>
  );
};

export default FiltersStep;
