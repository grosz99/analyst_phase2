// Fixed metadata for NCC dataset only - BCG Net Cash Contribution data
// This data should be updated manually when schema changes

const fixedMetadata = {
  tables: [
    {
      id: 'ncc',
      name: 'NCC',
      description: 'Net Cash Contribution (NCC) - BCG project profitability and financial performance data',
      tables: ['NCC'],
      row_count: 2500,
      size_bytes: 180000,
      last_updated: '2025-08-27T00:00:00Z',
      type: 'supabase_table'
    },
    {
      id: 'attendance',
      name: 'ATTENDANCE',
      description: 'Employee attendance tracking and workforce management data',
      tables: ['ATTENDANCE'],
      row_count: 125000,
      size_bytes: 2560000,
      last_updated: '2025-08-27T00:00:00Z',
      type: 'supabase_table'
    },
    {
      id: 'pipeline',
      name: 'PIPELINE',
      description: 'Sales pipeline and opportunity tracking data',
      tables: ['PIPELINE'],
      row_count: 85000,
      size_bytes: 1920000,
      last_updated: '2025-08-27T00:00:00Z',
      type: 'supabase_table'
    }
  ],
  
  schemas: {
    ncc: {
      columns: [
        { name: 'Month', type: 'String', category: 'dimension', nullable: false, comment: 'Project month (YYYY-MM format)' },
        { name: 'Office', type: 'String', category: 'dimension', nullable: false, comment: 'BCG office location' },
        { name: 'Region', type: 'String', category: 'dimension', nullable: false, comment: 'Geographic region' },
        { name: 'Sector', type: 'String', category: 'dimension', nullable: false, comment: 'Industry sector' },
        { name: 'Client', type: 'String', category: 'dimension', nullable: false, comment: 'Client name' },
        { name: 'Project_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Unique project identifier' },
        { name: 'NCC', type: 'Number', category: 'metric', nullable: false, comment: 'Net Cash Contribution ($) - Primary profitability KPI' },
        { name: 'System', type: 'String', category: 'dimension', nullable: true, comment: 'Source system (Oracle, etc.)' }
      ],
      total_columns: 8,
      dimensions: 6,
      metrics: 1
    },
    attendance: {
      columns: [
        { name: 'DATE', type: 'Date', category: 'dimension', nullable: false, comment: 'Attendance date' },
        { name: 'EMPLOYEE_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Unique employee identifier' },
        { name: 'OFFICE', type: 'String', category: 'dimension', nullable: false, comment: 'Office location' },
        { name: 'COHORT', type: 'String', category: 'dimension', nullable: true, comment: 'Employee cohort or group' },
        { name: 'ORG', type: 'String', category: 'dimension', nullable: true, comment: 'Organization unit' },
        { name: 'STATUS', type: 'String', category: 'dimension', nullable: false, comment: 'Attendance status (Present, Absent, etc.)' },
        { name: 'HOURS_WORKED', type: 'Number', category: 'metric', nullable: true, comment: 'Hours worked that day' },
        { name: 'OVERTIME_HOURS', type: 'Number', category: 'metric', nullable: true, comment: 'Overtime hours worked' }
      ],
      total_columns: 8,
      dimensions: 6,
      metrics: 2
    },
    pipeline: {
      columns: [
        { name: 'OPPORTUNITY_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Unique opportunity identifier' },
        { name: 'CREATE_DATE', type: 'Date', category: 'dimension', nullable: false, comment: 'Opportunity creation date' },
        { name: 'CLOSE_DATE', type: 'Date', category: 'dimension', nullable: true, comment: 'Expected or actual close date' },
        { name: 'STAGE', type: 'String', category: 'dimension', nullable: false, comment: 'Sales pipeline stage' },
        { name: 'COMPANY', type: 'String', category: 'dimension', nullable: false, comment: 'Client company name' },
        { name: 'SECTOR', type: 'String', category: 'dimension', nullable: true, comment: 'Industry sector' },
        { name: 'REGION', type: 'String', category: 'dimension', nullable: true, comment: 'Geographic region' },
        { name: 'OPPORTUNITY_VALUE', type: 'Number', category: 'metric', nullable: false, comment: 'Opportunity value ($)' },
        { name: 'PROBABILITY', type: 'Number', category: 'metric', nullable: true, comment: 'Win probability (%)' },
        { name: 'WEIGHTED_VALUE', type: 'Number', category: 'metric', nullable: true, comment: 'Value * Probability ($)' }
      ],
      total_columns: 10,
      dimensions: 7,
      metrics: 3
    }
  },
  
  // Sample filter values for datasets (based on actual database schema)
  filterValues: {
    ncc: {
      Office: ['Boston', 'London', 'Munich', 'Singapore', 'Sydney', 'Tokyo', 'New York', 'Chicago'],
      Region: ['North America', 'EMEA', 'Asia Pacific', 'Latin America'],
      Sector: ['Industrial Goods', 'Consumer', 'TMT', 'Financial Institutions', 'Public Sector', 'Healthcare'],
      Client: ['Client_1', 'Client_2', 'Client_3', 'Client_4', 'Client_5'],
      Month: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'],
      System: ['Oracle', 'SAP', 'Workday']
    },
    attendance: {
      OFFICE: ['Boston', 'London', 'Munich', 'Singapore', 'Sydney', 'Tokyo', 'New York', 'Chicago'],
      COHORT: ['2023_Q1', '2023_Q2', '2023_Q3', '2023_Q4', '2024_Q1', '2024_Q2'],
      ORG: ['Consulting', 'Operations', 'HR', 'Finance', 'IT', 'Marketing'],
      STATUS: ['Present', 'Absent', 'Partial Day', 'Remote', 'Sick Leave', 'Vacation']
    },
    pipeline: {
      STAGE: ['Prospect', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      COMPANY: ['Company_A', 'Company_B', 'Company_C', 'Company_D', 'Company_E'],
      SECTOR: ['Industrial Goods', 'Consumer', 'TMT', 'Financial Institutions', 'Public Sector', 'Healthcare'],
      REGION: ['North America', 'EMEA', 'Asia Pacific', 'Latin America']
    }
  }
};

module.exports = fixedMetadata;