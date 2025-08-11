import axios from 'axios';

async function testApiCall() {
  console.log('Testing API call with axios...');
  
  const config = {
    baseURL: 'https://todo4ai.org/todo-for-ai/api/v1/',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-token-here',
      'User-Agent': 'todo-for-ai-mcp/2.1.1'
    }
  };

  console.log('Axios config:', config);

  const client = axios.create(config);

  try {
    console.log('Making request to mcp/call...');
    const response = await client.post('mcp/call', {
      name: 'list_user_projects',
      arguments: {
        status_filter: 'active',
        include_stats: false
      }
    });

    console.log('Success!');
    console.log('Status:', response.status);
    console.log('Data keys:', Object.keys(response.data));
    console.log('Projects count:', response.data.total);
  } catch (error) {
    console.error('Error occurred:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }
    if (error.config) {
      console.error('Request config:');
      console.error('  URL:', error.config.url);
      console.error('  Base URL:', error.config.baseURL);
      console.error('  Method:', error.config.method);
      console.error('  Headers:', error.config.headers);
    }
  }
}

testApiCall();
