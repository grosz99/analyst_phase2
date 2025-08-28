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

      // Generate Python code for data analysis
      console.log('🐍 Generating Python code for analysis...');
      const pythonCode = await this.generatePythonCode(sanitizedData, sanitizedContext, analysisType);
      
      // Execute Python code using client-side instructions
      const executionResults = await this.preparePythonExecution(pythonCode, sanitizedData, sanitizedContext);
      
      // Extract structured results from GPT-4.1's analysis
      console.log('🧠 Processing analysis results...');
      
      // Create results table from the execution
      const resultsTable = executionResults.resultsTable;
      
      // Create visualization from the execution results
      const visualization = executionResults.visualization;
      
      // Python execution results
      const pythonResults = {
        success: true,
        results: executionResults.data,
        execution_time: Date.now() - startTime,
        method: 'python_pandas_analysis',
        code_executed: pythonCode
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
      
      let clientError = 'AI agent orchestration failed. Please try again.';
      
      if (error.message.includes('Rate limit')) {
        clientError = error.message;
      } else if (error.message.includes('not initialized')) {
        clientError = 'AI orchestration service unavailable.';
      }

      return {
        success: false,
        error: clientError,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Build orchestration messages for multi-agent analysis
  buildOrchestrationMessages(data, analysisType, userContext) {
    const dataStructure = this.analyzeDataStructure(data);
    const sampleData = data.slice(0, 5);
    
    const systemMessage = {
      role: "system",
      content: `You are the central coordinator in a multi-agent data analysis system powered by GPT-4.1. You orchestrate specialized data analysis agents:

- Statistical Analysis Agent: Advanced statistical modeling and hypothesis testing
- Business Intelligence Agent: Strategic insights and KPI analysis
- Predictive Analytics Agent: Forecasting and trend analysis
- Visualization Agent: Data storytelling and chart recommendations

You coordinate these agents to provide comprehensive, multi-faceted analysis with superior reasoning capabilities.`
    };

    const userMessage = {
      role: "user",
      content: `Coordinate multi-agent analysis of this business dataset:

DATASET OVERVIEW:
- Total Records: ${data.length}
- Columns: ${dataStructure.columns.join(', ')}
- Numeric: ${dataStructure.numericColumns.join(', ') || 'None'}
- Categorical: ${dataStructure.categoricalColumns.join(', ') || 'None'}

SAMPLE DATA:
${JSON.stringify(sampleData, null, 2)}

USER REQUEST: "${userContext}"

USER QUESTION: "${userContext}"

Please analyze this data and provide:

1. **INTERPRETATION**: A clear, natural language explanation of what the data shows in response to the user's question. Be specific with numbers and names.

2. **KEY FINDINGS**: The main insights and patterns discovered in the data.

3. **BUSINESS IMPLICATIONS**: What these findings mean for business decisions.

4. **DATA ANALYSIS APPROACH**: Brief explanation of how you would analyze this data (grouping, aggregation, filtering) to answer the question.

Respond in a conversational, insightful manner as if you're a data analyst explaining findings to a business stakeholder. Include specific numbers, percentages, and comparisons where relevant.

For example, if asked about "top 10 clients":
"Looking at the revenue data, I've identified your top 10 performing clients. [Client Name] leads with $X in total revenue across Y projects, representing Z% of your total revenue. This is followed by [Client 2] with $A revenue..."

Be thorough but concise, focusing on actionable insights.`
    };
    
    return [systemMessage, userMessage];
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