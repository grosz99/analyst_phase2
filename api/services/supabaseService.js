const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionError = null;
    this.metadataCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    
    // Initialize Supabase client - handle both local and Vercel environments
    this.config = {
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    };

    if (!this.config.url || !this.config.key) {
      console.error('❌ Supabase configuration missing:', {
        url_available: !!this.config.url,
        key_available: !!this.config.key,
        env_vars_checked: [
          'SUPABASE_URL', 
          'VITE_SUPABASE_URL', 
          'SUPABASE_SERVICE_ROLE_KEY', 
          'SUPABASE_KEY'
        ]
      });
      this.connectionError = 'Missing Supabase configuration in environment variables';
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

      // Return schema based on actual Supabase table structure
      const tableSchemas = {
        ncc: {
          columns: [
            { name: 'Month', type: 'text', category: 'dimension' },
            { name: 'Office', type: 'text', category: 'dimension' },
            { name: 'Region', type: 'text', category: 'dimension' },
            { name: 'Sector', type: 'text', category: 'dimension' },
            { name: 'Client', type: 'text', category: 'dimension' },
            { name: 'Project_ID', type: 'text', category: 'dimension' },
            { name: 'Timesheet_Charges', type: 'numeric', category: 'metric' },
            { name: 'Adjustments', type: 'numeric', category: 'metric' },
            { name: 'NCC', type: 'numeric', category: 'metric' }
          ],
          total_columns: 9,
          dimensions: 6,
          metrics: 3
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

      console.log(`🔍 Querying Supabase table "${tableName}" with limit ${limit}`);
      console.log(`🔍 Columns requested:`, columns);
      console.log(`🔍 Filters:`, filters);
      
      // First, try the exact table name as provided, then try uppercase
      let actualTableName = tableName;
      
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
        // If table not found, try with uppercase name
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`Table ${actualTableName} not found, trying uppercase: ${tableName.toUpperCase()}`);
          actualTableName = tableName.toUpperCase();
          query = this.client.from(actualTableName);
          
          if (columns && columns.length > 0) {
            query = query.select(columns.join(', '));
          } else {
            query = query.select('*');
          }
          
          Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== '') {
              if (Array.isArray(value)) {
                query = query.in(key, value);
              } else {
                query = query.eq(key, value);
              }
            }
          });
          
          query = query.limit(limit);
          const { data: retryData, error: retryError } = await query;
          
          if (retryError) {
            console.error(`Failed to sample data from ${tableName}:`, retryError);
            throw retryError;
          }
          
          if (!retryData || retryData.length === 0) {
            console.warn(`No data returned from ${actualTableName} (uppercase retry)`);
            return [];
          }
          
          return retryData;
        }
        
        console.error(`Failed to sample data from ${tableName}:`, error);
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

  // Health check with latency measurement
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        return { 
          healthy: false, 
          error: 'Supabase client not initialized',
          latency: 0
        };
      }

      // Quick health check - get one row from NCC table
      const { data, error } = await this.client
        .from('NCC')
        .select('*')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return { 
          healthy: false, 
          error: error.message,
          latency: latency
        };
      }
      
      return { 
        healthy: true, 
        latency: latency,
        sample_data_available: data && data.length > 0
      };
      
    } catch (err) {
      return { 
        healthy: false, 
        error: err.message,
        latency: Date.now() - startTime
      };
    }
  }

  // List all tables in the database (for debugging)
  async listTables() {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }
      
      // Try to query information_schema to get table names
      const { data, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (error) {
        console.warn('Could not query information_schema, trying common table names...');
        // Try common variations
        const testTables = ['ncc', 'NCC', 'Net_Cash_Contribution'];
        const existingTables = [];
        
        for (const tableName of testTables) {
          try {
            const { data: testData, error: testError } = await this.client
              .from(tableName)
              .select('*')
              .limit(1);
            if (!testError) {
              existingTables.push(tableName);
            }
          } catch (e) {
            // Table doesn't exist
          }
        }
        
        return existingTables;
      }
      
      return data?.map(row => row.table_name) || [];
    } catch (error) {
      console.error('Error listing tables:', error);
      return [];
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