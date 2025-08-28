const express = require('express');
const cors = require('cors');
const session = require('express-session');
const csrf = require('csrf');
const statelessCSRF = require('./utils/statelessCSRF');
// Load environment variables from .env file for local development
// In production (Vercel), environment variables are set in Vercel Dashboard
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const supabaseService = require('./services/supabaseService');
const openaiService = require('./services/openai/openaiService');
const gpt4AgentOrchestrator = require('./services/openai/gpt4AgentOrchestrator');
const sqliteService = require('./services/sqliteService');
// const anthropicService = require('./services/anthropicService'); // REPLACED with OpenAI GPT-4.1
// const agentOrchestrator = require('./services/anthropic/agentOrchestrator'); // REPLACED with GPT-4.1 Agent Orchestrator
const fixedMetadata = require('./config/fixedMetadata');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://analyst-phase2.vercel.app', 'https://*.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Session configuration for CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET environment variable is required') })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// CSRF protection middleware
const csrfTokens = csrf();

// CSRF middleware function with debugging
const csrfProtection = (req, res, next) => {
  console.log('🛡️ CSRF Protection Check:', {
    method: req.method,
    path: req.path,
    hasSession: !!req.session,
    sessionId: req.sessionID,
    hasCSRFSecret: !!(req.session && req.session.csrfSecret),
    providedToken: req.headers['x-csrf-token'] ? 'provided' : 'missing',
    environment: process.env.NODE_ENV
  });

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  // Initialize session if needed
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = csrfTokens.secretSync();
    console.log('🔑 Generated new CSRF secret for session');
  }
  
  // Skip CSRF check for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  // For POST requests, verify token
  if (!token) {
    console.log('❌ CSRF token missing');
    return res.status(403).json({ 
      error: 'CSRF token required',
      debug: {
        expected_header: 'X-CSRF-Token',
        session_exists: !!req.session,
        environment: process.env.NODE_ENV
      }
    });
  }
  
  const isValid = csrfTokens.verify(req.session.csrfSecret, token);
  console.log('🔍 CSRF token verification:', { isValid, hasSecret: !!req.session.csrfSecret });
  
  if (!isValid) {
    console.log('❌ Invalid CSRF token');
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      debug: {
        token_provided: !!token,
        secret_exists: !!req.session.csrfSecret,
        session_id: req.sessionID
      }
    });
  }
  
  console.log('✅ CSRF token valid');
  next();
};

// Apply CSRF protection to sensitive endpoints
if (process.env.NODE_ENV === 'production') {
  // Use stateless CSRF for Vercel production
  app.use('/api/ai/analyze', statelessCSRF.middleware());
  app.use('/api/load-dataset', statelessCSRF.middleware());
  app.use('/api/ai/recommend-datasource', statelessCSRF.middleware());
  console.log('🛡️ Stateless CSRF protection enabled for production');
} else {
  // Use session-based CSRF for development
  app.use('/api/ai/analyze', csrfProtection);
  app.use('/api/load-dataset', csrfProtection);
  app.use('/api/ai/recommend-datasource', csrfProtection);
  console.log('🛡️ Session-based CSRF protection enabled for development');
}

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // Use stateless CSRF for production
    const token = statelessCSRF.generateToken();
    res.json({ csrfToken: token });
  } else {
    // Use session-based CSRF for development
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = csrfTokens.secretSync();
    }
    const token = csrfTokens.create(req.session.csrfSecret);
    res.json({ csrfToken: token });
  }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    milestone: 'M1 - Backend Foundation'
  });
});

// Environment debug endpoint (only show availability, not actual values)
app.get('/api/debug/env', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    env_vars_status: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      SESSION_SECRET: !!process.env.SESSION_SECRET
    },
    supabase_service: {
      initialized: supabaseService.isConnected,
      error: supabaseService.connectionError
    },
    timestamp: new Date().toISOString()
  });
});

