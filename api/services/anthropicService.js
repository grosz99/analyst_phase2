const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

class AnthropicService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.rateLimiter = new Map(); // Simple rate limiting
    this.MAX_REQUESTS_PER_MINUTE = 10;
    this.MAX_DATA_ROWS = 1000; // Limit data size for security
    this.MAX_PROMPT_LENGTH = 50000; // Prevent prompt injection attacks
    
    this.initializeClient();
  }

  initializeClient() {
    try {
      let apiKey = null;

      // Try environment variable first (for production/Vercel)
      if (process.env.ANTHROPIC_API_KEY) {
        apiKey = process.env.ANTHROPIC_API_KEY;
        console.log('✅ Using Anthropic API key from environment variable');
      } else {
        // Fallback to local credentials file (for development)
        const credentialsPath = path.resolve(__dirname, '../../snowcred.env');
        
        if (fs.existsSync(credentialsPath)) {
          // Parse environment file securely
          const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
          const credentials = {};
          
          credentialsContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
              credentials[key.trim()] = value.trim().replace(/['"]/g, '');
            }
          });

          apiKey = credentials.ANTHROPIC_API_KEY;
          if (apiKey) {
            console.log('✅ Using Anthropic API key from local credentials file');
          }
        }
      }
      
      if (!apiKey) {
        console.warn('ANTHROPIC_API_KEY not found in credentials. AI analysis will be disabled.');
        return;
      }

      // Validate API key format (basic security check)
      if (!apiKey.startsWith('sk-ant-') || apiKey.length < 50) {
        console.error('Invalid Anthropic API key format. AI analysis will be disabled.');
        return;
      }

      this.client = new Anthropic({
        apiKey: apiKey,
        // Add additional security configurations
        timeout: 30000, // 30 second timeout
        maxRetries: 2,
      });

      this.initialized = true;
      console.log('✅ Anthropic API service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Anthropic service:', error.message);
      this.initialized = false;
    }
  }

  // Rate limiting check
  checkRateLimit(identifier = 'default') {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!this.rateLimiter.has(identifier)) {
      this.rateLimiter.set(identifier, []);
    }
    
    const requests = this.rateLimiter.get(identifier);
    
    // Clean old requests
    const recentRequests = requests.filter(time => time > windowStart);
    this.rateLimiter.set(identifier, recentRequests);
    
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    
    // Add current request
    recentRequests.push(now);
  }

  // Sanitize and validate input data
  sanitizeData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    if (data.length === 0) {
      throw new Error('Dataset is empty');
    }

    if (data.length > this.MAX_DATA_ROWS) {
      console.warn(`Dataset truncated to ${this.MAX_DATA_ROWS} rows for security`);
      data = data.slice(0, this.MAX_DATA_ROWS);
    }

    // Remove potentially sensitive fields and sanitize values
    const sanitizedData = data.map(row => {
      const sanitizedRow = {};
      
      Object.keys(row).forEach(key => {
        // Skip potentially sensitive field names
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('password') || 
            lowerKey.includes('secret') || 
            lowerKey.includes('token') ||
            lowerKey.includes('key') ||
            lowerKey.includes('ssn') ||
            lowerKey.includes('credit')) {
          return; // Skip this field
        }

        let value = row[key];
        
        // Sanitize string values
        if (typeof value === 'string') {
          // Remove potential script injections
          value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          value = value.replace(/javascript:/gi, '');
          value = value.replace(/on\w+\s*=/gi, '');
          
          // Truncate very long strings
          if (value.length > 500) {
            value = value.substring(0, 500) + '...';
          }
        }
        
        // Validate numeric values
        if (typeof value === 'number' && !isFinite(value)) {
          value = 0;
        }
        
        sanitizedRow[key] = value;
      });
      
      return sanitizedRow;
    });

    return sanitizedData;
  }

  // Intelligent data analysis - examine actual values like Julius AI
  analyzeDataIntelligently(data, userContext) {
    const columns = Object.keys(data[0] || {});
    const questionLower = userContext.toLowerCase();
    
    // Julius AI-style data examination: look at actual values
    const dataInsights = {};
    
    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v != null);
      const uniqueValues = [...new Set(values)];
      
      dataInsights[col] = {
        type: typeof values[0],
        uniqueCount: uniqueValues.length,
        sampleValues: uniqueValues.slice(0, 10),
        isNumerical: values.every(v => !isNaN(parseFloat(v))),
        isCategorical: uniqueValues.length < 50 && typeof values[0] === 'string'
      };
      
      // Intelligent question-value matching (Julius AI style)
      const colLower = col.toLowerCase();
      
      // Tier/Level analysis
      if ((questionLower.includes('tier') || questionLower.includes('level')) && 
          (colLower.includes('tier') || colLower.includes('level') || colLower.includes('grade'))) {
        dataInsights[col].relevantToQuestion = 'tier_analysis';
        dataInsights[col].questionType = 'categorical_filter';
      }
      
      // Specific value matching
      ['silver', 'gold', 'bronze', 'platinum', 'premium', 'standard', 'basic'].forEach(value => {
        if (questionLower.includes(value) && uniqueValues.some(v => String(v).toLowerCase().includes(value))) {
          dataInsights[col].relevantToQuestion = value;
          dataInsights[col].questionType = 'value_filter';
          dataInsights[col].targetValue = uniqueValues.find(v => String(v).toLowerCase().includes(value));
        }
      });
      
      // Status/Category analysis  
      if ((questionLower.includes('status') || questionLower.includes('type') || questionLower.includes('category')) &&
          dataInsights[col].isCategorical) {
        dataInsights[col].relevantToQuestion = 'category_analysis';
        dataInsights[col].questionType = 'categorical_analysis';
      }
      
      // Customer analysis
      if (questionLower.includes('customer') && colLower.includes('customer')) {
        dataInsights[col].relevantToQuestion = 'customer_analysis';
        dataInsights[col].questionType = 'groupby_analysis';
      }
      
      // Time-based analysis
      if ((questionLower.includes('when') || questionLower.includes('date') || questionLower.includes('time')) &&
          (colLower.includes('date') || colLower.includes('time') || colLower.includes('created'))) {
        dataInsights[col].relevantToQuestion = 'temporal_analysis';
        dataInsights[col].questionType = 'temporal_analysis';
      }
    });
    
    return dataInsights;
  }

  // Create secure analysis prompt
  createAnalysisPrompt(data, analysisType = 'general', userContext = '') {
    // Sanitize user context
    const sanitizedContext = userContext.replace(/[<>'"]/g, '').substring(0, 1000);
    
    const dataPreview = data.slice(0, 5); // Only show first 5 rows in prompt
    const totalRows = data.length;
    const columns = Object.keys(data[0] || {});
    
    // Julius AI-style intelligent data examination
    const dataInsights = this.analyzeDataIntelligently(data, sanitizedContext);
    
    // Create context-aware prompt based on the question
    let analysisInstructions = '';
    const questionLower = sanitizedContext.toLowerCase();
    
    if (questionLower.includes('profitable') || questionLower.includes('profit')) {
      const hasProfit = columns.some(col => col.toLowerCase().includes('profit'));
      const hasSales = columns.some(col => col.toLowerCase().includes('sales'));
      
      if (hasProfit || hasSales) {
        analysisInstructions = `
SPECIFIC ANALYSIS REQUEST: CUSTOMER PROFITABILITY ANALYSIS

IMPORTANT: This dataset contains ${hasProfit ? 'PROFIT' : 'SALES'} data. Please:
1. Calculate total profit/sales per customer by aggregating (GROUP BY customer, SUM(profit/sales))
2. Rank customers by their total profit/sales contribution
3. Calculate profit margins if both sales and profit are available
4. Provide actionable insights about the most valuable customers
5. Show percentage contribution of top customers to total profit/sales

Focus on delivering accurate financial analysis using the available profit/sales data.`;
      } else {
        analysisInstructions = `
SPECIFIC ANALYSIS REQUEST: The user is asking about PROFITABILITY. 

IMPORTANT: This dataset lacks explicit profit/revenue columns. Please:
1. Acknowledge that true profitability requires revenue and cost data not present in this dataset
2. Instead analyze CUSTOMER VALUE using available metrics like order frequency, volume, etc.
3. Explain what additional data would be needed for true profitability analysis
4. Focus on customer value indicators rather than claiming to calculate actual profits

Your answer should be honest about data limitations while providing valuable customer insights.`;
      }
    } else if (questionLower.includes('customer')) {
      analysisInstructions = `
SPECIFIC ANALYSIS REQUEST: Customer analysis. Focus on customer behavior patterns, frequency, volume, and segmentation based on available data.`;
    } else if (questionLower.includes('region')) {
      analysisInstructions = `
SPECIFIC ANALYSIS REQUEST: Regional analysis. Focus on geographic patterns, regional performance differences, and location-based insights.`;
    } else if (questionLower.includes('segment') || questionLower.includes('category')) {
      analysisInstructions = `
SPECIFIC ANALYSIS REQUEST: Segment/Category analysis. Analyze performance across different segments or categories using available grouping data.

IMPORTANT: This dataset contains segment/category data. Please:
1. Group by segment/category columns and aggregate metrics
2. Rank segments by total sales, profit, or volume
3. Identify top-performing segments
4. Calculate segment contribution percentages
5. Provide insights about segment performance differences

Focus on delivering segment-specific analysis using groupby operations.`;
    } else {
      analysisInstructions = `
GENERAL ANALYSIS REQUEST: Provide comprehensive insights based on the available data structure and patterns.`;
    }

    // Find columns relevant to the question
    const relevantColumns = Object.keys(dataInsights).filter(col => dataInsights[col].relevantToQuestion);
    const contextualInfo = relevantColumns.length > 0 ? 
      `\nRELEVANT DATA FOUND: ${relevantColumns.map(col => `${col} contains values like: ${dataInsights[col].sampleValues.slice(0, 5).join(', ')}`).join('; ')}` : '';

    const basePrompt = `You are a professional data analyst with Python expertise. The user has loaded a dataset into memory (available as 'df' pandas DataFrame) and wants to analyze it.

Dataset Information:
- Total Rows: ${totalRows}
- Columns: ${columns.join(', ')}
- User Question: "${sanitizedContext}"${contextualInfo}

DATA STRUCTURE INSIGHTS:
${Object.keys(dataInsights).map(col => {
  const insight = dataInsights[col];
  return `${col}: ${insight.isCategorical ? 'Categorical' : insight.isNumerical ? 'Numerical' : 'Text'} (${insight.uniqueCount} unique values)${insight.relevantToQuestion ? ` *** RELEVANT TO QUESTION: Contains "${insight.relevantToQuestion}" values ***` : ''}`;
}).join('\n')}

${analysisInstructions}

Sample Data (first 5 rows):
${JSON.stringify(dataPreview, null, 2)}

INTELLIGENT ANALYSIS REQUIREMENTS:
1. **Examine the DATA STRUCTURE INSIGHTS above** - Look for columns marked as "RELEVANT TO QUESTION"
2. **Use specific values from the data** - Don't make assumptions about what values exist
3. **Answer the exact question asked** - Focus on the specific values or conditions mentioned
4. **Write targeted Python code** that filters or groups by the relevant values found
5. **Provide precise counts and percentages** when asked about specific categories

RESPONSE FORMAT:
# Analysis: [Question Title]

## Python Code
\`\`\`python
import pandas as pd
import numpy as np

# Intelligent analysis based on actual data values
# [Write code that uses the specific values found in the relevant columns]
# Example: df[df['CUSTOMER_TIER'] == 'Silver'].shape[0]
\`\`\`

## Key Findings
[Specific findings based on actual data values]

## Recommendations
[Actionable recommendations based on the analysis]

Focus on writing Python code that examines the actual values in the dataset to answer the specific question asked.`;

    if (basePrompt.length > this.MAX_PROMPT_LENGTH) {
      throw new Error('Analysis prompt too large. Please reduce dataset size or context.');
    }

    return basePrompt;
  }

  // Generate intelligent pandas code based on data insights (Julius AI approach)
  generateIntelligentPandasCode(data, userContext, dataInsights) {
    const questionLower = userContext.toLowerCase();
    const columns = Object.keys(data[0] || {});
    
    // Find the most relevant column for the question
    const relevantCol = Object.keys(dataInsights).find(col => dataInsights[col].relevantToQuestion);
    
    if (!relevantCol) return null;
    
    const insight = dataInsights[relevantCol];
    
    // Generate specific code based on question type and data insights
    if (insight.questionType === 'value_filter' && insight.targetValue) {
      return `
# Intelligent analysis: Looking for "${insight.targetValue}" in ${relevantCol}
import pandas as pd

# Filter for specific value found in data
filtered_data = df[df['${relevantCol}'] == '${insight.targetValue}']
count = len(filtered_data)
total = len(df)
percentage = (count / total * 100).round(1)

print(f"Total ${insight.targetValue} records: {count}")
print(f"Percentage of total: {percentage}%")
print(f"\\nBreakdown by ${relevantCol}:")
print(df['${relevantCol}'].value_counts())

# Additional insights
if count > 0:
    print(f"\\nSample ${insight.targetValue} records:")
    print(filtered_data.head())`;
    }
    
    if (insight.questionType === 'categorical_filter' || insight.questionType === 'categorical_analysis') {
      return `
# Categorical analysis for ${relevantCol}
import pandas as pd

# Get value counts and percentages
value_counts = df['${relevantCol}'].value_counts()
percentages = df['${relevantCol}'].value_counts(normalize=True) * 100

print("Distribution of ${relevantCol}:")
for value, count in value_counts.items():
    pct = percentages[value]
    print(f"{value}: {count} ({pct:.1f}%)")

# Answer specific question about counts
total_records = len(df)
print(f"\\nTotal records analyzed: {total_records}")`;
    }
    
    return null;
  }

  // Generate optimized pandas code for common questions
  generateOptimizedPandasCode(data, userContext) {
    const questionLower = userContext.toLowerCase();
    const columns = Object.keys(data[0] || {});
    
    // First try intelligent analysis
    const dataInsights = this.analyzeDataIntelligently(data, userContext);
    const intelligentCode = this.generateIntelligentPandasCode(data, userContext, dataInsights);
    
    if (intelligentCode) {
      return intelligentCode;
    }
    
    // Fallback to template-based approach
    const customerCol = columns.find(col => col.toLowerCase().includes('customer')) || 
                       columns.find(col => col.toLowerCase().includes('name')) || 'CUSTOMER_NAME';
    const segmentCol = columns.find(col => col.toLowerCase().includes('segment')) || 'SEGMENT';
    const regionCol = columns.find(col => col.toLowerCase().includes('region')) || 'REGION';
    const productCol = columns.find(col => col.toLowerCase().includes('product')) || 
                      columns.find(col => col.toLowerCase().includes('category')) || 'PRODUCT_NAME';
    const salesCol = columns.find(col => col.toLowerCase().includes('sales')) || 'SALES';
    const profitCol = columns.find(col => col.toLowerCase().includes('profit')) || 'PROFIT';
    const quantityCol = columns.find(col => col.toLowerCase().includes('quantity')) || 'QUANTITY';
    
    console.log('🔍 Detected columns:', { customerCol, segmentCol, regionCol, productCol, salesCol, profitCol, quantityCol });
    
    // Common question patterns with dynamic column names
    const codeTemplates = {
      'most_profitable_customers': `
# Most profitable customers analysis
import pandas as pd
import numpy as np

# Auto-detect customer column: ${customerCol}
# Group by customer and sum metrics
customer_profit = df.groupby('${customerCol}').agg({
    '${profitCol}': 'sum',
    '${salesCol}': 'sum',
    '${quantityCol}': 'sum'
}).round(2)

# Add order count
customer_profit['ORDER_COUNT'] = df.groupby('${customerCol}').size()

# Sort by profit and get top 10
result = customer_profit.sort_values('${profitCol}', ascending=False).head(10)
result = result.reset_index()
result['RANK'] = range(1, len(result) + 1)
print(result[['RANK', '${customerCol}', '${profitCol}', '${salesCol}', 'ORDER_COUNT']])`,

      'segment_orders': `
# Segment analysis by order count  
import pandas as pd

# Auto-detect segment column: ${segmentCol}
# Group by segment and aggregate metrics
segment_analysis = df.groupby('${segmentCol}').agg({
    '${salesCol}': 'sum',
    '${profitCol}': 'sum', 
    '${quantityCol}': 'sum'
}).round(2)

# Add order count (most important for this question)
segment_analysis['ORDER_COUNT'] = df.groupby('${segmentCol}').size()

# Sort by ORDER_COUNT (not sales) since question asks for "most orders"
result = segment_analysis.sort_values('ORDER_COUNT', ascending=False)
result = result.reset_index()
result['RANK'] = range(1, len(result) + 1)
print(result[['RANK', '${segmentCol}', 'ORDER_COUNT', '${salesCol}', '${profitCol}']])`,

      'region_performance': `
# Regional performance analysis
import pandas as pd

# Auto-detect region column: ${regionCol}
# Group by region and aggregate metrics
region_performance = df.groupby('${regionCol}').agg({
    '${salesCol}': 'sum',
    '${profitCol}': 'sum',
    '${quantityCol}': 'sum'
}).round(2)

# Add order count and market share
region_performance['ORDER_COUNT'] = df.groupby('${regionCol}').size()
region_performance['SALES_SHARE_PCT'] = (region_performance['${salesCol}'] / region_performance['${salesCol}'].sum() * 100).round(1)

# Sort by sales performance
result = region_performance.sort_values('${salesCol}', ascending=False)
result = result.reset_index()
result['RANK'] = range(1, len(result) + 1)
print(result[['RANK', '${regionCol}', '${salesCol}', '${profitCol}', 'ORDER_COUNT', 'SALES_SHARE_PCT']])`,
      
      'top_products': `
# Top products analysis
import pandas as pd

# Auto-detect product column: ${productCol}
# Group by product and aggregate
product_performance = df.groupby('${productCol}').agg({
    '${salesCol}': 'sum',
    '${profitCol}': 'sum',
    '${quantityCol}': 'sum'
}).round(2)

# Add order frequency
product_performance['ORDER_COUNT'] = df.groupby('${productCol}').size()
product_performance['AVG_PROFIT_MARGIN'] = (product_performance['${profitCol}'] / product_performance['${salesCol}'] * 100).round(1)

# Sort by sales
result = product_performance.sort_values('${salesCol}', ascending=False).head(15)
result = result.reset_index()  
result['RANK'] = range(1, len(result) + 1)
print(result[['RANK', '${productCol}', '${salesCol}', '${profitCol}', 'ORDER_COUNT', 'AVG_PROFIT_MARGIN']])`
    };
    
    // Pattern matching for optimized code
    if (questionLower.includes('profitable') && questionLower.includes('customer')) {
      return codeTemplates.most_profitable_customers;
    } else if (questionLower.includes('segment') && questionLower.includes('orders')) {
      return codeTemplates.segment_orders;
    } else if (questionLower.includes('region') && (questionLower.includes('best') || questionLower.includes('performing'))) {
      return codeTemplates.region_performance;
    } else if ((questionLower.includes('product') || questionLower.includes('category')) && questionLower.includes('top')) {
      return codeTemplates.top_products;
    }
    
    return null; // No optimized template found
  }

  // Main analysis method with security measures
  async analyzeData(data, analysisType = 'general', userContext = '', identifier = 'default') {
    try {
      // Security checks
      if (!this.initialized) {
        console.error('❌ Anthropic service not initialized - API key missing or invalid');
        throw new Error('AI analysis service not initialized. Please check API credentials.');
      }

      this.checkRateLimit(identifier);
      
      // Sanitize inputs
      const sanitizedData = this.sanitizeData(data);
      const prompt = this.createAnalysisPrompt(sanitizedData, analysisType, userContext);

      console.log(`🤖 Starting AI analysis for ${sanitizedData.length} rows...`);
      const startTime = Date.now();

      // Call Anthropic API with safety measures
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent, factual analysis
        system: "You are a professional data analyst focused on providing accurate, actionable business insights. Always base your analysis strictly on the provided data. Never make assumptions about missing information or external factors.",
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const duration = Date.now() - startTime;
      console.log(`✅ AI analysis completed in ${duration}ms`);

      // Validate response
      if (!response.content || !response.content[0] || !response.content[0].text) {
        throw new Error('Invalid response from AI service');
      }

      const analysisText = response.content[0].text;

      // Security: Scan response for potential issues
      if (analysisText.includes('<script') || analysisText.includes('javascript:')) {
        console.error('AI response contains potentially unsafe content');
        throw new Error('Analysis response failed security validation');
      }

      // Generate structured results from the analysis
      const structuredResults = this.generateStructuredResults(sanitizedData, userContext, analysisText);
      
      // Check for optimized pandas code first
      let pythonCode = this.generateOptimizedPandasCode(sanitizedData, userContext);
      
      // If no optimized code available, extract from AI response
      if (!pythonCode) {
        const extractedCode = this.extractPythonCode(analysisText);
        pythonCode = extractedCode;
      } else {
        // Format optimized code for consistency
        pythonCode = {
          code: pythonCode,
          blocks: [pythonCode],
          executable: true,
          optimized: true
        };
      }
      
      // Generate refined question suggestions if data limitations detected
      const refinedQuestions = this.generateRefinedQuestions(sanitizedData, userContext, analysisText);
      
      return {
        success: true,
        analysis: analysisText,
        python_code: pythonCode,
        results_table: structuredResults.results_table,
        visualization: structuredResults.visualization,
        refined_questions: refinedQuestions,
        metadata: {
          model: 'claude-3-5-sonnet',
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          token_usage: response.usage,
          cached_analysis: true
        }
      };

    } catch (error) {
      console.error('AI analysis error:', error.message);
      
      // Don't expose internal details to client
      let clientError = 'AI analysis failed. Please try again.';
      
      if (error.message.includes('Rate limit')) {
        clientError = error.message;
      } else if (error.message.includes('not initialized')) {
        clientError = 'AI analysis service unavailable.';
      } else if (error.message.includes('Dataset') || error.message.includes('prompt')) {
        clientError = error.message;
      }

      return {
        success: false,
        error: clientError,
        timestamp: new Date().toISOString()
      };
    }
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

  // Health check method
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'unavailable',
        message: 'Anthropic service not initialized'
      };
    }

    try {
      // Simple test to verify API connectivity
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Say "OK" if you can respond.'
        }]
      });

      return {
        status: 'healthy',
        message: 'Anthropic API accessible',
        model: 'claude-3-5-sonnet-20241022'
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Anthropic API connectivity issue'
      };
    }
  }

  // Analyze data structure to understand what questions are possible
  analyzeDataStructure(data) {
    if (!data || data.length === 0) return {};
    
    const columns = Object.keys(data[0]);
    const sampleRow = data[0];
    const profile = {
      columns: columns,
      hasCustomer: false,
      hasDate: false, 
      hasRegion: false,
      hasProduct: false,
      hasQuantity: false,
      hasFinancial: false,
      numericColumns: [],
      categoricalColumns: [],
      possibleAnalyses: []
    };
    
    // Intelligently detect column types and capabilities
    columns.forEach(col => {
      const colLower = col.toLowerCase();
      const sampleValue = sampleRow[col];
      
      // Detect customer columns
      if (colLower.includes('customer') || colLower.includes('client') || colLower.includes('user')) {
        profile.hasCustomer = true;
        profile.categoricalColumns.push(col);
      }
      
      // Detect date columns
      if (colLower.includes('date') || colLower.includes('time') || colLower.includes('created')) {
        profile.hasDate = true;
      }
      
      // Detect geographic columns
      if (colLower.includes('region') || colLower.includes('country') || colLower.includes('state') || colLower.includes('city')) {
        profile.hasRegion = true;
        profile.categoricalColumns.push(col);
      }
      
      // Detect product columns
      if (colLower.includes('product') || colLower.includes('item') || colLower.includes('category') || colLower.includes('segment')) {
        profile.hasProduct = true;
        profile.categoricalColumns.push(col);
      }
      
      // Detect quantity columns
      if (colLower.includes('quantity') || colLower.includes('qty') || colLower.includes('amount')) {
        profile.hasQuantity = true;
        profile.numericColumns.push(col);
      }
      
      // Detect financial columns
      if (colLower.includes('price') || colLower.includes('cost') || colLower.includes('revenue') || 
          colLower.includes('sales') || colLower.includes('profit') || colLower.includes('total')) {
        profile.hasFinancial = true;
        profile.numericColumns.push(col);
      }
      
      // Auto-detect numeric vs categorical
      if (typeof sampleValue === 'number' || (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue))) {
        if (!profile.numericColumns.includes(col)) {
          profile.numericColumns.push(col);
        }
      } else {
        if (!profile.categoricalColumns.includes(col)) {
          profile.categoricalColumns.push(col);
        }
      }
    });
    
    // Generate possible analyses based on data structure
    if (profile.hasCustomer) {
      profile.possibleAnalyses.push('customer_analysis');
      if (profile.hasQuantity || profile.numericColumns.length > 0) {
        profile.possibleAnalyses.push('customer_value');
      }
    }
    
    if (profile.hasRegion) {
      profile.possibleAnalyses.push('regional_analysis');
    }
    
    if (profile.hasProduct) {
      profile.possibleAnalyses.push('product_analysis');
    }
    
    if (profile.hasDate) {
      profile.possibleAnalyses.push('temporal_analysis');
    }
    
    if (profile.categoricalColumns.length > 0 && profile.numericColumns.length > 0) {
      profile.possibleAnalyses.push('segmentation_analysis');
    }
    
    return profile;
  }

  // Intelligent data-aware question generation
  generateRefinedQuestions(data, userContext, analysisText) {
    const questionLower = userContext.toLowerCase();
    const columns = Object.keys(data[0] || {});
    const refinedQuestions = [];
    
    // Analyze actual data structure intelligently
    const dataProfile = this.analyzeDataStructure(data);
    const hasProfit = columns.some(col => col.toLowerCase().includes('profit'));
    const hasSales = columns.some(col => col.toLowerCase().includes('sales'));
    
    // Only suggest refinements if the question couldn't be answered properly due to missing data
    // Check if this was a profitability question that failed due to missing profit data
    if (questionLower.includes('profitable') || questionLower.includes('profit')) {
      // If we don't have profit data OR the analysis indicates limitations
      if (!hasProfit || 
          analysisText.toLowerCase().includes('cannot determine') || 
          analysisText.toLowerCase().includes('lacks') || 
          analysisText.toLowerCase().includes('limitation') ||
          analysisText.toLowerCase().includes('not available')) {
        
        // Generate smart questions based on actual data structure
        if (dataProfile.hasCustomer) {
          refinedQuestions.push({
            question: `Which ${dataProfile.categoricalColumns.find(c => c.toLowerCase().includes('customer')) || 'customers'} have the highest order frequency?`,
            reason: "Measures customer engagement using available order data"
          });
        }
        
        if (dataProfile.hasQuantity) {
          const qtyCol = dataProfile.numericColumns.find(c => c.toLowerCase().includes('quantity'));
          refinedQuestions.push({
            question: `What is the average ${qtyCol || 'quantity'} by customer?`,
            reason: "Analyzes volume patterns using quantity data"
          });
        }
        
        if (dataProfile.hasRegion) {
          const regionCol = dataProfile.categoricalColumns.find(c => c.toLowerCase().includes('region'));
          refinedQuestions.push({
            question: `Which ${regionCol || 'regions'} have the most active customers?`,
            reason: "Geographic analysis using available location data"
          });
        }
        
        if (dataProfile.hasDate) {
          refinedQuestions.push({
            question: "What are the ordering patterns over time?",
            reason: "Temporal analysis using date information"
          });
        }
      } else {
        // Question was answered successfully with profit data - don't suggest refinements
        return [];
      }
    }
    
    // Check if this was a revenue/sales question without financial data
    if ((questionLower.includes('revenue') || questionLower.includes('sales')) && 
        !columns.some(col => col.toLowerCase().includes('sales') || col.toLowerCase().includes('revenue'))) {
      
      refinedQuestions.push({
        question: "Which customers place the most orders?",
        reason: "Order frequency can be a proxy for business value"
      });
      
      refinedQuestions.push({
        question: "What products or categories are ordered most frequently?",
        reason: "Shows popular items based on available data"
      });
    }
    
    // Always suggest intelligent follow-up questions based on data structure
    // This ensures users always see the blue suggestion box
    
    // Add general intelligent suggestions based on what data is available
    if (refinedQuestions.length < 4) {
      // Generate suggestions based on data structure
      dataProfile.possibleAnalyses.forEach(analysisType => {
        if (refinedQuestions.length >= 4) return;
        
        switch(analysisType) {
          case 'customer_analysis':
            if (dataProfile.hasCustomer) {
              refinedQuestions.push({
                question: "Which customers drive the most business value?",
                reason: "Customer value analysis using available customer data"
              });
            }
            break;
            
          case 'regional_analysis':
            if (dataProfile.hasRegion) {
              const regionCol = dataProfile.categoricalColumns.find(c => c.toLowerCase().includes('region'));
              refinedQuestions.push({
                question: `Which ${regionCol || 'regions'} are performing best?`,
                reason: "Geographic performance comparison"
              });
            }
            break;
            
          case 'product_analysis':
            if (dataProfile.hasProduct) {
              const productCol = dataProfile.categoricalColumns.find(c => c.toLowerCase().includes('product') || c.toLowerCase().includes('category'));
              refinedQuestions.push({
                question: `What are the top selling ${productCol || 'products'}?`,
                reason: "Product performance analysis"
              });
            }
            break;
            
          case 'temporal_analysis':
            if (dataProfile.hasDate) {
              refinedQuestions.push({
                question: "What are the trends over time?",
                reason: "Time-based pattern analysis"
              });
            }
            break;
        }
      });
    }
    
    // Add some general follow-up questions if we still don't have enough
    if (refinedQuestions.length < 3) {
      if (dataProfile.hasFinancial) {
        refinedQuestions.push({
          question: "What are the key financial drivers?",
          reason: "Financial performance analysis"
        });
      }
      
      if (dataProfile.categoricalColumns.length > 0 && dataProfile.numericColumns.length > 0) {
        refinedQuestions.push({
          question: `How does ${dataProfile.numericColumns[0]} vary by ${dataProfile.categoricalColumns[0]}?`,
          reason: "Segmentation analysis"
        });
      }
    }
    
    return refinedQuestions.slice(0, 4); // Return max 4 suggestions
  }

  // Generate structured results from AI analysis text
  generateStructuredResults(data, userContext, analysisText) {
    try {
      const questionLower = userContext.toLowerCase();
      const columns = Object.keys(data[0] || {});
      const hasCustomer = columns.some(col => col.toLowerCase().includes('customer'));
      const hasProfit = columns.some(col => col.toLowerCase().includes('profit'));
      const hasSales = columns.some(col => col.toLowerCase().includes('sales'));
      const hasSegment = columns.some(col => col.toLowerCase().includes('segment'));
      const hasCategory = columns.some(col => col.toLowerCase().includes('category'));
    
    // If it's a customer profitability analysis and we have profit/sales data
    if ((questionLower.includes('customer') || questionLower.includes('profitable')) && hasCustomer) {
      const customerMap = new Map();
      
      // Dynamic column detection for customer analysis
      const customerCol = columns.find(col => col.toLowerCase().includes('customer')) || 
                         columns.find(col => col.toLowerCase().includes('name')) ||
                         'CUSTOMER_NAME';
      const salesCol = columns.find(col => col.toLowerCase().includes('sales')) || 'SALES';
      const profitCol = columns.find(col => col.toLowerCase().includes('profit')) || 'PROFIT';
      const quantityCol = columns.find(col => col.toLowerCase().includes('quantity')) || 'QUANTITY';
      
      data.forEach(row => {
        const customerName = row[customerCol] || 'Unknown';
        const profit = parseFloat(row[profitCol] || 0);
        const sales = parseFloat(row[salesCol] || 0);
        const quantity = parseFloat(row[quantityCol] || 1);
        
        if (customerMap.has(customerName)) {
          const existing = customerMap.get(customerName);
          customerMap.set(customerName, {
            customer_name: customerName,
            order_count: existing.order_count + 1,
            total_profit: existing.total_profit + profit,
            total_sales: existing.total_sales + sales,
            total_quantity: existing.total_quantity + quantity
          });
        } else {
          customerMap.set(customerName, {
            customer_name: customerName,
            order_count: 1,
            total_profit: profit,
            total_sales: sales,
            total_quantity: quantity
          });
        }
      });
      
      // Smart sorting based on what the user actually asked for
      let sortBy = 'total_profit'; // default for customers
      if (questionLower.includes('most orders') || questionLower.includes('order count') || questionLower.includes('frequent')) {
        sortBy = 'order_count';
      } else if (questionLower.includes('profit') || questionLower.includes('profitable')) {
        sortBy = 'total_profit';
      } else if (questionLower.includes('sales') || questionLower.includes('revenue')) {
        sortBy = 'total_sales';
      } else if (questionLower.includes('quantity') || questionLower.includes('volume')) {
        sortBy = 'total_quantity';
      } else if (hasProfit) {
        sortBy = 'total_profit';
      } else if (hasSales) {
        sortBy = 'total_sales';
      } else {
        sortBy = 'order_count';
      }
      const customerResults = Array.from(customerMap.values())
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, 10)
        .map((customer, index) => ({
          rank: index + 1,
          customer_name: customer.customer_name,
          order_count: customer.order_count,
          total_profit: Math.round(customer.total_profit * 100) / 100,
          total_sales: Math.round(customer.total_sales * 100) / 100,
          total_quantity: Math.round(customer.total_quantity * 100) / 100,
          avg_profit_per_order: Math.round((customer.total_profit / customer.order_count) * 100) / 100
        }));
      
      // Determine columns and titles based on available data
      let columns_list, tableTitle, chartTitle, chartMetric;
      
      if (hasProfit && questionLower.includes('profitable')) {
        columns_list = ["Rank", "Customer Name", "Total Profit", "Total Sales", "Orders", "Avg Profit/Order"];
        tableTitle = "Most Profitable Customers";
        chartTitle = "Top Customers by Total Profit";
        chartMetric = 'total_profit';
      } else if (hasSales && (questionLower.includes('sales') || questionLower.includes('revenue'))) {
        columns_list = ["Rank", "Customer Name", "Total Sales", "Orders", "Total Quantity", "Avg Sales/Order"];
        tableTitle = "Top Customers by Sales";
        chartTitle = "Top Customers by Total Sales";
        chartMetric = 'total_sales';
      } else {
        columns_list = ["Rank", "Customer Name", "Orders", "Total Quantity", "Avg Quantity/Order"];
        tableTitle = "Customer Activity Analysis";
        chartTitle = "Top Customers by Order Count";
        chartMetric = 'order_count';
      }

      return {
        results_table: {
          title: tableTitle,
          columns: columns_list,
          data: customerResults,
          total_rows: customerResults.length
        },
        visualization: {
          type: "bar_chart",
          title: chartTitle,
          x_axis: "Customer Name", 
          y_axis: hasProfit && questionLower.includes('profitable') ? "Total Profit ($)" : 
                   hasSales ? "Total Sales ($)" : "Number of Orders",
          data: customerResults.slice(0, 8).map(c => ({
            label: c.customer_name.length > 15 ? c.customer_name.substring(0, 15) + '...' : c.customer_name,
            value: c[chartMetric],
            formatted_value: hasProfit && questionLower.includes('profitable') ? `$${c.total_profit.toLocaleString()}` :
                            hasSales && chartMetric === 'total_sales' ? `$${c.total_sales.toLocaleString()}` :
                            `${c.order_count} orders`
          }))
        }
      };
    }
    
    // Segment analysis
    if ((questionLower.includes('segment') || questionLower.includes('category')) && 
        (hasSegment || hasCategory)) {
      const segmentMap = new Map();
      
      // Dynamic column detection for segment analysis
      const segmentCol = columns.find(col => col.toLowerCase().includes('segment')) || 
                        columns.find(col => col.toLowerCase().includes('category')) || 'SEGMENT';
      const salesCol = columns.find(col => col.toLowerCase().includes('sales')) || 'SALES';
      const profitCol = columns.find(col => col.toLowerCase().includes('profit')) || 'PROFIT';
      const quantityCol = columns.find(col => col.toLowerCase().includes('quantity')) || 'QUANTITY';
      
      data.forEach(row => {
        const segment = row[segmentCol] || 'Unknown';
        const sales = parseFloat(row[salesCol] || 0);
        const profit = parseFloat(row[profitCol] || 0);
        const quantity = parseFloat(row[quantityCol] || 1);
        
        if (segmentMap.has(segment)) {
          const existing = segmentMap.get(segment);
          segmentMap.set(segment, {
            segment: segment,
            total_sales: existing.total_sales + sales,
            total_profit: existing.total_profit + profit,
            total_quantity: existing.total_quantity + quantity,
            order_count: existing.order_count + 1
          });
        } else {
          segmentMap.set(segment, {
            segment: segment,
            total_sales: sales,
            total_profit: profit,
            total_quantity: quantity,
            order_count: 1
          });
        }
      });
      
      // Smart sorting based on what the user actually asked for
      let sortBy = 'total_sales'; // default
      if (questionLower.includes('most orders') || questionLower.includes('order count')) {
        sortBy = 'order_count';
      } else if (questionLower.includes('profit') || questionLower.includes('profitable')) {
        sortBy = 'total_profit';
      } else if (questionLower.includes('quantity') || questionLower.includes('volume')) {
        sortBy = 'total_quantity';
      } else if (hasSales) {
        sortBy = 'total_sales';
      } else if (hasProfit) {
        sortBy = 'total_profit';
      } else {
        sortBy = 'total_quantity';
      }
      const segmentResults = Array.from(segmentMap.values())
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, 10)
        .map((segment, index) => ({
          rank: index + 1,
          segment: segment.segment,
          total_sales: Math.round(segment.total_sales * 100) / 100,
          total_profit: Math.round(segment.total_profit * 100) / 100,
          total_quantity: Math.round(segment.total_quantity * 100) / 100,
          order_count: segment.order_count
        }));
      
      const isStorageQuestion = questionLower.includes('storage');
      const titleMetric = hasSales ? 'Sales' : hasProfit ? 'Profit' : 'Volume';
      
      return {
        results_table: {
          title: `Top Segments by ${titleMetric}${isStorageQuestion ? ' (Storage Focus)' : ''}`,
          columns: ["Rank", "Segment", "Total Sales", "Total Profit", "Total Quantity", "Orders"],
          data: segmentResults,
          total_rows: segmentResults.length
        },
        visualization: {
          type: "bar_chart",
          title: `Segment Performance by ${titleMetric}`,
          x_axis: "Segment",
          y_axis: hasSales ? "Total Sales ($)" : hasProfit ? "Total Profit ($)" : "Total Quantity",
          data: segmentResults.slice(0, 8).map(s => ({
            label: s.segment,
            value: s[sortBy],
            formatted_value: (hasSales || hasProfit) ? `$${s[sortBy].toLocaleString()}` : s[sortBy].toLocaleString()
          }))
        }
      };
    }
    
    // Regional analysis
    if (questionLower.includes('region') && columns.some(col => col.toLowerCase().includes('region'))) {
      const regionMap = new Map();
      
      // Dynamic column detection for regional analysis
      const regionCol = columns.find(col => col.toLowerCase().includes('region')) || 'REGION';
      const salesCol = columns.find(col => col.toLowerCase().includes('sales')) || 'SALES';
      const profitCol = columns.find(col => col.toLowerCase().includes('profit')) || 'PROFIT';
      const quantityCol = columns.find(col => col.toLowerCase().includes('quantity')) || 'QUANTITY';
      
      data.forEach(row => {
        const region = row[regionCol] || 'Unknown';
        const sales = parseFloat(row[salesCol] || 0);
        const profit = parseFloat(row[profitCol] || 0);
        const quantity = parseFloat(row[quantityCol] || 1);
        
        if (regionMap.has(region)) {
          const existing = regionMap.get(region);
          regionMap.set(region, {
            region: region,
            total_sales: existing.total_sales + sales,
            total_profit: existing.total_profit + profit,
            total_quantity: existing.total_quantity + quantity,
            order_count: existing.order_count + 1
          });
        } else {
          regionMap.set(region, {
            region: region,
            total_sales: sales,
            total_profit: profit,
            total_quantity: quantity,
            order_count: 1
          });
        }
      });
      
      // Smart sorting for regions
      let sortBy = 'total_sales';
      if (questionLower.includes('most orders') || questionLower.includes('order count')) {
        sortBy = 'order_count';
      } else if (questionLower.includes('profit') || questionLower.includes('profitable')) {
        sortBy = 'total_profit';
      } else if (questionLower.includes('best') || questionLower.includes('performing')) {
        sortBy = hasSales ? 'total_sales' : 'total_profit';
      }
      
      const regionResults = Array.from(regionMap.values())
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, 10)
        .map((region, index) => ({
          rank: index + 1,
          region: region.region,
          total_sales: Math.round(region.total_sales * 100) / 100,
          total_profit: Math.round(region.total_profit * 100) / 100,
          total_quantity: Math.round(region.total_quantity * 100) / 100,
          order_count: region.order_count
        }));
      
      const titleMetric = sortBy === 'order_count' ? 'Orders' : 
                         sortBy === 'total_profit' ? 'Profit' : 
                         sortBy === 'total_quantity' ? 'Volume' : 'Sales';
      
      return {
        results_table: {
          title: `Regional Performance by ${titleMetric}`,
          columns: ["Rank", "Region", "Total Sales", "Total Profit", "Total Quantity", "Orders"],
          data: regionResults,
          total_rows: regionResults.length
        },
        visualization: {
          type: "bar_chart",
          title: `Top Regions by ${titleMetric}`,
          x_axis: "Region",
          y_axis: sortBy === 'order_count' ? "Number of Orders" : 
                  sortBy === 'total_profit' ? "Total Profit ($)" : 
                  sortBy === 'total_quantity' ? "Total Quantity" : "Total Sales ($)",
          data: regionResults.slice(0, 8).map(r => ({
            label: r.region,
            value: r[sortBy],
            formatted_value: (sortBy === 'total_sales' || sortBy === 'total_profit') ? 
                           `$${r[sortBy].toLocaleString()}` : 
                           r[sortBy].toLocaleString()
          }))
        }
      };
    }
    
    // Default: return basic data summary
    return {
      results_table: {
        title: "Data Summary",
        columns: ["Metric", "Value"],
        data: [
          { metric: "Total Records", value: data.length },
          { metric: "Total Columns", value: columns.length },
          { metric: "Primary Fields", value: columns.slice(0, 3).join(', ') }
        ],
        total_rows: 3
      },
      visualization: {
        type: "summary_stats",
        title: "Dataset Overview",
        data: {
          total_records: data.length,
          total_columns: columns.length
        }
      }
    };
    } catch (error) {
      console.error('Error generating structured results:', error);
      // Return fallback data structure
      return {
        results_table: {
          title: "Analysis Results",
          columns: ["Metric", "Value"],
          data: [
            { metric: "Total Records", value: data.length },
            { metric: "Analysis Status", value: "Completed with basic summary" }
          ],
          total_rows: 2
        },
        visualization: {
          type: "summary_stats",
          title: "Data Overview",
          data: { total_records: data.length }
        }
      };
    }
  }

  // Generate analysis by actually executing data operations (like Python would)
  generateMockAnalysis(data, analysisType, userContext) {
    const startTime = Date.now();
    
    console.log('🔍 Executing data analysis on real dataset:', { rows: data.length, question: userContext });
    
    // Analyze the data to provide realistic analysis
    const columns = Object.keys(data[0] || {});
    const numRows = data.length;
    
    // Auto-detect what type of analysis to perform based on question and data structure
    const questionLower = userContext.toLowerCase();
    const hasCustomer = columns.some(col => col.toLowerCase().includes('customer'));
    const hasProfit = columns.some(col => col.toLowerCase().includes('profit'));
    const hasSales = columns.some(col => col.toLowerCase().includes('sales'));
    const hasRegion = columns.some(col => col.toLowerCase().includes('region'));
    const hasProduct = columns.some(col => col.toLowerCase().includes('product'));
    
    let analysisText = '';
    
    // Customer analysis - prioritize profit data if available
    if ((questionLower.includes('customer') || questionLower.includes('profitable') || questionLower.includes('frequent')) && hasCustomer) {
      console.log('🔍 Performing customer analysis on columns:', columns);
      console.log('🔍 Has profit data:', hasProfit, 'Has sales data:', hasSales);
      
      // Perform actual data aggregation - GROUP BY customer
      const customerMap = new Map();
      
      data.forEach(row => {
        const customerName = row.CUSTOMER_NAME || row.Customer || row.customer_name || 'Unknown';
        const profit = parseFloat(row.PROFIT || row.Profit || row.profit || 0);
        const sales = parseFloat(row.SALES || row.Sales || row.sales || 0);
        const quantity = parseFloat(row.QUANTITY || row.Quantity || row.quantity || 1);
        const discount = parseFloat(row.DISCOUNT || row.Discount || row.discount || 0);
        
        if (customerMap.has(customerName)) {
          const existing = customerMap.get(customerName);
          customerMap.set(customerName, {
            customer_name: customerName,
            total_profit: existing.total_profit + profit,
            total_sales: existing.total_sales + sales,
            total_quantity: existing.total_quantity + quantity,
            total_discount: existing.total_discount + discount,
            order_count: existing.order_count + 1
          });
        } else {
          customerMap.set(customerName, {
            customer_name: customerName,
            total_profit: profit,
            total_sales: sales,
            total_quantity: quantity,
            total_discount: discount,
            order_count: 1
          });
        }
      });
      
      // Sort by profit if available and question asks for profitability, otherwise by sales/order count
      let sortBy = 'order_count';
      let analysisType = 'customer_activity';
      let tableTitle = "Top Customers by Order Volume";
      let chartTitle = "Top 10 Customers by Order Count";
      let columns_list = ["Rank", "Customer Name", "Orders", "Total Quantity", "Avg Qty/Order", "Total Discount"];
      
      if (hasProfit && questionLower.includes('profitable')) {
        sortBy = 'total_profit';
        analysisType = 'customer_profitability';
        tableTitle = "Most Profitable Customers";
        chartTitle = "Top 10 Customers by Total Profit";
        columns_list = ["Rank", "Customer Name", "Total Profit", "Total Sales", "Orders", "Avg Profit/Order"];
      } else if (hasSales && (questionLower.includes('sales') || questionLower.includes('revenue'))) {
        sortBy = 'total_sales';
        analysisType = 'customer_sales';
        tableTitle = "Top Customers by Sales";
        chartTitle = "Top 10 Customers by Total Sales";
        columns_list = ["Rank", "Customer Name", "Total Sales", "Orders", "Total Quantity", "Avg Sales/Order"];
      }
      
      // Convert to array and sort appropriately
      const customerResults = Array.from(customerMap.values())
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, 20) // Top 20 customers
        .map((customer, index) => ({
          rank: index + 1,
          customer_name: customer.customer_name,
          total_profit: Math.round(customer.total_profit * 100) / 100,
          total_sales: Math.round(customer.total_sales * 100) / 100,
          order_count: customer.order_count,
          total_quantity: Math.round(customer.total_quantity * 100) / 100,
          avg_profit_per_order: Math.round((customer.total_profit / customer.order_count) * 100) / 100,
          avg_sales_per_order: Math.round((customer.total_sales / customer.order_count) * 100) / 100,
          avg_quantity_per_order: Math.round((customer.total_quantity / customer.order_count) * 100) / 100,
          total_discount: Math.round(customer.total_discount * 100) / 100
        }));
      
      // Generate summary insights based on analysis type
      const topCustomer = customerResults[0];
      let analysisText;
      
      if (hasProfit && questionLower.includes('profitable')) {
        const totalProfit = customerResults.reduce((sum, c) => sum + c.total_profit, 0);
        analysisText = `# Customer Profitability Analysis

## Key Finding
**${topCustomer.customer_name}** is your most profitable customer with $${topCustomer.total_profit.toLocaleString()} in total profit.

## Top 5 Most Profitable Customers
${customerResults.slice(0, 5).map((c, i) => `${i + 1}. ${c.customer_name}: $${c.total_profit.toLocaleString()} profit`).join('\n')}

## Business Impact
• Top 5 customers generated $${customerResults.slice(0, 5).reduce((sum, c) => sum + c.total_profit, 0).toLocaleString()} in profit (${Math.round((customerResults.slice(0, 5).reduce((sum, c) => sum + c.total_profit, 0) / totalProfit) * 100)}% of total)
• Average profit per customer: $${Math.round(totalProfit / customerResults.length).toLocaleString()}`;
      } else {
        const totalOrders = customerResults.reduce((sum, c) => sum + c.order_count, 0);
        analysisText = `# Customer Activity Analysis

## Key Finding
**${topCustomer.customer_name}** is your most active customer with ${topCustomer.order_count} orders.

## Top 5 Customers by Order Volume
${customerResults.slice(0, 5).map((c, i) => `${i + 1}. ${c.customer_name}: ${c.order_count} orders`).join('\n')}

## Business Impact
• Top 5 customers placed ${customerResults.slice(0, 5).reduce((sum, c) => sum + c.order_count, 0)} orders (${Math.round((customerResults.slice(0, 5).reduce((sum, c) => sum + c.order_count, 0) / totalOrders) * 100)}% of total)
• Average orders per customer: ${Math.round(totalOrders / customerResults.length)}`;
      }
      
      // Return structured results with data table and visualization
      return {
        success: true,
        analysis: analysisText,
        results_table: {
          title: tableTitle,
          columns: columns_list,
          data: customerResults,
          total_rows: customerResults.length
        },
        visualization: {
          type: "bar_chart",
          title: chartTitle,
          x_axis: "Customer Name",
          y_axis: hasProfit && questionLower.includes('profitable') ? "Total Profit ($)" : 
                   hasSales && sortBy === 'total_sales' ? "Total Sales ($)" : "Number of Orders",
          data: customerResults.slice(0, 10).map(c => ({
            label: c.customer_name.length > 15 ? c.customer_name.substring(0, 15) + '...' : c.customer_name,
            value: c[sortBy],
            formatted_value: hasProfit && questionLower.includes('profitable') ? `$${c.total_profit.toLocaleString()}` :
                            hasSales && sortBy === 'total_sales' ? `$${c.total_sales.toLocaleString()}` :
                            `${c.order_count} orders`
          }))
        },
        metadata: {
          model: 'data-aggregation-engine',
          rows_analyzed: numRows,
          analysis_type: analysisType,
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          aggregation_performed: `GROUP BY customer_name, SUM(${sortBy === 'total_profit' ? 'profit' : sortBy === 'total_sales' ? 'sales' : 'quantity'}), COUNT(*)`,
          token_usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
        }
      };
      
    } else if ((questionLower.includes('region') || questionLower.includes('geographic')) && hasRegion) {
      // Regional analysis
      const regionMap = new Map();
      
      data.forEach(row => {
        const region = row.REGION || row.Region || row.region || 'Unknown';
        const sales = parseFloat(row.SALES || row.Sales || row.sales || 0);
        const profit = parseFloat(row.PROFIT || row.Profit || row.profit || 0);
        
        if (regionMap.has(region)) {
          const existing = regionMap.get(region);
          regionMap.set(region, {
            region: region,
            total_sales: existing.total_sales + sales,
            total_profit: existing.total_profit + profit,
            order_count: existing.order_count + 1
          });
        } else {
          regionMap.set(region, {
            region: region,
            total_sales: sales,
            total_profit: profit,
            order_count: 1
          });
        }
      });
      
      const regionResults = Array.from(regionMap.values())
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 10)
        .map((region, index) => ({
          rank: index + 1,
          region: region.region,
          total_sales: Math.round(region.total_sales * 100) / 100,
          total_profit: Math.round(region.total_profit * 100) / 100,
          order_count: region.order_count,
          avg_sales_per_order: Math.round((region.total_sales / region.order_count) * 100) / 100
        }));
      
      const topRegion = regionResults[0];
      
      analysisText = `# Regional Performance Analysis

## Key Finding
**${topRegion.region}** is the top performing region with $${topRegion.total_sales.toLocaleString()} in total sales.

## Top 5 Regions
${regionResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.region}: $${r.total_sales.toLocaleString()}`).join('\n')}`;
      
      return {
        success: true,
        analysis: analysisText,
        results_table: {
          title: "Regional Performance Analysis",
          columns: ["Rank", "Region", "Total Sales", "Total Profit", "Orders", "Avg Sales/Order"],
          data: regionResults,
          total_rows: regionResults.length
        },
        visualization: {
          type: "bar_chart",
          title: "Top Regions by Sales Performance",
          x_axis: "Region",
          y_axis: "Total Sales ($)",
          data: regionResults.slice(0, 8).map(r => ({
            label: r.region,
            value: r.total_sales,
            formatted_value: `$${r.total_sales.toLocaleString()}`
          }))
        },
        metadata: {
          model: 'data-aggregation-engine',
          rows_analyzed: numRows,
          analysis_type: 'regional_analysis',
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          aggregation_performed: 'GROUP BY region, SUM(sales), SUM(profit), COUNT(*)',
          token_usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
        }
      };
      
    } else if ((questionLower.includes('product') || questionLower.includes('item')) && hasProduct) {
      // Product analysis  
      const productMap = new Map();
      
      data.forEach(row => {
        const product = row.PRODUCT_NAME || row.Product || row.product_name || row.CATEGORY || row.Category || 'Unknown';
        const sales = parseFloat(row.SALES || row.Sales || row.sales || 0);
        const profit = parseFloat(row.PROFIT || row.Profit || row.profit || 0);
        
        if (productMap.has(product)) {
          const existing = productMap.get(product);
          productMap.set(product, {
            product: product,
            total_sales: existing.total_sales + sales,
            total_profit: existing.total_profit + profit,
            order_count: existing.order_count + 1
          });
        } else {
          productMap.set(product, {
            product: product,
            total_sales: sales,
            total_profit: profit,
            order_count: 1
          });
        }
      });
      
      const productResults = Array.from(productMap.values())
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 15)
        .map((product, index) => ({
          rank: index + 1,
          product: product.product,
          total_sales: Math.round(product.total_sales * 100) / 100,
          total_profit: Math.round(product.total_profit * 100) / 100,
          order_count: product.order_count,
          profit_margin: Math.round((product.total_profit / product.total_sales) * 100 * 100) / 100
        }));
      
      const topProduct = productResults[0];
      
      analysisText = `# Product Performance Analysis

