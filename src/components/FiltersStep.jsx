import React, { useState, useEffect } from 'react';
import datasetService from '../services/datasetService.js';
import DateRangeFilter from './DateRangeFilter.jsx';
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
    const isCategorial = fieldType === 'string' || 
           fieldType === 'boolean' || 
           fieldType === 'date' ||
           fieldType === 'utf8'; // Snowflake sometimes uses utf8 for strings
    
    // For NCC data source, exclude month field as it's handled by date range
    if (selectedDataSource === 'NCC' && field.name.toLowerCase() === 'month') {
      return false;
    }
    
    return isCategorial;
  });

  // Debug logging
  console.log('FiltersStep - Available fields:', availableFields);
  console.log('FiltersStep - Categorical fields:', categoricalFields);
  console.log('FiltersStep - Selected data source:', selectedDataSource);
  const [selectedField, setSelectedField] = useState('');
  const [filterOptions, setFilterOptions] = useState({});
  const [loadingFilters, setLoadingFilters] = useState({});
  const [estimatedRows, setEstimatedRows] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Clear filter options when data source changes
  useEffect(() => {
    setFilterOptions({});
    setLoadingFilters({});
  }, [selectedDataSource]);

  // Auto-select first field if none selected
  useEffect(() => {
    if (categoricalFields.length > 0 && !selectedField) {
      setSelectedField(categoricalFields[0].name);
    } else if (categoricalFields.length > 0 && !categoricalFields.find(f => f.name === selectedField)) {
      setSelectedField(categoricalFields[0].name);
    } else if (categoricalFields.length === 0) {
      setSelectedField('');
    }
  }, [categoricalFields, selectedField]);

  const handleFilterChange = (field, value, isChecked) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      
      if (!newFilters[field]) {
        newFilters[field] = [];
      }
      
      if (isChecked) {
        // Add value to array if not already present
        if (!newFilters[field].includes(value)) {
          newFilters[field] = [...newFilters[field], value];
        }
      } else {
        // Remove value from array
        newFilters[field] = newFilters[field].filter(v => v !== value);
        
        // Remove field entirely if no values selected
        if (newFilters[field].length === 0) {
          delete newFilters[field];
        }
      }
      
      return newFilters;
    });
  };
  
  const removeFilter = (field, value = null) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      
      if (value === null) {
        // Remove entire field
        delete newFilters[field];
      } else {
        // Remove specific value
        if (newFilters[field]) {
          newFilters[field] = newFilters[field].filter(v => v !== value);
          if (newFilters[field].length === 0) {
            delete newFilters[field];
          }
        }
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
  
  // Load filter options when selectedField changes
  useEffect(() => {
    if (selectedField && selectedDataSource) {
      console.log(`Loading filter values for ${selectedField} in ${selectedDataSource}`);
      loadFilterValues(selectedField);
    }
  }, [selectedField, selectedDataSource]);
  
  // Estimate row count based on current filters
  useEffect(() => {
    const updateRowEstimate = async () => {
      if (!selectedDataSource) return;
      
      try {
        const datasetId = datasetService.mapDataSourceToId(selectedDataSource);
        const response = await fetch(`${datasetService.baseURL}/api/available-datasets`);
        const result = await response.json();
        
        if (result.success) {
          const dataset = result.datasets.find(ds => ds.id === datasetId);
          if (dataset) {
            // Rough estimate: reduce by 10% for each filter applied
            const filterCount = Object.keys(selectedFilters).length;
            const reductionFactor = Math.pow(0.7, filterCount); // More aggressive reduction
            const estimated = Math.round(dataset.row_count * reductionFactor);
            setEstimatedRows(estimated);
          }
        }
      } catch (error) {
        console.error('Failed to estimate rows:', error);
      }
    };
    
    updateRowEstimate();
  }, [selectedFilters, selectedDataSource]);

  const activeFilterOptions = filterOptions[selectedField] || [];
  const isLoadingActiveFilter = loadingFilters[selectedField] || false;
  const activeFilters = Object.entries(selectedFilters).flatMap(([field, values]) => {
    // Skip date range fields for custom display
    if (field === 'from_reporting_date' || field === 'to_reporting_date') {
      return [];
    }
    return Array.isArray(values) ? values.map(value => ({ field, value })) : [{ field, value: values }];
  });

  // Handle date range changes for NCC
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
    
    // Update the selectedFilters with date range
    if (selectedDataSource === 'NCC' && newDateRange) {
      setSelectedFilters(prev => ({
        ...prev,
        from_reporting_date: {
          year: newDateRange.from.year,
          month: newDateRange.from.month,
          week: newDateRange.from.week
        },
        to_reporting_date: {
          year: newDateRange.to.year,
          month: newDateRange.to.month,
          week: newDateRange.to.week
        }
      }));
    }
  };

  return (
    <div className="filters-step-container">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Filter Your Data</h1>
        <p className="text-gray-500 mt-2">Select filters to reduce your dataset for optimal analysis performance.</p>
      </div>
      
      {/* Date Range Filter for NCC */}
      {selectedDataSource === 'NCC' && (
        <DateRangeFilter 
          onDateRangeChange={handleDateRangeChange}
          selectedDataSource={selectedDataSource}
        />
      )}
      
      {/* Row Count and Performance Guidance */}
      {estimatedRows !== null && (
        <div className="row-count-guidance">
          <div className="row-count-display">
            <span className="row-count-number">{estimatedRows.toLocaleString()}</span>
            <span className="row-count-label">estimated rows</span>
          </div>
          <div className="performance-guidance">
            {estimatedRows > 50000 ? (
              <div className="guidance warning">
                ⚠️ Consider adding more filters to improve analysis performance
              </div>
            ) : estimatedRows > 10000 ? (
              <div className="guidance caution">
                💡 Good dataset size for analysis
              </div>
            ) : (
              <div className="guidance optimal">
                ✅ Optimal dataset size for fast analysis
              </div>
            )}
          </div>
        </div>
      )}

      {categoricalFields.length > 0 ? (
        <div className="filters-layout">
          {/* Left Panel - Filter Fields */}
          <div className="filter-fields-panel">
            <h3 className="panel-title">Available Filters</h3>
            <div className="filter-fields-list">
              {categoricalFields.map(field => {
                const hasFilters = selectedFilters[field.name] && selectedFilters[field.name].length > 0;
                return (
                  <button
                    key={field.name}
                    onClick={() => setSelectedField(field.name)}
                    className={`filter-field-button ${
                      selectedField === field.name ? 'active' : ''
                    } ${hasFilters ? 'has-filters' : ''}`}
                  >
                    <div className="field-name">{field.name}</div>
                    {hasFilters && (
                      <div className="filter-count">
                        {selectedFilters[field.name].length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Filter Values */}
          <div className="filter-values-panel">
            {selectedField && (
              <>
                <h3 className="panel-title">
                  {selectedField} Values
                  {isLoadingActiveFilter && <span className="loading-indicator">Loading...</span>}
                </h3>
                <div className="filter-values-container">
                  {isLoadingActiveFilter ? (
                    <div className="loading-state">Loading filter options...</div>
                  ) : (
                    <div className="filter-values-list">
                      {activeFilterOptions.map(value => {
                        const isChecked = selectedFilters[selectedField]?.includes(value) || false;
                        return (
                          <label key={value} className="filter-value-option">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleFilterChange(selectedField, value, e.target.checked)}
                              className="filter-checkbox"
                            />
                            <span className="filter-value-text">{String(value)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="no-filters-message">
          <p>No available filters for the selected data source.</p>
          <p className="text-sm">Available fields: {availableFields.length}</p>
          <p className="text-sm">Field types: {availableFields.map(f => f.type).join(', ')}</p>
        </div>
      )}

      {/* Active Filters Display */}
      {(activeFilters.length > 0 || (selectedDataSource === 'NCC' && dateRange)) && (
        <div className="active-filters-display">
          <h3 className="active-filters-title">
            Active Filters ({activeFilters.length + (dateRange && selectedDataSource === 'NCC' ? 1 : 0)}):
          </h3>
          <div className="active-filters-list">
            {/* Show date range for NCC */}
            {selectedDataSource === 'NCC' && dateRange && (
              <div className="active-filter-chip date-range-chip">
                <span><strong>Date Range:</strong> {dateRange.fromFormatted} to {dateRange.toFormatted}</span>
                <button 
                  onClick={() => {
                    setDateRange(null);
                    setSelectedFilters(prev => {
                      const newFilters = { ...prev };
                      delete newFilters.from_reporting_date;
                      delete newFilters.to_reporting_date;
                      return newFilters;
                    });
                  }} 
                  title="Remove date range filter"
                >
                  &times;
                </button>
              </div>
            )}
            
            {activeFilters.map(({ field, value }, index) => (
              <div key={`${field}-${value}-${index}`} className="active-filter-chip">
                <span><strong>{field}:</strong> {value}</span>
                <button 
                  onClick={() => removeFilter(field, value)} 
                  title={`Remove ${field}: ${value} filter`}
                >
                  &times;
                </button>
              </div>
            ))}
            <button 
              className="clear-all-filters"
              onClick={() => {
                setSelectedFilters({});
                setDateRange(null);
              }}
              title="Clear all filters"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersStep;