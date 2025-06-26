// Simple test script for mock data functionality
import datasetService from './services/datasetService';

// Mock data for testing
const mockDataPreviews = {
  'Sales Data': Array(50).fill().map((_, i) => ({
    Date: `2023-${Math.floor(i / 4) + 1}-${(i % 4) * 7 + 1}`,
    Region: ['North', 'South', 'East', 'West'][i % 4],
    Product: ['Widget A', 'Widget B', 'Widget C'][i % 3],
    Sales: Math.floor(Math.random() * 10000) + 1000,
    Units: Math.floor(Math.random() * 100) + 10,
    Profit: Math.floor(Math.random() * 5000) + 500
  })),
  'Customer Data': Array(40).fill().map((_, i) => ({
    CustomerId: `CUST-${1000 + i}`,
    Name: `Customer ${i + 1}`,
    Segment: ['Enterprise', 'SMB', 'Consumer'][i % 3],
    Country: ['USA', 'Canada', 'UK', 'Germany', 'France'][i % 5],
    Active: i % 5 !== 0,
    Revenue: Math.floor(Math.random() * 50000) + 5000
  }))
};

// Test dataset loading with mock data
async function testMockDataLoading() {
  console.log("=== Testing Mock Data Loading ===");
  
  try {
    // Test parameters
    const sources = ['Sales Data', 'Customer Data'];
    const dimensions = ['Region', 'Product', 'Segment'];
    const metrics = ['Sales', 'Units', 'Profit', 'Revenue'];
    const filters = { Region: 'North' };
    
    console.log("Loading dataset with mock data...");
    const result = await datasetService.loadDataset(
      sources,
      dimensions,
      metrics,
      filters,
      {}, // Empty CSV data
      mockDataPreviews
    );
    
    console.log("Dataset loaded successfully!");
    console.log(`Session ID: ${result.session.id}`);
    console.log(`Rows: ${result.session.rowCount}`);
    console.log(`Columns: ${result.session.columnCount}`);
    console.log("\nData preview:");
    console.log(result.data.slice(0, 3));
    
    // Test question analysis
    console.log("\n=== Testing Question Analysis ===");
    console.log("Initializing Claude dataset...");
    await datasetService.initializeClaudeDataset();
    
    console.log("Analyzing question...");
    const question = "What is the average sales by region?";
    const analysisResult = await datasetService.analyzeQuestion(question);
    
    console.log("\nAnalysis Result:");
    console.log("Answer:", analysisResult.answer);
    console.log("Code:", analysisResult.code.substring(0, 100) + "...");
    
    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testMockDataLoading();

export default testMockDataLoading;
