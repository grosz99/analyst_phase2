const crypto = require('crypto');

/**
 * Stateless CSRF protection for Vercel serverless functions
 * Uses JWT-like tokens that don't require server-side session storage
 */
class StatelessCSRF {
  constructor() {
    this.secret = process.env.SESSION_SECRET || 'fallback-secret-change-in-production';
    this.tokenExpiry = 1000 * 60 * 60; // 1 hour
  }

  /**
   * Generate a stateless CSRF token
   * Format: timestamp.signature
   */
  generateToken() {
    const timestamp = Date.now();
    const data = timestamp.toString();
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return `${timestamp}.${signature}`;
  }

  /**
   * Verify a stateless CSRF token
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return false;
    }

    // Check if token has expired
    if (Date.now() - timestamp > this.tokenExpiry) {
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(timestampStr)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Middleware for Express to protect routes
   */
  middleware() {
    return (req, res, next) => {
      // Skip for GET requests
      if (req.method === 'GET') {
        return next();
      }

      const token = req.headers['x-csrf-token'] || req.body._csrf;

      if (!token) {
        return res.status(403).json({
          error: 'CSRF token required',
          help: 'Include X-CSRF-Token header with your request'
        });
      }

      if (!this.verifyToken(token)) {
        return res.status(403).json({
          error: 'Invalid or expired CSRF token',
          help: 'Get a new token from /api/csrf-token'
        });
      }

      next();
    };
  }
}

module.exports = new StatelessCSRF();