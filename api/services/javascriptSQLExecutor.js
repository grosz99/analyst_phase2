const nccDataset = require('../data/nccData');

/**
 * JavaScript SQL Executor - Pure JS implementation for Vercel compatibility
 * Executes basic SQL queries against embedded data without SQLite dependency
 */
class JavaScriptSQLExecutor {
  constructor() {
    this.data = nccDataset.data;
    this.schema = nccDataset.schema;
  }

  /**
   * Execute SQL query against the data
   */
  executeQuery(sqlQuery, userQuestion = '') {
    console.log('🔍 Executing JavaScript SQL query:', sqlQuery);
    console.log('❓ User question:', userQuestion);

    try {
      const startTime = Date.now();
      
      // Parse and execute the SQL query
      const result = this.parseSQLQuery(sqlQuery);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ JavaScript SQL executed in ${executionTime}ms, returned ${result.length} rows`);

      return {
        success: true,
        results: result,
        columns: result.length > 0 ? Object.keys(result[0]) : [],
        row_count: result.length,
        execution_time: executionTime,
        query_executed: sqlQuery
      };

    } catch (error) {
      console.error('❌ JavaScript SQL execution failed:', error);
      return {
        success: false,
        error: error.message,
        query_attempted: sqlQuery
      };
    }
  }

  /**
   * Parse and execute basic SQL queries
   */
  parseSQLQuery(sql) {
    const query = sql.trim().toUpperCase();
    
    // Handle SELECT queries
    if (query.startsWith('SELECT')) {
      return this.executeSelect(sql);
    }
    
    throw new Error('Only SELECT queries are supported');
  }

  /**
   * Execute SELECT query
   */
  executeSelect(sql) {
    // Parse the SELECT query components
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(.*)$/i);
    if (!selectMatch) {
      throw new Error('Invalid SELECT query format');
    }

    const [, selectClause, tableName, restClause] = selectMatch;
    
    if (tableName.toUpperCase() !== 'NCC') {
      throw new Error(`Table ${tableName} not found. Available: NCC`);
    }

    let data = [...this.data]; // Copy the data

    // Parse WHERE clause
    if (restClause && restClause.includes('WHERE')) {
      data = this.applyWhere(data, restClause);
    }

    // Parse GROUP BY clause
    if (restClause && restClause.includes('GROUP BY')) {
      data = this.applyGroupBy(data, restClause, selectClause);
    } else {
      // Apply SELECT projection if not GROUP BY
      data = this.applySelect(data, selectClause);
    }

    // Parse ORDER BY clause
    if (restClause && restClause.includes('ORDER BY')) {
      data = this.applyOrderBy(data, restClause);
    }

    // Parse LIMIT clause
    if (restClause && restClause.includes('LIMIT')) {
      data = this.applyLimit(data, restClause);
    }

    return data;
  }

  /**
   * Apply WHERE filtering
   */
  applyWhere(data, restClause) {
    const whereMatch = restClause.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (!whereMatch) return data;

    const whereClause = whereMatch[1].trim();
    
    // Handle simple conditions like "Month LIKE '2024%'"
    if (whereClause.includes('LIKE')) {
      const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+'([^']+)'/i);
      if (likeMatch) {
        const [, column, pattern] = likeMatch;
        const regex = new RegExp(pattern.replace('%', '.*'), 'i');
        return data.filter(row => regex.test(String(row[column])));
      }
    }

    // Handle equality conditions like "Office = 'Singapore'"
    if (whereClause.includes('=')) {
      const equalMatch = whereClause.match(/(\w+)\s*=\s*'([^']+)'/i);
      if (equalMatch) {
        const [, column, value] = equalMatch;
        return data.filter(row => String(row[column]) === value);
      }
    }

    return data;
  }

  /**
   * Apply SELECT projection
   */
  applySelect(data, selectClause) {
    if (selectClause.trim() === '*') {
      return data;
    }

    const columns = selectClause.split(',').map(col => col.trim());
    return data.map(row => {
      const newRow = {};
      columns.forEach(col => {
        if (row.hasOwnProperty(col)) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });
  }

  /**
   * Apply GROUP BY aggregation
   */
  applyGroupBy(data, restClause, selectClause) {
    const groupByMatch = restClause.match(/GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (!groupByMatch) return data;

    const groupByColumn = groupByMatch[1].trim();
    
    // Group the data
    const groups = {};
    data.forEach(row => {
      const key = row[groupByColumn];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    // Apply aggregation functions from SELECT clause
    const result = [];
    Object.keys(groups).forEach(key => {
      const group = groups[key];
      const resultRow = {};
      
      // Parse SELECT clause for aggregations
      const selectParts = selectClause.split(',').map(part => part.trim());
      
      selectParts.forEach(part => {
        if (part.includes('COUNT(*)')) {
          const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : 'count';
          resultRow[alias] = group.length;
        } else if (part.includes('SUM(')) {
          const columnMatch = part.match(/SUM\((\w+)\)/i);
          if (columnMatch) {
            const column = columnMatch[1];
            const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : `sum_${column}`;
            resultRow[alias] = group.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
          }
        } else if (part.includes('AVG(')) {
          const columnMatch = part.match(/AVG\((\w+)\)/i);
          if (columnMatch) {
            const column = columnMatch[1];
            const alias = part.includes(' as ') ? part.split(' as ')[1].trim() : `avg_${column}`;
            const sum = group.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
            resultRow[alias] = sum / group.length;
          }
        } else if (part === groupByColumn) {
          resultRow[groupByColumn] = key;
        }
      });
      
      result.push(resultRow);
    });

    return result;
  }

  /**
   * Apply ORDER BY sorting
   */
  applyOrderBy(data, restClause) {
    const orderByMatch = restClause.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if (!orderByMatch) return data;

    const orderByClause = orderByMatch[1].trim();
    const [column, direction = 'ASC'] = orderByClause.split(/\s+/);

    return data.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Convert to numbers if possible
      if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (direction.toUpperCase() === 'DESC') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  }

  /**
   * Apply LIMIT
   */
  applyLimit(data, restClause) {
    const limitMatch = restClause.match(/LIMIT\s+(\d+)/i);
    if (!limitMatch) return data;

    const limit = parseInt(limitMatch[1]);
    return data.slice(0, limit);
  }

  /**
   * Get table information
   */
  getTableInfo() {
    return {
      NCC: {
        columns: this.schema.columns,
        sample_data: this.data.slice(0, 3),
        row_count: this.data.length
      }
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      status: 'healthy',
      tables: ['NCC'],
      can_query: true,
      data_source: 'embedded_javascript',
      row_count: this.data.length
    };
  }
}

// Export singleton instance  
const javascriptSQLExecutor = new JavaScriptSQLExecutor();
module.exports = javascriptSQLExecutor;