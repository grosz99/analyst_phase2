/**
 * Enhanced AI Analysis Service with Streaming Progress Updates
 * Provides real-time status updates during the 15-20 second analysis process
 */

import apiClient from '../utils/apiClient.js';
import disambiguationService from './disambiguationService.js';

class StreamingAnalysisService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001');
    
    // Analysis timing configuration
    this.analysisSteps = [
      { id: 'discovering', duration: 3000, message: 'Analyzing your data structure and identifying patterns...' },
      { id: 'loading', duration: 4000, message: 'Loading and preparing your dataset for AI analysis...' },
      { id: 'analyzing', duration: 10000, message: 'AI is processing patterns, trends, and generating insights...' },
      { id: 'generating', duration: 3000, message: 'Creating visualizations and formatting results...' }
    ];
    
    console.log(`🔗 Streaming AI Analysis Service initialized with baseURL: ${this.baseURL}`);
  }

  /**
   * Enhanced AI analysis with streaming progress updates
   * @param {Array} data - Dataset to analyze
   * @param {string} question - User's analysis question
   * @param {Function} onProgress - Progress callback (step, progress, estimatedTime, message)
   * @param {Function} onCancel - Cancellation callback
   * @returns {Promise} Analysis results
   */
  async analyzeDataWithStreaming(data, question = '', options = {}) {
    const {
      analysisType = 'general',
      sessionId = null,
      onProgress = () => {},
      onCancel = () => {},
      contextPrompt = null,
      datasetId = null
    } = options;

    let isCancelled = false;
    let currentStepIndex = 0;
    let startTime = Date.now();

    // Setup cancellation handler
    const cancelHandler = () => {
      isCancelled = true;
      onCancel();
    };

    try {
      console.log(`🚀 Starting streaming AI analysis: ${question || analysisType}`);
      console.log(`📊 Data: ${data.length} rows`);
      
      // Start the actual API call immediately but don't await it yet
      const analysisPromise = this.performActualAnalysis(data, question, {
        analysisType,
        sessionId,
        contextPrompt,
        datasetId
      });

      // Start progress simulation
      const progressPromise = this.simulateProgressWithRealTiming(onProgress, cancelHandler);

      // Wait for either the analysis to complete or cancellation
      const result = await Promise.race([
        analysisPromise,
        progressPromise,
        this.createCancellationPromise(cancelHandler)
      ]);

      if (isCancelled) {
        throw new Error('Analysis cancelled by user');
      }

      // Ensure we reach 100% progress
      onProgress('generating', 100, 0, 'Analysis complete!');

      const totalTime = Date.now() - startTime;
      console.log(`✅ Streaming AI analysis completed in ${totalTime}ms`);

      return result;

    } catch (error) {
      if (isCancelled) {
        console.log('🚫 Analysis cancelled by user');
        return {
          success: false,
          cancelled: true,
          error: 'Analysis cancelled by user'
        };
      }

      console.error('❌ Streaming AI analysis error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Simulate realistic progress updates based on actual analysis timing
   */
  async simulateProgressWithRealTiming(onProgress, cancelHandler) {
    let totalProgress = 0;
    let currentStepIndex = 0;
    const startTime = Date.now();

    for (let i = 0; i < this.analysisSteps.length; i++) {
      const step = this.analysisSteps[i];
      const stepStartTime = Date.now();
      
      // Calculate progress boundaries for this step
      const stepProgressStart = (i / this.analysisSteps.length) * 100;
      const stepProgressEnd = ((i + 1) / this.analysisSteps.length) * 100;
      
      // Estimate remaining time based on total expected duration
      const totalExpectedDuration = this.analysisSteps.reduce((sum, s) => sum + s.duration, 0);
      const elapsedTime = Date.now() - startTime;
      const estimatedRemaining = Math.max(0, Math.floor((totalExpectedDuration - elapsedTime) / 1000));
      
      // Initial step notification
      onProgress(step.id, stepProgressStart, estimatedRemaining, step.message);
      
      // Animate progress within this step
      const stepDuration = step.duration;
      const updateInterval = 200; // Update every 200ms
      const updates = Math.floor(stepDuration / updateInterval);
      
      for (let update = 0; update < updates; update++) {
        await this.delay(updateInterval);
        
        // Calculate smooth progress within step
        const stepProgress = (update + 1) / updates;
        const overallProgress = stepProgressStart + (stepProgress * (stepProgressEnd - stepProgressStart));
        
        const newElapsedTime = Date.now() - startTime;
        const newEstimatedRemaining = Math.max(0, Math.floor((totalExpectedDuration - newElapsedTime) / 1000));
        
        onProgress(step.id, Math.min(95, overallProgress), newEstimatedRemaining, step.message);
      }
    }

    // Keep the promise alive - it will be resolved when actual analysis completes
    return new Promise(() => {}); // Never resolves, will be raced with actual analysis
  }

  /**
   * Perform the actual AI analysis (unchanged from original)
   */
  async performActualAnalysis(data, question, options) {
    const {
      analysisType = 'general',
      sessionId = null,
      contextPrompt = null,
      datasetId = null
    } = options;

    // Generate dataset-specific context if datasetId is provided
    const datasetContext = this.getDatasetSpecificContext(datasetId, data);
    let enhancedContextPrompt = contextPrompt || datasetContext;
    
    // Add disambiguation context if the question was clarified
    if (question.includes('(specifically:')) {
      enhancedContextPrompt = (enhancedContextPrompt || '') + `\n\nIMPORTANT: This question has been disambiguated by the user. Please respect their specific clarification and provide analysis accordingly.`;
    }
    
    const payload = {
      data: data,
      analysisType: analysisType,
      userContext: question || `Perform ${analysisType} analysis on this business data`,
      sessionId: sessionId || `session-${Date.now()}`,
      backend: 'anthropic',
      contextPrompt: enhancedContextPrompt,
      datasetId: datasetId
    };

    const response = await apiClient.securePost('/api/ai/analyze', payload);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
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
  }

  /**
   * Create a promise that resolves when cancellation is requested
   */
  createCancellationPromise(cancelHandler) {
    return new Promise((resolve) => {
      // This promise will be resolved externally when cancellation happens
      cancelHandler.resolve = resolve;
    });
  }

  /**
   * Helper method to create delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get realistic time estimates based on data size and complexity
   */
  getRealisticTimeEstimate(data, question) {
    const baseTime = 8000; // 8 seconds minimum
    const dataFactor = Math.min(data.length / 1000, 5); // Up to 5 seconds for large datasets
    const complexityFactor = this.assessQuestionComplexity(question);
    
    return Math.floor(baseTime + (dataFactor * 1000) + (complexityFactor * 2000));
  }

  /**
   * Assess question complexity for better time estimation
   */
  assessQuestionComplexity(question) {
    const complexKeywords = ['trend', 'correlation', 'forecast', 'predict', 'compare', 'analyze'];
    const simpleKeywords = ['show', 'list', 'count', 'sum', 'average'];
    
    const lowerQuestion = question.toLowerCase();
    const complexCount = complexKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    const simpleCount = simpleKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    
    if (complexCount > simpleCount) return 2; // Complex analysis
    if (simpleCount > 0) return 0; // Simple analysis
    return 1; // Medium complexity
  }

  // Copy methods from original aiAnalysisService that are still needed
  parseAnalysis(analysisText, originalData) {
    const parsed = {
      keyInsights: [],
      recommendations: [],
      trends: [],
      dataQuality: [],
      rawText: analysisText
    };

    try {
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

      if (parsed.keyInsights.length === 0) {
        parsed.keyInsights = this.extractBulletPoints(analysisText).slice(0, 5);
      }

    } catch (error) {
      console.error('Error parsing analysis:', error);
    }

    return parsed;
  }

  extractBulletPoints(text) {
    const points = [];
    
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

  getDatasetSpecificContext(datasetId, data) {
    if (!datasetId || !data || data.length === 0) {
      return null;
    }

    const datasetContexts = {
      'attendance': {
        name: 'Office Attendance Data',
        description: 'Global office attendance tracking with headcount, presence rates, and organizational cohorts',
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
}

// Export singleton instance
const streamingAnalysisService = new StreamingAnalysisService();
export default streamingAnalysisService;