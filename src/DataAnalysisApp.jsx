import React, { useState, useEffect, useCallback } from 'react';
import datasetService from './services/datasetService.js';
import Header from './components/Header.jsx';
import DataSourcesStep from './components/DataSourcesStep.jsx';
import ColumnSelectionStep from './components/ColumnSelectionStep.jsx';
import FiltersStep from './components/FiltersStep.jsx';

import UnifiedAnalysisView from './components/UnifiedAnalysisView.jsx';
import './App.css'; // Import the new central stylesheet

const DataAnalysisApp = () => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);

  // Workflow steps definition
  const steps = [
    { id: 1, name: 'Data Sources' },
    { id: 2, name: 'Filters' },
    { id: 3, name: 'Columns' },
    { id: 4, name: 'Analysis' },
  ];

  // Data sources state
  const [mockDataSources] = useState(['Sales Data', 'Customer Data', 'Product Data']);
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [mockDataPreviews, setMockDataPreviews] = useState({});

  // Filters state
  const [selectedFilters, setSelectedFilters] = useState({});

  // Column selection state
  const [availableFields, setAvailableFields] = useState([]);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  // Dataset state
  const [processedData, setProcessedData] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);

  useEffect(() => {
    const initMockData = () => {
      const mockData = {
        'Sales Data': Array(50).fill().map((_, i) => ({
          date: `2023-${Math.floor(i / 4) + 1}-01`,
          Region: ['North', 'South', 'East', 'West'][i % 4],
          Product: ['Widget A', 'Widget B', 'Widget C'][i % 3],
          Sales: Math.floor(Math.random() * 10000) + 1000,
          Units: Math.floor(Math.random() * 100) + 10,
          Profit: Math.floor(Math.random() * 5000) + 500,
          revenue: Math.floor(Math.random() * 10000) + 1000,
          unitsSold: Math.floor(Math.random() * 100) + 10,
          billability: Math.random() * 100,
          projectedWork: Math.floor(Math.random() * 200) + 50,
          revenueLW: Math.floor(Math.random() * 9000) + 1000,
          revenueLY: Math.floor(Math.random() * 8000) + 1000,
          unitsSoldLW: Math.floor(Math.random() * 90) + 10,
          unitsSoldLY: Math.floor(Math.random() * 80) + 10,
          billabilityLW: Math.random() * 90,
          billabilityLY: Math.random() * 80,
          projectedWorkLW: Math.floor(Math.random() * 180) + 50,
          projectedWorkLY: Math.floor(Math.random() * 160) + 50,
          plan: Math.floor(Math.random() * 12000) + 1000,
        })),
        'Customer Data': Array(40).fill().map((_, i) => ({
          CustomerId: `CUST-${1000 + i}`,
          Name: `Customer ${i + 1}`,
          Segment: ['Enterprise', 'SMB', 'Consumer'][i % 3],
          Country: ['USA', 'Canada', 'UK', 'Germany', 'France'][i % 5],
          Active: i % 5 !== 0,
          Revenue: Math.floor(Math.random() * 50000) + 5000
        })),
        'Product Data': Array(30).fill().map((_, i) => ({
          ProductId: `PROD-${100 + i}`,
          Name: `Product ${i + 1}`,
          Category: ['Electronics', 'Office', 'Furniture'][i % 3],
          Price: Math.floor(Math.random() * 1000) + 50,
          Stock: Math.floor(Math.random() * 200) + 10,
          Rating: (Math.random() * 4 + 1).toFixed(1)
        }))
      };
      setMockDataPreviews(mockData);
    };
    initMockData();
  }, []);

  const getFieldsForDataSource = useCallback((source) => {
    const fields = [];
    if (mockDataPreviews[source]) {
      const sample = mockDataPreviews[source][0] || {};
      Object.keys(sample).forEach(field => {
        const value = sample[field];
        let type = typeof value;
        if (type === 'number') type = Number.isInteger(value) ? 'integer' : 'number';
        fields.push({ name: field, type, source });
      });
    }
    const uniqueFields = [];
    const fieldNames = new Set();
    fields.forEach(field => {
      if (!fieldNames.has(field.name)) {
        fieldNames.add(field.name);
        uniqueFields.push(field);
      }
    });
    return uniqueFields;
  }, [mockDataPreviews]);

  // Update available fields when data source changes
  useEffect(() => {
    if (selectedDataSource) {
      setAvailableFields(getFieldsForDataSource(selectedDataSource));
    } else {
      setAvailableFields([]);
    }
  }, [selectedDataSource, getFieldsForDataSource]);

  // Handle next step navigation
  const handleNextStep = async () => {
    setError(null);
    if (currentStep === 1) { // From Data Sources to Filters
      if (!selectedDataSource) {
        setError('Please select a data source.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) { // From Filters to Columns
      setCurrentStep(3);
    } else if (currentStep === 3) { // From Columns to Analysis
      if (selectedDimensions.length === 0 && selectedMetrics.length === 0) {
        setError('Please select at least one dimension or metric.');
        return;
      }
      setIsDatasetLoading(true);
      try {
        const result = await datasetService.loadDataset(
          selectedDataSource,
          selectedDimensions,
          selectedMetrics,
          selectedFilters,
          mockDataPreviews
        );
        setProcessedData(result.dataset);
        setDatasetInfo(result.info);
        setSessionId(result.sessionId);
        setCurrentStep(4); // Go directly to Analysis step
      } catch (err) {
        setError(`Failed to load dataset: ${err.message}`);
      } finally {
        setIsDatasetLoading(false);
      }
    }
  };

  // Handle previous step navigation
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle resetting the analysis workflow
  const handleReset = () => {
    setCurrentStep(1);
    setError(null);
    setSelectedDataSource('');
    setSelectedFilters({});
    setAvailableFields([]);
    setSelectedDimensions([]);
    setSelectedMetrics([]);
    setProcessedData(null);
    setDatasetInfo('');
    setSessionId(null);
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-3">
              <button onClick={() => setError(null)} className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

    const renderNavigation = () => {
    if (currentStep >= 4) return null;
    return (
      <div className="navigation-container">
        {currentStep > 1 && (
          <button onClick={handlePrevStep} className="btn btn-secondary">
            Back
          </button>
        )}
        <button onClick={handleNextStep} disabled={isDatasetLoading} className="btn btn-primary">
          {isDatasetLoading ? 'Loading...' : 'Continue'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header currentStep={currentStep} />
      <main className="main-content">
        <div className="step-content-container">
          {currentStep === 1 && (
            <DataSourcesStep
              mockDataSources={mockDataSources}
              selectedDataSource={selectedDataSource}
              setSelectedDataSource={setSelectedDataSource}
              availableFields={availableFields}
            />
          )}

          {currentStep === 2 && (
            <FiltersStep
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              availableFields={availableFields}
              mockDataPreviews={mockDataPreviews}
              selectedDataSource={selectedDataSource}
            />
          )}
          
          {currentStep === 3 && (
            <ColumnSelectionStep
              availableFields={availableFields}
              selectedDimensions={selectedDimensions}
              setSelectedDimensions={setSelectedDimensions}
              selectedMetrics={selectedMetrics}
              setSelectedMetrics={setSelectedMetrics}
            />
          )}
          
          {currentStep === 4 && (
            <UnifiedAnalysisView 
              initialData={processedData} 
              datasetInfo={datasetInfo}
              sessionId={sessionId}
              onReset={handleReset}
            />
          )}

          {renderError()}
          {renderNavigation()}
        </div>
      </main>
    </div>
  );
};

export default DataAnalysisApp;
