/**
 * Dynamic status messages for streaming analysis
 * Provides contextual and engaging messages based on data type and analysis progress
 */

export const getContextualStatusMessages = (datasetId, dataSize, currentStep) => {
  const baseMessages = {
    discovering: [
      'Examining your data structure...',
      'Identifying key patterns and relationships...',
      'Analyzing column types and data quality...',
      'Building semantic understanding of your dataset...'
    ],
    loading: [
      'Loading and preparing your dataset...',
      'Optimizing data for AI analysis...',
      'Validating data integrity...',
      'Structuring data for pattern recognition...'
    ],
    analyzing: [
      'AI is processing complex patterns...',
      'Generating statistical insights...',
      'Identifying trends and anomalies...',
      'Building comprehensive analysis...',
      'Discovering hidden relationships in your data...',
      'Computing business intelligence insights...'
    ],
    generating: [
      'Creating visualizations...',
      'Formatting results for clarity...',
      'Generating actionable recommendations...',
      'Finalizing your analysis report...'
    ]
  };

  // Dataset-specific messages for more relevant context
  const datasetMessages = {
    attendance: {
      discovering: [
        'Analyzing attendance patterns across offices...',
        'Examining headcount and utilization data...',
        'Identifying organizational cohort structures...'
      ],
      loading: [
        'Loading attendance records and office data...',
        'Processing headcount and attendance rates...',
        'Preparing workforce analytics...'
      ],
      analyzing: [
        'Computing attendance trends and patterns...',
        'Analyzing office utilization rates...',
        'Identifying workforce insights...',
        'Comparing attendance across locations...'
      ],
      generating: [
        'Creating attendance dashboards...',
        'Building workforce utilization charts...',
        'Generating office performance insights...'
      ]
    },
    ncc: {
      discovering: [
        'Examining financial performance data...',
        'Analyzing project profitability structures...',
        'Processing timesheet and adjustment data...'
      ],
      loading: [
        'Loading NCC and financial records...',
        'Processing project profitability data...',
        'Preparing financial analytics...'
      ],
      analyzing: [
        'Computing profitability metrics...',
        'Analyzing sector and regional performance...',
        'Identifying high-performing projects...',
        'Calculating adjustment impacts...'
      ],
      generating: [
        'Creating profitability visualizations...',
        'Building financial performance charts...',
        'Generating business insights...'
      ]
    },
    pipeline: {
      discovering: [
        'Examining sales pipeline structure...',
        'Analyzing deal stages and values...',
        'Processing opportunity timelines...'
      ],
      loading: [
        'Loading sales pipeline data...',
        'Processing opportunity values and stages...',
        'Preparing sales analytics...'
      ],
      analyzing: [
        'Computing pipeline conversion rates...',
        'Analyzing deal progression patterns...',
        'Identifying sales opportunities...',
        'Calculating revenue forecasts...'
      ],
      generating: [
        'Creating pipeline visualizations...',
        'Building sales performance charts...',
        'Generating revenue insights...'
      ]
    }
  };

  // Get dataset-specific messages or fall back to base messages
  const messages = datasetMessages[datasetId?.toLowerCase()]?.[currentStep] || baseMessages[currentStep];
  
  // Add data size context to some messages
  const sizeContext = getSizeContext(dataSize);
  const contextualMessages = messages.map(msg => {
    if (currentStep === 'loading' && sizeContext) {
      return `${msg} (${sizeContext})`;
    }
    return msg;
  });

  return contextualMessages;
};

export const getSizeContext = (dataSize) => {
  if (!dataSize) return '';
  
  if (dataSize < 100) return 'small dataset';
  if (dataSize < 1000) return 'medium dataset';
  if (dataSize < 10000) return 'large dataset';
  return 'very large dataset';
};

// Fun facts and tips to show during long analysis
export const getAnalysisTips = (currentStep, datasetId) => {
  const generalTips = [
    'Our AI can identify patterns humans might miss',
    'Complex analyses typically reveal the most valuable insights',
    'Ask follow-up questions to dive deeper into specific findings',
    'The AI considers statistical significance in all calculations'
  ];

  const stepSpecificTips = {
    discovering: [
      'Data quality assessment is crucial for accurate analysis',
      'The AI examines every column for potential insights',
      'Semantic understanding helps generate better questions'
    ],
    loading: [
      'Large datasets are automatically optimized for performance',
      'Data validation ensures analysis accuracy',
      'Caching improves response times for similar queries'
    ],
    analyzing: [
      'Advanced algorithms are processing your data',
      'Multiple analytical approaches are being evaluated',
      'Statistical models are being applied to find patterns'
    ],
    generating: [
      'Visualizations are optimized for your specific data type',
      'Results are formatted for maximum clarity',
      'Recommendations are based on statistical evidence'
    ]
  };

  const tips = [...generalTips, ...stepSpecificTips[currentStep]];
  return tips[Math.floor(Math.random() * tips.length)];
};

// Technical details for curious users
export const getTechnicalDetails = (currentStep, datasetId, dataSize) => {
  return {
    discovering: {
      operation: 'Schema Analysis & Data Profiling',
      model: 'Anthropic Claude 3.5 Sonnet',
      security: 'End-to-end encrypted processing',
      optimization: 'Column type inference and relationship mapping'
    },
    loading: {
      operation: 'Data Preparation & Validation',
      model: 'Streaming data pipeline',
      security: 'Secure memory processing',
      optimization: `Processing ${dataSize || 'N/A'} records with intelligent caching`
    },
    analyzing: {
      operation: 'AI Pattern Recognition & Insight Generation',
      model: 'Anthropic Claude 3.5 Sonnet with specialized prompts',
      security: 'Privacy-preserving analysis',
      optimization: 'Multi-layered analytical processing'
    },
    generating: {
      operation: 'Visualization & Report Generation',
      model: 'Intelligent chart selection algorithms',
      security: 'Client-side rendering',
      optimization: 'Responsive visualization generation'
    }
  };
};

// Progressive message selector that cycles through different messages
export class ProgressiveMessageSelector {
  constructor(datasetId, dataSize) {
    this.datasetId = datasetId;
    this.dataSize = dataSize;
    this.messageIndex = {};
    this.lastUpdate = {};
  }

  getMessage(currentStep) {
    const now = Date.now();
    const messages = getContextualStatusMessages(this.datasetId, this.dataSize, currentStep);
    
    // Initialize or update message index for this step
    if (!this.messageIndex[currentStep]) {
      this.messageIndex[currentStep] = 0;
      this.lastUpdate[currentStep] = now;
    }

    // Change message every 3 seconds to keep users engaged
    if (now - this.lastUpdate[currentStep] > 3000) {
      this.messageIndex[currentStep] = (this.messageIndex[currentStep] + 1) % messages.length;
      this.lastUpdate[currentStep] = now;
    }

    return messages[this.messageIndex[currentStep]];
  }

  getTip(currentStep) {
    return getAnalysisTips(currentStep, this.datasetId);
  }

  getTechnicalDetails(currentStep) {
    return getTechnicalDetails(currentStep, this.datasetId, this.dataSize);
  }
}