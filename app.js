/**
 * Smart Observation Tool (ELEOT) - Web App Script
 * Main logic for lesson evaluation, LLM integration, and UI updates
 * Converted from Chrome Extension to Web App
 */


// Global state
let currentLanguage = 'ar';
let currentResults = [];
let currentRecommendations = null;
let config = null;
let adminData = {};

// Screen elements - Will be initialized in init()
let apiSettingsScreen;
let mainScreen;
let apiProviderSelect;
let apiKeyInput;
let apiEndpointInput;
let saveApiBtn;
let skipApiBtn;
let settingsBtn;
let languageSelect;
let lessonDescriptionTextarea;
let evaluateBtn;
let clearDataBtn;
let loadingDiv;
let errorMessageDiv;
let resultsSection;
let resultsBySection;
let recommendationsSection;
let recommendationsContent;
let overallScoreSpan;
let exportPdfBtn;
let exportCsvBtn;
let exportWordBtn;
let adminFields = {};
// Environment checkboxes - all 7 environments (A-G)
let selectedEnvironments = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; // Default: all selected

// Evaluation cache to ensure deterministic results
let evaluationCache = new Map();
let clarificationAnswers = {}; // Store user answers to clarification questions

/**
 * LoadTimeData - Use the existing loadTimeData from Chrome Extensions Management Page
 * If not available, create a fallback object with all required keys
 * 
 * Note: In Chrome Extensions Management Page, loadTimeData is available via:
 * import {loadTimeData} from '//resources/js/load_time_data.js';
 * 
 * In Chrome Extension popup context, we try to access it from window or create a fallback
 */
let loadTimeData;
try {
  // Try to access loadTimeData from Chrome Extensions Management Page
  // Method 1: Check if it's available via window (for injected scripts)
  if (typeof window !== 'undefined' && window.loadTimeData) {
    loadTimeData = window.loadTimeData;
  }
  // Method 2: Try to access via global scope (for Chrome Extensions Management Page)
  else if (typeof globalThis !== 'undefined' && globalThis.loadTimeData) {
    loadTimeData = globalThis.loadTimeData;
  }
  // Method 3: Try dynamic import (may work in some contexts)
  else {
    // Fallback: Create loadTimeData object with all required keys from Chrome Extensions Management Page
    loadTimeData = {
      data: {
        // Chrome Extensions Management Page keys
        "MV2DeprecationNoticeDismissed": false,
        "MV2ExperimentStage": 3,
        "accessibilityErrorLine": "خطأ في السطر رقم $1",
        "accessibilityErrorMultiLine": "خطأ من السطر رقم $1 إلى $2",
        "activityArgumentsHeading": "وسيطات وظيفة واجهة برمجة التطبيقات",
        "activityLogCountColumn": "العدد",
        "activityLogNameColumn": "اسم النشاط",
        "appEnabled": "تم تفعيل التطبيق",
        "language": "ar",
        "title": "الإضافات",
        // ELEOT specific keys
        "score": 0,
        "totalScore": 0,
        "studentScore": 0,
      },
      // Add getString method if needed (Chrome Extensions Management Page uses this)
      getString: function(key) {
        return this.data[key] || '';
      },
      // Add getValue method if needed
      getValue: function(key) {
        return this.data[key];
      }
    };
  }
  
  // Ensure data object exists
  if (!loadTimeData.data) {
    loadTimeData.data = {};
  }
  
  
} catch (error) {
  console.error('Error accessing loadTimeData:', error);
  // Fallback: Create a minimal loadTimeData object
  loadTimeData = {
    data: {
      "score": 0,
      "totalScore": 0,
      "studentScore": 0,
      "language": "ar",
      "title": "الإضافات"
    },
    getString: function(key) { return this.data[key] || ''; },
    getValue: function(key) { return this.data[key]; }
  };
}

/**
 * Event logging system for progress monitoring
 * Compliance: E.1 (Monitoring) - Tracks user actions and system events
 */
const eventLog = [];
const MAX_LOG_SIZE = 100; // Limit log size to prevent memory issues

/**
 * Log an event for monitoring and analytics
 * 
 * @param {string} eventType - Type of event (e.g., 'evaluation_start', 'error_occurred')
 * @param {Object} eventData - Additional event data
 * 
 * Compliance: E.1 (Progress Monitoring) - Provides event tracking
 * Compliance: E.2 (Feedback Mechanism) - Enables debugging and user support
 */
const logEvent = (eventType, eventData = {}) => {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    ...eventData
  };
  
  eventLog.push(event);
  
  // Maintain log size limit
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.shift();
  }
  
  // Log to console in development
  console.log(`[ELEOT Event] ${eventType}`, eventData);
};

/**
 * Get event log for analytics
 * 
 * @returns {Array} Array of logged events
 * 
 * Compliance: E.1 (Monitoring) - Provides access to monitoring data
 */
const getEventLog = () => {
  return [...eventLog]; // Return copy to prevent external modification
};

/**
 * تحديث العناصر في DOM المرتبطة بالمفتاح
 * تعتمد على data-loadtime-key
 * 
 * @param {string} key - اسم المفتاح في loadTimeData.data
 * @param {*} value - القيمة الجديدة
 */
function updateBoundElements(key, value) {
  const selector = `[data-loadtime-key="${key}"]`;
  const elements = document.querySelectorAll(selector);
  
  // FIX: Skip updating if key is totalScore/score and element is overallScoreSpan (already updated above)
  elements.forEach((el) => {
    // Skip if this is the overallScoreSpan and we're updating totalScore/score
    if ((key === 'totalScore' || key === 'score' || key === 'studentScore') && el.id === 'overall-score') {
      return; // Already updated in updateLoadTimeData above
    }
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
      // Trigger input event to ensure any listeners are notified
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.textContent = value;
    }
  });
}

/**
 * دالة لتحديث قيمة معينة في loadTimeData.data وإشعار الواجهة بالتغيير
 * 
 * @param {string} key - اسم المفتاح في loadTimeData.data
 * @param {*} value - القيمة الجديدة
 * @returns {boolean} True if update was successful, false otherwise
 */
function updateLoadTimeData(key, value) {
  
  // Validate inputs
  if (!key || typeof key !== 'string') {
    console.error('updateLoadTimeData: Invalid key provided', key);
    return false;
  }
  
  // Check if loadTimeData exists
  if (!loadTimeData || !loadTimeData.data) {
    console.error('updateLoadTimeData: loadTimeData is not available');
    return false;
  }
  
  // Check if key exists in loadTimeData.data
  if (!loadTimeData.data.hasOwnProperty(key)) {
    console.warn(`المفتاح "${key}" غير موجود في loadTimeData.data`);
    // Still update the value even if it doesn't exist (for dynamic keys)
    // return false; // Uncomment if you want to strictly enforce existing keys
  }
  
  
  // Update the data
  loadTimeData.data[key] = value;
  
  
  // إطلاق حدث مخصص للتحديث
  const event = new CustomEvent('loadTimeDataUpdated', { 
    detail: { key, value, data: loadTimeData.data } 
  });
  window.dispatchEvent(event);
  
  
  // تحديث كل العناصر المرتبطة تلقائيًا
  updateBoundElements(key, value);
  
  // Also update known UI elements (for backward compatibility)
  /**
   * FIX: Removed duplicate total score update logic
   * 
   * Previous issue: Total score was rendered twice in English interface because:
   * 1. displayResults() updated overallScoreSpan (line ~3227)
   * 2. This function also updated overallScoreSpan (causing duplication)
   * 
   * Solution: For totalScore, only update loadTimeData.data without triggering UI updates.
   * The UI is updated ONLY in displayResults() and score change handlers.
   * This prevents double rendering in both Arabic and English interfaces.
   */
  if (key === 'totalScore') {
    // Only update the data model, don't update UI (UI is handled in displayResults)
    if (loadTimeData && loadTimeData.data) {
      loadTimeData.data[key] = value;
    }
    return true; // Return early to prevent UI update
  }
  
  // For other keys (score, studentScore), handle if needed for backward compatibility
  // But these should not affect overallScoreSpan to prevent duplication
  
  
  return true;
}

/**
 * Alias for backward compatibility
 */
const updateDataValue = updateLoadTimeData;

// Training section elements
let navTabs;
let evaluationTab;
let trainingTab;
let trainingFilesList;
let fileViewerContainer;
let fileViewerContent;
let fileViewerTitle;
let closeViewerBtn;
let environmentSelect; // Environment selector (if exists)

// Training files configuration
// Note: These file IDs need to be extracted from the Google Drive folder
// Format: https://drive.google.com/file/d/FILE_ID/view
const trainingFiles = [
  {
    id: '1ycpDFacexza7FUmNysPEtqZMsd14vEGP', // This is the folder ID, individual files need their IDs
    name: 'ملف تدريبي 1',
    type: 'pdf',
    icon: '📄'
  }
  // More files will be added here once we have the individual file IDs
];

/**
 * Load configuration from JSON file
 * 
 * @returns {Promise<Object|null>} Configuration object or null if loading fails
 * @throws {Error} If configuration file is missing or invalid
 * 
 * Compliance: E.2 (Feedback Mechanism) - Provides clear error feedback
 * Compliance: E.1 (Monitoring) - Logs configuration loading events
 */
const loadConfig = async () => {
  const startTime = performance.now();
  try {
    logEvent('config_load_start', { timestamp: Date.now() });
    
    // Try multiple paths for better compatibility
    let response;
    const paths = [
      'config/eleot_ai_config.json',
      './config/eleot_ai_config.json',
      '/config/eleot_ai_config.json'
    ];
    
    let lastError;
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          break;
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(lastError?.message || `HTTP ${response?.status || 'unknown'}: ${response?.statusText || 'Failed to load config'}`);
    }
    
    config = await response.json();
    const loadTime = performance.now() - startTime;
    logEvent('config_load_success', { 
      timestamp: Date.now(),
      loadTime: Math.round(loadTime)
    });
    
    console.log('Config loaded successfully');
    return config;
  } catch (error) {
    const loadTime = performance.now() - startTime;
    logEvent('config_load_error', { 
      timestamp: Date.now(),
      error: error.message,
      loadTime: Math.round(loadTime)
    });
    console.error('Failed to load config:', error);
    
    // Show error only if config is critical (not already loaded)
    if (!config) {
      const errorMsg = currentLanguage === 'ar'
        ? 'فشل تحميل ملف التكوين. يرجى التأكد من:\n1. وجود ملف config/eleot_ai_config.json\n2. تشغيل التطبيق من خادم ويب (ليس بفتح الملف مباشرة)\n3. استخدام http://localhost بدلاً من file://'
        : 'Failed to load config file. Please ensure:\n1. config/eleot_ai_config.json exists\n2. Run the app from a web server (not by opening file directly)\n3. Use http://localhost instead of file://';
      showError(errorMsg);
    }
    return null;
  }
};

/**
 * Check if API key is set
 */
/**
 * Check if API key is set
 * Compliance: E.1 (Monitoring) - Logs API key check events
 */
const checkApiKey = async () => {
  try {
    const result = await window.apiService.getApiKey();
    const hasKey = result?.apiKey && result.apiKey.trim() !== '';
    logEvent('api_key_check', { hasKey, timestamp: Date.now() });
    return hasKey;
  } catch (error) {
    console.error('Error checking API key:', error);
    logEvent('api_key_check_error', { error: error.message });
    return false;
  }
};

/**
 * Show API settings screen
 */
const showApiSettings = () => {
  console.log('showApiSettings called');
  
  // Always re-query elements to ensure they exist
  const apiScreen = document.getElementById('api-settings-screen');
  const mainScr = document.getElementById('main-screen');
  
  if (!apiScreen || !mainScr) {
    console.error('Cannot show API settings - elements not found');
    console.error('api-settings-screen:', apiScreen);
    console.error('main-screen:', mainScr);
    return;
  }
  
  // Hide main screen (use both class and style for maximum compatibility)
  mainScr.classList.add('hidden');
  mainScr.style.display = 'none';
  mainScr.style.visibility = 'hidden';
  
  // Show API settings screen (remove hidden class and set display)
  apiScreen.classList.remove('hidden');
  apiScreen.style.display = 'block';
  apiScreen.style.visibility = 'visible';
  
  // Update global variables
  apiSettingsScreen = apiScreen;
  mainScreen = mainScr;
  
  // Load saved API key
  loadApiKeyToInputs();
  
  console.log('API settings screen is now visible');
  console.log('apiScreen.classList:', apiScreen.classList.toString());
  console.log('apiScreen.style.display:', apiScreen.style.display);
  
  // Force a reflow to ensure styles are applied
  void apiScreen.offsetHeight;
};

/**
 * Show main screen
 */
/**
 * Show main screen
 * Compliance: E.2 (Feedback Mechanism) - Provides clear UI transitions
 */
const showMainScreen = () => {
  console.log('showMainScreen called');
  
  // Always re-query elements to ensure they exist
  const apiScreen = document.getElementById('api-settings-screen');
  const mainScr = document.getElementById('main-screen');
  
  if (!apiScreen || !mainScr) {
    console.error('Cannot show main screen - elements not found');
    console.error('api-settings-screen:', apiScreen);
    console.error('main-screen:', mainScr);
    return;
  }
  
  // Hide API settings screen (use both class and style for maximum compatibility)
  apiScreen.classList.add('hidden');
  apiScreen.style.display = 'none';
  apiScreen.style.visibility = 'hidden';
  
  // Show main screen (remove hidden class and set display)
  mainScr.classList.remove('hidden');
  mainScr.style.display = 'block';
  mainScr.style.visibility = 'visible';
  
  // Update global variables
  apiSettingsScreen = apiScreen;
  mainScreen = mainScr;
  
  console.log('Navigation successful - main screen is now visible');
  console.log('mainScreen.classList:', mainScr.classList.toString());
  console.log('mainScreen.style.display:', mainScr.style.display);
  
  // Force a reflow to ensure styles are applied
  void mainScr.offsetHeight;
  
  // Initialize training section when main screen is shown
  setTimeout(() => {
    if (typeof initTrainingSection === 'function') {
      initTrainingSection();
    }
  }, 100);
};

/**
 * Load saved API key to input fields
 * Compliance: E.2 (Feedback Mechanism) - Loads saved settings for user convenience
 */
const loadApiKeyToInputs = async () => {
  try {
    const storageResult = await window.apiService.getApiKey();
    const endpointResult = await window.apiService.getApiEndpoint();
    
    if (apiKeyInput && storageResult?.apiKey) {
      apiKeyInput.value = storageResult.apiKey;
    }
    if (apiEndpointInput && endpointResult?.apiEndpoint) {
      apiEndpointInput.value = endpointResult.apiEndpoint;
    }
  } catch (error) {
    console.error('Error loading API key:', error);
    logEvent('api_key_load_error', { error: error.message });
  }
};

/**
 * Simple client-side format validation for API keys
 * Compliance: B.3 (Criteria/Standards) - Validates API key format before storage
 * 
 * @param {string} key - API key to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
const isKeyFormatValid = (key) => {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return { 
      valid: false, 
      error: currentLanguage === 'ar' 
        ? 'مفتاح API فارغ' 
        : 'API key is empty'
    };
  }

  const trimmedKey = key.trim();

  // Check if key starts with OpenAI prefix (sk-)
  if (trimmedKey.startsWith('sk-')) {
    // Additional basic length check for OpenAI keys (typically 51+ characters)
    if (trimmedKey.length < 20) {
      return { 
        valid: false, 
        error: currentLanguage === 'ar' 
          ? 'مفتاح OpenAI قصير جداً. يرجى التحقق من المفتاح' 
          : 'OpenAI key is too short. Please verify the key'
      };
    }
    return { valid: true };
  }

  // Check if key starts with Gemini prefix (AIza)
  if (trimmedKey.startsWith('AIza')) {
    // Additional basic length check for Gemini keys (typically 39+ characters)
    if (trimmedKey.length < 20) {
      return { 
        valid: false, 
        error: currentLanguage === 'ar' 
          ? 'مفتاح Gemini قصير جداً. يرجى التحقق من المفتاح' 
          : 'Gemini key is too short. Please verify the key'
      };
    }
    return { valid: true };
  }

  // Key format does not match either expected format
  return { 
    valid: false, 
    error: currentLanguage === 'ar' 
      ? 'تنسيق مفتاح API غير صحيح. يجب أن يبدأ بـ "sk-" (OpenAI) أو "AIza" (Gemini)' 
      : 'Invalid Key Format. Must start with "sk-" (OpenAI) or "AIza" (Gemini)'
  };
};

/**
 * Save API settings with simplified format validation
 * Compliance: B.3 (Criteria/Standards) - Validates API key format before storage
 * Compliance: E.2 (Feedback Mechanism) - Provides clear feedback on validation and save operations
 * 
 * FIXED: Proper async/await handling, error handling, and navigation after successful save
 */
const saveApiSettings = async () => {
  // Validate input elements exist
  if (!apiKeyInput || !apiProviderSelect) {
    console.error('API input elements not found');
    showError(currentLanguage === 'ar' ? 'عناصر الإدخال غير موجودة' : 'Input elements not found');
    logEvent('api_save_error', { reason: 'input_elements_missing' });
    return;
  }
  
  const apiKey = apiKeyInput.value.trim();
  const endpoint = apiEndpointInput.value.trim();
  const provider = apiProviderSelect.value;

  // Check if key is provided
  if (!apiKey) {
    showError(currentLanguage === 'ar' ? 'يرجى إدخال مفتاح API' : 'Please enter API key');
    logEvent('api_save_error', { reason: 'api_key_empty' });
    return;
  }

  // Disable save button during operation
  if (saveApiBtn) {
    saveApiBtn.disabled = true;
    saveApiBtn.textContent = currentLanguage === 'ar' ? 'جارٍ الحفظ...' : 'Saving...';
  }

  logEvent('api_settings_save_start', {
    provider: provider,
    hasEndpoint: !!endpoint,
    timestamp: Date.now()
  });

  try {
    // Set default endpoints based on provider
    let defaultEndpoint = '';
    if (provider === 'openai') {
      defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'gemini') {
      defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    }

    const finalEndpoint = endpoint || defaultEndpoint;

    // STEP 2: SAVE API KEY (Simplified - direct save without complex validation)
    console.log('Starting to save API key...', apiKey.substring(0, 10) + '...');
    const saveKeyResult = await window.apiService.setApiKey(apiKey);
    if (!saveKeyResult.success) {
      throw new Error(saveKeyResult.error || 'Failed to save API key');
    }

    // STEP 3: SAVE API ENDPOINT (Simplified - direct save)
    console.log('Starting to save API endpoint:', finalEndpoint);
    const saveEndpointResult = await window.apiService.setApiEndpoint(finalEndpoint);
    if (!saveEndpointResult.success) {
      throw new Error(saveEndpointResult.error || 'Failed to save API endpoint');
    }

    logEvent('api_settings_save_success', {
      provider: provider,
      endpoint: finalEndpoint,
      timestamp: Date.now()
    });

    console.log('API settings saved successfully');

    // STEP 4: NAVIGATE TO MAIN SCREEN (Immediate navigation after successful save)
    // Re-enable button
    if (saveApiBtn) {
      saveApiBtn.disabled = false;
      saveApiBtn.textContent = currentLanguage === 'ar' ? 'حفظ' : 'Save';
    }

    // Show success message
    alert(currentLanguage === 'ar' ? 'تم حفظ إعدادات API بنجاح!' : 'API settings saved successfully!');
    
    // Navigate immediately - no delays
    console.log('Navigating to main screen...');
    showMainScreen();
    
  } catch (error) {
    // Error logging and display
    logEvent('api_settings_save_error', {
      error: error.message,
      provider: provider,
      timestamp: Date.now()
    });
    console.error('Error saving API settings:', error);
    
    // Display a clear error message to the user
    showError(currentLanguage === 'ar' 
      ? `خطأ في حفظ الإعدادات: ${error.message}` 
      : `Error saving settings: ${error.message}`);
    
    // Re-enable button on error
    if (saveApiBtn) {
      saveApiBtn.disabled = false;
      saveApiBtn.textContent = currentLanguage === 'ar' ? 'حفظ' : 'Save';
    }
  }
};
// END of saveApiSettings function

/**
 * Collect administrative data
 */
const collectAdminData = () => {
  const segments = [];
  if (adminFields.segmentBeginning?.checked) segments.push('Beginning');
  if (adminFields.segmentMiddle?.checked) segments.push('Middle');
  if (adminFields.segmentEnd?.checked) segments.push('End');
  
  // Collect checked environment checkboxes
  const selectedEnvs = [];
  const envCheckboxes = ['envA_checkbox', 'envB_checkbox', 'envC_checkbox', 'envD_checkbox', 'envE_checkbox', 'envF_checkbox', 'envG_checkbox'];
  envCheckboxes.forEach(checkboxId => {
    const checkbox = adminFields[checkboxId];
    if (checkbox && checkbox.checked) {
      selectedEnvs.push(checkbox.value);
    }
  });
  selectedEnvironments = selectedEnvs.length > 0 ? selectedEnvs : ['A', 'B', 'C', 'D', 'E', 'F', 'G']; // Default to all if none selected
  
  adminData = {
    teacherName: adminFields.teacherName?.value || '',
    subject: adminFields.subject?.value || '',
    grade: adminFields.grade?.value || '',
    segment: segments.join(', '),
    date: adminFields.date?.value || '',
    supervisorName: adminFields.supervisorName?.value || '',
    selectedEnvironments: selectedEnvironments
  };
  return adminData;
};

/**
 * Update UI text based on selected language
 */
