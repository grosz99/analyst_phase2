/**
 * SQL Generator - Handles dynamic SQL generation for Cortex Analyst
 * Responsible for: Question analysis, SQL generation, column mapping
 */
class SqlGenerator {
  constructor() {
    // Default column mappings for the superstore dataset
    this.defaultColumnMappings = {
      customer: 'CUSTOMER_NAME',
      product: 'PRODUCT_NAME', 
      category: 'CATEGORY',
      region: 'REGION',
      sales: 'SALES',
      profit: 'PROFIT',
      discount: 'DISCOUNT',
      quantity: 'QUANTITY',
      segment: 'SEGMENT',
      date: 'ORDER_DATE',
      order: 'ORDER_ID'
    };
  }

  // Main method to generate SQL from natural language question
  generateSqlFromQuestion(question, data) {
    try {
      const questionLower = question.toLowerCase();
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      
      // Map actual column names to logical concepts
      const columnMappings = this.mapColumns(columns);
      
      // Analyze what the question is asking for
      const questionAnalysis = this.analyzeQuestion(questionLower, columns, columnMappings);
      
      let sql = '';
      let analysis = '';
      let suggestions = [];
      
      if (questionAnalysis.type === 'aggregation') {
        // Build dynamic aggregation query
        const result = this.buildAggregationQuery(questionAnalysis, data);
        sql = result.sql;
        analysis = result.analysis;
        suggestions = result.suggestions;
        
      } else if (questionAnalysis.type === 'comparison') {
        // Build comparison query
        const result = this.buildComparisonQuery(questionAnalysis);
        sql = result.sql;
        analysis = result.analysis;
        suggestions = result.suggestions;
        
      } else {
        // Fallback query
        const result = this.buildFallbackQuery(questionAnalysis, columnMappings);
        sql = result.sql;
        analysis = result.analysis;
        suggestions = result.suggestions;
      }
      
      console.log(`🔧 Generated SQL: ${sql}`);
      
      return {
        sql: sql,
        analysis: analysis,
        suggestions: suggestions,
        columnMappings: columnMappings,
        questionAnalysis: questionAnalysis
      };
      
    } catch (error) {
      console.error('SQL generation error:', error);
      
      // Return a basic fallback query
      return {
        sql: 'SELECT * FROM SUPERSTORE LIMIT 10',
        analysis: 'Basic data exploration query due to analysis error',
        suggestions: ['What are the sales trends?', 'Which products perform best?'],
        columnMappings: this.defaultColumnMappings,
        questionAnalysis: { type: 'fallback' }
      };
    }
  }

  // Map actual database column names to logical concepts
  mapColumns(columns) {
    const mappings = {};
    
    for (const [concept, defaultName] of Object.entries(this.defaultColumnMappings)) {
      // First try exact match
      if (columns.includes(defaultName)) {
        mappings[concept] = defaultName;
        continue;
      }
      
      // Then try case-insensitive partial match
      const found = columns.find(col => 
        col.toLowerCase().includes(concept.toLowerCase()) ||
        (concept === 'customer' && col.toLowerCase().includes('customer')) ||
        (concept === 'product' && (col.toLowerCase().includes('product') || col.toLowerCase().includes('item'))) ||
        (concept === 'sales' && (col.toLowerCase().includes('sales') || col.toLowerCase().includes('revenue'))) ||
        (concept === 'date' && (col.toLowerCase().includes('date') || col.toLowerCase().includes('time')))
      );
      
      if (found) {
        mappings[concept] = found;
      }
    }
    
    return mappings;
  }

