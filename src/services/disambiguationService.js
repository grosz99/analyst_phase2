/**
 * Disambiguation Service - Detects ambiguous terms in user queries and provides clarification options
 * Integrates with conversation flow to pause analysis when clarification is needed
 */

class DisambiguationService {
  constructor() {
    // Define ambiguous terms and their possible interpretations
    this.ambiguousTerms = {
      'value': {
        contexts: ['pipeline', 'sales', 'revenue', 'financial'],
        options: [
          { key: 'weighted', label: 'Weighted Value', description: 'Probability-adjusted potential value' },
          { key: 'unweighted', label: 'Unweighted Value', description: 'Raw potential value without probability weighting' }
        ]
      },
      'pipeline': {
        contexts: ['sales', 'opportunity', 'deal'],
        options: [
          { key: 'total', label: 'Total Pipeline', description: 'All opportunities regardless of stage' },
          { key: 'qualified', label: 'Qualified Pipeline', description: 'Only qualified opportunities' },
          { key: 'active', label: 'Active Pipeline', description: 'Currently active opportunities' }
        ]
      },
      'performance': {
        contexts: ['sales', 'team', 'office', 'region'],
        options: [
          { key: 'revenue', label: 'Revenue Performance', description: 'Based on revenue metrics' },
          { key: 'volume', label: 'Volume Performance', description: 'Based on quantity/count metrics' },
          { key: 'efficiency', label: 'Efficiency Performance', description: 'Based on productivity ratios' }
        ]
      },
      'trend': {
        contexts: ['time', 'growth', 'change'],
        options: [
          { key: 'absolute', label: 'Absolute Trend', description: 'Raw value changes over time' },
          { key: 'relative', label: 'Relative Trend', description: 'Percentage changes over time' },
          { key: 'seasonal', label: 'Seasonal Trend', description: 'Seasonal patterns and adjustments' }
        ]
      },
      'top': {
        contexts: ['best', 'highest', 'leading'],
        options: [
          { key: 'count', label: 'By Count', description: 'Ranked by number of items/transactions' },
          { key: 'value', label: 'By Value', description: 'Ranked by monetary value' },
          { key: 'percentage', label: 'By Percentage', description: 'Ranked by percentage/ratio' }
        ]
      }
    };

    // Common question patterns that often need disambiguation
    this.ambiguousPatterns = [
      /(?:show|give|what|which).*(?:me|are|is).*(?:the|our|top|best|highest).*(?:value|performance|trend|pipeline)/i,
      /(?:pipeline|sales|revenue).*value/i,
      /(?:top|best|highest).*(?:offices|regions|teams|performers)/i,
      /(?:trend|growth|change).*(?:over time|analysis)/i
    ];
  }

  /**
   * Analyze user query for ambiguous terms that need clarification
   * @param {string} query - User's analysis question
   * @param {Array} availableData - Dataset columns to provide context
   * @returns {Object|null} Disambiguation object or null if no ambiguity detected
   */
  analyzeQuery(query, availableData = []) {
    const queryLower = query.toLowerCase();
    const availableColumns = availableData.map(col => col.toLowerCase());
    
    // Check for ambiguous patterns first
    const hasAmbiguousPattern = this.ambiguousPatterns.some(pattern => pattern.test(query));
    if (!hasAmbiguousPattern) {
      return null;
    }

    // Find specific ambiguous terms
    const detectedAmbiguities = [];
    
    Object.entries(this.ambiguousTerms).forEach(([term, config]) => {
      if (queryLower.includes(term)) {
        // Check if the context matches any of the term's contexts
        const hasRelevantContext = config.contexts.some(context => 
          queryLower.includes(context) || 
          availableColumns.some(col => col.includes(context))
        );

        if (hasRelevantContext) {
          detectedAmbiguities.push({
            term,
            position: queryLower.indexOf(term),
            config,
            originalQuery: query
          });
        }
      }
    });

    // If we found ambiguities, return the first one for clarification
    if (detectedAmbiguities.length > 0) {
      // Sort by position in query (handle first ambiguity first)
      detectedAmbiguities.sort((a, b) => a.position - b.position);
      
      const primaryAmbiguity = detectedAmbiguities[0];
      return {
        needsDisambiguation: true,
        ambiguousTerm: primaryAmbiguity.term,
        originalQuery: query,
        clarificationOptions: primaryAmbiguity.config.options,
        context: this.extractQueryContext(query, availableColumns),
        confidence: this.calculateConfidence(query, primaryAmbiguity.term)
      };
    }

    return null;
  }

