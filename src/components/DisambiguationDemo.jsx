import React, { useState } from 'react';
import disambiguationService from '../services/disambiguationService.js';
import ClarificationModal from './ClarificationModal.jsx';

/**
 * Demo component to test disambiguation system with real scenarios
 */
const DisambiguationDemo = () => {
  const [testQuery, setTestQuery] = useState('');
  const [disambiguation, setDisambiguation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState(null);

  // Sample data structure to simulate different datasets
  const sampleDataSets = {
    pipeline: [{ company: 'ACME Corp', stage: 'proposal', potential_value_usd: 50000, probability: 0.7, close_quarter: 'Q1' }],
    ncc: [{ office: 'Boston', timesheet_charges: 150000, adjustments: -5000, ncc: 145000, sector: 'Healthcare' }],
    attendance: [{ office: 'NYC', headcount: 100, people_attended: 75, attendance_rate: 0.75, date: '2025-01-15' }]
  };

  const [selectedDataset, setSelectedDataset] = useState('pipeline');

  const testQueries = [
    'Give me the pipeline value',
    'Show me the top offices by performance', 
    'What are the trends in our data',
    'Which regions have the highest value',
    'Show me the attendance data for top offices'
  ];

  const handleTestQuery = (query) => {
    setTestQuery(query);
    
    const data = sampleDataSets[selectedDataset];
    const availableColumns = Object.keys(data[0] || {});
    
    const disambiguationResult = disambiguationService.analyzeQuery(query, availableColumns);
    
    if (disambiguationResult) {
      setDisambiguation(disambiguationResult);
      setShowModal(true);
      setResult(null);
    } else {
      setResult({
        type: 'no_disambiguation',
        message: 'No disambiguation needed - query is clear.',
        query: query
      });
      setDisambiguation(null);
    }
  };

  const handleClarificationConfirm = (selectedOption) => {
    const clarifiedQuery = disambiguationService.createClarifiedQuery(
      testQuery,
      disambiguation.ambiguousTerm,
      selectedOption
    );
    
    setResult({
      type: 'clarified',
      originalQuery: testQuery,
      clarifiedQuery: clarifiedQuery,
      selectedOption: selectedOption
    });
    
    setShowModal(false);
    setDisambiguation(null);
  };

  const handleClarificationCancel = () => {
    setResult({
      type: 'cancelled',
      message: 'User cancelled disambiguation.',
      query: testQuery
    });
    
    setShowModal(false);
    setDisambiguation(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>🤔 Disambiguation System Demo</h2>
      
      {/* Dataset Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Test Dataset:</label>
        <select 
          value={selectedDataset} 
          onChange={(e) => setSelectedDataset(e.target.value)}
          style={{ padding: '5px' }}
        >
          <option value="pipeline">Sales Pipeline Data</option>
          <option value="ncc">NCC Financial Data</option>
          <option value="attendance">Office Attendance Data</option>
        </select>
        
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Available columns: {Object.keys(sampleDataSets[selectedDataset][0]).join(', ')}
        </div>
      </div>

      {/* Test Queries */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Queries:</h3>
        {testQueries.map((query, index) => (
          <button
            key={index}
            onClick={() => handleTestQuery(query)}
            style={{ 
              display: 'block', 
              margin: '5px 0', 
              padding: '10px 15px', 
              backgroundColor: '#f0f8ff', 
              border: '1px solid #ccc', 
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            {query}
          </button>
        ))}
      </div>

      {/* Custom Query Input */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Custom Query:</h3>
        <input
          type="text"
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="Type your own query..."
          style={{ padding: '8px', width: '300px', marginRight: '10px' }}
        />
        <button
          onClick={() => handleTestQuery(testQuery)}
          disabled={!testQuery.trim()}
          style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Test Query
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: result.type === 'clarified' ? '#d4edda' : result.type === 'cancelled' ? '#f8d7da' : '#fff3cd',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <h3>Result:</h3>
          {result.type === 'no_disambiguation' && (
            <div>
              <p><strong>✅ No disambiguation needed</strong></p>
              <p>Query: "{result.query}"</p>
              <p>The query is clear and can proceed directly to analysis.</p>
            </div>
          )}
          
          {result.type === 'clarified' && (
            <div>
              <p><strong>✅ Query disambiguated successfully</strong></p>
              <p><strong>Original:</strong> "{result.originalQuery}"</p>
              <p><strong>Clarified:</strong> "{result.clarifiedQuery}"</p>
              <p><strong>Selected Option:</strong> {result.selectedOption}</p>
            </div>
          )}
          
          {result.type === 'cancelled' && (
            <div>
              <p><strong>❌ Disambiguation cancelled</strong></p>
              <p>Query: "{result.query}"</p>
              <p>User chose not to clarify the ambiguous query.</p>
            </div>
          )}
        </div>
      )}

      {/* Clarification Modal */}
      <ClarificationModal
        disambiguation={disambiguation}
        isVisible={showModal}
        onClarify={handleClarificationConfirm}
        onCancel={handleClarificationCancel}
      />
    </div>
  );
};

export default DisambiguationDemo;