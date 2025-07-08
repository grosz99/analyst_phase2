/**
 * Code Execution Engine - Handles Python code parsing and pandas-like operations
 * Responsible for: Python code execution, pandas operations, data analysis patterns
 */
class CodeExecutor {
  
  // Create error response for invalid code
  createErrorResponse(message) {
    return {
      success: false,
      error: message,
      headers: ['Error'],
      rows: [[message]],
      totalRows: 1
    };
  }
  
  // Execute AI's Python analysis on cached dataset (the core intelligence)
  executeAnalysisOnCachedData(data, userContext, analysisText, pythonCode) {
    try {
      console.log('🔬 Starting AI analysis on cached dataset...');
      console.log('📊 Data summary:', { rows: data?.length, columns: data?.length ? Object.keys(data[0]).length : 0 });
      console.log('🔤 User context:', userContext);
      console.log('🐍 Python code input:', pythonCode);
      
      // Enhanced validation with detailed error messages
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ Invalid data provided to code executor');
        return this.createErrorResponse('No valid data provided for analysis');
      }
      
      if (!pythonCode || (!pythonCode.code && !pythonCode)) {
        console.error('❌ No Python code provided for execution');
        return this.createErrorResponse('No Python code provided for analysis');
      }
      
      if (!userContext || typeof userContext !== 'string') {
        console.error('❌ Invalid user context provided');
        return this.createErrorResponse('Invalid analysis context provided');
      }

      // Parse the Python code to understand what analysis the AI wants to perform
      const codeString = typeof pythonCode.code === 'string' ? pythonCode.code : 
                        typeof pythonCode === 'string' ? pythonCode : 
                        pythonCode.code?.toString() || pythonCode.toString();
      
      console.log('🔍 Parsed code string:', codeString.substring(0, 200) + '...');
      
      // Create a safe execution environment that mimics pandas operations
      const df = this.createDataFrameProxy(data);
      console.log('📊 DataFrame proxy created with columns:', df.columns);
      
      const results = this.executePandasOperations(df, codeString, userContext);
      
      if (results) {
        console.log('✅ Successfully executed AI analysis on cached data');
        console.log('📈 Results summary:', { type: results.type, dataLength: results.data?.length });
        return results;
      }
      
      // If we get here, executePandasOperations returned null/undefined
      console.warn('⚠️ pandas operations returned null, creating fallback response');
      return this.createErrorResponse('Analysis completed but no results could be extracted from the code');
      
    } catch (error) {
      console.error('❌ Failed to execute AI analysis on cached data:', error);
      console.error('📍 Error stack:', error.stack);
      
      // Return structured error instead of null
      return this.createErrorResponse(`Code execution failed: ${error.message}`);
    }
  }

  // Create a DataFrame-like proxy that supports pandas operations
  createDataFrameProxy(data) {
    const df = {
      data: data,
      columns: Object.keys(data[0] || {}),
      
      // Pandas-like operations
      groupby: (column) => this.performGroupBy(data, column),
      sort_values: (column, ascending = true) => this.performSort(data, column, ascending),
      value_counts: (column) => this.performValueCounts(data, column),
      head: (n = 5) => data.slice(0, n),
      shape: [data.length, Object.keys(data[0] || {}).length],
      
      // Column access
      getColumn: (column) => data.map(row => row[column]),
      
      // Filtering
      filter: (predicate) => data.filter(predicate)
    };
    
    return df;
  }

  // Execute pandas-like operations based on AI's Python code
  executePandasOperations(df, codeString, userContext) {
    try {
      console.log('🔬 Starting pandas operations execution...');
      
      const questionLower = userContext.toLowerCase();
      const availableColumns = df.columns;
      
      console.log('📊 Available columns:', availableColumns);
      console.log('🔍 Code to analyze:', codeString);
      
      // 🚨 VALIDATION: Check for forbidden calculated columns (but be more lenient)
      const forbiddenPatterns = [
        /df\['DISCOUNT_AMOUNT'\]/g,
        /df\['PROFIT_MARGIN'\]/g,
        /DISCOUNT_AMOUNT/g,
        /PROFIT_MARGIN/g
      ];
      
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(codeString)) {
          console.warn(`🚨 Blocked forbidden pattern: ${pattern} in code: ${codeString.substring(0, 100)}`);
          return this.createErrorResponse(`Code contains forbidden calculated columns. Use only existing columns: ${availableColumns.join(', ')}`);
        }
      }
      
      // Validate all column references exist (but be more lenient for method calls)
      const columnReferences = codeString.match(/df\['(\w+)'\]/g) || [];
      console.log('🔍 Found column references:', columnReferences);
      
      for (const ref of columnReferences) {
        const columnName = ref.match(/df\['(\w+)'\]/)[1];
        if (columnName && !availableColumns.includes(columnName)) {
          console.warn(`🚨 Invalid column reference: ${columnName}. Available: ${availableColumns.join(', ')}`);
          // Don't return error immediately, just log it - the code might still work
          console.warn(`⚠️ Column validation warning: ${columnName} not found, but continuing execution`);
        }
      }
      
      // Parse common pandas patterns from the AI's code
      if (codeString.includes('value_counts()')) {
        // AI wants to count values - find the column
        const columnMatch = codeString.match(/df\['(\w+)'\]\.value_counts\(\)|df\.(\w+)\.value_counts\(\)/);
        if (columnMatch) {
          const column = columnMatch[1] || columnMatch[2];
          return this.performValueCounts(df.data, column);
        }
      }
      
      if (codeString.includes('groupby(')) {
        // AI wants to group data - find the groupby column and aggregation
        const groupbyMatch = codeString.match(/groupby\(['"](\w+)['"]\)/);
        const aggMatch = codeString.match(/\.agg\(\{[^}]*\}\)|\.sum\(\)|\.count\(\)|\.mean\(\)/);
        
        if (groupbyMatch) {
          const groupColumn = groupbyMatch[1];
          console.log(`🔍 Executing groupby on column: ${groupColumn}`);
          console.log(`📝 Full code: ${codeString.substring(0, 200)}...`);
          return this.performGroupByAggregation(df.data, groupColumn, codeString);
        }
      }
      
      if (codeString.includes('sort_values(')) {
        // AI wants to sort data
        const sortMatch = codeString.match(/sort_values\(['"](\w+)['"], ascending=(\w+)\)|sort_values\(['"](\w+)['"]\)/);
        if (sortMatch) {
          const column = sortMatch[1] || sortMatch[3];
          const ascending = sortMatch[2] !== 'False';
          return this.performSort(df.data, column, ascending);
        }
      }
      
      // Enhanced pattern matching for more complex operations
      
      // Handle date filtering + counting pattern
      if (codeString.includes('pd.to_datetime') || codeString.includes('datetime')) {
        console.log('🗓️ Detected date-based analysis');
        return this.performDateAnalysis(df.data, codeString, questionLower);
      }
      
      // Handle filtering operations
      if (codeString.includes('df[') && (codeString.includes('>') || codeString.includes('<') || codeString.includes('=='))) {
        console.log('🔍 Detected filtering operation');
        return this.performFilteredAnalysis(df.data, codeString, questionLower);
      }
      
      // Handle len() or count operations
      if (codeString.includes('len(') || codeString.includes('.count()') || codeString.includes('COUNT(')) {
        console.log('📊 Detected counting operation');
        return this.performCountAnalysis(df.data, codeString, questionLower);
      }
      
      // If we still can't parse, try to extract key metrics from the code
      console.log('⚠️ Complex code pattern, attempting intelligent extraction');
      const extractedResults = this.extractResultsFromCode(df.data, codeString, questionLower);
      
      if (extractedResults) {
        console.log('✅ Successfully extracted results from complex code');
        return extractedResults;
      }
      
      // Ultimate fallback - return a basic data summary
      console.log('🔄 Using ultimate fallback - basic data summary');
      return this.createBasicDataSummary(df.data, questionLower);
      
    } catch (error) {
      console.error('❌ Error executing pandas operations:', error);
      console.error('📍 Error details:', {
        message: error.message,
        stack: error.stack,
        codeString: codeString.substring(0, 200),
        userContext: questionLower
      });
      
      // Return a structured error response instead of null
      return this.createErrorResponse(`Code execution failed: ${error.message}`);
    }
  }

  // Perform value counts operation (like pandas)
  performValueCounts(data, column) {
    const counts = {};
    const total = data.length;
    
    data.forEach(row => {
      const value = row[column];
      if (value !== undefined && value !== null) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    // Convert to array and sort by count
    const results = Object.entries(counts)
      .map(([value, count]) => ({
        [column]: value,
        count: count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      type: 'value_counts',
      column: column,
      data: results,
      total: total
    };
  }

  // Perform groupby aggregation (like pandas)
  performGroupByAggregation(data, groupColumn, codeString) {
    const groups = {};
    
    // Group data by the specified column
    data.forEach(row => {
      const groupValue = row[groupColumn];
      if (groupValue !== undefined && groupValue !== null) {
        if (!groups[groupValue]) {
          groups[groupValue] = [];
        }
        groups[groupValue].push(row);
      }
    });
    
    // Determine what aggregations the AI wants
    const aggregations = this.parseAggregations(codeString);
    console.log('🔍 Parsed aggregations:', aggregations);
    
    const results = Object.entries(groups).map(([groupValue, groupData]) => {
      const result = { [groupColumn]: groupValue };
      
      aggregations.forEach(agg => {
        if (agg.column === 'records') {
          result.RECORD_COUNT = groupData.length;
        } else {
          const values = groupData.map(row => parseFloat(row[agg.column]) || 0);
          
          if (agg.operation === 'sum') {
            const sum = values.reduce((total, val) => total + val, 0);
            result[agg.column.toUpperCase()] = Math.round(sum * 100) / 100; // Round to 2 decimals
          } else if (agg.operation === 'count') {
            result[`${agg.column}_COUNT`] = groupData.length;
          } else if (agg.operation === 'mean') {
            const sum = values.reduce((total, val) => total + val, 0);
            result[`AVG_${agg.column.toUpperCase()}`] = Math.round((sum / values.length) * 100) / 100;
          }
        }
      });
      
      // Only include record count if no other aggregations or if specifically requested
      if (aggregations.length === 0 || aggregations.some(agg => agg.operation === 'count')) {
        result.RECORD_COUNT = groupData.length;
      }
      
      return result;
    });
    
    // Sort by the first aggregated column in descending order
    let sortColumn = 'RECORD_COUNT'; // Default fallback
    
    if (aggregations.length > 0) {
      const firstAgg = aggregations[0];
      if (firstAgg.operation === 'sum') {
        sortColumn = firstAgg.column.toUpperCase();
      } else if (firstAgg.operation === 'mean') {
        sortColumn = `AVG_${firstAgg.column.toUpperCase()}`;
      } else if (firstAgg.operation === 'count') {
        sortColumn = firstAgg.column === 'records' ? 'RECORD_COUNT' : `${firstAgg.column}_COUNT`;
      }
    }
    
    console.log(`🔄 Sorting results by column: ${sortColumn}`);
    const sortedResults = results.sort((a, b) => (b[sortColumn] || 0) - (a[sortColumn] || 0));
    
    return {
      type: 'groupby',
      groupColumn: groupColumn,
      data: sortedResults.slice(0, 20), // Limit to top 20 results
      aggregations: aggregations,
      totalGroups: results.length
    };
  }

  // Parse aggregation operations from AI's code
  parseAggregations(codeString) {
    const aggregations = [];
    
    // Look for .agg() calls with various quote patterns
    const aggMatch = codeString.match(/\.agg\(\{([^}]+)\}\)/);
    if (aggMatch) {
      const aggContent = aggMatch[1];
      
      // Handle different quote patterns: 'PROFIT': 'sum' or "PROFIT": "sum"
      const fieldMatches = aggContent.match(/['"](\w+)['"]:\s*['"](\w+)['"]/g);
      if (fieldMatches) {
        fieldMatches.forEach(match => {
          const parsed = match.match(/['"](\w+)['"]:\s*['"](\w+)['"]/);
          if (parsed) {
            const [, column, operation] = parsed;
            aggregations.push({ column, operation });
          }
        });
      }
    }
    
    // Look for direct operations like .sum(), .count(), .mean()
    if (codeString.includes('.sum()')) {
      const sumMatch = codeString.match(/\['(\w+)'\]\.sum\(\)/);
      if (sumMatch) {
        aggregations.push({ column: sumMatch[1], operation: 'sum' });
      }
    }
    
    if (codeString.includes('.mean()')) {
      const meanMatch = codeString.match(/\['(\w+)'\]\.mean\(\)/);
      if (meanMatch) {
        aggregations.push({ column: meanMatch[1], operation: 'mean' });
      }
    }
    
    if (codeString.includes('.count()')) {
      aggregations.push({ column: 'records', operation: 'count' });
    }
    
    // Fallback: if no aggregations found, try to infer from context
    if (aggregations.length === 0) {
      console.log('🔍 No aggregations found, attempting to infer from code context');
      
      // Look for column references in the code
      const columnRefs = codeString.match(/\['(\w+)'\]/g);
      if (columnRefs && columnRefs.length > 0) {
        const column = columnRefs[columnRefs.length - 1].match(/\['(\w+)'\]/)[1]; // Use last column ref
        
        // Infer operation from context
        if (codeString.includes('discount') || codeString.includes('DISCOUNT')) {
          aggregations.push({ column: column, operation: 'mean' });
        } else if (codeString.includes('sales') || codeString.includes('profit') || codeString.includes('SALES') || codeString.includes('PROFIT')) {
          aggregations.push({ column: column, operation: 'sum' });
        } else {
          aggregations.push({ column: column, operation: 'sum' }); // Default to sum
        }
      } else {
        aggregations.push({ column: 'records', operation: 'count' }); // Ultimate fallback
      }
    }
    
    return aggregations;
  }

  // Perform date-based analysis (handles datetime filtering and counting)
  performDateAnalysis(data, codeString, questionLower) {
    try {
      console.log('🗓️ Performing date analysis with code:', codeString.substring(0, 200));
      
      // Find date columns in the data
      const columns = Object.keys(data[0] || {});
      const dateColumns = columns.filter(col => {
        const lowerCol = col.toLowerCase();
        return lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('created') || lowerCol.includes('order');
      });
      
      if (dateColumns.length === 0) {
        console.log('❌ No date columns found for date analysis');
        return this.createErrorResponse('No date columns found in the data for temporal analysis');
      }
      
      const dateColumn = dateColumns[0];
      console.log(`🗓️ Using date column: ${dateColumn}`);
      
      // Extract year filter from question (e.g., "since 2020", "after 2015", "in 2020")
      let targetYear = null;
      const yearMatches = questionLower.match(/(?:since|after|from|in)\s+(\d{4})|(\d{4})/g);
      if (yearMatches) {
        const yearMatch = yearMatches[0].match(/(\d{4})/);
        if (yearMatch) {
          targetYear = parseInt(yearMatch[1]);
        }
      }
      
      console.log(`🗓️ Target year filter: ${targetYear}`);
      
      // Filter data by date if year is specified
      let filteredData = data;
      if (targetYear) {
        filteredData = data.filter(row => {
          const dateValue = row[dateColumn];
          if (!dateValue) return false;
          
          // Parse date flexibly
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return false;
          
          if (questionLower.includes('since') || questionLower.includes('after') || questionLower.includes('from')) {
            return date.getFullYear() >= targetYear;
          } else if (questionLower.includes('in')) {
            return date.getFullYear() === targetYear;
          }
          return date.getFullYear() >= targetYear;
        });
      }
      
      console.log(`🗓️ Filtered ${data.length} → ${filteredData.length} records`);
      
      // Determine what to count based on the question
      if (questionLower.includes('member') || questionLower.includes('customer') || questionLower.includes('user')) {
        // Count unique customers/members
        const customerColumns = columns.filter(col => {
          const lowerCol = col.toLowerCase();
          return lowerCol.includes('customer') || lowerCol.includes('member') || lowerCol.includes('user');
        });
        
        if (customerColumns.length > 0) {
          const customerColumn = customerColumns[0];
          const uniqueCustomers = [...new Set(filteredData.map(row => row[customerColumn]).filter(Boolean))];
          
          return {
            type: 'count',
            metric: 'unique_customers',
            column: customerColumn,
            value: uniqueCustomers.length,
            filter: targetYear ? `since ${targetYear}` : 'all time',
            data: [{
              metric: `Members joined ${targetYear ? `since ${targetYear}` : 'total'}`,
              value: uniqueCustomers.length,
              percentage: targetYear ? Math.round((uniqueCustomers.length / [...new Set(data.map(row => row[customerColumn]).filter(Boolean))].length) * 100) : 100
            }]
          };
        }
      }
      
      // Default: count total records
      return {
        type: 'count',
        metric: 'total_records',
        value: filteredData.length,
        filter: targetYear ? `since ${targetYear}` : 'all time',
        data: [{
          metric: `Records ${targetYear ? `since ${targetYear}` : 'total'}`,
          value: filteredData.length,
          percentage: targetYear ? Math.round((filteredData.length / data.length) * 100) : 100
        }]
      };
      
    } catch (error) {
      console.error('❌ Error in date analysis:', error);
      console.error('📍 Error stack:', error.stack);
      return this.createErrorResponse(`Date analysis failed: ${error.message}`);
    }
  }

  // Perform filtered analysis (handles df[] filtering operations)
  performFilteredAnalysis(data, codeString, questionLower) {
    try {
      console.log('🔍 Performing filtered analysis with code:', codeString.substring(0, 200));
      
      // Extract filter conditions from the code
      const filterMatches = codeString.match(/df\[([^\]]+)\]/g);
      if (!filterMatches) return null;
      
      let filteredData = data;
      
      // Apply each filter
      filterMatches.forEach(filterMatch => {
        const condition = filterMatch.match(/df\[([^\]]+)\]/)[1];
        console.log(`🔍 Applying filter: ${condition}`);
        
        // Parse different filter types
        if (condition.includes('==')) {
          const [column, value] = condition.split('==').map(s => s.trim().replace(/['"]/g, ''));
          filteredData = filteredData.filter(row => row[column] == value);
        } else if (condition.includes('>')) {
          const [column, value] = condition.split('>').map(s => s.trim());
          const numValue = parseFloat(value);
          filteredData = filteredData.filter(row => parseFloat(row[column]) > numValue);
        } else if (condition.includes('<')) {
          const [column, value] = condition.split('<').map(s => s.trim());
          const numValue = parseFloat(value);
          filteredData = filteredData.filter(row => parseFloat(row[column]) < numValue);
        }
      });
      
      console.log(`🔍 Filtered ${data.length} → ${filteredData.length} records`);
      
      // Group and aggregate the filtered data if needed
      if (questionLower.includes('by ') && (questionLower.includes('region') || questionLower.includes('category'))) {
        const groupColumn = this.findGroupingColumn(filteredData, questionLower);
        if (groupColumn) {
          return this.performGroupByAggregation(filteredData, groupColumn, codeString);
        }
      }
      
      // Return filtered data summary
      return {
        type: 'filtered',
        original_count: data.length,
        filtered_count: filteredData.length,
        data: filteredData.slice(0, 20).map((row, index) => ({
          rank: index + 1,
          ...row
        }))
      };
      
    } catch (error) {
      console.error('❌ Error in filtered analysis:', error);
      console.error('📍 Error stack:', error.stack);
      return this.createErrorResponse(`Filtered analysis failed: ${error.message}`);
    }
  }

  // Perform count analysis (handles len(), count(), COUNT() operations)
  performCountAnalysis(data, codeString, questionLower) {
    try {
      console.log('📊 Performing count analysis with code:', codeString.substring(0, 200));
      
      // Check what type of counting is requested
      if (questionLower.includes('member') || questionLower.includes('customer')) {
        // Count unique customers/members
        const columns = Object.keys(data[0] || {});
        const customerColumns = columns.filter(col => {
          const lowerCol = col.toLowerCase();
          return lowerCol.includes('customer') || lowerCol.includes('member') || lowerCol.includes('user');
        });
        
        if (customerColumns.length > 0) {
          const customerColumn = customerColumns[0];
          const uniqueCustomers = [...new Set(data.map(row => row[customerColumn]).filter(Boolean))];
          
          return {
            type: 'count',
            metric: 'unique_customers',
            column: customerColumn,
            value: uniqueCustomers.length,
            data: [{
              metric: 'Unique Members/Customers',
              value: uniqueCustomers.length,
              total_records: data.length,
              percentage: Math.round((uniqueCustomers.length / data.length) * 100)
            }]
          };
        }
      }
      
      if (questionLower.includes('order')) {
        // Count orders
        return {
          type: 'count',
          metric: 'total_orders',
          value: data.length,
          data: [{
            metric: 'Total Orders',
            value: data.length,
            percentage: 100
          }]
        };
      }
      
      // Default count
      return {
        type: 'count',
        metric: 'total_records',
        value: data.length,
        data: [{
          metric: 'Total Records',
          value: data.length,
          percentage: 100
        }]
      };
      
    } catch (error) {
      console.error('❌ Error in count analysis:', error);
      console.error('📍 Error stack:', error.stack);
      return this.createErrorResponse(`Count analysis failed: ${error.message}`);
    }
  }

  // Extract results from complex code patterns
  extractResultsFromCode(data, codeString, questionLower) {
    try {
      console.log('⚙️ Extracting results from complex code:', codeString.substring(0, 200));
      
      // Try to identify the intent from the code and question
      
      // Check for aggregation patterns
      if (codeString.includes('groupby') || codeString.includes('GROUP BY')) {
        console.log('🔍 Detected groupby pattern');
        const groupColumn = this.findGroupingColumn(data, questionLower);
        if (groupColumn) {
          console.log(`📊 Found grouping column: ${groupColumn}`);
          const result = this.performGroupByAggregation(data, groupColumn, codeString);
          if (result) return result;
        }
      }
      
      // Check for value counting patterns
      if (codeString.includes('value_counts') || codeString.includes('COUNT(')) {
        console.log('🔍 Detected value_counts pattern');
        const categoricalColumn = this.findCategoricalColumn(data, questionLower);
        if (categoricalColumn) {
          console.log(`📊 Found categorical column: ${categoricalColumn}`);
          const result = this.performValueCounts(data, categoricalColumn);
          if (result) return result;
        }
      }
      
      // Check for filtering + counting
      if (codeString.includes('len(') && (codeString.includes('[') || codeString.includes('filter'))) {
        console.log('🔍 Detected filtering + counting pattern');
        const result = this.performCountAnalysis(data, codeString, questionLower);
        if (result) return result;
      }
      
      // Fallback: return a sample of the data
      console.log('⚠️ Using fallback data sample');
      return {
        type: 'sample',
        data: data.slice(0, 10).map((row, index) => ({
          rank: index + 1,
          ...row
        }))
      };
      
    } catch (error) {
      console.error('❌ Error extracting results from code:', error);
      console.error('📍 Error stack:', error.stack);
      
      // Return structured error instead of null
      return this.createErrorResponse(`Failed to extract results: ${error.message}`);
    }
  }

  // Find the most relevant categorical column for the question
  findCategoricalColumn(data, questionLower) {
    const columns = Object.keys(data[0] || {});
    
    // Look for exact keyword matches first
    const keywords = ['ship_mode', 'shipping', 'mode', 'category', 'segment', 'region', 'product'];
    for (const keyword of keywords) {
      if (questionLower.includes(keyword.replace('_', ' '))) {
        const matchingCol = columns.find(col => col.toLowerCase().includes(keyword.replace('_', '')));
        if (matchingCol) return matchingCol;
      }
    }
    
    // Fallback to first categorical column
    return columns.find(col => {
      const values = data.map(row => row[col]).filter(v => v != null);
      const uniqueValues = [...new Set(values)];
      return uniqueValues.length < 20 && typeof values[0] === 'string';
    });
  }

  // Find the most relevant grouping column
  findGroupingColumn(data, questionLower) {
    const columns = Object.keys(data[0] || {});
    
    // Look for common grouping patterns
    const groupingKeywords = ['customer', 'region', 'segment', 'category', 'product', 'ship'];
    for (const keyword of groupingKeywords) {
      if (questionLower.includes(keyword)) {
        const matchingCol = columns.find(col => col.toLowerCase().includes(keyword));
        if (matchingCol) return matchingCol;
      }
    }
    
    return null;
  }
  
  // Create a basic data summary when all else fails
  createBasicDataSummary(data, questionLower) {
    try {
      console.log('📊 Creating basic data summary fallback');
      
      if (!data || data.length === 0) {
        return this.createErrorResponse('No data available for analysis');
      }
      
      const columns = Object.keys(data[0] || {});
      const sampleSize = Math.min(10, data.length);
      
      return {
        type: 'summary',
        title: 'Data Summary',
        data: data.slice(0, sampleSize).map((row, index) => ({
          rank: index + 1,
          ...row
        })),
        metadata: {
          total_rows: data.length,
          columns: columns,
          sample_size: sampleSize,
          message: `Showing ${sampleSize} of ${data.length} records`
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating basic data summary:', error);
      return this.createErrorResponse(`Failed to create data summary: ${error.message}`);
    }
  }
}

module.exports = CodeExecutor;