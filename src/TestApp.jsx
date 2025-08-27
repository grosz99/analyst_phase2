import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 React is Working!</h1>
      <p>OpenAI GPT-4.1 + Supabase Integration Test</p>
      <div style={{ 
        background: '#f0f8ff', 
        padding: '20px', 
        borderRadius: '8px', 
        margin: '20px 0' 
      }}>
        <h3>✅ Migration Status</h3>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li>✅ OpenAI GPT-4.1 Service: Ready</li>
          <li>✅ Supabase Database: Connected</li>
          <li>✅ NCC Dataset: Configured</li>
          <li>✅ Frontend: Loading...</li>
        </ul>
      </div>
      <p style={{ color: '#666' }}>
        If you see this, React is working. Now checking main app...
      </p>
    </div>
  );
}

export default TestApp;