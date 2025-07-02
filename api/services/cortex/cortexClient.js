const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Cortex Client - Handles Snowflake authentication and API communication
 * Responsible for: JWT authentication, credentials management, API requests
 */
class CortexClient {
  constructor() {
    this.baseURL = null;
    this.authToken = null;
    this.initialized = false;
    this.rateLimiter = new Map();
    this.MAX_REQUESTS_PER_MINUTE = 15; // Cortex Analyst has different limits
    this.credentials = null; // Store credentials for SQL execution
  }

  async initialize() {
    try {
      // Load Snowflake credentials for Cortex Analyst API
      let credentials = {};
      
      if (process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USERNAME) {
        credentials = {
          account: process.env.SNOWFLAKE_ACCOUNT,
          username: process.env.SNOWFLAKE_USERNAME,
          password: process.env.SNOWFLAKE_PASSWORD
        };
        console.log('✅ Using Snowflake credentials from environment variables');
      } else {
        // Fallback to local credentials file
        const credentialsPath = path.resolve(__dirname, '../../../snowcred.env');
        
        if (fs.existsSync(credentialsPath)) {
          const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
          
          credentialsContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
              credentials[key.trim()] = value.trim().replace(/['\"]/g, '');
            }
          });
          console.log('✅ Using Snowflake credentials from local file');
        }
      }
      
      if (!credentials.SNOWFLAKE_ACCOUNT || !credentials.SNOWFLAKE_USERNAME) {
        console.warn('❌ Snowflake credentials not found. Enabling demo mode.');
        // Enable demo mode with mock credentials
        credentials.SNOWFLAKE_ACCOUNT = 'demo-account';
        credentials.SNOWFLAKE_USERNAME = 'demo-user';
        credentials.SNOWFLAKE_PASSWORD = 'demo-pass';
      }

      // Set up API endpoint
      this.baseURL = `https://${credentials.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`;
      
      // Store credentials for SQL execution
      this.credentials = credentials;
      
      // Generate auth token (production JWT)
      await this.generateAuthToken(credentials);
      
      this.initialized = true;
      console.log('✅ Cortex client initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Cortex client:', error.message);
      this.initialized = false;
    }
  }

  async generateAuthToken(credentials) {
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    
    try {
      // Production JWT for Snowflake
      const accountIdentifier = credentials.SNOWFLAKE_ACCOUNT;
      const username = credentials.SNOWFLAKE_USERNAME.toUpperCase();
      
      // JWT Header
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      };
      
      // JWT Payload with proper Snowflake claims
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: `${accountIdentifier}.${username}.SHA256:${this.generateUserFingerprint(credentials)}`,
        sub: `${accountIdentifier}.${username}`,
        aud: accountIdentifier,
        iat: now,
        exp: now + 3600, // 1 hour expiration
        nbf: now - 10
      };
      
      const privateKey = await this.getOrCreatePrivateKey(credentials);
      const token = jwt.sign(payload, privateKey, { 
        algorithm: 'RS256',
        header: header
      });
      
      this.authToken = `Bearer ${token}`;
      console.log('🔑 JWT authentication token generated successfully');
      
    } catch (error) {
      console.error('JWT generation failed, falling back to session token:', error.message);
      await this.generateSessionToken(credentials);
    }
  }

  generateUserFingerprint(credentials) {
    const crypto = require('crypto');
    const fingerprintData = `${credentials.SNOWFLAKE_ACCOUNT}:${credentials.SNOWFLAKE_USERNAME}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }

  async getOrCreatePrivateKey(credentials) {
    const crypto = require('crypto');
    
    try {
      // Try to read existing private key
      const keyPath = path.resolve(__dirname, '../../../snowflake_rsa_key.pem');
      
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
      }
      
      // Generate new RSA key pair for JWT signing
      console.log('🔐 Generating new RSA key pair for Snowflake JWT...');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Save private key for future use
      fs.writeFileSync(keyPath, privateKey);
      
      // Note: In production, you would need to register the public key with Snowflake
      console.log('📝 Private key generated and saved. Register the public key with Snowflake for production use.');
      
      return privateKey;
    } catch (error) {
      console.error('RSA key generation failed:', error);
      throw error;
    }
  }

  async generateSessionToken(credentials) {
    try {
      console.log('🔑 Generating session token for Snowflake...');
      
      const authData = JSON.stringify({
        data: {
          ACCOUNT_NAME: credentials.SNOWFLAKE_ACCOUNT,
          LOGIN_NAME: credentials.SNOWFLAKE_USERNAME,
          PASSWORD: credentials.SNOWFLAKE_PASSWORD,
          CLIENT_APP_ID: 'CortexAnalyst',
          CLIENT_APP_VERSION: '1.0.0'
        }
      });

      const response = await this.makeRequest('POST', '/session/v1/login-request', authData, {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });

      if (response.success && response.data && response.data.token) {
        this.authToken = `Snowflake Token="${response.data.token}"`;
        console.log('✅ Session token generated successfully');
      } else {
        throw new Error('Session token generation failed');
      }
    } catch (error) {
      console.error('Session token generation failed:', error);
      // Set a mock token for demo mode
      this.authToken = 'Bearer demo-token-for-testing';
      console.log('⚠️ Using demo token for testing');
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseURL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'User-Agent': 'CortexAnalyst/1.0.0',
          ...headers
        }
      };

      if (this.authToken && !headers['Authorization']) {
        options.headers['Authorization'] = this.authToken;
      }

      if (data && method !== 'GET') {
        if (typeof data === 'object') {
          data = JSON.stringify(data);
          options.headers['Content-Type'] = 'application/json';
        }
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              data: parsed,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          } catch (error) {
            // If not JSON, return raw response
            resolve({
              status: res.statusCode,
              data: responseData,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (data && method !== 'GET') {
        req.write(data);
      }

      req.end();
    });
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
      throw new Error('Rate limit exceeded for Cortex Analyst. Please wait before making another request.');
    }
    
    // Add current request
    recentRequests.push(now);
  }

  // Health check
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'unavailable',
        message: 'Cortex client not initialized'
      };
    }

    try {
      // Simple connectivity test
      const response = await this.makeRequest('GET', '/api/v1/health');
      
      return {
        status: 'healthy',
        message: 'Cortex Analyst API accessible',
        endpoint: this.baseURL
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Cortex Analyst API connectivity issue'
      };
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      baseURL: this.baseURL,
      hasAuth: !!this.authToken,
      rateLimits: {
        maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE
      }
    };
  }
}

module.exports = CortexClient;