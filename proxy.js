/**
 * ELEOT AI Evaluator - Proxy Server
 * 
 * Secure proxy server for handling LLM API requests
 * This keeps your API key server-side and away from the browser extension
 * 
 * Usage:
 *   1. Install dependencies: npm install express cors dotenv
 *   2. Create .env file with: LLM_API_KEY=your-api-key-here
 *   3. Run: node proxy.js
 *   4. Update extension to use: http://localhost:3000/api/chat
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Use native fetch if available (Node 18+), otherwise use node-fetch
let fetch;
try {
  // Try to use native fetch (Node 18+)
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  // Fallback to node-fetch if native fetch not available
  fetch = require('node-fetch');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for extension requests
app.use(express.json()); // Parse JSON request bodies

// Get API key from environment variable
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_API_ENDPOINT = process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

// Validate API key on startup
if (!LLM_API_KEY) {
  console.warn('⚠️  WARNING: LLM_API_KEY not found in environment variables!');
  console.warn('   Create a .env file with: LLM_API_KEY=your-api-key-here');
  console.warn('   The proxy will return errors if API key is missing.');
}

/**
 * Proxy endpoint for LLM chat completions
 * POST /api/chat
 */
app.post('/api/chat', async (req, res) => {
  try {
    // Check if API key is configured
    if (!LLM_API_KEY) {
      return res.status(500).json({
        error: {
          message: 'API key not configured. Please set LLM_API_KEY environment variable.',
          type: 'configuration_error'
        }
      });
    }

    // Validate request body
    const { messages, model, temperature, max_tokens } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: messages array is required',
          type: 'invalid_request'
        }
      });
    }

    // Prepare request to LLM API
    const requestBody = {
      model: model || 'gpt-4o-mini',
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000
    };

    // Forward request to LLM API
    const response = await fetch(LLM_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // Parse response
    const data = await response.json();

    // Forward status code and response
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error'
      }
    });
  }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!LLM_API_KEY,
    endpoint: LLM_API_ENDPOINT
  });
});

/**
 * Root endpoint
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    service: 'ELEOT AI Evaluator Proxy',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat (POST)'
    },
    note: 'This is a proxy server for secure LLM API requests'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ELEOT AI Evaluator Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 LLM Endpoint: ${LLM_API_ENDPOINT}`);
  console.log(`🔑 API Key: ${LLM_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`\n💡 To use this proxy, update your extension's API endpoint to: http://localhost:${PORT}/api/chat`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down proxy server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...');
  process.exit(0);
});
