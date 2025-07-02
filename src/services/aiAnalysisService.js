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

  // Get available backends
  async getAvailableBackends() {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/backends`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.backends;
      } else {
        throw new Error(result.error || 'Failed to fetch available backends');
      }
    } catch (error) {
      console.error('Failed to get available backends:', error);
      // Return fallback backends
      return [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          description: 'Advanced AI analysis with custom pandas execution',
          features: ['Natural language understanding', 'Python code generation'],
          status: 'available'
        }
      ];
    }
  }

  // Main AI analysis method
  async analyzeData(data, question = '', analysisType = 'general', sessionId = null, backend = 'anthropic') {
    try {
      console.log(`🤖 Starting AI analysis: ${question || analysisType}`);
      console.log(`📊 Data: ${data.length} rows`);
      
      const payload = {
        data: data,
        analysisType: analysisType,
        userContext: question || `Perform ${analysisType} analysis on this business data`,
        sessionId: sessionId || `session-${Date.now()}`,
        backend: backend
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
          python_code: result.python_code,
          results_table: result.results_table,
          visualization: result.visualization,
          refined_questions: result.refined_questions,
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

  // Generate analysis questions based on ACTUAL data structure and values
  generateSuggestedQuestions(data) {
    if (!data || data.length === 0) return [];
    
    const columns = Object.keys(data[0] || {});
    const questions = [];
    
    // Analyze actual data to generate relevant questions
    const dataProfile = this.analyzeDataStructure(data);
    
    // Questions based on actual categorical columns and their values
    if (dataProfile.categoricalColumns.length > 0) {
      const mainCategorical = dataProfile.categoricalColumns[0];
      const sampleValues = this.getTopValues(data, mainCategorical, 3);
      
      if (sampleValues.length > 0) {
        questions.push(`Which ${mainCategorical.toLowerCase()} has the highest values?`);
        questions.push(`How do different ${mainCategorical.toLowerCase()} compare?`);
      }
    }
    
    // Questions based on actual numeric columns  
    if (dataProfile.numericColumns.length > 0) {
      const mainNumeric = dataProfile.numericColumns[0];
      questions.push(`What is the distribution of ${mainNumeric.toLowerCase()}?`);
      
      if (dataProfile.categoricalColumns.length > 0) {
        questions.push(`How does ${mainNumeric.toLowerCase()} vary by ${dataProfile.categoricalColumns[0].toLowerCase()}?`);
      }
    }
    
    // Questions based on actual date patterns
    if (dataProfile.dateColumns.length > 0) {
      const dateRange = this.getDateRange(data, dataProfile.dateColumns[0]);
      if (dateRange.years > 1) {
        questions.push(`What are the trends from ${dateRange.startYear} to ${dateRange.endYear}?`);
      }
      questions.push(`How has activity changed over time?`);
    }
    
    // Count-based questions using actual data size
    const recordCount = data.length;
    if (recordCount > 100) {
      questions.push(`What patterns exist across all ${recordCount} records?`);
    }
    
    // Add one generic fallback
    questions.push('What are the key insights from this dataset?');
    
    return questions.slice(0, 6); // Return top 6 questions
  }
  
  // Analyze actual data structure and values
  analyzeDataStructure(data) {
    const sample = data[0] || {};
    const columns = Object.keys(sample);
    
    const profile = {
      categoricalColumns: [],
      numericColumns: [],
      dateColumns: [],
      textColumns: []
    };
    
    columns.forEach(col => {
      const values = data.slice(0, 100).map(row => row[col]).filter(v => v != null);
      const uniqueValues = [...new Set(values)];
      
      // Check if it's a date column
      if (this.isDateColumn(values)) {
        profile.dateColumns.push(col);
      }
      // Check if it's numeric
      else if (this.isNumericColumn(values)) {
        profile.numericColumns.push(col);
      }
      // Check if it's categorical (reasonable number of unique values)
      else if (uniqueValues.length <= Math.min(20, data.length * 0.5)) {
        profile.categoricalColumns.push(col);
      }
      // Otherwise it's text
      else {
        profile.textColumns.push(col);
      }
    });
    
    return profile;
  }
  
  // Get top values from a categorical column
  getTopValues(data, column, limit = 5) {
    const counts = {};
    data.forEach(row => {
      const value = row[column];
      if (value != null) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([value]) => value);
  }
  
  // Get date range from data
  getDateRange(data, dateColumn) {
    const dates = data.map(row => new Date(row[dateColumn]))
      .filter(date => !isNaN(date.getTime()));
    
    if (dates.length === 0) return { years: 0 };
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return {
      startYear: minDate.getFullYear(),
      endYear: maxDate.getFullYear(),
      years: maxDate.getFullYear() - minDate.getFullYear()
    };
  }
  
  // Check if column contains dates
  isDateColumn(values) {
    const sampleSize = Math.min(values.length, 10);
    let dateCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const date = new Date(values[i]);
      if (!isNaN(date.getTime())) {
        dateCount++;
      }
    }
    
    return dateCount / sampleSize > 0.7; // 70% of values are valid dates
  }
  
  // Check if column contains numbers
  isNumericColumn(values) {
    const sampleSize = Math.min(values.length, 10);
    let numCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      if (!isNaN(parseFloat(values[i])) && isFinite(values[i])) {
        numCount++;
      }
    }
    
    return numCount / sampleSize > 0.7; // 70% of values are numeric
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