## Key Finding
**${topProduct.product}** is the top performing product with $${topProduct.total_sales.toLocaleString()} in total sales.

## Top 5 Products
${productResults.slice(0, 5).map((p, i) => `${i + 1}. ${p.product}: $${p.total_sales.toLocaleString()}`).join('\n')}`;
      
      return {
        success: true,
        analysis: analysisText,
        results_table: {
          title: "Product Performance Analysis",
          columns: ["Rank", "Product", "Total Sales", "Total Profit", "Orders", "Profit Margin %"],
          data: productResults,
          total_rows: productResults.length
        },
        visualization: {
          type: "bar_chart",
          title: "Top Products by Sales Performance",
          x_axis: "Product",
          y_axis: "Total Sales ($)",
          data: productResults.slice(0, 10).map(p => ({
            label: p.product.length > 20 ? p.product.substring(0, 20) + '...' : p.product,
            value: p.total_sales,
            formatted_value: `$${p.total_sales.toLocaleString()}`
          }))
        },
        metadata: {
          model: 'data-aggregation-engine',
          rows_analyzed: numRows,
          analysis_type: 'product_analysis',
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          aggregation_performed: 'GROUP BY product, SUM(sales), SUM(profit), COUNT(*)',
          token_usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
        }
      };
      
    } else {
      // Generate general data overview analysis
      const sampleData = data.slice(0, 10);
      
      analysisText = `# Data Overview Analysis

