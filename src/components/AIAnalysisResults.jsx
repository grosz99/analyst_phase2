import React, { useState } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import './AIAnalysisResults.css';

const AIAnalysisResults = ({ 
  analysisResult, 
  originalData, 
  question, 
  onNewAnalysis,
  isLoading = false,
  showCompactInput = true
}) => {
  const [activeTab, setActiveTab] = useState('results');
  const [exportLoading, setExportLoading] = useState(false);
  const [compactQuestion, setCompactQuestion] = useState('');
  const [compactAnalyzing, setCompactAnalyzing] = useState(false);

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
    return null; // Don't render anything if no results - the question input will be shown above
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
  
  console.log('🔍 Debug AIAnalysisResults props:', { 
    analysisResult, 
    hasResultsTable: !!results_table,
    hasVisualization: !!visualization,
    question 
  });

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
    console.log('🔍 Debug renderResultsTable:', { results_table, hasData: results_table?.data?.length > 0 });
    
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

  // Generate dynamic AI response text
  const getResponseText = (question) => {
    if (!question) return "Here are the analysis results:";
    
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('profitable customer')) {
      return "Here are the most profitable customers:";
    } else if (lowerQuestion.includes('region') && lowerQuestion.includes('sales')) {
      return "Here are the top regions by sales:";
    } else if (lowerQuestion.includes('region') && lowerQuestion.includes('revenue')) {
      return "Here are the top regions by revenue:";
    } else if (lowerQuestion.includes('product')) {
      return "Here are the product analysis results:";
    } else if (lowerQuestion.includes('trend')) {
      return "Here are the trend analysis results:";
    }
    return "Here are the analysis results:";
  };

  // Handle compact question input analysis
  const handleCompactAnalysis = async () => {
    if (!compactQuestion.trim() || !originalData || compactAnalyzing) return;
    
    setCompactAnalyzing(true);
    try {
      const result = await aiAnalysisService.analyzeData(
        originalData,
        compactQuestion,
        'general'
      );
      
      if (result.success) {
        // Trigger parent component to update with new analysis
        onNewAnalysis(result, compactQuestion);
        setCompactQuestion('');
      } else {
        console.error('Analysis failed:', result.error);
        alert('Analysis failed: ' + result.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setCompactAnalyzing(false);
    }
  };

  // Handle suggested question clicks
  const handleSuggestedQuestion = async (suggestion) => {
    if (!originalData || compactAnalyzing) return;
    
    setCompactAnalyzing(true);
    try {
      const result = await aiAnalysisService.analyzeData(
        originalData,
        suggestion,
        'general'
      );
      
      if (result.success) {
        onNewAnalysis(result, suggestion);
      } else {
        console.error('Analysis failed:', result.error);
        alert('Analysis failed: ' + result.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setCompactAnalyzing(false);
    }
  };

  // Generate suggested follow-up questions
  const suggestedQuestions = [
    "Show me the revenue trend for EMESA.",
    "Which region had the lowest actuals?", 
    "Compare the actuals of North America and Asia Pacific."
  ];

  return (
    <div className="analysis-results-container">
      {/* Compact Question Input for Follow-ups */}
      {showCompactInput && (
        <div className="compact-question-section">
        <div className="question-header">
          <h3>🔍 Ask a Question About Your Data</h3>
          <p>Use natural language to explore your data with AI analysis</p>
        </div>
        <div className="compact-input-wrapper">
          <input
            type="text"
            value={compactQuestion}
            onChange={(e) => setCompactQuestion(e.target.value)}
            placeholder="e.g., Who are the most profitable customers?"
            className="compact-question-input"
            disabled={compactAnalyzing}
            onKeyPress={(e) => e.key === 'Enter' && handleCompactAnalysis()}
          />
          <button 
            className="compact-analyze-btn"
            onClick={handleCompactAnalysis}
            disabled={!compactQuestion.trim() || compactAnalyzing}
          >
            {compactAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
          </button>
        </div>
      </div>
      )}

      {/* Current Question Result */}
      <div className="current-result">
        <div className="analysis-question">
          <h2>{question}</h2>
        </div>

        {/* AI Response */}
        <div className="ai-response">
          <p>{getResponseText(question)}</p>
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
      </div>

      {/* Suggested Questions */}
      <div className="suggested-questions">
        {suggestedQuestions.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-pill"
            onClick={() => handleSuggestedQuestion(suggestion)}
            disabled={compactAnalyzing}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIAnalysisResults;