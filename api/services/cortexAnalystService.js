const CortexClient = require('./cortex/cortexClient');
const SqlGenerator = require('./cortex/sqlGenerator');
const SemanticModelManager = require('./cortex/semanticModelManager');
const ResponseFormatter = require('./cortex/responseFormatter');

/**
 * Cortex Analyst Service - Main orchestrator for Snowflake Cortex Analyst
 * Refactored into focused modules for maintainability
 * 
 * Architecture:
 * - CortexClient: Handles Snowflake authentication and API communication
 * - SqlGenerator: Converts natural language to SQL queries
 * - SemanticModelManager: Manages YAML semantic models and deployment
 * - ResponseFormatter: Formats API responses and handles SQL simulation
 */
class CortexAnalystService {
  constructor() {
    this.client = new CortexClient();
    this.sqlGenerator = new SqlGenerator();
    this.semanticModelManager = new SemanticModelManager();
    this.responseFormatter = new ResponseFormatter();
    this.initialized = false;
  }

  // Initialize all service components
  async initialize() {
    try {
      // Initialize client (handles credentials and auth)
      await this.client.initialize();
      
      // Deploy semantic model if client initialized successfully
      if (this.client.initialized) {
        await this.semanticModelManager.deploySemanticModel(
          this.client.credentials,
          this.client.authToken,
          this.client.baseURL
        );
      }
      
      this.initialized = this.client.initialized;
      console.log('✅ Cortex Analyst service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Cortex Analyst service:', error.message);
      this.initialized = false;
    }
  }

  // Main analysis method using Cortex Analyst
  async analyzeData(data, question, analysisType = 'general', identifier = 'default') {
    try {
      if (!this.initialized) {
        throw new Error('Cortex Analyst service not initialized. Please check Snowflake credentials.');
      }

      this.client.checkRateLimit(identifier);

      console.log(`🧠 Starting Cortex Analyst analysis: "${question}"`);
      console.log(`🔍 Question analysis for: "${question}"`);
      const startTime = Date.now();

      // Generate SQL from natural language question
      const sqlResult = this.sqlGenerator.generateSqlFromQuestion(question, data);
      console.log(`📝 Generated SQL result:`, { sql: sqlResult.sql, analysis: sqlResult.analysis });
      
      // Prepare Cortex Analyst API payload
      const payload = {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: question
              }
            ]
          }
        ],
        semantic_model: this.semanticModelManager.getSemanticModelPath(),
        options: {
          return_sql: true,
          include_suggestions: true
        }
      };

      console.log('📡 Sending request to Cortex Analyst API...');
      
      try {
        // Try Cortex Analyst API first
        const cortexResponse = await this.client.makeRequest('POST', '/api/v2/cortex/analyst/message', payload);
        
        if (cortexResponse.success && cortexResponse.data) {
          console.log('✅ Received response from Cortex Analyst');
          
          // Format the response using our response formatter
          const formattedResponse = await this.responseFormatter.formatCortexResponse(
            cortexResponse.data,
            data,
            question,
            this.client.credentials,
            this.semanticModelManager
          );
          
          const duration = Date.now() - startTime;
          
          return {
            success: true,
            ...formattedResponse,
            metadata: {
              model: 'cortex_analyst',
              rows_analyzed: data.length,
              analysis_type: analysisType,
              processing_time: duration,
              timestamp: new Date().toISOString(),
              backend: 'cortex_analyst',
              sql_generated: sqlResult.sql,
              question_analysis: sqlResult.questionAnalysis
            }
          };
        } else {
          throw new Error('Invalid response from Cortex Analyst API');
        }
        
      } catch (cortexError) {
        console.warn('⚠️ Cortex Analyst API failed, using local SQL generation:', cortexError.message);
        
        // Fallback to local SQL generation and simulation
        return await this.handleLocalAnalysis(data, question, sqlResult, startTime, analysisType);
      }

    } catch (error) {
      console.error('Cortex Analyst error:', error.message);
      
      return {
        success: false,
        error: error.message.includes('Rate limit') ? error.message : 'Cortex Analyst analysis failed. Please try again.',
        timestamp: new Date().toISOString(),
        backend: 'cortex_analyst'
      };
    }
  }

  // Handle local analysis when Cortex API is unavailable
  async handleLocalAnalysis(data, question, sqlResult, startTime, analysisType) {
    try {
      console.log('🔄 Using local SQL generation and simulation...');
      
      // Execute SQL simulation on cached data
      const resultsTable = await this.responseFormatter.simulateQueryExecution(
        sqlResult.sql,
        data,
        question,
        this.client.credentials,
        this.semanticModelManager
      );
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        analysis: sqlResult.analysis || `Local analysis for: ${question}`,
        python_code: {
          code: this.responseFormatter.convertSQLToPython(sqlResult.sql),
          blocks: [sqlResult.sql],
          executable: false,
          source: 'local_sql_generation'
        },
        results_table: resultsTable,
        visualization: this.responseFormatter.createVisualization(resultsTable, question),
        refined_questions: sqlResult.suggestions.map(s => ({
          question: s,
          reason: "Generated from local SQL analysis"
        })),
        metadata: {
          model: 'local_sql_generator',
          rows_analyzed: data.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          backend: 'cortex_analyst',
          sql_generated: sqlResult.sql,
          question_analysis: sqlResult.questionAnalysis,
          execution_mode: 'local_simulation'
        }
      };
      
    } catch (localError) {
      console.error('Local analysis also failed:', localError);
      throw localError;
    }
  }

  // Health check method
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'unavailable',
        message: 'Cortex Analyst service not initialized',
        components: {
          client: false,
          semanticModel: false,
          sqlGenerator: true,
          responseFormatter: true
        }
      };
    }

    try {
      const clientHealth = await this.client.healthCheck();
      const semanticModelValid = this.semanticModelManager.validateSemanticModel();
      
      return {
        status: clientHealth.status === 'healthy' ? 'healthy' : 'degraded',
        message: 'Cortex Analyst service operational',
        components: {
          client: clientHealth.status === 'healthy',
          semanticModel: semanticModelValid.valid,
          sqlGenerator: true,
          responseFormatter: true
        },
        details: {
          client: clientHealth,
          semanticModel: semanticModelValid,
          modelStats: this.semanticModelManager.getModelStats()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Cortex Analyst service health check failed',
        error: error.message
      };
    }
  }

  // Get service status
  getStatus() {
    const clientStatus = this.client.getStatus();
    const modelStats = this.semanticModelManager.getModelStats();
    
    return {
      initialized: this.initialized,
      components: {
        client: clientStatus,
        semanticModel: {
          loaded: !!this.semanticModelManager.semanticModelContent,
          path: this.semanticModelManager.getSemanticModelPath(),
          stats: modelStats
        },
        sqlGenerator: {
          available: true,
          supportedPatterns: ['COUNT', 'SUM', 'AVG', 'GROUP BY', 'WHERE', 'ORDER BY']
        },
        responseFormatter: {
          available: true,
          supportedFormats: ['table', 'visualization', 'suggestions']
        }
      },
      capabilities: {
        realTimeSQL: clientStatus.initialized,
        localSimulation: true,
        semanticModel: true,
        naturalLanguageSQL: true
      }
    };
  }

  // Reinitialize service (useful for credential updates)
  async reinitialize() {
    console.log('🔄 Reinitializing Cortex Analyst service...');
    this.initialized = false;
    await this.initialize();
    return this.initialized;
  }
}

// Export singleton instance
const cortexAnalystService = new CortexAnalystService();
cortexAnalystService.initialize(); // Auto-initialize
module.exports = cortexAnalystService;