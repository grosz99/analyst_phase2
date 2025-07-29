const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionError = null;
    this.metadataCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    
    // Initialize Supabase client
    this.config = {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_KEY
    };

    if (!this.config.url || !this.config.key) {
      console.error('❌ SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
      this.connectionError = 'Missing Supabase configuration';
      return;
    }

    try {
      this.client = createClient(this.config.url, this.config.key);
      console.log('✅ Supabase client initialized successfully');
      this.isConnected = true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      this.connectionError = error.message;
    }
  }

  // Test connection and discover actual table structure
  async testConnection() {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      // Test by getting a sample of data to see actual column names
      const { data, error } = await this.client
        .from('NCC')
        .select('*')
        .limit(1);

      if (error) {
        throw error;
      }

      const duration = Date.now() - startTime;
      
      // Log actual column names for debugging
      if (data && data.length > 0) {
        console.log('✅ NCC table columns found:', Object.keys(data[0]));
      }
      
      return {
        success: true,
        message: 'Supabase connection successful',
        duration: duration,
        database: 'Supabase',
        actualColumns: data && data.length > 0 ? Object.keys(data[0]) : [],
        config: {
          url: this.config.url,
          status: 'connected'
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Supabase connection test failed:', error);
      
      return {
        success: false,
        error: error.message,
        duration: duration
      };
    }
  }

  // Get available tables (for now just return our known tables)
  async discoverTables() {
    try {
      // For now, return the tables we know exist based on your setup
      const tables = [
        {
          id: 'ncc',
          name: 'NCC',
          description: 'Network Call Center performance metrics',
          tables: ['NCC'],
          row_count: 450000, // Approximate
          size_bytes: 8960000,
          last_updated: new Date().toISOString(),
          type: 'supabase_table'
        },
        {
          id: 'attendance',
          name: 'ATTENDANCE',
          description: 'Employee attendance tracking data',
          tables: ['ATTENDANCE'],
          row_count: 125000,
          size_bytes: 2560000,
          last_updated: new Date().toISOString(),
          type: 'supabase_table'
        },
        {
          id: 'pipeline',
          name: 'PIPELINE',
          description: 'Sales pipeline and opportunity tracking',
          tables: ['PIPELINE'],
          row_count: 85000,
          size_bytes: 1920000,
          last_updated: new Date().toISOString(),
          type: 'supabase_table'
        }
      ];

      return tables;
    } catch (error) {
      console.error('Failed to discover tables:', error);
      throw error;
    }
  }

  // Get columns for a table
  async discoverColumns(tableName) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const cacheKey = `columns_${tableName}`;
      if (this.isValidCached(cacheKey)) {
        return this.metadataCache.get(cacheKey);
      }

      // For now, return schema based on what we know from your fixedMetadata
      const tableSchemas = {
        ncc: {
          columns: [
            { name: 'MONTH', type: 'timestamp', category: 'dimension' },
            { name: 'OFFICE', type: 'text', category: 'dimension' },
            { name: 'REGION', type: 'text', category: 'dimension' },
            { name: 'SECTOR', type: 'text', category: 'dimension' },
            { name: 'CLIENT', type: 'text', category: 'dimension' },
            { name: 'CALLS_HANDLED', type: 'integer', category: 'metric' },
            { name: 'AVG_HANDLE_TIME', type: 'numeric', category: 'metric' },
            { name: 'SATISFACTION_SCORE', type: 'numeric', category: 'metric' },
            { name: 'REVENUE', type: 'numeric', category: 'metric' }
          ],
          total_columns: 9,
          dimensions: 5,
          metrics: 4
        },
        attendance: {
          columns: [
            { name: 'DATE', type: 'date', category: 'dimension' },
            { name: 'EMPLOYEE_ID', type: 'text', category: 'dimension' },
            { name: 'OFFICE', type: 'text', category: 'dimension' },
            { name: 'COHORT', type: 'text', category: 'dimension' },
            { name: 'ORG', type: 'text', category: 'dimension' },
            { name: 'STATUS', type: 'text', category: 'dimension' },
            { name: 'HOURS_WORKED', type: 'numeric', category: 'metric' },
            { name: 'OVERTIME_HOURS', type: 'numeric', category: 'metric' }
          ],
          total_columns: 8,
          dimensions: 6,
          metrics: 2
        },
        pipeline: {
          columns: [
            { name: 'OPPORTUNITY_ID', type: 'text', category: 'dimension' },
            { name: 'CREATE_DATE', type: 'date', category: 'dimension' },
            { name: 'CLOSE_DATE', type: 'date', category: 'dimension' },
            { name: 'STAGE', type: 'text', category: 'dimension' },
            { name: 'COMPANY', type: 'text', category: 'dimension' },
            { name: 'SECTOR', type: 'text', category: 'dimension' },
            { name: 'REGION', type: 'text', category: 'dimension' },
            { name: 'OPPORTUNITY_VALUE', type: 'numeric', category: 'metric' },
            { name: 'PROBABILITY', type: 'numeric', category: 'metric' },
            { name: 'WEIGHTED_VALUE', type: 'numeric', category: 'metric' }
          ],
          total_columns: 10,
          dimensions: 7,
          metrics: 3
        }
      };

      const schema = tableSchemas[tableName.toLowerCase()];
      if (!schema) {
        throw new Error(`Table ${tableName} not found`);
      }

      // Cache the result
      this.metadataCache.set(cacheKey, schema);
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

      return schema;
    } catch (error) {
      console.error(`Failed to discover columns for ${tableName}:`, error);
      throw error;
    }
  }

  // Sample data from a table
  async sampleData(tableName, columns = [], limit = 1000, filters = {}) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      console.log(`Querying Supabase table ${tableName} with limit ${limit}`);
      
      // Convert tableName to uppercase as that's how it's stored
      const actualTableName = tableName.toUpperCase();
      
      let query = this.client.from(actualTableName);
      
      // Select specific columns if provided, otherwise select all
      if (columns && columns.length > 0) {
        query = query.select(columns.join(', '));
      } else {
        query = query.select('*');
      }

      // Apply filters if provided
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn(`No data returned from ${actualTableName}`);
        return [];
      }

      console.log(`Retrieved ${data.length} rows from ${actualTableName}`);
      return data;
      
    } catch (error) {
      console.error(`Failed to sample data from ${tableName}:`, error);
      throw error;
    }
  }

  // Get distinct values for filters
  async getDistinctValues(tableName, columnName, limit = 100) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const actualTableName = tableName.toUpperCase();
      
      const { data, error } = await this.client
        .from(actualTableName)
        .select(columnName)
        .not(columnName, 'is', null)
        .limit(limit);

      if (error) {
        throw error;
      }

      // Extract unique values
      const uniqueValues = [...new Set(data.map(row => row[columnName]))];
      return uniqueValues.slice(0, limit);

    } catch (error) {
      console.error(`Failed to get distinct values for ${tableName}.${columnName}:`, error);
      throw error;
    }
  }

  // Get service status
  getStatus() {
    return {
      connected: this.isConnected,
      client_initialized: !!this.client,
      cache_size: this.metadataCache.size,
      error: this.connectionError,
      config: {
        url: this.config.url,
        has_key: !!this.config.key
      }
    };
  }

  // Cache helper methods
  isValidCached(key) {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.metadataCache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    return this.metadataCache.has(key);
  }

  // Clear cache
  clearCache() {
    this.metadataCache.clear();
    this.cacheExpiry.clear();
  }
}

// Export singleton instance
const supabaseService = new SupabaseService();
module.exports = supabaseService;