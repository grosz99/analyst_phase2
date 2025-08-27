class APIClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 
      (import.meta.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001');
    
    this.csrfToken = null;
    console.log(`🔗 API Client initialized with baseURL: ${this.baseURL}`);
  }

  // Get CSRF token from server
  async getCSRFToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Important for session cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }

      const data = await response.json();
      this.csrfToken = data.csrfToken;
      console.log('✅ CSRF token obtained');
      return this.csrfToken;
    } catch (error) {
      console.warn('⚠️ Failed to get CSRF token:', error.message);
      return null;
    }
  }

  // Make a secure POST request with CSRF protection
  async securePost(endpoint, data) {
    // Get CSRF token if we don't have one (works for both dev and production)
    if (!this.csrfToken) {
      await this.getCSRFToken();
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add CSRF token if available
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        credentials: 'include', // Important for session cookies
        body: JSON.stringify(data)
      });

      // If CSRF token is invalid, try to get a new one and retry
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('CSRF')) {
          console.log('🔄 CSRF token expired, getting new token...');
          await this.getCSRFToken();
          
          // Retry with new token
          if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
            
            const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
              method: 'POST',
              headers: headers,
              credentials: 'include',
              body: JSON.stringify(data)
            });

            return retryResponse;
          }
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Secure POST request failed:', error);
      throw error;
    }
  }

  // Make a regular GET request
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
      });

      return response;
    } catch (error) {
      console.error('❌ GET request failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const apiClient = new APIClient();
export default apiClient;