import React, { useState, useEffect, useRef } from 'react';
import analysisService from '../services/analysisService';
import ResultsTable from './ResultsTable';
import LineChart from './LineChart';
import './UnifiedAnalysisView.css';

const DataPreview = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="data-preview-container">
        <h3 className="preview-title">Data Preview</h3>
        <p className="placeholder-text">No data available for preview.</p>
      </div>
    );
  }

  const previewData = data.slice(0, 5);
  // Ensure there's data to get headers from
  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="data-preview-container">
      <h3 className="preview-title">Data Preview (First 5 Rows)</h3>
      <ResultsTable data={previewData} headers={headers} />
    </div>
  );
};

function UnifiedAnalysisView({ initialData, datasetInfo, sessionId, onReset }) {
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState(['What are the top regions by sales?', 'Show me total profit per product.', 'How do sales trend over time?']);
  const resultsEndRef = useRef(null);

  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [analysisHistory]);

  const handleAskQuestion = async (e, suggestedQuestion = null) => {
    if (e) e.preventDefault();
    const questionToAsk = suggestedQuestion || currentQuestion;
    if (!questionToAsk.trim() || isLoading) return;

    const question = questionToAsk;
    setCurrentQuestion('');
    setIsLoading(true);
    setError(null);
    if(!suggestedQuestion) {
        setSuggestedQuestions([]);
    }

    try {
      const context = analysisHistory.map(h => h.question).join('\n');
      const result = await analysisService.getAnalysis(question, context, sessionId, initialData);
      setAnalysisHistory(prev => [...prev, { question, ...result }]);
      setSuggestedQuestions(result.followUpQuestions || []);
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during analysis.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="unified-analysis-view">
      <div className="results-section">
        {!isLoading && !error && (
          <>
            {analysisHistory.length === 0 ? (
              <DataPreview data={initialData} />
            ) : (
              analysisHistory.map((result, index) => (
                <div key={index} className="result-block">
                  <h2 className="result-question">{result.question}</h2>
                  {result.answer && <p className="result-answer">{result.answer}</p>}
                  <div className="result-content">
                    <div className="table-container">
                      {result.tableData && <ResultsTable data={result.tableData} />}
                    </div>
                    <div className="chart-container">
                      {result.chartData && <LineChart chartData={result.chartData} />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {isLoading && (
          <div className="loading-shimmer">
            <p>Analyzing your data...</p>
          </div>
        )}
        <div ref={resultsEndRef} />
      </div>

      <div className="interaction-area">
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="suggested-questions">
            {suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => handleAskQuestion(null, q)} className="suggestion-chip">
                {q}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => handleAskQuestion(e)} className="question-form">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            placeholder={isLoading ? 'Analyzing...' : 'Ask a follow-up question...'}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !currentQuestion.trim()}>
            Ask
          </button>
        </form>
        {error && <p className="error-message">Error: {error}</p>}
      </div>

      <div className="footer-actions">
        <button onClick={onReset} className="reset-button">
          Start New Analysis
        </button>
      </div>
    </div>
  );
}

export default UnifiedAnalysisView;
