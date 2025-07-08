/**
 * Analysis Context Manager
 * Manages the state and context for multiple analytical conversations
 * Helps reduce hallucinations by maintaining clear context boundaries
 */
class AnalysisContextManager {
  constructor() {
    this.conversations = new Map(); // Store contexts per conversation ID
    this.globalFilters = {}; // Dataset-level filters
  }

  // Create or get context for a specific conversation
  getConversationContext(conversationId) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        analysisThread: [],
        lastQuestion: null,
        lastResults: null,
        questionCount: 0,
        sessionStartTime: new Date()
      });
    }
    return this.conversations.get(conversationId);
  }

  // Remove a conversation context
  removeConversation(conversationId) {
    this.conversations.delete(conversationId);
  }

  // Legacy method for backward compatibility
  resetContext() {
    this.conversations.clear();
    this.globalFilters = {};
  }

  // Update context after an analysis for a specific conversation
  updateAnalysisContext(conversationId, question, results, data, filters = null) {
    const context = this.getConversationContext(conversationId);
    context.questionCount++;
    context.lastQuestion = question;
    context.lastResults = results;
    
    // Add to analysis thread for context
    context.analysisThread.push({
      question,
      timestamp: new Date(),
      resultSummary: this.summarizeResults(results)
    });
    
    // Keep only last 10 items for performance
    if (context.analysisThread.length > 10) {
      context.analysisThread = context.analysisThread.slice(-10);
    }
  }

  // Set filters from the FiltersStep component (global dataset filters)
  setDatasetFilters(filters) {
    this.globalFilters = filters;
  }

  // Get the appropriate data for analysis
  getAnalysisData(originalData) {
    // Apply dataset filters to original data if present
    if (this.globalFilters && Object.keys(this.globalFilters).length > 0) {
      const filteredData = this.applyDatasetFilters(originalData, this.globalFilters);
      return {
        data: filteredData,
        isFiltered: true,
        filterCount: Object.keys(this.globalFilters).length
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

  // Build context prompt for AI for a specific conversation
  buildContextPrompt(conversationId) {
    const context = this.getConversationContext(conversationId);
    const prompt = [];
    
    if (context.analysisThread.length > 0) {
      prompt.push('ANALYSIS MODE: Continue Analysis');
      prompt.push(`User is continuing conversation with ${context.questionCount} previous questions.`);
      
      if (context.analysisThread.length > 0) {
        prompt.push(`Previous analysis thread (${context.analysisThread.length} questions):`);
        context.analysisThread.slice(-3).forEach((item, idx) => {
          prompt.push(`  ${idx + 1}. "${item.question}" - ${item.resultSummary}`);
        });
      }
      
      prompt.push('Build upon the previous analysis and maintain context.');
    } else {
      prompt.push('ANALYSIS MODE: Fresh Start');
      prompt.push('This is a new analysis question with no previous context.');
      prompt.push('Analyze without assumptions from prior questions.');
    }
    
    if (this.globalFilters && Object.keys(this.globalFilters).length > 0) {
      const filterDescriptions = Object.entries(this.globalFilters)
        .map(([field, values]) => `${field}: ${Array.isArray(values) ? values.join(', ') : values}`);
      prompt.push(`Dataset pre-filtered by: ${filterDescriptions.join('; ')}`);
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

  // Get context summary for UI display for a specific conversation
  getContextSummary(conversationId) {
    const context = this.getConversationContext(conversationId);
    return {
      conversationId,
      questionCount: context.questionCount,
      hasFilters: Object.keys(this.globalFilters).length > 0,
      filterCount: Object.keys(this.globalFilters).length,
      hasAnalysisContext: context.analysisThread.length > 0,
      lastQuestion: context.lastQuestion,
      sessionStartTime: context.sessionStartTime
    };
  }

  // Get all conversations for management
  getAllConversations() {
    return Array.from(this.conversations.values());
  }

  // Export context state for debugging
  exportContext(conversationId = null) {
    if (conversationId) {
      const context = this.getConversationContext(conversationId);
      return JSON.parse(JSON.stringify(context));
    }
    return {
      conversations: Array.from(this.conversations.entries()),
      globalFilters: this.globalFilters
    };
  }
}

// Export singleton instance  
const analysisContextManager = new AnalysisContextManager();
module.exports = analysisContextManager;