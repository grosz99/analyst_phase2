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
          📊 Your Data Awaits {isExpanded ? '▼' : '▶'} 
        </button>
        {isExpanded && (
          <div className="preview-content">
            <p className="placeholder-text">Load your data to get started with AI-powered analysis.</p>
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
          🚀 Ready to Analyze Your Data {isExpanded ? '▼' : '▶'}
        </button>
        {isExpanded && (
          <div className="preview-actions">
            <button onClick={() => onExport('csv')} className="export-btn">
              📊 Export CSV
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

      <div className="content-area">
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