// Test script to check if view tracking API is working
const fetch = require('node-fetch');

async function testViewTracking() {
  console.log('🧪 Testing view tracking API...');
  
  try {
    // You'll need to replace this with an actual agreement token
    const testToken = 'your-agreement-token-here';
    
    const response = await fetch('http://localhost:3000/api/agreements/track-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: testToken })
    });
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    console.log('📊 Status:', response.status);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testViewTracking();
