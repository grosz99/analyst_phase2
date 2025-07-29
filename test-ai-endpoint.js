// Quick test of the AI recommendation endpoint
const axios = require('axios');

async function testRecommendationEndpoint() {
  try {
    console.log('Testing AI recommendation endpoint...');
    
    const response = await axios.post('http://localhost:3001/api/ai/recommend-datasource', {
      query: 'I want to analyze attendance patterns',
      availableDataSources: ['ATTENDANCE', 'NCC', 'PIPELINE'],
      semanticModel: {
        tables: {
          ATTENDANCE: {
            description: 'Office attendance tracking data',
            keywords: ['attendance', 'office', 'headcount'],
            questions: ['attendance patterns', 'office utilization']
          }
        }
      }
    });
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

testRecommendationEndpoint();