// Debug: List available tables
app.get('/api/debug/tables', async (req, res) => {
  try {
    const tables = await supabaseService.listTables();
    res.json({
      success: true,
      tables: tables,
      message: `Found ${tables.length} tables`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug: Check table structure
app.get('/api/debug/table/:name', async (req, res) => {
  try {
    const tableName = req.params.name;
    const { data, error } = await supabaseService.client
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        table_name: tableName
      });
    }
    
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    const sampleRow = data && data.length > 0 ? data[0] : null;
    
    res.json({
      success: true,
      table_name: tableName,
      columns: columns,
      sample_row: sampleRow,
      row_count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const supabaseStatus = supabaseService.getStatus();
    
    res.json({
      server: 'online',
      database: supabaseStatus.connected ? 'connected' : 'disconnected',
      ai: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing_api_key',
        gpt4AgentOrchestration: 'enabled'
      },
      cache: `${supabaseStatus.cache_size} items cached`,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      supabase: {
        connected: supabaseStatus.connected,
        error: supabaseStatus.error,
        config: supabaseStatus.config
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      server: 'online',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Supabase connection test endpoint
app.get('/api/supabase/test', async (req, res) => {
  try {
    console.log('Testing Supabase connection via API...');
    const result = await supabaseService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Supabase connection successful',
        duration: result.duration,
        config: {
          url: result.config.url,
          status: result.config.status
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        duration: result.duration,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Supabase test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Data Analysis API - Agent Orchestration Platform',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      snowflake_test: '/api/snowflake/test',
      available_datasets: '/api/available-datasets',
      load_dataset: 'POST /api/load-dataset',
      // ai_query: REMOVED - was generating mock data
      ai_health: '/api/ai/health',
      ai_status: '/api/ai/status',
      ai_backends: '/api/ai/backends',
      ai_analyze: 'POST /api/ai/analyze',
      ai_recommend: 'POST /api/ai/recommend-datasource'
    },
    ai_backends: {
      openai: 'OpenAI GPT-4.1 with advanced reasoning and intelligent pandas execution',
      gpt4AgentOrchestration: 'GPT-4.1 Agent Orchestration with function calling, structured outputs, and semantic models'
    },
    features: [
      'GPT-4.1 advanced reasoning and analysis',
      'Function calling for agent coordination',
      'Structured outputs for semantic models',
      'Multi-agent data source coordination',
      'Predictive analytics and forecasting',
      'Strategic business intelligence'
    ],
    documentation: 'https://github.com/grosz99/analyst_phase2'
  });
});

// Only real Snowflake data - no mock fallbacks

// Get available datasets - Now using fixed metadata to reduce costs
app.get('/api/available-datasets', async (req, res) => {
  try {
    console.log('Fetching available datasets...');
    const startTime = Date.now();
    
    // Check if we should use live data (only when explicitly requested)
    const useLiveData = req.query.live === 'true';
    
    if (useLiveData) {
      // Only query Supabase when explicitly requested
      try {
        const allSupabaseTables = await supabaseService.discoverTables();
        const duration = Date.now() - startTime;
        
        // Filter to only show the three real business datasets
        const businessDatasets = allSupabaseTables.filter(table => 
          ['ATTENDANCE', 'NCC', 'PIPELINE'].includes(table.name)
        );
        
        console.log(`Retrieved ${allSupabaseTables.length} Supabase tables, filtered to ${businessDatasets.length} business datasets in ${duration}ms`);
        
        res.json({
          success: true,
          datasets: businessDatasets,
          total_count: businessDatasets.length,
          timestamp: new Date().toISOString(),
          source: 'supabase',
          performance: {
            duration: duration,
            cached: duration < 1000
          }
        });
      } catch (supabaseError) {
        console.error('Supabase unavailable:', supabaseError.message);
        
        // Fallback to fixed metadata
        console.log('Falling back to fixed metadata due to Supabase error');
        const duration = Date.now() - startTime;
        
        res.json({
          success: true,
          datasets: fixedMetadata.tables,
          total_count: fixedMetadata.tables.length,
          timestamp: new Date().toISOString(),
          source: 'fixed_metadata',
          performance: {
            duration: duration,
            cached: true
          },
          notice: 'Using cached metadata due to connection issues'
        });
      }
    } else {
      // DEFAULT: Use fixed metadata to avoid expensive queries
      const duration = Date.now() - startTime;
      
      console.log('Using fixed metadata for datasets', { duration: `${duration}ms` });
      
      res.json({
        success: true,
        datasets: fixedMetadata.tables,
        total_count: fixedMetadata.tables.length,
        timestamp: new Date().toISOString(),
        source: 'fixed_metadata',
        performance: {
          duration: duration,
          cached: true
        }
      });
    }
    
  } catch (error) {
    console.error('Available datasets endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Load dataset with filtering
app.post('/api/load-dataset', async (req, res) => {
  try {
    const { datasetId, userSelections = {} } = req.body;
    console.log('🔄 Loading dataset with selections:', { datasetId, userSelections: JSON.stringify(userSelections, null, 2) });
    console.log('📡 Request details:', { ip: req.ip, userAgent: req.get('User-Agent') });
    const startTime = Date.now();
    
    if (!datasetId) {
      return res.status(400).json({
        success: false,
        error: 'datasetId is required'
      });
    }

    // Query Supabase for both schema and actual data (real analysis needs real schema)
    try {
      // Get both schema and actual data from Supabase for real analysis
      const analysisRowLimit = userSelections.analysisMode ? 5000 : 1000;
      const filters = userSelections.filters || {};
      
      const [schema, analysisData] = await Promise.all([
        supabaseService.discoverColumns(datasetId),
        supabaseService.sampleData(datasetId, userSelections.columns, analysisRowLimit, filters)
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`Loaded Supabase dataset ${datasetId} with ${analysisData.length} rows in ${duration}ms`);
      
      const result = {
        success: true,
        dataset_id: datasetId,
        schema: {
          ...schema,
          row_count: analysisData.length,
          memory_usage: Math.round(analysisData.length * schema.total_columns * 0.1) // Estimate
        },
        sample_data: analysisData.slice(0, 10), // First 10 rows for preview
        analysis_data: analysisData, // Full data for AI analysis
        filters_applied: userSelections,
        message: `Loaded ${datasetId.toUpperCase()} with ${schema.total_columns} columns (${analysisData.length} rows) from Supabase`,
        processing_time: duration,
        timestamp: new Date().toISOString(),
        source: 'supabase',
        performance: {
          duration: duration,
          rows_sampled: analysisData.length
        }
      };

      res.json(result);
      
    } catch (supabaseError) {
      console.error(`Supabase dataset loading failed for ${datasetId}:`, supabaseError.message);
      
      // ❌ REMOVED: No fallback/fake data allowed per CLAUDE.md
      // Only use real data sources - fail fast when unavailable
      
      // Only return 503 if all fallbacks fail
      res.status(503).json({
        success: false,
        error: 'Data source temporarily unavailable. Please try again in a few moments.',
        dataset_id: datasetId,
        supabase_error: supabaseError.message,
        troubleshooting: {
          message: 'We are experiencing connectivity issues with our data source.',
          steps: [
            'Check your internet connection',
            'Refresh the page and try again',
            'Verify that you have proper access permissions',
            'Contact support if the issue persists'
          ],
          support_contact: 'Please check the system status or contact your administrator'
        },
        retry_after: 30, // Suggest retry after 30 seconds
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Load dataset endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// REMOVED: /api/ai-query endpoint completely - was generating mock data violating CLAUDE.md policy
// Use /api/ai/analyze endpoint instead which uses real GPT-4.1 analysis

// Get distinct values for a field (for filter options) - Now using fixed metadata to reduce costs
app.get('/api/dataset/:datasetId/field/:fieldName/values', async (req, res) => {
  try {
    const { datasetId, fieldName } = req.params;
    const { limit = 100 } = req.query;
    
    console.log(`Getting distinct values for ${datasetId}.${fieldName}...`);
    const startTime = Date.now();
    
    // Check if we should use live data (only when explicitly requested)
    const useLiveData = req.query.live === 'true';
    
    if (useLiveData) {
      // Only query Supabase when explicitly requested
      try {
        const values = await supabaseService.getDistinctValues(datasetId, fieldName, parseInt(limit));
        const duration = Date.now() - startTime;
        
        res.json({
          success: true,
          dataset_id: datasetId,
          field_name: fieldName,
          values: values,
          count: values.length,
          timestamp: new Date().toISOString(),
          source: 'supabase',
          performance: {
            duration: duration
          }
        });
      } catch (supabaseError) {
        console.error(`Failed to get values for ${datasetId}.${fieldName}:`, supabaseError.message);
        
        // Fallback to fixed metadata
        const fixedValues = fixedMetadata.filterValues[datasetId.toLowerCase()]?.[fieldName];
        if (fixedValues) {
          const duration = Date.now() - startTime;
          res.json({
            success: true,
            dataset_id: datasetId,
            field_name: fieldName,
            values: fixedValues.slice(0, parseInt(limit)),
            count: fixedValues.length,
            timestamp: new Date().toISOString(),
            source: 'fixed_metadata',
            performance: {
              duration: duration
            },
            notice: 'Using cached values due to connection issues'
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Field not found or no values available',
            dataset_id: datasetId,
            field_name: fieldName,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      // DEFAULT: Use fixed metadata to avoid expensive queries
      const fixedValues = fixedMetadata.filterValues[datasetId.toLowerCase()]?.[fieldName];
      
      if (fixedValues) {
        const duration = Date.now() - startTime;
        console.log(`Using fixed metadata for ${datasetId}.${fieldName} values (${duration}ms)`);
        
        res.json({
          success: true,
          dataset_id: datasetId,
          field_name: fieldName,
          values: fixedValues.slice(0, parseInt(limit)),
          count: fixedValues.length,
          timestamp: new Date().toISOString(),
          source: 'fixed_metadata',
          performance: {
            duration: duration
          }
        });
      } else {
        // If no fixed values available, return empty array
        const duration = Date.now() - startTime;
        res.json({
          success: true,
          dataset_id: datasetId,
          field_name: fieldName,
          values: [],
          count: 0,
          timestamp: new Date().toISOString(),
          source: 'fixed_metadata',
          performance: {
            duration: duration
          },
          notice: 'No predefined values available for this field'
        });
      }
    }
    
  } catch (error) {
    console.error('Field values endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get dataset schema/columns - Now using fixed metadata to reduce costs
app.get('/api/dataset/:datasetId/schema', async (req, res) => {
  try {
    const { datasetId } = req.params;
    console.log(`Getting schema for dataset: ${datasetId}`);
    const startTime = Date.now();
    
    // Check if we should use live data (only when explicitly requested)
    const useLiveData = req.query.live === 'true';
    
    if (useLiveData) {
      // Only query Supabase when explicitly requested
      try {
        const schema = await supabaseService.discoverColumns(datasetId);
        const duration = Date.now() - startTime;
        
        console.log(`Retrieved schema for ${datasetId} in ${duration}ms`);
        
        res.json({
          success: true,
          dataset_id: datasetId,
          dataset_name: datasetId.toUpperCase(),
          schema: schema,
          timestamp: new Date().toISOString(),
          source: 'supabase',
          performance: {
            duration: duration,
            cached: duration < 500
          }
        });
      } catch (supabaseError) {
        console.error(`Supabase schema unavailable for ${datasetId}:`, supabaseError.message);
        
        // Fallback to fixed metadata
        const schema = fixedMetadata.schemas[datasetId.toLowerCase()];
        if (schema) {
          const duration = Date.now() - startTime;
          res.json({
            success: true,
            dataset_id: datasetId,
            dataset_name: datasetId.toUpperCase(),
            schema: schema,
            timestamp: new Date().toISOString(),
            source: 'fixed_metadata',
            performance: {
              duration: duration,
              cached: true
            },
            notice: 'Using cached schema due to connection issues'
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Dataset not found',
            dataset_id: datasetId,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      // DEFAULT: Use fixed metadata to avoid expensive queries
      const schema = fixedMetadata.schemas[datasetId.toLowerCase()];
      
      if (schema) {
        const duration = Date.now() - startTime;
        console.log(`Using fixed metadata for ${datasetId} schema (${duration}ms)`);
        
        res.json({
          success: true,
          dataset_id: datasetId,
          dataset_name: datasetId.toUpperCase(),
          schema: schema,
          timestamp: new Date().toISOString(),
          source: 'fixed_metadata',
          performance: {
            duration: duration,
            cached: true
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Dataset not found',
          dataset_id: datasetId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('Schema endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========================================
// AI ANALYSIS ENDPOINTS (SECURE)
// ========================================

// AI Analysis Health Check (OpenAI GPT-4.1 Agent Orchestration)
app.get('/api/ai/health', async (req, res) => {
  try {
    const [openaiHealth, orchestratorHealth] = await Promise.allSettled([
      openaiService.healthCheck(),
      gpt4AgentOrchestrator.healthCheck()
    ]);
    
    res.json({
      success: true,
      backends: {
        openai: openaiHealth.status === 'fulfilled' ? openaiHealth.value : { healthy: false, error: openaiHealth.reason?.message },
        gpt4AgentOrchestration: orchestratorHealth.status === 'fulfilled' ? orchestratorHealth.value : { healthy: false, error: orchestratorHealth.reason?.message }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'AI health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// AI Analysis Status (OpenAI GPT-4.1 Agent Orchestration)
app.get('/api/ai/status', (req, res) => {
  try {
    const openaiStatus = openaiService.getStatus();
    const orchestratorStatus = gpt4AgentOrchestrator.getStatus();
    
    res.json({
      success: true,
      backends: {
        openai: openaiStatus,
        gpt4AgentOrchestration: orchestratorStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI status',
      timestamp: new Date().toISOString()
    });
  }
});

// Get Available Analysis Backends
app.get('/api/ai/backends', (req, res) => {
  try {
    const backends = [
      {
        id: 'openai',
        name: 'OpenAI GPT-4.1',
        description: 'Advanced AI analysis with GPT-4.1 reasoning and custom pandas execution on cached data',
        features: [
          'Advanced reasoning and understanding',
          'Python code generation',
          'Intelligent data analysis',
          'Long context window',
          'Superior business intelligence'
        ],
        status: openaiService.getStatus().api_key_configured ? 'available' : 'unavailable'
      },
      {
        id: 'gpt4AgentOrchestration',
        name: 'GPT-4.1 Agent Orchestration',
        description: 'Advanced multi-agent orchestration with GPT-4.1 function calling, structured outputs, and semantic models',
        features: [
          'GPT-4.1 function calling for agent coordination',
          'Structured outputs for semantic models',
          'Advanced multi-agent coordination',
          'Semantic model understanding',
          'Inter-agent communication protocols',
          'Data source agent management',
          'Complex reasoning and strategic analysis',
          'Predictive analytics capabilities',
          'Strategic business intelligence'
        ],
        status: gpt4AgentOrchestrator.getStatus().initialized ? 'available' : 'unavailable'
      }
    ];
    
    res.json({
      success: true,
      backends: backends,
      default: 'gpt4AgentOrchestration', // Default to GPT-4.1 Agent Orchestration
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backends endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available backends',
      timestamp: new Date().toISOString()
    });
  }
});

// Main AI Analysis Endpoint with Backend Choice
// Data source recommendation endpoint
app.post('/api/ai/recommend-datasource', async (req, res) => {
  try {
    const { query, availableDataSources, semanticModel } = req.body;
    const startTime = Date.now();
    
    // Input validation
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string.',
        timestamp: new Date().toISOString()
      });
    }

    if (!availableDataSources || !Array.isArray(availableDataSources)) {
      return res.status(400).json({
        success: false,
        error: 'Available data sources are required.',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔍 Data source recommendation request: "${query}" from ${availableDataSources.length} sources`);
    
    // Create recommendation prompt with semantic layer context
    const recommendationPrompt = `You are an expert data analyst helping users find the right data source for their analysis needs.

Available Data Sources:
${availableDataSources.map(source => {
  const info = semanticModel?.tables?.[source];
  return `- ${source}: ${info?.description || 'Snowflake table'}
    Keywords: ${info?.keywords?.join(', ') || 'N/A'}
    Common analyses: ${info?.questions?.join(', ') || 'N/A'}`;
}).join('\n')}

User Query: "${query}"

Based on the user's query and the semantic information about each data source, provide a recommendation in this exact JSON format:
{
  "recommendedSource": "SOURCE_NAME",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of why this source is recommended",
  "analysisType": "Brief description of the type of analysis this enables",
  "alternativeSources": ["SOURCE_NAME1", "SOURCE_NAME2"],
  "keyFeatures": ["feature1", "feature2", "feature3"]
}

Rules:
1. Choose the BEST single data source that matches the query
2. Confidence should be "high" if there's a clear match, "medium" if reasonable, "low" if uncertain
3. Reasoning should explain the match in 1-2 sentences
4. Analysis type should describe what kind of analysis the user can perform
5. Alternative sources should list 1-2 other relevant options
6. Key features should list 3 relevant data points/dimensions from that source
7. Return ONLY the JSON, no other text`;

    // Call GPT-4.1 Agent Orchestrator for intelligent recommendation
    const result = await gpt4AgentOrchestrator.makeRecommendation(recommendationPrompt);
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      query: query,
      recommendation: result,
      processing_time: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data source recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ingest data into SQLite endpoint
app.post('/api/sqlite/ingest', async (req, res) => {
  try {
    console.log('📥 Starting SQLite data ingestion...');
    
    const result = await sqliteService.ingestNCCData();
    
    res.json({
      success: true,
      message: 'Data ingested successfully into SQLite',
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SQLite ingestion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// SQLite health check
app.get('/api/sqlite/health', (req, res) => {
  try {
    const health = sqliteService.healthCheck();
    
    res.json({
      service: 'SQLite Analysis Database',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      service: 'SQLite Analysis Database',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { data, analysisType, userContext, question, sessionId, backend, contextPrompt } = req.body;
    const startTime = Date.now();
    
    // Input validation
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format. Expected array of objects.',
        timestamp: new Date().toISOString()
      });
    }

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dataset is empty. Cannot perform analysis.',
        timestamp: new Date().toISOString()
      });
    }

    // Security: Use session ID for rate limiting (or IP as fallback)
    const identifier = sessionId || req.ip || 'anonymous';
    
    const questionText = question || userContext || '';
    const selectedBackend = backend || 'gpt4AgentOrchestration'; // Default to GPT-4.1 Agent Orchestration
    
    console.log(`🤖 AI Analysis request: ${data.length} rows, question: "${questionText}", backend: ${selectedBackend}, type: ${analysisType || 'general'}`);
    
    // Prepare context-enhanced question if context prompt provided
    const enhancedQuestion = contextPrompt 
      ? `${contextPrompt}\n\nUSER QUESTION: ${questionText}`
      : questionText;
    
    let result;
    
    if (selectedBackend === 'gpt4AgentOrchestration') {
      console.log('🤖 Using GPT-4.1 Agent Orchestration backend');
      result = await gpt4AgentOrchestrator.analyzeData(
        data, 
        analysisType || 'general',
        enhancedQuestion,
        identifier
      );
    } else if (selectedBackend === 'openai') {
      console.log('🤖 Using OpenAI GPT-4.1 backend');
      result = await openaiService.analyzeData(
        data, 
        analysisType || 'general',
        enhancedQuestion,
        identifier
      );
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported backend: ${selectedBackend}. Available: gpt4AgentOrchestration, openai`,
        timestamp: new Date().toISOString()
      });
    }
    
    const totalDuration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ AI Analysis completed successfully in ${totalDuration}ms`);
      res.json({
        success: true,
        analysis: result.analysis,
        python_code: result.python_code,
        results_table: result.results_table,
        visualization: result.visualization,
        refined_questions: result.refined_questions,
        metadata: {
          ...result.metadata,
          backend: selectedBackend,
          total_duration: totalDuration,
          data_rows: data.length,
          session_id: sessionId
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn(`❌ AI Analysis failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('AI analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'AI analysis service temporarily unavailable. Please check API key configuration in Vercel environment variables.',
      help: 'Set OPENAI_API_KEY in Vercel Dashboard: Settings → Environment Variables',
      timestamp: new Date().toISOString()
    });
  }
});

// Get Available Analysis Types
app.get('/api/ai/analysis-types', (req, res) => {
  try {
    const analysisTypes = [
      {
        id: 'general',
        name: 'General Analysis',
        description: 'Comprehensive data analysis with key insights and trends'
      },
      {
        id: 'trends',
        name: 'Trend Analysis', 
        description: 'Focus on temporal patterns and growth trends'
      },
      {
        id: 'segmentation',
        name: 'Customer Segmentation',
        description: 'Analyze customer behavior and segmentation patterns'
      },
      {
        id: 'performance',
        name: 'Performance Analysis',
        description: 'Evaluate business performance metrics and KPIs'
      },
      {
        id: 'comparison',
        name: 'Comparative Analysis',
        description: 'Compare different segments, time periods, or categories'
      }
    ];
    
    res.json({
      success: true,
      analysis_types: analysisTypes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analysis types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis types',
      timestamp: new Date().toISOString()
    });
  }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /api/health',
      'GET /api/status', 
      'GET /api/available-datasets',
      'POST /api/load-dataset',
      // 'POST /api/ai-query' - REMOVED (was generating mock data)
      'GET /api/dataset/:id/schema',
      'GET /api/ai/health',
      'GET /api/ai/status',
      'POST /api/ai/analyze',
      'POST /api/ai/recommend-datasource',
      'GET /api/ai/analysis-types'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  });
}

module.exports = app;