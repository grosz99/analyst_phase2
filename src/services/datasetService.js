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
          
          let dataForUI;
          
          // Check if we have real Snowflake data or need to generate mock data
          if (result.sample_data && result.sample_data.length > 0) {
            // Use real Snowflake sample data
            console.log('Using real Snowflake sample data');
            dataForUI = result.sample_data;
          } else {
            // Generate mock data from schema
            console.log('Generating mock data from schema');
            dataForUI = this.generateMockDataFromSchema(result.schema, userSelections.columns);
          }
          
          return {
            dataset: dataForUI,
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
        console.warn('API loading failed, falling back to mock data:', apiError.message);
        console.error('Full API error:', apiError);
        
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
      // Old mock data mappings (for fallback)
      'Sales Data': 'sales_data',
      'Customer Data': 'customer_data', 
      'Product Data': 'product_data',
      // New Snowflake table mappings
      'ORDERS': 'orders',
      'CUSTOMERS': 'customers',
      'PRODUCTS': 'products'
    };
    
    // If exact match found, use it
    if (mapping[dataSourceName]) {
      return mapping[dataSourceName];
    }
    
    // Try lowercase version
    const lowercaseId = dataSourceName.toLowerCase();
    return lowercaseId || 'orders'; // Default to orders table
  }

  generateMockDataFromSchema(schema, selectedColumns) {
    // Generate sample data rows based on the schema for UI display
    const sampleSize = Math.min(50, schema.row_count || 50);
    const mockData = [];

    for (let i = 0; i < sampleSize; i++) {
      const row = {};
      
      selectedColumns.forEach(columnName => {
        const column = schema.columns.find(col => col.name === columnName);
        if (column) {
          row[columnName] = this.generateSampleValue(column.type, i, columnName);
        } else {
          // Fallback for missing columns
          row[columnName] = this.generateSampleValue('String', i, columnName);
        }
      });
      
      mockData.push(row);
    }

    return mockData;
  }

  generateSampleValue(type, index, columnName) {
    // Create deterministic but varied data based on column name and index
    const seed = this.simpleHash(columnName + index);
    const random = this.seededRandom(seed);
    
    switch (type.toLowerCase()) {
      case 'date':
        const startDate = new Date('2024-01-01');
        const randomDays = Math.floor(random() * 180);
        const sampleDate = new Date(startDate.getTime() + randomDays * 24 * 60 * 60 * 1000);
        return sampleDate.toISOString().split('T')[0];
      
      case 'string':
      case 'utf8':
        return this.generateStringValue(columnName, index, random);
      
      case 'number':
      case 'float64':
        return this.generateNumberValue(columnName, random);
      
      case 'int64':
      case 'integer':
        return this.generateIntegerValue(columnName, random);
      
      default:
        return `${columnName}_${index + 1}`;
    }
  }

  generateStringValue(columnName, index, random) {
    const columnLower = columnName.toLowerCase();
    
    if (columnLower.includes('region')) {
      const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];
      return regions[Math.floor(random() * regions.length)];
    }
    
    if (columnLower.includes('product') || columnLower.includes('item')) {
      const products = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Automotive', 'Health', 'Beauty'];
      return products[Math.floor(random() * products.length)];
    }
    
    if (columnLower.includes('customer') || columnLower.includes('segment')) {
      const segments = ['Enterprise', 'SMB', 'Consumer', 'Government', 'Education', 'Healthcare'];
      return segments[Math.floor(random() * segments.length)];
    }
    
    if (columnLower.includes('category')) {
      const categories = ['Premium', 'Standard', 'Basic', 'Luxury', 'Budget'];
      return categories[Math.floor(random() * categories.length)];
    }
    
    if (columnLower.includes('status')) {
      const statuses = ['Active', 'Inactive', 'Pending', 'Completed', 'In Progress'];
      return statuses[Math.floor(random() * statuses.length)];
    }
    
    // Default varied string values
    const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    const suffixes = ['Pro', 'Plus', 'Max', 'Elite', 'Standard', 'Basic', 'Premium', 'Essential'];
    
    const prefix = prefixes[Math.floor(random() * prefixes.length)];
    const suffix = suffixes[Math.floor(random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
  }

  // Simple hash function for deterministic randomness
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Seeded random number generator
  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  generateNumberValue(columnName, random) {
    const columnLower = columnName.toLowerCase();
    
    if (columnLower.includes('revenue') || columnLower.includes('sales')) {
      // Revenue: $10K to $10M
      return Math.round((random() * 9990000 + 10000) * 100) / 100;
    }
    
    if (columnLower.includes('price') || columnLower.includes('cost')) {
      // Price: $1 to $1000
      return Math.round((random() * 999 + 1) * 100) / 100;
    }
    
    if (columnLower.includes('margin') || columnLower.includes('percent')) {
      // Percentage: 0% to 100%
      return Math.round(random() * 100 * 100) / 100;
    }
    
    if (columnLower.includes('rating') || columnLower.includes('score')) {
      // Rating: 1 to 5
      return Math.round((random() * 4 + 1) * 100) / 100;
    }
    
    // Default: general business metric
    return Math.round((random() * 100000 + 1000) * 100) / 100;
  }

  generateIntegerValue(columnName, random) {
    const columnLower = columnName.toLowerCase();
    
    if (columnLower.includes('units') || columnLower.includes('quantity') || columnLower.includes('sold')) {
      // Units: 1 to 10,000
      return Math.floor(random() * 9999) + 1;
    }
    
    if (columnLower.includes('customer') || columnLower.includes('user')) {
      // Customer count: 100 to 100,000
      return Math.floor(random() * 99900) + 100;
    }
    
    if (columnLower.includes('id') || columnLower.includes('identifier')) {
      // ID: 1000 to 999999
      return Math.floor(random() * 999000) + 1000;
    }
    
    if (columnLower.includes('day') || columnLower.includes('week') || columnLower.includes('month')) {
      // Time periods: 1 to 365
      return Math.floor(random() * 365) + 1;
    }
    
    // Default: general count
    return Math.floor(random() * 1000) + 10;
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
