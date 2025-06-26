import React, { useState, useEffect } from 'react';
import datasetService from '../services/datasetService';

const MockDataTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add a log message to the test results
  const addLog = (message) => {
    setTestResults(prev => [...prev, message]);
  };

  // Mock data for testing
  const mockDataPreviews = {
    'Sales Data': Array(50).fill().map((_, i) => ({
      Date: `2023-${Math.floor(i / 4) + 1}-${(i % 4) * 7 + 1}`,
      Region: ['North', 'South', 'East', 'West'][i % 4],
      Product: ['Widget A', 'Widget B', 'Widget C'][i % 3],
      Sales: Math.floor(Math.random() * 10000) + 1000,
      Units: Math.floor(Math.random() * 100) + 10,
      Profit: Math.floor(Math.random() * 5000) + 500
    })),
    'Customer Data': Array(40).fill().map((_, i) => ({
      CustomerId: `CUST-${1000 + i}`,
      Name: `Customer ${i + 1}`,
      Segment: ['Enterprise', 'SMB', 'Consumer'][i % 3],
      Country: ['USA', 'Canada', 'UK', 'Germany', 'France'][i % 5],
      Active: i % 5 !== 0,
      Revenue: Math.floor(Math.random() * 50000) + 5000
    }))
  };

  // Run tests when component mounts
  useEffect(() => {
    runTests();
  }, []);

  // Test mock data functionality
  const runTests = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults([]);

    try {
      addLog("=== Testing Mock Data Loading ===");
      
      // Test parameters
      const sources = ['Sales Data', 'Customer Data'];
      const dimensions = ['Region', 'Product', 'Segment'];
      const metrics = ['Sales', 'Units', 'Profit', 'Revenue'];
      const filters = { Region: 'North' };
      
      addLog("Loading dataset with mock data...");
      const result = await datasetService.loadDataset(
        sources,
        dimensions,
        metrics,
        filters,
        {}, // Empty CSV data
        mockDataPreviews
      );
      
      addLog("Dataset loaded successfully!");
      addLog(`Session ID: ${result.session.id}`);
      addLog(`Rows: ${result.session.rowCount}`);
      addLog(`Columns: ${result.session.columnCount}`);
      addLog("\nData preview:");
      addLog(JSON.stringify(result.data.slice(0, 3), null, 2));
      
      // Test question analysis
      addLog("\n=== Testing Question Analysis ===");
      addLog("Initializing Claude dataset...");
      await datasetService.initializeClaudeDataset();
      
      addLog("Analyzing question...");
      const question = "What is the average sales by region?";
      const analysisResult = await datasetService.analyzeQuestion(question);
      
      addLog("\nAnalysis Result:");
      addLog(`Answer: ${analysisResult.answer}`);
      addLog(`Code: ${analysisResult.code.substring(0, 100)}...`);
      
      addLog("\nAll tests completed successfully!");
    } catch (error) {
      setError(`Test failed: ${error.message}`);
      console.error("Test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Mock Data Test</h2>
      
      <div className="mb-4">
        <button 
          onClick={runTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded font-mono text-sm">
        <h3 className="font-bold mb-2">Test Results:</h3>
        {testResults.map((log, index) => (
          <div key={index} className="whitespace-pre-wrap mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MockDataTest;
