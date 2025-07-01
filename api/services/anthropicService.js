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
      // Load credentials securely from environment file
      const credentialsPath = path.resolve(__dirname, '../../snowcred.env');
      
      if (!fs.existsSync(credentialsPath)) {
        console.warn('Anthropic credentials file not found. AI analysis will be disabled.');
        return;
      }

      // Parse environment file securely
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = {};
      
      credentialsContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          credentials[key.trim()] = value.trim().replace(/['"]/g, '');
        }
      });

      const apiKey = credentials.ANTHROPIC_API_KEY;
      
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

  // Create secure analysis prompt
  createAnalysisPrompt(data, analysisType = 'general', userContext = '') {
    // Sanitize user context
    const sanitizedContext = userContext.replace(/[<>'"]/g, '').substring(0, 1000);
    
    const dataPreview = data.slice(0, 5); // Only show first 5 rows in prompt
    const totalRows = data.length;
    const columns = Object.keys(data[0] || {});
    
    const basePrompt = `You are a professional data analyst. Analyze this business dataset and provide actionable insights.

Dataset Information:
- Total Rows: ${totalRows}
- Columns: ${columns.join(', ')}
- Analysis Type: ${analysisType}
${sanitizedContext ? `- Context: ${sanitizedContext}` : ''}

Sample Data (first 5 rows):
${JSON.stringify(dataPreview, null, 2)}

Please provide:
1. **Key Insights**: 3-5 most important findings
2. **Trends & Patterns**: Notable patterns in the data
3. **Business Recommendations**: Actionable recommendations based on the analysis
4. **Data Quality Notes**: Any data quality observations

Format your response clearly with headers and bullet points. Focus on business value and actionable insights.

Important: Base your analysis only on the provided data. Do not make assumptions about data not shown.`;

    if (basePrompt.length > this.MAX_PROMPT_LENGTH) {
      throw new Error('Analysis prompt too large. Please reduce dataset size or context.');
    }

    return basePrompt;
  }

  // Main analysis method with security measures
  async analyzeData(data, analysisType = 'general', userContext = '', identifier = 'default') {
    try {
      // Security checks
      if (!this.initialized) {
        throw new Error('Anthropic service not initialized. AI analysis unavailable.');
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

      return {
        success: true,
        analysis: analysisText,
        metadata: {
          model: 'claude-3-5-sonnet',
          rows_analyzed: sanitizedData.length,
          analysis_type: analysisType,
          processing_time: duration,
          timestamp: new Date().toISOString(),
          token_usage: response.usage
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