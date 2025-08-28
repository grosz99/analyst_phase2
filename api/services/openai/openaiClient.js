const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

/**
 * OpenAI GPT-4.1 API Client - Handles authentication, rate limiting, and security
 * Responsible for: API initialization, credentials management, rate limiting, health checks
 * Supports: GPT-4.1 function calling, structured outputs, and advanced reasoning
 */
class OpenAIClient {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.rateLimiter = new Map(); // Simple rate limiting
    this.MAX_REQUESTS_PER_MINUTE = 30; // Higher rate limit for GPT-4.1
    this.MAX_DATA_ROWS = 2000; // Increased for GPT-4.1's better context handling
    this.MAX_PROMPT_LENGTH = 100000; // GPT-4.1 handles longer prompts
    
    this.initializeClient();
  }

  initializeClient() {
    try {
      let apiKey = null;

      // Try environment variable first (for production/Vercel)
      if (process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
        console.log('✅ Using OpenAI API key from environment variable');
      } else {
        // Fallback to local credentials file (for development)
        const credentialsPath = path.resolve(__dirname, '../../../snowcred.env');
        
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

          apiKey = credentials.OPENAI_API_KEY;
          if (apiKey) {
            console.log('✅ Using OpenAI API key from local credentials file');
          }
        }
      }
      
      if (!apiKey) {
        console.error('❌ OPENAI_API_KEY not found. AI analysis will be disabled.');
        console.error('Please set OPENAI_API_KEY environment variable in Vercel settings.');
        console.error('For Vercel deployment: Settings → Environment Variables → Add OPENAI_API_KEY');
        this.initialized = false;
        return;
      }

      // Validate API key format (basic security check)
      if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
        console.error('Invalid OpenAI API key format. AI analysis will be disabled.');
        return;
      }

      this.client = new OpenAI({
        apiKey: apiKey,
        timeout: 60000, // 60 second timeout for GPT-4.1
        maxRetries: 3, // Higher retry count for reliability
      });

      this.initialized = true;
      console.log('✅ OpenAI GPT-4.1 API service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize OpenAI service:', error.message);
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
      throw new Error('Dataset cannot be empty');
    }
    
    if (data.length > this.MAX_DATA_ROWS) {
      console.warn(`Dataset too large (${data.length} rows). Limiting to ${this.MAX_DATA_ROWS} rows.`);
      data = data.slice(0, this.MAX_DATA_ROWS);
    }
    
    // Basic sanitization - remove potentially dangerous content
    const sanitized = data.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        
        // Skip null/undefined values
        if (value === null || value === undefined) {
          cleanRow[key] = null;
          return;
        }
        
        // Convert to string and clean
        let cleanValue = String(value);
        
        // Remove potential script tags and other dangerous content
        cleanValue = cleanValue
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
        
        // Truncate very long strings
        if (cleanValue.length > 1000) {
          cleanValue = cleanValue.substring(0, 1000) + '...';
        }
        
        cleanRow[key] = cleanValue;
      });
      return cleanRow;
    });
    
    return sanitized;
  }

  // Sanitize user context to prevent prompt injection
  sanitizeUserContext(userContext) {
    if (!userContext || typeof userContext !== 'string') {
      throw new Error('User context must be a non-empty string');
    }
    
    if (userContext.length > this.MAX_PROMPT_LENGTH) {
      throw new Error(`User context too long. Maximum ${this.MAX_PROMPT_LENGTH} characters allowed.`);
    }
    
    // Remove potential prompt injection attempts
    let cleaned = userContext
      .replace(/\b(ignore|forget|disregard)\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi, '')
      .replace(/\b(system|assistant|user):\s*/gi, '')
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks that might contain instructions
      .trim();
    
    if (cleaned.length === 0) {
      throw new Error('User context cannot be empty after sanitization');
    }
    
    return cleaned;
  }

  // Send message to OpenAI GPT-4.1 API with function calling support
  async sendMessage(messages, options = {}) {
    if (!this.initialized) {
      throw new Error('OpenAI service not initialized. Please check OPENAI_API_KEY is set in environment variables.');
    }

    const {
      model = 'gpt-4-1106-preview', // Latest GPT-4.1 model
      maxTokens = 4000,
      temperature = 0.1, // Lower temperature for more consistent analysis
      functions = null,
      function_call = null,
      response_format = null // For structured outputs
    } = options;

    try {
      const requestOptions = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false,
        timeout: 30000 // 30 second timeout
      };

      // Add function calling support
      if (functions) {
        requestOptions.functions = functions;
        if (function_call) {
          requestOptions.function_call = function_call;
        }
      }

      // Add structured output support
      if (response_format) {
        requestOptions.response_format = response_format;
      }

      const response = await this.client.chat.completions.create(requestOptions);

      return response;
    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(`OpenAI API request failed: ${error.message}`);
    }
  }

  // Send message with function calling for agent orchestration
  async sendMessageWithFunctions(messages, functions, options = {}) {
    const functionCallOptions = {
      ...options,
      functions: functions,
      function_call: options.function_call || 'auto'
    };

    return this.sendMessage(messages, functionCallOptions);
  }

  // Send message with structured output for semantic models
  async sendMessageWithStructuredOutput(messages, responseSchema, options = {}) {
    const structuredOptions = {
      ...options,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analysis_response",
          schema: responseSchema
        }
      }
    };

    return this.sendMessage(messages, structuredOptions);
  }

  // Health check method
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'unavailable',
        message: 'OpenAI service not initialized. Missing OPENAI_API_KEY environment variable.'
      };
    }

    try {
      // Simple test to verify API connectivity
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{
          role: 'user',
          content: 'Say "OK" if you can respond.'
        }],
        max_tokens: 10
      });

      return {
        status: 'healthy',
        message: 'OpenAI GPT-4.1 API accessible',
        model: 'gpt-4-1106-preview',
        response: response.choices[0]?.message?.content || 'No response'
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'OpenAI API connectivity issue',
        error: error.message
      };
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      model: 'gpt-4-1106-preview',
      capabilities: [
        'Function calling',
        'Structured outputs',
        'Long context window',
        'Advanced reasoning',
        'Code generation'
      ],
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

module.exports = OpenAIClient;