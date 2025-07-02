/**
 * Analysis Context Manager
 * Manages the state and context for analytical conversations
 * Helps reduce hallucinations by maintaining clear context boundaries
 */
class AnalysisContextManager {
  constructor() {
    this.resetContext();
  }

  resetContext() {
    this.context = {
      mode: 'fresh', // 'fresh' or 'continue'
      currentFilters: [],
      analysisThread: [],
      datasetState: null,
      filteredData: null,
      drillPath: [],
      lastQuestion: null,
      lastResults: null,
      lastAnalysisType: null,
      activeFilters: {}, // Original filters from FiltersStep
      sessionStartTime: new Date(),
      questionCount: 0
    };
  }

  // Set the analysis mode
  setMode(mode) {
    if (mode === 'fresh') {
      // Clear analysis context but preserve dataset filters
      this.context = {
        ...this.context,
        mode: 'fresh',
        analysisThread: [],
        drillPath: [],
        lastQuestion: null,
        lastResults: null,
        filteredData: null,
        questionCount: 0
      };
    } else {
      this.context.mode = mode;
    }
  }

  // Update context after an analysis
  updateAnalysisContext(question, results, data, filters = null) {
    this.context.questionCount++;
    this.context.lastQuestion = question;
    this.context.lastResults = results;
    
    // Add to analysis thread if in continue mode
    if (this.context.mode === 'continue') {
      this.context.analysisThread.push({
        question,
        timestamp: new Date(),
        resultSummary: this.summarizeResults(results)
      });
    }
    
    // Update filtered data if provided
    if (data) {
      this.context.filteredData = data;
    }
    
    // Update active filters if provided
    if (filters) {
      this.context.currentFilters = filters;
    }
  }

  // Set filters from the FiltersStep component
  setDatasetFilters(filters) {
    this.context.activeFilters = filters;
  }

  // Get the appropriate data for analysis based on mode
  getAnalysisData(originalData) {
    if (this.context.mode === 'continue' && this.context.filteredData) {
      return {
        data: this.context.filteredData,
        isFiltered: true,
        filterCount: this.context.currentFilters.length
      };
    }
    
    // Apply dataset filters to original data if present
    if (this.context.activeFilters && Object.keys(this.context.activeFilters).length > 0) {
      const filteredData = this.applyDatasetFilters(originalData, this.context.activeFilters);
      return {
        data: filteredData,
        isFiltered: true,
        filterCount: Object.keys(this.context.activeFilters).length
      };
    }
    
    return {
      data: originalData,
      isFiltered: false,
      filterCount: 0
    };
  }

  // Apply filters from FiltersStep to data
  applyDatasetFilters(data, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }
    
    return data.filter(row => {
      // Check if row matches all filter criteria
      for (const [field, values] of Object.entries(filters)) {
        if (Array.isArray(values) && values.length > 0) {
          // Row must match at least one value for this field
          if (!values.includes(row[field])) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // Build context prompt for AI
  buildContextPrompt() {
    const prompt = [];
    
    if (this.context.mode === 'continue') {
      prompt.push('ANALYSIS MODE: Continue Analysis');
      prompt.push(`User is continuing from previous question: "${this.context.lastQuestion}"`);
      
      if (this.context.filteredData) {
        prompt.push(`Working with filtered dataset: ${this.context.filteredData.length} records`);
      }
      
      if (this.context.currentFilters.length > 0) {
        prompt.push(`Active analysis filters: ${this.context.currentFilters.join(', ')}`);
      }
      
      if (this.context.analysisThread.length > 0) {
        prompt.push(`Previous analysis thread (${this.context.analysisThread.length} questions):`);
        this.context.analysisThread.slice(-3).forEach((item, idx) => {
          prompt.push(`  ${idx + 1}. "${item.question}" - ${item.resultSummary}`);
        });
      }
      
      prompt.push('Build upon the previous analysis and maintain context.');
    } else {
      prompt.push('ANALYSIS MODE: Fresh Start');
      prompt.push('This is a new analysis question with no previous context.');
      prompt.push('Analyze without assumptions from prior questions.');
      
      if (this.context.activeFilters && Object.keys(this.context.activeFilters).length > 0) {
        const filterDescriptions = Object.entries(this.context.activeFilters)
          .map(([field, values]) => `${field}: ${Array.isArray(values) ? values.join(', ') : values}`);
        prompt.push(`Dataset pre-filtered by: ${filterDescriptions.join('; ')}`);
      }
    }
    
    return prompt.join('\n');
  }

  // Summarize results for context tracking
  summarizeResults(results) {
    if (!results || !results.success) {
      return 'No results';
    }
    
    const summary = [];
    
    if (results.results_table && results.results_table.totalRows) {
      summary.push(`${results.results_table.totalRows} rows`);
    }
    
    if (results.metadata && results.metadata.rows_analyzed) {
      summary.push(`analyzed ${results.metadata.rows_analyzed} records`);
    }
    
    return summary.join(', ') || 'Analysis completed';
  }

  // Get context summary for UI display
  getContextSummary() {
    return {
      mode: this.context.mode,
      questionCount: this.context.questionCount,
      hasFilters: Object.keys(this.context.activeFilters).length > 0,
      filterCount: Object.keys(this.context.activeFilters).length,
      hasAnalysisContext: this.context.analysisThread.length > 0,
      lastQuestion: this.context.lastQuestion,
      filteredRecordCount: this.context.filteredData?.length || 0
    };
  }

  // Check if we should suggest mode switch
  shouldSuggestModeSwitch(question) {
    const questionLower = question.toLowerCase();
    
    // Continuation indicators
    const continuationWords = ['also', 'additionally', 'furthermore', 'what about', 'how about', 
                               'drill down', 'show me more', 'explore further', 'and'];
    
    // Fresh start indicators  
    const freshWords = ['now show', 'instead', 'different question', 'new analysis', 
                        'switch to', 'let me ask about', 'change topic'];
    
    const hasContinuation = continuationWords.some(word => questionLower.includes(word));
    const hasFresh = freshWords.some(word => questionLower.includes(word));
    
    if (this.context.mode === 'fresh' && hasContinuation && this.context.lastQuestion) {
      return { suggestMode: 'continue', confidence: 'high' };
    }
    
    if (this.context.mode === 'continue' && hasFresh) {
      return { suggestMode: 'fresh', confidence: 'high' };
    }
    
    return null;
  }

  // Export context state for debugging
  exportContext() {
    return JSON.parse(JSON.stringify(this.context));
  }
}

// Export singleton instance
const analysisContextManager = new AnalysisContextManager();
export default analysisContextManager;