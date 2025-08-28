const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

/**
 * SQLite Service for Data Analysis
 * Ingests data from Supabase and provides SQL query execution
 */
class SQLiteService {
  constructor() {
    this.db = null;
    // Try multiple paths for SQLite database
    const possiblePaths = [
      path.join(__dirname, '..', 'data', 'analysis.db'),
      path.join(__dirname, '..', '..', 'analysis.db'),
      path.join(process.cwd(), 'analysis.db'),
      '/tmp/analysis.db'
    ];
    
    this.dbPath = possiblePaths.find(dbPath => {
      try {
        return require('fs').existsSync(dbPath);
      } catch {
        return false;
      }
    }) || possiblePaths[0];
    this.isInitialized = false;
    this.supabaseClient = null;
    this.tableSchemas = new Map();
    
    // Initialize database
    this.initializeDatabase();
  }

  initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new Database(this.dbPath);
      console.log('✅ SQLite database initialized at:', this.dbPath);
      
      // Initialize Supabase client for data ingestion
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized for data ingestion');
      } else {
        console.warn('⚠️ Supabase credentials not found - cannot ingest fresh data');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize SQLite service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Ingest NCC data from Supabase into SQLite
   */
  async ingestNCCData() {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized - cannot ingest data');
    }

    console.log('📥 Starting NCC data ingestion from Supabase...');
    
    try {
      // Fetch all data from NCC table
      const { data: nccData, error } = await this.supabaseClient
        .from('NCC')
        .select('*');
        
      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }
      
      if (!nccData || nccData.length === 0) {
        throw new Error('No data found in NCC table');
      }
      
      console.log(`📊 Retrieved ${nccData.length} records from Supabase NCC table`);
      
      // Create NCC table in SQLite based on actual data structure
      const sampleRecord = nccData[0];
      const columns = Object.keys(sampleRecord);
      
      // Drop existing table if it exists
      this.db.exec('DROP TABLE IF EXISTS NCC');
      
      // Create table with dynamic schema
      const columnDefs = columns.map(col => {
        const sampleValue = sampleRecord[col];
        let type = 'TEXT';
        
        if (typeof sampleValue === 'number') {
          type = Number.isInteger(sampleValue) ? 'INTEGER' : 'REAL';
        } else if (sampleValue instanceof Date) {
          type = 'DATETIME';
        }
        
        return `"${col}" ${type}`;
      }).join(', ');
      
      const createTableSQL = `CREATE TABLE NCC (${columnDefs})`;
      this.db.exec(createTableSQL);
      console.log('✅ Created NCC table with schema:', columns);
      
      // Store schema for query generation
      this.tableSchemas.set('NCC', {
        columns: columns,
        sample_data: nccData.slice(0, 5)
      });
      
      // Insert data using prepared statement for performance
      const placeholders = columns.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO NCC (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`;
      const insertStmt = this.db.prepare(insertSQL);
      
      // Insert all records in a transaction
      const insertMany = this.db.transaction((records) => {
        for (const record of records) {
          const values = columns.map(col => record[col]);
          insertStmt.run(values);
        }
      });
      
      insertMany(nccData);
      
      console.log(`✅ Ingested ${nccData.length} records into SQLite NCC table`);
      
      // Verify ingestion
      const count = this.db.prepare('SELECT COUNT(*) as count FROM NCC').get();
      console.log(`📊 Verification: SQLite NCC table contains ${count.count} records`);
      
      return {
        success: true,
        records_ingested: nccData.length,
        columns: columns,
        table_name: 'NCC'
      };
      
    } catch (error) {
      console.error('❌ Failed to ingest NCC data:', error);
      throw error;
    }
  }

  /**
   * Execute SQL query against SQLite database
   */
  executeQuery(sqlQuery, userQuestion = '') {
    if (!this.isInitialized || !this.db) {
      throw new Error('SQLite database not initialized');
    }
    
    console.log('🔍 Executing SQL query:', sqlQuery);
    console.log('❓ User question:', userQuestion);
    
    try {
      // Security: Basic SQL injection prevention
      const sanitizedQuery = this.sanitizeSQL(sqlQuery);
      
      // Execute query
      const startTime = Date.now();
      let results;
      
      if (sanitizedQuery.toLowerCase().trim().startsWith('select')) {
        // SELECT query - return all rows
        const stmt = this.db.prepare(sanitizedQuery);
        results = stmt.all();
      } else {
        // Other queries (INSERT, UPDATE, DELETE) - return info
        const stmt = this.db.prepare(sanitizedQuery);
        const info = stmt.run();
        results = [{
          operation: 'executed',
          changes: info.changes,
          last_insert_rowid: info.lastInsertRowid
        }];
      }
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Query executed in ${executionTime}ms, returned ${results.length} rows`);
      
      return {
        success: true,
        results: results,
        columns: results.length > 0 ? Object.keys(results[0]) : [],
        row_count: results.length,
        execution_time: executionTime,
        query_executed: sanitizedQuery
      };
      
    } catch (error) {
      console.error('❌ SQL query execution failed:', error);
      return {
        success: false,
        error: error.message,
        query_attempted: sqlQuery
      };
    }
  }

  /**
   * Basic SQL sanitization
   */
  sanitizeSQL(sql) {
    // Remove dangerous patterns
    const dangerous = [
      /drop\s+table/gi,
      /drop\s+database/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      /update\s+.+set/gi,
      /create\s+table/gi,
      /alter\s+table/gi,
      /truncate/gi
    ];
    
    for (const pattern of dangerous) {
      if (pattern.test(sql)) {
        throw new Error(`Potentially dangerous SQL operation detected: ${pattern.source}`);
      }
    }
    
    return sql.trim();
  }

  /**
   * Get table information for query generation
   */
  getTableInfo() {
    if (!this.isInitialized) {
      return null;
    }
    
    try {
      // Get table names
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      const tableInfo = {};
      
      for (const table of tables) {
        // Get column information
        const columns = this.db.prepare(`PRAGMA table_info(${table.name})`).all();
        const sampleData = this.db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        
        tableInfo[table.name] = {
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            not_null: col.notnull === 1
          })),
          sample_data: sampleData,
          row_count: this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count
        };
      }
      
      return tableInfo;
      
    } catch (error) {
      console.error('❌ Failed to get table info:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  healthCheck() {
    try {
      if (!this.isInitialized || !this.db) {
        return {
          status: 'unhealthy',
          error: 'Database not initialized'
        };
      }
      
      // Test query
      const result = this.db.prepare('SELECT 1 as test').get();
      const tableInfo = this.getTableInfo();
      
      return {
        status: 'healthy',
        database_path: this.dbPath,
        tables: Object.keys(tableInfo || {}),
        can_query: result.test === 1
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('📦 SQLite database connection closed');
    }
  }
}

// Export singleton instance
const sqliteService = new SQLiteService();
module.exports = sqliteService;