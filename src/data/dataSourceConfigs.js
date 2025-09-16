// Data source configurations with their specific fields and filters

export const dataSourceConfigs = {
  'client-revenue': {
    id: 'client-revenue',
    title: 'Client Revenue',
    description: 'Net client charges with client- and practice-area-level detail, enabling analysis of revenue distribution across relationships and practices.',
    keyMetrics: [
      { name: 'Net Client Charges (NCC)', field: 'CLIENT_NCC' },
      { name: 'Last Year Net Client Charges (LY_NCC)', field: 'LY_CLIENT_NCC' }
    ],
    dimensions: [
      { name: 'Client', field: 'CLIENT' },
      { name: 'IPA', field: 'IPA' },
      { name: 'FPA', field: 'FPA' },
      { name: 'Region / System / Subsystem', field: 'REGION_SYSTEM' },
      { name: 'Week End Date', field: 'WEEK_END_DATE' }
    ],
    suggestedQuestions: [
      'Show me revenue by IPA vs last year',
      'What are the top 5 clients in each IPA?',
      'Compare subsystem revenue trends week over week.'
    ],
    availableFilters: [
      'REGION',
      'SYSTEM',
      'SUBSYSTEM',
      'CS_GEO',
      'IPA',
      'FPA',
      'WEEK_END_DATE'
    ],
    resultColumns: [
      { field: 'IPA', label: 'IPA' },
      { field: 'CS_GEO', label: 'CS_GEO' },
      { field: 'CLIENT_NCC', label: 'CLIENT_NCC', type: 'currency' },
      { field: 'LY_CLIENT_NCC', label: 'LY_CLIENT_NCC', type: 'currency' }
    ]
  },
  'vs-plan-revenue': {
    id: 'vs-plan-revenue',
    title: 'Vs Plan Revenue',
    description: 'Comparison of net client charges against plan across geographies, showing performance versus expectations.',
    keyMetrics: [
      { name: 'Net Client Charges (NCC)', field: 'NCC' },
      { name: 'Last Year Net Client Charges (LY_NCC)', field: 'LY_NCC' },
      { name: '4-Week Average', field: 'FOUR_WEEK_AVG' },
      { name: '8-Week Average', field: 'EIGHT_WEEK_AVG' },
      { name: 'Plan NCC', field: 'PLAN_NCC' }
    ],
    dimensions: [
      { name: 'Month Year', field: 'MONTH_YEAR' },
      { name: 'Region / System / Subsystem', field: 'REGION_SYSTEM' },
      { name: 'CS_GEO', field: 'CS_GEO' }
    ],
    suggestedQuestions: [
      'Last month, week by week, how did we do vs plan?',
      'On a weekly basis over past month, how is our 4-week momentum?',
      'Compare NCC for a system vs last year.'
    ],
    availableFilters: [
      'REGION',
      'SYSTEM', 
      'SUBSYSTEM',
      'CS_GEO',
      'MONTH_YEAR'
    ],
    resultColumns: [
      { field: 'MONTH_YEAR', label: 'Month' },
      { field: 'REGION', label: 'Region' },
      { field: 'NCC', label: 'NCC', type: 'currency' },
      { field: 'PLAN_NCC', label: 'Plan NCC', type: 'currency' },
      { field: 'VARIANCE', label: 'Variance %', type: 'percentage' }
    ]
  },
  'weekly-pipeline': {
    id: 'weekly-pipeline',
    title: 'Weekly Pipeline',
    description: 'Current view of deal status in the sales pipeline, providing visibility into opportunities at each stage.',
    keyMetrics: [
      { name: 'BCG Value', field: 'BCG_VALUE' },
      { name: 'BCG Value Base', field: 'BCG_VALUE_BASE' }
    ],
    dimensions: [
      { name: 'IPA', field: 'IPA' },
      { name: 'FPA', field: 'FPA' },
      { name: 'IPA Sectors', field: 'IPA_SECTORS' },
      { name: 'FPA Topics', field: 'FPA_TOPICS' },
      { name: 'Outcome Date', field: 'OUTCOME_DATE' },
      { name: 'Modified Date', field: 'MODIFIED_DATE' },
      { name: 'Region / System / Subsystem', field: 'REGION_SYSTEM' },
      { name: 'Created Date', field: 'CREATED_DATE' }
    ],
    suggestedQuestions: [
      'What is the current BCG Value of open deals by IPA',
      'Which FPAs have the most pipeline activities this week?',
      'What is the win % by subsystem?'
    ],
    availableFilters: [
      'REGION',
      'SYSTEM',
      'SUBSYSTEM',
      'OFFICE_DESCRIPTION',
      'IPAS',
      'FPAS',
      'STALE_OPPORTUNITY_FLG',
      'LAST_SIGNIFICANT_UPDATE_DATE',
      'CREATEDON',
      'OUTCOME_DATE',
      'MODIFIEDON'
    ],
    resultColumns: [
      { field: 'IPA', label: 'IPA' },
      { field: 'FPA', label: 'FPA' },
      { field: 'BCG_VALUE', label: 'BCG Value', type: 'currency' },
      { field: 'STAGE', label: 'Stage' },
      { field: 'OUTCOME_DATE', label: 'Outcome Date', type: 'date' }
    ]
  },
  'pipeline-history': {
    id: 'pipeline-history',
    title: 'Pipeline History',
    description: 'Historical snapshots of the pipeline, allowing review of past trends and tracking of pipeline evolution over time.',
    keyMetrics: [
      { name: 'Total Pipeline Value', field: 'TOTAL_VALUE' },
      { name: 'Closed Won', field: 'CLOSED_WON' },
      { name: 'Closed Lost', field: 'CLOSED_LOST' }
    ],
    dimensions: [
      { name: 'Snapshot Date', field: 'SNAPSHOT_DATE' },
      { name: 'IPA', field: 'IPA' },
      { name: 'Stage', field: 'STAGE' },
      { name: 'Region', field: 'REGION' }
    ],
    suggestedQuestions: [
      'How has our pipeline evolved over the last 6 months?',
      'What is the historical win rate by IPA?',
      'Show pipeline progression month over month.'
    ],
    availableFilters: [
      'SNAPSHOT_DATE',
      'REGION',
      'IPA',
      'STAGE',
      'SYSTEM'
    ],
    resultColumns: [
      { field: 'SNAPSHOT_DATE', label: 'Date', type: 'date' },
      { field: 'IPA', label: 'IPA' },
      { field: 'TOTAL_VALUE', label: 'Pipeline Value', type: 'currency' },
      { field: 'CONVERSION_RATE', label: 'Conversion %', type: 'percentage' }
    ]
  }
};