  // Analyze the natural language question to understand intent
  analyzeQuestion(questionLower, columns, columnMappings) {
    let groupBy = null;
    let aggregateColumn = null;
    let aggregateFunction = 'SUM';
    let whereClause = null;
    let limit = 10;
    let orderDirection = 'DESC';
    
    console.log(`🔍 Analyzing question: "${questionLower}"`);
    console.log(`📊 Available columns: ${columns.join(', ')}`);
    console.log(`🗂️ Column mappings:`, columnMappings);
    console.log(`🎯 Question hash: ${questionLower.replace(/[^a-z0-9]/g, '').substring(0, 10)}`);
    
    // 1. Detect counting questions (how many, count, number of)
    if (questionLower.includes('how many') || questionLower.includes('count') || 
        questionLower.includes('number of') || questionLower.includes('total')) {
      
      aggregateFunction = 'COUNT';
      aggregateColumn = '*';
      
      // Find what to group by for counting
      if (questionLower.includes('customer') && columnMappings.customer) {
        groupBy = columnMappings.customer;
      } else if (questionLower.includes('order') && columnMappings.order) {
        groupBy = columnMappings.order;
      } else if (questionLower.includes('region') && columnMappings.region) {
        groupBy = columnMappings.region;
      } else if (questionLower.includes('category') && columnMappings.category) {
        groupBy = columnMappings.category;
      } else if (questionLower.includes('product') && columnMappings.product) {
        groupBy = columnMappings.product;
      } else if (questionLower.includes('segment') && columnMappings.segment) {
        groupBy = columnMappings.segment;
      }
      
      console.log(`📊 Detected COUNT query: groupBy=${groupBy}, aggregateFunction=${aggregateFunction}`);
    }
    
    // 2. Detect ranking/comparison questions (most, highest, top, best, worst, lowest)
    else if (questionLower.includes('most') || questionLower.includes('highest') || questionLower.includes('top') ||
             questionLower.includes('best') || questionLower.includes('worst') || questionLower.includes('lowest')) {
      
      // Determine what to group by based on question keywords
      if (questionLower.includes('region') && columnMappings.region) {
        groupBy = columnMappings.region;
      } else if (questionLower.includes('category') && columnMappings.category) {
        groupBy = columnMappings.category;
      } else if (questionLower.includes('customer') && columnMappings.customer) {
        groupBy = columnMappings.customer;
      } else if (questionLower.includes('product') && columnMappings.product) {
        groupBy = columnMappings.product;
      } else if (questionLower.includes('segment') && columnMappings.segment) {
        groupBy = columnMappings.segment;
      } else {
        // Try to infer from available categorical columns
        const categoricalCols = [columnMappings.category, columnMappings.region, columnMappings.customer, columnMappings.product, columnMappings.segment].filter(Boolean);
        if (categoricalCols.length > 0) {
          groupBy = categoricalCols[0]; // Use first available categorical column
        }
      }
      
      // Determine what to aggregate based on question keywords
      if (questionLower.includes('sales') && columnMappings.sales) {
        aggregateColumn = columnMappings.sales;
        aggregateFunction = 'SUM';
      } else if (questionLower.includes('profit') && columnMappings.profit) {
        aggregateColumn = columnMappings.profit;
        aggregateFunction = 'SUM';
      } else if (questionLower.includes('quantity') && columnMappings.quantity) {
        aggregateColumn = columnMappings.quantity;
        aggregateFunction = 'SUM';
      } else if (questionLower.includes('discount') && columnMappings.discount) {
        aggregateColumn = columnMappings.discount;
        aggregateFunction = 'AVG';
      } else {
        // Try to infer from available numeric columns
        const numericCols = [columnMappings.sales, columnMappings.profit, columnMappings.quantity, columnMappings.discount].filter(Boolean);
        if (numericCols.length > 0) {
          aggregateColumn = numericCols[0]; // Use first available numeric column
          aggregateFunction = 'SUM';
        } else {
          // Fallback to count
          aggregateColumn = '*';
          aggregateFunction = 'COUNT';
        }
      }
      
      // Adjust order direction for "worst" or "lowest"
      if (questionLower.includes('worst') || questionLower.includes('lowest')) {
        orderDirection = 'ASC';
      }
      
      console.log(`📊 Detected RANKING query: groupBy=${groupBy}, aggregateColumn=${aggregateColumn}, function=${aggregateFunction}`);
    }
    
    // 3. Detect "by" queries (sales by region, profit by category)
    else if (questionLower.includes(' by ')) {
      const parts = questionLower.split(' by ');
      const metric = parts[0].trim();
      const dimension = parts[1].trim();
      
      // Find the dimension to group by
      if (dimension.includes('region') && columnMappings.region) {
        groupBy = columnMappings.region;
      } else if (dimension.includes('category') && columnMappings.category) {
        groupBy = columnMappings.category;
      } else if (dimension.includes('customer') && columnMappings.customer) {
        groupBy = columnMappings.customer;
      } else if (dimension.includes('product') && columnMappings.product) {
        groupBy = columnMappings.product;
      } else if (dimension.includes('segment') && columnMappings.segment) {
        groupBy = columnMappings.segment;
      }
      
      // Find the metric to aggregate
      if (metric.includes('sales') && columnMappings.sales) {
        aggregateColumn = columnMappings.sales;
        aggregateFunction = 'SUM';
      } else if (metric.includes('profit') && columnMappings.profit) {
        aggregateColumn = columnMappings.profit;
        aggregateFunction = 'SUM';
      } else if (metric.includes('quantity') && columnMappings.quantity) {
        aggregateColumn = columnMappings.quantity;
        aggregateFunction = 'SUM';
      } else if (metric.includes('count') || metric.includes('number')) {
        aggregateColumn = '*';
        aggregateFunction = 'COUNT';
      }
      
      console.log(`📊 Detected BY query: metric="${metric}" by dimension="${dimension}" -> groupBy=${groupBy}, aggregateColumn=${aggregateColumn}`);
    }
    
    // 4. Detect filter conditions and date ranges
    
    // Category filters  
    if (questionLower.includes('office supplies') && columnMappings.category) {
      whereClause = `${columnMappings.category} = 'Office Supplies'`;
    } else if (questionLower.includes('furniture') && columnMappings.category) {
      whereClause = `${columnMappings.category} = 'Furniture'`;
    } else if (questionLower.includes('technology') && columnMappings.category) {
      whereClause = `${columnMappings.category} = 'Technology'`;
    }
    
    // Date filters
    const yearMatch = questionLower.match(/\b(19|20)\d{2}\b/);
    const monthMatch = questionLower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    
    if (yearMatch && columnMappings.date) {
      const year = yearMatch[0];
      const yearClause = `EXTRACT(YEAR FROM ${columnMappings.date}) = ${year}`;
      whereClause = whereClause ? `${whereClause} AND ${yearClause}` : yearClause;
      
      if (monthMatch) {
        const months = {
          'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
          'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        };
        const month = months[monthMatch[0]];
        const monthClause = `EXTRACT(MONTH FROM ${columnMappings.date}) = ${month}`;
        whereClause = whereClause ? `${whereClause} AND ${monthClause}` : monthClause;
      }
    }
    
    // Region filters
    if (questionLower.includes('central') && columnMappings.region) {
      const regionClause = `${columnMappings.region} = 'Central'`;
      whereClause = whereClause ? `${whereClause} AND ${regionClause}` : regionClause;
    } else if (questionLower.includes('east') && columnMappings.region) {
      const regionClause = `${columnMappings.region} = 'East'`;
      whereClause = whereClause ? `${whereClause} AND ${regionClause}` : regionClause;
    } else if (questionLower.includes('west') && columnMappings.region) {
      const regionClause = `${columnMappings.region} = 'West'`;
      whereClause = whereClause ? `${whereClause} AND ${regionClause}` : regionClause;
    } else if (questionLower.includes('south') && columnMappings.region) {
      const regionClause = `${columnMappings.region} = 'South'`;
      whereClause = whereClause ? `${whereClause} AND ${regionClause}` : regionClause;
    }
    
    // Extract limit if specified
    const limitMatch = questionLower.match(/\btop\s+(\d+)\b/) || questionLower.match(/\b(\d+)\s+(top|best|highest|most)/);
    if (limitMatch) {
      limit = parseInt(limitMatch[1]);
    }
    
    return {
      type: groupBy || aggregateColumn ? 'aggregation' : 'comparison',
      groupBy,
      aggregateColumn,
      aggregateFunction,
      whereClause,
      orderDirection,
      limit
    };
  }

  // Build aggregation query (GROUP BY with SUM, COUNT, etc.)
  buildAggregationQuery(analysis, data) {
    const { groupBy, aggregateColumn, aggregateFunction, whereClause, orderDirection, limit } = analysis;
    
    let sql = '';
    
    // Build SELECT clause
    if (groupBy) {
      sql = `SELECT ${groupBy}`;
      if (aggregateFunction === 'COUNT' && aggregateColumn === '*') {
        sql += `, ${aggregateFunction}(*) as total_count`;
      } else {
        sql += `, ${aggregateFunction}(${aggregateColumn}) as ${aggregateFunction.toLowerCase()}_${aggregateColumn.toLowerCase()}`;
      }
      
      // Add COUNT for context if not already counting
      if (aggregateFunction !== 'COUNT') {
        sql += `, COUNT(*) as record_count`;
      }
    } else {
      // No grouping, just aggregation
      if (aggregateFunction === 'COUNT') {
        sql = `SELECT ${aggregateFunction}(*) as total_count`;
      } else {
        sql += `, ${aggregateFunction}(${aggregateColumn}) as ${aggregateFunction.toLowerCase()}_${aggregateColumn.toLowerCase()}`;
      }
    }
    
    sql += ` FROM SUPERSTORE`;
    
    // Add WHERE clause if present
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    // Add GROUP BY if present
    if (groupBy) {
      sql += ` GROUP BY ${groupBy}`;
      
      // Add ORDER BY for grouped results
      if (aggregateFunction === 'COUNT') {
        sql += ` ORDER BY total_count ${orderDirection}`;
      } else {
        sql += ` ORDER BY ${aggregateFunction.toLowerCase()}_${aggregateColumn.toLowerCase()} ${orderDirection}`;
      }
      
      sql += ` LIMIT ${limit}`;
    }
    
    // Build analysis text
    let analysisText = '';
    if (whereClause && groupBy) {
      analysisText = `• Analyzing ${aggregateFunction.toLowerCase()} of ${aggregateColumn === '*' ? 'records' : aggregateColumn.toLowerCase()} by ${groupBy.toLowerCase().replace(/_/g, ' ')} with filters\n`;
    } else if (groupBy) {
      analysisText = `• Analyzing ${aggregateFunction.toLowerCase()} of ${aggregateColumn === '*' ? 'records' : aggregateColumn.toLowerCase()} by ${groupBy.toLowerCase().replace(/_/g, ' ')}\n`;
    } else {
      analysisText = `• Calculating ${aggregateFunction.toLowerCase()} of ${aggregateColumn === '*' ? 'total records' : aggregateColumn.toLowerCase()} with filters\n`;
    }
    
    analysisText += `• Processing ${data.length} records to find patterns\n`;
    if (whereClause) {
      analysisText += `• Applying filters to focus on specific data subset`;
    } else {
      analysisText += `• Ranking results to identify ${orderDirection === 'DESC' ? 'highest' : 'lowest'} values`;
    }
    
    const suggestions = [
      groupBy ? `Which ${groupBy.toLowerCase().replace(/_/g, ' ')} has the ${orderDirection === 'DESC' ? 'lowest' : 'highest'} ${aggregateColumn === '*' ? 'count' : aggregateColumn.toLowerCase()}?` : 'What are the overall trends?',
      'How does performance vary across different time periods?'
    ];
    
    return { sql, analysis: analysisText, suggestions };
  }

  // Build comparison query
  buildComparisonQuery(analysis) {
    const { groupBy, compareColumn } = analysis;
    
    const sql = `SELECT ${groupBy}, AVG(${compareColumn}) as avg_${compareColumn.toLowerCase()}, COUNT(*) as record_count FROM SUPERSTORE GROUP BY ${groupBy} ORDER BY avg_${compareColumn.toLowerCase()} DESC LIMIT 10`;
    
    const analysisText = `• Comparing ${compareColumn.toLowerCase()} across different ${groupBy.toLowerCase().replace(/_/g, ' ')}s\n• Calculating averages and patterns\n• Ranking to show top performers`;
    
    const suggestions = [
      `What drives high ${compareColumn.toLowerCase()} performance?`,
      `How does ${compareColumn.toLowerCase()} vary by region?`
    ];
    
    return { sql, analysis: analysisText, suggestions };
  }

  // Build fallback query when pattern recognition fails
  buildFallbackQuery(analysis, columnMappings) {
    // Try to build a reasonable fallback based on available columns
    let sql = 'SELECT ';
    let analysisText = '• Providing general data overview\n• Showing key metrics and dimensions\n';
    
    if (columnMappings.category && columnMappings.sales) {
      sql += `${columnMappings.category}, SUM(${columnMappings.sales}) as total_sales, COUNT(*) as record_count FROM SUPERSTORE GROUP BY ${columnMappings.category} ORDER BY total_sales DESC LIMIT 10`;
      analysisText += `• Analyzing sales performance by product category`;
    } else if (columnMappings.region && columnMappings.sales) {
      sql += `${columnMappings.region}, SUM(${columnMappings.sales}) as total_sales, COUNT(*) as record_count FROM SUPERSTORE GROUP BY ${columnMappings.region} ORDER BY total_sales DESC`;
      analysisText += `• Analyzing sales performance by region`;
    } else {
      sql += '* FROM SUPERSTORE LIMIT 10';
      analysisText += `• Showing sample data for exploration`;
    }
    
    const suggestions = [
      'Which product categories perform best?',
      'What are the sales trends by region?',
      'Who are the top customers by revenue?'
    ];
    
    return { sql, analysis: analysisText, suggestions };
  }
}

module.exports = SqlGenerator;