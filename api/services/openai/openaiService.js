const OpenAIClient = require('./openaiClient');

/**
 * OpenAI GPT-4.1 Service - Main orchestrator for AI analysis
 * Responsible for: Coordinating analysis workflow, prompt building, response processing
 * Features: Advanced reasoning, function calling, structured outputs
 */
class OpenAIService {
  constructor() {
    this.client = new OpenAIClient();
  }

  // Main analysis method - orchestrates the entire workflow with GPT-4.1
  async analyzeData(data, analysisType, userContext, identifier = 'default') {
    const startTime = Date.now();
    
    try {
      // Security and validation checks
      this.client.checkRateLimit(identifier);
      const sanitizedData = this.client.sanitizeData(data);
      const sanitizedContext = this.client.sanitizeUserContext(userContext);

      console.log(`🤖 Starting OpenAI GPT-4.1 analysis for: "${sanitizedContext}"`);
      console.log(`📊 Dataset: ${sanitizedData.length} rows, ${Object.keys(sanitizedData[0] || {}).length} columns`);

      // Build analysis prompt optimized for GPT-4.1
      const messages = this.buildGPT4AnalysisMessages(sanitizedData, analysisType, sanitizedContext);
      
      // Send to OpenAI GPT-4.1 API
      const response = await this.client.sendMessage(messages, {
        model: 'gpt-4-1106-preview',
        maxTokens: 4000,
        temperature: 0.1
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Empty response from OpenAI GPT-4.1 API');
      }

      const analysisText = response.choices[0].message.content;
      console.log('📝 Received analysis from OpenAI GPT-4.1');

      // Extract Python code from response (simple extraction)
      const pythonCode = this.extractPythonCode(analysisText);
      
      // Generate refined question suggestions
      const refinedQuestions = this.generateRefinedQuestions(sanitizedData, sanitizedContext, analysisText);
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        analysis: analysisText,
        python_code: pythonCode,
        results_table: this.createSummaryTable(sanitizedData, "Analysis Summary"),
        visualization: this.createBasicVisualization(sanitizedData, "Data Overview"),
        refined_questions: refinedQuestions,
        metadata: {
          model: 'gpt-4-1106-preview',
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          token_usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          },
          cached_analysis: true
        }
      };

    } catch (error) {
      console.error('OpenAI GPT-4.1 analysis error:', error.message);
      
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

  // Build comprehensive analysis messages optimized for GPT-4.1
  buildGPT4AnalysisMessages(data, analysisType, userContext) {
    const dataStructure = this.analyzeDataStructure(data);
    const sampleData = data.slice(0, 5);
    
    const systemMessage = {
      role: "system",
      content: `You are an expert data analyst powered by GPT-4.1, specializing in comprehensive business data analysis. You excel at:

- Advanced pattern recognition and statistical analysis
- Business intelligence insights and strategic recommendations
- Python code generation for data analysis using pandas
- Clear communication of complex findings
- Actionable business recommendations

You have access to cutting-edge reasoning capabilities and can handle complex multi-dimensional analysis tasks.`
    };

    const userMessage = {
      role: "user",
      content: `Please analyze this business dataset and provide comprehensive insights.

DATASET OVERVIEW:
- Total Records: ${data.length}
- Available Columns: ${dataStructure.columns.join(', ')}
- Numeric Columns: ${dataStructure.numericColumns.join(', ') || 'None'}
- Categorical Columns: ${dataStructure.categoricalColumns.join(', ') || 'None'}
- Date Columns: ${dataStructure.dateColumns.join(', ') || 'None'}

SAMPLE DATA (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

USER QUESTION: "${userContext}"

Please provide a comprehensive analysis with the following structure:

## EXECUTIVE SUMMARY
Provide a high-level overview of key findings and business implications.

## DETAILED ANALYSIS
Analyze the data thoroughly, addressing the user's specific question while exploring relevant patterns and trends.

## KEY INSIGHTS
List the most important insights and findings from the analysis.

## BUSINESS RECOMMENDATIONS
Provide actionable recommendations based on the analysis.

## TECHNICAL IMPLEMENTATION
Include Python code using pandas that demonstrates the analysis (use variable name 'df' for the DataFrame).

## DATA QUALITY NOTES
Comment on data quality, completeness, and any limitations observed.

Focus on providing business value and actionable insights. Ensure all analysis is grounded in the actual data provided.`
    };
    
    return [systemMessage, userMessage];
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

  // Generate intelligent question suggestions based on data and analysis
  generateRefinedQuestions(data, userContext, analysisText) {
    const questionLower = userContext.toLowerCase();
    const columns = Object.keys(data[0] || {});
    const refinedQuestions = [];
    
    // Analyze actual data structure intelligently
    const dataProfile = this.analyzeDataStructure(data);
    
    // Generate smart questions based on actual data structure and GPT-4.1 capabilities
    if (dataProfile.categoricalColumns.length > 0 && dataProfile.numericColumns.length > 0) {
      refinedQuestions.push({
        question: `What advanced patterns exist between ${dataProfile.categoricalColumns[0].toLowerCase()} segments and ${dataProfile.numericColumns[0].toLowerCase()} performance?`,
        reason: "Multi-dimensional analysis using GPT-4.1's advanced reasoning"
      });
    }
    
    if (dataProfile.dateColumns.length > 0) {
      refinedQuestions.push({
        question: "What sophisticated temporal patterns, seasonality, and forecasting insights can be derived?",
        reason: "Advanced time-series analysis with predictive insights"
      });
    }
    
    if (dataProfile.numericColumns.length > 1) {
      refinedQuestions.push({
        question: `What complex correlations and causal relationships exist between ${dataProfile.numericColumns.slice(0, 2).join(' and ')}?`,
        reason: "Statistical correlation analysis with causation insights"
      });
    }
    
    // Add strategic business questions
    refinedQuestions.push({
      question: "What strategic business opportunities and risks can be identified from this data?",
      reason: "Strategic business intelligence analysis"
    });
    
    return refinedQuestions.slice(0, 4); // Return max 4 suggestions
  }

  // Simple Python code extraction
  extractPythonCode(text) {
    const codeBlocks = text.match(/```python\n([\s\S]*?)\n```/g);
    if (codeBlocks && codeBlocks.length > 0) {
      const code = codeBlocks[0].replace(/```python\n/, '').replace(/\n```/, '');
      return {
        code: code,
        executable: code.length > 0
      };
    }
    return null;
  }

  // Create simple summary table
  createSummaryTable(data, title) {
    if (!data || data.length === 0) return null;
    
    return {
      title: title,
      columns: Object.keys(data[0]),
      rows: data.slice(0, 10).map(row => Object.values(row)),
      totalRows: data.length
    };
  }

  // Create basic visualization config
  createBasicVisualization(data, title) {
    if (!data || data.length === 0) return null;
    
    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => 
      typeof data[0][col] === 'number' || !isNaN(parseFloat(data[0][col]))
    );
    
    if (numericColumns.length > 0) {
      return {
        type: 'bar',
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
      message: 'Data visualization available with numeric data'
    };
  }

  // Health check method
  async healthCheck() {
    return await this.client.healthCheck();
  }

  // Get service status
  getStatus() {
    const clientStatus = this.client.getStatus();
    return {
      service: 'OpenAI GPT-4.1 Analysis',
      ...clientStatus,
      api_key_configured: this.client.initialized
    };
  }

  // Data source recommendation method with structured output
  async makeRecommendation(prompt) {
    try {
      console.log('🔍 Making data source recommendation with OpenAI GPT-4.1...');
      
      // Define schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          recommendedSource: {
            type: "string",
            description: "The recommended data source name"
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level in the recommendation"
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of why this source is recommended"
          },
          analysisType: {
            type: "string",
            description: "Description of the type of analysis this enables"
          },
          alternativeSources: {
            type: "array",
            items: { type: "string" },
            description: "Alternative data sources to consider"
          },
          keyFeatures: {
            type: "array",
            items: { type: "string" },
            description: "Key features or data points from the recommended source"
          }
        },
        required: ["recommendedSource", "confidence", "reasoning", "analysisType", "alternativeSources", "keyFeatures"]
      };

      // Send request with structured output
      const response = await this.client.sendMessageWithStructuredOutput([{
        role: 'user',
        content: prompt
      }], responseSchema);

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Empty response from OpenAI GPT-4.1 API');
      }

      const responseText = response.choices[0].message.content;
      console.log('📝 Received recommendation from OpenAI GPT-4.1');

      // Parse JSON response (should be structured)
      try {
        const recommendation = JSON.parse(responseText);
        return recommendation;
      } catch (parseError) {
        console.warn('Failed to parse JSON recommendation:', parseError.message);
        // Return a fallback response
        return {
          recommendedSource: 'CUSTOMERS',
          confidence: 'low',
          reasoning: 'Unable to parse AI response, providing default recommendation',
          analysisType: 'general analysis',
          alternativeSources: [],
          keyFeatures: []
        };
      }

    } catch (error) {
      console.error('Recommendation error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const openaiService = new OpenAIService();
module.exports = openaiService;