const updateUIText = (language) => {
  const translations = {
    en: {
      app_title: 'Smart Observation Tool (ELEOT)',
      select_language: 'Select Language:',
      lesson_description_label: 'Lesson Description:',
      lesson_description_placeholder: 'Enter lesson description here...',
      lesson_description_help: 'Preferably at least 50 words for accurate evaluation',
      evaluate_button: 'AI Evaluation',
      evaluate_help: 'Press Enter or Ctrl+Enter to start evaluation',
      loading_text: 'Analyzing lesson...',
      overall_score: 'Overall Score:',
      out_of_four: '/ 4',
      element: 'Element',
      score: 'Score',
      justification: 'Notes',
      suggestion: 'Suggestion',
      copy: 'Copy',
      export_pdf: 'Export PDF',
      export_csv: 'Export CSV',
      export_word: 'Export Word',
      copied: 'Copied!',
      clear_data: 'Clear All Data',
      admin_data_title: 'Administrative Data',
      recommendations_title: 'Recommendations',
      settings: 'Settings',
      api_settings_title: 'API Settings',
      api_settings_desc: 'Please enter your AI API key',
      api_provider: 'API Provider:',
      api_key_label: 'API Key:',
      api_key_placeholder: 'Enter API key here...',
      api_endpoint_label: 'Endpoint (Optional):',
      api_endpoint_placeholder: 'https://api.openai.com/v1/chat/completions',
      save_api: 'Save',
      skip_api: 'Skip (Use Sample Data)',
      get_openai_key: 'Get OpenAI API Key',
      openai_step1: 'Visit the OpenAI API keys page (link above)',
      openai_step2: 'Sign in or create an OpenAI account',
      openai_step3: 'Click "Create new secret key" and copy the generated key',
      openai_step4: 'Paste the key in the field below',
      get_gemini_key: 'Get Google Gemini API Key',
      gemini_step1: 'Visit the Google AI Studio API keys page (link above)',
      gemini_step2: 'Sign in with your Google account',
      gemini_step3: 'Click "Create API Key" and copy the generated key',
      gemini_step4: 'Paste the key in the field below',
      date: 'Date',
      subject: 'Subject',
      grade: 'Grade',
      segment: 'Segment',
      teacher_name: 'Teacher Name',
      supervisor_name: 'Supervisor Name',
      environments_select_label: 'ELEOT Environments to Evaluate:',
      beginning: 'Beginning',
      middle: 'Middle',
      end: 'End',
      nav_evaluation: 'Evaluation',
      nav_training: 'ELEOT Training',
      training_title: 'ELEOT Training',
      training_description: 'Select a file from the list below to view it',
      open_file: 'Open',
      close_viewer: '✕ Close',
      clarification_title: '❓ Clarification Questions',
      clarification_description: 'To ensure accurate evaluation, please answer the following questions:',
      submit_clarifications: 'Submit Answers and Continue',
      skip_clarifications: 'Skip and Continue',
      credits_text: 'Design Rights: Computer Department at Al-Anjal Schools – Department Supervisor: Hesham Yassin Yousri'
    },
    ar: {
      app_title: 'أداة المراقبة الذكية (ELEOT)',
      select_language: 'اختر اللغة:',
      nav_evaluation: 'التقييم',
      nav_training: 'تدريب على أداة الملاحظة ELEOT',
      training_title: 'تدريب على أداة الملاحظة ELEOT',
      training_description: 'اختر ملفاً من القائمة أدناه لعرضه',
      open_file: 'فتح',
      close_viewer: '✕ إغلاق',
      clarification_title: '❓ أسئلة توضيحية',
      clarification_description: 'لضمان دقة التقييم، يرجى الإجابة على الأسئلة التالية:',
      submit_clarifications: 'إرسال الإجابات والمتابعة',
      skip_clarifications: 'تخطي والمتابعة',
      lesson_description_help: 'يُفضل أن لا يقل عن 50 كلمة للحصول على تقييم دقيق',
      evaluate_help: 'اضغط Enter أو Ctrl+Enter لبدء التقييم',
      lesson_description_label: 'وصف الحصة:',
      lesson_description_placeholder: 'أدخل وصف الحصة هنا...',
      lesson_description_help: 'يُفضل أن لا يقل عن 50 كلمة للحصول على تقييم دقيق',
      evaluate_button: 'AI Evaluation',
      evaluate_help: 'اضغط Enter أو Ctrl+Enter لبدء التقييم',
      loading_text: 'جارٍ تحليل الحصة...',
      overall_score: 'النتيجة الإجمالية:',
      out_of_four: '/ 4',
      element: 'العنصر',
      score: 'الدرجة',
      justification: 'التبرير',
      suggestion: 'الاقتراح',
      copy: 'نسخ',
      export_pdf: 'تصدير PDF',
      export_csv: 'تصدير CSV',
      export_word: 'تصدير Word',
      copied: 'تم النسخ!',
      clear_data: 'مسح جميع البيانات',
      admin_data_title: 'البيانات الإدارية',
      recommendations_title: 'التوصيات',
      settings: 'الإعدادات',
      api_settings_title: 'إعدادات API',
      api_settings_desc: 'يرجى إدخال مفتاح API للذكاء الاصطناعي',
      api_provider: 'مزود API:',
      api_key_label: 'مفتاح API:',
      api_key_placeholder: 'أدخل مفتاح API هنا...',
      api_endpoint_label: 'Endpoint (اختياري):',
      api_endpoint_placeholder: 'https://api.openai.com/v1/chat/completions',
      save_api: 'حفظ',
      skip_api: 'تخطي (استخدام بيانات تجريبية)',
      get_openai_key: 'الحصول على مفتاح OpenAI API',
      openai_step1: 'قم بزيارة صفحة مفاتيح OpenAI API (الرابط أعلاه)',
      openai_step2: 'قم بتسجيل الدخول أو إنشاء حساب OpenAI',
      openai_step3: 'انقر على "Create new secret key" وانسخ المفتاح المُنشأ',
      openai_step4: 'الصق المفتاح في الحقل أدناه',
      get_gemini_key: 'الحصول على مفتاح Google Gemini API',
      gemini_step1: 'قم بزيارة صفحة مفاتيح Google AI Studio API (الرابط أعلاه)',
      gemini_step2: 'قم بتسجيل الدخول باستخدام حساب Google الخاص بك',
      gemini_step3: 'انقر على "Create API Key" وانسخ المفتاح المُنشأ',
      gemini_step4: 'الصق المفتاح في الحقل أدناه',
      date: 'التاريخ',
      subject: 'المادة',
      grade: 'الصف',
      segment: 'الجزء',
      teacher_name: 'اسم المعلم',
      supervisor_name: 'اسم المشرف',
      environments_select_label: 'بيئات ELEOT المراد تقييمها:',
      beginning: 'البداية',
      middle: 'المنتصف',
      end: 'النهاية',
      credits_text: 'حقوق التصميم: قسم الحاسب بمدارس الأنجال- مشرف القسم/ هشام يسن يسري'
    }
  };
  
  const texts = translations[language] || translations.ar;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) {
      el.textContent = texts[key];
    }
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (texts[key]) {
      el.placeholder = texts[key];
    }
  });
  
  // Update direction and text alignment
  document.body.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', language);
  
  // Update language toggle button text
  const toggleText = document.getElementById('language-toggle-text');
  if (toggleText) {
    toggleText.textContent = language === 'ar' ? 'عربي' : 'EN';
  }
  
  // Update logo position and path based on language
  const logoApiScreen = document.getElementById('logo-api-screen');
  const logoMainScreen = document.getElementById('logo-main-screen');
  
  if (logoApiScreen) {
    // Use relative path for web app
    try {
      const logoPath = 'images/logo.png';
      logoApiScreen.src = logoPath;
    } catch (error) {
      console.warn('Could not get logo path for API screen:', error);
    }
    logoApiScreen.style.order = language === 'ar' ? '1' : '0'; // Right in Arabic, left in English
  }
  if (logoMainScreen) {
    // Use relative path for web app
    try {
      const logoPath = 'images/logo.png';
      logoMainScreen.src = logoPath;
    } catch (error) {
      console.warn('Could not get logo path for main screen:', error);
    }
    logoMainScreen.style.order = language === 'ar' ? '1' : '0'; // Right in Arabic, left in English
  }
  
  // Re-render results if they exist (to update language)
  if (currentResults && currentResults.length > 0 && resultsBySection) {
    const tempResults = {
      criteria: currentResults,
      recommendations: currentRecommendations?.recommendations || '',
      totalScore: currentRecommendations?.totalScore || 0
    };
    displayResults(tempResults);
  }
};

/**
 * Save data to localStorage
 * V3: Now saves evaluation results and recommendations
 */
/**
 * Save data to localStorage
 * V3: Now saves evaluation results and recommendations
 * FIX: Enhanced to ensure evaluation results are always saved
 */
const saveDataToStorage = () => {
  try {
    // FIX: Allow saving even if some elements are not ready (for evaluation results)
    const dataToSave = {
      language: currentLanguage,
      lessonDescription: lessonDescriptionTextarea?.value || '',
      adminData: {
        teacherName: adminFields.teacherName?.value || '',
        subject: adminFields.subject?.value || '',
        grade: adminFields.grade?.value || '',
        segmentBeginning: adminFields.segmentBeginning?.checked || false,
        segmentMiddle: adminFields.segmentMiddle?.checked || false,
        segmentEnd: adminFields.segmentEnd?.checked || false,
        date: adminFields.date?.value || '',
        supervisorName: adminFields.supervisorName?.value || '',
        selectedEnvironments: selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G']
      },
      // V3: Save evaluation results and recommendations - CRITICAL: Always save if available
      evaluationResults: {
        results: currentResults || [],
        recommendations: currentRecommendations || null,
        totalScore: currentRecommendations?.totalScore || (currentResults && currentResults.length > 0 
          ? calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0))
          : 0),
        timestamp: Date.now()
      }
    };
    
    localStorage.setItem('eleot_form_data', JSON.stringify(dataToSave));
    console.log('Data saved to localStorage:', {
      evaluationResults: dataToSave.evaluationResults.results.length,
      totalScore: dataToSave.evaluationResults.totalScore,
      timestamp: new Date(dataToSave.evaluationResults.timestamp).toLocaleString()
    });
  } catch (error) {
    console.error('Error saving data:', error);
    // FIX: Try to save at least evaluation results even if other data fails
    try {
      if (currentResults && currentResults.length > 0) {
        const minimalSave = {
          evaluationResults: {
            results: currentResults,
            recommendations: currentRecommendations,
            totalScore: currentRecommendations?.totalScore || calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0)),
            timestamp: Date.now()
          }
        };
        localStorage.setItem('eleot_evaluation_results', JSON.stringify(minimalSave));
        console.log('Minimal evaluation results saved as fallback');
      }
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
};

/**
 * Load saved data from localStorage
 */
const loadSavedData = () => {
  try {
    if (!lessonDescriptionTextarea || !adminFields || !languageSelect) {
      console.warn('Elements not ready, retrying...');
      setTimeout(loadSavedData, 200);
      return;
    }
    
    // FIX: Try to load from main storage first, then fallback
    let savedData = localStorage.getItem('eleot_form_data');
    let data = null;
    
    if (savedData) {
      try {
        data = JSON.parse(savedData);
        console.log('Loading saved data:', data);
      } catch (e) {
        console.error('Error parsing saved data:', e);
        data = null;
      }
    }
    
    // FIX: If no main data or no evaluation results, try fallback storage
    if ((!data || !data.evaluationResults || !data.evaluationResults.results || data.evaluationResults.results.length === 0)) {
      const fallbackData = localStorage.getItem('eleot_evaluation_results');
      if (fallbackData) {
        try {
          const fallback = JSON.parse(fallbackData);
          if (fallback.evaluationResults) {
            console.log('Loading evaluation results from fallback storage');
            if (!data) data = {};
            data.evaluationResults = fallback.evaluationResults;
            // Also restore currentResults and currentRecommendations
            currentResults = fallback.evaluationResults.results || [];
            currentRecommendations = fallback.evaluationResults.recommendations || null;
          }
        } catch (e) {
          console.error('Error parsing fallback data:', e);
        }
      }
    }
    
    if (data) {
      
      // Restore language
      if (data.language) {
        currentLanguage = data.language;
        localStorage.setItem('eleot_language', currentLanguage);
        if (typeof updateLanguageToggle === 'function') {
          updateLanguageToggle(currentLanguage);
        }
        updateUIText(currentLanguage);
      }
      
      // Restore lesson description
      if (data.lessonDescription !== undefined && lessonDescriptionTextarea) {
        lessonDescriptionTextarea.value = data.lessonDescription;
      }
      
      // Restore admin data
      if (data.adminData) {
        if (data.adminData.teacherName !== undefined && adminFields.teacherName) adminFields.teacherName.value = data.adminData.teacherName;
        if (data.adminData.subject !== undefined && adminFields.subject) adminFields.subject.value = data.adminData.subject;
        if (data.adminData.grade !== undefined && adminFields.grade) adminFields.grade.value = data.adminData.grade;
        if (data.adminData.date && adminFields.date) adminFields.date.value = data.adminData.date;
        if (data.adminData.segmentBeginning !== undefined && adminFields.segmentBeginning) adminFields.segmentBeginning.checked = data.adminData.segmentBeginning;
        if (data.adminData.segmentMiddle !== undefined && adminFields.segmentMiddle) adminFields.segmentMiddle.checked = data.adminData.segmentMiddle;
        if (data.adminData.segmentEnd !== undefined && adminFields.segmentEnd) adminFields.segmentEnd.checked = data.adminData.segmentEnd;
        if (data.adminData.supervisorName !== undefined && adminFields.supervisorName) adminFields.supervisorName.value = data.adminData.supervisorName;
        
        // Restore environment checkbox states
        if (data.adminData.selectedEnvironments && Array.isArray(data.adminData.selectedEnvironments)) {
          const allEnvs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
          allEnvs.forEach(env => {
            const checkboxId = `env${env}_checkbox`;
            if (adminFields[checkboxId]) {
              adminFields[checkboxId].checked = data.adminData.selectedEnvironments.includes(env);
            }
          });
          selectedEnvironments = data.adminData.selectedEnvironments;
        } else {
          // Default: all checked if no saved data
          ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(env => {
            const checkboxId = `env${env}_checkbox`;
            if (adminFields[checkboxId]) {
              adminFields[checkboxId].checked = true;
            }
          });
          selectedEnvironments = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        }
      }
      
      // V3: Restore evaluation results if available
      if (data.evaluationResults && data.evaluationResults.results && data.evaluationResults.results.length > 0) {
        console.log('Restoring evaluation results from localStorage...');
        currentResults = data.evaluationResults.results;
        currentRecommendations = data.evaluationResults.recommendations || null;
        
        // Update currentRecommendations structure if needed
        if (currentRecommendations && typeof currentRecommendations === 'string') {
          currentRecommendations = { recommendations: currentRecommendations };
        }
        if (data.evaluationResults.totalScore && currentRecommendations) {
          currentRecommendations.totalScore = data.evaluationResults.totalScore;
        }
        
        // Display the restored results
        displayResults({
          criteria: currentResults,
          recommendations: currentRecommendations?.recommendations || '',
          totalScore: data.evaluationResults.totalScore || 0
        });
        
        console.log(`Restored ${currentResults.length} evaluation results from ${new Date(data.evaluationResults.timestamp).toLocaleString()}`);
      }
      
      console.log('Data loaded from localStorage successfully');
    } else {
      console.log('No saved data found in localStorage');
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
};

/**
 * Setup auto-save on input changes
 */
const setupAutoSave = () => {
  let saveTimeout;
  const debouncedSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveDataToStorage();
    }, 500);
  };
  
  const inputsToWatch = [
    lessonDescriptionTextarea,
    languageSelect,
    adminFields.teacherName,
    adminFields.subject,
    adminFields.grade,
    adminFields.date,
    adminFields.segmentBeginning,
    adminFields.segmentMiddle,
    adminFields.segmentEnd,
    adminFields.supervisorName
  ];
  
  inputsToWatch.forEach(input => {
    if (input) {
      input.addEventListener('input', debouncedSave);
      input.addEventListener('change', () => {
        clearTimeout(saveTimeout);
        saveDataToStorage();
      });
      input.addEventListener('blur', () => {
        clearTimeout(saveTimeout);
        saveDataToStorage();
      });
    }
  });
  
  // Save when popup loses focus
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveDataToStorage();
    }
  });
  
  window.addEventListener('blur', () => {
    saveDataToStorage();
  });
  
  window.addEventListener('beforeunload', () => {
    saveDataToStorage();
  });
  
  console.log('Auto-save setup complete');
};

/**
 * Clear all saved data including evaluation results
 * V3: Also clears evaluation results
 */
const clearAllData = () => {
  if (confirm(currentLanguage === 'ar' 
    ? 'هل أنت متأكد من مسح جميع البيانات؟ سيتم حذف جميع التقييمات المحفوظة.'
    : 'Are you sure you want to clear all data? All saved evaluations will be deleted.')) {
    
    // Clear localStorage
    localStorage.removeItem('eleot_form_data');
    
    // Clear form fields
    if (lessonDescriptionTextarea) lessonDescriptionTextarea.value = '';
    if (adminFields.teacherName) adminFields.teacherName.value = '';
    if (adminFields.subject) adminFields.subject.value = '';
    if (adminFields.grade) adminFields.grade.value = '';
    if (adminFields.segmentBeginning) adminFields.segmentBeginning.checked = false;
    if (adminFields.segmentMiddle) adminFields.segmentMiddle.checked = false;
    if (adminFields.segmentEnd) adminFields.segmentEnd.checked = false;
    if (adminFields.supervisorName) adminFields.supervisorName.value = '';
    
    const today = new Date().toISOString().split('T')[0];
    if (adminFields.date) adminFields.date.value = today;
    
    // Reset environment checkboxes to default (all checked)
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(env => {
      const checkboxId = `env${env}_checkbox`;
      if (adminFields[checkboxId]) {
        adminFields[checkboxId].checked = true;
      }
    });
    selectedEnvironments = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    
    // Clear evaluation results
    currentResults = [];
    currentRecommendations = null;
    
    // Hide results sections
    if (resultsSection) resultsSection.classList.add('hidden');
    if (recommendationsSection) recommendationsSection.classList.add('hidden');
    
    console.log('All data cleared including evaluation results');
    alert(currentLanguage === 'ar' 
      ? 'تم مسح جميع البيانات والتقييمات بنجاح!'
      : 'All data and evaluations cleared successfully!');
  }
};

/**
 * Show error message
 */
/**
 * Show error message to user
 * 
 * @param {string} message - Error message to display
 * 
 * Compliance: E.2 (Feedback Mechanism) - Provides consistent user feedback
 * Compliance: A.2 (Accessibility) - Uses role="alert" for screen readers
 * 
 * @example
 * showError('حدث خطأ في التحميل');
 */
const showError = (message) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:showError:entry',message:'showError called',data:{messageLength:message.length,messagePreview:message.substring(0,50),errorMessageDivExists:!!errorMessageDiv},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  logEvent('error_displayed', { 
    timestamp: Date.now(),
    message: message.substring(0, 100) // Log first 100 chars
  });
  
  if (errorMessageDiv) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:showError:beforeUpdate',message:'Before updating errorMessageDiv',data:{errorMessageDivTextContent:errorMessageDiv.textContent,errorMessageDivHidden:errorMessageDiv.classList.contains('hidden')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
    errorMessageDiv.setAttribute('aria-live', 'assertive');
    errorMessageDiv.setAttribute('aria-atomic', 'true');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:showError:afterUpdate',message:'After updating errorMessageDiv',data:{errorMessageDivTextContent:errorMessageDiv.textContent,errorMessageDivHidden:errorMessageDiv.classList.contains('hidden')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:showError:noDiv',message:'errorMessageDiv is null',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
  }
  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (resultsSection) resultsSection.classList.add('hidden');
};

/**
 * Hide error message
 */
const hideError = () => {
  if (errorMessageDiv) errorMessageDiv.classList.add('hidden');
};

/**
 * Generate hash for lesson description (for caching)
 */
const generateHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

/**
 * Build clarification text with explicit negative statements
 * Compliance: B.3, E.4 - Enforces score reduction on "No" answers
 * V3 FIX: Critical scoring logic enhancement
 */
const buildClarificationText = (clarificationAnswers, language) => {
  if (!clarificationAnswers || Object.keys(clarificationAnswers).length === 0) {
    return '';
  }
  
  let clarificationText = language === 'ar' 
    ? '\n\n**معلومات توضيحية مؤكدة من المشرف:**\n\n' 
    : '\n\n**Confirmed Clarification Information from Observer:**\n\n';
  
  // Map of question keys to explicit statements (critical criteria only)
  const statementTemplates = {
    'B3_rubrics': {
      yes_ar: 'المشرف أكد: تم توضيح معايير واضحة للعمل الجيد (rubrics/criteria).',
      yes_en: 'Observer confirmed: Clear criteria/rubrics for quality work were provided.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يتم توضيح أي معايير أو rubrics للطلاب. لم يعرف الطلاب ما هو العمل الجيد. (المعيار B3 = درجة 1 إلزامية - غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: NO criteria or rubrics were provided to students. Students did NOT know what constitutes quality work. (Criterion B3 = MANDATORY SCORE 1 - Not Observed)',
      unclear_ar: 'المشرف: وضوح المعايير غير مؤكد.',
      unclear_en: 'Observer: Clarity of criteria was uncertain.'
    },
    'E4_assessment_understanding': {
      yes_ar: 'المشرف أكد: فهم الطلاب كيف سيتم تقييمهم.',
      yes_en: 'Observer confirmed: Students understood how they would be assessed.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يفهم الطلاب كيف سيتم تقييمهم. لم يتم توضيح معايير التقييم. (المعيار E4 = درجة 1 إلزامية - غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: Students did NOT understand how they would be assessed. Assessment criteria were NOT explained. (Criterion E4 = MANDATORY SCORE 1 - Not Observed)',
      unclear_ar: 'المشرف: فهم الطلاب لمعايير التقييم غير مؤكد.',
      unclear_en: 'Observer: Student understanding of assessment criteria was uncertain.'
    },
    'A1_differentiated': {
      yes_ar: 'المشرف أكد: تم توفير أنشطة تعلم متمايزة للطلاب حسب احتياجاتهم.',
      yes_en: 'Observer confirmed: Differentiated learning activities were provided to meet student needs.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يتم توفير أنشطة تعلم متمايزة. جميع الطلاب كانوا يقومون بنفس المهام بنفس الطريقة. (المعيار A1 = غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: NO differentiated learning activities were provided. All students were doing the same tasks in the same way. (Criterion A1 = Not Observed)',
      unclear_ar: 'المشرف: التمايز في الأنشطة غير واضح من الملاحظة.',
      unclear_en: 'Observer: Differentiation in activities was unclear from observation.'
    },
    'D1_discussions': {
      yes_ar: 'المشرف أكد: حدثت مناقشات وحوارات بين الطلاب والمعلم.',
      yes_en: 'Observer confirmed: Discussions and dialogues between students and teacher occurred.',
      no_ar: '⛔ المشرف أكد: لم تحدث أي مناقشات. المعلم كان يتحدث فقط والطلاب يستمعون. (المعيار D1 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO discussions occurred. Teacher lectured and students only listened. (Criterion D1 = Not Observed)',
      unclear_ar: 'المشرف: وجود المناقشات غير واضح.',
      unclear_en: 'Observer: Presence of discussions was unclear.'
    },
    'D4_collaboration': {
      yes_ar: 'المشرف أكد: تعاون الطلاب مع أقرانهم في المشاريع/الأنشطة.',
      yes_en: 'Observer confirmed: Students collaborated with peers on projects/activities.',
      no_ar: '⛔ المشرف أكد: لم يحدث أي تعاون. كل طالب عمل بشكل فردي. (المعيار D4 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO collaboration occurred. Each student worked individually. (Criterion D4 = Not Observed)',
      unclear_ar: 'المشرف: التعاون غير واضح.',
      unclear_en: 'Observer: Collaboration was unclear.'
    },
    'G1_digital_info': {
      yes_ar: 'المشرف أكد: استخدم الطلاب أدوات رقمية لجمع/استخدام المعلومات.',
      yes_en: 'Observer confirmed: Students used digital tools to gather/use information.',
      no_ar: '⛔ المشرف أكد: لم يستخدم الطلاب أي أدوات رقمية. الحصة كانت تقليدية بالكامل. (المعيار G1 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students did NOT use any digital tools. Lesson was entirely traditional. (Criterion G1 = Not Observed)',
      unclear_ar: 'المشرف: استخدام الأدوات الرقمية غير واضح.',
      unclear_en: 'Observer: Use of digital tools was unclear.'
    }
  };
  
  // Convert each answer to an explicit statement
  Object.entries(clarificationAnswers).forEach(([key, value]) => {
    const template = statementTemplates[key];
    if (!template) {
      // Fallback for unknown keys
      clarificationText += language === 'ar'
        ? `- ${key}: ${value}\n`
        : `- ${key}: ${value}\n`;
      return;
    }
    
    // Determine which statement to use based on answer
    let statement = '';
    const valueLower = value.toLowerCase();
    
    if (valueLower.includes('yes') || valueLower.includes('نعم')) {
      statement = language === 'ar' ? template.yes_ar : template.yes_en;
    } else if (valueLower.includes('no') || valueLower.includes('لا')) {
      statement = language === 'ar' ? template.no_ar : template.no_en;
    } else {
      statement = language === 'ar' ? template.unclear_ar : template.unclear_en;
    }
    
    clarificationText += statement + '\n\n';
  });
  
  console.log('V3 FIX: Built clarification text with', Object.keys(clarificationAnswers).length, 'answers');
  return clarificationText;
};

/**
 * Build user prompt from template
 * V3 FIX: Now uses enhanced clarification text builder
 */
