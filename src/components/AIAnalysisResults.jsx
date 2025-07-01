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
  const [activeTab, setActiveTab] = useState('results');
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

  const renderResultsTable = () => {
    if (!results_table || !results_table.data || results_table.data.length === 0) {
      return <p className="no-items">No analysis results available</p>;
    }

    const { columns, data } = results_table;

    return (
      <div className="results-table-container">
        <table className="results-table">
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
    );
  };

  const renderVisualization = () => {
    if (!visualization || !visualization.data) {
      return <p className="no-items">No visualization data available</p>;
    }

    if (visualization.type === 'bar_chart') {
      const { title, data } = visualization;
      const maxValue = Math.max(...data.map(d => d.value));

      return (
        <div className="chart-container">
          <div className="bar-chart">
            {data.map((item, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{item.label}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: `hsl(${200 + (index * 30) % 160}, 70%, 50%)`
                    }}
                  ></div>
                </div>
                <div className="bar-value">{item.formatted_value || item.value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <p className="no-items">Visualization type not supported</p>;
  };

  // Generate suggested follow-up questions
  const suggestedQuestions = [
    "Show me the revenue trend for EMESA.",
    "Which region had the lowest actuals?", 
    "Compare the actuals of North America and Asia Pacific."
  ];

  return (
    <div className="analysis-results-container">
      {/* Question */}
      <div className="analysis-question">
        <h2>{question}</h2>
      </div>

      {/* AI Response */}
      <div className="ai-response">
        <p>Here are the top regions by revenue:</p>
      </div>

      {/* Tabs */}
      <div className="results-tabs">
        <button 
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
        <button 
          className={`tab ${activeTab === 'visualization' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          Visualization
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'results' && renderResultsTable()}
        {activeTab === 'visualization' && renderVisualization()}
      </div>

      {/* Suggested Questions */}
      <div className="suggested-questions">
        {suggestedQuestions.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-pill"
            onClick={() => {
              // This should trigger a new analysis with the suggested question
              console.log('Suggested question:', suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIAnalysisResults;