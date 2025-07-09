const snowflake = require('snowflake-sdk');
const fs = require('fs');
const path = require('path');

class SnowflakeService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionError = null;
    this.metadataCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    
    // Connection configuration with RSA key authentication
    const privateKeyPath = path.join(__dirname, '../../snowflake_rsa_key.pem');
    this.privateKey = null;
    
    try {
      if (fs.existsSync(privateKeyPath)) {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        console.log('✅ RSA private key loaded for Snowflake authentication');
      }
    } catch (error) {
      console.warn('⚠️ Could not load RSA private key:', error.message);
    }

    this.config = {
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USER,
      // Prioritize RSA key authentication if available
      ...(this.privateKey ? { 
        privateKey: this.privateKey,
        authenticator: 'SNOWFLAKE_JWT'
      } : {
        password: process.env.SNOWFLAKE_PASSWORD
      }),
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
      // Performance optimizations
      timeout: 30000,
      maxConnections: 5,
      sessionKeepAlive: true,
      clientSessionKeepAlive: true
    };

    console.log('SnowflakeService initialized with config:', {
      account: this.config.account,
      username: this.config.username,
      warehouse: this.config.warehouse,
      database: this.config.database,
      schema: this.config.schema
    });
  }

  // Test connection quickly with fallback authentication methods
  async testConnection() {
    try {
      console.log('Testing Snowflake connection...');
      
      // First try with existing config
      let result = await this.tryConnection(this.config);
      if (result.success) {
        return result;
      }
      
      console.log('Primary connection failed, trying alternative methods...');
      
      // If MFA error and we have RSA key, try JWT auth
      if (result.error.includes('Multi-factor authentication') && this.privateKey) {
        console.log('Trying RSA key authentication...');
        const jwtConfig = {
          ...this.config,
          privateKey: this.privateKey,
          authenticator: 'SNOWFLAKE_JWT'
        };
        delete jwtConfig.password;
        
        result = await this.tryConnection(jwtConfig);
        if (result.success) {
          this.config = jwtConfig; // Update config if successful
          return result;
        }
      }
      
      // If all authentication methods fail, provide helpful error message
      console.error('❌ All Snowflake authentication methods failed');
      console.error('💡 To fix this, you need to:');
      console.error('   1. Disable MFA for the user account, OR');
      console.error('   2. Associate the RSA public key with user J99G in Snowflake');
      
      return {
        success: false,
        error: `Authentication failed: ${result.error}. Either disable MFA or configure RSA key authentication.`,
        duration: result.duration,
        requiresManualFix: true
      };
    } catch (error) {
      console.error('Snowflake connection test error:', error);
      this.connectionError = error.message;
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  // Helper method to try a specific connection configuration
  async tryConnection(config) {
    const startTime = Date.now();
    const connection = snowflake.createConnection(config);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Connection timeout (30s)',
          duration: Date.now() - startTime
        });
      }, 30000);

      connection.connect((err, conn) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        if (err) {
          console.error('Connection attempt failed:', err.message);
          resolve({
            success: false,
            error: err.message,
            duration: duration
          });
        } else {
          console.log(`Connection successful (${duration}ms)`);
          this.isConnected = true;
          this.connection = conn;
          this.connectionError = null;
          
          resolve({
            success: true,
            duration: duration,
            account: config.account,
            database: config.database,
            schema: config.schema,
            warehouse: config.warehouse
          });
        }
      });
    });
  }

  // Get cached or fresh metadata
  async getMetadata(cacheKey, queryFn) {
    const now = Date.now();
    
    // Check cache
    if (this.metadataCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry > now) {
        console.log(`Using cached metadata for ${cacheKey}`);
        return this.metadataCache.get(cacheKey);
      }
    }
    
    // Fetch fresh data
    try {
      const data = await queryFn();
      this.metadataCache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, now + this.cacheTTL);
      console.log(`Cached fresh metadata for ${cacheKey}`);
      return data;
    } catch (error) {
      // Return cached data if available, even if expired
      if (this.metadataCache.has(cacheKey)) {
        console.warn(`Using stale cache for ${cacheKey} due to error:`, error.message);
        return this.metadataCache.get(cacheKey);
      }
      throw error;
    }
  }

  // Fast metadata discovery
  async discoverTables() {
    if (!this.isConnected) {
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`Cannot connect to Snowflake: ${testResult.error}`);
      }
    }

    return this.getMetadata('tables', async () => {
      console.log('Discovering tables in Snowflake...');
      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        const query = `
          SELECT 
            TABLE_NAME,
            TABLE_TYPE,
            ROW_COUNT,
            BYTES,
            COMMENT,
            CREATED as LAST_UPDATED
          FROM ${this.config.database}.INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = '${this.config.schema}'
          AND TABLE_TYPE = 'BASE TABLE'
          ORDER BY ROW_COUNT DESC NULLS LAST
          LIMIT 20
        `;

        this.connection.execute({
          sqlText: query,
          complete: (err, stmt, rows) => {
            const duration = Date.now() - startTime;
            
            if (err) {
              console.error(`Table discovery failed (${duration}ms):`, err.message);
              reject(new Error(`Failed to discover tables: ${err.message}`));
            } else {
              console.log(`Discovered ${rows.length} tables (${duration}ms)`);
              
              const tables = rows.map(row => ({
                id: row.TABLE_NAME.toLowerCase(),
                name: row.TABLE_NAME,
                description: row.COMMENT || `Table in ${this.config.schema} schema`,
                tables: [row.TABLE_NAME],
                row_count: row.ROW_COUNT || 0,
                size_bytes: row.BYTES || 0,
                last_updated: row.LAST_UPDATED || new Date().toISOString(),
                type: 'snowflake_table'
              }));
              
              resolve(tables);
            }
          }
        });
      });
    });
  }

  // Fast column discovery for a specific table
  async discoverColumns(tableName) {
    if (!this.isConnected) {
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`Cannot connect to Snowflake: ${testResult.error}`);
      }
    }

    const cacheKey = `columns_${tableName}`;
    
    return this.getMetadata(cacheKey, async () => {
      console.log(`Discovering columns for table ${tableName}...`);
      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        const query = `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COMMENT
          FROM ${this.config.database}.INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = '${this.config.schema}'
          AND TABLE_NAME = '${tableName.toUpperCase()}'
          ORDER BY ORDINAL_POSITION
        `;

        this.connection.execute({
          sqlText: query,
          complete: (err, stmt, rows) => {
            const duration = Date.now() - startTime;
            
            if (err) {
              console.error(`Column discovery failed for ${tableName} (${duration}ms):`, err.message);
              reject(new Error(`Failed to discover columns: ${err.message}`));
            } else {
              console.log(`Discovered ${rows.length} columns for ${tableName} (${duration}ms)`);
              
              const columns = rows.map(row => ({
                name: row.COLUMN_NAME,
                type: this.mapSnowflakeType(row.DATA_TYPE),
                category: this.categorizeColumn(row.COLUMN_NAME, row.DATA_TYPE),
                nullable: row.IS_NULLABLE === 'YES',
                comment: row.COMMENT || null
              }));
              
              resolve({
                columns: columns,
                total_columns: columns.length,
                dimensions: columns.filter(c => c.category === 'dimension').length,
                metrics: columns.filter(c => c.category === 'metric').length
              });
            }
          }
        });
      });
    });
  }

  // Sample data from table efficiently
  async sampleData(tableName, columns = [], limit = 100) {
    if (!this.isConnected) {
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`Cannot connect to Snowflake: ${testResult.error}`);
      }
    }

    console.log(`Sampling data from ${tableName}...`);
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // Build column list
      const columnList = columns.length > 0 ? columns.join(', ') : '*';
      
      const query = `
        SELECT ${columnList}
        FROM ${this.config.database}.${this.config.schema}.${tableName.toUpperCase()}
        SAMPLE (100 ROWS)
        LIMIT ${Math.min(limit, 1000)}
      `;

      this.connection.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          const duration = Date.now() - startTime;
          
          if (err) {
            console.error(`Data sampling failed for ${tableName} (${duration}ms):`, err.message);
            reject(new Error(`Failed to sample data: ${err.message}`));
          } else {
            console.log(`Sampled ${rows.length} rows from ${tableName} (${duration}ms)`);
            resolve(rows);
          }
        }
      });
    });
  }

  // Map Snowflake types to frontend types
  mapSnowflakeType(snowflakeType) {
    const type = snowflakeType.toUpperCase();
    
    if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('STRING')) {
      return 'String';
    }
    if (type.includes('NUMBER') || type.includes('DECIMAL') || type.includes('FLOAT')) {
      return 'Number';
    }
    if (type.includes('INTEGER') || type.includes('BIGINT')) {
      return 'Integer';
    }
    if (type.includes('DATE') || type.includes('TIMESTAMP')) {
      return 'Date';
    }
    if (type.includes('BOOLEAN')) {
      return 'Boolean';
    }
    
    return 'String'; // Default fallback
  }

  // Categorize columns as dimensions or metrics
  categorizeColumn(columnName, dataType) {
    const name = columnName.toLowerCase();
    const type = dataType.toUpperCase();
    
    // Metrics (numerical measures)
    if (type.includes('NUMBER') || type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('INTEGER')) {
      if (name.includes('id') || name.includes('key') || name.includes('code')) {
        return 'dimension'; // IDs are dimensions even if numeric
      }
      return 'metric';
    }
    
    // Dates can be both, but usually dimensions for grouping
    if (type.includes('DATE') || type.includes('TIMESTAMP')) {
      return 'dimension';
    }
    
    // Everything else is a dimension
    return 'dimension';
  }

  // Close connection
  async disconnect() {
    if (this.connection) {
      console.log('Disconnecting from Snowflake...');
      return new Promise((resolve) => {
        this.connection.destroy((err) => {
          if (err) {
            console.error('Error disconnecting from Snowflake:', err.message);
          } else {
            console.log('Disconnected from Snowflake successfully');
          }
          this.connection = null;
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      error: this.connectionError,
      cache_size: this.metadataCache.size,
      config: {
        account: this.config.account,
        database: this.config.database,
        schema: this.config.schema,
        warehouse: this.config.warehouse
      }
    };
  }
}

// Export singleton instance
const snowflakeService = new SnowflakeService();
module.exports = snowflakeService;