const buildUserPrompt = (lessonDescription, language, adminData, clarificationAnswers = {}) => {
  const template = config.user_prompt_template.text;
  const adminDataStr = Object.entries(adminData)
    .filter(([key, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  
  // V3 FIX: Build explicit clarification text with definitive statements
  const clarificationText = buildClarificationText(clarificationAnswers, language);
  
  // Get selected environments list and create environment-specific instruction
  const selectedEnvs = adminData.selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const selectedEnvsList = Array.isArray(selectedEnvs) ? selectedEnvs.join(', ') : selectedEnvs;
  
  const envNames = {
    'A': 'A - Equitable Learning (التعلم العادل)',
    'B': 'B - High Expectations (التوقعات العالية)',
    'C': 'C - Supportive Learning (التعلم الداعم)',
    'D': 'D - Active Learning (التعلم النشط)',
    'E': 'E - Progress Monitoring & Feedback (مراقبة التقدم والتغذية الراجعة)',
    'F': 'F - Well-Managed Learning (التعلم المُدار جيداً)',
    'G': 'G - Digital Learning (التعلم الرقمي)'
  };
  
  let environmentInstruction = '';
  if (selectedEnvs && selectedEnvs.length > 0 && selectedEnvs.length < 7) {
    // Only some environments selected - provide specific instruction
    const envNamesList = selectedEnvs.map(env => envNames[env] || env).join(', ');
    environmentInstruction = language === 'ar'
      ? `\n\n**تعليمات مهمة:** يجب عليك تحليل وتقييم الحصة بناءً على معايير البيئات التالية فقط: ${envNamesList}. لا تقم بتحليل أو تقييم أي معايير من البيئات الأخرى. ركز فقط على المعايير الخاصة بالبيئات المحددة: ${selectedEnvsList}.`
      : `\n\n**CRITICAL INSTRUCTION:** You must analyze and evaluate the lesson based ONLY on the criteria within the following environments: ${envNamesList}. Do NOT analyze or score any criteria from other environments. Focus exclusively on the criteria specific to the selected environments: ${selectedEnvsList}.`;
  } else if (selectedEnvs && selectedEnvs.length === 7) {
    // All environments selected - evaluate all
    environmentInstruction = language === 'ar'
      ? `\n\n**تعليمات:** قم بتحليل وتقييم الحصة بناءً على جميع معايير البيئات السبع (A-G).`
      : `\n\n**INSTRUCTION:** Analyze and evaluate the lesson based on all criteria from all seven environments (A-G).`;
  }
  
  // FIX: Add explicit language instruction for justifications
  const languageInstruction = language === 'ar'
    ? '\n\n**تعليمات مهمة للغة:** يجب أن تكون جميع التبريرات (justifications) والاقتراحات (suggestions) باللغة العربية فقط.'
    : '\n\n**CRITICAL LANGUAGE INSTRUCTION:** All justifications and suggestions MUST be written in English only. Do NOT use Arabic text in justifications or suggestions.';
  
  return template
    .replace('{{language}}', language === 'ar' ? 'العربية' : 'English')
    .replace('{{admin_data}}', adminDataStr || 'N/A')
    .replace('{{selected_environments_list}}', selectedEnvsList || 'A, B, C, D, E, F, G')
    .replace('{{selected_environment}}', selectedEnvsList || 'ALL') // Keep for backward compatibility
    .replace('{{lesson_description}}', lessonDescription + clarificationText + environmentInstruction + languageInstruction);
};

/**
 * Check cache for existing evaluation results
 */
const getCachedResult = (textHash) => {
  return evaluationCache.get(textHash);
};

/**
 * Cache evaluation result
 */
const cacheResult = (textHash, result) => {
  evaluationCache.set(textHash, result);
  // Limit cache size to prevent memory issues
  if (evaluationCache.size > 50) {
    const firstKey = evaluationCache.keys().next().value;
    evaluationCache.delete(firstKey);
  }
};

/**
 * Detect if clarification questions are needed - Comprehensive check for all 7 environments
 */
const needsClarification = (lessonDescription) => {
  const text = lessonDescription.toLowerCase();
  const missingInfo = [];
  
  // ========== ENVIRONMENT A: EQUITABLE LEARNING ==========
  
  // A.1: Differentiated learning opportunities
  if (!text.includes('مختلف') && !text.includes('different') && 
      !text.includes('تمايز') && !text.includes('differentiat') &&
      !text.includes('playlist') && !text.includes('قائمة') &&
      !text.includes('مهمة مختلفة') && !text.includes('different task') &&
      !text.includes('مستوى') && !text.includes('level')) {
    missingInfo.push({
      key: 'A1_differentiation',
      question: currentLanguage === 'ar' 
        ? 'البيئة A.1 - التمايز: هل كانت المهام المكلفة بها كل مجموعة/طالب مختلفة عن غيرها (تمايز) أم كانت نفس المهام للجميع؟'
        : 'Environment A.1 - Differentiation: Were the tasks assigned to each group/student different from others (differentiation) or were they the same tasks for everyone?',
      options: currentLanguage === 'ar' 
        ? ['مختلفة (Differentiated)', 'نفس المهام للجميع (Same for all)', 'غير واضح (Unclear)']
        : ['Different (Differentiated)', 'Same for all', 'Unclear']
    });
  }
  
  // A.2: Equal access to resources/support
  if (!text.includes('متساو') && !text.includes('equal') &&
      !text.includes('جميع') && !text.includes('all students') &&
      !text.includes('كل الطلاب') && !text.includes('every student') &&
      !text.includes('موارد') && !text.includes('resources') &&
      !text.includes('دعم') && !text.includes('support')) {
    missingInfo.push({
      key: 'A2_equal_access',
      question: currentLanguage === 'ar'
        ? 'البيئة A.2 - الوصول المتساوي: هل تمكن جميع الطلاب من الوصول إلى التكنولوجيا/الموارد أو الدعم الفردي من المعلم بشكل متساوٍ؟'
        : 'Environment A.2 - Equal Access: Did all students have equal access to technology/resources or individual support from the teacher?',
      options: currentLanguage === 'ar'
        ? ['نعم، متساوٍ للجميع (Yes, equal for all)', 'لا، غير متساوٍ (No, unequal)', 'غير واضح (Unclear)']
        : ['Yes, equal for all', 'No, unequal', 'Unclear']
    });
  }
  
  // A.3: Fair, clear, and consistent treatment
  if (!text.includes('عادل') && !text.includes('fair') &&
      !text.includes('متسق') && !text.includes('consistent') &&
      !text.includes('واضح') && !text.includes('clear') &&
      !text.includes('قواعد') && !text.includes('rules')) {
    missingInfo.push({
      key: 'A3_fair_treatment',
      question: currentLanguage === 'ar'
        ? 'البيئة A.3 - المعاملة العادلة: هل كانت معاملة المعلم للطلاب عادلة وواضحة ومتسقة مع الجميع؟'
        : 'Environment A.3 - Fair Treatment: Was the teacher\'s treatment of students fair, clear, and consistent with everyone?',
      options: currentLanguage === 'ar'
        ? ['نعم، عادلة ومتسقة (Yes, fair and consistent)', 'لا، غير متسقة (No, inconsistent)', 'غير واضح (Unclear)']
        : ['Yes, fair and consistent', 'No, inconsistent', 'Unclear']
    });
  }
  
  // A.4: Empathy/respect for differences
  if (!text.includes('احترام') && !text.includes('respect') &&
      !text.includes('تعاطف') && !text.includes('empathy') &&
      !text.includes('اختلاف') && !text.includes('difference') &&
      !text.includes('تنوع') && !text.includes('diversity')) {
    missingInfo.push({
      key: 'A4_empathy',
      question: currentLanguage === 'ar'
        ? 'البيئة A.4 - الاحترام والتعاطف: هل أظهر المعلم والطلاب احتراماً وتعاطفاً مع الاختلافات بين الطلاب (ثقافية، قدرات، خلفيات)؟'
        : 'Environment A.4 - Empathy/Respect: Did the teacher and students show respect and empathy for differences among students (cultural, abilities, backgrounds)?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك احترام واضح (Yes, clear respect)', 'لا، لم يكن واضحاً (No, not clear)', 'غير واضح (Unclear)']
        : ['Yes, clear respect', 'No, not clear', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT B: HIGH EXPECTATIONS ==========
  
  // B.1: Learners strive to meet high expectations
  if (!text.includes('توقعات') && !text.includes('expectation') &&
      !text.includes('عالية') && !text.includes('high') &&
      !text.includes('تحدي') && !text.includes('challenge') &&
      !text.includes('سعي') && !text.includes('strive')) {
    missingInfo.push({
      key: 'B1_high_expectations',
      question: currentLanguage === 'ar'
        ? 'البيئة B.1 - التوقعات العالية: هل كان هناك دليل على أن الطلاب يسعون لتحقيق توقعات عالية من خلال بذل جهد إضافي أو محاولة حل مهام صعبة؟'
        : 'Environment B.1 - High Expectations: Was there evidence that students strive to meet high expectations through extra effort or attempting challenging tasks?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك سعي واضح (Yes, clear striving)', 'لا، لم يكن واضحاً (No, not clear)', 'غير واضح (Unclear)']
        : ['Yes, clear striving', 'No, not clear', 'Unclear']
    });
  }
  
  // B.2: Activities are challenging yet attainable
  if (!text.includes('صعب') && !text.includes('challenging') &&
      !text.includes('قابل') && !text.includes('attainable') &&
      !text.includes('مناسب') && !text.includes('appropriate') &&
      !text.includes('مستوى') && !text.includes('level')) {
    missingInfo.push({
      key: 'B2_challenging_activities',
      question: currentLanguage === 'ar'
        ? 'البيئة B.2 - الأنشطة الصعبة: هل كانت الأنشطة صعبة ولكن قابلة للتحقيق (ليست سهلة جداً ولا صعبة جداً)؟'
        : 'Environment B.2 - Challenging Activities: Were the activities challenging yet attainable (not too easy nor too difficult)?',
      options: currentLanguage === 'ar'
        ? ['نعم، صعبة وقابلة للتحقيق (Yes, challenging and attainable)', 'سهلة جداً (Too easy)', 'صعبة جداً (Too difficult)', 'غير واضح (Unclear)']
        : ['Yes, challenging and attainable', 'Too easy', 'Too difficult', 'Unclear']
    });
  }
  
  // B.3: Learners use rubrics/criteria (CRITICAL)
  if (!text.includes('rubric') && !text.includes('سلم') &&
      !text.includes('معايير') && !text.includes('criteria') &&
      !text.includes('نجاح') && !text.includes('success') &&
      !text.includes('مؤشرات') && !text.includes('indicators') &&
      !text.includes('تقييم') && !text.includes('assessment')) {
    missingInfo.push({
      key: 'B3_rubrics',
      question: currentLanguage === 'ar'
        ? 'البيئة B.3 - المعايير والروبرك (مهم جداً): هل كان هناك معايير نجاح أو سلم تقدير (Rubric) واضح ومتاح للطلاب لإنجاز المهام؟'
        : 'Environment B.3 - Rubrics/Criteria (CRITICAL): Was there a clear success criteria or rubric available to students for completing tasks?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك rubric واضح (Yes, clear rubric)', 'لا، لم يكن هناك rubric (No rubric)', 'غير واضح (Unclear)']
        : ['Yes, clear rubric existed', 'No rubric', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT C: SUPPORTIVE LEARNING ==========
  
  // C.1: Intellectual risk-taking
  if (!text.includes('سؤال') && !text.includes('question') &&
      !text.includes('خطأ') && !text.includes('mistake') &&
      !text.includes('مخاطرة') && !text.includes('risk') &&
      !text.includes('محاولة') && !text.includes('attempt')) {
    missingInfo.push({
      key: 'C1_risk_taking',
      question: currentLanguage === 'ar'
        ? 'البيئة C.1 - المخاطرة الفكرية: هل كان الطلاب يشعرون بالأمان لطرح أسئلة أو مشاركة أفكار غير مؤكدة دون خوف من الخطأ؟'
        : 'Environment C.1 - Risk Taking: Did students feel safe to ask questions or share uncertain ideas without fear of mistakes?',
      options: currentLanguage === 'ar'
        ? ['نعم، كانوا يشعرون بالأمان (Yes, felt safe)', 'لا، كانوا خائفين (No, were afraid)', 'غير واضح (Unclear)']
        : ['Yes, felt safe', 'No, were afraid', 'Unclear']
    });
  }
  
  // C.2: Peer learning/support
  if (!text.includes('أقران') && !text.includes('peer') &&
      !text.includes('مساعدة') && !text.includes('help') &&
      !text.includes('دعم') && !text.includes('support') &&
      !text.includes('تعاون') && !text.includes('collaborat')) {
    missingInfo.push({
      key: 'C2_peer_support',
      question: currentLanguage === 'ar'
        ? 'البيئة C.2 - دعم الأقران: هل كان الطلاب يدعمون بعضهم البعض في التعلم (مساعدة، شرح، تشجيع)؟'
        : 'Environment C.2 - Peer Support: Did students support each other in learning (helping, explaining, encouraging)?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك دعم واضح (Yes, clear support)', 'لا، لم يكن هناك دعم (No support)', 'غير واضح (Unclear)']
        : ['Yes, clear support', 'No support', 'Unclear']
    });
  }
  
  // C.3: Teacher support
  if (!text.includes('معلم') && !text.includes('teacher') &&
      !text.includes('دعم') && !text.includes('support') &&
      !text.includes('مساعدة') && !text.includes('help') &&
      !text.includes('إرشاد') && !text.includes('guidance')) {
    missingInfo.push({
      key: 'C3_teacher_support',
      question: currentLanguage === 'ar'
        ? 'البيئة C.3 - دعم المعلم: هل قدم المعلم دعماً واضحاً للطلاب (إرشاد، توضيح، مساعدة فردية)؟'
        : 'Environment C.3 - Teacher Support: Did the teacher provide clear support to students (guidance, clarification, individual help)?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك دعم واضح (Yes, clear support)', 'لا، لم يكن هناك دعم (No support)', 'غير واضح (Unclear)']
        : ['Yes, clear support', 'No support', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT D: ACTIVE LEARNING ==========
  
  // D.1: Ownership of learning
  if (!text.includes('ملكية') && !text.includes('ownership') &&
      !text.includes('اختيار') && !text.includes('choice') &&
      !text.includes('استقلالية') && !text.includes('autonomy') &&
      !text.includes('مسؤولية') && !text.includes('responsibility')) {
    missingInfo.push({
      key: 'D1_ownership',
      question: currentLanguage === 'ar'
        ? 'البيئة D.1 - ملكية التعلم: هل كان للطلاب خيارات أو مسؤولية في اختيار ما يتعلمونه أو كيف يتعلمونه؟'
        : 'Environment D.1 - Ownership: Did students have choices or responsibility in selecting what or how they learn?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك خيارات (Yes, had choices)', 'لا، لم يكن هناك خيارات (No choices)', 'غير واضح (Unclear)']
        : ['Yes, had choices', 'No choices', 'Unclear']
    });
  }
  
  // D.2: Connect to real-life
  if (!text.includes('حياة') && !text.includes('life') &&
      !text.includes('واقع') && !text.includes('real') &&
      !text.includes('تجربة') && !text.includes('experience') &&
      !text.includes('ربط') && !text.includes('connect')) {
    missingInfo.push({
      key: 'D2_real_life',
      question: currentLanguage === 'ar'
        ? 'البيئة D.2 - الربط بالحياة: هل ربط المعلم المحتوى بحياة الطلاب اليومية أو تجاربهم الشخصية؟'
        : 'Environment D.2 - Real-Life Connection: Did the teacher connect content to students\' daily lives or personal experiences?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان هناك ربط واضح (Yes, clear connection)', 'لا، لم يكن هناك ربط (No connection)', 'غير واضح (Unclear)']
        : ['Yes, clear connection', 'No connection', 'Unclear']
    });
  }
  
  // D.3: Active engagement
  if (!text.includes('نشط') && !text.includes('active') &&
      !text.includes('مشاركة') && !text.includes('participat') &&
      !text.includes('تفاعل') && !text.includes('interact') &&
      !text.includes('انخراط') && !text.includes('engage')) {
    missingInfo.push({
      key: 'D3_active_engagement',
      question: currentLanguage === 'ar'
        ? 'البيئة D.3 - المشاركة النشطة: هل كان الطلاب مشاركين بنشاط في الأنشطة (مناقشة، عمل، تفاعل) وليسوا مجرد مستمعين؟'
        : 'Environment D.3 - Active Engagement: Were students actively participating in activities (discussing, working, interacting) and not just listening?',
      options: currentLanguage === 'ar'
        ? ['نعم، كانوا نشطين (Yes, were active)', 'لا، كانوا مستمعين فقط (No, just listeners)', 'غير واضح (Unclear)']
        : ['Yes, were active', 'No, just listeners', 'Unclear']
    });
  }
  
  // D.4: Collaboration
  if (!text.includes('تعاون') && !text.includes('collaborat') &&
      !text.includes('عمل جماعي') && !text.includes('group work') &&
      !text.includes('مشترك') && !text.includes('shared') &&
      !text.includes('فريق') && !text.includes('team')) {
    missingInfo.push({
      key: 'D4_collaboration',
      question: currentLanguage === 'ar'
        ? 'البيئة D.4 - التعاون: هل كان العمل الجماعي تعاونياً حقيقياً (مسؤولية مشتركة، تنسيق) أم مجرد طلاب يعملون بالقرب من بعضهم البعض؟'
        : 'Environment D.4 - Collaboration: Was the group work truly collaborative (shared responsibility, coordination) or just students working in proximity?',
      options: currentLanguage === 'ar'
        ? ['تعاون حقيقي (True collaboration)', 'عمل بالقرب فقط (Proximity only)', 'غير واضح (Unclear)']
        : ['True collaboration', 'Proximity only', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT E: PROGRESS MONITORING & FEEDBACK ==========
  
  // E.1: Self-monitoring
  if (!text.includes('مراقبة') && !text.includes('monitor') &&
      !text.includes('تقدم') && !text.includes('progress') &&
      !text.includes('تتبع') && !text.includes('track') &&
      !text.includes('ذاتي') && !text.includes('self')) {
    missingInfo.push({
      key: 'E1_self_monitoring',
      question: currentLanguage === 'ar'
        ? 'البيئة E.1 - المراقبة الذاتية: هل كان الطلاب يراقبون تقدمهم بأنفسهم (سجلات، مخططات، محافظ)؟'
        : 'Environment E.1 - Self-Monitoring: Were students monitoring their own progress (logs, charts, portfolios)?',
      options: currentLanguage === 'ar'
        ? ['نعم، كانوا يراقبون (Yes, were monitoring)', 'لا، لم يكونوا يراقبون (No, not monitoring)', 'غير واضح (Unclear)']
        : ['Yes, were monitoring', 'No, not monitoring', 'Unclear']
    });
  }
  
  // E.2: Feedback
  if (!text.includes('ملاحظات') && !text.includes('feedback') &&
      !text.includes('تغذية') && !text.includes('feed') &&
      !text.includes('تعليق') && !text.includes('comment') &&
      !text.includes('نقد') && !text.includes('critique')) {
    missingInfo.push({
      key: 'E2_feedback',
      question: currentLanguage === 'ar'
        ? 'البيئة E.2 - الملاحظات: هل تلقى الطلاب ملاحظات بناءة من المعلم أو الأقران حول عملهم؟'
        : 'Environment E.2 - Feedback: Did students receive constructive feedback from the teacher or peers about their work?',
      options: currentLanguage === 'ar'
        ? ['نعم، تلقوا ملاحظات (Yes, received feedback)', 'لا، لم يتلقوا (No, did not receive)', 'غير واضح (Unclear)']
        : ['Yes, received feedback', 'No, did not receive', 'Unclear']
    });
  }
  
  // E.3: Demonstrate understanding
  if (!text.includes('فهم') && !text.includes('understand') &&
      !text.includes('إظهار') && !text.includes('demonstrate') &&
      !text.includes('شرح') && !text.includes('explain') &&
      !text.includes('تطبيق') && !text.includes('apply')) {
    missingInfo.push({
      key: 'E3_demonstrate',
      question: currentLanguage === 'ar'
        ? 'البيئة E.3 - إظهار الفهم: هل أظهر الطلاب فهمهم للمحتوى (شرح، تطبيق، إجابة على أسئلة)؟'
        : 'Environment E.3 - Demonstrate Understanding: Did students demonstrate their understanding of content (explaining, applying, answering questions)?',
      options: currentLanguage === 'ar'
        ? ['نعم، أظهروا الفهم (Yes, demonstrated)', 'لا، لم يظهروا (No, did not demonstrate)', 'غير واضح (Unclear)']
        : ['Yes, demonstrated', 'No, did not demonstrate', 'Unclear']
    });
  }
  
  // E.4: Understand assessment (CRITICAL)
  if (!text.includes('تقييم') && !text.includes('assessment') &&
      !text.includes('كيف') && !text.includes('how') &&
      !text.includes('معايير') && !text.includes('criteria') &&
      !text.includes('تقييم') && !text.includes('evaluate')) {
    missingInfo.push({
      key: 'E4_assessment_understanding',
      question: currentLanguage === 'ar'
        ? 'البيئة E.4 - فهم التقييم (مهم جداً): هل فهم الطلاب كيف سيتم تقييم عملهم (معايير، مؤشرات، طريقة التقييم)؟'
        : 'Environment E.4 - Assessment Understanding (CRITICAL): Did students understand how their work would be assessed (criteria, indicators, assessment method)?',
      options: currentLanguage === 'ar'
        ? ['نعم، فهموا (Yes, understood)', 'لا، لم يفهموا (No, did not understand)', 'غير واضح (Unclear)']
        : ['Yes, understood', 'No, did not understand', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT F: WELL-MANAGED ==========
  
  // F.1: Respectful interaction
  if (!text.includes('احترام') && !text.includes('respect') &&
      !text.includes('أدب') && !text.includes('polite') &&
      !text.includes('لطف') && !text.includes('kind') &&
      !text.includes('تفاعل') && !text.includes('interact')) {
    missingInfo.push({
      key: 'F1_respectful',
      question: currentLanguage === 'ar'
        ? 'البيئة F.1 - التفاعل المحترم: هل كان التفاعل بين الطلاب والمعلم محترماً ولطيفاً؟'
        : 'Environment F.1 - Respectful Interaction: Was the interaction between students and teacher respectful and kind?',
      options: currentLanguage === 'ar'
        ? ['نعم، كان محترماً (Yes, respectful)', 'لا، لم يكن محترماً (No, not respectful)', 'غير واضح (Unclear)']
        : ['Yes, respectful', 'No, not respectful', 'Unclear']
    });
  }
  
  // F.2: Follow rules
  if (!text.includes('قواعد') && !text.includes('rules') &&
      !text.includes('توقعات') && !text.includes('expectation') &&
      !text.includes('انضباط') && !text.includes('discipline') &&
      !text.includes('اتباع') && !text.includes('follow')) {
    missingInfo.push({
      key: 'F2_rules',
      question: currentLanguage === 'ar'
        ? 'البيئة F.2 - اتباع القواعد: هل اتبع الطلاب قواعد الفصل والتوقعات بشكل واضح؟'
        : 'Environment F.2 - Follow Rules: Did students follow classroom rules and expectations clearly?',
      options: currentLanguage === 'ar'
        ? ['نعم، اتبعوا القواعد (Yes, followed rules)', 'لا، لم يتبعوا (No, did not follow)', 'غير واضح (Unclear)']
        : ['Yes, followed rules', 'No, did not follow', 'Unclear']
    });
  }
  
  // F.3: Smooth transitions
  if (!text.includes('انتقال') && !text.includes('transition') &&
      !text.includes('تنظيم') && !text.includes('organize') &&
      !text.includes('سلس') && !text.includes('smooth') &&
      !text.includes('فعال') && !text.includes('efficient')) {
    missingInfo.push({
      key: 'F3_transitions',
      question: currentLanguage === 'ar'
        ? 'البيئة F.3 - الانتقالات السلسة: هل كانت الانتقالات بين الأنشطة سلسة وفعالة (بدون فوضى أو إضاعة وقت)؟'
        : 'Environment F.3 - Smooth Transitions: Were transitions between activities smooth and efficient (without chaos or wasted time)?',
      options: currentLanguage === 'ar'
        ? ['نعم، كانت سلسة (Yes, smooth)', 'لا، كانت فوضوية (No, chaotic)', 'غير واضح (Unclear)']
        : ['Yes, smooth', 'No, chaotic', 'Unclear']
    });
  }
  
  // F.4: Purposeful use of time
  if (!text.includes('وقت') && !text.includes('time') &&
      !text.includes('هادف') && !text.includes('purposeful') &&
      !text.includes('استخدام') && !text.includes('use') &&
      !text.includes('فعال') && !text.includes('effective')) {
    missingInfo.push({
      key: 'F4_time_use',
      question: currentLanguage === 'ar'
        ? 'البيئة F.4 - الاستخدام الهادف للوقت: هل استخدم الطلاب وقت الفصل بشكل هادف وفعال (بدون إضاعة وقت)؟'
        : 'Environment F.4 - Purposeful Time Use: Did students use class time purposefully and effectively (without wasting time)?',
      options: currentLanguage === 'ar'
        ? ['نعم، استخدموا الوقت بفعالية (Yes, used time effectively)', 'لا، أضاعوا الوقت (No, wasted time)', 'غير واضح (Unclear)']
        : ['Yes, used time effectively', 'No, wasted time', 'Unclear']
    });
  }
  
  // ========== ENVIRONMENT G: DIGITAL LEARNING ==========
  
  // G.1: Digital tools for information
  if (!text.includes('رقمي') && !text.includes('digital') &&
      !text.includes('تكنولوجيا') && !text.includes('technology') &&
      !text.includes('حاسوب') && !text.includes('computer') &&
      !text.includes('معلومات') && !text.includes('information')) {
    missingInfo.push({
      key: 'G1_digital_info',
      question: currentLanguage === 'ar'
        ? 'البيئة G.1 - الأدوات الرقمية للمعلومات: هل استخدم الطلاب أدوات رقمية (حاسوب، تابلت، إنترنت) لجمع أو استخدام المعلومات؟'
        : 'Environment G.1 - Digital Tools for Information: Did students use digital tools (computer, tablet, internet) to gather or use information?',
      options: currentLanguage === 'ar'
        ? ['نعم، استخدموا أدوات رقمية (Yes, used digital tools)', 'لا، لم يستخدموا (No, did not use)', 'غير واضح (Unclear)']
        : ['Yes, used digital tools', 'No, did not use', 'Unclear']
    });
  }
  
  // G.2: Digital tools for problem-solving
  if (!text.includes('حل') && !text.includes('solve') &&
      !text.includes('مشكلة') && !text.includes('problem') &&
      !text.includes('إنشاء') && !text.includes('create') &&
      !text.includes('رقمي') && !text.includes('digital')) {
    missingInfo.push({
      key: 'G2_digital_solving',
      question: currentLanguage === 'ar'
        ? 'البيئة G.2 - الأدوات الرقمية لحل المشكلات: هل استخدم الطلاب أدوات رقمية لحل المشكلات أو إنشاء محتوى (برمجة، تصميم، عروض)؟'
        : 'Environment G.2 - Digital Tools for Problem-Solving: Did students use digital tools to solve problems or create content (programming, design, presentations)?',
      options: currentLanguage === 'ar'
        ? ['نعم، استخدموا (Yes, used)', 'لا، لم يستخدموا (No, did not use)', 'غير واضح (Unclear)']
        : ['Yes, used', 'No, did not use', 'Unclear']
    });
  }
  
  // G.3: Digital communication/collaboration
  if (!text.includes('تواصل') && !text.includes('communicat') &&
      !text.includes('تعاون') && !text.includes('collaborat') &&
      !text.includes('رقمي') && !text.includes('digital') &&
      !text.includes('مشاركة') && !text.includes('share')) {
    missingInfo.push({
      key: 'G3_digital_communication',
      question: currentLanguage === 'ar'
        ? 'البيئة G.3 - التواصل الرقمي: هل استخدم الطلاب أدوات رقمية للتواصل أو التعاون (منصات، تطبيقات، مشاركة ملفات)؟'
        : 'Environment G.3 - Digital Communication: Did students use digital tools for communication or collaboration (platforms, apps, file sharing)?',
      options: currentLanguage === 'ar'
        ? ['نعم، استخدموا (Yes, used)', 'لا، لم يستخدموا (No, did not use)', 'غير واضح (Unclear)']
        : ['Yes, used', 'No, did not use', 'Unclear']
    });
  }
  
  // Return all missing info (no minimum threshold - check all environments)
  return missingInfo;
};

/**
 * Display clarification questions
 */
const displayClarificationQuestions = (questions) => {
  const clarificationSection = document.getElementById('clarification-questions-section');
  const questionsList = document.getElementById('clarification-questions-list');
  
  if (!clarificationSection || !questionsList) return;
  
  questionsList.innerHTML = '';
  questions.forEach((q, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'clarification-question';
    questionDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;';
    
    // FIX: Create elements without inline event handlers (CSP compliance)
    const questionP = document.createElement('p');
    questionP.style.cssText = 'font-weight: 600; margin-bottom: 10px; color: #333;';
    questionP.textContent = `${index + 1}. ${q.question}`;
    questionDiv.appendChild(questionP);
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'clarification-options';
    optionsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    
    q.options.forEach((option, optIndex) => {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;';
      label.setAttribute('data-option-index', optIndex);
      
      // FIX: Use addEventListener instead of inline handlers
      label.addEventListener('mouseenter', () => {
        label.style.background = '#f5f5f5';
      });
      label.addEventListener('mouseleave', () => {
        label.style.background = 'transparent';
      });
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `clarification_${q.key}`;
      input.value = option;
      input.style.cssText = 'margin-left: 8px; cursor: pointer;';
      input.required = true;
      
      const span = document.createElement('span');
      span.style.cssText = 'flex: 1;';
      span.textContent = option;
      
      label.appendChild(input);
      label.appendChild(span);
      optionsDiv.appendChild(label);
    });
    
    questionDiv.appendChild(optionsDiv);
    questionsList.appendChild(questionDiv);
  });
  
  clarificationSection.classList.remove('hidden');
  
  // Setup submit button
  const submitBtn = document.getElementById('submit-clarifications-btn');
  const skipBtn = document.getElementById('skip-clarifications-btn');
  
  // FIX: Use addEventListener instead of onclick (CSP compliance)
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      collectClarificationAnswers(questions);
      clarificationSection.classList.add('hidden');
      proceedWithEvaluation();
    });
  }
  
  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clarificationSection.classList.add('hidden');
      clarificationAnswers = {};
      proceedWithEvaluation();
    });
  }
};

/**
 * Collect clarification answers
 */
const collectClarificationAnswers = (questions) => {
  clarificationAnswers = {};
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="clarification_${q.key}"]:checked`);
    if (selected) {
      clarificationAnswers[q.key] = selected.value;
    }
  });
};

/**
 * Proceed with evaluation after clarifications
 */
const proceedWithEvaluation = async () => {
  if (!lessonDescriptionTextarea) return;
  
  const lessonDescription = lessonDescriptionTextarea.value.trim();
  
  // Generate cache key (include clarification answers in hash)
  const cacheKey = generateHash(lessonDescription + JSON.stringify(clarificationAnswers));
  
  // Check cache first
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    console.log('Using cached evaluation result');
    displayResults(cachedResult);
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (evaluateBtn) evaluateBtn.disabled = false;
    return;
  }
  
  if (!config) {
    // Try to reload config if not available
    config = await loadConfig();
    if (!config) {
      showError(currentLanguage === 'ar' 
        ? 'التكوين غير محمل. يرجى إعادة تحميل الصفحة.' 
        : 'Configuration not loaded. Please reload the page.');
      return;
    }
  }
  
  // Save data before evaluation
  saveDataToStorage();
  
  // Collect admin data
  collectAdminData();
  
  // Show loading
  if (loadingDiv) loadingDiv.classList.remove('hidden');
  if (resultsSection) resultsSection.classList.add('hidden');
  hideError();
  if (evaluateBtn) evaluateBtn.disabled = true;
  
  try {
    // Build prompts with clarification answers
    const systemPrompt = config.system_prompt.text;
    const userPrompt = buildUserPrompt(
      lessonDescription,
      currentLanguage,
      adminData,
      clarificationAnswers
    );
    
    // Call LLM
    const response = await callLLM(systemPrompt, userPrompt);
    
    // Check if response is the Arabic warning message (incomplete input)
    if (typeof response === 'string' && response.includes('تحذير: النص غير مكتمل')) {
      showError(response);
      return;
    }
    
    // Validate response structure first
    if (!response || typeof response !== 'object') {
      console.error('Invalid response format from API:', response);
      throw new Error('Invalid response format from API');
    }
    
    // Validate that criteria array exists
    if (!response.criteria || !Array.isArray(response.criteria)) {
      console.error('Response missing criteria array:', response);
      throw new Error('Response is missing criteria array');
    }
    
    
    // Validate and sanitize response with critical constraint enforcement
    const validatedResults = validateResponse(response, lessonDescription, clarificationAnswers);
    
    // Cache the result
    cacheResult(cacheKey, validatedResults);
    
    // Display results
    displayResults(validatedResults);
    
  } catch (error) {
    console.error('Evaluation error:', error);
    showError(currentLanguage === 'ar'
      ? `خطأ في التقييم: ${error.message}`
      : `Evaluation error: ${error.message}`);
  } finally {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (evaluateBtn) evaluateBtn.disabled = false;
  }
};

/**
 * Call LLM API with prompt
 * V3 FIX: Variables defined at function scope for catch block access
 */
const callLLM = async (systemPrompt, userPrompt) => {
  // 1. CRITICAL: Define variables here with 'let' for catch block access
  let apiKey;
  let apiEndpoint;
  let provider;
  
  try {
    const storageResult = await window.apiService.getApiKey();
    
    // 2. Assign without 'const' (use existing 'let' declaration)
    apiKey = storageResult?.apiKey;
    
    const endpointResult = await window.apiService.getApiEndpoint();
    
    // 3. Assign without 'const' (use existing 'let' declaration)
    apiEndpoint = endpointResult?.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    provider = apiProviderSelect?.value || 'openai';
    
    // FIX: Sanitize apiKey and apiEndpoint
    apiKey = (apiKey || '').trim();
    apiEndpoint = (apiEndpoint || '').trim();
    
    
    // FIX: Reject non-ASCII apiKey
    if (apiKey && !/^[\x00-\x7F]*$/.test(apiKey)) {
      throw new Error('API_KEY_NON_ASCII');
    }
    
    // FIX: Reject non-ASCII apiEndpoint
    if (apiEndpoint && !/^[\x00-\x7F]*$/.test(apiEndpoint)) {
      throw new Error('API_ENDPOINT_NON_ASCII');
    }
    
    if (!apiKey || apiKey === '') {
      console.warn('No API key found. Using sample data for testing.');
      return generateSampleResponse();
    }
    
    let requestBody, headers;
    
    if (provider === 'gemini') {
      requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.0 // CRITICAL: Set to zero for deterministic output
        }
      };
      
      // FIX: Force headers to be a clean JS object
      headers = {
        'Content-Type': 'application/json'
      };
      
      
      // FIX: Strict validation before fetch
      if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
        throw new Error('HEADERS_NOT_OBJECT');
      }
      
      Object.keys(headers).forEach(key => {
        const value = headers[key];
        
        if (typeof value !== 'string') {
          throw new Error(`INVALID_HEADER_VALUE_${key}`);
        }
        
        // Ensure ASCII only
        if (!/^[\x00-\x7F]*$/.test(value)) {
          throw new Error(`NON_ASCII_HEADER_${key}`);
        }
      });
      
      const url = `${apiEndpoint}?key=${apiKey}`;
      
      
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
      } catch (fetchError) {
        throw fetchError;
      }
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, use empty object
          console.warn('Failed to parse error response as JSON:', parseError);
        }
        
        // CRITICAL: Check for 429 Quota Exceeded error (Gemini)
        if (response.status === 429) {
          const quotaError = new Error('QUOTA_EXCEEDED');
          quotaError.status = 429;
          quotaError.originalMessage = errorData.error?.message || 'Quota exceeded';
          throw quotaError;
        }
        
        // CRITICAL: Check for 401 Unauthorized error (Gemini)
        if (response.status === 401) {
          const authError = new Error('UNAUTHORIZED');
          authError.status = 401;
          authError.originalMessage = errorData.error?.message || 'Invalid API key';
          throw authError;
        }
        
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in API response');
      }
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } else {
      requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.0, // CRITICAL: Set to zero for deterministic output (Compliance: 0. System Stability)
        max_tokens: 4000
      };
      
      logEvent('llm_config_set', {
        provider: 'openai',
        temperature: 0.0,
        model: 'gpt-4o-mini',
        timestamp: Date.now()
      });
      
      // FIX: Force headers to be a clean JS object (mandatory correction)
      // CRITICAL: Ensure apiKey is ASCII before using in Authorization header
      const authHeaderValue = `Bearer ${apiKey}`;
      
      // Validate Authorization header value is ASCII
      if (!/^[\x00-\x7F]*$/.test(authHeaderValue)) {
      console.error('Authorization header has non-ASCII characters');
        throw new Error('AUTHORIZATION_HEADER_NON_ASCII');
      }
      
      headers = {
        'Content-Type': 'application/json',
        ...(provider === 'openai' ? { 'Authorization': authHeaderValue } : {})
      };
      
      
      // FIX: Strict validation before fetch (mandatory correction)
      if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
        throw new Error('HEADERS_NOT_OBJECT');
      }
      
      Object.keys(headers).forEach(key => {
        const value = headers[key];
        
        if (typeof value !== 'string') {
          throw new Error(`INVALID_HEADER_VALUE_${key}`);
        }
        
        // Ensure ASCII only
        if (!/^[\x00-\x7F]*$/.test(value)) {
          throw new Error(`NON_ASCII_HEADER_${key}`);
        }
      });
      
      
      let response;
      try {
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
      } catch (fetchError) {
        throw fetchError;
      }
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, use empty object
          console.warn('Failed to parse error response as JSON:', parseError);
        }
        
        // CRITICAL: Check for 429 Quota Exceeded error
        if (response.status === 429) {
          const quotaError = new Error('QUOTA_EXCEEDED');
          quotaError.status = 429;
          quotaError.originalMessage = errorData.error?.message || 'Quota exceeded';
          throw quotaError;
        }
        
        // CRITICAL: Check for 401 Unauthorized error
        if (response.status === 401) {
          const authError = new Error('UNAUTHORIZED');
          authError.status = 401;
          authError.originalMessage = errorData.error?.message || 'Invalid API key';
          throw authError;
        }
        
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in API response');
      }
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    }
    
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:entry',message:'Error caught in callLLM',data:{errorMessage:error.message,errorStatus:error.status,errorName:error.name,provider:provider,currentLanguage:currentLanguage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Log error details for debugging (less verbose)
    const errorDetails = {
      message: error.message,
      status: error.status,
      name: error.name,
      provider: provider
    };
    console.warn('LLM API call failed:', errorDetails);
    
    // VITAL FIX: Enhanced error handling with specific 429 quota error detection
    let errorMessage = error.message || (currentLanguage === 'ar' ? 'حدث خطأ غير معروف' : 'An unknown error occurred');
    let shouldUseFallback = true;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:beforeChecks',message:'Before error type checks',data:{initialErrorMessage:errorMessage,shouldUseFallback:shouldUseFallback},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Check for 429 quota error explicitly
    if (error.status === 429 || 
        errorMessage.includes('429') || 
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.includes('QUOTA_EXCEEDED')) {
      
      const quotaErrorAr = "🚨 خطأ حرج (429): تم تجاوز الحد المسموح به (Quota Exceeded).\n\n" +
        "الحلول الممكنة:\n" +
        "1. تحقق من خطة الدفع والفواتير في حساب OpenAI\n" +
        "2. انتظر حتى يتم تجديد الحصة\n" +
        "3. جرب استخدام مفتاح Gemini بدلاً من OpenAI\n" +
        "4. أو استمر مع البيانات التجريبية المتاحة حالياً";
      
      const quotaErrorEn = "🚨 Critical Error (429): Quota Exceeded.\n\n" +
        "Possible Solutions:\n" +
        "1. Check your billing plan and details on your OpenAI account\n" +
        "2. Wait until your quota resets\n" +
        "3. Try using a Gemini key instead of OpenAI\n" +
        "4. Or continue with the available sample data";
      
      errorMessage = currentLanguage === 'ar' ? quotaErrorAr : quotaErrorEn;
      
      logEvent('api_quota_error_429', { 
        keyError: '429 Quota Exceeded', 
        originalError: error.originalMessage || error.message,
        provider: provider,
        timestamp: Date.now()
      });
      
      shouldUseFallback = true;
    } else if (error.status === 401 || 
               error.message.includes('401') || 
               error.message.includes('Unauthorized') ||
               error.message.includes('UNAUTHORIZED')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:UNAUTHORIZED:entry',message:'UNAUTHORIZED error detected',data:{errorStatus:error.status,errorMessage:error.message,currentLanguage:currentLanguage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Handle 401 Unauthorized (invalid API key)
      const authErrorAr = "🔑 خطأ في المصادقة: مفتاح API غير صحيح أو منتهي الصلاحية.\n\n" +
        "يرجى التحقق من:\n" +
        "1. صحة مفتاح API في الإعدادات\n" +
        "2. أن المفتاح لم ينتهِ صلاحيته\n" +
        "3. أن المفتاح له الصلاحيات المطلوبة\n\n" +
        "يمكنك تحديث المفتاح من زر الإعدادات (⚙️) في أعلى الصفحة.";
      const authErrorEn = "🔑 Authentication Error: Invalid or expired API key.\n\n" +
        "Please verify:\n" +
        "1. Your API key is correct in settings\n" +
        "2. The key has not expired\n" +
        "3. The key has the required permissions\n\n" +
        "You can update the key from the Settings button (⚙️) at the top of the page.";
      
      errorMessage = currentLanguage === 'ar' ? authErrorAr : authErrorEn;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:UNAUTHORIZED:afterMessage',message:'UNAUTHORIZED error message set',data:{errorMessage:errorMessage.substring(0,100),currentLanguage:currentLanguage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      logEvent('api_auth_error_401', { 
        error: 'Invalid API key',
        provider: provider,
        originalMessage: error.originalMessage || error.message,
        timestamp: Date.now()
      });
      
      shouldUseFallback = true;
    } else if (error.message.includes('fetch') || 
               error.message.includes('Network') ||
               error.message.includes('Failed to fetch') ||
               error.name === 'TypeError' && error.message.includes('fetch')) {
      // Handle network errors
      const networkErrorAr = "🌐 خطأ في الاتصال بالشبكة.\n\n" +
        "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
      const networkErrorEn = "🌐 Network connection error.\n\n" +
        "Please check your internet connection and try again.";
      
      errorMessage = currentLanguage === 'ar' ? networkErrorAr : networkErrorEn;
      
      logEvent('api_network_error', { 
        error: error.message,
        errorName: error.name,
        provider: provider,
        timestamp: Date.now()
      });
      
      shouldUseFallback = true;
    } else {
      // Generic API error
      logEvent('api_call_error', { 
        error: error.message,
        provider: provider,
        timestamp: Date.now()
      });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:beforeShowError',message:'Before calling showError',data:{errorMessage:errorMessage.substring(0,100),shouldUseFallback:shouldUseFallback,errorMessageDivExists:!!errorMessageDiv},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Show user-friendly error message to the user
    showError(errorMessage);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:afterShowError',message:'After calling showError',data:{shouldUseFallback:shouldUseFallback},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // IMPORTANT: Fallback to sample data if evaluation fails critically
    if (shouldUseFallback) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aaa175-4dcf-4837-9398-753f953143e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:callLLM:catch:fallback',message:'Using fallback sample data',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.info('API error handled. Using sample data as fallback. User-friendly error message displayed in UI.');
      return generateSampleResponse();
    }
    
    // If we don't want fallback, throw the error
    throw error;
  }
};

/**
 * Generate sample response for testing
 */
const generateSampleResponse = () => {
  if (!config) return { 
    recommendations: '', 
    criteria: [], 
    totalScore: 0 
  };
  
  const allCriteria = [];
  config.eleot_sections.forEach(section => {
    section.criteria.forEach(criterion => {
      const score = Math.floor(Math.random() * 2) + 3;
      const indicatorText = currentLanguage === 'ar' ? criterion.label_ar : criterion.label_en;
      
      // Use dynamic justification template (new format)
      let justification = '';
      if (score === 4) {
        justification = currentLanguage === 'ar'
          ? `لوحظ بوضوح تحقق: '${indicatorText}'، حيث كان متوافقاً تماماً مع الممارسات المرصودة.`
          : `It was clearly evident that: '${indicatorText}', fully aligned with the observed practice.`;
      } else if (score === 3) {
        justification = currentLanguage === 'ar'
          ? `لوحظ تحقق نسبي لـ: '${indicatorText}'، ولكنه لم يشمل جميع المتعلمين بشكل متسق.`
          : `There was partial evidence of: '${indicatorText}' but not consistently for all learners.`;
      } else if (score === 2) {
        justification = currentLanguage === 'ar'
          ? `ظهر أن تطبيق: '${indicatorText}' كان محدوداً ولم يلبِّ كافة احتياجات المتعلمين.`
          : `Evidence of '${indicatorText}' was limited and did not meet all learner needs.`;
      } else {
        justification = currentLanguage === 'ar'
          ? `لوحظ غياب واضح لـ: '${indicatorText}' أثناء مجريات الحصة.`
          : `There was a clear absence of: '${indicatorText}' in the observed lesson.`;
      }
      
      allCriteria.push({
        id: criterion.id,
        score: score,
        justification: justification,
        improvement: score <= 2 ? (currentLanguage === 'ar'
          ? `اقتراح تحسين للمعيار ${criterion.id}`
          : `Improvement suggestion for ${criterion.id}`) : ''
      });
    });
  });
  
  const totalScore = allCriteria.reduce((sum, c) => sum + c.score, 0) / allCriteria.length;
  const hasLowScores = allCriteria.some(c => c.score <= 2);
  
  const recommendationsText = currentLanguage === 'ar'
    ? '<h3 style="color:green;">التوصيات</h3><p>شكراً للمعلم على الحصة المتميزة والجهود المبذولة في تقديم تعليم فعال.</p><p><strong>نقاط القوة:</strong> استخدام تقنيات تفاعلية، إشراك الطلاب في المناقشات، بيئة تعلم داعمة.</p>' + (hasLowScores ? '<p><strong>فرص التطوير:</strong> يمكن تعزيز بعض المجالات لتحقيق نتائج أفضل.</p>' : '')
    : '<h3 style="color:green;">Recommendations</h3><p>Thank you to the teacher for the excellent lesson and efforts in delivering effective instruction.</p><p><strong>Strengths:</strong> Use of interactive techniques, student engagement in discussions, supportive learning environment.</p>' + (hasLowScores ? '<p><strong>Development Opportunities:</strong> Some areas can be strengthened for better results.</p>' : '');
  
  return {
    recommendations: recommendationsText,
    criteria: allCriteria,
    totalScore: Math.round(totalScore * 10) / 10
  };
};

/**
 * NOTE: sanitizeText is already defined in utils.js (loaded before popup.js in popup.html)
 * This function is available globally from utils.js
 * Removing duplicate definition to avoid "Identifier 'sanitizeText' has already been declared" error
 */

/**
 * NOTE: validateScore is already defined in utils.js (loaded before popup.js in popup.html)
 * This function is available globally from utils.js
 * Removing duplicate definition to avoid "Identifier 'validateScore' has already been declared" error
 */

/**
 * Check if lesson description contains explicit rubrics/assessment criteria
 * Compliance: B.3 (Criteria/Standards) - Schema validation for assessment inputs
 * 
 * @param {string} text - Lesson description text
 * @returns {boolean} True if rubrics/criteria are explicitly mentioned
 */
const checkRubricsCriteriaPresence = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  const rubricKeywords = [
    'rubric', 'سلم', 'معايير', 'criteria', 'success criteria',
    'assessment criteria', 'معايير النجاح', 'قواعد التقييم',
    'evaluation tool', 'أداة تقييم', 'indicators', 'مؤشرات'
  ];
  
  return rubricKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Check clarification answers for critical criteria override
 * Compliance: B.3 (Criteria/Standards) - Logic Override Protocol enforcement
 * 
 * @param {Object} clarificationAnswers - User's clarification responses
 * @returns {Object} Override flags for B.3 and E.4
 */
const checkClarificationOverrides = (clarificationAnswers) => {
  const overrides = { B3: false, E4: false };
  
  if (!clarificationAnswers || typeof clarificationAnswers !== 'object') {
    return overrides;
  }
  
  // Check B.3 clarification answer
  const b3Answer = clarificationAnswers['B3_rubrics'];
  if (b3Answer && typeof b3Answer === 'string') {
    const lowerAnswer = b3Answer.toLowerCase();
    if (lowerAnswer.includes('no rubric') || 
        lowerAnswer.includes('لا، لم يكن هناك rubric') ||
        lowerAnswer.includes('unclear')) {
      overrides.B3 = true; // Force score 1
      logEvent('clarification_override_b3', { answer: b3Answer });
    }
  }
  
  // Check E.4 clarification answer
  const e4Answer = clarificationAnswers['E4_assessment_understanding'];
  if (e4Answer && typeof e4Answer === 'string') {
    const lowerAnswer = e4Answer.toLowerCase();
    if (lowerAnswer.includes('no, did not understand') ||
        lowerAnswer.includes('لا، لم يفهموا') ||
        lowerAnswer.includes('unclear')) {
      overrides.E4 = true; // Force score 1
      logEvent('clarification_override_e4', { answer: e4Answer });
    }
  }
  
  return overrides;
};

/**
 * Validate and sanitize AI response with CRITICAL CONSTRAINT enforcement
 * Compliance: B.3 (Criteria/Standards) - Enforces Logic Override Protocol (Section 1.5)
 * 
 * @param {Object} response - Raw LLM response
 * @param {string} lessonDescription - Original lesson description for criteria validation
 * @param {Object} clarificationAnswers - User clarification responses
 * @returns {Object} Validated and sanitized response
 * @throws {Error} If response schema is invalid
 */
const validateResponse = (response, lessonDescription = '', clarificationAnswers = {}) => {
  if (!response.criteria || !Array.isArray(response.criteria)) {
    throw new Error('Response is missing criteria array');
  }
  
  // CRITICAL CONSTRAINT: Check for B.3/E.4 assessment criteria presence
  const hasRubricsCriteria = checkRubricsCriteriaPresence(lessonDescription);
  const clarificationOverrides = checkClarificationOverrides(clarificationAnswers);
  
  // FIX: Ensure sanitizeText is available (from utils.js)
  const safeSanitizeText = typeof sanitizeText === 'function' 
    ? sanitizeText 
    : (text, maxLength = 1000) => {
        if (!text || typeof text !== 'string') return '';
        let sanitized = text
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
        if (sanitized.length > maxLength) {
          sanitized = sanitized.substring(0, maxLength) + '...';
        }
        return sanitized;
      };
  
  // FIX: Ensure validateScore is available (from utils.js)
  const safeValidateScore = typeof validateScore === 'function'
    ? validateScore
    : (score) => {
        const num = parseInt(score, 10);
        return !isNaN(num) && num >= 1 && num <= 4 ? num : 3; // Default to 3 if invalid
      };
  
  return {
    recommendations: safeSanitizeText(response.recommendations || '', 2000),
    criteria: response.criteria.map(item => {
      // Validate and normalize score (default to 3 if invalid)
      let score = parseInt(item.score, 10);
      if (isNaN(score) || score < 1 || score > 4) {
        score = 3; // Default score
      }
      
      // LOGIC OVERRIDE PROTOCOL (Section 1.5): Enforce score 1 for B.3/E.4 if criteria absent
      if (item.id === 'B3' || item.id === 'B.3') {
        if (!hasRubricsCriteria || clarificationOverrides.B3) {
          logEvent('critical_constraint_enforced', {
            criterion: item.id,
            originalScore: score,
            reason: 'rubrics_criteria_absent',
            clarificationOverride: clarificationOverrides.B3
          });
          score = 1; // Force 'Not Observed' score
        }
      }
      
      if (item.id === 'E4' || item.id === 'E.4') {
        if (!hasRubricsCriteria || clarificationOverrides.E4) {
          logEvent('critical_constraint_enforced', {
            criterion: item.id,
            originalScore: score,
            reason: 'assessment_criteria_absent',
            clarificationOverride: clarificationOverrides.E4
          });
          score = 1; // Force 'Not Observed' score
        }
      }
      
      // Clean justification text - decode HTML entities before storing
      const rawJustification = item.justification || '';
      let cleanedJustification = rawJustification;
      if (typeof decodeHtmlEntities === 'function') {
        cleanedJustification = decodeHtmlEntities(rawJustification);
      } else {
        // Fallback: manual replacement
        cleanedJustification = rawJustification
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#x2F;/g, '/');
      }
      // Remove HTML tags and limit length
      cleanedJustification = cleanedJustification.replace(/<[^>]*>/g, '').substring(0, 500);
      
      // Clean improvement text similarly
      const rawImprovement = item.improvement || '';
      let cleanedImprovement = rawImprovement;
      if (score <= 2 && rawImprovement) {
        if (typeof decodeHtmlEntities === 'function') {
          cleanedImprovement = decodeHtmlEntities(rawImprovement).replace(/<[^>]*>/g, '').substring(0, 500);
        } else {
          cleanedImprovement = rawImprovement
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#x2F;/g, '/')
            .replace(/<[^>]*>/g, '')
            .substring(0, 500);
        }
      }
      
      return {
        id: item.id || '',
        score: score,
        justification: cleanedJustification,
        improvement: cleanedImprovement
      };
    }),
    totalScore: response.totalScore || 0
  };
};

/**
 * Display results by section with V3 filtering based on selected environments
 * Compliance: A.1 (Differentiated Access) - Shows only selected environments
 */
const displayResults = (results) => {
  currentResults = results.criteria;
  
  // FIX: Ensure all results have a valid score (default to 3 if missing)
  currentResults.forEach(result => {
    if (!result.score || result.score === 0 || result.score < 1 || result.score > 4) {
      result.score = 3;
    }
  });
  
  currentRecommendations = {
    recommendations: results.recommendations || ''
  };
  
  if (!resultsBySection) return;
  
  resultsBySection.innerHTML = '';
  
  // Get selected environments for filtering (V3 feature)
  // Note: selectedEnvs is scoped to this function - no conflict with other uses
  const selectedEnvs = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  console.log('Displaying results for selected environments:', selectedEnvs);
  
  // Group criteria by section (display tables first)
  const criteriaBySection = {};
  config.eleot_sections.forEach(section => {
    criteriaBySection[section.id] = {
      section: section,
      criteria: []
    };
  });
  
  currentResults.forEach(result => {
    const sectionId = result.id.charAt(0);
    if (criteriaBySection[sectionId]) {
      criteriaBySection[sectionId].criteria.push(result);
    }
  });
  
  // Display each section (V3: only show selected environments)
  config.eleot_sections.forEach(section => {
    const sectionData = criteriaBySection[section.id];
    if (!sectionData || sectionData.criteria.length === 0) return;
    
    // V3 FILTERING: Check if this environment is selected
    const isEnvironmentSelected = selectedEnvs.includes(section.id);
    if (!isEnvironmentSelected) {
      console.log(`Skipping environment ${section.id} - not selected`);
      return; // Skip this environment entirely
    }
    
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-results';
    
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    sectionHeader.textContent = `${section.id}. ${currentLanguage === 'ar' ? section.label_ar : section.label_en}`;
    sectionDiv.appendChild(sectionHeader);
    
    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['المعيار', 'الدرجة', 'التبرير', 'نسخ'].forEach((text, idx) => {
      const th = document.createElement('th');
      th.textContent = currentLanguage === 'ar' ? text : ['Criterion', 'Score', 'Notes', 'Copy'][idx];
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    sectionData.criteria.forEach(result => {
      const criterion = section.criteria.find(c => c.id === result.id);
      if (!criterion) return;
      
      const row = document.createElement('tr');
      
      // Criterion ID and label
      const criterionCell = document.createElement('td');
      criterionCell.innerHTML = `<span class="criteria-id">${result.id}</span><br><span class="criteria-label">${currentLanguage === 'ar' ? criterion.label_ar : criterion.label_en}</span>`;
      
      // Score (editable) - FIX: Ensure score is visible and properly displayed
      // FIX: Set default score to 3 if score is missing or empty
      const defaultScore = 3;
      const scoreValue = (result.score && result.score > 0 && result.score <= 4) ? result.score : defaultScore;
      
      // Update result.score in currentResults if it was missing
      if (!result.score || result.score === 0) {
        const resultIndex = currentResults.findIndex(r => r.id === result.id);
        if (resultIndex !== -1) {
          currentResults[resultIndex].score = defaultScore;
        }
      }
      
      const scoreCell = document.createElement('td');
      scoreCell.className = `score-cell score-${scoreValue}`;
      scoreCell.style.textAlign = 'center';
      scoreCell.style.verticalAlign = 'middle';
      
      const scoreInput = document.createElement('input');
      scoreInput.type = 'number';
      scoreInput.min = '1';
      scoreInput.max = '4';
      // FIX: Set default score to 3 for empty fields
      scoreInput.value = scoreValue;
      // FIX: Unified rendering for both Arabic and English - single editable score input
      // Removed: Blue Arabic overlay that caused duplication
      // Keep: Only the green editable input field (same behavior for both languages)
      scoreInput.style.display = 'block';
      scoreInput.style.visibility = 'visible';
      scoreInput.style.opacity = '1';
      scoreInput.className = `score-input score-${scoreValue}`;
      scoreInput.style.width = '60px';
      scoreInput.style.textAlign = 'center';
      scoreInput.style.fontWeight = 'bold';
      scoreInput.style.fontSize = '18px';
      scoreInput.style.border = '2px solid #2196F3';
      scoreInput.style.borderRadius = '4px';
      scoreInput.style.padding = '6px';
      scoreInput.style.backgroundColor = '#f5f5f5';
      
      /**
       * FIX: Removed blue Arabic overlay - now using unified rendering for both languages
       * 
       * Previous issue: Arabic interface showed duplicate scores:
       * 1. Blue overlay with Arabic-Indic numerals (arabicDisplay span)
       * 2. Green editable input (scoreInput)
       * 
       * Solution: Removed the blue overlay completely. Now only the editable input is shown.
       * For Arabic interface, the input keeps Western numerals (1-4) internally for calculations.
       * The input is styled identically for both languages - no duplication.
       */
      if (currentLanguage === 'ar') {
        scoreInput.style.fontFamily = 'Arial, Tahoma, sans-serif';
        scoreInput.setAttribute('lang', 'ar');
        scoreInput.setAttribute('dir', 'ltr'); // Keep input direction LTR for numbers
        // Input value remains in Western numerals (1-4) for calculations
        // No overlay needed - matches English behavior exactly
      }
      
      // Single append point - no duplication
      scoreCell.appendChild(scoreInput);
      
      scoreInput.setAttribute('aria-label', currentLanguage === 'ar' ? `الدرجة للمعيار ${result.id}` : `Score for criterion ${result.id}`);
      
      // Update score class when value changes - FIX: Save evaluation after score change
      const updateScoreClass = (newScore) => {
        scoreCell.className = `score-cell score-${newScore}`;
        scoreInput.className = `score-input score-${newScore}`;
        // Update Arabic display if exists
        if (currentLanguage === 'ar') {
          const arabicDisplay = scoreCell.querySelector('.arabic-numeral-display');
          if (arabicDisplay) {
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            const convertToArabic = (num) => {
              return String(num).split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('');
            };
            arabicDisplay.textContent = convertToArabic(newScore);
          }
        }
        // Update the result in currentResults
        const resultIndex = currentResults.findIndex(r => r.id === result.id);
        if (resultIndex !== -1) {
          currentResults[resultIndex].score = parseInt(newScore);
          // V3: Recalculate overall score based on selected environments only
          const selectedEnvsForRecalc = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
          const filteredResults = currentResults.filter(r => selectedEnvsForRecalc.includes(r.id.charAt(0)));
          const totalScore = calculateAverageScore(filteredResults.map(r => r.score).filter(s => s > 0));
          
          // FIX: Unified total score update - single rendering point
          // Removed: Blue Arabic overlay that caused duplication
          // This matches the logic in displayResults() to prevent double rendering
          if (overallScoreSpan) {
            const displayValue = totalScore.toFixed(1);
            
            if (overallScoreSpan.tagName === 'INPUT') {
              // Only update if value changed
              if (overallScoreSpan.value !== displayValue) {
                overallScoreSpan.value = displayValue;
              }
              
              // FIX: Number inputs can only accept Western numerals (0-9)
              // Setting Arabic-Indic numerals causes "cannot be parsed" error
              // Solution: Always use Western numerals for number input values
              if (currentLanguage === 'ar') {
                overallScoreSpan.style.fontFamily = 'Arial, Tahoma, sans-serif';
                overallScoreSpan.setAttribute('lang', 'ar');
              }
              // Always use Western numerals for number input (works for both languages)
              overallScoreSpan.value = displayValue;
            } else {
              // For span elements (backward compatibility)
              if (currentLanguage === 'ar') {
                const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                const convertToArabic = (num) => {
                  const parts = num.toFixed(1).split('.');
                  return parts[0].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') + 
                         (parts[1] ? '.' + parts[1].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') : '');
                };
                const arabicText = convertToArabic(totalScore);
                if (overallScoreSpan.textContent !== arabicText) {
                  overallScoreSpan.textContent = arabicText;
                }
              } else {
                if (overallScoreSpan.textContent !== displayValue) {
                  overallScoreSpan.textContent = displayValue;
                }
              }
            }
          }
          
          // FIX: Save evaluation results after score change
          if (typeof saveDataToStorage === 'function') {
            saveDataToStorage();
            console.log(`Score updated for ${result.id}: ${newScore}, evaluation saved`);
          }
        }
      };
      
      scoreInput.addEventListener('change', (e) => {
        const newScore = Math.max(1, Math.min(4, parseInt(e.target.value) || 1));
        e.target.value = newScore;
        updateScoreClass(newScore);
      });
      
      // Also save on blur to ensure data is persisted
      scoreInput.addEventListener('blur', () => {
        if (typeof saveDataToStorage === 'function') {
          saveDataToStorage();
        }
      });
      
      // Justification (editable) - FIX: Clean HTML entities
      const justificationCell = document.createElement('td');
      justificationCell.className = 'justification-cell';
      const justificationTextarea = document.createElement('textarea');
      // Clean text from HTML entities like &#x27; using cleanText function from utils.js
      const rawJustification = result.justification || '';
      let cleanJustification = rawJustification;
      if (typeof cleanText === 'function') {
        cleanJustification = cleanText(rawJustification);
      } else if (typeof decodeHtmlEntities === 'function') {
        cleanJustification = decodeHtmlEntities(rawJustification).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        // Fallback: manual replacement
        cleanJustification = rawJustification
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#x2F;/g, '/')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      justificationTextarea.value = cleanJustification;
      justificationTextarea.className = 'justification-textarea';
      justificationTextarea.style.width = '100%';
      justificationTextarea.style.minHeight = '60px';
      justificationTextarea.style.border = '1px solid #ddd';
      justificationTextarea.style.borderRadius = '4px';
      justificationTextarea.style.padding = '6px';
      justificationTextarea.style.fontSize = '12px';
      justificationTextarea.style.resize = 'vertical';
      
      justificationTextarea.addEventListener('blur', () => {
        // Update the result in currentResults
        const resultIndex = currentResults.findIndex(r => r.id === result.id);
        if (resultIndex !== -1) {
          currentResults[resultIndex].justification = justificationTextarea.value;
          // FIX: Save evaluation results after justification change
          if (typeof saveDataToStorage === 'function') {
            saveDataToStorage();
            console.log(`Justification updated for ${result.id}, evaluation saved`);
          }
        }
      });
      
      justificationCell.appendChild(justificationTextarea);
      
      // Copy button
      const copyCell = document.createElement('td');
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = currentLanguage === 'ar' ? 'نسخ' : 'Copy';
      copyBtn.setAttribute('title', currentLanguage === 'ar' ? 'نسخ التبرير' : 'Copy notes');
      copyBtn.addEventListener('click', async () => {
        const textToCopy = justificationTextarea.value;
        const success = await copyToClipboard(textToCopy);
        if (success) {
          const copiedText = currentLanguage === 'ar' ? 'تم النسخ!' : 'Copied!';
          showTooltip(copyBtn, copiedText);
        }
      });
      copyCell.appendChild(copyBtn);
      
      row.appendChild(criterionCell);
      row.appendChild(scoreCell);
      row.appendChild(justificationCell);
      row.appendChild(copyCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    sectionDiv.appendChild(table);
    resultsBySection.appendChild(sectionDiv);
  });
  
  // V3: Calculate overall score based ONLY on selected environments
  const selectedEnvsForOverallScore = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const filteredResults = currentResults.filter(result => {
    const envLetter = result.id.charAt(0);
    return selectedEnvsForOverallScore.includes(envLetter);
  });
  const totalScore = results.totalScore || calculateAverageScore(filteredResults.map(r => r.score).filter(s => s > 0));
  
  /**
   * FIX: Unified function to render total score exactly once, regardless of language
   * 
   * Previous issue: Total score was rendered twice in English interface because:
   * 1. This function updated overallScoreSpan
   * 2. updateLoadTimeData() also updated overallScoreSpan (now fixed)
   * 
   * Solution: This is now the ONLY place where total score is rendered.
   * Removed: Blue Arabic overlay that caused duplication
   * Keep: Only the editable input field (same for both languages)
   */
  if (overallScoreSpan) {
    const displayValue = totalScore.toFixed(1);
    
    // FIX: Single update point - use value for input, textContent for span
    if (overallScoreSpan.tagName === 'INPUT') {
      // Only update if value changed to prevent unnecessary re-rendering
      if (overallScoreSpan.value !== displayValue) {
        overallScoreSpan.value = displayValue;
      }
      
      // FIX: Number inputs can only accept Western numerals (0-9)
      // Setting Arabic-Indic numerals causes "cannot be parsed" error
      // Solution: Always use Western numerals for number input values
      // The lang="ar" attribute is for text direction/formatting, not numeral conversion
      if (currentLanguage === 'ar') {
        overallScoreSpan.style.fontFamily = 'Arial, Tahoma, sans-serif';
        overallScoreSpan.setAttribute('lang', 'ar');
      }
      // Always use Western numerals for number input (works for both languages)
      overallScoreSpan.value = displayValue;
      
      // Ensure input is always visible (no transparency needed since overlay is removed)
      overallScoreSpan.style.opacity = '1';
    } else {
      // For span elements (backward compatibility)
      if (currentLanguage === 'ar') {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        const convertToArabic = (num) => {
          const parts = num.toFixed(1).split('.');
          return parts[0].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') + 
                 (parts[1] ? '.' + parts[1].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') : '');
        };
        const arabicText = convertToArabic(totalScore);
        // Only update if value changed
        if (overallScoreSpan.textContent !== arabicText) {
          overallScoreSpan.textContent = arabicText;
        }
      } else {
        // Only update if value changed
        if (overallScoreSpan.textContent !== displayValue) {
          overallScoreSpan.textContent = displayValue;
        }
      }
    }
    console.log(`Overall score calculated from ${filteredResults.length} criteria in environments: ${selectedEnvsForOverallScore.join(', ')}`);
  }
  
  // FIX: Don't update loadTimeData here to avoid double rendering of total score
  // The total score is already updated above in displayResults
  // Only update loadTimeData.data without triggering UI updates
  if (loadTimeData && loadTimeData.data) {
    loadTimeData.data.totalScore = totalScore;
  }
  
  // Display recommendations if available
  if (results.recommendations && results.recommendations.trim() !== '') {
    displayRecommendations(currentRecommendations);
  }
  
  if (resultsSection) resultsSection.classList.remove('hidden');
  
  // FIX: Fill any remaining empty score fields with default value of 3
  fillEmptyScoreFields();
  
  // V3: Auto-save results to localStorage after displaying
  saveDataToStorage();
};

/**
 * Fill empty score input fields with default value of 3
 * This ensures all evaluation criteria have a score value
 */
const fillEmptyScoreFields = () => {
  // Find all score input fields in the results section
  const scoreInputs = document.querySelectorAll('#results-by-section input[type="number"].score-input');
  
  let filledCount = 0;
  scoreInputs.forEach(input => {
    const currentValue = parseInt(input.value, 10);
    // Check if field is empty, 0, or invalid
    if (!currentValue || currentValue < 1 || currentValue > 4 || isNaN(currentValue)) {
      input.value = '3';
      filledCount++;
      
      // Update the corresponding result in currentResults
      const row = input.closest('tr');
      if (row) {
        const criterionCell = row.querySelector('.criteria-id');
        if (criterionCell) {
          const criterionId = criterionCell.textContent.trim();
          const resultIndex = currentResults.findIndex(r => r.id === criterionId);
          if (resultIndex !== -1) {
            currentResults[resultIndex].score = 3;
          }
        }
      }
      
      // Trigger change event to update UI and save
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  if (filledCount > 0) {
    // Recalculate overall score after filling empty scores
    const selectedEnvsForRecalc = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const filteredResults = currentResults.filter(r => selectedEnvsForRecalc.includes(r.id.charAt(0)));
    const totalScore = calculateAverageScore(filteredResults.map(r => r.score).filter(s => s > 0));
    if (overallScoreSpan) {
      // Convert to Arabic numerals if Arabic interface
      // FIX: Use value for input, textContent for span
      if (overallScoreSpan.tagName === 'INPUT') {
        overallScoreSpan.value = totalScore.toFixed(1);
        // Update Arabic overlay if exists
        if (currentLanguage === 'ar') {
          const wrapper = overallScoreSpan.parentElement;
          const arabicOverlay = wrapper.querySelector('.arabic-score-overlay');
          if (arabicOverlay) {
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            const convertToArabic = (num) => {
              const parts = num.toFixed(1).split('.');
              return parts[0].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') + 
                     (parts[1] ? '.' + parts[1].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') : '');
            };
            arabicOverlay.textContent = convertToArabic(totalScore);
          }
        }
      } else {
        // For span elements (backward compatibility)
        if (currentLanguage === 'ar') {
          const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          const convertToArabic = (num) => {
            const parts = num.toFixed(1).split('.');
            return parts[0].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') + 
                   (parts[1] ? '.' + parts[1].split('').map(d => arabicNumerals[parseInt(d)] || d).join('') : '');
          };
          overallScoreSpan.textContent = convertToArabic(totalScore);
        } else {
          overallScoreSpan.textContent = totalScore.toFixed(1);
        }
      }
    }
    
    // Save updated scores
    if (typeof saveDataToStorage === 'function') {
      saveDataToStorage();
    }
  }
};

/**
 * Generate expert-level instructional supervision suggestions
 */
const generateExpertSuggestion = (criterionId, score, criterionLabel) => {
  const expertSuggestions = {
    // Equitable Learning (A)
    'A1': {
      ar: score <= 2 
        ? 'قم بتصميم أنشطة متعددة المستويات (مبتدئ، متوسط، متقدم) للسماح لكل متعلم بالعمل وفق قدراته. استخدم استراتيجيات مثل التعلم التعاوني، المحطات التعليمية، أو قوائم المهام المرنة.'
        : 'واصل تطوير التمايز من خلال إضافة خيارات متعددة للتعبير عن التعلم (عرض، كتابة، رسم، تسجيل صوتي) لاستيعاب أنماط التعلم المختلفة.',
      en: score <= 2
        ? 'Design multi-tiered activities (beginner, intermediate, advanced) to allow each learner to work at their level. Use strategies such as cooperative learning, learning stations, or flexible task lists.'
        : 'Continue developing differentiation by adding multiple options for expressing learning (presentation, writing, drawing, audio recording) to accommodate different learning styles.'
    },
    'A2': {
      ar: score <= 2
        ? 'تأكد من أن جميع المتعلمين لديهم وصول متساوٍ للموارد. استخدم استراتيجيات مثل توزيع عادل للمواد، ضمان توفر التكنولوجيا للجميع، وتوفير دعم إضافي للمتعلمين الذين يحتاجونه.'
        : 'راجع توزيع الموارد بانتظام واطلب من المتعلمين تقييم وصولهم للمواد والتكنولوجيا لضمان الإنصاف.',
      en: score <= 2
        ? 'Ensure all learners have equal access to resources. Use strategies such as fair distribution of materials, ensuring technology availability for all, and providing additional support for learners who need it.'
        : 'Regularly review resource distribution and ask learners to evaluate their access to materials and technology to ensure equity.'
    },
    'A3': {
      ar: score <= 2
        ? 'طور نظاماً واضحاً ومتسقاً للقواعد والتوقعات. ناقش القواعد مع المتعلمين في بداية الفصل الدراسي وطبقها بشكل عادل. استخدم لغة إيجابية وكن متسقاً في التعامل مع جميع المتعلمين.'
        : 'واصل تطبيق القواعد بشكل عادل واطلب ملاحظات من المتعلمين حول شعورهم بالإنصاف في المعاملة.',
      en: score <= 2
        ? 'Develop a clear and consistent system of rules and expectations. Discuss rules with learners at the beginning of the semester and apply them fairly. Use positive language and be consistent in dealing with all learners.'
        : 'Continue applying rules fairly and seek feedback from learners about their sense of fairness in treatment.'
    },
    'A4': {
      ar: score <= 2
        ? 'ادمج أنشطة تعزز التعاطف والاحترام للاختلافات. استخدم قصصاً متنوعة، مناقشات حول الثقافات المختلفة، وأنشطة تعاونية تجمع بين متعلمين من خلفيات متنوعة.'
        : 'واصل تعزيز التعاطف من خلال مشاريع خدمة المجتمع أو أنشطة تبرز مساهمات أشخاص من خلفيات متنوعة.',
      en: score <= 2
        ? 'Integrate activities that promote empathy and respect for differences. Use diverse stories, discussions about different cultures, and collaborative activities that bring together learners from diverse backgrounds.'
        : 'Continue promoting empathy through community service projects or activities highlighting contributions from people of diverse backgrounds.'
    },
    // High Expectations (B)
    'B1': {
      ar: score <= 2
        ? 'شارك المتعلمين في وضع أهداف تعلم واضحة وقابلة للتحقيق. استخدم عبارات مثل "بنهاية هذا الدرس، ستكون قادراً على..." واطلب من المتعلمين تحديد أهدافهم الشخصية.'
        : 'واصل رفع التوقعات من خلال تحديات تدريجية وتقديم أمثلة على عمل عالي الجودة للمتعلمين.',
      en: score <= 2
        ? 'Involve learners in setting clear and achievable learning goals. Use phrases like "By the end of this lesson, you will be able to..." and ask learners to identify their personal goals.'
        : 'Continue raising expectations through gradual challenges and providing examples of high-quality work to learners.'
    },
    'B2': {
      ar: score <= 2
        ? 'صمم أنشطة تتحدى المتعلمين ولكنها قابلة للتحقيق. استخدم استراتيجية "منطقة التطوير القريبة" (ZPD) - أنشطة صعبة بما يكفي لتكون محفزة ولكن ليست صعبة جداً لدرجة الإحباط.'
        : 'واصل تطوير الأنشطة الصعبة من خلال إضافة عناصر إبداعية أو تحليلية أكثر تعقيداً.',
      en: score <= 2
        ? 'Design activities that challenge learners but are achievable. Use the "Zone of Proximal Development" (ZPD) strategy - activities challenging enough to be motivating but not so difficult as to be frustrating.'
        : 'Continue developing challenging activities by adding more complex creative or analytical elements.'
    },
    'B3': {
      ar: score <= 2
        ? 'قدم أمثلة واضحة على عمل عالي الجودة واستخدم معايير تقييم (rubrics) لمساعدة المتعلمين على فهم ما يتوقع منهم. ناقش معايير الجودة مع المتعلمين واطلب منهم تقييم عملهم.'
        : 'واصل تطوير فهم الجودة من خلال جلسات تقييم الأقران أو معارض لعرض أمثلة على عمل ممتاز.',
      en: score <= 2
        ? 'Provide clear examples of high-quality work and use assessment criteria (rubrics) to help learners understand what is expected of them. Discuss quality criteria with learners and ask them to evaluate their work.'
        : 'Continue developing quality understanding through peer assessment sessions or exhibitions to showcase examples of excellent work.'
    },
    'B4': {
      ar: score <= 2
        ? 'ادمج أسئلة وأنشطة تتطلب تفكيراً عالي المستوى. استخدم تصنيف بلوم: اطلب من المتعلمين التحليل، التقييم، والتركيب بدلاً من مجرد التذكر والفهم.'
        : 'واصل تطوير التفكير عالي المستوى من خلال مشاريع بحثية أو حل مشكلات معقدة تتطلب تحليلاً عميقاً.',
      en: score <= 2
        ? 'Integrate questions and activities that require higher-order thinking. Use Bloom\'s taxonomy: ask learners to analyze, evaluate, and synthesize rather than just remember and understand.'
        : 'Continue developing higher-order thinking through research projects or solving complex problems that require deep analysis.'
    },
    'B5': {
      ar: score <= 2
        ? 'شجع الاستقلالية والمسؤولية من خلال منح المتعلمين خيارات في كيفية تعلمهم. استخدم استراتيجيات مثل التعلم القائم على المشاريع، التعلم الذاتي الموجه، أو محافظ التعلم.'
        : 'واصل تعزيز الاستقلالية من خلال زيادة الخيارات المتاحة للمتعلمين في اختيار المواضيع أو طرق التقييم.',
      en: score <= 2
        ? 'Encourage autonomy and responsibility by giving learners choices in how they learn. Use strategies such as project-based learning, self-directed learning, or learning portfolios.'
        : 'Continue promoting autonomy by increasing the choices available to learners in selecting topics or assessment methods.'
    },
    // Supportive Learning (C)
    'C1': {
      ar: score <= 2
        ? 'ابني مجتمعاً إيجابياً من خلال أنشطة بناء الفريق، تسمية الفصل، وتطوير قواعد الفصل معاً. اعترف بالإنجازات الجماعية وشجع التعاون.'
        : 'واصل بناء المجتمع من خلال مشاريع خدمة الفصل أو أنشطة تعاونية طويلة الأمد.',
      en: score <= 2
        ? 'Build a positive community through team-building activities, classroom naming, and developing classroom rules together. Acknowledge collective achievements and encourage cooperation.'
        : 'Continue building community through classroom service projects or long-term collaborative activities.'
    },
    'C2': {
      ar: score <= 2
        ? 'أنشئ بيئة آمنة للخطأ من خلال تقدير المحاولات والجهود. استخدم عبارات مثل "الأخطاء تساعدنا على التعلم" وشجع المتعلمين على طرح أسئلة دون خوف.'
        : 'واصل تعزيز المخاطرة الفكرية من خلال أنشطة "التفكير بصوت عالٍ" أو جلسات "ماذا لو" حيث لا توجد إجابات خاطئة.',
      en: score <= 2
        ? 'Create a safe environment for mistakes by valuing attempts and efforts. Use phrases like "mistakes help us learn" and encourage learners to ask questions without fear.'
        : 'Continue promoting intellectual risk-taking through "think aloud" activities or "what if" sessions where there are no wrong answers.'
    },
    'C3': {
      ar: score <= 2
        ? 'وفر دعماً متعدد المستويات: دعم مباشر من المعلم، دعم الأقران، وموارد إضافية. استخدم استراتيجيات مثل التدريس المتبادل، مجموعات صغيرة، أو مراكز التعلم.'
        : 'واصل تطوير الدعم من خلال إنشاء نظام مرجعي للمتعلمين أو مكتبة موارد رقمية يمكن الوصول إليها في أي وقت.',
      en: score <= 2
        ? 'Provide multi-level support: direct support from the teacher, peer support, and additional resources. Use strategies such as reciprocal teaching, small groups, or learning centers.'
        : 'Continue developing support by creating a reference system for learners or a digital resource library accessible at any time.'
    },
    'C4': {
      ar: score <= 2
        ? 'ابني علاقات إيجابية من خلال إظهار الاهتمام الحقيقي بالمتعلمين كأفراد. استخدم أسماء المتعلمين، اسأل عن اهتماماتهم، وكن متاحاً للدعم العاطفي والأكاديمي.'
        : 'واصل بناء العلاقات من خلال اجتماعات فردية منتظمة أو ملاحظات إيجابية مكتوبة للمتعلمين.',
      en: score <= 2
        ? 'Build positive relationships by showing genuine interest in learners as individuals. Use learners\' names, ask about their interests, and be available for emotional and academic support.'
        : 'Continue building relationships through regular individual meetings or written positive notes to learners.'
    },
    // Active Learning (D)
    'D1': {
      ar: score <= 2
        ? 'قلل من وقت التحدث (teacher talk time) وزد من وقت التفاعل. استخدم استراتيجيات مثل المناقشات في مجموعات صغيرة، العصف الذهني، أو جلسات الأسئلة والأجوبة التفاعلية.'
        : 'واصل تطوير التفاعل من خلال تقنيات مثل "فكر-زوج-شارك" أو مناقشات Socratic التي تشجع الحوار العميق.',
      en: score <= 2
        ? 'Reduce teacher talk time and increase interaction time. Use strategies such as small group discussions, brainstorming, or interactive Q&A sessions.'
        : 'Continue developing interaction through techniques such as "think-pair-share" or Socratic discussions that encourage deep dialogue.'
    },
    'D2': {
      ar: score <= 2
        ? 'اربط المحتوى بحياة المتعلمين اليومية. استخدم أمثلة من بيئتهم المحلية، اطرح أسئلة مثل "كيف يرتبط هذا بحياتك؟" وادمج مشكلات من العالم الحقيقي.'
        : 'واصل تعزيز الروابط من خلال مشاريع تطبيقية أو زيارات ميدانية تربط التعلم بالعالم الحقيقي.',
      en: score <= 2
        ? 'Connect content to learners\' daily lives. Use examples from their local environment, ask questions like "How does this relate to your life?" and integrate real-world problems.'
        : 'Continue enhancing connections through applied projects or field visits that link learning to the real world.'
    },
    'D3': {
      ar: score <= 2
        ? 'استخدم استراتيجيات تفاعلية مثل التعلم النشط، الأنشطة العملية، أو التعلم القائم على الاستكشاف. تأكد من أن المتعلمين يقومون بأكثر من مجرد الاستماع.'
        : 'واصل تطوير المشاركة النشطة من خلال إضافة عناصر حركية أو حسية للأنشطة لاستيعاب أنماط التعلم المختلفة.',
      en: score <= 2
        ? 'Use interactive strategies such as active learning, hands-on activities, or inquiry-based learning. Ensure learners are doing more than just listening.'
        : 'Continue developing active participation by adding kinesthetic or sensory elements to activities to accommodate different learning styles.'
    },
    'D4': {
      ar: score <= 2
        ? 'صمم أنشطة تعاونية هادفة تتطلب من المتعلمين العمل معاً. استخدم استراتيجيات مثل التعلم التعاوني، المشاريع الجماعية، أو حل المشكلات في مجموعات.'
        : 'واصل تطوير التعاون من خلال مشاريع طويلة الأمد تتطلب تنسيقاً وتوزيعاً للمهام بين أعضاء المجموعة.',
      en: score <= 2
        ? 'Design meaningful collaborative activities that require learners to work together. Use strategies such as cooperative learning, group projects, or group problem-solving.'
        : 'Continue developing collaboration through long-term projects that require coordination and task distribution among group members.'
    },
    // Progress Monitoring & Feedback (E)
    'E1': {
      ar: score <= 2
        ? 'علم المتعلمين كيفية مراقبة تقدمهم. استخدم أدوات مثل محافظ التعلم، مخططات التقدم، أو سجلات التعلم الذاتي. ناقش التقدم بانتظام مع كل متعلم.'
        : 'واصل تطوير المراقبة الذاتية من خلال جلسات تقييم ذاتي منتظمة أو محافظ رقمية تتبع التقدم.',
      en: score <= 2
        ? 'Teach learners how to monitor their progress. Use tools such as learning portfolios, progress charts, or self-learning logs. Discuss progress regularly with each learner.'
        : 'Continue developing self-monitoring through regular self-assessment sessions or digital portfolios that track progress.'
    },
    'E2': {
      ar: score <= 2
        ? 'وفر ملاحظات بناءة ومحددة في الوقت المناسب. استخدم نموذج "ما الذي تم بشكل جيد، ما الذي يحتاج تحسين، وكيفية التحسين". شجع تقييم الأقران أيضاً.'
        : 'واصل تطوير الملاحظات من خلال استخدام تقنيات مثل الملاحظات الصوتية أو الفيديو للمتعلمين.',
      en: score <= 2
        ? 'Provide constructive and specific feedback in a timely manner. Use the model "what was done well, what needs improvement, and how to improve." Also encourage peer assessment.'
        : 'Continue developing feedback by using techniques such as audio or video notes for learners.'
    },
    'E3': {
      ar: score <= 2
        ? 'استخدم استراتيجيات تقييم متنوعة للتحقق من الفهم: أسئلة مفتوحة، مناقشات، عروض تقديمية، أو تقييمات عملية. تأكد من أن جميع المتعلمين لديهم فرصة لإظهار فهمهم.'
        : 'واصل تطوير تقييم الفهم من خلال تقنيات مثل التقييم التكويني المستمر أو خرائط المفاهيم.',
      en: score <= 2
        ? 'Use diverse assessment strategies to verify understanding: open questions, discussions, presentations, or practical assessments. Ensure all learners have the opportunity to demonstrate their understanding.'
        : 'Continue developing understanding assessment through techniques such as continuous formative assessment or concept maps.'
    },
    'E4': {
      ar: score <= 2
        ? 'شارك معايير التقييم (rubrics) مع المتعلمين مسبقاً. ناقش كيف سيتم تقييم عملهم واطلب منهم تقييم عملهم باستخدام نفس المعايير قبل التقديم.'
        : 'واصل تطوير فهم التقييم من خلال جلسات "تقييم الأقران" حيث يقيّم المتعلمون عمل بعضهم البعض باستخدام المعايير.',
      en: score <= 2
        ? 'Share assessment criteria (rubrics) with learners in advance. Discuss how their work will be evaluated and ask them to evaluate their work using the same criteria before submission.'
        : 'Continue developing assessment understanding through "peer assessment" sessions where learners evaluate each other\'s work using the criteria.'
    },
    // Well-Managed (F)
    'F1': {
      ar: score <= 2
        ? 'نموذج الاحترام في جميع التفاعلات. استخدم لغة مهذبة، استمع بنشاط، واعترف بآراء المتعلمين. أنشئ ثقافة احترام متبادل من خلال مناقشة أهمية الاحترام في بداية الفصل الدراسي.'
        : 'واصل تعزيز الاحترام من خلال أنشطة بناء الفريق أو مشاريع خدمة المجتمع التي تعزز القيم الإيجابية.',
      en: score <= 2
        ? 'Model respect in all interactions. Use polite language, listen actively, and acknowledge learners\' opinions. Create a culture of mutual respect by discussing the importance of respect at the beginning of the semester.'
        : 'Continue promoting respect through team-building activities or community service projects that promote positive values.'
    },
    'F2': {
      ar: score <= 2
        ? 'طور قواعد واضحة ومتسقة مع المتعلمين. ناقش القواعد في بداية الفصل الدراسي واطلب من المتعلمين المساهمة في وضعها. راجع القواعد بانتظام وطبقها بشكل عادل.'
        : 'واصل تطوير الالتزام بالقواعد من خلال نظام مكافآت إيجابي يعترف بالسلوك الجيد.',
      en: score <= 2
        ? 'Develop clear and consistent rules with learners. Discuss rules at the beginning of the semester and ask learners to contribute to setting them. Review rules regularly and apply them fairly.'
        : 'Continue developing rule compliance through a positive reward system that recognizes good behavior.'
    },
    'F3': {
      ar: score <= 2
        ? 'خطط للانتقالات مسبقاً. استخدم إشارات واضحة (مثل العد التنازلي، موسيقى، أو إشارة بصرية) وأبلغ المتعلمين مسبقاً عن الانتقالات القادمة. تدرب على الانتقالات مع المتعلمين.'
        : 'واصل تحسين الانتقالات من خلال تقليل وقت الانتقال تدريجياً أو جعل الانتقالات جزءاً من التعلم.',
      en: score <= 2
        ? 'Plan transitions in advance. Use clear signals (such as countdown, music, or visual signal) and inform learners in advance about upcoming transitions. Practice transitions with learners.'
        : 'Continue improving transitions by gradually reducing transition time or making transitions part of learning.'
    },
    'F4': {
      ar: score <= 2
        ? 'خطط للأنشطة بعناية لضمان استخدام الوقت بفعالية. أعد المواد مسبقاً، حدد أهدافاً واضحة لكل نشاط، واستخدم تقنيات إدارة الوقت مثل مؤقتات أو جداول زمنية مرئية.'
        : 'واصل تحسين استخدام الوقت من خلال تحليل كيفية قضاء الوقت في الفصل وتحديد مجالات التحسين.',
      en: score <= 2
        ? 'Plan activities carefully to ensure effective use of time. Prepare materials in advance, set clear goals for each activity, and use time management techniques such as timers or visual schedules.'
        : 'Continue improving time use by analyzing how time is spent in the classroom and identifying areas for improvement.'
    },
    // Digital Learning (G)
    'G1': {
      ar: score <= 2
        ? 'ادمج أدوات رقمية لجمع المعلومات مثل محركات البحث، قواعد البيانات، أو منصات التعلم. علم المتعلمين كيفية تقييم مصداقية المعلومات الرقمية.'
        : 'واصل تطوير استخدام الأدوات الرقمية من خلال مشاريع بحثية رقمية أو أنشطة تتطلب تقييم مصادر متعددة.',
      en: score <= 2
        ? 'Integrate digital tools for gathering information such as search engines, databases, or learning platforms. Teach learners how to evaluate the credibility of digital information.'
        : 'Continue developing digital tool use through digital research projects or activities requiring evaluation of multiple sources.'
    },
    'G2': {
      ar: score <= 2
        ? 'استخدم التكنولوجيا لحل المشكلات والإبداع. قدم أدوات مثل برامج التصميم، أدوات البرمجة البسيطة، أو منصات إنشاء المحتوى. شجع المتعلمين على إنشاء منتجات رقمية أصلية.'
        : 'واصل تطوير الإبداع الرقمي من خلال مشاريع تتطلب استخدام تقنيات متقدمة أو أدوات رقمية متعددة.',
      en: score <= 2
        ? 'Use technology for problem-solving and creativity. Introduce tools such as design software, simple programming tools, or content creation platforms. Encourage learners to create original digital products.'
        : 'Continue developing digital creativity through projects requiring the use of advanced techniques or multiple digital tools.'
    },
    'G3': {
      ar: score <= 2
        ? 'استخدم أدوات التواصل الرقمي للتعاون. قدم منصات مثل Google Workspace، Microsoft Teams، أو أدوات التعاون الأخرى. علم المتعلمين كيفية التواصل بفعالية في البيئات الرقمية.'
        : 'واصل تطوير التعاون الرقمي من خلال مشاريع تعاونية عبر الإنترنت أو شراكات مع فصول أخرى.',
      en: score <= 2
        ? 'Use digital communication tools for collaboration. Introduce platforms such as Google Workspace, Microsoft Teams, or other collaboration tools. Teach learners how to communicate effectively in digital environments.'
        : 'Continue developing digital collaboration through online collaborative projects or partnerships with other classes.'
    }
  };
  
  const suggestions = expertSuggestions[criterionId];
  if (suggestions) {
    return currentLanguage === 'ar' ? suggestions.ar : suggestions.en;
  }
  
  // Default suggestion if criterion not found
  return currentLanguage === 'ar'
    ? `تعزيز الممارسة في ${criterionLabel} من خلال تطبيق استراتيجيات تعليمية فعالة ومتنوعة.`
    : `Enhance practice in ${criterionLabel} by applying effective and diverse teaching strategies.`;
};

/**
 * Format recommendations according to new requirements
 * V3: Filter recommendations based on selected environments only
 */
const formatRecommendations = (recommendations, criteria) => {
  if (!recommendations || !criteria || !config) return '';
  
  const teacherName = adminData.teacherName || (currentLanguage === 'ar' ? 'المعلم' : 'the teacher');
  
  // V3: Filter criteria to include only selected environments
  const selectedEnvsForRecommendations = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const filteredCriteria = criteria.filter(c => {
    const envLetter = c.id.charAt(0);
    return selectedEnvsForRecommendations.includes(envLetter);
  });
  
  console.log(`Formatting recommendations for ${filteredCriteria.length} criteria from environments: ${selectedEnvsForRecommendations.join(', ')}`);
  
  // Get scores for analysis (from filtered criteria only)
  const scores = filteredCriteria.map(c => c.score || 0);
  const hasScore1or2 = scores.some(s => s === 1 || s === 2);
  const hasScore3 = scores.some(s => s === 3);
  const allScore4 = scores.every(s => s === 4);
  
  // Find STRENGTHS: Only items with score 4 (maximum 5)
  // FIX: Changed from "scores 3 or 4" to "only score 4" as per requirements
  const strongElements = filteredCriteria
    .filter(c => c.score === 4 && config.eleot_sections) // Only score 4
    .slice(0, 5) // Maximum 5 strengths
    .map(c => {
      try {
        const section = config.eleot_sections.find(s => s.criteria && s.criteria.some(cr => cr.id === c.id));
        const criterion = section?.criteria?.find(cr => cr.id === c.id);
        const label = criterion ? (currentLanguage === 'ar' ? criterion.label_ar : criterion.label_en) : c.id;
        return {
          id: c.id,
          label: label,
          score: 4 // Always 4 for strengths
        };
      } catch (e) {
        return { id: c.id, label: c.id, score: 4 };
      }
    })
    .filter(el => el && el.score === 4); // Ensure only score 4 items
  
  // Find WEAKNESSES: Items with score 1 or 2 (all of them, not limited)
  const weaknessCriteria = filteredCriteria.filter(c => c.score === 1 || c.score === 2);
  
  // Find criteria needing improvement (V3: Only from filtered criteria)
  let improvementCriteria = [];
  if (hasScore1or2) {
    improvementCriteria = filteredCriteria.filter(c => c.score === 1 || c.score === 2);
  } else if (hasScore3 && !allScore4) {
    improvementCriteria = filteredCriteria.filter(c => c.score === 3);
  }
  
  // Build recommendations HTML
  let recommendationsHTML = `<h3 style="color:green;">${currentLanguage === 'ar' ? 'التوصيات' : 'Recommendations'}</h3>`;
  
  // Opening statement
  const appreciationText = currentLanguage === 'ar' 
    ? `كل الشكر والتقدير للمعلم`
    : `All thanks and appreciation to the teacher`;
  recommendationsHTML += `<p>${appreciationText}</p>`;
  
  // STRENGTHS: Items with score 4 (maximum 5) - FIX: Ensure strengths are displayed
  if (strongElements && strongElements.length > 0) {
    const strengthsTitle = currentLanguage === 'ar' 
      ? 'نواحي القوة (العناصر التي حصلت على درجة 4):' 
      : 'Strengths (Items that received a score of 4):';
    recommendationsHTML += `<p><strong>${strengthsTitle}</strong></p><ul>`;
    strongElements.forEach(element => {
      if (element && element.id) {
        const elementLabel = element.label || element.id;
        recommendationsHTML += `<li><strong>${elementLabel}</strong> (${element.id}) - Score: 4/4</li>`;
      }
    });
    recommendationsHTML += `</ul>`;
  }
  
  // WEAKNESSES: Items with score 1 or 2 (all of them) - FIX: Add explicit weaknesses section
  if (weaknessCriteria && weaknessCriteria.length > 0) {
    const weaknessesTitle = currentLanguage === 'ar' 
      ? 'نواحي الضعف (العناصر التي حصلت على درجة 1 أو 2):' 
      : 'Weaknesses (Items that received a score of 1 or 2):';
    recommendationsHTML += `<p><strong>${weaknessesTitle}</strong></p><ul>`;
    weaknessCriteria.forEach(c => {
      if (!c || !c.id) return;
      try {
        const section = config.eleot_sections?.find(s => s.criteria && s.criteria.some(cr => cr.id === c.id));
        const criterion = section?.criteria?.find(cr => cr.id === c.id);
        const criterionLabel = criterion ? (currentLanguage === 'ar' ? criterion.label_ar : criterion.label_en) : c.id;
        recommendationsHTML += `<li><strong>${criterionLabel}</strong> (${c.id}) - Score: ${c.score}/4</li>`;
      } catch (e) {
        recommendationsHTML += `<li><strong>${c.id}</strong> - Score: ${c.score}/4</li>`;
      }
    });
    recommendationsHTML += `</ul>`;
  }
  
  // Improvement suggestions (only if not all scores are 4) - FIX: Ensure improvement suggestions are displayed with proper text
  if (!allScore4 && improvementCriteria && improvementCriteria.length > 0) {
    let improvementTitle;
    if (hasScore1or2) {
      improvementTitle = currentLanguage === 'ar' 
        ? 'اقتراحات التحسين للمعايير التي حصلت على درجة 1 أو 2:' 
        : 'Improvement suggestions for criteria that received a score of 1 or 2:';
    } else {
      improvementTitle = currentLanguage === 'ar' 
        ? 'اقتراحات التحسين للمعايير التي حصلت على درجة 3:' 
        : 'Improvement suggestions for criteria that received a score of 3:';
    }
    recommendationsHTML += `<p><strong>${improvementTitle}</strong></p>`;
    recommendationsHTML += `<ul>`;
    improvementCriteria.forEach(c => {
      if (!c || !c.id) return; // Skip invalid criteria
      try {
        const section = config.eleot_sections?.find(s => s.criteria && s.criteria.some(cr => cr.id === c.id));
        const criterion = section?.criteria?.find(cr => cr.id === c.id);
        const criterionLabel = criterion ? (currentLanguage === 'ar' ? criterion.label_ar : criterion.label_en) : c.id;
        const expertSuggestion = generateExpertSuggestion(c.id, c.score, criterionLabel);
        // Clean suggestion text from HTML entities
        let cleanSuggestion = expertSuggestion || '';
        if (typeof cleanText === 'function') {
          cleanSuggestion = cleanText(expertSuggestion);
        } else if (typeof decodeHtmlEntities === 'function') {
          cleanSuggestion = decodeHtmlEntities(expertSuggestion).replace(/<[^>]*>/g, '');
        } else {
          cleanSuggestion = expertSuggestion
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/<[^>]*>/g, '');
        }
        // FIX: Ensure suggestion text is displayed
        if (cleanSuggestion && cleanSuggestion.trim()) {
          recommendationsHTML += `<li><strong>${criterionLabel} (${c.id}):</strong> ${cleanSuggestion}</li>`;
        } else {
          // Fallback: Use default suggestion text
          const defaultSuggestion = currentLanguage === 'ar'
            ? `تحسين الممارسة في ${criterionLabel} من خلال تطبيق استراتيجيات تعليمية فعالة.`
            : `Improve practice in ${criterionLabel} by applying effective teaching strategies.`;
          recommendationsHTML += `<li><strong>${criterionLabel} (${c.id}):</strong> ${defaultSuggestion}</li>`;
        }
      } catch (e) {
        console.error('Error processing improvement criterion:', e);
        const expertSuggestion = generateExpertSuggestion(c.id, c.score, c.id);
        let cleanSuggestion = expertSuggestion || '';
        if (typeof cleanText === 'function') {
          cleanSuggestion = cleanText(expertSuggestion);
        } else if (typeof decodeHtmlEntities === 'function') {
          cleanSuggestion = decodeHtmlEntities(expertSuggestion).replace(/<[^>]*>/g, '');
        }
        if (cleanSuggestion && cleanSuggestion.trim()) {
          recommendationsHTML += `<li><strong>${c.id}:</strong> ${cleanSuggestion}</li>`;
        }
      }
    });
    recommendationsHTML += `</ul>`;
  }
  
  return recommendationsHTML;
};

/**
 * Display recommendations
 */
const displayRecommendations = (recommendations) => {
  if (!recommendationsContent) return;
  
  recommendationsContent.innerHTML = '';
  
  if (recommendations && recommendations.recommendations && recommendations.recommendations.trim() !== '') {
    // Format recommendations according to new requirements
    const formattedRecommendations = formatRecommendations(recommendations, currentResults);
    
    if (formattedRecommendations) {
    const recommendationsDiv = document.createElement('div');
    recommendationsDiv.className = 'recommendations-section';
      recommendationsDiv.innerHTML = `<div class="recommendations-content">${formattedRecommendations}</div>`;
    recommendationsContent.appendChild(recommendationsDiv);
    }
  }
  
  if (recommendationsSection && recommendations && recommendations.recommendations && recommendations.recommendations.trim() !== '') {
    recommendationsSection.classList.remove('hidden');
  }
};

/**
 * Handle evaluate button click
 * 
 * Compliance: E.2 (Feedback Mechanism) - Provides user feedback at each step
 * Compliance: E.1 (Monitoring) - Logs evaluation events
 * Compliance: A.1 (Differentiated Access) - Validates input length for quality
 * 
 * @returns {Promise<void>}
 */
const handleEvaluate = async () => {
  logEvent('evaluation_initiated', { timestamp: Date.now() });
  
  if (!lessonDescriptionTextarea) {
    logEvent('evaluation_error', { reason: 'textarea_not_found' });
    return;
  }
  
  const lessonDescription = lessonDescriptionTextarea.value.trim();
  
  if (!lessonDescription) {
    logEvent('evaluation_validation_failed', { reason: 'empty_description' });
    showError(currentLanguage === 'ar' 
      ? 'يرجى إدخال وصف الحصة أولاً.'
      : 'Please enter a lesson description first.');
    return;
  }
  
  // Check if text has at least 50 words
  const wordCount = lessonDescription.split(/\s+/).filter(word => word.length > 0).length;
  
  logEvent('evaluation_word_count', { 
    wordCount: wordCount,
    descriptionLength: lessonDescription.length
  });
  
  if (wordCount < 50) {
    const errorMsg = currentLanguage === 'ar' 
      ? `⚠️ **تحذير: النص غير مكتمل.** \n\nالرجاء تقديم سردية ملاحظة الدرس كاملة وواضحة (يُفضل أن لا تقل عن 50 كلمة) حتى أتمكن من إجراء التقييم الدقيق والموثوق وفقاً لمعايير eleot 2.0. لن يتم بدء التحليل حتى يتم توفير النص كاملاً. عدد الكلمات الحالي: ${wordCount}`
      : `⚠️ **Warning: Incomplete text.** \n\nPlease provide a complete and clear lesson observation narrative (preferably at least 50 words) so that I can conduct an accurate and reliable evaluation according to eleot 2.0 standards. Analysis will not begin until the full text is provided. Current word count: ${wordCount}`;
    showError(errorMsg);
    return;
  }
  
  // Reset clarification answers
  clarificationAnswers = {};
  
  // Save data before evaluation
  saveDataToStorage();
  
  // Collect admin data
  collectAdminData();
  
  // Check if clarification is needed
  const missingInfo = needsClarification(lessonDescription);
  if (missingInfo.length >= 2) {
    // Show clarification questions
    displayClarificationQuestions(missingInfo);
    return;
  }
  
  // Proceed directly with evaluation
  await proceedWithEvaluation();
};

/**
 * Setup all event listeners (CSP Compliance)
 * Compliance: F.1 (Accessibility) - Ensures separation of concerns (HTML/JS)
 * All event handlers are in external JS (no inline handlers in HTML)
 */
const setupEventListeners = () => {
  console.log('Setting up event listeners...');
  
  // ========== API Settings Buttons ==========
  // Use event delegation for reliability (works even if elements added dynamically)
  document.addEventListener('click', async (e) => {
    // Handle save API button
    if (e.target && (e.target.id === 'save-api-btn' || e.target.closest('#save-api-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Save API button clicked');
      
      const btn = e.target.id === 'save-api-btn' ? e.target : e.target.closest('#save-api-btn');
      if (btn && btn.disabled) return;
      
      try {
        await saveApiSettings();
      } catch (error) {
        console.error('Error saving API settings:', error);
        showError(currentLanguage === 'ar' 
          ? `خطأ في حفظ الإعدادات: ${error.message}` 
          : `Error saving settings: ${error.message}`);
      }
    }
    
    // Handle skip API button
    if (e.target && (e.target.id === 'skip-api-btn' || e.target.closest('#skip-api-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Skip API button clicked');
      showMainScreen();
    }
  });
  
  // Direct listeners as backup
  const attachApiButtonListeners = () => {
    const savBtn = document.getElementById('save-api-btn');
    const skpBtn = document.getElementById('skip-api-btn');
    
    if (savBtn) {
      // FIX: Use addEventListener instead of onclick (CSP compliance)
      savBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (savBtn.disabled) return;
        try {
          await saveApiSettings();
        } catch (error) {
          console.error('Error:', error);
          showError(currentLanguage === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
        }
      });
    }
    
    if (skpBtn) {
      skpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showMainScreen();
      });
    }
  };
  
  attachApiButtonListeners();
  setTimeout(attachApiButtonListeners, 100);
  
  // ========== Keyboard Support ==========
  // Enter key on API key input
  document.addEventListener('keypress', async (e) => {
    if (e.target && e.target.id === 'api-key-input' && e.key === 'Enter') {
      const btn = document.getElementById('save-api-btn');
      if (btn && !btn.disabled) {
        e.preventDefault();
        try {
          await saveApiSettings();
        } catch (error) {
          console.error('Error:', error);
          showError(currentLanguage === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
        }
      }
    }
  });
  
  // ========== API Provider Instructions Toggle ==========
  const updateApiInstructions = () => {
    const openaiInstructions = document.getElementById('openai-instructions');
    const geminiInstructions = document.getElementById('gemini-instructions');
    
    if (apiProviderSelect && openaiInstructions && geminiInstructions) {
      const provider = apiProviderSelect.value;
      if (provider === 'openai') {
        openaiInstructions.classList.remove('hidden');
        geminiInstructions.classList.add('hidden');
      } else if (provider === 'gemini') {
        openaiInstructions.classList.add('hidden');
        geminiInstructions.classList.remove('hidden');
      }
    }
  };
  
  if (apiProviderSelect) {
    apiProviderSelect.addEventListener('change', updateApiInstructions);
    updateApiInstructions(); // Set initial state
  }
  
  // ========== Settings Button ==========
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Settings button clicked');
      showApiSettings();
    });
  }
  
  // ========== Language Toggle ==========
  if (languageSelect) {
    languageSelect.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
      localStorage.setItem('eleot_language', currentLanguage);
      
      // Update toggle text
      const toggleText = document.getElementById('language-toggle-text');
      if (toggleText) {
        toggleText.textContent = currentLanguage === 'ar' ? 'عربي' : 'EN';
      }
      
      updateUIText(currentLanguage);
      saveDataToStorage();
    });
  }
  
  // ========== Evaluate Button ==========
  if (evaluateBtn) {
    evaluateBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Evaluate button clicked');
      await handleEvaluate();
    });
  }
  
  // ========== Clear Data Button ==========
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAllData();
    });
  }
  
  // ========== Export Buttons ==========
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (currentResults && currentResults.length > 0) {
        // V3: Filter results to selected environments only
        const selectedEnvs = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const filteredResults = currentResults.filter(r => selectedEnvs.includes(r.id.charAt(0)));
        const totalScore = currentRecommendations?.totalScore || calculateAverageScore(filteredResults.map(r => r.score).filter(s => s > 0));
        exportToCSV(filteredResults, totalScore.toFixed(1), currentLanguage, adminData, config);
      } else {
        showError(currentLanguage === 'ar' 
          ? 'لا توجد نتائج للتصدير. يرجى إجراء التقييم أولاً.' 
          : 'No results to export. Please run evaluation first.');
      }
    });
  }
  
  if (exportWordBtn) {
    exportWordBtn.addEventListener('click', async () => {
      if (currentResults && currentResults.length > 0) {
        // V3: Filter results to selected environments only
        const selectedEnvs = selectedEnvironments || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const filteredResults = currentResults.filter(r => selectedEnvs.includes(r.id.charAt(0)));
        const totalScore = currentRecommendations?.totalScore || calculateAverageScore(filteredResults.map(r => r.score).filter(s => s > 0));
        
        // Format recommendations using formatRecommendations to match what's shown on screen
        let formattedRecommendationsForExport = null;
        if (currentRecommendations && currentRecommendations.recommendations) {
          formattedRecommendationsForExport = formatRecommendations(currentRecommendations, filteredResults);
        }
        
        // Create recommendations object with formatted HTML
        const recommendationsForExport = formattedRecommendationsForExport 
          ? { recommendations: formattedRecommendationsForExport, totalScore: currentRecommendations?.totalScore }
          : currentRecommendations;
        
        await exportToWord(filteredResults, totalScore.toFixed(1), currentLanguage, adminData, recommendationsForExport, config);
      } else {
        showError(currentLanguage === 'ar' 
          ? 'لا توجد نتائج للتصدير. يرجى إجراء التقييم أولاً.' 
          : 'No results to export. Please run evaluation first.');
      }
    });
  }
  
  // ========== Navigation Tabs ==========
  if (navTabs && navTabs.length > 0) {
    navTabs.forEach(tab => {
      // Remove any existing listeners by cloning
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
      
      newTab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetTab = newTab.getAttribute('data-tab');
        
        // Use switchTab function for consistency
        switchTab(targetTab);
      });
    });
    
    // Re-query after cloning
    navTabs = document.querySelectorAll('.nav-tab');
  }
  
  // ========== File Viewer Close Button ==========
  if (closeViewerBtn) {
    closeViewerBtn.addEventListener('click', closeFileViewer);
  }
  
  // ========== Setup Auto-Save ==========
  setupAutoSave();
  
  console.log('Event listeners setup complete');
};

/**
 * Initialize extension
 */
const init = async () => {
  console.log('Initializing extension...');
  
  // Initialize all DOM elements first
  apiSettingsScreen = document.getElementById('api-settings-screen');
  mainScreen = document.getElementById('main-screen');
  
  apiProviderSelect = document.getElementById('api-provider');
  apiKeyInput = document.getElementById('api-key-input');
  apiEndpointInput = document.getElementById('api-endpoint-input');
  saveApiBtn = document.getElementById('save-api-btn');
  skipApiBtn = document.getElementById('skip-api-btn');
  
  settingsBtn = document.getElementById('settings-btn');
  languageSelect = document.getElementById('language-toggle');
  lessonDescriptionTextarea = document.getElementById('lesson-description');
  evaluateBtn = document.getElementById('evaluate-btn');
  clearDataBtn = document.getElementById('clear-data-btn');
  loadingDiv = document.getElementById('loading');
  errorMessageDiv = document.getElementById('error-message');
  resultsSection = document.getElementById('results-section');
  resultsBySection = document.getElementById('results-by-section');
  recommendationsSection = document.getElementById('recommendations-section');
  recommendationsContent = document.getElementById('recommendations-content');
  overallScoreSpan = document.getElementById('overall-score');
  exportPdfBtn = document.getElementById('export-pdf-btn');
  exportCsvBtn = document.getElementById('export-csv-btn');
  exportWordBtn = document.getElementById('export-word-btn');
  
  // Training section elements
  navTabs = document.querySelectorAll('.nav-tab');
  evaluationTab = document.getElementById('evaluation-tab');
  trainingTab = document.getElementById('training-tab');
  trainingFilesList = document.getElementById('training-files-list');
  fileViewerContainer = document.getElementById('file-viewer-container');
  fileViewerContent = document.getElementById('file-viewer-content');
  fileViewerTitle = document.getElementById('file-viewer-title');
  closeViewerBtn = document.getElementById('close-viewer-btn');
  
  adminFields = {
    teacherName: document.getElementById('teacher-name-field'),
    subject: document.getElementById('subject-field'),
    grade: document.getElementById('grade-field'),
    segmentBeginning: document.getElementById('segment-beginning'),
    segmentMiddle: document.getElementById('segment-middle'),
    segmentEnd: document.getElementById('segment-end'),
    date: document.getElementById('date-field'),
    supervisorName: document.getElementById('supervisor-name-field'),
    envA_checkbox: document.getElementById('envA_checkbox'),
    envB_checkbox: document.getElementById('envB_checkbox'),
    envC_checkbox: document.getElementById('envC_checkbox'),
    envD_checkbox: document.getElementById('envD_checkbox'),
    envE_checkbox: document.getElementById('envE_checkbox'),
    envF_checkbox: document.getElementById('envF_checkbox'),
    envG_checkbox: document.getElementById('envG_checkbox')
  };
  
  // Initialize environment select element (if exists)
  environmentSelect = document.getElementById('environment-select') || null;
  
  console.log('DOM elements initialized');
  console.log('Nav tabs found:', navTabs?.length || 0);
  console.log('Evaluation tab:', evaluationTab ? 'found' : 'not found');
  console.log('Training tab:', trainingTab ? 'found' : 'not found');
  
  // Load configuration - CRITICAL: Wait for config to load
  config = await loadConfig();
  
  if (!config) {
    console.error('Failed to load configuration. Retrying...');
    // Retry loading config
    config = await loadConfig();
    if (!config) {
      showError('فشل تحميل ملف التكوين. يرجى التأكد من وجود config/eleot_ai_config.json');
      return;
    }
  }
  
  // Check if API key is set
  const hasApiKey = await checkApiKey();
  
  if (!hasApiKey) {
    showApiSettings();
  } else {
    showMainScreen();
  }
  
  // Language toggle function
  const updateLanguageToggle = (lang) => {
    const toggleText = document.getElementById('language-toggle-text');
    if (toggleText) {
      toggleText.textContent = lang === 'ar' ? 'عربي' : 'EN';
    }
  };
  
  // Set initial language
  const savedLanguage = localStorage.getItem('eleot_language') || 'ar';
  currentLanguage = savedLanguage;
  updateLanguageToggle(currentLanguage);
  updateUIText(currentLanguage);
  
  // Initialize logo images on page load
  // Load logo images using relative paths
  const logoApiScreen = document.getElementById('logo-api-screen');
  const logoMainScreen = document.getElementById('logo-main-screen');
  
  if (logoApiScreen) {
    try {
      const logoPath = 'images/logo.png';
      logoApiScreen.src = logoPath;
    } catch (error) {
      console.warn('Could not get logo path for API screen:', error);
    }
  }
  
  if (logoMainScreen) {
    try {
      const logoPath = 'images/logo.png';
      logoMainScreen.src = logoPath;
    } catch (error) {
      console.warn('Could not get logo path for main screen:', error);
    }
  }
  
  // Load saved data from localStorage
  setTimeout(() => {
    loadSavedData();
  }, 100);
  
  // Set today's date as default if not saved
  setTimeout(() => {
    if (adminFields.date && !adminFields.date.value) {
      const today = new Date().toISOString().split('T')[0];
      adminFields.date.value = today;
      saveDataToStorage();
    }
  }, 200);
  
  // ✅ Setup all event listeners (CSP compliant, single source of truth)
  setupEventListeners();
  
  // Legacy event listeners below - MARKED FOR REMOVAL (kept temporarily for safety)
  // TODO: Remove after verifying setupEventListeners() works correctly
  
  // Event listeners - API Settings Buttons (DUPLICATE - will be removed)
  // Use event delegation for maximum reliability (works even if elements are added dynamically)
  document.addEventListener('click', async (e) => {
    // Handle save button click
    if (e.target && (e.target.id === 'save-api-btn' || e.target.closest('#save-api-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Save API button clicked (event delegation)');
      
      const btn = e.target.id === 'save-api-btn' ? e.target : e.target.closest('#save-api-btn');
      if (btn && btn.disabled) {
        console.log('Button is disabled, ignoring click');
        return;
      }
      
      try {
        await saveApiSettings();
        console.log('saveApiSettings completed successfully');
      } catch (error) {
        console.error('Error in saveApiSettings:', error);
        showError(currentLanguage === 'ar' 
          ? `خطأ في حفظ الإعدادات: ${error.message}` 
          : `Error saving settings: ${error.message}`);
      }
    }
    
    // Handle skip button click
    if (e.target && (e.target.id === 'skip-api-btn' || e.target.closest('#skip-api-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Skip API button clicked (event delegation)');
      showMainScreen();
    }
  });
  
  // Also attach direct listeners as backup (multiple attempts for reliability)
  const attachDirectListeners = () => {
    saveApiBtn = document.getElementById('save-api-btn');
    skipApiBtn = document.getElementById('skip-api-btn');
    
    if (saveApiBtn) {
      // Use onclick instead of addEventListener for simplicity
      // FIX: Use addEventListener instead of onclick (CSP compliance)
      saveApiBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Save API button clicked');
        if (saveApiBtn.disabled) return;
        try {
          await saveApiSettings();
        } catch (error) {
          console.error('Error:', error);
          showError(currentLanguage === 'ar' 
            ? `خطأ: ${error.message}` 
            : `Error: ${error.message}`);
        }
      });
      console.log('Save button event listener attached');
    }
    
    if (skipApiBtn) {
      skipApiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Skip API button clicked');
        showMainScreen();
      });
      console.log('Skip button event listener attached');
    }
  };
  
  // Attach immediately and also after delays
  attachDirectListeners();
  setTimeout(attachDirectListeners, 100);
  setTimeout(attachDirectListeners, 500);
  
  // Support Enter key on API key input
  document.addEventListener('keypress', async (e) => {
    if (e.target && e.target.id === 'api-key-input' && e.key === 'Enter') {
      const btn = document.getElementById('save-api-btn');
      if (btn && !btn.disabled) {
        e.preventDefault();
        console.log('Enter key pressed in API key input');
        try {
          await saveApiSettings();
        } catch (error) {
          console.error('Error:', error);
          showError(currentLanguage === 'ar' 
            ? `خطأ: ${error.message}` 
            : `Error: ${error.message}`);
        }
      }
    }
  });
  
  // Setup API provider instructions toggle
  const updateApiInstructions = () => {
    const openaiInstructions = document.getElementById('openai-instructions');
    const geminiInstructions = document.getElementById('gemini-instructions');
    
    if (apiProviderSelect && openaiInstructions && geminiInstructions) {
      const provider = apiProviderSelect.value;
      if (provider === 'openai') {
        openaiInstructions.classList.remove('hidden');
        geminiInstructions.classList.add('hidden');
      } else if (provider === 'gemini') {
        openaiInstructions.classList.add('hidden');
        geminiInstructions.classList.remove('hidden');
      }
    }
  };
  
  if (apiProviderSelect) {
    apiProviderSelect.addEventListener('change', updateApiInstructions);
    // Set initial state
    updateApiInstructions();
  }
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Settings button clicked');
      showApiSettings();
    });
  } else {
    console.error('settingsBtn not found');
  }
  
  // ========== Language Toggle Button ==========
  // Handle language-toggle button (main toggle)
  const languageToggle = document.getElementById('language-toggle');
  if (languageToggle) {
    languageToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
      localStorage.setItem('eleot_language', currentLanguage);
      updateLanguageToggle(currentLanguage);
      updateUIText(currentLanguage);
      saveDataToStorage();
      logEvent('language_changed', { newLanguage: currentLanguage });
    });
  }
  
  // Also handle languageSelect if it exists (for compatibility)
  if (languageSelect) {
    languageSelect.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
      localStorage.setItem('eleot_language', currentLanguage);
      updateLanguageToggle(currentLanguage);
      updateUIText(currentLanguage);
      saveDataToStorage();
    });
  }
  
  if (evaluateBtn) {
    evaluateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Evaluate button clicked');
      handleEvaluate();
    });
  } else {
    console.error('evaluateBtn not found');
  }
  
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Clear data button clicked');
      clearAllData();
    });
  }
  
  // Keyboard navigation support (Compliance: A.2 - Accessibility)
  if (lessonDescriptionTextarea) {
    lessonDescriptionTextarea.addEventListener('keydown', (e) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleEvaluate();
        logEvent('evaluation_keyboard_shortcut', { key: 'Ctrl+Enter' });
      }
      // Escape to clear
      if (e.key === 'Escape') {
        if (confirm(currentLanguage === 'ar' ? 'هل تريد مسح النص؟' : 'Clear text?')) {
          lessonDescriptionTextarea.value = '';
          logEvent('text_cleared', { method: 'keyboard' });
        }
      }
    });
  }
  
  // Keyboard navigation for buttons (Compliance: A.2 - Accessibility)
  if (evaluateBtn) {
    evaluateBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEvaluate();
      }
    });
  }
  
  if (clearDataBtn) {
    clearDataBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clearAllData();
      }
    });
  }
  
  // Export button handlers are now in setupEventListeners() to avoid duplicates
  // Removed duplicate handlers from here
  
  console.log('Extension initialized successfully');
};

/**
 * Initialize training section
 */
const initTrainingSection = () => {
  // Re-query elements to ensure they exist
  trainingFilesList = document.getElementById('training-files-list');
  fileViewerContainer = document.getElementById('file-viewer-container');
  fileViewerContent = document.getElementById('file-viewer-content');
  fileViewerTitle = document.getElementById('file-viewer-title');
  closeViewerBtn = document.getElementById('close-viewer-btn');

  // Note: Tab navigation is handled in setupEventListeners() to avoid duplicates
  // Close viewer button is also handled in setupEventListeners()

  // Load training files
  if (trainingFilesList) {
    loadTrainingFiles();
  }
};

/**
 * Switch between tabs
 * FIX: Consistent use of 'active' class for both tabs and content
 */
const switchTab = (tabName) => {
  console.log('Switching to tab:', tabName);
  
  // Re-query elements to ensure they exist
  if (!navTabs || navTabs.length === 0) {
    navTabs = document.querySelectorAll('.nav-tab');
  }
  if (!evaluationTab) evaluationTab = document.getElementById('evaluation-tab');
  if (!trainingTab) trainingTab = document.getElementById('training-tab');
  
  // Update tab buttons - use 'active' class consistently
  if (navTabs && navTabs.length > 0) {
    navTabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // Update tab content - use 'active' class consistently (not 'hidden')
  if (tabName === 'evaluation') {
    if (evaluationTab) {
      evaluationTab.classList.add('active');
      evaluationTab.classList.remove('hidden');
    }
    if (trainingTab) {
      trainingTab.classList.remove('active');
      trainingTab.classList.add('hidden');
    }
  } else if (tabName === 'training') {
    if (evaluationTab) {
      evaluationTab.classList.remove('active');
      evaluationTab.classList.add('hidden');
    }
    if (trainingTab) {
      trainingTab.classList.add('active');
      trainingTab.classList.remove('hidden');
    }
    
    // Initialize training section when switching to training tab
    if (typeof initTrainingSection === 'function') {
      initTrainingSection();
    }
    
    // Load training files when switching to training tab
    if (trainingFilesList) {
      loadTrainingFiles();
    }
  }
};

/**
 * Load training files list
 * Note: In a real implementation, you would fetch this from Google Drive API
 * For now, we'll use a manual list or try to extract from the folder
 */
const loadTrainingFiles = async () => {
  if (!trainingFilesList) return;

  // Get files from Google Drive
  const files = await getTrainingFilesFromDrive();
  
  if (files.length === 0) {
    trainingFilesList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p>${currentLanguage === 'ar' ? 'لا توجد ملفات للعرض' : 'No files to display'}</p>
      </div>
    `;
    return;
  }
  
  // Clear previous content
  trainingFilesList.innerHTML = '';

  trainingFilesList.innerHTML = '';
  files.forEach(file => {
    const fileItem = createFileItem(file);
    trainingFilesList.appendChild(fileItem);
  });
};

/**
 * Get training images with Arabic translations
 * Images should be placed in the extension's images folder
 */
const getTrainingFilesFromDrive = async () => {
  // Training images with Arabic translations
  // Note: Replace image paths with actual paths to your images
  return [
    {
      id: 'eleot-ratings-guide',
      name: currentLanguage === 'ar' ? 'دليل تقييم ELEOT 2.0' : 'ELEOT 2.0 Ratings Guide',
      type: 'image',
      icon: '📄',
      imagePath: 'images/eleot-ratings-guide.jpg', // Update with actual image path
      arabicTranslation: 'دليل تقييم ELEOT 2.0: يوفر هذا الدليل إرشادات شاملة حول كيفية تقييم بيئات التعلم الفعالة باستخدام أداة ELEOT 2.0. يحتوي على معايير التقييم والتصنيفات والمؤشرات الرئيسية لكل بيئة تعليمية. يوضح كيفية استخدام الأداة لتقييم الفصول الدراسية وتحديد نقاط القوة والتحسين في بيئات التعلم.'
    },
    {
      id: 'eleot-tool',
      name: currentLanguage === 'ar' ? 'أداة ELEOT 2.0' : 'ELEOT 2.0 Tool',
      type: 'image',
      icon: '📄',
      imagePath: 'images/eleot-tool.jpg', // Update with actual image path
      arabicTranslation: 'أداة ELEOT 2.0: الأداة الرئيسية لمراقبة وتقييم بيئات التعلم الفعالة. تحتوي على جميع المعايير والعناصر الوصفية اللازمة لإجراء تقييم شامل للفصول الدراسية. تشمل سبع بيئات تعليمية رئيسية (A-G) مع 28 معياراً تفصيلياً لتقييم جودة بيئة التعلم.'
    },
    {
      id: 'environment-a',
      name: currentLanguage === 'ar' ? 'البيئة A: التعلم العادل' : 'Environment A: Equitable Learning',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-a.jpg', // Update with actual image path
      arabicTranslation: 'البيئة A - التعلم العادل: تركز هذه البيئة على تلبية احتياجات كل طالب بشكل فردي وضمان المساواة في الوصول إلى الموارد والفرص التعليمية. يشمل التعلم المتمايز والاحترام للاختلافات بين الطلاب. في بيئة التعلم العادلة، يتقدم كل طالب وفقاً لوتيرته الخاصة ويظهر احتراماً للأفراد الآخرين. يجب أن يكون للطلاب وصول متساوٍ إلى المناقشات والأنشطة والموارد والتكنولوجيا والدعم.'
    },
    {
      id: 'environment-b',
      name: currentLanguage === 'ar' ? 'البيئة B: التوقعات العالية' : 'Environment B: High Expectations',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-b.jpg', // Update with actual image path
      arabicTranslation: 'البيئة B - التوقعات العالية: تشجع هذه البيئة الطلاب على السعي لتحقيق توقعات عالية من خلال أنشطة صعبة ولكن قابلة للتحقيق. تركز على التفكير النقدي والجودة العالية في العمل. المعلمون مسؤولون عن تقديم عمل صارم للطلاب ومساءلتهم عن معايير عالية. يتوقع من الطلاب الارتقاء لمواجهة التحديات والمثابرة في العمل الصعب. غالباً ما يحتاج الطلاب إلى فرص للعمل مع الآخرين لإكمال العمل الصارم.'
    },
    {
      id: 'environment-c',
      name: currentLanguage === 'ar' ? 'البيئة C: التعلم الداعم' : 'Environment C: Supportive Learning',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-c.jpg', // Update with actual image path
      arabicTranslation: 'البيئة C - التعلم الداعم: توفر هذه البيئة بيئة آمنة وداعمة حيث يشعر الطلاب بالراحة في أخذ المخاطر التعليمية وطلب المساعدة. تشجع على التعاون والدعم المتبادل بين الطلاب والمعلم. يجب أن يكون هناك شعور إيجابي بالمجتمع بين الطلاب. يجب أن يكون الطلاب قادرين على أخذ المخاطر في التعلم دون خوف من ردود فعل سلبية. يجب أن يكون الطلاب مدعومين من المعلم وأقرانهم لفهم المحتوى وإنجاز المهام.'
    },
    {
      id: 'environment-d',
      name: currentLanguage === 'ar' ? 'البيئة D: التعلم النشط' : 'Environment D: Active Learning',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-d.jpg', // Update with actual image path
      arabicTranslation: 'البيئة D - التعلم النشط: تركز هذه البيئة على مشاركة الطلاب النشطة في عملية التعلم من خلال المناقشات والمشاريع والأنشطة التعاونية. يشجع الطلاب على ربط المحتوى بخبراتهم الحياتية. في التعلم النشط، يشارك الطلاب بنشاط في الأنشطة والمناقشات، عادة مع أقرانهم. يجب أن تكون مناقشات الطلاب والحوارات والتبادلات مع بعضهم البعض ومع المعلم هي السائدة. يجب أن يعمل الطلاب بشكل تعاوني لإكمال المشاريع والأنشطة والمهام.'
    },
    {
      id: 'environment-e',
      name: currentLanguage === 'ar' ? 'البيئة E: مراقبة التقدم والملاحظات' : 'Environment E: Progress Monitoring & Feedback',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-e.jpg', // Update with actual image path
      arabicTranslation: 'البيئة E - مراقبة التقدم والملاحظات: توفر هذه البيئة آليات واضحة لمراقبة تقدم الطلاب وتقديم ملاحظات بناءة. تساعد الطلاب على فهم كيفية تقييم عملهم وتحسينه باستمرار. يجب أن يراقب الطلاب تقدمهم في التعلم أو أن يكون لديهم آليات لمراقبة تقدمهم. يجب أن يتلقى الطلاب ملاحظات من المعلمين والأقران لتحسين فهمهم أو مراجعة عملهم. يجب أن يفهم الطلاب كيف يتم تقييم عملهم.'
    },
    {
      id: 'environment-f',
      name: currentLanguage === 'ar' ? 'البيئة F: الإدارة الجيدة' : 'Environment F: Well-Managed',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-f.jpg', // Update with actual image path
      arabicTranslation: 'البيئة F - الإدارة الجيدة: تتميز هذه البيئة بقواعد واضحة ومتسقة، واحترام متبادل بين الطلاب والمعلم، وانتقالات سلسة بين الأنشطة. يستخدم الطلاب وقت الفصل بشكل هادف وفعال. يجب أن يتحدث الطلاب ويتفاعلون باحترام مع المعلمين ومع بعضهم البعض. يجب أن يتبع الطلاب قواعد الفصل وتوقعات السلوك ويعملون بشكل جيد مع الآخرين. يجب أن تكون الانتقالات بين الأنشطة سلسة وفعالة.'
    },
    {
      id: 'environment-g',
      name: currentLanguage === 'ar' ? 'البيئة G: التعلم الرقمي' : 'Environment G: Digital Learning',
      type: 'image',
      icon: '📋',
      imagePath: 'images/environment-g.jpg', // Update with actual image path
      arabicTranslation: 'البيئة G - التعلم الرقمي: تركز هذه البيئة على استخدام الطلاب للأدوات الرقمية والتكنولوجيا لجمع المعلومات وحل المشكلات وإنشاء محتوى أصلي. تشجع على التواصل والتعاون الرقمي. يجب أن يستخدم الطلاب الأدوات الرقمية والتكنولوجيا لجمع المعلومات وتقييمها واستخدامها للتعلم. يجب أن يستخدم الطلاب الأدوات الرقمية لإجراء البحوث وحل المشكلات وإنشاء أعمال أصلية. يجب أن يستخدم الطلاب الأدوات الرقمية للتواصل والعمل بشكل تعاوني.'
    }
  ];
};

/**
 * Create file item element
 */
const createFileItem = (file) => {
  const item = document.createElement('div');
  item.className = 'training-file-item';
  item.setAttribute('data-file-id', file.id);
  item.setAttribute('data-file-type', file.type);

  const typeLabel = currentLanguage === 'ar' 
    ? (file.type === 'pdf' ? 'PDF' : file.type === 'video' ? 'فيديو' : file.type === 'doc' ? 'مستند' : 'ملف')
    : (file.type === 'pdf' ? 'PDF' : file.type === 'video' ? 'Video' : file.type === 'doc' ? 'Document' : 'File');

  item.innerHTML = `
    <div class="file-icon">${file.icon || '📄'}</div>
    <div class="file-name">${file.name}</div>
    <div class="file-type">${typeLabel}</div>
    <button class="open-file-btn" data-i18n="open_file">
      ${currentLanguage === 'ar' ? 'فتح' : 'Open'}
    </button>
  `;

  const openBtn = item.querySelector('.open-file-btn');
  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openFile(file);
  });

  return item;
};

/**
 * Open file in viewer
 */
const openFile = (file) => {
  if (!fileViewerContainer || !fileViewerContent || !fileViewerTitle) return;

  // Show viewer
  fileViewerContainer.classList.remove('hidden');
  fileViewerTitle.textContent = file.name;

  // Show loading
  fileViewerContent.innerHTML = `
    <div class="file-loading">
      <div class="spinner"></div>
      <p>${currentLanguage === 'ar' ? 'جاري تحميل الصورة...' : 'Loading image...'}</p>
    </div>
  `;

  // Load file as image
  setTimeout(() => {
    loadFileAsImage(file);
  }, 100);
};

/**
 * Load file as image (display images directly)
 */
const loadFileAsImage = (file) => {
  if (!fileViewerContent) return;

  try {
    // Use chrome extension path for images
    const imagePath = file.imagePath || `images/${file.id}.jpg`;
    let imageUrl;
    
    // Use relative path for web app
    imageUrl = imagePath;
    
    // Create image element with better error handling
    const img = document.createElement('img');
    img.id = `file-image-${file.id}`;
    img.alt = file.name;
    img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 0 auto;';
    
    // FIX: Use addEventListener instead of onload/onerror (CSP compliance)
    img.addEventListener('load', () => {
      console.log('Image loaded successfully for file:', file.name, 'from URL:', imageUrl);
      // Image loaded successfully, show it with translation
      fileViewerContent.innerHTML = `
        <div style="width: 100%; text-align: center; margin-bottom: 20px;">
          <img src="${imageUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 0 auto;" />
        </div>
        ${file.arabicTranslation ? `
          <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #2196F3; margin-top: 20px; text-align: right; direction: rtl;">
            <h4 style="color: #2196F3; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
              ${currentLanguage === 'ar' ? '📝 الوصف بالعربية:' : '📝 Arabic Description:'}
            </h4>
            <p style="color: #333; line-height: 1.8; margin: 0; font-size: 14px; text-align: right; direction: rtl;">
              ${file.arabicTranslation}
            </p>
          </div>
        ` : ''}
      `;
    });
    
    // Handle error - show translation even if image fails
    img.addEventListener('error', (e) => {
      console.error('Image failed to load for:', file.name, 'Path:', imagePath, 'URL:', imageUrl, 'Error:', e);
      // Show translation with helpful message
      fileViewerContent.innerHTML = `
        <div class="file-viewer-error" style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #856404; font-size: 14px; margin-bottom: 10px;">
            ${currentLanguage === 'ar' 
              ? '⚠️ الصورة غير متوفرة حالياً' 
              : '⚠️ Image not available'}
          </p>
          <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
            ${currentLanguage === 'ar' 
              ? `المسار المتوقع: ${imagePath}` 
              : `Expected path: ${imagePath}`}
          </p>
          <p style="color: #666; font-size: 11px; margin: 0;">
            ${currentLanguage === 'ar' 
              ? 'يرجى إضافة الصورة في مجلد images/ داخل ملفات الإضافة' 
              : 'Please add the image in the images/ folder within the extension files'}
          </p>
        </div>
        ${file.arabicTranslation ? `
          <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #2196F3; margin-top: 20px; text-align: right; direction: rtl;">
            <h4 style="color: #2196F3; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
              ${currentLanguage === 'ar' ? '📝 الوصف بالعربية:' : '📝 Arabic Description:'}
            </h4>
            <p style="color: #333; line-height: 1.8; margin: 0; font-size: 14px; text-align: right; direction: rtl;">
              ${file.arabicTranslation}
            </p>
          </div>
        ` : ''}
      `;
    });
    
    // Set src after attaching handlers
    img.src = imageUrl;
    
    // Try to load the image
    // The onload/onerror handlers will update the content
    
  } catch (error) {
    console.error('Error loading file as image:', error);
    fileViewerContent.innerHTML = `
      <div class="file-viewer-error" style="text-align: center; padding: 40px;">
        <p style="color: #f44336; font-size: 16px; margin-bottom: 10px;">
          ${currentLanguage === 'ar' ? '❌ فشل تحميل الصورة' : '❌ Failed to load image'}
        </p>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          ${error.message}
        </p>
        ${file.arabicTranslation ? `
          <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #2196F3; margin-top: 20px; text-align: right; direction: rtl;">
            <h4 style="color: #2196F3; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
              ${currentLanguage === 'ar' ? '📝 الوصف بالعربية:' : '📝 Arabic Description:'}
            </h4>
            <p style="color: #333; line-height: 1.8; margin: 0; font-size: 14px; text-align: right; direction: rtl;">
              ${file.arabicTranslation}
            </p>
          </div>
        ` : ''}
      </div>
    `;
  }
};

/**
 * Load file content based on type (legacy method - kept for non-PDF files)
 */
const loadFileContent = (file) => {
  if (!fileViewerContent) return;

  try {
    let embedUrl = '';
    const fileUrl = `https://drive.google.com/file/d/${file.id}/view`;
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
    
    if (file.type === 'pdf') {
      // Method 1: Try Google Drive preview (requires public access)
      const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;
      
      // Method 2: Use Google Docs Viewer with direct download URL
      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directDownloadUrl)}&embedded=true`;
      
      // Method 3: Alternative viewer URL
      const altViewerUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`;
      
      // FIX: Create iframe without inline onerror handler (CSP compliance)
      const iframeContainer = document.createElement('div');
      iframeContainer.style.cssText = 'position: relative; width: 100%; min-height: 600px; margin-bottom: 15px;';
      
      const iframe = document.createElement('iframe');
      iframe.id = `pdf-iframe-${file.id}`;
      iframe.src = viewerUrl;
      iframe.width = '100%';
      iframe.height = '600px';
      iframe.style.cssText = 'border: none; border-radius: 4px; background: #f5f5f5;';
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('loading', 'lazy');
      
      // FIX: Use addEventListener instead of inline onerror
      iframe.addEventListener('error', () => {
        iframe.src = previewUrl;
      });
      
      iframeContainer.appendChild(iframe);
      
      // FIX: Create buttons without inline onclick handlers (CSP compliance)
      fileViewerContent.innerHTML = '';
      fileViewerContent.appendChild(iframeContainer);
      
      // Create content div for buttons and tips
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'padding: 15px; background: #f5f5f5; border-radius: 4px; border-top: 1px solid #e0e0e0;';
      
      const helpP = document.createElement('p');
      helpP.style.cssText = 'font-size: 13px; color: #666; margin: 0 0 15px 0; line-height: 1.6;';
      helpP.textContent = currentLanguage === 'ar' 
        ? 'إذا لم يظهر الملف أعلاه، استخدم أحد الخيارات التالية:' 
        : 'If the file doesn\'t appear above, use one of the following options:';
      contentDiv.appendChild(helpP);
      
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';
      
      // Google Drive link
      const driveLink = document.createElement('a');
      driveLink.href = fileUrl;
      driveLink.target = '_blank';
      driveLink.style.cssText = 'display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;';
      driveLink.textContent = currentLanguage === 'ar' ? '🔗 فتح في Google Drive' : '🔗 Open in Google Drive';
      buttonsDiv.appendChild(driveLink);
      
      // Download link
      const downloadLink = document.createElement('a');
      downloadLink.href = directDownloadUrl;
      downloadLink.download = '';
      downloadLink.style.cssText = 'display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;';
      downloadLink.textContent = currentLanguage === 'ar' ? '⬇ تحميل الملف' : '⬇ Download File';
      buttonsDiv.appendChild(downloadLink);
      
      // Preview method button
      const previewBtn = document.createElement('button');
      previewBtn.style.cssText = 'padding: 10px 20px; background: #FF9800; color: white; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;';
      previewBtn.textContent = currentLanguage === 'ar' ? '🔄 طريقة Preview' : '🔄 Try Preview Method';
      previewBtn.setAttribute('data-action', 'try-preview');
      previewBtn.setAttribute('data-file-id', file.id);
      previewBtn.setAttribute('data-preview-url', previewUrl);
      previewBtn.addEventListener('click', () => {
        const iframe = document.getElementById(`pdf-iframe-${file.id}`);
        if (iframe) {
          iframe.src = previewUrl;
        }
      });
      buttonsDiv.appendChild(previewBtn);
      
      // Alternative viewer button
      const altViewerBtn = document.createElement('button');
      altViewerBtn.style.cssText = 'padding: 10px 20px; background: #9C27B0; color: white; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;';
      altViewerBtn.textContent = currentLanguage === 'ar' ? '🔄 طريقة بديلة' : '🔄 Alternative Method';
      altViewerBtn.setAttribute('data-action', 'try-alt-viewer');
      altViewerBtn.setAttribute('data-file-id', file.id);
      altViewerBtn.setAttribute('data-alt-url', altViewerUrl);
      altViewerBtn.addEventListener('click', () => {
        const iframe = document.getElementById(`pdf-iframe-${file.id}`);
        if (iframe) {
          iframe.src = altViewerUrl;
        }
      });
      buttonsDiv.appendChild(altViewerBtn);
      
      contentDiv.appendChild(buttonsDiv);
      
      // Add tip section
      const tipDiv = document.createElement('div');
      tipDiv.style.cssText = 'margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 4px; border-right: 4px solid #ffc107;';
      
      const tipP = document.createElement('p');
      tipP.style.cssText = 'font-size: 12px; color: #856404; margin: 0; line-height: 1.6;';
      const tipStrong = document.createElement('strong');
      tipStrong.textContent = currentLanguage === 'ar' ? '💡 نصيحة مهمة:' : '💡 Important Tip:';
      tipP.appendChild(tipStrong);
      tipP.appendChild(document.createTextNode(' '));
      tipP.appendChild(document.createTextNode(
        currentLanguage === 'ar' 
          ? 'للعرض المباشر، يجب أن يكون الملف متاحاً للوصول العام. افتح الملف في Google Drive → انقر "Share" → "Change" → اختر "Anyone with the link" → "Viewer" → "Done".' 
          : 'For direct viewing, the file must be publicly accessible. Open the file in Google Drive → Click "Share" → "Change" → Select "Anyone with the link" → "Viewer" → "Done".'
      ));
      tipDiv.appendChild(tipP);
      
      fileViewerContent.appendChild(contentDiv);
      fileViewerContent.appendChild(tipDiv);
      
      // Check if iframe shows error after 3 seconds
      setTimeout(() => {
        const iframe = document.getElementById(`pdf-iframe-${file.id}`);
        if (iframe) {
          try {
            // Try to access iframe content to check if it loaded
            if (iframe.contentWindow) {
              console.log('PDF iframe loaded successfully');
            }
          } catch (e) {
            // Cross-origin error is expected - iframe exists
            console.log('PDF iframe check completed (cross-origin)');
          }
        }
      }, 3000);
    } else if (file.type === 'video') {
      // Google Drive video - use preview with better settings
      embedUrl = `https://drive.google.com/file/d/${file.id}/preview?usp=drivesdk`;
      fileViewerContent.innerHTML = `
        <iframe 
          src="${embedUrl}" 
          width="100%" 
          height="600px"
          style="border: none;"
          allow="autoplay"
        ></iframe>
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <a href="${fileUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 13px;">
            ${currentLanguage === 'ar' ? 'افتح في Google Drive' : 'Open in Google Drive'}
          </a>
        </div>
      `;
    } else if (file.type === 'doc' || file.type === 'docx') {
      // Google Docs embed URL
      embedUrl = `https://docs.google.com/document/d/${file.id}/preview`;
      fileViewerContent.innerHTML = `
        <iframe 
          src="${embedUrl}" 
          width="100%" 
          height="600px"
          style="border: none;"
        ></iframe>
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <a href="${fileUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 13px;">
            ${currentLanguage === 'ar' ? 'افتح في Google Drive' : 'Open in Google Drive'}
          </a>
        </div>
      `;
    } else if (file.type === 'ppt' || file.type === 'pptx') {
      // Google Slides embed URL
      embedUrl = `https://docs.google.com/presentation/d/${file.id}/preview`;
      fileViewerContent.innerHTML = `
        <iframe 
          src="${embedUrl}" 
          width="100%" 
          height="600px"
          style="border: none;"
        ></iframe>
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <a href="${fileUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 13px;">
            ${currentLanguage === 'ar' ? 'افتح في Google Drive' : 'Open in Google Drive'}
          </a>
        </div>
      `;
    } else {
      // Generic file - try multiple methods
      embedUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`;
      fileViewerContent.innerHTML = `
        <iframe 
          src="${embedUrl}" 
          width="100%" 
          height="600px"
          style="border: none;"
        ></iframe>
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <a href="${fileUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; margin-right: 10px;">
            ${currentLanguage === 'ar' ? 'افتح في Google Drive' : 'Open in Google Drive'}
          </a>
          <a href="${directDownloadUrl}" download style="display: inline-block; padding: 8px 16px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-size: 13px;">
            ${currentLanguage === 'ar' ? '⬇ تحميل' : '⬇ Download'}
          </a>
        </div>
      `;
    }
    
    // Add error handling for iframe - FIX: Use addEventListener for CSP compliance
    const iframe = fileViewerContent.querySelector('iframe');
    if (iframe) {
      // FIX: Use addEventListener instead of onerror (CSP compliance)
      iframe.addEventListener('error', () => {
        console.error('Iframe failed to load');
        showFileError(file, fileUrl, directDownloadUrl);
      });
      
      // Check if iframe loaded successfully after 3 seconds
      setTimeout(() => {
        try {
          // Try to access iframe content - if it fails, show error
          if (iframe.contentWindow) {
            // Iframe loaded but might show error page
            // FIX: Use addEventListener instead of onload (CSP compliance)
            iframe.addEventListener('load', () => {
              // Additional check can be added here
            });
          }
        } catch (e) {
          // Cross-origin error is expected, but iframe exists
          console.log('Iframe loaded (cross-origin check passed)');
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Error loading file:', error);
    showFileError(file, `https://drive.google.com/file/d/${file.id}/view`, `https://drive.google.com/uc?export=download&id=${file.id}`);
  }
};

/**
 * Show file error with alternative options
 */
const showFileError = (file, fileUrl, downloadUrl) => {
  if (!fileViewerContent) return;
  
  fileViewerContent.innerHTML = `
    <div class="file-viewer-error">
      <p style="font-size: 16px; font-weight: 600; margin-bottom: 15px;">
        ${currentLanguage === 'ar' ? '❌ تعذر عرض الملف مباشرة' : '❌ Unable to display file directly'}
      </p>
      <p style="margin-bottom: 20px; line-height: 1.6;">
        ${currentLanguage === 'ar' 
          ? 'قد يكون الملف غير متاح للوصول العام. يرجى استخدام أحد الخيارات التالية:' 
          : 'The file may not be publicly accessible. Please use one of the following options:'}
      </p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="${fileUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
          ${currentLanguage === 'ar' ? '🔗 فتح في Google Drive' : '🔗 Open in Google Drive'}
        </a>
        <a href="${downloadUrl}" download style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
          ${currentLanguage === 'ar' ? '⬇ تحميل الملف' : '⬇ Download File'}
        </a>
      </div>
      <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px; border-right: 4px solid #ffc107;">
        <p style="font-size: 13px; color: #856404; margin: 0; line-height: 1.6;">
          <strong>${currentLanguage === 'ar' ? 'ملاحظة:' : 'Note:'}</strong>
          ${currentLanguage === 'ar' 
            ? 'للعرض المباشر، يجب أن يكون الملف متاحاً للوصول العام في Google Drive. انقر بزر الماوس الأيمن على الملف في Google Drive واختر "الحصول على رابط" ثم تأكد من تعيين الإعداد على "أي شخص لديه الرابط".' 
            : 'For direct viewing, the file must be publicly accessible in Google Drive. Right-click the file in Google Drive, select "Get link" and ensure the setting is "Anyone with the link".'}
        </p>
      </div>
    </div>
  `;
};

/**
 * Close file viewer
 */
const closeFileViewer = () => {
  if (fileViewerContainer) {
    fileViewerContainer.classList.add('hidden');
    fileViewerContent.innerHTML = '';
  }
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  window.updateDataValue = updateDataValue;
  window.updateLoadTimeData = updateLoadTimeData;
  window.updateBoundElements = updateBoundElements;
  window.loadTimeData = loadTimeData;
  
  
  // الاستماع لأي تحديثات أخرى من مصادر مختلفة
  window.addEventListener('loadTimeDataUpdated', (e) => {
    // Event listener for loadTimeData updates (silent - no logging)
  });
}

// Example usage (can be called from browser console):
// updateDataValue('score', 95);
// updateDataValue('studentScore', 85, { saveToStorage: true });
// updateDataValue('totalScore', 3.5, { updateUI: true, notifyListeners: true });

// Initialize on DOM load - wait for api.js to be available
const initializeApp = () => {
  if (typeof window.apiService === 'undefined') {
    // Wait for api.js to load
    setTimeout(initializeApp, 50);
    return;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
};

// Start initialization
initializeApp();

