const AnthropicClient = require('./anthropicClient');
const CodeExecutor = require('./codeExecutor');
const ResultFormatter = require('./resultFormatter');
const ColumnMappingService = require('../semanticLayer/columnMappingService');

/**
 * Anthropic Service - Main orchestrator for AI analysis
 * Responsible for: Coordinating analysis workflow, prompt building, response processing
 */
class AnthropicService {
  constructor() {
    this.client = new AnthropicClient();
    this.codeExecutor = new CodeExecutor();
    this.resultFormatter = new ResultFormatter();
    this.columnMapper = new ColumnMappingService();
  }

  // Main analysis method - orchestrates the entire workflow
  async analyzeData(data, analysisType, userContext, identifier = 'default') {
    const startTime = Date.now();
    
    try {
      // Security and validation checks
      this.client.checkRateLimit(identifier);
      const sanitizedData = this.client.sanitizeData(data);
      const sanitizedContext = this.client.sanitizeUserContext(userContext);

      console.log(`🤖 Starting Anthropic analysis for: "${sanitizedContext}"`);
      console.log(`📊 Dataset: ${sanitizedData.length} rows, ${Object.keys(sanitizedData[0] || {}).length} columns`);

      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(sanitizedData, analysisType, sanitizedContext);
      
      // Send to Anthropic API
      const response = await this.client.sendMessage([{
        role: 'user',
        content: prompt
      }]);

      if (!response.content || response.content.length === 0) {
        throw new Error('Empty response from Anthropic API');
      }

      const analysisText = response.content[0].text;
      console.log('📝 Received analysis from Anthropic');

      // Extract Python code from response
      const pythonCode = this.resultFormatter.extractPythonCode(analysisText);
      
      let executedResults = null;

      // Try to execute the AI's analysis on our cached data
      if (pythonCode && pythonCode.executable) {
        console.log('🔬 Attempting to execute AI analysis on cached data...');
        executedResults = this.codeExecutor.executeAnalysisOnCachedData(
          sanitizedData, 
          sanitizedContext, 
          analysisText, 
          pythonCode
        );
        
        // Log execution status for debugging
        if (executedResults) {
          console.log('✅ Code execution successful');
        } else {
          console.warn('❌ Code execution returned null - falling back to basic analysis');
        }
      } else {
        console.warn('⚠️ No executable Python code found - using basic analysis');
      }

      // Generate refined question suggestions
      const refinedQuestions = this.generateRefinedQuestions(sanitizedData, sanitizedContext, analysisText);
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        analysis: analysisText,
        python_code: pythonCode,
        results_table: executedResults ? 
          this.resultFormatter.formatResultsAsTable(executedResults, sanitizedContext) :
          this.generateBasicAnalysisResults(sanitizedData, sanitizedContext),
        visualization: executedResults ?
          this.resultFormatter.createVisualizationFromResults(executedResults, sanitizedContext) :
          this.resultFormatter.createBasicVisualization(sanitizedData, "Data Overview"),
        refined_questions: refinedQuestions,
        metadata: {
          model: 'claude-3-5-sonnet',
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          token_usage: response.usage,
          cached_analysis: true,
          executed_real_analysis: !!executedResults
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

  // Build comprehensive analysis prompt
  buildAnalysisPrompt(data, analysisType, userContext) {
    const dataStructure = this.analyzeDataStructure(data);
    const sampleData = data.slice(0, 5);
    
    return `You are a data analyst. Analyze this dataset and provide insights for the user's question.

🚨 CRITICAL CONSTRAINT: You can ONLY use these exact column names in your code: ${dataStructure.columns.join(', ')}

DATASET STRUCTURE:
- ${data.length} total records  
- ✅ AVAILABLE COLUMNS: ${dataStructure.columns.join(', ')}
- ❌ FORBIDDEN: Creating new columns, calculations, or derived metrics
- Numeric columns: ${dataStructure.numericColumns.join(', ') || 'None'}
- Categorical columns: ${dataStructure.categoricalColumns.join(', ') || 'None'}

SAMPLE DATA (showing exact column names):
${JSON.stringify(sampleData, null, 2)}

USER QUESTION: "${userContext}"

🔒 MANDATORY RULES:
1. NEVER create calculated columns like 'DISCOUNT_AMOUNT' - use existing 'DISCOUNT' column directly
2. NEVER reference columns not in this list: ${dataStructure.columns.join(', ')}
3. Use existing columns AS-IS: no calculations, no derived metrics
4. For discount analysis: use the existing 'DISCOUNT' column (percentage), don't calculate amounts
5. If user asks about something not available, explain what columns you DO have

✅ CORRECT Python patterns (using ONLY existing columns):
df.groupby('PRODUCT_NAME')['SALES'].sum().sort_values(ascending=False).head(5)
df.groupby('PRODUCT_NAME')['DISCOUNT'].mean().sort_values(ascending=False).head(5)  
df.groupby('CATEGORY')['PROFIT'].sum()

❌ FORBIDDEN patterns:
df['DISCOUNT_AMOUNT'] = df['SALES'] * df['DISCOUNT']  # NO - creates new column
df['PROFIT_MARGIN'] = df['PROFIT'] / df['SALES']      # NO - creates new column

Provide:
1. Clear analysis answering the user's question
2. Key insights from the existing data
3. Python code using only existing columns`;
  }

  // Analyze data structure for intelligent prompt building
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

  // Generate intelligent question suggestions based on data and previous analysis
  generateRefinedQuestions(data, userContext, analysisText) {
    const questionLower = userContext.toLowerCase();
    const columns = Object.keys(data[0] || {});
    const refinedQuestions = [];
    
    // Analyze actual data structure intelligently
    const dataProfile = this.analyzeDataStructure(data);
    
    // Only suggest refinements if the current question seems limited by data availability
    if (analysisText.toLowerCase().includes('cannot determine') || 
        analysisText.toLowerCase().includes('not available') ||
        analysisText.toLowerCase().includes('limitation')) {
      
      // Generate smart questions based on actual data structure
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
      
      if (dataProfile.categoricalColumns.length > 0) {
        refinedQuestions.push({
          question: `What is the distribution of ${dataProfile.categoricalColumns[0].toLowerCase()}?`,
          reason: "Distribution analysis of categorical data"
        });
      }
    }
    
    // Add general follow-up questions based on data structure
    if (refinedQuestions.length < 3) {
      if (dataProfile.numericColumns.length > 1) {
        refinedQuestions.push({
          question: `What is the relationship between ${dataProfile.numericColumns[0].toLowerCase()} and ${dataProfile.numericColumns[1].toLowerCase()}?`,
          reason: "Correlation analysis between numeric variables"
        });
      }
      
      if (data.length > 1000) {
        refinedQuestions.push({
          question: `What patterns exist across all ${data.length} records?`,
          reason: "Large dataset pattern analysis"
        });
      }
    }
    
    return refinedQuestions.slice(0, 4); // Return max 4 suggestions
  }

  // Health check method
  async healthCheck() {
    return await this.client.healthCheck();
  }

  // Generate basic analysis results when code execution fails
  generateBasicAnalysisResults(data, userContext) {
    try {
      const questionLower = userContext.toLowerCase();
      
      // Try to provide some actual analysis based on the question
      if (questionLower.includes('category') && questionLower.includes('discount')) {
        // For discount by category questions
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
            columns: ["Category", "Avg Discount", "Total Discount", "Orders"],
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
      
      // Generic fallback - try to find interesting patterns
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
          columns: Object.keys(results[0] || {}),
          data: results,
          total_rows: results.length
        };
      }
      
      // Final fallback
      return this.resultFormatter.createSummaryTable(data, "Data Overview");
      
    } catch (error) {
      console.error('Error generating basic analysis:', error);
      return this.resultFormatter.createSummaryTable(data, "Analysis Summary");
    }
  }

  // Helper method to find a column using unified semantic layer
  findColumn(data, possibleNames) {
    if (!data.length) return null;
    const columns = Object.keys(data[0]);
    
    // First try using the unified semantic layer
    for (const logicalName of possibleNames) {
      const actualColumn = this.columnMapper.resolveColumn(columns, logicalName);
      if (actualColumn) {
        console.log(`✅ Anthropic column resolved via semantic layer: ${logicalName} → ${actualColumn}`);
        return actualColumn;
      }
    }
    
    // Legacy fallback method (temporary during migration)
    for (const name of possibleNames) {
      const found = columns.find(col => 
        col.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(col.toLowerCase())
      );
      if (found) {
        console.log(`🔄 Anthropic legacy column fallback: ${name} → ${found}`);
        return found;
      }
    }
    
    console.warn(`❌ Anthropic column not found for any of: ${possibleNames.join(', ')}`);
    return null;
  }

  // Get service status
  getStatus() {
    return this.client.getStatus();
  }
}

// Export singleton instance
const anthropicService = new AnthropicService();
module.exports = anthropicService;