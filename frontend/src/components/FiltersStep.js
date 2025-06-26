import React, { useState, useEffect } from 'react';

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
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Select Filters</h1>
        <p className="text-gray-500 mt-2">Refine your dataset by applying filters. This is optional.</p>
      </div>

      {categoricalFields.length > 0 ? (
        <div className="max-w-4xl mx-auto">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {categoricalFields.map(field => (
                <button
                  key={field.name}
                  onClick={() => setActiveTab(field.name)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === field.name
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {field.name}
                </button>
              ))}
            </nav>
          </div>

          {activeTab && (
            <div className="mt-6">
              <label htmlFor={activeTab} className="sr-only">{activeTab}</label>
              <select
                id={activeTab}
                name={activeTab}
                value={selectedFilters[activeTab] || ''}
                onChange={(e) => handleFilterChange(activeTab, e.target.value)}
                className="block w-full max-w-xs mx-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
              >
                <option value="">All {activeTab}</option>
                {activeFilterOptions.map(value => (
                  <option key={value} value={value}>{String(value)}</option>
                ))}
              </select>
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Filters</h3>
              <div className="flex flex-wrap gap-3">
                {activeFilters.map(([filter, value]) => (
                  <div key={filter} className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                    <span className="text-sm font-semibold text-gray-600">{filter}:</span>
                    <span className="ml-2 text-sm text-gray-800">{value}</span>
                    <button 
                      onClick={() => handleFilterChange(filter, '')}
                      className="ml-3 text-gray-500 hover:text-red-600 transition-colors"
                      aria-label={`Remove ${filter} filter`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">No available filters for the selected data source.</p>
      )}
    </div>
  );
};

export default FiltersStep;
