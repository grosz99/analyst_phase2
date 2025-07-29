// Debug the fallback mechanism
const fixedMetadata = require('./api/config/fixedMetadata');

function debugFallback() {
  console.log('🔍 Debugging fallback mechanism...\n');
  
  // Test the exact logic from the API
  const datasetId = 'ncc';  // Test with lowercase as API would receive it
  
  console.log(`Testing fallback for dataset: ${datasetId}`);
  console.log(`Looking for: fixedMetadata.schemas[${datasetId.toLowerCase()}]`);
  console.log(`Looking for: fixedMetadata.sampleData[${datasetId.toLowerCase()}]`);
  
  const fallbackSchema = fixedMetadata.schemas[datasetId.toLowerCase()];
  const fallbackSample = fixedMetadata.sampleData[datasetId.toLowerCase()] || [];
  
  console.log('\n📋 Results:');
  console.log(`Schema found: ${!!fallbackSchema}`);
  console.log(`Sample data found: ${!!fallbackSample}`);
  console.log(`Sample data length: ${fallbackSample.length}`);
  
  if (fallbackSchema) {
    console.log(`Schema columns: ${fallbackSchema.total_columns}`);
  }
  
  if (fallbackSample && fallbackSample.length > 0) {
    console.log(`\n📊 Sample data preview:`);
    console.log(JSON.stringify(fallbackSample[0], null, 2));
    
    console.log(`\n✅ Fallback condition check:`);
    console.log(`fallbackSchema exists: ${!!fallbackSchema}`);
    console.log(`fallbackSample.length > 0: ${fallbackSample.length > 0}`);
    console.log(`Would fallback work: ${!!(fallbackSchema && fallbackSample.length > 0)}`);
  } else {
    console.log('\n❌ No sample data found for fallback');
  }
  
  // Test all datasets
  console.log('\n🧪 Testing all datasets:');
  ['attendance', 'ncc', 'pipeline'].forEach(dataset => {
    const schema = fixedMetadata.schemas[dataset];
    const sample = fixedMetadata.sampleData[dataset];
    console.log(`${dataset}: schema=${!!schema}, sample=${sample ? sample.length : 0} rows`);
  });
}

debugFallback();