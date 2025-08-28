// NCC Dataset - Embedded for production deployment
// This avoids SQLite dependency issues in Vercel serverless environment

const nccData = [
  {
    "Office": "Singapore",
    "Sector": "Technology", 
    "Month": "2024-01",
    "Client": "TechCorp Singapore",
    "Project_ID": "SG_TECH_001",
    "NCC": 450000,
    "Region": "Asia Pacific",
    "System": "Oracle"
  },
  {
    "Office": "Singapore",
    "Sector": "Financial Services",
    "Month": "2024-01", 
    "Client": "Asia Bank",
    "Project_ID": "SG_FS_002",
    "NCC": 380000,
    "Region": "Asia Pacific",
    "System": "SAP"
  },
  {
    "Office": "London",
    "Sector": "Healthcare",
    "Month": "2024-01",
    "Client": "MedTech Ltd",
    "Project_ID": "LN_HC_003",
    "NCC": 520000,
    "Region": "Europe",
    "System": "Oracle"
  },
  {
    "Office": "London",
    "Sector": "Technology",
    "Month": "2024-02",
    "Client": "UK Software",
    "Project_ID": "LN_TECH_004",
    "NCC": 410000,
    "Region": "Europe", 
    "System": "SAP"
  },
  {
    "Office": "Sydney",
    "Sector": "Mining",
    "Month": "2024-02",
    "Client": "Aussie Mining Co",
    "Project_ID": "SY_MIN_005",
    "NCC": 650000,
    "Region": "Asia Pacific",
    "System": "Oracle"
  },
  {
    "Office": "Boston",
    "Sector": "Healthcare", 
    "Month": "2024-02",
    "Client": "Boston Medical",
    "Project_ID": "BOS_HC_006",
    "NCC": 480000,
    "Region": "North America",
    "System": "SAP"
  },
  {
    "Office": "Munich",
    "Sector": "Automotive",
    "Month": "2024-03",
    "Client": "German Auto",
    "Project_ID": "MU_AUTO_007",
    "NCC": 590000,
    "Region": "Europe",
    "System": "Oracle"
  },
  {
    "Office": "Singapore",
    "Sector": "Financial Services",
    "Month": "2024-03",
    "Client": "Investment Bank Asia",
    "Project_ID": "SG_FS_008",
    "NCC": 720000,
    "Region": "Asia Pacific",
    "System": "SAP"
  },
  {
    "Office": "London",
    "Sector": "Energy",
    "Month": "2024-03",
    "Client": "UK Energy Corp",
    "Project_ID": "LN_ENR_009",
    "NCC": 440000,
    "Region": "Europe",
    "System": "Oracle"
  },
  {
    "Office": "Sydney",
    "Sector": "Financial Services",
    "Month": "2024-04",
    "Client": "Aussie Bank",
    "Project_ID": "SY_FS_010",
    "NCC": 380000,
    "Region": "Asia Pacific",
    "System": "SAP"
  },
  {
    "Office": "Boston",
    "Sector": "Technology",
    "Month": "2024-04",
    "Client": "Boston Tech",
    "Project_ID": "BOS_TECH_011",
    "NCC": 510000,
    "Region": "North America",
    "System": "Oracle"
  },
  {
    "Office": "Munich",
    "Sector": "Manufacturing",
    "Month": "2024-04",
    "Client": "German Manufacturing",
    "Project_ID": "MU_MFG_012",
    "NCC": 460000,
    "Region": "Europe",
    "System": "SAP"
  },
  {
    "Office": "Singapore",
    "Sector": "Technology",
    "Month": "2024-05",
    "Client": "Singapore Tech Hub",
    "Project_ID": "SG_TECH_013",
    "NCC": 620000,
    "Region": "Asia Pacific",
    "System": "Oracle"
  },
  {
    "Office": "London",
    "Sector": "Financial Services",
    "Month": "2024-05",
    "Client": "London Finance",
    "Project_ID": "LN_FS_014",
    "NCC": 580000,
    "Region": "Europe",
    "System": "SAP"
  },
  {
    "Office": "Sydney",
    "Sector": "Healthcare",
    "Month": "2024-05",
    "Client": "Sydney Health",
    "Project_ID": "SY_HC_015",
    "NCC": 490000,
    "Region": "Asia Pacific",
    "System": "Oracle"
  },
  {
    "Office": "Boston",
    "Sector": "Financial Services",
    "Month": "2024-06",
    "Client": "Boston Capital",
    "Project_ID": "BOS_FS_016",
    "NCC": 670000,
    "Region": "North America",
    "System": "SAP"
  },
  {
    "Office": "Munich",
    "Sector": "Technology",
    "Month": "2024-06",
    "Client": "Munich Tech",
    "Project_ID": "MU_TECH_017",
    "NCC": 530000,
    "Region": "Europe",
    "System": "Oracle"
  },
  {
    "Office": "Singapore",
    "Sector": "Healthcare",
    "Month": "2024-06",
    "Client": "Singapore Medical",
    "Project_ID": "SG_HC_018",
    "NCC": 420000,
    "Region": "Asia Pacific",
    "System": "SAP"
  },
  {
    "Office": "London",
    "Sector": "Technology",
    "Month": "2024-07",
    "Client": "London Tech Solutions",
    "Project_ID": "LN_TECH_019",
    "NCC": 560000,
    "Region": "Europe",
    "System": "Oracle"
  },
  {
    "Office": "Sydney",
    "Sector": "Energy",
    "Month": "2024-07",
    "Client": "Sydney Energy",
    "Project_ID": "SY_ENR_020",
    "NCC": 610000,
    "Region": "Asia Pacific",
    "System": "SAP"
  }
];

// Define the schema
const nccSchema = {
  columns: [
    { name: 'Office', type: 'TEXT' },
    { name: 'Sector', type: 'TEXT' },
    { name: 'Month', type: 'TEXT' },
    { name: 'Client', type: 'TEXT' },
    { name: 'Project_ID', type: 'TEXT' },
    { name: 'NCC', type: 'REAL' },
    { name: 'Region', type: 'TEXT' },
    { name: 'System', type: 'TEXT' }
  ]
};

module.exports = {
  data: nccData,
  schema: nccSchema,
  count: nccData.length
};