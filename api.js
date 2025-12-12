/**
 * ELEOT AI Evaluator - API Service
 * Handles API key storage using localStorage and manages API calls
 */

// Initialize localStorage with default values if needed
const initializeStorage = () => {
  if (!localStorage.getItem('apiKey')) {
    localStorage.setItem('apiKey', '');
  }
  if (!localStorage.getItem('apiEndpoint')) {
    localStorage.setItem('apiEndpoint', 'https://api.openai.com/v1/chat/completions');
  }
};

// Initialize on load
initializeStorage();

/**
 * Get API key from localStorage
 * @returns {Promise<{apiKey: string|null}>}
 */
const getApiKey = async () => {
  try {
    const apiKey = localStorage.getItem('apiKey') || null;
    return { apiKey };
  } catch (error) {
    console.error('Error getting API key:', error);
    return { apiKey: null, error: error.message };
  }
};

/**
 * Set API key in localStorage
 * @param {string} apiKey - API key to store
 * @returns {Promise<{success: boolean}>}
 */
const setApiKey = async (apiKey) => {
  try {
    localStorage.setItem('apiKey', apiKey);
    console.log('API key saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error setting API key:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get API endpoint from localStorage
 * @returns {Promise<{apiEndpoint: string|null}>}
 */
const getApiEndpoint = async () => {
  try {
    const apiEndpoint = localStorage.getItem('apiEndpoint') || null;
    return { apiEndpoint };
  } catch (error) {
    console.error('Error getting API endpoint:', error);
    return { apiEndpoint: null, error: error.message };
  }
};

/**
 * Set API endpoint in localStorage
 * @param {string} apiEndpoint - API endpoint to store
 * @returns {Promise<{success: boolean}>}
 */
const setApiEndpoint = async (apiEndpoint) => {
  try {
    localStorage.setItem('apiEndpoint', apiEndpoint);
    console.log('API endpoint saved successfully:', apiEndpoint);
    return { success: true };
  } catch (error) {
    console.error('Error setting API endpoint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Call OpenAI API
 * @param {string} apiKey - OpenAI API key
 * @param {string} endpoint - API endpoint
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<Object>} API response
 */
const callOpenAI = async (apiKey, endpoint, systemPrompt, userPrompt) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const content = data.choices[0].message.content;
    
    // Try to parse JSON from the content
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Response is not valid JSON');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

/**
 * Call Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} endpoint - API endpoint
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<Object>} API response
 */
const callGemini = async (apiKey, endpoint, systemPrompt, userPrompt) => {
  try {
    // Combine system and user prompts for Gemini
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const url = `${endpoint}?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      throw new Error('Invalid response format from Gemini API');
    }

    const content = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from the content
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Response is not valid JSON');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

/**
 * Call LLM API (OpenAI or Gemini)
 * @param {string} provider - Provider name ('openai' or 'gemini')
 * @param {string} apiKey - API key
 * @param {string} endpoint - API endpoint
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<Object>} API response
 */
const callLLMAPI = async (provider, apiKey, endpoint, systemPrompt, userPrompt) => {
  if (provider === 'gemini') {
    return await callGemini(apiKey, endpoint, systemPrompt, userPrompt);
  } else {
    return await callOpenAI(apiKey, endpoint, systemPrompt, userPrompt);
  }
};

// Export functions for use in app.js
if (typeof window !== 'undefined') {
  window.apiService = {
    getApiKey,
    setApiKey,
    getApiEndpoint,
    setApiEndpoint,
    callLLMAPI
  };
}

