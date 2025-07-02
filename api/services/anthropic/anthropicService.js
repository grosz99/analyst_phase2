const AnthropicClient = require('./anthropicClient');
const CodeExecutor = require('./codeExecutor');
const ResultFormatter = require('./resultFormatter');

/**
 * Anthropic Service - Main orchestrator for AI analysis
 * Responsible for: Coordinating analysis workflow, prompt building, response processing
 */
class AnthropicService {
  constructor() {
    this.client = new AnthropicClient();
    this.codeExecutor = new CodeExecutor();
    this.resultFormatter = new ResultFormatter();
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
          this.resultFormatter.createSummaryTable(sanitizedData, "Analysis Summary"),
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

DATASET STRUCTURE:
- ${data.length} total records
- Columns: ${dataStructure.columns.join(', ')}
- Numeric columns: ${dataStructure.numericColumns.join(', ') || 'None'}
- Categorical columns: ${dataStructure.categoricalColumns.join(', ') || 'None'}
- Date columns: ${dataStructure.dateColumns.join(', ') || 'None'}

SAMPLE DATA (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

USER QUESTION: "${userContext}"

Please provide:
1. A clear analysis answering the user's question
2. Key insights and findings
3. Python code using pandas that demonstrates the analysis

Focus on the specific question asked. If the data doesn't contain the exact information needed, explain what's available and provide the best possible analysis with the existing data.

Generate Python code that works with a DataFrame called 'df' containing this data structure.`;
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

  // Get service status
  getStatus() {
    return this.client.getStatus();
  }
}

// Export singleton instance
const anthropicService = new AnthropicService();
module.exports = anthropicService;