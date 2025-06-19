// frontend/src/services/datasetService.js
class DatasetService {
  constructor() {
    this.currentDataset = null;
    this.datasetInfo = null;
    this.datasetSession = null;
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '' // Use relative URLs in production
      : 'http://localhost:3001';
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
      console.warn('API unavailable, falling back to mock data:', error.message);
      
      // Fallback to mock data structure
      return [
        {
          id: 'sales_data',
          name: 'Sales Data',
          description: 'Historical sales transactions and performance metrics',
          tables: ['sales_transactions', 'customer_data', 'product_catalog'],
          row_count: 2400000,
          last_updated: '2024-06-15T10:30:00Z'
        },
        {
          id: 'customer_data',
          name: 'Customer Data', 
          description: 'Customer demographics and behavior analytics',
          tables: ['customers', 'customer_segments', 'customer_journey'],
          row_count: 150000,
          last_updated: '2024-06-14T15:45:00Z'
        },
        {
          id: 'product_data',
          name: 'Product Data',
          description: 'Product catalog and inventory management',
          tables: ['products', 'inventory', 'suppliers'],
          row_count: 85000,
          last_updated: '2024-06-16T09:15:00Z'
        }
      ];
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
      console.warn('Schema API unavailable, using fallback');
      // Return basic schema structure
      return {
        columns: [
          { name: 'date', type: 'Date', category: 'dimension' },
          { name: 'region', type: 'String', category: 'dimension' },
          { name: 'revenue', type: 'Number', category: 'metric' },
          { name: 'units_sold', type: 'Number', category: 'metric' }
        ],
        total_columns: 4,
        dimensions: 2,
        metrics: 2
      };
    }
  }

  async loadDataset(selectedDataSource, dimensions, metrics, filters, mockDataPreviews = null) {
    try {
      console.log('Loading dataset with:', { selectedDataSource, dimensions, metrics, filters });
      
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
          
          return {
            dataset: result.schema,
            info: result.message,
            sessionId: sessionId,
            processingTime: result.processing_time,
            source: 'api'
          };
        } else {
          throw new Error(result.error || 'API call failed');
        }
      } catch (apiError) {
        console.warn('API loading failed, falling back to mock data:', apiError.message);
        
        // Fallback to original mock data logic
        const sourceData = mockDataPreviews?.[selectedDataSource] || [];
        const filteredData = this.applyFilters(sourceData, filters);
        const finalColumns = [...dimensions, ...metrics];
        const processedData = filteredData.map(row => 
          Object.fromEntries(finalColumns.map(col => [col, row[col]]))
        );

        const sessionId = `session-${Date.now()}`;
        const info = `Your dataset with ${processedData.length} rows and ${finalColumns.length} columns is loaded from ${selectedDataSource} (fallback mode).`;

        console.log(`Dataset loaded via fallback: ${processedData.length} rows × ${finalColumns.length} columns`);
        
        return {
          dataset: processedData,
          info,
          sessionId,
          source: 'fallback'
        };
      }
    } catch (err) {
      console.error('Dataset loading error:', err);
      throw new Error(`Failed to load dataset: ${err.message}`);
    }
  }

  mapDataSourceToId(dataSourceName) {
    const mapping = {
      'Sales Data': 'sales_data',
      'Customer Data': 'customer_data', 
      'Product Data': 'product_data'
    };
    return mapping[dataSourceName] || 'sales_data';
  }

  applyFilters(data, filters) {
    // If no filters, return original data
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    // Apply each filter
    return data.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        // Skip empty filters
        if (!value) continue;
        
        // If row doesn't have the key or value doesn't match, exclude it
        if (!row.hasOwnProperty(key) || row[key] !== value) {
          return false;
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
}

const datasetService = new DatasetService();
export default datasetService;
