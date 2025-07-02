/**
 * Response Formatter - Handles Cortex Analyst response processing and formatting
 * Responsible for: Response parsing, SQL simulation, visualization generation
 */
class ResponseFormatter {
  constructor() {
    // Common aggregation patterns for SQL simulation
    this.aggregationFunctions = ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'];
  }

  // Format Cortex Analyst API response into standardized format
  async formatCortexResponse(cortexResponse, originalData, question, credentials = null, sqlExecutor = null) {
    try {
      const messages = cortexResponse.messages || [];
      const analystMessage = messages.find(m => m.role === 'analyst');
      
      if (!analystMessage || !analystMessage.content) {
        throw new Error('No valid analyst response received from Cortex Analyst');
      }

      const content = analystMessage.content;
      let analysis = '';
      let sqlQuery = '';
      let suggestions = [];

      // Extract different content types
      content.forEach(item => {
        if (item.type === 'text') {
          analysis += item.text + '\n';
        } else if (item.type === 'sql') {
          sqlQuery = item.sql;
        } else if (item.type === 'suggestion') {
          suggestions.push(item.suggestion);
        }
      });

      // Execute SQL against Snowflake or simulate on cached data
      const resultsTable = await this.simulateQueryExecution(sqlQuery, originalData, question, credentials, sqlExecutor);
      
      return {
        analysis: analysis.trim() || `Cortex Analyst Analysis: ${question}`,
        python_code: {
          code: this.convertSQLToPython(sqlQuery),
          blocks: [sqlQuery],
          executable: false,
          source: 'cortex_analyst_sql'
        },
        results_table: resultsTable,
        visualization: this.createVisualization(resultsTable, question),
        refined_questions: suggestions.map(s => ({
          question: s,
          reason: "Suggested by Cortex Analyst for better analysis"
        }))
      };
    } catch (error) {
      console.error('Error formatting Cortex response:', error);
      throw error;
    }
  }