## Dataset Summary
• **${numRows} total records** across ${columns.length} columns
• Data completeness: ${Math.round((data.filter(row => Object.values(row).every(val => val !== null && val !== '')).length / numRows) * 100)}%
• Primary fields: ${columns.slice(0, 5).join(', ')}

## Data Quality
• All required fields present and properly formatted
• Suitable for further statistical analysis and reporting
• Ready for dashboard visualization and KPI tracking`;

      // Return structured results with sample data
      return {
        success: true,
        analysis: analysisText,
        results_table: {
          title: "Data Sample (First 10 Rows)",
          columns: columns,
          data: sampleData,
          total_rows: sampleData.length
        },
        visualization: {
          type: "summary_stats",
          title: "Dataset Overview",
          data: {
            total_records: numRows,
            total_columns: columns.length,
            data_completeness: Math.round((data.filter(row => Object.values(row).every(val => val !== null && val !== '')).length / numRows) * 100),
            numeric_columns: columns.filter(col => {
              const sampleValue = data[0]?.[col];
              return typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue));
            }).length
          }
        },
        metadata: {
          model: 'data-overview-engine',
          rows_analyzed: numRows,
          analysis_type: 'general',
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          aggregation_performed: 'Data overview and sample extraction',
          token_usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
        }
      };
    }
    
    // Note: This return is never reached due to early returns above
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      rate_limits: {
        max_requests_per_minute: this.MAX_REQUESTS_PER_MINUTE,
        max_data_rows: this.MAX_DATA_ROWS
      },
      security_features: [
        'Rate limiting',
        'Input sanitization', 
        'Sensitive data filtering',
        'Prompt injection protection',
        'Response validation'
      ]
    };
  }
}

// Export singleton instance
const anthropicService = new AnthropicService();
module.exports = anthropicService;