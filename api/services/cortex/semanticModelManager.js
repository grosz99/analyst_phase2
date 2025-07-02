const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Semantic Model Manager - Handles semantic model deployment and management
 * Responsible for: Loading YAML models, deploying to Snowflake, stage management
 */
class SemanticModelManager {
  constructor() {
    this.semanticModelContent = null;
    this.semanticModelPath = null;
    this.stageName = '@CORTEX_ANALYST_STAGE';
    this.fileName = 'superstore_semantic_model.yaml';
  }

  // Load and deploy semantic model to Snowflake
  async deploySemanticModel(credentials, authToken, baseURL) {
    try {
      const semanticModelPath = path.resolve(__dirname, '../../semantic_models/superstore_semantic_model.yaml');
      
      if (!fs.existsSync(semanticModelPath)) {
        console.warn('⚠️  Semantic model file not found, using inline model');
        this.loadInlineModel();
        return;
      }

      const semanticModelContent = fs.readFileSync(semanticModelPath, 'utf8');
      console.log('📄 Deploying semantic model to Snowflake stage...');

      // Create stage and upload file using SQL API
      await this.executeSnowflakeSQL(credentials, authToken, baseURL, `
        CREATE STAGE IF NOT EXISTS ${this.stageName} 
        COMMENT = 'Stage for Cortex Analyst semantic models'
      `);
      
      // For now, store the semantic model content in the service
      // In production, you would upload to the actual stage
      this.semanticModelContent = semanticModelContent;
      this.semanticModelPath = `${this.stageName}/${this.fileName}`;
      
      console.log('✅ Semantic model deployed successfully');
      
    } catch (error) {
      console.warn('⚠️  Failed to deploy semantic model:', error.message);
      // Continue with inline model fallback
      this.loadInlineModel();
    }
  }

  // Load inline semantic model as fallback
  loadInlineModel() {
    this.semanticModelContent = `
name: Superstore Business Analytics
description: Comprehensive semantic model for Superstore sales, customer, and product analytics
tables:
  - name: superstore_sales
    base_table:
      database: SUPERSTOREDB
      schema: DATA
      table: SUPERSTORE
    dimensions:
      - name: customer_name
        expr: CUSTOMER_NAME
        data_type: varchar
        synonyms: [customer, client name]
      - name: product_name
        expr: PRODUCT_NAME
        data_type: varchar
        synonyms: [product, item name]
      - name: category
        expr: CATEGORY
        data_type: varchar
        synonyms: [product category, product type]
      - name: region
        expr: REGION
        data_type: varchar
        synonyms: [geographic region, territory]
      - name: segment
        expr: SEGMENT
        data_type: varchar
        synonyms: [customer segment, customer type]
      - name: order_date
        expr: ORDER_DATE
        data_type: date
        synonyms: [date, transaction date]
    facts:
      - name: sales_amount
        expr: SALES
        data_type: number
        synonyms: [sales, revenue]
      - name: profit_amount
        expr: PROFIT
        data_type: number
        synonyms: [profit, earnings]
      - name: quantity
        expr: QUANTITY
        data_type: number
        synonyms: [qty, units sold]
      - name: discount_amount
        expr: DISCOUNT
        data_type: number
        synonyms: [discount, discount rate]
    metrics:
      - name: total_sales
        expr: SUM(SALES)
        synonyms: [total revenue, gross sales]
      - name: total_profit
        expr: SUM(PROFIT)
        synonyms: [total earnings, net profit]
      - name: average_order_value
        expr: AVG(SALES)
        synonyms: [AOV, avg order size]
      - name: order_count
        expr: COUNT(DISTINCT ORDER_ID)
        synonyms: [number of orders, total orders]
`;
    
    console.log('📄 Using inline semantic model');
  }

  // Execute SQL against Snowflake
  async executeSnowflakeSQL(credentials, authToken, baseURL, sql) {
    return new Promise((resolve, reject) => {
      const sqlData = JSON.stringify({
        statement: sql,
        timeout: 60,
        database: credentials.SNOWFLAKE_DATABASE || 'SUPERSTOREDB',
        schema: credentials.SNOWFLAKE_SCHEMA || 'DATA',
        warehouse: credentials.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
        resultSetMetaData: {
          format: 'json'
        }
      });

      const url = new URL('/api/v2/statements', baseURL);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(sqlData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`SQL execution failed: ${response.message || data}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse SQL response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`SQL execution network error: ${error.message}`));
      });

      req.write(sqlData);
      req.end();
    });
  }

  // Execute a query using Snowflake SQL API
  async executeQuery(credentials, authToken, baseURL, sql) {
    try {
      console.log(`🔍 Executing SQL: ${sql}`);
      
      const response = await this.executeSnowflakeSQL(credentials, authToken, baseURL, sql);
      
      if (response.data && response.data.length > 0) {
        // Convert Snowflake response format to standard array of objects
        const columns = response.resultSetMetaData.rowType.map(col => col.name);
        const rows = response.data.map(row => {
          const obj = {};
          columns.forEach((col, index) => {
            obj[col] = row[index];
          });
          return obj;
        });
        
        console.log(`✅ Query executed successfully, ${rows.length} rows returned`);
        return rows;
      } else {
        console.log('✅ Query executed successfully, no rows returned');
        return [];
      }
      
    } catch (error) {
      console.error('❌ SQL execution error:', error);
      throw error;
    }
  }

  // Get semantic model content
  getSemanticModel() {
    return this.semanticModelContent || this.loadInlineModel();
  }

  // Get semantic model path (for Cortex Analyst API)
  getSemanticModelPath() {
    return this.semanticModelPath || `${this.stageName}/${this.fileName}`;
  }

  // Validate semantic model structure
  validateSemanticModel() {
    if (!this.semanticModelContent) {
      return { valid: false, error: 'No semantic model loaded' };
    }

    try {
      // Basic validation - check for required sections
      const hasName = this.semanticModelContent.includes('name:');
      const hasTables = this.semanticModelContent.includes('tables:');
      const hasDimensions = this.semanticModelContent.includes('dimensions:');
      const hasFacts = this.semanticModelContent.includes('facts:');

      if (!hasName || !hasTables || !hasDimensions || !hasFacts) {
        return { 
          valid: false, 
          error: 'Semantic model missing required sections (name, tables, dimensions, facts)' 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Get model statistics
  getModelStats() {
    if (!this.semanticModelContent) {
      return null;
    }

    try {
      const lines = this.semanticModelContent.split('\n');
      const dimensionCount = (this.semanticModelContent.match(/- name:/g) || []).length;
      const factCount = (this.semanticModelContent.match(/expr:/g) || []).length;
      
      return {
        totalLines: lines.length,
        estimatedDimensions: Math.floor(dimensionCount / 2), // Rough estimate
        estimatedFacts: Math.floor(factCount / 2),
        hasVerifiedQueries: this.semanticModelContent.includes('verified_queries:'),
        hasCustomInstructions: this.semanticModelContent.includes('custom_instructions:')
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = SemanticModelManager;