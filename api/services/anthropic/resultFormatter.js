/**
 * Result Formatter - Handles table and visualization formatting
 * Responsible for: Converting analysis results to tables, creating visualizations, formatting data
 */
class ResultFormatter {

  // Format analysis results as a proper table structure
  formatResultsAsTable(results, userContext) {
    console.log('📊 ResultFormatter.formatResultsAsTable called:', {
      hasResults: !!results,
      resultsType: results?.type,
      hasData: !!results?.data,
      dataLength: results?.data?.length,
      userContext: userContext?.substring(0, 100) + '...'
    });
    
    if (!results || !results.data) {
      console.warn('⚠️ No results or data provided, returning fallback table');
      return {
        title: "Analysis Results",
        headers: ["Metric", "Value"],
        data: [{ Metric: "No Results", Value: "Analysis could not be completed" }],
        total_rows: 1
      };
    }
    
    if (results.type === 'value_counts') {
      console.log('📊 Formatting value_counts results:', {
        column: results.column,
        dataLength: results.data.length
      });
      
      const formattedTable = {
        title: `${results.column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Distribution`,
        headers: ["Rank", results.column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), "Count", "Percentage"],
        data: results.data.map((item, index) => ({
          Rank: index + 1,
          [results.column]: item[results.column],
          Count: item.count,
          Percentage: `${item.percentage}%`
        })),
        total_rows: results.data.length
      };
      
      console.log('✅ value_counts table formatted successfully:', {
        title: formattedTable.title,
        headers: formattedTable.headers,
        rowCount: formattedTable.data.length
      });
      
      return formattedTable;
    }
    
    if (results.type === 'groupby') {
      console.log('📊 Formatting groupby results:', {
        groupColumn: results.groupColumn,
        dataLength: results.data.length,
        aggregations: results.aggregations
      });
      
      const firstResult = results.data[0];
      if (!firstResult) {
        console.warn('⚠️ No data in groupby results, returning empty table');
        return {
          title: "No Results Found",
          headers: ["Message"],
          data: [{ Message: "No data available for groupby analysis" }],
          total_rows: 0
        };
      }
      
      // Create proper column headers
      const columns = ["Rank"];
      
      // Add the group column (e.g., CUSTOMER_ID)
      const groupColDisplay = results.groupColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      columns.push(groupColDisplay);
      
      // Add aggregated columns with proper formatting
      Object.keys(firstResult).forEach(key => {
        if (key !== results.groupColumn && key !== 'rank') {
          const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          columns.push(displayName);
        }
      });
      
      return {
        title: `Top ${Math.min(results.data.length, 10)} ${groupColDisplay}s by ${results.aggregations.length > 0 ? results.aggregations[0].column.toUpperCase() : 'Performance'}`,
        columns: columns,
        data: results.data.map((item, index) => {
          const row = { rank: index + 1 };
          
          // Add all data with proper key formatting
          Object.entries(item).forEach(([key, value]) => {
            if (key === results.groupColumn) {
              row[groupColDisplay] = value;
            } else {
              const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              // Format numbers properly
              if (typeof value === 'number') {
                row[displayKey] = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
              } else {
                row[displayKey] = value;
              }
            }
          });
          
          return row;
        }),
        total_rows: results.data.length
      };
    }
    
    if (results.type === 'count') {
      return {
        title: results.metric === 'unique_customers' ? "Member/Customer Count Analysis" :
               results.metric === 'total_orders' ? "Order Count Analysis" : "Count Analysis",
        columns: ["Metric", "Value", "Details"],
        data: results.data.map(item => ({
          metric: item.metric,
          value: item.value.toLocaleString(),
          details: item.percentage ? `${item.percentage}%` : 
                   item.total_records ? `out of ${item.total_records} total records` : 
                   results.filter || 'all time'
        })),
        total_rows: results.data.length
      };
    }
    
    if (results.type === 'filtered') {
      const columns = results.data.length > 0 ? Object.keys(results.data[0]) : [];
      return {
        title: `Filtered Results (${results.filtered_count} of ${results.original_count} records)`,
        columns: columns,
        data: results.data,
        total_rows: results.data.length
      };
    }
    
    if (results.type === 'sample') {
      const columns = results.data.length > 0 ? Object.keys(results.data[0]) : [];
      return {
        title: "Data Sample",
        columns: columns,
        data: results.data,
        total_rows: results.data.length
      };
    }
    
    return {
      title: "Analysis Results",
      columns: Object.keys(results.data[0] || {}),
      data: results.data,
      total_rows: results.data.length
    };
  }

  // Create visualization from analysis results
  createVisualizationFromResults(results, userContext) {
    console.log('📈 ResultFormatter.createVisualizationFromResults called:', {
      hasResults: !!results,
      resultsType: results?.type,
      hasData: !!results?.data,
      dataLength: results?.data?.length,
      userContext: userContext?.substring(0, 50) + '...'
    });
    
    if (!results || !results.data || results.data.length === 0) {
      console.warn('⚠️ No results or data for visualization, returning no_data response');
      return {
        type: "no_data",
        title: "No Visualization Available",
        message: "Could not generate visualization from analysis results"
      };
    }
    
    if (results.type === 'value_counts') {
      console.log('📊 Creating value_counts visualization');
      const visualization = {
        type: "bar_chart",
        title: `${results.column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Distribution`,
        x_axis: results.column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        y_axis: "Count",
        data: results.data.slice(0, 8).map(item => ({
          label: item[results.column],
          value: item.count,
          formatted_value: `${item.count} (${item.percentage}%)`
        }))
      };
      
      console.log('✅ value_counts visualization created:', {
        type: visualization.type,
        dataPoints: visualization.data.length
      });
      
      return visualization;
    }
    
    if (results.type === 'groupby') {
      const valueColumn = Object.keys(results.data[0]).find(key => 
        key !== results.groupColumn && key !== 'rank' && typeof results.data[0][key] === 'number'
      ) || 'count';
      
      return {
        type: "bar_chart",
        title: `${results.groupColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis`,
        x_axis: results.groupColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        y_axis: valueColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: results.data.slice(0, 8).map(item => ({
          label: item[results.groupColumn],
          value: item[valueColumn],
          formatted_value: `${item[valueColumn]}`
        }))
      };
    }
    
    if (results.type === 'count') {
      return {
        type: "summary_stats",
        title: results.metric === 'unique_customers' ? "Member/Customer Analysis" :
               results.metric === 'total_orders' ? "Order Analysis" : "Count Analysis",
        data: {
          primary_metric: results.value,
          metric_label: results.data[0]?.metric || 'Count',
          filter_applied: results.filter || 'none',
          data_source: results.column || 'dataset'
        }
      };
    }
    
    if (results.type === 'filtered' || results.type === 'sample') {
      return {
        type: "summary_stats",
        title: results.type === 'filtered' ? "Filtered Data Overview" : "Data Sample Overview",
        data: {
          records_shown: results.data.length,
          total_records: results.original_count || results.data.length,
          filter_effectiveness: results.original_count ? 
            Math.round((results.data.length / results.original_count) * 100) : 100
        }
      };
    }
    
    return {
      type: "summary_stats",
      title: "Analysis Overview",
      data: {
        total_records: results.data.length
      }
    };
  }

  // Extract Python code from AI response
  extractPythonCode(analysisText) {
    try {
      // Look for Python code blocks in the response
      const codeBlockRegex = /```python\n([\s\S]*?)\n```/g;
      const matches = [];
      let match;
      
      while ((match = codeBlockRegex.exec(analysisText)) !== null) {
        matches.push(match[1].trim());
      }
      
      if (matches.length > 0) {
        return {
          code: matches.join('\n\n'),
          blocks: matches,
          executable: true
        };
      }
      
      // Fallback: look for any code-like patterns
      const lines = analysisText.split('\n');
      const codeLines = lines.filter(line => 
        line.includes('df.') || 
        line.includes('groupby(') || 
        line.includes('import ') ||
        line.includes('result =')
      );
      
      if (codeLines.length > 0) {
        return {
          code: codeLines.join('\n'),
          blocks: [codeLines.join('\n')],
          executable: false
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Python code:', error);
      return null;
    }
  }

  // Generate structured results from AI analysis text (DEPRECATED - removing mock logic)
  generateStructuredResults(data, userContext, analysisText) {
    console.warn('🚨 generateStructuredResults is deprecated - using real analysis execution instead');
    
    // This method should no longer be used - all analysis should go through real execution
    return {
      results_table: {
        title: "Analysis in Progress",
        columns: ["Status"],
        data: [{ status: "Real analysis execution in progress..." }],
        total_rows: 1
      },
      visualization: {
        type: "summary_stats",
        title: "Analysis Status",
        data: { status: "executing" }
      }
    };
  }

  // Create simple summary table for basic analysis
  createSummaryTable(data, title = "Data Summary") {
    const columns = Object.keys(data[0] || {});
    const recordCount = data.length;
    const columnCount = columns.length;
    
    // Calculate basic statistics
    const numericColumns = columns.filter(col => {
      const values = data.slice(0, 10).map(row => row[col]);
      return values.some(v => !isNaN(parseFloat(v)) && isFinite(v));
    });
    
    const categoricalColumns = columns.filter(col => {
      const values = data.slice(0, 50).map(row => row[col]).filter(v => v != null);
      const uniqueValues = [...new Set(values)];
      return uniqueValues.length <= Math.min(20, data.length * 0.5) && uniqueValues.length > 1;
    });
    
    return {
      title: title,
      columns: ["Metric", "Value"],
      data: [
        { metric: "Total Records", value: recordCount.toLocaleString() },
        { metric: "Total Columns", value: columnCount },
        { metric: "Numeric Columns", value: numericColumns.length },
        { metric: "Categorical Columns", value: categoricalColumns.length }
      ],
      total_rows: 4
    };
  }

  // Create basic visualization for data overview
  createBasicVisualization(data, title = "Data Overview") {
    const columns = Object.keys(data[0] || {});
    
    return {
      type: "summary_stats",
      title: title,
      data: {
        total_records: data.length,
        total_columns: columns.length,
        data_quality: Math.round((data.filter(row => 
          Object.values(row).every(val => val !== null && val !== '')
        ).length / data.length) * 100)
      }
    };
  }
}

module.exports = ResultFormatter;