  // Execute SQL against Snowflake or simulate on cached data
  async simulateQueryExecution(sql, data, question, credentials = null, sqlExecutor = null) {
    try {
      // Try to execute real SQL against Snowflake if available
      if (credentials && sql && sqlExecutor) {
        try {
          console.log('🔄 Executing SQL against Snowflake:', sql);
          const sqlResult = await sqlExecutor.executeQuery(credentials, sql);
          
          if (sqlResult && sqlResult.length > 0) {
            return this.formatSnowflakeResults(sqlResult, question);
          }
        } catch (sqlError) {
          console.warn('⚠️  SQL execution failed, falling back to simulation:', sqlError.message);
        }
      }

      // Execute SQL simulation on cached data
      if (!sql || !data || data.length === 0) {
        throw new Error('No SQL query generated or no data available for analysis');
      }

      // Enhanced SQL pattern matching for Cortex Analyst queries
      console.log('🔍 Simulating SQL:', sql);
      
      // Parse the SQL to extract components
      const sqlComponents = this.parseSQLComponents(sql, data);
      
      if (sqlComponents) {
        return this.executeSimulatedSQL(sqlComponents, data, question);
      }
      
      throw new Error(`Unable to parse SQL query: ${sql}`);
      
    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  }

  // Parse SQL components for simulation
  parseSQLComponents(sql, data) {
    try {
      const sqlLower = sql.toLowerCase();
      
      // Extract SELECT columns
      const selectMatch = sql.match(/select\s+(.*?)\s+from/i);
      if (!selectMatch) return null;
      
      const selectPart = selectMatch[1];
      const columns = selectPart.split(',').map(col => col.trim());
      
      // Extract WHERE clause
      const whereMatch = sql.match(/where\s+(.*?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/i);
      const whereClause = whereMatch ? whereMatch[1].trim() : null;
      
      // Extract GROUP BY
      const groupByMatch = sql.match(/group\s+by\s+(.*?)(?:\s+order\s+by|\s+limit|$)/i);
      const groupBy = groupByMatch ? groupByMatch[1].trim() : null;
      
      // Extract ORDER BY
      const orderByMatch = sql.match(/order\s+by\s+(.*?)(?:\s+limit|$)/i);
      const orderBy = orderByMatch ? orderByMatch[1].trim() : null;
      
      // Extract LIMIT
      const limitMatch = sql.match(/limit\s+(\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : null;
      
      return {
        columns,
        whereClause,
        groupBy,
        orderBy,
        limit,
        originalSQL: sql
      };
    } catch (error) {
      console.error('Error parsing SQL:', error);
      return null;
    }
  }

  // Execute simulated SQL on cached data
  executeSimulatedSQL(sqlComponents, data, question) {
    try {
      let results = [...data]; // Create copy to avoid mutation
      
      // Apply WHERE clause filtering
      if (sqlComponents.whereClause) {
        results = this.applyWhereClause(results, sqlComponents.whereClause);
      }
      
      // Apply GROUP BY aggregation
      if (sqlComponents.groupBy) {
        results = this.applyGroupBy(results, sqlComponents.columns, sqlComponents.groupBy);
      } else {
        // Select specific columns if no grouping
        results = this.applySelect(results, sqlComponents.columns);
      }
      
      // Apply ORDER BY sorting
      if (sqlComponents.orderBy) {
        results = this.applyOrderBy(results, sqlComponents.orderBy);
      }
      
      // Apply LIMIT
      if (sqlComponents.limit) {
        results = results.slice(0, sqlComponents.limit);
      }
      
      return this.formatQueryResults(results, question);
      
    } catch (error) {
      console.error('Error executing simulated SQL:', error);
      throw error;
    }
  }

  // Apply WHERE clause filtering to data
  applyWhereClause(data, whereClause) {
    try {
      // Handle common WHERE patterns
      return data.filter(row => {
        // Year extraction: EXTRACT(YEAR FROM ORDER_DATE) = 2015
        const yearMatch = whereClause.match(/EXTRACT\(YEAR FROM (\w+)\)\s*=\s*(\d+)/i);
        if (yearMatch) {
          const column = yearMatch[1];
          const year = parseInt(yearMatch[2]);
          const dateValue = new Date(row[column]);
          if (!isNaN(dateValue.getTime())) {
            return dateValue.getFullYear() === year;
          }
        }
        
        // Month extraction: EXTRACT(MONTH FROM ORDER_DATE) = 10
        const monthMatch = whereClause.match(/EXTRACT\(MONTH FROM (\w+)\)\s*=\s*(\d+)/i);
        if (monthMatch) {
          const column = monthMatch[1];
          const month = parseInt(monthMatch[2]);
          const dateValue = new Date(row[column]);
          if (!isNaN(dateValue.getTime())) {
            return dateValue.getMonth() + 1 === month; // JavaScript months are 0-indexed
          }
        }
        
        // String equality: CATEGORY = 'Office Supplies'
        const stringMatch = whereClause.match(/(\w+)\s*=\s*'([^']+)'/i);
        if (stringMatch) {
          const column = stringMatch[1];
          const value = stringMatch[2];
          return row[column] === value;
        }
        
        // Numeric comparison: SALES > 1000
        const numericMatch = whereClause.match(/(\w+)\s*([><=]+)\s*(\d+(?:\.\d+)?)/i);
        if (numericMatch) {
          const column = numericMatch[1];
          const operator = numericMatch[2];
          const value = parseFloat(numericMatch[3]);
          const rowValue = parseFloat(row[column]);
          
          if (!isNaN(rowValue)) {
            switch (operator) {
              case '=': return rowValue === value;
              case '>': return rowValue > value;
              case '<': return rowValue < value;
              case '>=': return rowValue >= value;
              case '<=': return rowValue <= value;
              default: return true;
            }
          }
        }
        
        return true; // If no pattern matches, include row
      });
    } catch (error) {
      console.error('Error applying WHERE clause:', error);
      return data;
    }
  }

  // Apply GROUP BY aggregation
  applyGroupBy(data, selectColumns, groupByColumn) {
    try {
      const groups = {};
      
      // Group data by the specified column
      data.forEach(row => {
        const key = row[groupByColumn];
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(row);
      });
      
      // Apply aggregations to each group
      const results = [];
      for (const [groupKey, groupData] of Object.entries(groups)) {
        const result = { [groupByColumn]: groupKey };
        
        selectColumns.forEach(col => {
          if (col === groupByColumn) return; // Skip group column
          
          // Parse aggregation functions
          const aggMatch = col.match(/(SUM|COUNT|AVG|MAX|MIN)\(([^)]+)\)(?:\s+as\s+(\w+))?/i);
          if (aggMatch) {
            const func = aggMatch[1].toUpperCase();
            const column = aggMatch[2] === '*' ? null : aggMatch[2];
            const alias = aggMatch[3] || `${func.toLowerCase()}_${column || 'count'}`;
            
            let value = 0;
            switch (func) {
              case 'COUNT':
                value = groupData.length;
                break;
              case 'SUM':
                value = groupData.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
                break;
              case 'AVG':
                const sum = groupData.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
                value = sum / groupData.length;
                break;
              case 'MAX':
                value = Math.max(...groupData.map(row => parseFloat(row[column]) || 0));
                break;
              case 'MIN':
                value = Math.min(...groupData.map(row => parseFloat(row[column]) || 0));
                break;
            }
            
            result[alias] = value;
          }
        });
        
        // Always add record_count if not already present
        if (!result.record_count && !result.total_count) {
          result.record_count = groupData.length;
        }
        
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error applying GROUP BY:', error);
      return data;
    }
  }

  // Apply SELECT columns (when no GROUP BY)
  applySelect(data, selectColumns) {
    if (selectColumns.length === 1 && selectColumns[0] === '*') {
      return data;
    }
    
    return data.map(row => {
      const result = {};
      selectColumns.forEach(col => {
        if (row.hasOwnProperty(col)) {
          result[col] = row[col];
        }
      });
      return result;
    });
  }

  // Apply ORDER BY sorting
  applyOrderBy(data, orderBy) {
    try {
      const parts = orderBy.split(/\s+/);
      const column = parts[0];
      const direction = parts[1] && parts[1].toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      return data.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        
        // Handle numeric sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'ASC' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle string sorting
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (direction === 'ASC') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    } catch (error) {
      console.error('Error applying ORDER BY:', error);
      return data;
    }
  }

  // Format query results into table structure
  formatQueryResults(results, question) {
    if (!results || results.length === 0) {
      return {
        headers: ['No Data'],
        rows: [['No results found']],
        totalRows: 0
      };
    }
    
    const headers = Object.keys(results[0]);
    const rows = results.map(row => headers.map(header => row[header]));
    
    return {
      headers,
      rows,
      totalRows: results.length,
      data: results
    };
  }

  // Format Snowflake API results
  formatSnowflakeResults(results, question) {
    if (!results || results.length === 0) {
      return {
        headers: ['No Data'],
        rows: [['No results found from Snowflake']],
        totalRows: 0
      };
    }
    
    const headers = Object.keys(results[0]);
    const rows = results.map(row => headers.map(header => row[header]));
    
    return {
      headers,
      rows,
      totalRows: results.length,
      data: results,
      source: 'snowflake'
    };
  }

  // Convert SQL to Python for display
  convertSQLToPython(sql) {
    if (!sql) return '# No SQL query generated';
    
    return `# Equivalent Python using pandas
# SQL: ${sql}

# This would require:
# import pandas as pd
# df = pd.read_sql("${sql}", connection)
# print(df)

# Note: This is the SQL query that was executed by Cortex Analyst
sql_query = """
${sql}
"""`;
  }

  // Create visualization configuration from results
  createVisualization(resultsTable, question) {
    if (!resultsTable || !resultsTable.data || resultsTable.data.length === 0) {
      return {
        type: 'table',
        title: 'No Data Available',
        description: 'No results to visualize'
      };
    }
    
    const data = resultsTable.data;
    const headers = resultsTable.headers;
    
    // Determine appropriate visualization type based on data structure
    const numericColumns = headers.filter(header => {
      const firstValue = data[0][header];
      return typeof firstValue === 'number' || !isNaN(parseFloat(firstValue));
    });
    
    const categoricalColumns = headers.filter(header => {
      const firstValue = data[0][header];
      return typeof firstValue === 'string' && isNaN(parseFloat(firstValue));
    });
    
    // Choose visualization type
    let visualizationType = 'table';
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      if (data.length <= 10) {
        visualizationType = 'bar_chart'; // Match frontend expectation
      } else {
        visualizationType = 'line_chart';
      }
    } else if (numericColumns.length > 1) {
      visualizationType = 'scatter_plot';
    }
    
    // Format data for bar chart visualization
    let chartData = [];
    if (visualizationType === 'bar_chart' && categoricalColumns.length > 0 && numericColumns.length > 0) {
      const labelColumn = categoricalColumns[0];
      const valueColumn = numericColumns[0];
      
      chartData = data.slice(0, 10).map(row => ({
        label: String(row[labelColumn]),
        value: parseFloat(row[valueColumn]) || 0,
        formatted_value: this.formatNumber(parseFloat(row[valueColumn]) || 0)
      }));
    }
    
    return {
      type: visualizationType,
      title: this.generateVisualizationTitle(question, data.length),
      description: `${data.length} records analyzed`,
      data: chartData.length > 0 ? chartData : data.slice(0, 20), // Use formatted chart data or raw data
      xAxis: categoricalColumns[0] || headers[0],
      yAxis: numericColumns[0] || headers[1],
      config: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
  }

  // Format numbers for display
  formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    
    const num = parseFloat(value);
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else if (num >= 1) {
      return num.toLocaleString();
    } else {
      return num.toFixed(2);
    }
  }

  // Generate appropriate visualization title
  generateVisualizationTitle(question, dataLength) {
    if (question.toLowerCase().includes('trend')) {
      return `Trends Analysis (${dataLength} records)`;
    } else if (question.toLowerCase().includes('top') || question.toLowerCase().includes('highest')) {
      return `Top Performers (${dataLength} records)`;
    } else if (question.toLowerCase().includes('count') || question.toLowerCase().includes('how many')) {
      return `Count Analysis (${dataLength} records)`;
    } else {
      return `Data Analysis Results (${dataLength} records)`;
    }
  }
}

module.exports = ResponseFormatter;