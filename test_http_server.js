#!/usr/bin/env node

/**
 * Test script to start HTTP server and run basic tests
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startHttpServer() {
  console.log('🚀 Starting HTTP MCP Server...');
  
  const serverProcess = spawn('node', ['lib/index.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      TODO_API_TOKEN: 'test-token-for-http-demo',
      TODO_TRANSPORT: 'http',
      TODO_HTTP_PORT: '3000',
      TODO_HTTP_HOST: '127.0.0.1',
      LOG_LEVEL: 'info'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  let serverOutput = '';

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('[SERVER]', output.trim());
    
    if (output.includes('Todo for AI MCP Server is running')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error('[SERVER ERROR]', output.trim());
  });

  serverProcess.on('close', (code) => {
    console.log(`[SERVER] Process exited with code ${code}`);
  });

  serverProcess.on('error', (error) => {
    console.error('[SERVER] Process error:', error.message);
  });

  // Wait for server to be ready
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await sleep(1000);
    attempts++;
    console.log(`Waiting for server to be ready... (${attempts}/30)`);
  }

  if (!serverReady) {
    console.error('❌ Server failed to start within 30 seconds');
    serverProcess.kill();
    return null;
  }

  console.log('✅ HTTP MCP Server is ready!');
  return serverProcess;
}

async function testBasicHttpFunctionality() {
  console.log('\n=== Testing Basic HTTP Functionality ===');
  
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get('http://127.0.0.1:3000/health');
    console.log('✅ Health check passed:', healthResponse.data);

    // Test CORS preflight
    console.log('Testing CORS preflight...');
    const corsResponse = await axios.options('http://127.0.0.1:3000/mcp', {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Mcp-Session-Id'
      }
    });
    console.log('✅ CORS preflight passed');

    return true;
  } catch (error) {
    console.error('❌ Basic HTTP functionality test failed:', error.message);
    return false;
  }
}

async function runDemo() {
  console.log('🎯 HTTP Transport Demo');
  console.log('This demo will start the MCP server in HTTP mode and test basic functionality');
  
  let serverProcess = null;
  
  try {
    // Start the HTTP server
    serverProcess = await startHttpServer();
    if (!serverProcess) {
      console.error('Failed to start server');
      process.exit(1);
    }

    // Wait a bit for server to fully initialize
    await sleep(2000);

    // Test basic functionality
    const basicTestsPassed = await testBasicHttpFunctionality();
    
    if (basicTestsPassed) {
      console.log('\n🎉 HTTP Transport Demo completed successfully!');
      console.log('\nThe server is running at: http://127.0.0.1:3000');
      console.log('Health endpoint: http://127.0.0.1:3000/health');
      console.log('MCP endpoint: http://127.0.0.1:3000/mcp');
      console.log('\nYou can now run the full test suite with: node test_http_transport.js');
      console.log('\nPress Ctrl+C to stop the server');
      
      // Keep the server running
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping server...');
        if (serverProcess) {
          serverProcess.kill();
        }
        process.exit(0);
      });
      
      // Keep the process alive
      setInterval(() => {}, 1000);
      
    } else {
      console.log('\n💥 HTTP Transport Demo failed!');
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Demo failed:', error);
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run demo
runDemo().catch(error => {
  console.error('Demo runner failed:', error);
  process.exit(1);
});
