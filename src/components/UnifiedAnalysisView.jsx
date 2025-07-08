import React, { useState, useEffect, useRef } from 'react';
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
  // Backend selection state
  const [selectedBackend, setSelectedBackend] = useState('anthropic');
  const [availableBackends, setAvailableBackends] = useState([]);
  const [aiServiceStatus, setAiServiceStatus] = useState(null);
  
  // Initialize AI service
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Check AI service status
        const status = await aiAnalysisService.getStatus();
        setAiServiceStatus(status);
        
        // Load available backends
        const backends = await aiAnalysisService.getAvailableBackends();
        setAvailableBackends(backends);
        
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        // Set fallback backends so user can still select
        setAvailableBackends([
          {
            id: 'anthropic',
            name: 'Anthropic Claude',
            description: 'Advanced AI analysis with custom pandas execution',
            features: ['Natural language understanding', 'Python code generation'],
            status: 'available'
          },
          {
            id: 'cortex_analyst',
            name: 'Snowflake Cortex Analyst',
            description: 'Native Snowflake AI analyst with semantic model understanding',
            features: ['SQL generation', 'Semantic model integration'],
            status: 'available'
          }
        ]);
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
        {/* Data Preview */}
        <DataPreview 
          previewData={previewData || initialData?.slice(0, 5)} 
          totalRows={initialData?.length} 
          onExport={handleExportData} 
        />

        {/* Backend Selection */}
        {availableBackends.length > 0 && (
          <div className="backend-selector">
            <div className="selector-header">
              <h4>🤖 Choose AI Backend</h4>
              <p>Select the AI engine for your data analysis</p>
            </div>
            <div className="backend-options">
              {availableBackends.map((backend) => (
                <div
                  key={backend.id}
                  className={`backend-option ${selectedBackend === backend.id ? 'selected' : ''} ${backend.status !== 'available' ? 'disabled' : ''}`}
                  onClick={() => backend.status === 'available' && setSelectedBackend(backend.id)}
                >
                  <div className="backend-info">
                    <div className="backend-name">
                      {backend.name}
                      {backend.status !== 'available' && <span className="status-badge unavailable">Unavailable</span>}
                      {selectedBackend === backend.id && <span className="status-badge selected">Selected</span>}
                    </div>
                    <div className="backend-description">{backend.description}</div>
                    <div className="backend-features">
                      {backend.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="feature-tag">{feature}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Manager - New unified interface */}
        <ConversationManager
          initialData={initialData}
          cachedDataset={cachedDataset}
          sessionId={sessionId}
          selectedBackend={selectedBackend}
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