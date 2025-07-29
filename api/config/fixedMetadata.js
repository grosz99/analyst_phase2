// Fixed metadata for datasets to avoid expensive INFORMATION_SCHEMA queries
// This data should be updated manually when schema changes

const fixedMetadata = {
  tables: [
    {
      id: 'attendance',
      name: 'ATTENDANCE',
      description: 'Employee attendance tracking data',
      tables: ['ATTENDANCE'],
      row_count: 1000,
      size_bytes: 25600,
      last_updated: '2025-07-29T00:00:00Z',
      type: 'supabase_table'
    },
    {
      id: 'ncc',
      name: 'NCC',
      description: 'Net Cash Contribution financial performance data',
      tables: ['NCC'],
      row_count: 100,
      size_bytes: 8000,
      last_updated: '2025-07-29T00:00:00Z',
      type: 'supabase_table'
    },
    {
      id: 'pipeline',
      name: 'PIPELINE',
      description: 'Sales pipeline and opportunity tracking',
      tables: ['PIPELINE'],
      row_count: 500,
      size_bytes: 19200,
      last_updated: '2025-07-29T00:00:00Z',
      type: 'supabase_table'
    }
  ],
  
  schemas: {
    attendance: {
      columns: [
        { name: 'DATE', type: 'Date', category: 'dimension', nullable: false, comment: 'Attendance date' },
        { name: 'EMPLOYEE_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Employee identifier' },
        { name: 'OFFICE', type: 'String', category: 'dimension', nullable: false, comment: 'Office location' },
        { name: 'COHORT', type: 'String', category: 'dimension', nullable: true, comment: 'Employee cohort' },
        { name: 'ORG', type: 'String', category: 'dimension', nullable: true, comment: 'Organization unit' },
        { name: 'STATUS', type: 'String', category: 'dimension', nullable: false, comment: 'Attendance status' },
        { name: 'HOURS_WORKED', type: 'Number', category: 'metric', nullable: true, comment: 'Hours worked' },
        { name: 'OVERTIME_HOURS', type: 'Number', category: 'metric', nullable: true, comment: 'Overtime hours' }
      ],
      total_columns: 8,
      dimensions: 6,
      metrics: 2
    },
    
    ncc: {
      columns: [
        { name: 'Month', type: 'String', category: 'dimension', nullable: false, comment: 'Month of metrics' },
        { name: 'Office', type: 'String', category: 'dimension', nullable: false, comment: 'Office location' },
        { name: 'Region', type: 'String', category: 'dimension', nullable: false, comment: 'Geographic region' },
        { name: 'Sector', type: 'String', category: 'dimension', nullable: true, comment: 'Business sector' },
        { name: 'Client', type: 'String', category: 'dimension', nullable: true, comment: 'Client name' },
        { name: 'Project_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Project identifier' },
        { name: 'Timesheet_Charges', type: 'Number', category: 'metric', nullable: false, comment: 'Timesheet charges amount' },
        { name: 'Adjustments', type: 'Number', category: 'metric', nullable: true, comment: 'Billing adjustments' },
        { name: 'NCC', type: 'Number', category: 'metric', nullable: true, comment: 'Net Cash Contribution' }
      ],
      total_columns: 9,
      dimensions: 6,
      metrics: 3
    },
    
    pipeline: {
      columns: [
        { name: 'OPPORTUNITY_ID', type: 'String', category: 'dimension', nullable: false, comment: 'Opportunity identifier' },
        { name: 'CREATE_DATE', type: 'Date', category: 'dimension', nullable: false, comment: 'Opportunity creation date' },
        { name: 'CLOSE_DATE', type: 'Date', category: 'dimension', nullable: true, comment: 'Expected close date' },
        { name: 'STAGE', type: 'String', category: 'dimension', nullable: false, comment: 'Pipeline stage' },
        { name: 'COMPANY', type: 'String', category: 'dimension', nullable: false, comment: 'Company name' },
        { name: 'SECTOR', type: 'String', category: 'dimension', nullable: true, comment: 'Industry sector' },
        { name: 'REGION', type: 'String', category: 'dimension', nullable: true, comment: 'Geographic region' },
        { name: 'OPPORTUNITY_VALUE', type: 'Number', category: 'metric', nullable: false, comment: 'Deal value' },
        { name: 'PROBABILITY', type: 'Number', category: 'metric', nullable: true, comment: 'Win probability percentage' },
        { name: 'WEIGHTED_VALUE', type: 'Number', category: 'metric', nullable: true, comment: 'Probability-weighted value' }
      ],
      total_columns: 10,
      dimensions: 7,
      metrics: 3
    }
  },
  
  // Sample filter values for each dataset
  filterValues: {
    attendance: {
      OFFICE: ['NYC HQ', 'London Office', 'Singapore Hub', 'Tokyo Branch', 'Sydney Office'],
      COHORT: ['Senior', 'Mid-Level', 'Junior', 'Intern', 'Executive'],
      ORG: ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance'],
      STATUS: ['Present', 'Absent', 'Remote', 'Holiday', 'Sick Leave']
    },
    ncc: {
      Office: ['Singapore', 'Sydney', 'Munich', 'London', 'Boston'],
      Region: ['Asia Pacific', 'EMESA', 'North America'],
      Sector: ['Industrial Goods', 'Consumer', 'TMT', 'Financial Institutions'],
      Client: ['Client_1', 'Client_2', 'Client_3', 'Client_4', 'Client_5']
    },
    pipeline: {
      STAGE: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      COMPANY: ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Enterprise Co', 'Innovation Labs'],
      SECTOR: ['Technology', 'Healthcare', 'Retail', 'Manufacturing', 'Services'],
      REGION: ['North America', 'Europe', 'Asia Pacific', 'Latin America']
    }
  },
  
  // Sample data for fallback when Supabase is unavailable
  sampleData: {
    attendance: [
      { DATE: '2025-01-15', EMPLOYEE_ID: 'EMP001', OFFICE: 'NYC HQ', COHORT: 'Senior', ORG: 'Engineering', STATUS: 'Present', HOURS_WORKED: 8, OVERTIME_HOURS: 0 },
      { DATE: '2025-01-15', EMPLOYEE_ID: 'EMP002', OFFICE: 'London Office', COHORT: 'Mid-Level', ORG: 'Sales', STATUS: 'Remote', HOURS_WORKED: 8, OVERTIME_HOURS: 1 },
      { DATE: '2025-01-15', EMPLOYEE_ID: 'EMP003', OFFICE: 'Singapore Hub', COHORT: 'Junior', ORG: 'Marketing', STATUS: 'Present', HOURS_WORKED: 7.5, OVERTIME_HOURS: 0 },
      { DATE: '2025-01-16', EMPLOYEE_ID: 'EMP001', OFFICE: 'NYC HQ', COHORT: 'Senior', ORG: 'Engineering', STATUS: 'Present', HOURS_WORKED: 8, OVERTIME_HOURS: 2 },
      { DATE: '2025-01-16', EMPLOYEE_ID: 'EMP002', OFFICE: 'London Office', COHORT: 'Mid-Level', ORG: 'Sales', STATUS: 'Absent', HOURS_WORKED: 0, OVERTIME_HOURS: 0 }
    ],
    ncc: [
      { Month: '2025-01', Office: 'Singapore', Region: 'Asia Pacific', Sector: 'TMT', Client: 'Client_1', Project_ID: 'PRJ001', Timesheet_Charges: 150000, Adjustments: -5000, NCC: 145000 },
      { Month: '2025-01', Office: 'London', Region: 'EMESA', Sector: 'Financial Institutions', Client: 'Client_2', Project_ID: 'PRJ002', Timesheet_Charges: 200000, Adjustments: 10000, NCC: 210000 },
      { Month: '2025-01', Office: 'Boston', Region: 'North America', Sector: 'Industrial Goods', Client: 'Client_3', Project_ID: 'PRJ003', Timesheet_Charges: 180000, Adjustments: 0, NCC: 180000 },
      { Month: '2025-02', Office: 'Singapore', Region: 'Asia Pacific', Sector: 'Consumer', Client: 'Client_1', Project_ID: 'PRJ004', Timesheet_Charges: 175000, Adjustments: -2000, NCC: 173000 },
      { Month: '2025-02', Office: 'Sydney', Region: 'Asia Pacific', Sector: 'TMT', Client: 'Client_4', Project_ID: 'PRJ005', Timesheet_Charges: 160000, Adjustments: 5000, NCC: 165000 }
    ],
    pipeline: [
      { OPPORTUNITY_ID: 'OPP001', CREATE_DATE: '2025-01-10', CLOSE_DATE: '2025-03-15', STAGE: 'Proposal', COMPANY: 'Acme Corp', SECTOR: 'Technology', REGION: 'North America', OPPORTUNITY_VALUE: 500000, PROBABILITY: 75, WEIGHTED_VALUE: 375000 },
      { OPPORTUNITY_ID: 'OPP002', CREATE_DATE: '2025-01-05', CLOSE_DATE: '2025-02-28', STAGE: 'Negotiation', COMPANY: 'TechStart Inc', SECTOR: 'Technology', REGION: 'Europe', OPPORTUNITY_VALUE: 250000, PROBABILITY: 60, WEIGHTED_VALUE: 150000 },
      { OPPORTUNITY_ID: 'OPP003', CREATE_DATE: '2025-01-20', CLOSE_DATE: '2025-04-10', STAGE: 'Qualification', COMPANY: 'Global Solutions', SECTOR: 'Healthcare', REGION: 'Asia Pacific', OPPORTUNITY_VALUE: 800000, PROBABILITY: 40, WEIGHTED_VALUE: 320000 },
      { OPPORTUNITY_ID: 'OPP004', CREATE_DATE: '2025-01-12', CLOSE_DATE: '2025-03-01', STAGE: 'Prospecting', COMPANY: 'Enterprise Co', SECTOR: 'Manufacturing', REGION: 'North America', OPPORTUNITY_VALUE: 1200000, PROBABILITY: 25, WEIGHTED_VALUE: 300000 },
      { OPPORTUNITY_ID: 'OPP005', CREATE_DATE: '2025-01-08', CLOSE_DATE: '2025-02-15', STAGE: 'Closed Won', COMPANY: 'Innovation Labs', SECTOR: 'Services', REGION: 'Europe', OPPORTUNITY_VALUE: 350000, PROBABILITY: 100, WEIGHTED_VALUE: 350000 }
    ]
  }
};

module.exports = fixedMetadata;