import apiClient from '../utils/apiClient.js';

class AIAnalysisService {
  constructor() {
    // Use environment variable if available, otherwise fallback based on environment
    this.baseURL = import.meta.env.VITE_API_URL || 
      (import.meta.env.NODE_ENV === 'production' 
        ? window.location.origin // Use current domain in production
        : 'http://localhost:3001');
    
    console.log(`🔗 AI Analysis Service initialized with baseURL: ${this.baseURL}`);
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


  // Main AI analysis method with dataset-specific context
  async analyzeData(data, question = '', analysisType = 'general', sessionId = null, backend = 'gpt4AgentOrchestration', contextPrompt = null, datasetId = null) {
    try {
      console.log(`🤖 Starting AI analysis: ${question || analysisType}`);
      console.log(`📊 Data: ${data.length} rows`);
      if (contextPrompt) {
        console.log(`📝 Context mode active:`, contextPrompt.split('\n')[0]);
      }
      
      // Generate dataset-specific context if datasetId is provided
      const datasetContext = this.getDatasetSpecificContext(datasetId, data);
      const enhancedContextPrompt = contextPrompt || datasetContext;
      
      const payload = {
        data: data,
        analysisType: analysisType,
        userContext: question || `Perform ${analysisType} analysis on this business data`,
        sessionId: sessionId || `session-${Date.now()}`,
        backend: backend,
        contextPrompt: enhancedContextPrompt,
        datasetId: datasetId // Include dataset ID for specialized handling
      };

      const response = await apiClient.securePost('/api/ai/analyze', payload);

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

  // Get data source recommendation from Anthropic API
  async getDataSourceRecommendation(query, availableDataSources, semanticModel) {
    try {
      console.log(`🔍 Getting AI recommendation for: "${query}"`);
      console.log(`📡 API endpoint: ${this.baseURL}/api/ai/recommend-datasource`);
      
      const response = await apiClient.securePost('/api/ai/recommend-datasource', {
        query,
        availableDataSources,
        semanticModel
      });

      console.log(`📊 API Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Received AI recommendation:', result.recommendation);
        return result.recommendation;
      } else {
        throw new Error(result.error || 'Failed to get recommendation');
      }
    } catch (error) {
      console.error('❌ Failed to get data source recommendation:', error);
      console.error('Error details:', {
        message: error.message,
        baseURL: this.baseURL,
        query: query,
        availableDataSources: availableDataSources
      });
      
      // Return fallback recommendation with better reasoning
      return {
        recommendedSource: availableDataSources[0] || 'NCC',
        confidence: 'low',
        reasoning: `Connection issue: ${error.message}. Using best guess based on query keywords.`,
        analysisType: 'general analysis',
        alternativeSources: availableDataSources.slice(1, 3),
        keyFeatures: ['General data fields']
      };
    }
  }

  // Generate dataset-specific AI context for better analysis consistency
  getDatasetSpecificContext(datasetId, data) {
    if (!datasetId || !data || data.length === 0) {
      return null;
    }

    const datasetContexts = {
      'attendance': {
        name: 'Office Attendance Data',
        description: 'Global office attendance tracking with headcount, presence rates, and organizational cohorts',
        keyMetrics: ['headcount', 'people_attended', 'attendance_rate', 'absence_count'],
        keyDimensions: ['office', 'date', 'cohort', 'org'],
        analysisGuidance: `
ATTENDANCE DATA ANALYSIS INSTRUCTIONS:
- This dataset tracks office attendance across global locations
- Key metrics: headcount (total capacity), people_attended (actual attendance), attendance_rate (percentage)
- Key dimensions: office (location), date (time period), cohort (org group), org (organization)
- When analyzing "top offices", rank by total attendance, attendance_rate, or utilization
- Always include attendance_rate calculations when comparing offices
- Focus on trends over time, utilization patterns, and cohort differences
- Ensure numeric aggregations use actual attendance values, not zeros
        `
      },
      'ncc': {
        name: 'Net Cash Contribution (NCC) Financial Data',
        description: 'Project profitability tracking showing financial performance by office, region, sector, and client',
        keyMetrics: ['timesheet_charges', 'adjustments', 'ncc', 'adjustment_rate'],
        keyDimensions: ['office', 'region', 'sector', 'month', 'client', 'project_id', 'year'],
        analysisGuidance: `
NCC FINANCIAL DATA ANALYSIS INSTRUCTIONS:
- This dataset tracks Net Cash Contribution (profitability) for projects
- Key metrics: timesheet_charges (billable hours), adjustments (corrections), ncc (net profit), adjustment_rate
- Key dimensions: office (location), region (geographic area), sector (industry), client, project_id
- When analyzing "top offices", rank by total NCC (net cash contribution) values
- NCC = timesheet_charges + adjustments (can be positive or negative)
- Focus on profitability trends, sector performance, regional differences
- Always aggregate NCC values properly - sum timesheet_charges and adjustments
- Include adjustment_rate analysis to show billing accuracy
        `
      },
      'pipeline': {
        name: 'Sales Pipeline Data',
        description: 'Sales opportunities tracking deal stages, potential values, and expected close dates',
        keyMetrics: ['potential_value_usd', 'days_to_close', 'value_millions'],
        keyDimensions: ['company', 'stage', 'sector', 'region', 'close_quarter', 'close_year'],
        analysisGuidance: `
SALES PIPELINE DATA ANALYSIS INSTRUCTIONS:
- This dataset tracks sales opportunities and deal progression
- Key metrics: potential_value_usd (deal value), days_to_close (timeline), value_millions (value in millions)
- Key dimensions: company (prospect), stage (deal phase), sector (industry), region
- When analyzing pipeline, focus on total potential value, stage distribution, close timelines
- Aggregate potential_value_usd to show total pipeline value
- Analyze conversion rates between stages
- Include time-based analysis using close_quarter and close_year
- Focus on regional performance and sector trends
        `
      }
    };

    const context = datasetContexts[datasetId.toLowerCase()];
    if (!context) {
      return null;
    }

    // Add data structure validation
    const actualColumns = Object.keys(data[0] || {});
    const sampleRow = data[0] || {};
    
    return `
${context.analysisGuidance}

ACTUAL DATA STRUCTURE:
- Dataset: ${context.name}
- Columns available: ${actualColumns.join(', ')}
- Sample values: ${JSON.stringify(sampleRow, null, 2)}
- Row count: ${data.length}

ANALYSIS REQUIREMENTS:
1. Use only the actual column names listed above
2. For numeric aggregations, ensure you're using the correct column names
3. Validate that results are non-zero when data exists
4. Include data validation in your analysis
5. If results seem incorrect (like all zeros), double-check column names and data types
    `;
  }

  // Validate analysis results for consistency
  validateAnalysisResults(results, datasetId, originalData) {
    if (!results || !results.results_table || !originalData) {
      return { valid: true, warnings: [] };
    }

    const warnings = [];
    const validation = { valid: true, warnings };

    try {
      // Check for suspicious zero values in key metrics
      if (datasetId === 'ncc') {
        const hasNccData = originalData.some(row => 
          (row.ncc && row.ncc !== 0) || 
          (row.timesheet_charges && row.timesheet_charges !== 0) ||
          (row.NCC && row.NCC !== 0) ||
          (row.TIMESHEET_CHARGES && row.TIMESHEET_CHARGES !== 0)
        );
        
        if (hasNccData && results.results_table.every(row => 
          Object.values(row).every(val => val === 0 || val === '0')
        )) {
          warnings.push('NCC analysis returned all zeros but source data has non-zero values. Check column name mapping.');
          validation.valid = false;
        }
      }

      // Check if analysis used correct column names
      const actualColumns = Object.keys(originalData[0] || {});
      const resultColumns = Object.keys(results.results_table[0] || {});
      
      if (resultColumns.length === 0) {
        warnings.push('Analysis returned no result columns.');
        validation.valid = false;
      }

    } catch (error) {
      warnings.push(`Validation error: ${error.message}`);
    }

    return validation;
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