import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import './DataSourcesStep.css';

const DataSourcesStep = ({ mockDataSources, selectedDataSource, setSelectedDataSource, availableFields, isLoadingDataSources = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (source) => {
    setSelectedDataSource(source);
    setIsOpen(false);
  };

  const filteredFields = availableFields.filter(field => 
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="data-sources-container">
      {/* Left Panel */}
      <div className="panel data-source-selector">
        <h3 className="panel-title">Data Sources</h3>
        <p className="panel-subtitle">Select the data sources you want to explore.</p>
        <div className="custom-select-wrapper" ref={dropdownRef}>
          <div className="custom-select-display" onClick={() => !isLoadingDataSources && setIsOpen(!isOpen)}>
            {isLoadingDataSources ? (
              <span className="custom-select-placeholder">Loading data sources...</span>
            ) : selectedDataSource ? (
              <span className="custom-select-chip">{selectedDataSource}</span>
            ) : (
              <span className="custom-select-placeholder">Select Data Sources</span>
            )}
            {isLoadingDataSources ? (
              <div className="loading-spinner">⟳</div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`dropdown-arrow ${isOpen ? 'open' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            )}
          </div>
          {isOpen && !isLoadingDataSources && (
            <div className="custom-select-dropdown">
              {mockDataSources.length > 0 ? (
                mockDataSources.map(source => (
                  <div key={source} className="custom-select-option" onClick={() => handleSelect(source)}>
                    <div className="source-name">{source}</div>
                    <div className="source-type">Snowflake Table</div>
                  </div>
                ))
              ) : (
                <div className="custom-select-option disabled">
                  No data sources available
                </div>
              )}
            </div>
          )}
        </div>
        {selectedDataSource && (
            <p className="source-count">1 source selected</p>
        )}
      </div>

      {/* Right Panel */}
      <div className="panel available-fields">
        <h3 className="panel-title">Available Fields</h3>
        <p className="panel-subtitle">These fields are available from your selected data sources.</p>
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search fields..." 
            disabled={!selectedDataSource}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="fields-table-wrapper">
          <table className="fields-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {selectedDataSource && filteredFields.length > 0 ? (
                filteredFields.map(field => (
                  <tr key={field.name}>
                    <td>{field.name}</td>
                    <td>{field.type}</td>
                    <td>{field.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-fields-message">
                    {selectedDataSource ? 'No fields found.' : 'Select a data source to see available fields.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSourcesStep;
