class AIAnalysisService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '' // Use relative URLs in production
      : 'http://localhost:3001';
  }

  // Get available analysis types
  async getAnalysisTypes() {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/analysis-types`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.analysis_types;
      } else {
        throw new Error(result.error || 'Failed to fetch analysis types');
      }
    } catch (error) {
      console.error('Failed to get analysis types:', error);
      // Return fallback analysis types
      return [
        {
          id: 'general',
          name: 'General Analysis',
          description: 'Comprehensive data analysis with key insights and trends'
        }
      ];
    }
  }

  // Check AI service health
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI health check failed:', error);
      return {
        success: false,
        error: 'AI service unavailable'
      };
    }
  }

  // Get AI service status
  async getStatus() {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get AI status:', error);
      return {
        success: false,
        error: 'Unable to get AI status'
      };
    }
  }

  // Main AI analysis method
  async analyzeData(data, question = '', analysisType = 'general', sessionId = null) {
    try {
      console.log(`🤖 Starting AI analysis: ${question || analysisType}`);
      console.log(`📊 Data: ${data.length} rows`);
      
      const payload = {
        data: data,
        analysisType: analysisType,
        userContext: question || `Perform ${analysisType} analysis on this business data`,
        sessionId: sessionId || `session-${Date.now()}`
      };

      const response = await fetch(`${this.baseURL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ AI analysis completed in ${result.metadata?.total_duration}ms`);
        
        // Parse analysis for actionable insights
        const parsedAnalysis = this.parseAnalysis(result.analysis, data);
        
        return {
          success: true,
          analysis: result.analysis,
          results_table: result.results_table,
          visualization: result.visualization,
          parsedAnalysis: parsedAnalysis,
          metadata: result.metadata,
          timestamp: result.timestamp
        };
      } else {
        throw new Error(result.error || 'AI analysis failed');
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Parse AI analysis response to extract insights and data
  parseAnalysis(analysisText, originalData) {
    const parsed = {
      keyInsights: [],
      recommendations: [],
      trends: [],
      dataQuality: [],
      rawText: analysisText
    };

    try {
      // Split analysis into sections
      const sections = analysisText.split(/\n\s*\n/);
      
      sections.forEach(section => {
        const lowerSection = section.toLowerCase();
        
        if (lowerSection.includes('key insights') || lowerSection.includes('findings')) {
          const insights = this.extractBulletPoints(section);
          parsed.keyInsights.push(...insights);
        }
        
        if (lowerSection.includes('recommendations') || lowerSection.includes('actionable')) {
          const recommendations = this.extractBulletPoints(section);
          parsed.recommendations.push(...recommendations);
        }
        
        if (lowerSection.includes('trends') || lowerSection.includes('patterns')) {
          const trends = this.extractBulletPoints(section);
          parsed.trends.push(...trends);
        }
        
        if (lowerSection.includes('data quality') || lowerSection.includes('quality notes')) {
          const quality = this.extractBulletPoints(section);
          parsed.dataQuality.push(...quality);
        }
      });

      // If no structured insights found, extract from full text
      if (parsed.keyInsights.length === 0) {
        parsed.keyInsights = this.extractBulletPoints(analysisText).slice(0, 5);
      }

    } catch (error) {
      console.error('Error parsing analysis:', error);
    }

    return parsed;
  }

  // Extract bullet points from text
  extractBulletPoints(text) {
    const points = [];
    
    // Look for various bullet point patterns
    const patterns = [
      /(?:^|\n)\s*[-•*]\s*([^\n]+)/g,
      /(?:^|\n)\s*\d+\.\s*([^\n]+)/g,
      /(?:^|\n)\s*(?:✓|✅|▶)\s*([^\n]+)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const point = match[1].trim();
        if (point && point.length > 10 && !points.includes(point)) {
          points.push(point);
        }
      }
    });
    
    return points;
  }

  // Generate analysis questions based on data
  generateSuggestedQuestions(data) {
    if (!data || data.length === 0) return [];
    
    const columns = Object.keys(data[0] || {});
    const questions = [];
    
    // Look for common business patterns
    if (columns.some(col => col.toLowerCase().includes('customer'))) {
      questions.push('Who are our most profitable customers?');
      questions.push('What are the customer behavior patterns?');
    }
    
    if (columns.some(col => col.toLowerCase().includes('product'))) {
      questions.push('Which products perform best?');
      questions.push('What are the product category trends?');
    }
    
    if (columns.some(col => col.toLowerCase().includes('sales') || col.toLowerCase().includes('revenue'))) {
      questions.push('What are our sales trends over time?');
      questions.push('Which regions drive the most revenue?');
    }
    
    if (columns.some(col => col.toLowerCase().includes('date') || col.toLowerCase().includes('time'))) {
      questions.push('What are the seasonal patterns?');
      questions.push('How has performance changed over time?');
    }
    
    // Add general questions
    questions.push('What are the key insights from this data?');
    questions.push('What recommendations can improve performance?');
    
    return questions.slice(0, 6); // Return top 6 questions
  }

  // Export data to CSV
  exportToCSV(data, filename = 'analysis_data') {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  // Export data to JSON
  exportToJSON(data, filename = 'analysis_data') {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  // Download file helper
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
const aiAnalysisService = new AIAnalysisService();
export default aiAnalysisService;