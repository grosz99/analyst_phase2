/**
 * Fallback Data Service
 * 
 * Provides emergency fallback data when primary data sources are unavailable.
 * This service maintains sample datasets that allow the application to continue
 * functioning during outages or connectivity issues.
 */

class FallbackDataService {
  constructor() {
    this.fallbackData = {
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
    };
  }

  /**
   * Get fallback data for a specific dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {Array|null} Fallback data array or null if not available
   */
  getFallbackData(datasetId) {
    const normalizedId = datasetId.toLowerCase();
    return this.fallbackData[normalizedId] || null;
  }

  /**
   * Check if fallback data is available for a dataset
   * @param {string} datasetId - The dataset identifier
   * @returns {boolean} True if fallback data exists
   */
  hasFallbackData(datasetId) {
    const normalizedId = datasetId.toLowerCase();
    return !!(this.fallbackData[normalizedId] && this.fallbackData[normalizedId].length > 0);
  }

  /**
   * Get all available fallback datasets
   * @returns {Array} Array of dataset IDs that have fallback data
   */
  getAvailableDatasets() {
    return Object.keys(this.fallbackData);
  }

  /**
   * Get fallback data statistics
   * @param {string} datasetId - The dataset identifier
   * @returns {Object|null} Statistics object or null if dataset not found
   */
  getFallbackStats(datasetId) {
    const data = this.getFallbackData(datasetId);
    if (!data) return null;

    return {
      dataset_id: datasetId,
      row_count: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      sample_created: new Date().toISOString(),
      data_quality: 'sample_only',
      limitations: [
        'Limited to sample data only',
        'May not reflect current business state',
        'Intended for emergency use only'
      ]
    };
  }

  /**
   * Create a fallback response object compatible with the main API
   * @param {string} datasetId - The dataset identifier
   * @param {Object} schema - The dataset schema from metadata
   * @param {Object} userSelections - User filter selections
   * @param {number} processingTime - Time taken to process request
   * @returns {Object} Complete fallback response object
   */
  createFallbackResponse(datasetId, schema, userSelections = {}, processingTime = 0) {
    const fallbackData = this.getFallbackData(datasetId);
    
    if (!fallbackData || !schema) {
      throw new Error(`Fallback data or schema not available for ${datasetId}`);
    }

    return {
      success: true,
      dataset_id: datasetId,
      schema: {
        ...schema,
        row_count: fallbackData.length,
        memory_usage: Math.round(fallbackData.length * schema.total_columns * 0.1)
      },
      sample_data: fallbackData.slice(0, 10), // First 10 rows for preview
      analysis_data: fallbackData, // Full fallback data for AI analysis
      filters_applied: userSelections,
      message: `Loaded ${datasetId.toUpperCase()} with ${schema.total_columns} columns (${fallbackData.length} sample rows) from emergency fallback`,
      processing_time: processingTime,
      timestamp: new Date().toISOString(),
      source: 'fallback_service',
      warning: 'Using emergency sample data due to data source issues. Some features may be limited.',
      performance: {
        duration: processingTime,
        rows_sampled: fallbackData.length
      },
      fallback_info: {
        reason: 'Primary data source unavailable',
        data_quality: 'sample_only',
        recommended_action: 'Retry request when connectivity is restored'
      }
    };
  }
}

// Export singleton instance
const fallbackDataService = new FallbackDataService();
module.exports = fallbackDataService;