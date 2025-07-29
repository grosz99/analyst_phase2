// Test the fallback by making a request with invalid Supabase credentials
const http = require('http');

function testFallbackWithInvalidConnection() {
  console.log('🧪 Testing fallback mechanism with invalid Supabase connection...\n');
  
  // Create a test request to trigger the fallback
  const postData = JSON.stringify({
    datasetId: 'ncc',
    userSelections: {}
  });
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/load-dataset',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        console.log(`📊 Response Status: ${res.statusCode}`);
        console.log(`📊 Response Success: ${response.success}`);
        console.log(`📊 Data Source: ${response.source || 'N/A'}`);
        
        if (response.source === 'fallback_cache') {
          console.log('✅ FALLBACK MECHANISM TRIGGERED!');
          console.log(`   - Dataset: ${response.dataset_id}`);
          console.log(`   - Rows: ${response.analysis_data ? response.analysis_data.length : 'N/A'}`);
          console.log(`   - Warning: ${response.warning || 'N/A'}`);
          console.log('   - Sample data preview:');
          if (response.sample_data && response.sample_data[0]) {
            console.log('     ', JSON.stringify(response.sample_data[0], null, 2));
          }
        } else if (response.source === 'supabase') {
          console.log('ℹ️  Supabase connection is working (fallback not needed)');
          console.log(`   - Rows returned: ${response.analysis_data ? response.analysis_data.length : 'N/A'}`);
        } else if (!response.success && res.statusCode === 503) {
          console.log('❌ 503 Error returned (fallback failed)');
          console.log(`   - Error: ${response.error}`);
          console.log(`   - Troubleshooting steps: ${response.troubleshooting ? response.troubleshooting.steps.length : 0}`);
        } else {
          console.log('🤔 Unexpected response format');
          console.log('   Full response:', JSON.stringify(response, null, 2));
        }
        
      } catch (err) {
        console.error('❌ Failed to parse response:', err.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error(`❌ Request failed: ${err.message}`);
    console.log('💡 Make sure the API server is running: npm start (in the api/ directory)');
  });
  
  req.write(postData);
  req.end();
}

// Instructions to manually test fallback
function printTestInstructions() {
  console.log('🔧 To manually test the fallback mechanism:');
  console.log('');
  console.log('1. Temporarily disable Supabase connection:');
  console.log('   - Edit api/services/supabaseService.js');
  console.log('   - Change line ~25: this.client = null; // Force failure');
  console.log('');
  console.log('2. Restart the API server:');
  console.log('   - cd api/');
  console.log('   - npm start');
  console.log('');
  console.log('3. Run this test again to see fallback in action');
  console.log('');
  console.log('4. Restore Supabase connection:');
  console.log('   - Revert the change to supabaseService.js');
  console.log('   - Restart the server');
  console.log('');
}

testFallbackWithInvalidConnection();

setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  printTestInstructions();
}, 2000);