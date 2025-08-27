import React, { useState, useRef } from 'react';
import aiAnalysisService from '../services/aiAnalysisService.js';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';
import ChartVisualization from './ChartVisualization';
import { exportToCSV, exportChartToPowerPoint } from '../services/exportService';
import './AIAnalysisResults.css';

const AIAnalysisResults = ({ 
  analysisResult, 
  originalData, 
  question, 
  onNewAnalysis,
  isLoading = false,
  showCompactInput = true,
  showContextControl = false,
  sessionId = null,
  selectedDataSource = null
}) => {
  const [activeTab, setActiveTab] = useState('results');
  const [exportLoading, setExportLoading] = useState(false);
  const [compactQuestion, setCompactQuestion] = useState('');
  const [compactAnalyzing, setCompactAnalyzing] = useState(false);
  const visualizationRef = useRef(null);

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
    console.warn('⚠️ No analysisResult provided to AIAnalysisResults');
    return null; // Don't render anything if no results - the question input will be shown above
  }

  if (!analysisResult.success) {
    console.error('❌ Analysis failed:', analysisResult.error);
    return (
      <div className="ai-analysis-error">
        <div className="error-content">
          <h3>❌ Analysis Error</h3>
          <p>{analysisResult.error || 'Unknown error occurred'}</p>
          {analysisResult.debug_info && (
            <div className="debug-info">
              <details>
                <summary>Debug Information</summary>
                <pre>{JSON.stringify(analysisResult.debug_info, null, 2)}</pre>
              </details>
            </div>
          )}
          <button onClick={onNewAnalysis} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Enhanced validation and debugging
  const validateAnalysisResult = (result) => {
    console.log('🔍 Validating analysis result:', result);
    
    if (!result || typeof result !== 'object') {
      console.error('❌ Invalid analysis result: not an object');
      return false;
    }
    
    // Check for required fields
    const requiredFields = ['analysis', 'metadata'];
    const missingFields = requiredFields.filter(field => !result[field]);
    
    if (missingFields.length > 0) {
      console.warn('⚠️ Missing required fields:', missingFields);
    }
    
    // Validate results_table structure
    if (result.results_table) {
      if (!result.results_table.data || !Array.isArray(result.results_table.data)) {
        console.warn('⚠️ Invalid results_table: missing or invalid data array');
      }
      if (result.results_table.data && result.results_table.data.length === 0) {
        console.warn('⚠️ Results table has empty data array');
      }
    }
    
    // Validate visualization structure
    if (result.visualization) {
      if (!result.visualization.type) {
        console.warn('⚠️ Invalid visualization: missing type');
      }
      if (!result.visualization.data || !Array.isArray(result.visualization.data)) {
        console.warn('⚠️ Invalid visualization: missing or invalid data array');
      }
    }
    
    return true;
  };
  
  // Validate the analysis result
  const isValid = validateAnalysisResult(analysisResult);
  
  // Extract with safe defaults
  const {
    analysis = 'No analysis text available',
    python_code = null,
    metadata = {},
    results_table = null,
    visualization = null,
    refined_questions = []
  } = analysisResult || {};
  
  console.log('🔍 Debug AIAnalysisResults extracted data:', { 
    hasAnalysis: !!analysis,
    hasPythonCode: !!python_code,
    hasMetadata: !!metadata,
    hasResultsTable: !!results_table,
    resultsTableData: results_table?.data?.length || 0,
    hasVisualization: !!visualization,
    visualizationData: visualization?.data?.length || 0,
    refinedQuestionsCount: refined_questions?.length || 0,
    question,
    isValid
  });

  const handleExportResults = async (format) => {
    if (!results_table?.data) return;
    
    try {
      setExportLoading(true);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analysis_results_${question?.replace(/[^a-zA-Z0-9]/g, '_') || 'data'}_${timestamp}`;
      
      if (format === 'csv') {
        exportToCSV(results_table.data, filename);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleChartExport = async (format) => {
    if (!visualization?.data) return;
    
    try {
      setExportLoading(true);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `chart_${question?.replace(/[^a-zA-Z0-9]/g, '_') || 'visualization'}_${timestamp}`;
      
      if (format === 'powerpoint') {
        const chartData = visualization.data.map(item => ({
          name: item.label || 'Unknown',
          value: item.value || 0
        }));
        
        await exportChartToPowerPoint({
          chartType: 'bar',
          chartData: chartData,
          title: visualization.title || 'Analysis Results',
          filename: filename
        });
      }
    } catch (error) {
      console.error('Chart export error:', error);
      alert('Chart export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPowerPoint = async () => {
    try {
      setExportLoading(true);
      
      // Create new PowerPoint presentation
      const pptx = new PptxGenJS();
      
      // Add title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(`Data Analysis: ${question}`, {
        x: 0.5,
        y: '40%',
        w: '90%',
        h: 1,
        fontSize: 32,
        bold: true,
        align: 'center',
        color: '059669'
      });
      
      titleSlide.addText(new Date().toLocaleDateString(), {
        x: 0.5,
        y: '60%',
        w: '90%',
        h: 0.5,
        fontSize: 18,
        align: 'center',
        color: '666666'
      });
      
      // Add visualization slide if available
      if (visualization && visualization.data && visualizationRef.current) {
        const vizSlide = pptx.addSlide();
        
        // Add title
        vizSlide.addText(visualization.title || 'Data Visualization', {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '059669'
        });
        
        // Capture visualization as image
        const canvas = await html2canvas(visualizationRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Add image to slide
        vizSlide.addImage({
          data: imgData,
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5
        });
      }
      
      // Add results summary slide if we have table data
      if (results_table && results_table.data && results_table.data.length > 0) {
        const dataSlide = pptx.addSlide();
        
        dataSlide.addText('Key Results', {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '059669'
        });
        
        // Create table data
        const tableData = [];
        const headers = results_table.headers || Object.keys(results_table.data[0]);
        
        // Add headers
        tableData.push(headers.map(h => ({ 
          text: h, 
          options: { bold: true, color: 'ffffff', fill: { color: '059669' } } 
        })));
        
        // Add data rows (limit to 10 for PowerPoint)
        results_table.data.slice(0, 10).forEach(row => {
          tableData.push(headers.map(h => String(row[h] || '')));
        });
        
        // Add table to slide
        dataSlide.addTable(tableData, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5,
          border: { type: 'solid', color: 'e2e8f0' },
          fontSize: 12
        });
        
        if (results_table.data.length > 10) {
          dataSlide.addText(`Showing top 10 of ${results_table.data.length} results`, {
            x: 0.5,
            y: 6.8,
            w: '90%',
            h: 0.3,
            fontSize: 10,
            italic: true,
            color: '666666'
          });
        }
      }
      
      // Add insights slide
      if (analysis) {
        const insightsSlide = pptx.addSlide();
        
        insightsSlide.addText('Analysis Insights', {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '059669'
        });
        
        // Extract key points from analysis text
        const insights = analysis.split('\n')
          .filter(line => line.trim().length > 0)
          .slice(0, 5)
          .map(line => line.replace(/^[-•*]\s*/, ''));
        
        insights.forEach((insight, index) => {
          insightsSlide.addText(`• ${insight}`, {
            x: 1,
            y: 2 + (index * 0.8),
            w: 8,
            h: 0.6,
            fontSize: 14,
            color: '374151'
          });
        });
      }
      
      // Generate filename with question context and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const questionPrefix = question ? 
        `${question.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}` : 
        'Analysis';
      const filename = `${questionPrefix}_${timestamp}.pptx`;
      
      // Save PowerPoint file
      await pptx.writeFile({ fileName: filename });
      
      console.log('✅ PowerPoint export successful');
    } catch (error) {
      console.error('PowerPoint export error:', error);
      alert('Failed to export to PowerPoint. Please try again.');
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

    const data = results_table.data;
    // Generate columns from data if not provided
    const columns = results_table.columns || results_table.headers || Object.keys(data[0] || {});

    if (!columns || columns.length === 0) {
      return <p className="no-items">No table structure available</p>;
    }

    return (
      <div className="results-table-container">
        <div className="table-header">
          <h4>Analysis Results</h4>
          <div className="export-controls">
            <button 
              onClick={() => handleExportResults('csv')} 
              className="export-btn"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📊 Download CSV'}
            </button>
          </div>
        </div>
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
    console.log('🔍 Debug renderVisualization:', {
      visualization,
      hasData: !!visualization?.data,
      dataLength: visualization?.data?.length,
      type: visualization?.type,
      hasError: !!visualization?.error
    });
    
    if (!visualization) {
      console.warn('⚠️ No visualization object provided');
      return <p className="no-items">No visualization data available</p>;
    }
    
    if (visualization.error) {
      console.error('❌ Visualization contains error:', visualization.error);
      return (
        <div className="visualization-error">
          <p className="error-text">❌ {visualization.error}</p>
          <p className="error-help">Try asking a different question or check your data format.</p>
        </div>
      );
    }
    
    if (!visualization.data) {
      console.warn('⚠️ No visualization.data provided');
      return <p className="no-items">No visualization data available</p>;
    }
    
    if (!Array.isArray(visualization.data)) {
      console.error('❌ visualization.data is not an array:', typeof visualization.data);
      return <p className="no-items">Invalid visualization data format</p>;
    }
    
    if (visualization.data.length === 0) {
      console.warn('⚠️ visualization.data is empty');
      return <p className="no-items">No data to visualize</p>;
    }

    if (visualization.type === 'bar_chart') {
      const { title, data } = visualization;
      
      // Validate data structure
      const isValidData = data.every(item => 
        item && typeof item === 'object' && 
        (item.value !== undefined || item.formatted_value !== undefined)
      );
      
      if (!isValidData) {
        console.error('❌ Invalid bar chart data structure');
        return <p className="no-items">Invalid chart data received</p>;
      }
      
      let maxValue;
      try {
        maxValue = Math.max(...data.map(d => d.value || 0));
      } catch (error) {
        console.error('❌ Error calculating max value:', error);
        maxValue = 1; // fallback
      }
      
      console.log('✅ Rendering bar chart with', data.length, 'items, max value:', maxValue);

      // Convert data to format expected by ChartVisualization
      const chartData = data.map(item => ({
        name: item.label || 'Unknown',
        value: item.value || 0
      }));
      
      return (
        <div className="chart-container">
          <div className="visualization-actions">
            <button 
              onClick={() => handleChartExport('powerpoint')} 
              className="export-btn"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📊 Download PowerPoint'}
            </button>
          </div>
          <ChartVisualization 
            data={chartData}
            title={title || 'Analysis Results'}
            chartType="bar"
            ref={visualizationRef}
          />
        </div>
      );
    }

    console.warn('⚠️ Unsupported visualization type:', visualization.type);
    return <p className="no-items">Visualization type "{visualization.type}" not supported</p>;
  };

  const renderPythonCode = () => {
    console.log('🔍 Debug renderPythonCode:', {
      python_code,
      hasCode: !!python_code?.code,
      isExecutable: python_code?.executable,
      codeType: typeof python_code
    });
    
    if (!python_code) {
      console.warn('⚠️ No python_code provided');
      return <p className="no-items">No Python code generated</p>;
    }
    
    // Handle both object and string formats
    const codeString = python_code.code || python_code;
    
    if (!codeString || (typeof codeString !== 'string' && typeof codeString !== 'object')) {
      console.warn('⚠️ Invalid python code format:', typeof codeString);
      return <p className="no-items">Invalid Python code format</p>;
    }
    
    const displayCode = typeof codeString === 'string' ? codeString : JSON.stringify(codeString, null, 2);
    
    console.log('✅ Rendering Python code, length:', displayCode.length);

    return (
      <div className="python-code-container">
        <div className="code-header">
          <h4>Generated Python Analysis Code</h4>
          <p className="code-subtitle">AI-generated code to analyze your cached dataset</p>
        </div>
        <pre className="python-code">
          <code>{displayCode}</code>
        </pre>
        {python_code.executable && (
          <div className="code-info">
            <span className="code-status">
              {python_code.optimized ? '⚡ Optimized pre-written code' : '✅ Executable code generated'}
            </span>
            <span className="code-note">
              {python_code.optimized 
                ? 'This is performance-optimized pandas code for common questions' 
                : 'This code operates on the cached DataFrame \'df\''
              }
            </span>
          </div>
        )}
        {python_code.executable === false && (
          <div className="code-warning">
            <span className="code-status">⚠️ Non-executable code</span>
            <span className="code-note">This code could not be executed automatically</span>
          </div>
        )}
      </div>
    );
  };

  // Render interpretation showing GPT-4.1's reasoning and methodology
  const renderInterpretation = () => {
    if (!analysis) {
      return (
        <div className="interpretation-container">
          <div className="interpretation-placeholder">
            <p>No analysis interpretation available.</p>
          </div>
        </div>
      );
    }

    // Extract different sections from the analysis text
    const extractInterpretationSections = (analysisText) => {
      const sections = {
        analytical_interpretation: '',
        key_insights: '',
        methodology_explanation: '',
        business_implications: '',
        raw_analysis: analysisText
      };

      // Try to extract structured sections
      const analyticalMatch = analysisText.match(/## ANALYTICAL INTERPRETATION\s*([\s\S]*?)(?=##|$)/i);
      if (analyticalMatch) sections.analytical_interpretation = analyticalMatch[1].trim();

      const insightsMatch = analysisText.match(/## KEY INSIGHTS\s*([\s\S]*?)(?=##|$)/i);
      if (insightsMatch) sections.key_insights = insightsMatch[1].trim();

      const methodologyMatch = analysisText.match(/## METHODOLOGY EXPLANATION\s*([\s\S]*?)(?=##|$)/i);
      if (methodologyMatch) sections.methodology_explanation = methodologyMatch[1].trim();

      const businessMatch = analysisText.match(/## BUSINESS IMPLICATIONS\s*([\s\S]*?)(?=##|$)/i);
      if (businessMatch) sections.business_implications = businessMatch[1].trim();

      return sections;
    };

    const sections = extractInterpretationSections(analysis);
    const hasStructuredSections = sections.analytical_interpretation || sections.key_insights || sections.methodology_explanation;

    return (
      <div className="interpretation-container">
        <div className="interpretation-header">
          <h3>🧠 AI Analysis Interpretation</h3>
          <p>Understanding how GPT-4.1 approached this analysis</p>
        </div>

        {hasStructuredSections ? (
          <div className="interpretation-sections">
            {sections.analytical_interpretation && (
              <div className="interpretation-section">
                <h4>🔍 Analytical Reasoning</h4>
                <div className="section-content">
                  <p>{sections.analytical_interpretation}</p>
                </div>
              </div>
            )}

            {sections.methodology_explanation && (
              <div className="interpretation-section">
                <h4>⚙️ Methodology</h4>
                <div className="section-content">
                  <p>{sections.methodology_explanation}</p>
                </div>
              </div>
            )}

            {sections.key_insights && (
              <div className="interpretation-section">
                <h4>💡 Key Insights</h4>
                <div className="section-content">
                  <p>{sections.key_insights}</p>
                </div>
              </div>
            )}

            {sections.business_implications && (
              <div className="interpretation-section">
                <h4>📊 Business Impact</h4>
                <div className="section-content">
                  <p>{sections.business_implications}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="interpretation-fallback">
            <h4>🤖 Analysis Approach</h4>
            <div className="section-content">
              <p>{analysis}</p>
            </div>
            <div className="interpretation-note">
              <small>💡 This shows the complete analytical reasoning from GPT-4.1</small>
            </div>
          </div>
        )}

        {metadata && metadata.model && (
          <div className="interpretation-footer">
            <div className="ai-model-info">
              <span className="model-badge">Powered by {metadata.model}</span>
              {metadata.processing_time && (
                <span className="processing-time">Analysis time: {metadata.processing_time}ms</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Generate dynamic AI response text
  const getResponseText = (questionText) => {
    if (!questionText) return "Here are the analysis results:";
    
    const lowerQuestion = questionText.toLowerCase();
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
      // Get dataset ID for specialized AI context
      const datasetId = selectedDataSource?.toLowerCase() || null;
      
      const result = await aiAnalysisService.analyzeData(
        originalData,
        compactQuestion,
        'general',
        sessionId,
        'anthropic',
        null, // no context prompt for follow-up questions
        datasetId
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
        'general',
        sessionId,
        'anthropic'
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

  // Generate data-aware suggested follow-up questions
  const generateDataAwareSuggestions = () => {
    if (!originalData || originalData.length === 0) return [];
    
    const columns = Object.keys(originalData[0] || {});
    const suggestions = [];
    
    // Find categorical columns for grouping questions
    const categoricalCols = columns.filter(col => {
      const values = originalData.slice(0, 50).map(row => row[col]).filter(v => v != null);
      const uniqueValues = [...new Set(values)];
      return uniqueValues.length <= Math.min(15, originalData.length * 0.3) && uniqueValues.length > 1;
    });
    
    // Find numeric columns for analysis questions  
    const numericCols = columns.filter(col => {
      const values = originalData.slice(0, 10).map(row => row[col]);
      return values.some(v => !isNaN(parseFloat(v)) && isFinite(v));
    });
    
    // Generate questions based on actual data structure
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      suggestions.push(`Which ${categoricalCols[0].toLowerCase()} has the highest ${numericCols[0].toLowerCase()}?`);
      suggestions.push(`How does ${numericCols[0].toLowerCase()} compare across different ${categoricalCols[0].toLowerCase()}?`);
    }
    
    if (categoricalCols.length > 0) {
      suggestions.push(`What is the distribution of ${categoricalCols[0].toLowerCase()}?`);
    }
    
    if (numericCols.length > 0) {
      suggestions.push(`What are the trends in ${numericCols[0].toLowerCase()}?`);
    }
    
    // Add record count question using actual data size
    suggestions.push(`What insights can we find across all ${originalData.length} records?`);
    
    return suggestions.slice(0, 4);
  };
  
  const suggestedQuestions = generateDataAwareSuggestions();

  return (
    <div className="analysis-results-container">

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
        <button 
          className={`tab ${activeTab === 'interpretation' ? 'active' : ''}`}
          onClick={() => setActiveTab('interpretation')}
        >
          Interpretation
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'results' && renderResultsTable()}
        {activeTab === 'visualization' && renderVisualization()}
        {activeTab === 'interpretation' && renderInterpretation()}
      </div>
      </div>

      {/* Refined Question Suggestions */}
      {refined_questions && refined_questions.length > 0 && (
        <div className="refined-questions-section">
          <h4>Popular Searches from Data Sources</h4>
          <div className="refined-questions">
            {refined_questions.map((refinedQ, index) => {
              // Determine icon based on question content
              const getQuestionIcon = (question) => {
                const q = question.toLowerCase();
                if (q.includes('trend') || q.includes('time') || q.includes('growth')) return { icon: '📈', class: 'icon-trending' };
                if (q.includes('customer') || q.includes('client') || q.includes('user')) return { icon: '👥', class: 'icon-users' };
                if (q.includes('revenue') || q.includes('sales') || q.includes('profit')) return { icon: '📊', class: 'icon-chart' };
                return { icon: '🗂️', class: 'icon-database' };
              };
              
              const iconInfo = getQuestionIcon(refinedQ.question);
              
              return (
                <div key={index} className="refined-question-item">
                  <button
                    className="refined-question-btn"
                    onClick={() => handleSuggestedQuestion(refinedQ.question)}
                    disabled={compactAnalyzing}
                  >
                    <div className={`question-icon ${iconInfo.class}`}>
                      {iconInfo.icon}
                    </div>
                    <div className="refined-question-text">{refinedQ.question}</div>
                    <div className="refined-question-reason">{refinedQ.reason}</div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* General Suggested Questions */}
      {(!refined_questions || refined_questions.length === 0) && (
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
      )}

      {/* Compact Question Input for Follow-ups - AFTER user has read the results */}
      {showCompactInput && (
        <>
        {/* Context control removed - now handled by ConversationContainer */}
        
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
        </>
      )}
    </div>
  );
};

export default AIAnalysisResults;