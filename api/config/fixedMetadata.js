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
    }
  },
  
  // Sample filter values for NCC dataset (based on actual database schema)
  filterValues: {
    ncc: {
      Office: ['Boston', 'London', 'Munich', 'Singapore', 'Sydney', 'Tokyo', 'New York', 'Chicago'],
      Region: ['North America', 'EMEA', 'Asia Pacific', 'Latin America'],
      Sector: ['Industrial Goods', 'Consumer', 'TMT', 'Financial Institutions', 'Public Sector', 'Healthcare'],
      Client: ['Client_1', 'Client_2', 'Client_3', 'Client_4', 'Client_5'],
      Month: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'],
      System: ['Oracle', 'SAP', 'Workday']
    }
  }
};

module.exports = fixedMetadata;