// frontend/src/services/datasetService.js
class DatasetService {
  constructor() {
    this.currentDataset = null;
    this.datasetInfo = null;
    this.datasetSession = null;
  }

  async loadDataset(selectedDataSource, dimensions, metrics, filters, mockDataPreviews) {
    try {
      console.log('Loading dataset with:', { selectedDataSource, dimensions, metrics, filters });
      
      // Prepare dataset from user selections
      const sourceData = mockDataPreviews[selectedDataSource] || [];
      console.log(`Found mock data for ${selectedDataSource}:`, sourceData.length, 'rows');

      // Apply filters if any
      const filteredData = this.applyFilters(sourceData, filters);
      
      // Select only chosen dimensions + metrics
      const finalColumns = [...dimensions, ...metrics];
      const processedData = filteredData.map(row => 
        Object.fromEntries(finalColumns.map(col => [col, row[col]]))
      );

      // Store dataset info
      const sessionId = `session-${Date.now()}`;
      const info = `Your dataset with ${processedData.length} rows and ${finalColumns.length} columns is loaded from ${selectedDataSource}.`;

      console.log(`Dataset loaded: ${processedData.length} rows × ${finalColumns.length} columns`);
      
      return {
        dataset: processedData,
        info,
        sessionId
      };
    } catch (err) {
      console.error('Dataset loading error:', err);
      throw new Error(`Failed to load dataset: ${err.message}`);
    }
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
