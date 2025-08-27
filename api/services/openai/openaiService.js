const OpenAI = require('openai');
const CodeExecutor = require('../anthropic/codeExecutor');
const ResultFormatter = require('../anthropic/resultFormatter');
const ColumnMappingService = require('../semanticLayer/columnMappingService');

/**
 * OpenAI GPT-4.1 Service - Main orchestrator for AI analysis using OpenAI GPT-4.1
 * Direct replacement for Anthropic service with enhanced capabilities
 */
class OpenAIService {
  constructor() {
    // Initialize OpenAI client only if API key is available
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = null;
    this.initialized = false;
    
    if (this.apiKey) {
      try {
        this.client = new OpenAI({
          apiKey: this.apiKey,
        });
        this.initialized = true;
        console.log('✅ OpenAI GPT-4.1 service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error.message);
      }
    } else {
      console.warn('⚠️ OpenAI API key not provided - OpenAI backend will be unavailable');
    }
    this.codeExecutor = new CodeExecutor();
    this.resultFormatter = new ResultFormatter();
    this.columnMapper = new ColumnMappingService();
    
    // Rate limiting configuration
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
  }

  // Main analysis method - orchestrates the entire workflow
  async analyzeData(data, analysisType, userContext, identifier = 'default') {
    const startTime = Date.now();
    
    try {
      // Check if OpenAI client is initialized
      if (!this.initialized || !this.client) {
        throw new Error('OpenAI service not initialized. Please set OPENAI_API_KEY environment variable.');
      }

      // Security and validation checks
      this.checkRateLimit(identifier);
      const sanitizedData = this.sanitizeData(data);
      const sanitizedContext = this.sanitizeUserContext(userContext);

      console.log(`🤖 Starting OpenAI GPT-4.1 analysis for: "${sanitizedContext}"`);
      console.log(`📊 Dataset: ${sanitizedData.length} rows, ${Object.keys(sanitizedData[0] || {}).length} columns`);

      // Build analysis prompt optimized for GPT-4.1
      const messages = this.buildAnalysisMessages(sanitizedData, analysisType, sanitizedContext);
      
      // Send to OpenAI GPT-4.1 API with function calling
      const response = await this.makeRequest({
        model: "gpt-4.1-2025-04-14", // Latest GPT-4.1 model
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2, // Lower for more consistent analysis
        tools: this.getAnalysisTools(),
        tool_choice: "auto"
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Empty response from OpenAI GPT-4.1 API');
      }

      const message = response.choices[0].message;
      let analysisText = message.content || '';
      let executedResults = null;

      // Handle function calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log('🔧 Processing GPT-4.1 function calls...');
        const functionResults = await this.processFunctionCalls(message.tool_calls, sanitizedData, sanitizedContext);
        
        // Get final response with function results
        const finalMessages = [
          ...messages,
          message,
          ...functionResults.messages
        ];

        const finalResponse = await this.makeRequest({
          model: "gpt-4.1-2025-04-14",
          messages: finalMessages,
          max_tokens: 4000,
          temperature: 0.2
        });

        analysisText = finalResponse.choices[0].message.content;
        executedResults = functionResults.results;
      }

      console.log('📝 Received analysis from OpenAI GPT-4.1');

      // Extract Python code from response if no function calling was used
      if (!executedResults) {
        const pythonCode = this.resultFormatter.extractPythonCode(analysisText);
        
        if (pythonCode && pythonCode.executable) {
          console.log('🔬 Attempting to execute AI analysis on cached data...');
          try {
            executedResults = this.codeExecutor.executeAnalysisOnCachedData(
              sanitizedData, 
              sanitizedContext, 
              analysisText, 
              pythonCode
            );
            
            if (executedResults) {
              console.log('✅ Code execution successful');
            }
          } catch (codeExecutionError) {
            console.error('❌ Code execution failed:', codeExecutionError);
            executedResults = {
              success: false,
              error: `Code execution failed: ${codeExecutionError.message}`,
              type: 'error',
              data: [],
              fallback: true
            };
          }
        }
      }

      // Generate refined question suggestions
      const refinedQuestions = this.generateRefinedQuestions(sanitizedData, sanitizedContext, analysisText);
      
      const duration = Date.now() - startTime;

      // Generate results table with enhanced error handling
      let resultsTable;
      try {
        if (executedResults) {
          console.log('📋 Formatting executed results as table...');
          resultsTable = this.resultFormatter.formatResultsAsTable(executedResults, sanitizedContext);
        } else {
          console.log('📋 Generating basic analysis results fallback...');
          resultsTable = this.generateBasicAnalysisResults(sanitizedData, sanitizedContext);
        }
      } catch (tableError) {
        console.error('❌ Error generating results table:', tableError);
        resultsTable = {
          title: 'Analysis Results',
          headers: ['Error'],
          data: [{ Error: `Failed to generate results: ${tableError.message}` }],
          total_rows: 1,
          error: true
        };
      }
      
      // Generate visualization
      let visualization;
      try {
        if (executedResults) {
          console.log('📈 Creating visualization from executed results...');
          visualization = this.resultFormatter.createVisualizationFromResults(executedResults, sanitizedContext);
        } else {
          console.log('📈 Creating basic visualization fallback...');
          visualization = this.resultFormatter.createBasicVisualization(sanitizedData, "Data Overview");
        }
      } catch (vizError) {
        console.error('❌ Error generating visualization:', vizError);
        visualization = {
          type: 'error',
          title: 'Visualization Error',
          data: [],
          error: `Failed to create visualization: ${vizError.message}`
        };
      }

      return {
        success: true,
        analysis: analysisText,
        python_code: this.resultFormatter.extractPythonCode(analysisText),
        results_table: resultsTable,
        visualization: visualization,
        refined_questions: refinedQuestions,
        metadata: {
          model: 'gpt-4.1-2025-04-14',
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          token_usage: response.usage,
          cached_analysis: true,
          executed_real_analysis: !!executedResults,
          function_calls_used: !!(message.tool_calls && message.tool_calls.length > 0)
        }
      };

    } catch (error) {
      console.error('❌ OpenAI GPT-4.1 analysis error:', error.message);
      console.error('📍 Error stack:', error.stack);
      
      // Don't expose internal details to client
      let clientError = 'AI analysis failed. Please try again.';
      
      if (error.message.includes('Rate limit') || error.status === 429) {
        clientError = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('API key')) {
        clientError = 'OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.';
      } else if (error.message.includes('Model') && error.message.includes('not found')) {
        clientError = 'GPT-4.1 model not available. Please check your OpenAI subscription.';
      } else if (error.message.includes('timeout')) {
        clientError = 'Analysis timed out. Please try with a smaller dataset or simpler question.';
      }

      return {
        success: false,
        error: clientError,
        timestamp: new Date().toISOString(),
        debug_info: {
          error_type: error.name,
          processing_time: Date.now() - startTime,
          data_size: data?.length || 0
        }
      };
    }
  }

  // Build optimized messages for GPT-4.1
  buildAnalysisMessages(data, analysisType, userContext) {
    const dataStructure = this.analyzeDataStructure(data);
    const sampleData = data.slice(0, 5);
    
    // Check if this is a disambiguated query
    const isDisambiguated = userContext.includes('(specifically:');
    const disambiguationNote = isDisambiguated 
      ? '\n\n🎯 DISAMBIGUATION: This query has been clarified by the user. Follow their specific intent exactly.\n'
      : '';

    const systemPrompt = `You are an expert data analyst specializing in business intelligence and data insights. Your role is to analyze datasets and provide clear, actionable insights with detailed reasoning.

${disambiguationNote}
🚨 CRITICAL CONSTRAINTS:
- You can ONLY use these exact column names: ${dataStructure.columns.join(', ')}
- NEVER create calculated columns or derived metrics
- Use existing columns AS-IS without modifications
- Focus on patterns, trends, and business insights

DATASET CONTEXT:
- Total records: ${data.length}
- Available columns: ${dataStructure.columns.join(', ')}
- Numeric columns: ${dataStructure.numericColumns.join(', ') || 'None'}
- Categorical columns: ${dataStructure.categoricalColumns.join(', ') || 'None'}

RESPONSE FORMAT REQUIREMENT:
You must structure your response with the following sections:

## ANALYTICAL INTERPRETATION
[Explain your analytical reasoning process: What patterns did you identify? Why did you choose specific columns? What analytical approach did you take and why?]

## KEY INSIGHTS
[Present the main findings with business context and implications]

## METHODOLOGY EXPLANATION  
[Describe the analytical methods used, why they were appropriate, and how they led to conclusions]

## BUSINESS IMPLICATIONS
[Explain what these insights mean for business decisions and strategy]

## ANALYSIS RESULTS
[Present the actual data findings and statistics]

## PYTHON CODE
[Include Python code for reproducible analysis]

ANALYSIS APPROACH:
1. Understand the business question and identify the most relevant analytical approach
2. Explain your reasoning for column selection and analytical method choice
3. Provide detailed interpretation of patterns and relationships found
4. Connect findings to actionable business insights
5. Include technical implementation for reproducibility`;

    const userPrompt = `Please analyze this dataset and answer the user's question with detailed analytical reasoning.

SAMPLE DATA (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

USER QUESTION: "${userContext}"

REASONING FOCUS: Show your analytical thinking process. Explain:
- Why you chose specific analytical approaches
- How you identified relevant patterns and relationships  
- What business context influenced your interpretation
- How you arrived at your conclusions step-by-step

Follow the structured response format with all sections:
1. ANALYTICAL INTERPRETATION - Your reasoning process and pattern identification
2. KEY INSIGHTS - Main findings with business context
3. METHODOLOGY EXPLANATION - Why you chose specific analytical methods
4. BUSINESS IMPLICATIONS - Strategic meaning of findings
5. ANALYSIS RESULTS - Concrete data findings
6. PYTHON CODE - Technical implementation

Remember: Only use the exact column names provided. Focus on explaining HOW you think through the analysis, not just WHAT you found.`;

    return [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: userPrompt
      }
    ];
  }

