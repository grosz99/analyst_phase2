// Test script to simulate frontend request to backend
const { execSync } = require('child_process');

async function testBackendConnection() {
  console.log('🧪 Testing backend connection...');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    
    // Test 2: Available datasets
    console.log('2️⃣ Testing available datasets...');
    const datasetsResponse = await fetch('http://localhost:3001/api/available-datasets');
    const datasetsData = await datasetsResponse.json();
    console.log('✅ Available datasets:', datasetsData.success);
    
    // Test 3: Load dataset (simulating frontend request)
    console.log('3️⃣ Testing load dataset (like frontend would)...');
    const loadResponse = await fetch('http://localhost:3001/api/load-dataset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasetId: 'ncc',
        userSelections: {
          columns: ['Office', 'Region', 'NCC'],
          filters: {
            Office: ['Singapore']
          }
        }
      })
    });
    
    if (!loadResponse.ok) {
      console.error('❌ Load dataset failed:', loadResponse.status, loadResponse.statusText);
      const errorText = await loadResponse.text();
      console.error('Error details:', errorText);
    } else {
      const loadData = await loadResponse.json();
      console.log('✅ Load dataset success:', loadData.success);
      console.log('📊 Rows returned:', loadData.analysis_data?.length);
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testBackendConnection();