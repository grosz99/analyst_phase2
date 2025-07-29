// Fixed metadata for datasets to avoid expensive INFORMATION_SCHEMA queries
// This data should be updated manually when schema changes

const fixedMetadata = {
  tables: [
    {
      id: 'attendance',
      name: 'ATTENDANCE',
      description: 'Employee attendance tracking data',
      tables: ['ATTENDANCE'],
      row_count: 125000,
      size_bytes: 2560000,
      last_updated: '2024-12-15T00:00:00Z',
      type: 'snowflake_table'
    },
    {
      id: 'ncc',
      name: 'NCC',
      description: 'Network Call Center performance metrics',
      tables: ['NCC'],
      row_count: 450000,
      size_bytes: 8960000,
      last_updated: '2024-12-15T00:00:00Z',
      type: 'snowflake_table'
    },
    {
      id: 'pipeline',
      name: 'PIPELINE',
      description: 'Sales pipeline and opportunity tracking',
      tables: ['PIPELINE'],
      row_count: 85000,
      size_bytes: 1920000,
      last_updated: '2024-12-15T00:00:00Z',
      type: 'snowflake_table'
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
        { name: 'MONTH', type: 'Date', category: 'dimension', nullable: false, comment: 'Month of metrics' },
        { name: 'OFFICE', type: 'String', category: 'dimension', nullable: false, comment: 'Office location' },
        { name: 'REGION', type: 'String', category: 'dimension', nullable: false, comment: 'Geographic region' },
        { name: 'SECTOR', type: 'String', category: 'dimension', nullable: true, comment: 'Business sector' },
        { name: 'CLIENT', type: 'String', category: 'dimension', nullable: true, comment: 'Client name' },
        { name: 'CALLS_HANDLED', type: 'Integer', category: 'metric', nullable: false, comment: 'Number of calls handled' },
        { name: 'AVG_HANDLE_TIME', type: 'Number', category: 'metric', nullable: true, comment: 'Average handle time in minutes' },
        { name: 'SATISFACTION_SCORE', type: 'Number', category: 'metric', nullable: true, comment: 'Customer satisfaction score' },
        { name: 'REVENUE', type: 'Number', category: 'metric', nullable: true, comment: 'Revenue generated' }
      ],
      total_columns: 9,
      dimensions: 5,
      metrics: 4
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
      OFFICE: ['New York', 'London', 'Singapore', 'Tokyo', 'Sydney'],
      REGION: ['Americas', 'EMEA', 'APAC'],
      SECTOR: ['Technology', 'Healthcare', 'Financial Services', 'Consumer Goods', 'Energy'],
      CLIENT: ['Client A', 'Client B', 'Client C', 'Client D', 'Client E']
    },
    pipeline: {
      STAGE: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      COMPANY: ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Enterprise Co', 'Innovation Labs'],
      SECTOR: ['Technology', 'Healthcare', 'Retail', 'Manufacturing', 'Services'],
      REGION: ['North America', 'Europe', 'Asia Pacific', 'Latin America']
    }
  }
};

module.exports = fixedMetadata;