  // Define function calling tools for GPT-4.1
  getAnalysisTools() {
    return [
      {
        type: "function",
        function: {
          name: "execute_data_analysis",
          description: "Execute data analysis code and return results",
          parameters: {
            type: "object",
            properties: {
              python_code: {
                type: "string",
                description: "Python pandas code to analyze the data"
              },
              analysis_type: {
                type: "string",
                enum: ["summary", "correlation", "trend", "distribution", "comparison"],
                description: "Type of analysis being performed"
              },
              expected_output: {
                type: "string",
                description: "Description of what the code should produce"
              }
            },
            required: ["python_code", "analysis_type"]
          }
        }
      }
    ];
  }

  // Process function calls from GPT-4.1
  async processFunctionCalls(toolCalls, data, userContext) {
    const messages = [];
    let results = null;

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'execute_data_analysis') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('🐍 Executing function call with Python code:', args.python_code);
          
          // Create mock python code object for executor
          const pythonCode = {
            code: args.python_code,
            executable: true,
            analysis_type: args.analysis_type
          };
          
          results = this.codeExecutor.executeAnalysisOnCachedData(
            data,
            userContext,
            `Analysis: ${args.analysis_type}`,
            pythonCode
          );
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: results?.success !== false,
              results: results?.data || [],
              analysis_type: args.analysis_type,
              row_count: results?.data?.length || 0
            })
          });
          
        } catch (error) {
          console.error('❌ Function call execution error:', error);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: error.message
            })
          });
        }
      }
    }

    return {
      messages,
      results
    };
  }

  // Rate limiting and request management
  async makeRequest(requestConfig) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestConfig, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const { requestConfig, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
          await this.delay(this.minRequestInterval - timeSinceLastRequest);
        }
        
        const response = await this.client.chat.completions.create(requestConfig);
        this.lastRequestTime = Date.now();
        resolve(response);
        
      } catch (error) {
        if (error.status === 429) {
          // Rate limit hit - exponential backoff
          const retryAfter = error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : 2000;
          await this.delay(retryAfter);
          this.requestQueue.unshift({ requestConfig, resolve, reject });
        } else {
          reject(error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Security and validation methods (reused from Anthropic service)
  checkRateLimit(identifier) {
    // Implement rate limiting logic
    return true;
  }

  sanitizeData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Dataset must be a non-empty array');
    }
    
    // Limit dataset size for performance
    if (data.length > 50000) {
      console.warn(`⚠️ Large dataset detected (${data.length} rows). Using first 50,000 rows.`);
      return data.slice(0, 50000);
    }
    
    return data;
  }

  sanitizeUserContext(userContext) {
    if (typeof userContext !== 'string' || userContext.trim().length === 0) {
      throw new Error('User context must be a non-empty string');
    }
    
    // Sanitize potentially dangerous content
    const sanitized = userContext
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .trim();
    
    if (sanitized.length > 2000) {
      return sanitized.substring(0, 2000) + '...';
    }
    
    return sanitized;
  }

  // Data structure analysis (reused from Anthropic service)
  analyzeDataStructure(data) {
    if (!data || data.length === 0) return { columns: [], numericColumns: [], categoricalColumns: [], dateColumns: [] };
    
    const columns = Object.keys(data[0]);
    const sampleRow = data[0];
    const profile = {
      columns: columns,
      numericColumns: [],
      categoricalColumns: [],
      dateColumns: [],
      textColumns: []
    };
    
    // Intelligently detect column types
    columns.forEach(col => {
      const colLower = col.toLowerCase();
      const sampleValue = sampleRow[col];
      
      // Detect date columns
      if (colLower.includes('date') || colLower.includes('time') || colLower.includes('created')) {
        profile.dateColumns.push(col);
      }
      // Detect numeric columns
      else if (typeof sampleValue === 'number' || (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue))) {
        profile.numericColumns.push(col);
      }
      // Check if categorical (reasonable number of unique values)
      else {
        const values = data.slice(0, 100).map(row => row[col]).filter(v => v != null);
        const uniqueValues = [...new Set(values)];
        if (uniqueValues.length <= Math.min(20, data.length * 0.5) && uniqueValues.length > 1) {
          profile.categoricalColumns.push(col);
        } else {
          profile.textColumns.push(col);
        }
      }
    });
    
    return profile;
  }

  // Generate refined questions (simplified version)
  generateRefinedQuestions(data, userContext, analysisText) {
    const dataProfile = this.analyzeDataStructure(data);
    const refinedQuestions = [];
    
    if (dataProfile.categoricalColumns.length > 0 && dataProfile.numericColumns.length > 0) {
      refinedQuestions.push({
        question: `Which ${dataProfile.categoricalColumns[0].toLowerCase()} has the highest ${dataProfile.numericColumns[0].toLowerCase()}?`,
        reason: "Analysis using available categorical and numeric data"
      });
    }
    
    if (dataProfile.dateColumns.length > 0) {
      refinedQuestions.push({
        question: "What are the trends over time?",
        reason: "Temporal analysis using available date information"
      });
    }
    
    return refinedQuestions.slice(0, 3);
  }

  // Basic analysis fallback (reused from Anthropic service)
  generateBasicAnalysisResults(data, userContext) {
    try {
      const questionLower = userContext.toLowerCase();
      
      // Try to provide some actual analysis based on the question
      if (questionLower.includes('category') && questionLower.includes('discount')) {
        const categoryColumn = this.findColumn(data, ['category', 'product_category', 'type']);
        const discountColumn = this.findColumn(data, ['discount', 'discount_rate', 'discount_amount']);
        
        if (categoryColumn && discountColumn) {
          const categoryDiscounts = {};
          data.forEach(row => {
            const category = row[categoryColumn];
            const discount = parseFloat(row[discountColumn]) || 0;
            if (!categoryDiscounts[category]) {
              categoryDiscounts[category] = { total: 0, count: 0 };
            }
            categoryDiscounts[category].total += discount;
            categoryDiscounts[category].count += 1;
          });
          
          const results = Object.entries(categoryDiscounts)
            .map(([category, data]) => ({
              category: category,
              avg_discount: (data.total / data.count).toFixed(3),
              total_discount: data.total.toFixed(3),
              order_count: data.count
            }))
            .sort((a, b) => parseFloat(b.avg_discount) - parseFloat(a.avg_discount))
            .slice(0, 10);
          
          return {
            title: "Discount Analysis by Category",
            headers: ["Category", "Avg Discount", "Total Discount", "Orders"],
            data: results.map(r => ({
              Category: r.category,
              "Avg Discount": r.avg_discount,
              "Total Discount": r.total_discount,
              "Orders": r.order_count
            })),
            total_rows: results.length
          };
        }
      }
      
      // Generic fallback
      const columns = Object.keys(data[0] || {});
      const categoricalCol = this.findColumn(data, ['category', 'region', 'segment', 'type', 'status']);
      const numericCol = this.findColumn(data, ['sales', 'revenue', 'profit', 'amount', 'value', 'count']);
      
      if (categoricalCol && numericCol) {
        const groups = {};
        data.forEach(row => {
          const group = row[categoricalCol];
          const value = parseFloat(row[numericCol]) || 0;
          if (!groups[group]) {
            groups[group] = { total: 0, count: 0 };
          }
          groups[group].total += value;
          groups[group].count += 1;
        });
        
        const results = Object.entries(groups)
          .map(([group, data]) => ({
            [categoricalCol]: group,
            [`Total ${numericCol}`]: data.total.toFixed(2),
            [`Avg ${numericCol}`]: (data.total / data.count).toFixed(2),
            Count: data.count
          }))
          .sort((a, b) => parseFloat(b[`Total ${numericCol}`]) - parseFloat(a[`Total ${numericCol}`]))
          .slice(0, 10);
        
        return {
          title: `Analysis: ${numericCol} by ${categoricalCol}`,
          headers: Object.keys(results[0] || {}),
          data: results,
          total_rows: results.length
        };
      }
      
      return this.resultFormatter.createSummaryTable(data, "Data Overview");
      
    } catch (error) {
      console.error('❌ Error generating basic analysis:', error);
      return {
        title: 'Analysis Summary',
        headers: ['Error'],
        data: [{ Error: `Analysis failed: ${error.message}` }],
        total_rows: 1,
        error: true
      };
    }
  }

  // Helper method to find a column using unified semantic layer
  findColumn(data, possibleNames) {
    try {
      if (!data || !data.length) return null;
      
      const columns = Object.keys(data[0]);
      
      // First try using the unified semantic layer
      for (const logicalName of possibleNames) {
        try {
          const actualColumn = this.columnMapper.resolveColumn(columns, logicalName);
          if (actualColumn) {
            return actualColumn;
          }
        } catch (semanticError) {
          // Continue to fallback
        }
      }
      
      // Legacy fallback method
      for (const name of possibleNames) {
        const found = columns.find(col => 
          col.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(col.toLowerCase())
        );
        if (found) {
          return found;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error in findColumn:', error);
      return null;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      console.log('📊 Running OpenAI GPT-4.1 service health check...');
      
      if (!this.initialized || !this.client) {
        return {
          healthy: false,
          error: 'OpenAI client not initialized - missing API key',
          timestamp: new Date().toISOString(),
          api_key_configured: !!this.apiKey,
          initialized: this.initialized
        };
      }
      
      const startTime = Date.now();
      const response = await this.makeRequest({
        model: "gpt-4.1-2025-04-14",
        messages: [{ role: "user", content: "Hello, this is a health check." }],
        max_tokens: 10
      });

      return {
        healthy: true,
        model: "gpt-4.1-2025-04-14",
        timestamp: new Date().toISOString(),
        response_time: Date.now() - startTime,
        api_key_configured: !!this.apiKey,
        initialized: this.initialized
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        api_key_configured: !!this.apiKey,
        initialized: this.initialized
      };
    }
  }

  // Get service status
  getStatus() {
    return {
      service: 'OpenAI GPT-4.1',
      model: 'gpt-4.1-2025-04-14',
      api_key_configured: !!this.apiKey,
      initialized: this.initialized,
      queue_length: this.requestQueue?.length || 0,
      processing: this.isProcessing
    };
  }
}

// Export singleton instance
const openaiService = new OpenAIService();
module.exports = openaiService;