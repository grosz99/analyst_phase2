import React, { useState, useEffect } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import ConversationManager from './ConversationManager.jsx';
import ResultsTable from './ResultsTable.jsx';
import './UnifiedAnalysisView.css';

const DataPreview = ({ previewData, totalRows, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!previewData || previewData.length === 0) {
    return (
      <div className="data-preview-container">
        <button 
          className="preview-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          📊 Data Preview {isExpanded ? '▼' : '▶'} 
        </button>
        {isExpanded && (
          <div className="preview-content">
            <p className="placeholder-text">No data available for preview.</p>
          </div>
        )}
      </div>
    );
  }

  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="data-preview-container">
      <div className="preview-header">
        <button 
          className="preview-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          📊 Data Preview ({totalRows || previewData.length} rows) {isExpanded ? '▼' : '▶'}
        </button>
        {isExpanded && (
          <div className="preview-actions">
            <button onClick={() => onExport('csv')} className="export-btn">
              📊 Export CSV
            </button>
            <button onClick={() => onExport('json')} className="export-btn">
              📄 Export JSON
            </button>
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="preview-content">
          <ResultsTable data={previewData.slice(0, 5)} headers={headers} />
          {totalRows > 5 && (
            <p className="preview-note">Showing first 5 rows of {totalRows} total rows</p>
          )}
        </div>
      )}
    </div>
  );
};

// Mock regional access permissions for security demonstration
const UserPermissions = ({ previewData, selectedDataSource }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Mock regional permissions based on data source
  const getAccessibleRegions = () => {
    // Different regions accessible per data source
    const dataSourcePermissions = {
      'ORDERS': [
        { region: 'North America', access: 'Full Access', color: '#16a34a' },
        { region: 'Asia Pacific', access: 'Full Access', color: '#16a34a' }
      ],
      'CUSTOMERS': [
        { region: 'North America', access: 'Full Access', color: '#16a34a' },
        { region: 'EMESA', access: 'Read Only', color: '#eab308' },
        { region: 'Asia Pacific', access: 'Full Access', color: '#16a34a' }
      ],
      'PRODUCTS': [
        { region: 'North America', access: 'Full Access', color: '#16a34a' }
      ]
    };
    
    // Default permissions if no specific data source
    const defaultPermissions = [
      { region: 'North America', access: 'Full Access', color: '#16a34a' },
      { region: 'EMESA', access: 'Read Only', color: '#eab308' }
    ];
    
    return dataSourcePermissions[selectedDataSource] || defaultPermissions;
  };

  const accessibleRegions = getAccessibleRegions();

  // Only show if we have data
  if (!previewData || previewData.length === 0) {
    return null;
  }

  return (
    <div className="data-preview-container" style={{ marginBottom: '16px' }}>
      <button 
        className="preview-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderColor: '#0ea5e9' }}
      >
        🔒 Your Regional Access Permissions {isExpanded ? '▼' : '▶'}
      </button>
      {isExpanded && (
        <div className="preview-content">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            padding: '8px 0'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#64748b', 
              fontSize: '14px',
              marginBottom: '8px'
            }}>
              You have access to the following regions{selectedDataSource ? ` for ${selectedDataSource}` : ''}:
            </p>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px' 
            }}>
              {accessibleRegions.map((permission, index) => (
                <div
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: permission.color + '20',
                    color: permission.color,
                    border: `1px solid ${permission.color}40`,
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>✓</span>
                  {permission.region} ({permission.access})
                </div>
              ))}
            </div>
            <p style={{ 
              margin: 0, 
              color: '#9ca3af', 
              fontSize: '12px',
              fontStyle: 'italic',
              marginTop: '8px'
            }}>
              Last updated: {new Date().toLocaleDateString()} • Contact security team to modify access
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

function UnifiedAnalysisView({ 
  initialData, 
  cachedDataset, 
  dataLoadedTimestamp, 
  previewData, 
  datasetInfo, 
  sessionId, 
  selectedFilters, 
  selectedDataSource, 
  onReset 
}) {
  const [aiServiceStatus, setAiServiceStatus] = useState(null);
  
  // Initialize AI service
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Check AI service status
        const status = await aiAnalysisService.getStatus();
        setAiServiceStatus(status);
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };

    initializeAI();
  }, [initialData]);

  // Handle export data
  const handleExportData = async (format) => {
    const dataToExport = cachedDataset || initialData;
    
    if (!dataToExport || dataToExport.length === 0) {
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `dataset_${timestamp}`;
      
      if (format === 'csv') {
        aiAnalysisService.exportToCSV(dataToExport, filename);
      } else if (format === 'json') {
        aiAnalysisService.exportToJSON(dataToExport, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="unified-analysis-view">
      {/* Dataset Info Bar */}
      <div className="dataset-info-bar">
        <span className="dataset-status">
          {cachedDataset ? '⚡ Data Cached in Memory' : '✅ AI Analysis Ready'}
        </span>
        <span className="dataset-details">
          {cachedDataset 
            ? `${cachedDataset.length} rows cached • Loaded ${dataLoadedTimestamp ? new Date(dataLoadedTimestamp).toLocaleTimeString() : 'now'}`
            : datasetInfo
          }
        </span>
      </div>

      <div className="content-area">
        {/* Security Permissions */}
        <UserPermissions previewData={previewData || initialData} selectedDataSource={selectedDataSource} />
        
        {/* Data Preview */}
        <DataPreview 
          previewData={previewData || initialData?.slice(0, 5)} 
          totalRows={initialData?.length} 
          onExport={handleExportData} 
        />


        {/* Conversation Manager - New unified interface */}
        <ConversationManager
          initialData={initialData}
          cachedDataset={cachedDataset}
          sessionId={sessionId}
          datasetInfo={datasetInfo}
          selectedFilters={selectedFilters}
        />

        {/* Service Unavailable Message */}
        {aiServiceStatus && !aiServiceStatus.success && (
          <div className="service-unavailable">
            <div className="unavailable-content">
              <h3>🚧 AI Analysis Temporarily Unavailable</h3>
              <p>The AI analysis service is currently unavailable. You can still:</p>
              <ul>
                <li>📊 View and export your data</li>
                <li>📋 Download the dataset in CSV or JSON format</li>
                <li>🔄 Try refreshing the page</li>
              </ul>
              <p className="service-error">Error: {aiServiceStatus.error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnifiedAnalysisView;