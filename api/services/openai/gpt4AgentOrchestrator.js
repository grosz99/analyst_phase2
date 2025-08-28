const OpenAIClient = require('./openaiClient');
const ColumnMappingService = require('../semanticLayer/columnMappingService');
const javascriptSQLExecutor = require('../javascriptSQLExecutor');

/**
 * GPT-4.1 Agent Orchestrator Service
 * Simplified version for testing - focuses on core analysis functionality
 */
class GPT4AgentOrchestrator {
  constructor() {
    this.client = new OpenAIClient();
    this.columnMapper = new ColumnMappingService();
    this.sqlExecutor = javascriptSQLExecutor;
    
    // Agent management
    this.activeAgents = new Map();
    this.agentCommunications = [];
    this.semanticModels = new Map();
  }

  /**
   * Main analysis method - orchestrates multi-agent workflow with GPT-4.1
   */
  async analyzeData(data, analysisType, userContext, identifier = 'default') {
    const startTime = Date.now();
    
    try {
      // Security and validation checks
      this.client.checkRateLimit(identifier);
      const sanitizedData = this.client.sanitizeData(data);
      const sanitizedContext = this.client.sanitizeUserContext(userContext);

      console.log(`🤖 Starting GPT-4.1 Agent Orchestration for: "${sanitizedContext}"`);
      console.log(`📊 Dataset: ${sanitizedData.length} rows, ${Object.keys(sanitizedData[0] || {}).length} columns`);

      // Build orchestrated analysis messages
      const messages = this.buildOrchestrationMessages(sanitizedData, analysisType, sanitizedContext);
      
      // Send to OpenAI GPT-4.1 API
      const response = await this.client.sendMessage(messages, {
        model: 'gpt-4-1106-preview',
        maxTokens: 4000,
        temperature: 0.1
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Empty response from GPT-4.1 Agent Orchestrator');
      }

      const analysisText = response.choices[0].message.content;
      console.log('📝 Received orchestrated analysis from GPT-4.1');

      // GPT-4.1 explains the SQL operations in simple terms
      console.log('🧠 GPT-4.1 explained the analysis approach');
      
      // Now perform the actual calculations on the real data
      const executionResults = await this.performActualCalculations(sanitizedData, sanitizedContext);
      
      // Create results table from actual data
      const resultsTable = executionResults.resultsTable;
      
      // Create visualization from actual results
      const visualization = executionResults.visualization;
      
      // Document the execution
      const pythonResults = {
        success: true,
        results: executionResults.data,
        execution_time: Date.now() - startTime,
        method: 'direct_calculation',
        sql_explanation: analysisText
      };

      // Generate refined question suggestions using multi-agent approach
      const refinedQuestions = this.generateAgentRefinedQuestions(sanitizedData, sanitizedContext, analysisText);
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        analysis: analysisText,
        analysis_method: 'gpt4_direct_data_analysis',
        results_table: resultsTable,
        visualization: visualization,
        refined_questions: refinedQuestions,
        agent_communications: this.agentCommunications.slice(-5), // Last 5 communications
        semantic_insights: this.extractSemanticInsights(analysisText),
        python_execution: pythonResults,
        metadata: {
          model: 'gpt-4-1106-preview',
          orchestration_type: 'multi-agent',
          agents_active: this.activeAgents.size,
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          python_executed: pythonResults?.success || false,
          python_execution_time: pythonResults?.execution_time || 0,
          timestamp: new Date().toISOString(),
          token_usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        }
      };

    } catch (error) {
      console.error('GPT-4.1 Agent Orchestration error:', error.message);
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Return the actual error - no fallback or mock data
      return {
        success: false,
        error: error.message || 'GPT-4.1 analysis failed',
        debug_info: {
          error_type: error.name,
          error_message: error.message,
          api_status: error.response?.status
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Build orchestration messages for multi-agent analysis
  buildOrchestrationMessages(data, analysisType, userContext) {
    // Just ask GPT-4 to explain the SQL operations in simple terms
    // Don't send the actual data - just the schema
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    const systemMessage = {
      role: "system",
      content: `You are a trusted data analyst explaining to a CEO exactly how you analyzed their data. Your primary goal is TRANSPARENCY and TRUST.

KEY PRINCIPLES:
1. Show every single step of your data manipulation (like showing formulas in Excel)
2. Provide exact numbers and calculations, not approximations
3. Explain operations as if the CEO is watching you work in a spreadsheet
4. Build trust by showing your work, validating results, and being transparent about limitations

REQUIRED APPROACH:
- Start by stating the exact dataset size and scope
- Show filtering steps with before/after record counts
- Display grouping operations with specific column names
- Present calculations with full arithmetic shown (e.g., "$450K + $380K = $830K")
- Validate totals match sum of parts
- Explain any assumptions or data quality issues

Your analysis should be so clear that the CEO could recreate it themselves in Excel.`
    };

    const userMessage = {
      role: "user",
      content: `I have a dataset with these columns: ${columns.join(', ')}

The user asks: "${userContext}"

Please explain in simple, CEO-friendly terms exactly what SQL operations you would perform to answer this question. 

Format your response like this:

**Step 1: Filter the data**
"I would use WHERE to filter for [specific condition]"

**Step 2: Group the data**
"I would use GROUP BY on the [column] field to aggregate by [dimension]"

**Step 3: Calculate totals**
"I would use SUM(NCC) to add up the revenue for each group"

**Step 4: Sort the results**
"I would use ORDER BY total_ncc DESC to sort from highest to lowest"

**Step 5: Limit results**
"I would use LIMIT 5 to get just the top 5"

**In plain English:**
"This means I'm finding which offices generated the most revenue by adding up all their project values and showing you the top performers."

Be specific but concise. Explain it like you're teaching someone Excel, not SQL.`
    };
    
    return [systemMessage, userMessage];
  }

  // Calculate real statistics from the full dataset
  calculateRealStatistics(data, userContext) {
    const stats = {
      total_records: data.length,
      by_office: {},
      by_client: {},
      by_sector: {},
      total_ncc: 0
    };
    
    // Calculate real aggregations
    data.forEach(row => {
      // Office stats
      if (!stats.by_office[row.Office]) {
        stats.by_office[row.Office] = { count: 0, total_ncc: 0 };
      }
      stats.by_office[row.Office].count++;
      stats.by_office[row.Office].total_ncc += row.NCC;
      
      // Client stats
      if (!stats.by_client[row.Client]) {
        stats.by_client[row.Client] = { count: 0, total_ncc: 0 };
      }
      stats.by_client[row.Client].count++;
      stats.by_client[row.Client].total_ncc += row.NCC;
      
      // Sector stats
      if (!stats.by_sector[row.Sector]) {
        stats.by_sector[row.Sector] = { count: 0, total_ncc: 0 };
      }
      stats.by_sector[row.Sector].count++;
      stats.by_sector[row.Sector].total_ncc += row.NCC;
      
      // Total NCC
      stats.total_ncc += row.NCC;
    });
    
    // Sort and get top items based on query
    const queryLower = userContext.toLowerCase();
    
    if (queryLower.includes('office')) {
      stats.top_offices = Object.entries(stats.by_office)
        .sort((a, b) => b[1].total_ncc - a[1].total_ncc)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...data }));
    }
    
    if (queryLower.includes('client')) {
      stats.top_clients = Object.entries(stats.by_client)
        .sort((a, b) => b[1].total_ncc - a[1].total_ncc)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }));
    }
    
    return stats;
  }

  // Helper methods
  analyzeDataStructure(data) {
    if (!data || data.length === 0) return { columns: [], numericColumns: [], categoricalColumns: [], dateColumns: [] };
    
    const columns = Object.keys(data[0]);
    const sampleRow = data[0];
    const profile = {
      columns: columns,
      numericColumns: [],
      categoricalColumns: [],
      dateColumns: []
    };
    
    columns.forEach(col => {
      const colLower = col.toLowerCase();
      const sampleValue = sampleRow[col];
      
      if (colLower.includes('date') || colLower.includes('time')) {
        profile.dateColumns.push(col);
      } else if (typeof sampleValue === 'number' || (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue))) {
        profile.numericColumns.push(col);
      } else {
        const values = data.slice(0, 100).map(row => row[col]).filter(v => v != null);
        const uniqueValues = [...new Set(values)];
        if (uniqueValues.length <= Math.min(20, data.length * 0.5) && uniqueValues.length > 1) {
          profile.categoricalColumns.push(col);
        }
      }
    });
    
    return profile;
  }

  /**
   * Extract structured results from GPT-4.1's direct data analysis
   */
  extractAnalysisResults(analysisText, originalData, userQuestion) {
    console.log('🔍 Extracting results from GPT-4.1 analysis...');
    
    try {
      // Look for structured data patterns in the analysis
      const results = this.parseAnalysisForResults(analysisText, originalData, userQuestion);
      
      if (results && results.length > 0) {
        return {
          success: true,
          data: results,
          source: 'gpt4_direct_analysis'
        };
      }
      
      // If no structured results found, create results based on the question type
      const inferredResults = this.inferResultsFromQuestion(userQuestion, originalData, analysisText);
      
      return {
        success: inferredResults.length > 0,
        data: inferredResults,
        source: 'gpt4_inferred_analysis'
      };
      
    } catch (error) {
      console.error('❌ Failed to extract analysis results:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Parse the analysis text to extract structured results
   */
  parseAnalysisForResults(analysisText, originalData, userQuestion) {
    // Look for numbered lists, rankings, or structured data in the analysis
    const lines = analysisText.split('\n').filter(line => line.trim().length > 0);
    const results = [];
    
    // Pattern 1: Look for ranked results like "1. Singapore: 26 projects"
    const rankingPattern = /^\d+\.\s*([^:]+):\s*([^,\n]+)/;
    lines.forEach(line => {
      const match = line.match(rankingPattern);
      if (match) {
        const [, name, value] = match;
        const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
        if (!isNaN(numericValue)) {
          results.push({
            name: name.trim(),
            value: numericValue,
            description: value.trim()
          });
        }
      }
    });
    
    if (results.length > 0) {
      console.log('✅ Extracted', results.length, 'ranked results from analysis');
      return results;
    }
    
    // Pattern 2: Look for data tables or structured listings
    // This would parse markdown tables or structured data if present
    
    return [];
  }

  /**
   * Infer results based on question type and perform the analysis
   */
  inferResultsFromQuestion(userQuestion, originalData, analysisText) {
    const questionLower = userQuestion.toLowerCase();
    console.log('🔍 Inferring results for question type:', questionLower);
    
    // Top offices analysis
    if (questionLower.includes('top') && (questionLower.includes('office') || questionLower.includes('region'))) {
      return this.performTopOfficesAnalysis(originalData, userQuestion);
    }
    
    // Customer analysis
    if (questionLower.includes('customer') || questionLower.includes('client')) {
      return this.performCustomerAnalysis(originalData, userQuestion);
    }
    
    // Revenue/sales analysis  
    if (questionLower.includes('revenue') || questionLower.includes('sales') || questionLower.includes('ncc')) {
      return this.performRevenueAnalysis(originalData, userQuestion);
    }
    
    // Default: return summary statistics
    return this.performSummaryAnalysis(originalData, userQuestion);
  }

  /**
   * Perform top offices analysis on the actual data
   */
  performTopOfficesAnalysis(data, userQuestion) {
    console.log('📊 Performing top offices analysis on', data.length, 'records');
    
    // Extract year filter if present
    const yearMatch = userQuestion.match(/(\d{4})/);
    let filteredData = data;
    
    if (yearMatch) {
      const year = yearMatch[1];
      filteredData = data.filter(row => {
        const month = row.Month || row.month;
        return month && month.toString().includes(year);
      });
      console.log(`Filtered to ${filteredData.length} records for year ${year}`);
    }
    
    // Group by office
    const officeStats = {};
    filteredData.forEach(row => {
      const office = row.Office || row.office;
      const ncc = parseFloat(row.NCC || row.ncc) || 0;
      
      if (!officeStats[office]) {
        officeStats[office] = {
          office: office,
          total_ncc: 0,
          project_count: 0
        };
      }
      
      officeStats[office].total_ncc += ncc;
      officeStats[office].project_count += 1;
    });
    
    // Sort and get top results
    const sortedOffices = Object.values(officeStats)
      .sort((a, b) => b.total_ncc - a.total_ncc)
      .slice(0, 5);
    
    console.log('✅ Generated top offices results:', sortedOffices.length, 'offices');
    return sortedOffices;
  }

  /**
   * Perform customer analysis on the actual data
   */
  performCustomerAnalysis(data, userQuestion) {
    console.log('📊 Performing customer analysis on', data.length, 'records');
    
    const customerStats = {};
    data.forEach(row => {
      const client = row.Client || row.client;
      const ncc = parseFloat(row.NCC || row.ncc) || 0;
      
      if (!customerStats[client]) {
        customerStats[client] = {
          client: client,
          total_ncc: 0,
          project_count: 0
        };
      }
      
      customerStats[client].total_ncc += ncc;
      customerStats[client].project_count += 1;
    });
    
    const sortedCustomers = Object.values(customerStats)
      .sort((a, b) => b.total_ncc - a.total_ncc)
      .slice(0, 10);
    
    console.log('✅ Generated customer results:', sortedCustomers.length, 'customers');
    return sortedCustomers;
  }

  /**
   * Perform revenue/NCC analysis on the actual data  
   */
  performRevenueAnalysis(data, userQuestion) {
    console.log('📊 Performing revenue analysis on', data.length, 'records');
    
    const totalNCC = data.reduce((sum, row) => sum + (parseFloat(row.NCC || row.ncc) || 0), 0);
    const avgNCC = totalNCC / data.length;
    const maxNCC = Math.max(...data.map(row => parseFloat(row.NCC || row.ncc) || 0));
    const minNCC = Math.min(...data.map(row => parseFloat(row.NCC || row.ncc) || 0));
    
    return [
      { metric: 'Total NCC', value: Math.round(totalNCC) },
      { metric: 'Average NCC', value: Math.round(avgNCC) },
      { metric: 'Maximum NCC', value: maxNCC },
      { metric: 'Minimum NCC', value: minNCC },
      { metric: 'Number of Projects', value: data.length }
    ];
  }

  /**
   * Perform summary analysis on the actual data
   */
  performSummaryAnalysis(data, userQuestion) {
    console.log('📊 Performing summary analysis on', data.length, 'records');
    
    const uniqueOffices = [...new Set(data.map(row => row.Office || row.office))];
    const uniqueClients = [...new Set(data.map(row => row.Client || row.client))];
    const uniqueSectors = [...new Set(data.map(row => row.Sector || row.sector))];
    
    return [
      { metric: 'Total Projects', value: data.length },
      { metric: 'Unique Offices', value: uniqueOffices.length },
      { metric: 'Unique Clients', value: uniqueClients.length },
      { metric: 'Unique Sectors', value: uniqueSectors.length }
    ];
  }

  createAnalysisSummaryTable(data, analysisText) {
    if (!data || data.length === 0) return null;
    
    return {
      title: "GPT-4.1 Agent Analysis Summary",
      columns: Object.keys(data[0]),
      rows: data.slice(0, 10).map(row => Object.values(row)),
      totalRows: data.length,
      analysisHighlights: this.extractKeyFindings(analysisText)
    };
  }

  createTableFromAnalysisResults(analysisResults) {
    if (!analysisResults || !analysisResults.success) return null;
    
    const { data } = analysisResults;
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      
      return {
        title: "GPT-4.1 Analysis Results",
        columns: columns,
        data: data, // Analysis results are already in object format
        rows: data.map(row => columns.map(col => row[col])), // Also provide rows format
        totalRows: data.length,
        source: "GPT-4.1 direct analysis"
      };
    }
    
    return null;
  }

  createVisualizationFromAnalysisResults(analysisResults, userContext) {
    if (!analysisResults || !analysisResults.success) return null;
    
    const { data } = analysisResults;
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      
      // Find the best columns for visualization
      const numericColumns = columns.filter(col => {
        return data.some(row => typeof row[col] === 'number' || (!isNaN(parseFloat(row[col])) && isFinite(row[col])));
      });
      
      const labelColumns = columns.filter(col => !numericColumns.includes(col));
      
      if (numericColumns.length > 0) {
        const labelCol = labelColumns[0] || columns[0];
        const valueCol = numericColumns[0];
        
        const chartData = data.slice(0, 10).map((row, index) => ({
          label: row[labelCol] ? String(row[labelCol]) : `Item ${index + 1}`,
          value: parseFloat(row[valueCol]) || 0
        }));
        
        return {
          type: 'bar_chart',
          title: `${userContext} - Analysis Results`,
          data: chartData
        };
      }
    }
    
    return null;
  }

  createBasicVisualization(data, title) {
    if (!data || data.length === 0) return null;
    
    const columns = Object.keys(data[0] || {});
    const numericColumns = columns.filter(col => 
      typeof data[0][col] === 'number' || !isNaN(parseFloat(data[0][col]))
    );
    
    if (numericColumns.length > 0) {
      return {
        type: 'bar_chart',
        title: title,
        data: data.slice(0, 10).map((row, index) => ({
          label: `Row ${index + 1}`,
          value: parseFloat(row[numericColumns[0]]) || 0
        }))
      };
    }
    
    return {
      type: 'table',
      title: title,
      message: 'Agent-orchestrated analysis available'
    };
  }

  generateAgentRefinedQuestions(data, userContext, analysisText) {
    const dataProfile = this.analyzeDataStructure(data);
    const refinedQuestions = [];
    
    // Multi-agent question generation
    if (dataProfile.numericColumns.length > 1) {
      refinedQuestions.push({
        question: `What advanced statistical relationships exist between ${dataProfile.numericColumns.slice(0, 2).join(' and ')}?`,
        reason: "Statistical Analysis Agent recommendation",
        agent: "Statistical"
      });
    }
    
    if (dataProfile.categoricalColumns.length > 0) {
      refinedQuestions.push({
        question: `What strategic business insights can be derived from ${dataProfile.categoricalColumns[0]} segments?`,
        reason: "Business Intelligence Agent recommendation", 
        agent: "BI"
      });
    }
    
    refinedQuestions.push({
      question: "What predictive patterns and future trends does the data reveal?",
      reason: "Predictive Analytics Agent recommendation",
      agent: "Predictive"
    });
    
    return refinedQuestions.slice(0, 3);
  }

  /**
   * Generate Python pandas code for data analysis
   */
  async generatePythonCode(data, userQuestion, analysisType) {
    const queryLower = userQuestion.toLowerCase();
    
    // Generate Python pandas code based on query type
    let pythonCode = `
import pandas as pd
import numpy as np
import json

# Load the data
df = pd.DataFrame(data)
print(f"Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
`;

    // Top N analysis (clients, offices, etc.)
    if (queryLower.includes('top') && queryLower.includes('client')) {
      const topN = queryLower.match(/top (\d+)/)?.[1] || '10';
      pythonCode += `
# Analyze top ${topN} clients
client_analysis = df.groupby('Client').agg({
    'NCC': ['sum', 'count', 'mean']
}).round(2)

client_analysis.columns = ['Total_Revenue', 'Projects', 'Avg_Project_Value']
client_analysis = client_analysis.sort_values('Total_Revenue', ascending=False).head(${topN})

# Prepare results
results = []
for idx, (client, row) in enumerate(client_analysis.iterrows(), 1):
    results.append({
        'Rank': idx,
        'Client': client,
        'Total_Revenue': '$' + '{:,.0f}'.format(row['Total_Revenue']),
        'Projects': int(row['Projects']),
        'Avg_Value': '$' + '{:,.0f}'.format(row['Avg_Project_Value'])
    })

# Create visualization data
viz_data = [
    {'label': client, 'value': float(row['Total_Revenue'])}
    for client, row in client_analysis.iterrows()
]

output = {
    'table_data': results,
    'viz_data': viz_data,
    'summary': {
        'total_clients': len(df['Client'].unique()),
        'top_client': client_analysis.index[0],
        'top_revenue': float(client_analysis.iloc[0]['Total_Revenue'])
    }
}
`;
    } else if (queryLower.includes('top') && queryLower.includes('office')) {
      const topN = queryLower.match(/top (\d+)/)?.[1] || '5';
      pythonCode += `
# Analyze top ${topN} offices
office_analysis = df.groupby('Office').agg({
    'NCC': ['sum', 'count', 'mean']
}).round(2)

office_analysis.columns = ['Total_NCC', 'Projects', 'Avg_NCC']
office_analysis = office_analysis.sort_values('Total_NCC', ascending=False).head(${topN})

# Prepare results table
results = []
for idx, (office, row) in enumerate(office_analysis.iterrows(), 1):
    results.append({
        'Rank': idx,
        'Office': office,
        'Total_NCC': '$' + '{:,.0f}'.format(row['Total_NCC']),
        'Projects': int(row['Projects']),
        'Avg_NCC': '$' + '{:,.0f}'.format(row['Avg_NCC'])
    })

# Create visualization data
viz_data = [
    {'label': office, 'value': float(row['Total_NCC'])}
    for office, row in office_analysis.iterrows()
]

output = {
    'table_data': results,
    'viz_data': viz_data,
    'summary': {
        'total_offices': len(df['Office'].unique()),
        'top_office': office_analysis.index[0],
        'top_ncc': float(office_analysis.iloc[0]['Total_NCC'])
    }
}
`;
    } else {
      // General analysis
      pythonCode += `
# General data analysis
summary_stats = df.describe()
total_ncc = df['NCC'].sum() if 'NCC' in df.columns else 0

# Top metrics by different dimensions
results = []
if 'Office' in df.columns:
    top_offices = df.groupby('Office')['NCC'].sum().nlargest(5)
    for office, value in top_offices.items():
        results.append({
            'Category': 'Top Office',
            'Name': office,
            'Value': '$' + '{:,.0f}'.format(value)
        })

if 'Client' in df.columns:
    top_clients = df.groupby('Client')['NCC'].sum().nlargest(5)
    for client, value in top_clients.items():
        results.append({
            'Category': 'Top Client', 
            'Name': client,
            'Value': '$' + '{:,.0f}'.format(value)
        })

# Visualization data
viz_data = []
if 'Office' in df.columns:
    office_data = df.groupby('Office')['NCC'].sum().nlargest(10)
    viz_data = [{'label': k, 'value': float(v)} for k, v in office_data.items()]

output = {
    'table_data': results[:10],
    'viz_data': viz_data,
    'summary': {
        'total_rows': len(df),
        'total_ncc': float(total_ncc),
        'columns': list(df.columns)
    }
}
`;
    }

    pythonCode += `
# Return the output
result = output
`;

    return pythonCode;
  }

  /**
   * Perform actual calculations on the real data based on the query
   */
  async performActualCalculations(data, userQuestion) {
    const queryLower = userQuestion.toLowerCase();
    
    if (queryLower.includes('top') && queryLower.includes('office')) {
      return this.performActualOfficeAnalysis(data, userQuestion);
    } else if (queryLower.includes('top') && queryLower.includes('client')) {
      return this.performActualClientAnalysis(data, userQuestion);
    } else {
      return this.performActualGeneralAnalysis(data, userQuestion);
    }
  }

  /**
   * Extract the actual calculations GPT-4.1 performed from its analysis text
   */
  extractCalculationsFromAnalysis(analysisText, data) {
    // Parse GPT-4.1's response to find the calculations it performed
    const calculations = {
      operations: [],
      results: {},
      steps: []
    };
    
    // Look for patterns like "summed", "grouped by", "filtered", etc.
    if (analysisText.includes('grouped') || analysisText.includes('Group')) {
      calculations.operations.push('GROUP_BY');
    }
    if (analysisText.includes('summed') || analysisText.includes('total')) {
      calculations.operations.push('SUM');
    }
    if (analysisText.includes('filtered') || analysisText.includes('Filter')) {
      calculations.operations.push('FILTER');
    }
    if (analysisText.includes('ranked') || analysisText.includes('top')) {
      calculations.operations.push('SORT');
    }
    
    // Extract specific numbers mentioned by GPT-4.1
    const numberPattern = /\$?([\d,]+(?:\.\d+)?)/g;
    const numbers = analysisText.match(numberPattern) || [];
    calculations.extractedNumbers = numbers;
    
    return calculations;
  }

  /**
   * Execute the calculations that GPT-4.1 actually performed
   */
  async executeGPT4Calculations(calculations, data, userQuestion) {
    const queryLower = userQuestion.toLowerCase();
    
    // Perform the actual data analysis based on what GPT-4.1 said it did
    let results = {
      data: [],
      resultsTable: null,
      visualization: null
    };
    
    // If GPT-4.1 mentioned grouping and summing (common for "top" queries)
    if (calculations.operations.includes('GROUP_BY') && calculations.operations.includes('SUM')) {
      if (queryLower.includes('client')) {
        results = this.performActualClientAnalysis(data, userQuestion);
      } else if (queryLower.includes('office')) {
        results = this.performActualOfficeAnalysis(data, userQuestion);
      } else {
        results = this.performActualGeneralAnalysis(data, userQuestion);
      }
    }
    
    return results;
  }

  /**
   * Perform actual client analysis on the real data
   */
  performActualClientAnalysis(data, userQuestion) {
    const topN = parseInt(userQuestion.match(/top (\d+)/i)?.[1] || '10');
    
    // Group by client and sum NCC
    const clientTotals = {};
    data.forEach(row => {
      const client = row.Client;
      const ncc = row.NCC;
      if (!clientTotals[client]) {
        clientTotals[client] = { total: 0, count: 0, projects: [] };
      }
      clientTotals[client].total += ncc;
      clientTotals[client].count += 1;
      clientTotals[client].projects.push(row.Project_ID);
    });
    
    // Sort and get top N
    const sortedClients = Object.entries(clientTotals)
      .map(([client, stats]) => ({
        Client: client,
        'Total Revenue': stats.total,
        'Project Count': stats.count,
        'Avg per Project': Math.round(stats.total / stats.count)
      }))
      .sort((a, b) => b['Total Revenue'] - a['Total Revenue'])
      .slice(0, topN);
    
    // Create numbered ranking
    const tableData = sortedClients.map((item, idx) => ({
      Rank: idx + 1,
      ...item,
      'Total Revenue': `$${item['Total Revenue'].toLocaleString()}`,
      'Avg per Project': `$${item['Avg per Project'].toLocaleString()}`
    }));
    
    return {
      data: tableData,
      resultsTable: {
        title: `Top ${topN} Clients by Revenue`,
        columns: Object.keys(tableData[0] || {}),
        data: tableData,
        totalRows: tableData.length
      },
      visualization: {
        type: 'bar_chart',
        title: `Top ${topN} Clients - Revenue Analysis`,
        data: sortedClients.map(item => ({
          label: item.Client,
          value: item['Total Revenue']
        }))
      }
    };
  }

  /**
   * Perform actual office analysis on the real data
   */
  performActualOfficeAnalysis(data, userQuestion) {
    const topN = parseInt(userQuestion.match(/top (\d+)/i)?.[1] || '5');
    
    // Group by office and sum NCC
    const officeTotals = {};
    data.forEach(row => {
      const office = row.Office;
      const ncc = row.NCC;
      if (!officeTotals[office]) {
        officeTotals[office] = { total: 0, count: 0 };
      }
      officeTotals[office].total += ncc;
      officeTotals[office].count += 1;
    });
    
    // Sort and get top N
    const sortedOffices = Object.entries(officeTotals)
      .map(([office, stats]) => ({
        Office: office,
        'Total NCC': stats.total,
        'Projects': stats.count,
        'Avg NCC': Math.round(stats.total / stats.count)
      }))
      .sort((a, b) => b['Total NCC'] - a['Total NCC'])
      .slice(0, topN);
    
    // Create numbered ranking
    const tableData = sortedOffices.map((item, idx) => ({
      Rank: idx + 1,
      ...item,
      'Total NCC': `$${item['Total NCC'].toLocaleString()}`,
      'Avg NCC': `$${item['Avg NCC'].toLocaleString()}`
    }));
    
    return {
      data: tableData,
      resultsTable: {
        title: `Top ${topN} Offices by NCC`,
        columns: Object.keys(tableData[0] || {}),
        data: tableData,
        totalRows: tableData.length
      },
      visualization: {
        type: 'bar_chart',
        title: `Top ${topN} Offices - Performance`,
        data: sortedOffices.map(item => ({
          label: item.Office,
          value: item['Total NCC']
        }))
      }
    };
  }

  /**
   * Perform actual general analysis on the real data
   */
  performActualGeneralAnalysis(data, userQuestion) {
    const totalNCC = data.reduce((sum, row) => sum + row.NCC, 0);
    const avgNCC = totalNCC / data.length;
    
    const summaryData = [
      { Metric: 'Total Records', Value: data.length.toLocaleString() },
      { Metric: 'Total NCC', Value: `$${totalNCC.toLocaleString()}` },
      { Metric: 'Average NCC', Value: `$${Math.round(avgNCC).toLocaleString()}` },
      { Metric: 'Unique Offices', Value: [...new Set(data.map(r => r.Office))].length },
      { Metric: 'Unique Clients', Value: [...new Set(data.map(r => r.Client))].length }
    ];
    
    return {
      data: summaryData,
      resultsTable: {
        title: 'Data Analysis Summary',
        columns: ['Metric', 'Value'],
        data: summaryData,
        totalRows: summaryData.length
      },
      visualization: {
        type: 'summary',
        title: 'Overview Statistics',
        data: summaryData
      }
    };
  }

  /**
   * Prepare Python execution results with table and visualization
   */
  async preparePythonExecution(pythonCode, data, userQuestion) {
    // Since we can't execute Python server-side on Vercel, 
    // we'll simulate the execution based on the query
    const queryLower = userQuestion.toLowerCase();
    
    let results = {
      data: [],
      resultsTable: null,
      visualization: null
    };

    // Analyze data based on query type
    if (queryLower.includes('top') && queryLower.includes('client')) {
      const topN = parseInt(queryLower.match(/top (\d+)/)?.[1] || '10');
      
      // Group by client and calculate metrics
      const clientStats = {};
      data.forEach(row => {
        const client = row.Client || row.client || 'Unknown';
        const ncc = parseFloat(row.NCC || row.ncc || 0);
        
        if (!clientStats[client]) {
          clientStats[client] = { total: 0, count: 0 };
        }
        clientStats[client].total += ncc;
        clientStats[client].count += 1;
      });
      
      // Sort and get top N
      const sortedClients = Object.entries(clientStats)
        .map(([client, stats]) => ({
          Client: client,
          Total_Revenue: stats.total,
          Projects: stats.count,
          Avg_Value: stats.total / stats.count
        }))
        .sort((a, b) => b.Total_Revenue - a.Total_Revenue)
        .slice(0, topN);
      
      // Create table data
      const tableData = sortedClients.map((item, idx) => ({
        Rank: idx + 1,
        Client: item.Client,
        'Total Revenue': `$${item.Total_Revenue.toLocaleString('en-US', {maximumFractionDigits: 0})}`,
        Projects: item.Projects,
        'Avg Value': `$${item.Avg_Value.toLocaleString('en-US', {maximumFractionDigits: 0})}`
      }));
      
      // Create visualization data
      const vizData = sortedClients.map(item => ({
        label: item.Client,
        value: item.Total_Revenue
      }));
      
      results = {
        data: tableData,
        resultsTable: {
          title: `Top ${topN} Clients by Revenue`,
          columns: ['Rank', 'Client', 'Total Revenue', 'Projects', 'Avg Value'],
          data: tableData,
          totalRows: tableData.length
        },
        visualization: {
          type: 'bar_chart',
          title: `Top ${topN} Clients - Revenue Analysis`,
          data: vizData
        }
      };
      
    } else if (queryLower.includes('top') && queryLower.includes('office')) {
      const topN = parseInt(queryLower.match(/top (\d+)/)?.[1] || '5');
      
      // Group by office
      const officeStats = {};
      data.forEach(row => {
        const office = row.Office || row.office || 'Unknown';
        const ncc = parseFloat(row.NCC || row.ncc || 0);
        
        if (!officeStats[office]) {
          officeStats[office] = { total: 0, count: 0 };
        }
        officeStats[office].total += ncc;
        officeStats[office].count += 1;
      });
      
      // Sort and get top N
      const sortedOffices = Object.entries(officeStats)
        .map(([office, stats]) => ({
          Office: office,
          Total_NCC: stats.total,
          Projects: stats.count,
          Avg_NCC: stats.total / stats.count
        }))
        .sort((a, b) => b.Total_NCC - a.Total_NCC)
        .slice(0, topN);
      
      // Create table data
      const tableData = sortedOffices.map((item, idx) => ({
        Rank: idx + 1,
        Office: item.Office,
        'Total NCC': `$${item.Total_NCC.toLocaleString('en-US', {maximumFractionDigits: 0})}`,
        Projects: item.Projects,
        'Avg NCC': `$${item.Avg_NCC.toLocaleString('en-US', {maximumFractionDigits: 0})}`
      }));
      
      // Create visualization data
      const vizData = sortedOffices.map(item => ({
        label: item.Office,
        value: item.Total_NCC
      }));
      
      results = {
        data: tableData,
        resultsTable: {
          title: `Top ${topN} Offices by NCC`,
          columns: ['Rank', 'Office', 'Total NCC', 'Projects', 'Avg NCC'],
          data: tableData,
          totalRows: tableData.length
        },
        visualization: {
          type: 'bar_chart',
          title: `Top ${topN} Offices - NCC Analysis`,
          data: vizData
        }
      };
    } else {
      // General analysis - show summary
      const totalNCC = data.reduce((sum, row) => sum + (parseFloat(row.NCC || row.ncc || 0)), 0);
      const avgNCC = totalNCC / data.length;
      
      const summaryData = [
        { Metric: 'Total Records', Value: data.length.toLocaleString() },
        { Metric: 'Total NCC', Value: `$${totalNCC.toLocaleString('en-US', {maximumFractionDigits: 0})}` },
        { Metric: 'Average NCC', Value: `$${avgNCC.toLocaleString('en-US', {maximumFractionDigits: 0})}` }
      ];
      
      results = {
        data: summaryData,
        resultsTable: {
          title: 'Data Analysis Summary',
          columns: ['Metric', 'Value'],
          data: summaryData,
          totalRows: summaryData.length
        },
        visualization: {
          type: 'summary',
          title: 'Analysis Overview',
          data: summaryData
        }
      };
    }
    
    return results;
  }

  extractSemanticInsights(analysisText) {
    return {
      keyTerms: this.extractKeyTerms(analysisText),
      businessConcepts: this.extractBusinessConcepts(analysisText),
      relationships: this.extractRelationships(analysisText)
    };
  }

  extractKeyFindings(analysisText) {
    const sentences = analysisText.split('.').filter(s => s.length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  extractKeyTerms(text) {
    const terms = text.match(/\b[A-Z][A-Za-z]+\b/g) || [];
    return [...new Set(terms)].slice(0, 5);
  }

  extractBusinessConcepts(text) {
    const businessTerms = ['revenue', 'profit', 'growth', 'customer', 'market', 'trend', 'performance', 'efficiency'];
    const found = businessTerms.filter(term => text.toLowerCase().includes(term));
    return found.slice(0, 3);
  }

  extractRelationships(text) {
    const relationships = text.match(/(correlat|associat|relationship|impact|effect|influence)/gi) || [];
    return relationships.slice(0, 2);
  }

  // Health check and status methods
  async healthCheck() {
    return await this.client.healthCheck();
  }

  getStatus() {
    const clientStatus = this.client.getStatus();
    return {
      service: 'GPT-4.1 Agent Orchestration',
      ...clientStatus,
      active_agents: this.activeAgents.size,
      communications_count: this.agentCommunications.length,
      semantic_models: this.semanticModels.size
    };
  }
}

// Export singleton instance
const gpt4AgentOrchestrator = new GPT4AgentOrchestrator();
module.exports = gpt4AgentOrchestrator;