  /**
   * Extract context from query to help with disambiguation
   */
  extractQueryContext(query, availableColumns) {
    const queryLower = query.toLowerCase();
    const context = {
      timeframe: null,
      grouping: null,
      dataType: null
    };

    // Detect timeframe
    if (queryLower.includes('monthly') || queryLower.includes('month')) context.timeframe = 'monthly';
    if (queryLower.includes('quarterly') || queryLower.includes('quarter')) context.timeframe = 'quarterly';
    if (queryLower.includes('yearly') || queryLower.includes('year')) context.timeframe = 'yearly';

    // Detect grouping
    if (queryLower.includes('by office') || availableColumns.includes('office')) context.grouping = 'office';
    if (queryLower.includes('by region') || availableColumns.includes('region')) context.grouping = 'region';
    if (queryLower.includes('by sector') || availableColumns.includes('sector')) context.grouping = 'sector';

    // Detect data type
    if (availableColumns.some(col => col.includes('ncc'))) context.dataType = 'financial';
    if (availableColumns.some(col => col.includes('pipeline'))) context.dataType = 'sales';
    if (availableColumns.some(col => col.includes('attendance'))) context.dataType = 'attendance';

    return context;
  }

  /**
   * Calculate confidence level for disambiguation need
   */
  calculateConfidence(query, term) {
    const queryLower = query.toLowerCase();
    let confidence = 0.7; // Base confidence

    // Higher confidence for very common ambiguous cases
    if (term === 'value' && queryLower.includes('pipeline')) confidence = 0.9;
    if (term === 'top' && queryLower.includes('office')) confidence = 0.8;
    if (term === 'performance') confidence = 0.85;

    return confidence;
  }

  /**
   * Create clarified query based on user's disambiguation choice
   * @param {string} originalQuery - Original ambiguous query
   * @param {string} ambiguousTerm - The term that was ambiguous
   * @param {string} selectedOption - User's clarification choice
   * @returns {string} Clarified query
   */
  createClarifiedQuery(originalQuery, ambiguousTerm, selectedOption) {
    const termConfig = this.ambiguousTerms[ambiguousTerm];
    if (!termConfig) return originalQuery;

    const selectedConfig = termConfig.options.find(opt => opt.key === selectedOption);
    if (!selectedConfig) return originalQuery;

    // Replace the ambiguous term with the clarified version
    const clarifiedTerm = selectedConfig.label.toLowerCase();
    const regex = new RegExp(`\\b${ambiguousTerm}\\b`, 'gi');
    
    let clarifiedQuery = originalQuery.replace(regex, clarifiedTerm);
    
    // Add context note to make the intent clear
    clarifiedQuery += ` (specifically: ${selectedConfig.description})`;
    
    return clarifiedQuery;
  }

  /**
   * Get quick disambiguation for common scenarios
   */
  getQuickDisambiguation(query, dataContext) {
    const queryLower = query.toLowerCase();

    // Pipeline value - most common case
    if (queryLower.includes('pipeline value') || (queryLower.includes('pipeline') && queryLower.includes('value'))) {
      return {
        needsDisambiguation: true,
        ambiguousTerm: 'value',
        originalQuery: query,
        clarificationOptions: [
          { 
            key: 'weighted', 
            label: 'Weighted Pipeline Value', 
            description: 'Total value adjusted by probability of closing (potential_value * probability)' 
          },
          { 
            key: 'unweighted', 
            label: 'Raw Pipeline Value', 
            description: 'Total potential value without probability weighting' 
          }
        ],
        context: { dataType: 'sales', grouping: 'pipeline' },
        confidence: 0.95,
        isQuickDisambiguation: true
      };
    }

    return null;
  }
}

// Export singleton instance
const disambiguationService = new DisambiguationService();
export default disambiguationService;