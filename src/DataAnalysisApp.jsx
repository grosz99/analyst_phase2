import React, { useState, useEffect, useCallback } from 'react';
import datasetService from './services/datasetService.js';
import Header from './components/Header.jsx';
import DataSourcesStep from './components/DataSourcesStep.jsx';
// ColumnSelectionStep removed to streamline workflow
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
    { id: 3, name: 'Analysis' },
  ];

  // Data sources state
  const [availableDataSources, setAvailableDataSources] = useState([]);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState('');

  // Filters state
  const [selectedFilters, setSelectedFilters] = useState({});

  // Field discovery for filters (no manual column selection needed)
  const [availableFields, setAvailableFields] = useState([]);

  // Dataset state
  const [processedData, setProcessedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);

  // Load available data sources from API
  useEffect(() => {
    const loadDataSources = async () => {
      setIsLoadingDataSources(true);
      try {
        console.log('Loading available data sources from API...');
        const dataSources = await datasetService.getAvailableDatasets();
        
        // Convert API format to frontend format
        const sourceNames = dataSources.map(ds => ds.name);
        setAvailableDataSources(sourceNames);
        
        console.log('Loaded data sources:', sourceNames);
      } catch (error) {
        console.error('Failed to load data sources:', error);
        // Fallback to mock data sources
        setAvailableDataSources(['Sales Data', 'Customer Data', 'Product Data']);
      } finally {
        setIsLoadingDataSources(false);
      }
    };

    loadDataSources();
  }, []);

  // Mock data previews removed - now using real Snowflake data throughout

  const getFieldsForDataSource = useCallback(async (source) => {
    try {
      console.log(`Getting fields for data source: ${source}`);
      
      // Map frontend display names to API dataset IDs
      const datasetId = datasetService.mapDataSourceToId(source);
      console.log(`Mapped ${source} to dataset ID: ${datasetId}`);
      
      // Get schema from API
      const schema = await datasetService.getDatasetSchema(datasetId);
      console.log(`Schema response for ${source}:`, schema);
      
      if (schema && schema.columns) {
        console.log(`Retrieved ${schema.columns.length} fields for ${source}`);
        console.log('First few columns:', schema.columns.slice(0, 3));
        
        // Convert API schema format to frontend format
        const fields = schema.columns.map(col => ({
          name: col.name,
          type: col.type,
          source: source,
          category: col.category
        }));
        
        console.log(`Converted fields for ${source}:`, fields.slice(0, 3));
        return fields;
      } else {
        console.warn(`No schema returned for ${source}`);
        return [];
      }
    } catch (error) {
      console.error(`Failed to get fields for ${source}:`, error);
      
      // Fallback: return empty array if API fails
      console.warn('No fallback fields available - API required for field discovery');
      return [];
    }
  }, []);

  // Update available fields when data source changes
  useEffect(() => {
    const loadFields = async () => {
      if (selectedDataSource) {
        console.log(`Loading fields for selected data source: ${selectedDataSource}`);
        try {
          const fields = await getFieldsForDataSource(selectedDataSource);
          setAvailableFields(fields);
          console.log(`Loaded ${fields.length} fields for ${selectedDataSource}`);
        } catch (error) {
          console.error('Failed to load fields:', error);
          setAvailableFields([]);
        }
      } else {
        setAvailableFields([]);
      }
    };

    loadFields();
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
    } else if (currentStep === 2) { // From Filters directly to Analysis
      setIsDatasetLoading(true);
      try {
        console.log('Loading dataset with:', {
          selectedDataSource,
          selectedFilters,
          availableFields
        });
        
        // Automatically use all available fields for analysis
        const allDimensions = availableFields
          .filter(f => f.category === 'dimension')
          .map(f => f.name);
        const allMetrics = availableFields
          .filter(f => f.category === 'metric')
          .map(f => f.name);
        
        console.log('Auto-selected fields:', { allDimensions, allMetrics });
        
        const result = await datasetService.loadDataset(
          selectedDataSource,
          allDimensions,
          allMetrics,
          selectedFilters
        );
        
        console.log('Dataset load result:', result);
        
        // Validate result structure
        if (!result || !result.dataset) {
          throw new Error('Invalid dataset result structure');
        }
        
        setProcessedData(result.dataset); // Full dataset for AI analysis
        setPreviewData(result.previewData || result.dataset?.slice(0, 10)); // Preview data for UI
        setDatasetInfo(result.info || 'Dataset loaded successfully');
        setSessionId(result.sessionId);
        setCurrentStep(3); // Go directly to Analysis step
      } catch (err) {
        console.error('Dataset loading error:', err);
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
    setProcessedData(null);
    setPreviewData(null);
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
    if (currentStep >= 3) return null;
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
              mockDataSources={availableDataSources}
              selectedDataSource={selectedDataSource}
              setSelectedDataSource={setSelectedDataSource}
              availableFields={availableFields}
              isLoadingDataSources={isLoadingDataSources}
            />
          )}

          {currentStep === 2 && (
            <FiltersStep
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              availableFields={availableFields}
              selectedDataSource={selectedDataSource}
            />
          )}
          
          {currentStep === 3 && (
            <UnifiedAnalysisView 
              initialData={processedData}
              previewData={previewData}
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
