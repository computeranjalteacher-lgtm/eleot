/**
 * ELEOT AI Evaluator - Background Service Worker
 * Handles secure API key storage and manages extension state
 */

// Store API key securely in Chrome storage
// Note: For production, consider using a proxy server instead of storing keys in extension storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('ELEOT AI Evaluator installed');
  
  // Initialize storage with default values
  chrome.storage.local.get(['apiKey', 'apiEndpoint'], (result) => {
    if (!result.apiKey) {
      chrome.storage.local.set({
        apiKey: '', // User must set this in options page or popup
        apiEndpoint: 'https://api.openai.com/v1/chat/completions' // Default endpoint
      });
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle getApiKey
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting API key:', chrome.runtime.lastError);
        sendResponse({ apiKey: null, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ apiKey: result.apiKey || null });
      }
    });
    return true; // Indicates async response
  }
  
  // Handle setApiKey
  if (request.action === 'setApiKey') {
    chrome.storage.local.set({ apiKey: request.apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting API key:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('API key saved successfully');
        sendResponse({ success: true });
      }
    });
    return true; // Indicates async response
  }
  
  // Handle getApiEndpoint
  if (request.action === 'getApiEndpoint') {
    chrome.storage.local.get(['apiEndpoint'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting API endpoint:', chrome.runtime.lastError);
        sendResponse({ apiEndpoint: null, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ apiEndpoint: result.apiEndpoint || null });
      }
    });
    return true; // Indicates async response
  }
  
  // Handle setApiEndpoint
  if (request.action === 'setApiEndpoint') {
    chrome.storage.local.set({ apiEndpoint: request.apiEndpoint }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting API endpoint:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('API endpoint saved successfully:', request.apiEndpoint);
        sendResponse({ success: true });
      }
    });
    return true; // Indicates async response
  }
  
  // Return false if action is not recognized
  return false;
});
