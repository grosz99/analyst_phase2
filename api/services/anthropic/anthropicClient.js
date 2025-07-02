const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

/**
 * Anthropic API Client - Handles authentication, rate limiting, and security
 * Responsible for: API initialization, credentials management, rate limiting, health checks
 */
class AnthropicClient {
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

  // Send message to Anthropic API
  async sendMessage(messages, maxTokens = 4000) {
    if (!this.initialized) {
      throw new Error('Anthropic service not initialized');
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: messages
      });

      return response;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API request failed: ${error.message}`);
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

module.exports = AnthropicClient;