// Mock data generators for each data source
export const generateMockData = (dataSourceId) => {
  switch(dataSourceId) {
    case 'client-revenue':
      return [
        { IPA: 'IG', CS_GEO: 'CS', CLIENT_NCC: 2456789012.345, LY_CLIENT_NCC: 2123456789.012 },
        { IPA: 'CP', CS_GEO: 'CS', CLIENT_NCC: 1987654321.098, LY_CLIENT_NCC: 2234567890.123 },
        { IPA: 'HC', CS_GEO: 'CS', CLIENT_NCC: 1876543210.987, LY_CLIENT_NCC: 1654321098.765 },
        { IPA: 'FP', CS_GEO: 'CS', CLIENT_NCC: 1567890123.456, LY_CLIENT_NCC: 1432109876.543 },
        { IPA: 'MM', CS_GEO: 'CS', CLIENT_NCC: 1345678901.234, LY_CLIENT_NCC: 1298765432.109 },
        { IPA: 'RP', CS_GEO: 'EU', CLIENT_NCC: 1234567890.123, LY_CLIENT_NCC: 1123456789.012 },
        { IPA: 'TC', CS_GEO: 'EU', CLIENT_NCC: 987654321.098, LY_CLIENT_NCC: 876543210.987 },
        { IPA: 'LP', CS_GEO: 'EU', CLIENT_NCC: 765432109.876, LY_CLIENT_NCC: 698765432.109 },
        { IPA: 'SP', CS_GEO: 'EU', CLIENT_NCC: 543210987.654, LY_CLIENT_NCC: 498765432.109 },
      ];
    
    case 'vs-plan-revenue':
      return [
        { MONTH_YEAR: 'Jan 2025', REGION: 'Americas', NCC: 3456789012, PLAN_NCC: 3200000000, VARIANCE: 8.02 },
        { MONTH_YEAR: 'Jan 2025', REGION: 'EMEA', NCC: 2987654321, PLAN_NCC: 3100000000, VARIANCE: -3.63 },
        { MONTH_YEAR: 'Jan 2025', REGION: 'APAC', NCC: 1876543210, PLAN_NCC: 1800000000, VARIANCE: 4.25 },
        { MONTH_YEAR: 'Dec 2024', REGION: 'Americas', NCC: 3234567890, PLAN_NCC: 3200000000, VARIANCE: 1.08 },
        { MONTH_YEAR: 'Dec 2024', REGION: 'EMEA', NCC: 2876543210, PLAN_NCC: 2900000000, VARIANCE: -0.81 },
        { MONTH_YEAR: 'Dec 2024', REGION: 'APAC', NCC: 1765432109, PLAN_NCC: 1700000000, VARIANCE: 3.85 },
      ];
    
    case 'weekly-pipeline':
      return [
        { IPA: 'IG', FPA: 'Strategy', BCG_VALUE: 45000000, STAGE: 'Negotiation', OUTCOME_DATE: '2025-03-15' },
        { IPA: 'CP', FPA: 'Operations', BCG_VALUE: 32000000, STAGE: 'Proposal', OUTCOME_DATE: '2025-02-28' },
        { IPA: 'HC', FPA: 'Tech', BCG_VALUE: 28000000, STAGE: 'Qualification', OUTCOME_DATE: '2025-04-01' },
        { IPA: 'FP', FPA: 'Risk', BCG_VALUE: 25000000, STAGE: 'Discovery', OUTCOME_DATE: '2025-03-30' },
        { IPA: 'MM', FPA: 'Marketing', BCG_VALUE: 22000000, STAGE: 'Proposal', OUTCOME_DATE: '2025-02-15' },
        { IPA: 'RP', FPA: 'Sales', BCG_VALUE: 19000000, STAGE: 'Negotiation', OUTCOME_DATE: '2025-02-01' },
        { IPA: 'TC', FPA: 'Digital', BCG_VALUE: 17000000, STAGE: 'Closed Won', OUTCOME_DATE: '2025-01-15' },
        { IPA: 'LP', FPA: 'Supply Chain', BCG_VALUE: 15000000, STAGE: 'Qualification', OUTCOME_DATE: '2025-04-15' },
      ];
    
    case 'pipeline-history':
      return [
        { SNAPSHOT_DATE: '2025-01-01', IPA: 'IG', TOTAL_VALUE: 450000000, CONVERSION_RATE: 42.5 },
        { SNAPSHOT_DATE: '2024-12-01', IPA: 'IG', TOTAL_VALUE: 420000000, CONVERSION_RATE: 40.2 },
        { SNAPSHOT_DATE: '2024-11-01', IPA: 'IG', TOTAL_VALUE: 380000000, CONVERSION_RATE: 38.9 },
        { SNAPSHOT_DATE: '2025-01-01', IPA: 'CP', TOTAL_VALUE: 320000000, CONVERSION_RATE: 35.8 },
        { SNAPSHOT_DATE: '2024-12-01', IPA: 'CP', TOTAL_VALUE: 310000000, CONVERSION_RATE: 34.5 },
        { SNAPSHOT_DATE: '2024-11-01', IPA: 'CP', TOTAL_VALUE: 290000000, CONVERSION_RATE: 33.2 },
      ];
    
    default:
      return [];
  }
};