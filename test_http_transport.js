#!/usr/bin/env node

/**
 * Test script for HTTP transport functionality
 */

import axios from 'axios';
import { randomUUID } from 'node:crypto';

const BASE_URL = 'http://127.0.0.1:3000';
const MCP_ENDPOINT = `${BASE_URL}/mcp`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testInitializeRequest() {
  console.log('\n=== Testing Initialize Request ===');
  try {
    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    const response = await axios.post(MCP_ENDPOINT, initializeRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Initialize request successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Extract session ID from response headers
    const sessionId = response.headers['mcp-session-id'];
    console.log('Session ID:', sessionId);
    
    return sessionId;
  } catch (error) {
    console.error('❌ Initialize request failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return null;
  }
}

async function testListTools(sessionId) {
  console.log('\n=== Testing List Tools ===');
  try {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    const response = await axios.post(MCP_ENDPOINT, listToolsRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      }
    });

    console.log('✅ List tools successful');
    console.log('Available tools:', response.data.result.tools.map(t => t.name));
    return true;
  } catch (error) {
    console.error('❌ List tools failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testToolCall(sessionId) {
  console.log('\n=== Testing Tool Call ===');
  try {
    const toolCallRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'list_user_projects',
        arguments: {
          status_filter: 'active',
          include_stats: false
        }
      }
    };

    const response = await axios.post(MCP_ENDPOINT, toolCallRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      }
    });

    console.log('✅ Tool call successful');
    console.log('Tool response received (truncated)');
    return true;
  } catch (error) {
    console.error('❌ Tool call failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testSSEConnection(sessionId) {
  console.log('\n=== Testing SSE Connection ===');
  try {
    // Note: This is a simplified test. In a real scenario, you'd use EventSource
    const response = await axios.get(MCP_ENDPOINT, {
      headers: {
        'Mcp-Session-Id': sessionId,
        'Accept': 'text/event-stream'
      },
      timeout: 5000
    });

    console.log('✅ SSE connection test passed');
    return true;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('✅ SSE connection established (timeout expected)');
      return true;
    }
    console.error('❌ SSE connection failed:', error.message);
    return false;
  }
}

async function testInvalidSession() {
  console.log('\n=== Testing Invalid Session ===');
  try {
    const invalidSessionId = randomUUID();
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/list',
      params: {}
    };

    const response = await axios.post(MCP_ENDPOINT, listToolsRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': invalidSessionId
      }
    });

    console.error('❌ Invalid session test failed: Should have returned error');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid session correctly rejected');
      return true;
    }
    console.error('❌ Invalid session test failed with unexpected error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting HTTP Transport Tests');
  console.log('Make sure the MCP server is running with HTTP transport on port 3000');
  
  let passed = 0;
  let total = 0;

  // Test 1: Health Check
  total++;
  if (await testHealthCheck()) passed++;

  // Test 2: Initialize Request
  total++;
  const sessionId = await testInitializeRequest();
  if (sessionId) passed++;

  if (sessionId) {
    // Test 3: List Tools
    total++;
    if (await testListTools(sessionId)) passed++;

    // Test 4: Tool Call
    total++;
    if (await testToolCall(sessionId)) passed++;

    // Test 5: SSE Connection
    total++;
    if (await testSSEConnection(sessionId)) passed++;
  }

  // Test 6: Invalid Session
  total++;
  if (await testInvalidSession()) passed++;

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
