const express = require('express');
const cors = require('cors');
require('dotenv').config();
const snowflakeService = require('./services/snowflakeService');
const anthropicService = require('./services/anthropicService');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://analyst-phase2.vercel.app', 'https://*.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

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

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const snowflakeStatus = snowflakeService.getStatus();
    
    res.json({
      server: 'online',
      database: snowflakeStatus.connected ? 'connected' : 'disconnected',
      ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'pending',
      cache: `${snowflakeStatus.cache_size} items cached`,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      snowflake: {
        connected: snowflakeStatus.connected,
        error: snowflakeStatus.error,
        config: snowflakeStatus.config
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

// Snowflake connection test endpoint
app.get('/api/snowflake/test', async (req, res) => {
  try {
    console.log('Testing Snowflake connection via API...');
    const result = await snowflakeService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Snowflake connection successful',
        duration: result.duration,
        config: {
          account: result.account,
          database: result.database,
          schema: result.schema,
          warehouse: result.warehouse
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
    console.error('Snowflake test endpoint error:', error);
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
    message: 'Data Analysis API - Milestone 3',
    version: '1.3.0',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      snowflake_test: '/api/snowflake/test',
      available_datasets: '/api/available-datasets',
      load_dataset: 'POST /api/load-dataset',
      ai_query: 'POST /api/ai-query'
    },
    documentation: 'https://github.com/grosz99/analyst_phase2'
  });
});

// Mock data for testing
const mockDatasets = [
  {
    id: 'sales_data',
    name: 'Sales Data',
    description: 'Historical sales transactions and performance metrics',
    tables: ['sales_transactions', 'customer_data', 'product_catalog'],
    row_count: 2400000,
    last_updated: '2024-06-15T10:30:00Z'
  },
  {
    id: 'customer_data',
    name: 'Customer Data',
    description: 'Customer demographics and behavior analytics',
    tables: ['customers', 'customer_segments', 'customer_journey'],
    row_count: 150000,
    last_updated: '2024-06-14T15:45:00Z'
  },
  {
    id: 'product_data',
    name: 'Product Data',
    description: 'Product catalog and inventory management',
    tables: ['products', 'inventory', 'suppliers'],
    row_count: 85000,
    last_updated: '2024-06-16T09:15:00Z'
  }
];

const mockColumns = {
  sales_data: [
    { name: 'date', type: 'Date', category: 'dimension' },
    { name: 'region', type: 'String', category: 'dimension' },
    { name: 'product', type: 'String', category: 'dimension' },
    { name: 'customer_segment', type: 'String', category: 'dimension' },
    { name: 'revenue', type: 'Number', category: 'metric' },
    { name: 'units_sold', type: 'Number', category: 'metric' },
    { name: 'profit_margin', type: 'Number', category: 'metric' }
  ],
  customer_data: [
    { name: 'customer_id', type: 'String', category: 'dimension' },
    { name: 'age_group', type: 'String', category: 'dimension' },
    { name: 'location', type: 'String', category: 'dimension' },
    { name: 'acquisition_date', type: 'Date', category: 'dimension' },
    { name: 'lifetime_value', type: 'Number', category: 'metric' },
    { name: 'purchase_frequency', type: 'Number', category: 'metric' }
  ],
  product_data: [
    { name: 'product_id', type: 'String', category: 'dimension' },
    { name: 'category', type: 'String', category: 'dimension' },
    { name: 'brand', type: 'String', category: 'dimension' },
    { name: 'launch_date', type: 'Date', category: 'dimension' },
    { name: 'price', type: 'Number', category: 'metric' },
    { name: 'units_available', type: 'Number', category: 'metric' }
  ]
};

// Get available datasets
app.get('/api/available-datasets', async (req, res) => {
  try {
    console.log('Fetching available datasets...');
    const startTime = Date.now();
    
    // Try to get real Snowflake tables first
    try {
      const snowflakeTables = await snowflakeService.discoverTables();
      const duration = Date.now() - startTime;
      
      console.log(`Retrieved ${snowflakeTables.length} Snowflake tables in ${duration}ms`);
      
      res.json({
        success: true,
        datasets: snowflakeTables,
        total_count: snowflakeTables.length,
        timestamp: new Date().toISOString(),
        source: 'snowflake',
        performance: {
          duration: duration,
          cached: duration < 1000 // Fast response likely from cache
        }
      });
      
    } catch (snowflakeError) {
      console.warn('Snowflake unavailable, using mock data:', snowflakeError.message);
      
      // Fallback to mock data
      const duration = Date.now() - startTime;
      res.json({
        success: true,
        datasets: mockDatasets,
        total_count: mockDatasets.length,
        timestamp: new Date().toISOString(),
        source: 'mock_fallback',
        snowflake_error: snowflakeError.message,
        performance: {
          duration: duration
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
    console.log(`Loading dataset ${datasetId} with selections:`, userSelections);
    const startTime = Date.now();
    
    if (!datasetId) {
      return res.status(400).json({
        success: false,
        error: 'datasetId is required'
      });
    }

    // Try Snowflake first
    try {
      // Get schema and full analysis data from Snowflake
      const analysisRowLimit = userSelections.analysisMode ? 5000 : 1000; // Load more data for AI analysis
      const [schema, analysisData] = await Promise.all([
        snowflakeService.discoverColumns(datasetId),
        snowflakeService.sampleData(datasetId, userSelections.columns, analysisRowLimit)
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`Loaded Snowflake dataset ${datasetId} with ${analysisData.length} rows in ${duration}ms`);
      
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
        message: `Loaded ${datasetId.toUpperCase()} with ${schema.total_columns} columns (${analysisData.length} rows) from Snowflake`,
        processing_time: duration,
        timestamp: new Date().toISOString(),
        source: 'snowflake',
        performance: {
          duration: duration,
          rows_sampled: analysisData.length
        }
      };

      res.json(result);
      
    } catch (snowflakeError) {
      console.warn(`Snowflake dataset loading failed for ${datasetId}, using mock:`, snowflakeError.message);
      
      // Fallback to mock data
      const dataset = mockDatasets.find(d => d.id === datasetId);
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: 'Dataset not found'
        });
      }

      const columns = mockColumns[datasetId] || [];
      const duration = Date.now() - startTime;
      
      const mockResult = {
        success: true,
        dataset_id: datasetId,
        schema: {
          columns: columns,
          row_count: Math.floor(dataset.row_count * (userSelections.sample_rate || 1)),
          memory_usage: Math.round((dataset.row_count / 10000) * (userSelections.sample_rate || 1))
        },
        filters_applied: userSelections,
        message: `Loaded ${dataset.name} with ${columns.length} columns (fallback mode)`,
        processing_time: duration,
        timestamp: new Date().toISOString(),
        source: 'mock_fallback',
        snowflake_error: snowflakeError.message
      };

      res.json(mockResult);
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

// AI-powered natural language query
app.post('/api/ai-query', (req, res) => {
  try {
    const { query, datasetId } = req.body;
    
    if (!query || !datasetId) {
      return res.status(400).json({
        success: false,
        error: 'query and datasetId are required'
      });
    }

    const dataset = mockDatasets.find(d => d.id === datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not loaded. Please load dataset first.'
      });
    }

    // Generate mock response based on query keywords
    const generateMockResponse = (query, datasetId) => {
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('top') || queryLower.includes('highest') || queryLower.includes('best')) {
        return {
          data: [
            { region: 'North America', total_revenue: 42500000, growth: 12.5 },
            { region: 'Europe', total_revenue: 38900000, growth: 8.3 },
            { region: 'Asia Pacific', total_revenue: 45600000, growth: 15.7 },
            { region: 'Latin America', total_revenue: 23400000, growth: 6.2 },
            { region: 'Middle East', total_revenue: 18700000, growth: 4.1 }
          ],
          summary: 'Top 5 regions by revenue with growth rates',
          chart_type: 'bar',
          insights: ['Asia Pacific leads with highest revenue and growth', 'North America shows strong performance', 'Middle East has potential for improvement']
        };
      }
      
      if (queryLower.includes('trend') || queryLower.includes('growth') || queryLower.includes('time')) {
        return {
          data: [
            { month: 'Jan 2024', revenue: 8200000, growth: 5.2 },
            { month: 'Feb 2024', revenue: 7800000, growth: -4.9 },
            { month: 'Mar 2024', revenue: 9100000, growth: 16.7 },
            { month: 'Apr 2024', revenue: 9500000, growth: 4.4 },
            { month: 'May 2024', revenue: 10200000, growth: 7.4 },
            { month: 'Jun 2024', revenue: 11100000, growth: 8.8 }
          ],
          summary: 'Monthly revenue trends with growth analysis',
          chart_type: 'line',
          insights: ['Strong growth trajectory overall', 'February dip recovered quickly', 'Acceleration in Q2']
        };
      }

      if (queryLower.includes('product') || queryLower.includes('category')) {
        return {
          data: [
            { product: 'Electronics', revenue: 45600000, margin: 24.5, units: 125000 },
            { product: 'Clothing', revenue: 32100000, margin: 18.2, units: 89000 },
            { product: 'Home & Garden', revenue: 28900000, margin: 21.7, units: 67000 },
            { product: 'Sports', revenue: 21400000, margin: 19.8, units: 45000 },
            { product: 'Books', revenue: 12300000, margin: 15.4, units: 78000 }
          ],
          summary: 'Product performance by revenue and margin',
          chart_type: 'scatter',
          insights: ['Electronics dominates revenue', 'Books have lower margins but high volume', 'Home & Garden shows balanced performance']
        };
      }

      // Default response
      return {
        data: [
          { metric: 'Total Revenue', value: 168900000, change: 8.7 },
          { metric: 'Total Customers', value: 145000, change: 12.3 },
          { metric: 'Avg Order Value', value: 89.50, change: -2.1 },
          { metric: 'Customer Retention', value: 73.2, change: 4.8 }
        ],
        summary: 'Key business metrics overview',
        chart_type: 'kpi',
        insights: ['Overall positive growth', 'Customer base expanding', 'Order value needs attention']
      };
    };

    // Simulate AI processing time
    setTimeout(() => {
      const mockPythonCode = `
# Generated analysis for: "${query}"
import polars as pl

# Filter and aggregate data
result = df.group_by("region").agg([
    pl.col("revenue").sum().alias("total_revenue"),
    pl.col("revenue").mean().alias("avg_revenue")
]).sort("total_revenue", descending=True)

# Format output
result = result.head(5)`.trim();

      const response = {
        success: true,
        result: generateMockResponse(query, datasetId),
        python_code: mockPythonCode,
        cached: false,
        execution_time: Math.random() * 1500 + 500,
        query_interpretation: `Analyzing ${query} across ${dataset.name}`,
        timestamp: new Date().toISOString(),
        source: 'mock_ai'
      };

      res.json(response);
    }, 1200); // Simulate AI processing time
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get dataset schema/columns
app.get('/api/dataset/:datasetId/schema', async (req, res) => {
  try {
    const { datasetId } = req.params;
    console.log(`Getting schema for dataset: ${datasetId}`);
    const startTime = Date.now();
    
    // Try Snowflake first
    try {
      const schema = await snowflakeService.discoverColumns(datasetId);
      const duration = Date.now() - startTime;
      
      console.log(`Retrieved schema for ${datasetId} in ${duration}ms`);
      
      res.json({
        success: true,
        dataset_id: datasetId,
        dataset_name: datasetId.toUpperCase(),
        schema: schema,
        timestamp: new Date().toISOString(),
        source: 'snowflake',
        performance: {
          duration: duration,
          cached: duration < 500
        }
      });
      
    } catch (snowflakeError) {
      console.warn(`Snowflake schema unavailable for ${datasetId}, using mock:`, snowflakeError.message);
      
      // Fallback to mock data
      const dataset = mockDatasets.find(d => d.id === datasetId);
      if (!dataset) {
        return res.status(404).json({
          success: false,
          error: 'Dataset not found'
        });
      }

      const columns = mockColumns[datasetId] || [];
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        dataset_id: datasetId,
        dataset_name: dataset.name,
        schema: {
          columns: columns,
          total_columns: columns.length,
          dimensions: columns.filter(c => c.category === 'dimension').length,
          metrics: columns.filter(c => c.category === 'metric').length
        },
        timestamp: new Date().toISOString(),
        source: 'mock_fallback',
        snowflake_error: snowflakeError.message,
        performance: {
          duration: duration
        }
      });
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

// AI Analysis Health Check
app.get('/api/ai/health', async (req, res) => {
  try {
    const healthStatus = await anthropicService.healthCheck();
    res.json({
      success: true,
      ai_service: healthStatus,
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

// AI Analysis Status
app.get('/api/ai/status', (req, res) => {
  try {
    const status = anthropicService.getStatus();
    res.json({
      success: true,
      status: status,
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

// Main AI Analysis Endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { data, analysisType, userContext, question, sessionId } = req.body;
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
    console.log(`🤖 AI Analysis request: ${data.length} rows, question: "${questionText}", type: ${analysisType || 'general'}`);
    
    // Perform secure AI analysis
    const result = await anthropicService.analyzeData(
      data, 
      analysisType || 'general',
      questionText,
      identifier
    );
    
    const totalDuration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ AI Analysis completed successfully in ${totalDuration}ms`);
      res.json({
        success: true,
        analysis: result.analysis,
        results_table: result.results_table,
        visualization: result.visualization,
        refined_questions: result.refined_questions,
        metadata: {
          ...result.metadata,
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
      error: 'AI analysis service temporarily unavailable',
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
      'POST /api/ai-query',
      'GET /api/dataset/:id/schema',
      'GET /api/ai/health',
      'GET /api/ai/status',
      'POST /api/ai/analyze',
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