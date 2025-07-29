#!/usr/bin/env node
/**
 * Test script to verify frontend-backend integration after the fixes
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function testBackendEndpoints() {
  console.log('🔍 Testing Backend Endpoints...\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BACKEND_URL}/api/health`,
      expectedStatus: 200
    },
    {
      name: 'Available Datasets (Fixed)',
      url: `${BACKEND_URL}/api/available-datasets`,
      expectedStatus: 200
    },
    {
      name: 'Available Datasets (Live)',
      url: `${BACKEND_URL}/api/available-datasets?live=true`,
      expectedStatus: 200
    },
    {
      name: 'NCC Schema (Live)',
      url: `${BACKEND_URL}/api/dataset/ncc/schema?live=true`,
      expectedStatus: 200
    },
    {
      name: 'NCC Office Filter Values (Live)',
      url: `${BACKEND_URL}/api/dataset/ncc/field/Office/values?live=true`,
      expectedStatus: 200
    },
    {
      name: 'NCC Region Filter Values (Live)',
      url: `${BACKEND_URL}/api/dataset/ncc/field/Region/values?live=true`,
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });
      
      const success = response.status === test.expectedStatus;
      const status = success ? '✅' : '❌';
      
      console.log(`${status} ${test.name}: ${response.status}`);
      
      if (test.name.includes('Filter Values')) {
        const data = await response.json();
        if (data.success && data.values) {
          console.log(`   📋 Values: ${data.values.join(', ')}`);
          console.log(`   📊 Source: ${data.source}`);
        }
      } else if (test.name.includes('Available Datasets')) {
        const data = await response.json();
        if (data.success) {
          console.log(`   📊 Source: ${data.source}, Count: ${data.total_count}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

async function testDataLoading() {
  console.log('\n🔄 Testing Data Loading...\n');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/load-dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        datasetId: 'ncc',
        userSelections: {}
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ NCC Data Loading: ${response.status}`);
      console.log(`   📊 Rows: ${data.analysis_data?.length || 0}`);
      console.log(`   📋 Columns: ${data.schema?.total_columns || 0}`);
      console.log(`   📊 Source: ${data.source}`);
      
      if (data.sample_data && data.sample_data.length > 0) {
        const sampleRow = data.sample_data[0];
        console.log(`   🏢 Sample Office: ${sampleRow.Office}`);
        console.log(`   🌍 Sample Region: ${sampleRow.Region}`);
      }
    } else {
      console.log(`❌ NCC Data Loading: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ NCC Data Loading: Error - ${error.message}`);
  }
}

async function testFrontendAccess() {
  console.log('\n🌐 Testing Frontend Access...\n');
  
  try {
    const response = await fetch(FRONTEND_URL);
    const success = response.status === 200;
    const status = success ? '✅' : '❌';
    console.log(`${status} Frontend Access: ${response.status}`);
  } catch (error) {
    console.log(`❌ Frontend Access: Error - ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Frontend-Backend Integration Test\n');
  console.log('=======================================\n');
  
  await testBackendEndpoints();
  await testDataLoading();
  await testFrontendAccess();
  
  console.log('\n=======================================');
  console.log('📋 Summary:');
  console.log('- Backend APIs should all show ✅');
  console.log('- Filter values should show real data from Supabase');
  console.log('- Office values: Singapore, Sydney, Munich, London, Boston');
  console.log('- Region values: Asia Pacific, EMESA, North America');
  console.log('- Frontend should be accessible');
  console.log('=======================================\n');
}

runTests().catch(console.error);