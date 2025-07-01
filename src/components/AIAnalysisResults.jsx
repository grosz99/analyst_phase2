import React, { useState } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import './AIAnalysisResults.css';

const AIAnalysisResults = ({ 
  analysisResult, 
  originalData, 
  question, 
  onNewAnalysis,
  isLoading = false 
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [exportLoading, setExportLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="ai-analysis-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">
          <h3>🤖 AI Analysis in Progress...</h3>
          <p>Analyzing your data to generate insights</p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="ai-analysis-placeholder">
        <div className="placeholder-content">
          <h3>📊 Ready for AI Analysis</h3>
          <p>Ask a question about your data to get AI-powered insights</p>
        </div>
      </div>
    );
  }

  if (!analysisResult.success) {
    return (
      <div className="ai-analysis-error">
        <div className="error-content">
          <h3>❌ Analysis Error</h3>
          <p>{analysisResult.error}</p>
          <button onClick={onNewAnalysis} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { analysis, parsedAnalysis, metadata } = analysisResult;

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analysis_${question?.replace(/[^a-zA-Z0-9]/g, '_') || 'data'}_${timestamp}`;
      
      if (format === 'csv') {
        aiAnalysisService.exportToCSV(originalData, filename);
      } else if (format === 'json') {
        aiAnalysisService.exportToJSON(originalData, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const renderDataTable = () => {
    if (!originalData || originalData.length === 0) return null;

    const headers = Object.keys(originalData[0]);
    const displayData = originalData.slice(0, 50); // Show first 50 rows

    return (
      <div className="data-table-container">
        <div className="table-header">
          <h4>📋 Data Table ({originalData.length} rows)</h4>
          <div className="export-buttons">
            <button 
              onClick={() => handleExport('csv')} 
              disabled={exportLoading}
              className="export-btn export-csv"
            >
              {exportLoading ? '⏳' : '📊'} Export CSV
            </button>
            <button 
              onClick={() => handleExport('json')} 
              disabled={exportLoading}
              className="export-btn export-json"
            >
              {exportLoading ? '⏳' : '📄'} Export JSON
            </button>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map(header => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, index) => (
                <tr key={index}>
                  {headers.map(header => (
                    <td key={header}>
                      {formatCellValue(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {originalData.length > 50 && (
          <div className="table-footer">
            Showing first 50 rows of {originalData.length} total rows
          </div>
        )}
      </div>
    );
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Format large numbers with commas
      if (value > 1000) {
        return value.toLocaleString();
      }
      // Format decimals to 2 places
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
    }
    return String(value);
  };

  const renderInsightsList = (items, icon = '•') => {
    if (!items || items.length === 0) return <p className="no-items">No insights available</p>;
    
    return (
      <ul className="insights-list">
        {items.map((item, index) => (
          <li key={index} className="insight-item">
            <span className="insight-icon">{icon}</span>
            <span className="insight-text">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderVisualization = () => {
    // Simple data summary visualization
    if (!originalData || originalData.length === 0) return null;

    const numericColumns = Object.keys(originalData[0]).filter(key => 
      typeof originalData[0][key] === 'number' && originalData[0][key] !== null
    );

    if (numericColumns.length === 0) return <p>No numeric data for visualization</p>;

    const stats = numericColumns.map(column => {
      const values = originalData.map(row => row[column]).filter(val => val !== null && !isNaN(val));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      return {
        column,
        count: values.length,
        sum: sum,
        average: avg,
        max: max,
        min: min
      };
    });

    return (
      <div className="visualization-container">
        <h4>📈 Data Summary</h4>
        <div className="stats-grid">
          {stats.map(stat => (
            <div key={stat.column} className="stat-card">
              <h5>{stat.column}</h5>
              <div className="stat-values">
                <div className="stat-item">
                  <span className="stat-label">Average:</span>
                  <span className="stat-value">{stat.average.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Max:</span>
                  <span className="stat-value">{stat.max.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Min:</span>
                  <span className="stat-value">{stat.min.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{stat.sum.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="ai-analysis-results">
      {/* Header */}
      <div className="analysis-header">
        <div className="analysis-question">
          <h3>🤖 AI Analysis Results</h3>
          {question && <p className="question-text">"{question}"</p>}
        </div>
        <div className="analysis-metadata">
          {metadata && (
            <div className="metadata-badges">
              <span className="metadata-badge">
                📊 {metadata.data_rows} rows analyzed
              </span>
              <span className="metadata-badge">
                ⏱️ {metadata.total_duration}ms
              </span>
              <span className="metadata-badge">
                🧠 {metadata.model}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analysis-tabs">
        <button 
          className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          💡 Key Insights
        </button>
        <button 
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          🎯 Recommendations
        </button>
        <button 
          className={`tab ${activeTab === 'visualization' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          📊 Visualization
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          📋 Data Table
        </button>
        <button 
          className={`tab ${activeTab === 'full' ? 'active' : ''}`}
          onClick={() => setActiveTab('full')}
        >
          📄 Full Analysis
        </button>
      </div>

      {/* Tab Content */}
      <div className="analysis-content">
        {activeTab === 'insights' && (
          <div className="insights-tab">
            <div className="insights-section">
              <h4>🔍 Key Findings</h4>
              {renderInsightsList(parsedAnalysis?.keyInsights, '🔍')}
            </div>
            
            {parsedAnalysis?.trends && parsedAnalysis.trends.length > 0 && (
              <div className="insights-section">
                <h4>📈 Trends & Patterns</h4>
                {renderInsightsList(parsedAnalysis.trends, '📈')}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-tab">
            <h4>🎯 Business Recommendations</h4>
            {renderInsightsList(parsedAnalysis?.recommendations, '🎯')}
            
            {parsedAnalysis?.dataQuality && parsedAnalysis.dataQuality.length > 0 && (
              <div className="quality-section">
                <h4>⚠️ Data Quality Notes</h4>
                {renderInsightsList(parsedAnalysis.dataQuality, '⚠️')}
              </div>
            )}
          </div>
        )}

        {activeTab === 'visualization' && (
          <div className="visualization-tab">
            {renderVisualization()}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="data-tab">
            {renderDataTable()}
          </div>
        )}

        {activeTab === 'full' && (
          <div className="full-analysis-tab">
            <div className="full-analysis-content">
              <pre className="analysis-text">{analysis}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="analysis-actions">
        <button onClick={onNewAnalysis} className="new-analysis-btn">
          🔄 New Analysis
        </button>
      </div>
    </div>
  );
};

export default AIAnalysisResults;