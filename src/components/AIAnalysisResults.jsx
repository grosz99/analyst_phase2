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

  const { analysis, metadata, results_table, visualization } = analysisResult;

  const handleExportResults = async (format) => {
    if (!results_table?.data) return;
    
    try {
      setExportLoading(true);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analysis_results_${question?.replace(/[^a-zA-Z0-9]/g, '_') || 'data'}_${timestamp}`;
      
      if (format === 'csv') {
        aiAnalysisService.exportToCSV(results_table.data, filename);
      } else if (format === 'json') {
        aiAnalysisService.exportToJSON(results_table.data, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const renderResultsTable = () => {
    if (!results_table || !results_table.data || results_table.data.length === 0) {
      return <p className="no-items">No analysis results available</p>;
    }

    const { title, columns, data, total_rows } = results_table;

    return (
      <div className="data-table-container">
        <div className="table-header">
          <h4>📊 {title} ({total_rows} results)</h4>
          <div className="export-buttons">
            <button 
              onClick={() => handleExportResults('csv')} 
              disabled={exportLoading}
              className="export-btn export-csv"
            >
              {exportLoading ? '⏳' : '📊'} Export CSV
            </button>
            <button 
              onClick={() => handleExportResults('json')} 
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
                {columns.map(column => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {columns.map(column => {
                    const value = getRowValue(row, column);
                    return (
                      <td key={column}>
                        {formatCellValue(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getRowValue = (row, columnName) => {
    const columnMap = {
      'Rank': row.rank,
      'Customer Name': row.customer_name,
      'Total Profit': row.total_profit,
      'Total Sales': row.total_sales,
      'Orders': row.order_count,
      'Avg Profit/Order': row.avg_profit_per_order
    };
    
    return columnMap[columnName] || row[columnName] || row[columnName.toLowerCase().replace(/\s+/g, '_')];
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (value > 1000) {
        return value.toLocaleString();
      }
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
    }
    return String(value);
  };

  const renderVisualization = () => {
    if (!visualization || !visualization.data) {
      return <p className="no-items">No visualization data available</p>;
    }

    if (visualization.type === 'bar_chart') {
      return renderBarChart();
    } else if (visualization.type === 'summary_stats') {
      return renderSummaryStats();
    }
    
    return <p className="no-items">Visualization type not supported: {visualization.type}</p>;
  };

  const renderBarChart = () => {
    const { title, data, y_axis } = visualization;
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <div className="visualization-container">
        <h4>{title}</h4>
        <div className="bar-chart">
          {data.map((item, index) => (
            <div key={index} className="bar-item">
              <div className="bar-label">{item.label}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: `hsl(${180 + (index * 30) % 180}, 70%, 50%)`
                  }}
                ></div>
              </div>
              <div className="bar-value">{item.formatted_value || item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummaryStats = () => {
    const { title, data } = visualization;

    return (
      <div className="visualization-container">
        <h4>{title}</h4>
        <div className="stats-grid">
          <div className="stat-card">
            <h5>Dataset Size</h5>
            <div className="stat-values">
              <div className="stat-item">
                <span className="stat-label">Total Records</span>
                <span className="stat-value">{data.total_records?.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Columns</span>
                <span className="stat-value">{data.total_columns}</span>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <h5>Data Quality</h5>
            <div className="stat-values">
              <div className="stat-item">
                <span className="stat-label">Completeness</span>
                <span className="stat-value">{data.data_completeness}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Numeric Fields</span>
                <span className="stat-value">{data.numeric_columns}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-analysis-results">
      {/* Clean Simple Header */}
      <div className="analysis-header">
        <div className="analysis-question">
          <h3>🤖 Analysis Results</h3>
          {question && <p className="question-text">"{question}"</p>}
        </div>
        {metadata && (
          <div className="metadata-info">
            📊 {metadata.data_rows} rows • ⏱️ {metadata.total_duration}ms
          </div>
        )}
      </div>

      {/* Results Table - No Tabs, Just Show It */}
      {results_table && (
        <div className="results-section">
          {renderResultsTable()}
        </div>
      )}

      {/* Visualization - Clean and Simple */}
      {visualization && (
        <div className="visualization-section">
          {renderVisualization()}
        </div>
      )}

      {/* Simple Action */}
      <div className="analysis-actions">
        <button onClick={onNewAnalysis} className="new-analysis-btn">
          🔄 New Analysis
        </button>
      </div>
    </div>
  );
};

export default AIAnalysisResults;