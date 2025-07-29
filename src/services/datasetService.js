// frontend/src/services/datasetService.js
class DatasetService {
  constructor() {
    this.currentDataset = null;
    this.datasetInfo = null;
    this.datasetSession = null;
    // Use environment variable if available, otherwise fallback to localhost in dev
    this.baseURL = process.env.REACT_APP_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? '' // Use relative URLs in production
        : 'http://localhost:3001');
  }

  async getAvailableDatasets() {
    try {
      console.log('Fetching available datasets from API...');
      
      const response = await fetch(`${this.baseURL}/api/available-datasets`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Available datasets:', result.datasets);
        return result.datasets;
      } else {
        throw new Error(result.error || 'Failed to fetch datasets');
      }
    } catch (error) {
      console.error('API unavailable:', error.message);
      throw new Error('Data source unavailable. Please check your connection.');
    }
  }

  async getDatasetSchema(datasetId) {
    try {
      const response = await fetch(`${this.baseURL}/api/dataset/${datasetId}/schema`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.schema;
      } else {
        throw new Error(result.error || 'Failed to fetch schema');
      }
    } catch (error) {
      console.error('Schema API unavailable for', datasetId, ':', error.message);
      throw new Error(`Failed to fetch schema for ${datasetId}. Please check your connection.`);
    }
  }

  async loadDataset(selectedDataSource, dimensions, metrics, filters) {
    try {
      console.log('Loading dataset with:', { selectedDataSource, dimensions, metrics, filters });
      console.log('Using API URL:', this.baseURL);
      
      // Try API first
      try {
        const datasetId = this.mapDataSourceToId(selectedDataSource);
        const userSelections = {
          columns: [...dimensions, ...metrics],
          filters: filters,
          sample_rate: 1.0
        };

        const response = await fetch(`${this.baseURL}/api/load-dataset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datasetId: datasetId,
            userSelections: userSelections
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          // Store dataset info for analysis
          const sessionId = `session-${Date.now()}`;
          this.currentDataset = result;
          this.datasetSession = sessionId;
          this.datasetInfo = result.message;

          console.log('Dataset loaded via API:', result);
          
          let dataForUI, dataForAnalysis;
          
          // Check if we have real Snowflake data or need to generate mock data
          if (result.analysis_data && result.analysis_data.length > 0) {
            // Use real Snowflake data - full dataset for analysis
            console.log(`Using real Snowflake data: ${result.analysis_data.length} rows for analysis`);
            dataForAnalysis = result.analysis_data;
            dataForUI = result.sample_data || result.analysis_data.slice(0, 5); // Preview data
          } else if (result.sample_data && result.sample_data.length > 0) {
            // Use sample data only if available
            console.log('Using sample data');
            dataForAnalysis = result.sample_data;
            dataForUI = result.sample_data;
          } else {
            // No fallback - throw error to show real issue
            throw new Error(`No data returned from ${selectedDataSource}. Check Snowflake connection.`);
          }
          
          return {
            dataset: dataForAnalysis, // Full dataset for AI analysis
            previewData: dataForUI, // Limited data for UI preview
            info: result.message,
            sessionId: sessionId,
            processingTime: result.processing_time || result.performance?.duration,
            source: result.source || 'api',
            performance: result.performance,
            snowflake_connected: result.source === 'snowflake'
          };
        } else {
          throw new Error(result.error || 'API call failed');
        }
      } catch (apiError) {
        console.error('API loading failed:', apiError.message);
        console.error('Full API error:', apiError);
        
        // Don't generate mock data - throw error to show user real issue
        throw new Error(`Failed to load real data from ${selectedDataSource}: ${apiError.message}`);
      }
    } catch (err) {
      console.error('Dataset loading error:', err);
      throw new Error(`Failed to load dataset: ${err.message}`);
    }
  }

  mapDataSourceToId(dataSourceName) {
    const mapping = {
      // Real business datasets only
      'ATTENDANCE': 'attendance',
      'NCC': 'ncc',
      'PIPELINE': 'pipeline'
    };
    
    // If exact match found, use it
    if (mapping[dataSourceName]) {
      return mapping[dataSourceName];
    }
    
    // Try lowercase version
    const lowercaseId = dataSourceName.toLowerCase();
    return lowercaseId || 'attendance'; // Default to attendance data
  }

  // Removed mock data generation - only real Snowflake data allowed

  // All mock data generation removed - only real Snowflake data allowed

  async getSampleDataForFilters(datasetId, fieldName) {
    try {
      // Use fixed metadata for filter values (fast, no database cost)
      const response = await fetch(`${this.baseURL}/api/dataset/${datasetId}/field/${fieldName}/values`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.values && result.values.length > 0) {
        console.log(`Got ${result.values.length} filter values for ${fieldName} from ${result.source}`);
        return result.values;
      } else {
        throw new Error('No filter values available');
      }
    } catch (error) {
      console.error(`Failed to get filter data for ${fieldName}:`, error.message);
      throw new Error(`Cannot get filter values for ${fieldName}.`);
    }
  }

  // Mock filter generation removed - only real Snowflake values allowed

  applyFilters(data, filters) {
    // If no filters, return original data
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    // Apply each filter
    return data.filter(row => {
      for (const [key, filterValue] of Object.entries(filters)) {
        // Skip empty filters
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) continue;
        
        // Handle array filters (multiselect)
        if (Array.isArray(filterValue)) {
          // Row must match at least one of the selected values
          if (!row.hasOwnProperty(key) || !filterValue.includes(row[key])) {
            return false;
          }
        } else {
          // Handle single value filters (backward compatibility)
          if (!row.hasOwnProperty(key) || row[key] !== filterValue) {
            return false;
          }
        }
      }
      return true;
    });
  }

  isDatasetLoaded() {
    return this.currentDataset !== null && this.datasetSession !== null;
  }

  getDatasetInfo() {
    return this.datasetInfo;
  }

  getDatasetSession() {
    return this.datasetSession;
  }

  clearDataset() {
    this.currentDataset = null;
    this.datasetInfo = null;
    this.datasetSession = null;
  }

  // Duplicate method removed - only real Snowflake filter data allowed
}

const datasetService = new DatasetService();
export default datasetService;
