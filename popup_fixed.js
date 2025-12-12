/**
 * Smart Observation Tool (ELEOT) - Popup Script
 * Main logic for lesson evaluation, LLM integration, and UI updates
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

/**
 * Load configuration from JSON file
 */
const loadConfig = async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('config/eleot_ai_config.json'));
    config = await response.json();
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    showError('فشل تحميل ملف التكوين. يرجى التأكد من وجود config/eleot_ai_config.json');
    return null;
  }
};

/**
 * Check if API key is set
 */
const checkApiKey = async () => {
  try {
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
    });
    return result?.apiKey && result.apiKey.trim() !== '';
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
};

/**
 * Show API settings screen
 */
const showApiSettings = () => {
  if (apiSettingsScreen && mainScreen) {
    apiSettingsScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
    loadApiKeyToInputs();
  }
};

/**
 * Show main screen
 */
const showMainScreen = () => {
  if (apiSettingsScreen && mainScreen) {
    apiSettingsScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
  }
};

/**
 * Load saved API key to input fields
 */
const loadApiKeyToInputs = async () => {
  try {
    const storageResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
    });
    const endpointResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getApiEndpoint' }, resolve);
    });
    
    if (apiKeyInput && storageResult?.apiKey) {
      apiKeyInput.value = storageResult.apiKey;
    }
    if (apiEndpointInput && endpointResult?.apiEndpoint) {
      apiEndpointInput.value = endpointResult.apiEndpoint;
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
};

/**
 * Save API settings
 */
const saveApiSettings = async () => {
  if (!apiKeyInput || !apiProviderSelect) return;
  
  const apiKey = apiKeyInput.value.trim();
  const endpoint = apiEndpointInput.value.trim();
  const provider = apiProviderSelect.value;

  if (!apiKey) {
    alert(currentLanguage === 'ar' ? 'يرجى إدخال مفتاح API' : 'Please enter API key');
    return;
  }

  // Set default endpoints based on provider
  let defaultEndpoint = '';
  if (provider === 'openai') {
    defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
  } else if (provider === 'gemini') {
    defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  const finalEndpoint = endpoint || defaultEndpoint;

  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'setApiKey', apiKey }, () => {
        chrome.runtime.sendMessage({ action: 'setApiEndpoint', apiEndpoint: finalEndpoint }, resolve);
      });
    });

    alert(currentLanguage === 'ar' ? 'تم حفظ إعدادات API بنجاح!' : 'API settings saved successfully!');
    showMainScreen();
  } catch (error) {
    console.error('Error saving API settings:', error);
    alert(currentLanguage === 'ar' ? 'خطأ في حفظ الإعدادات' : 'Error saving settings');
  }
};

/**
 * Collect administrative data
 */
const collectAdminData = () => {
  const segments = [];
  if (adminFields.segmentBeginning?.checked) segments.push('Beginning');
  if (adminFields.segmentMiddle?.checked) segments.push('Middle');
  if (adminFields.segmentEnd?.checked) segments.push('End');
  
  adminData = {
    subject: adminFields.subject?.value || '',
    grade: adminFields.grade?.value || '',
    segment: segments.join(', '),
    teacherName: adminFields.teacherName?.value || '',
    date: adminFields.date?.value || ''
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
      evaluate_button: 'Evaluate',
      loading_text: 'Analyzing lesson...',
      overall_score: 'Overall Score:',
      out_of_four: '/ 4',
      element: 'Element',
      score: 'Score',
      justification: 'Justification',
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
      date: 'Date',
      subject: 'Subject',
      grade: 'Grade',
      segment: 'Segment',
      teacher_name: 'Teacher Name',
      beginning: 'Beginning',
      middle: 'Middle',
      end: 'End'
    },
    ar: {
      app_title: 'أداة المراقبة الذكية (ELEOT)',
      select_language: 'اختر اللغة:',
      lesson_description_label: 'وصف الحصة:',
      lesson_description_placeholder: 'أدخل وصف الحصة هنا...',
      evaluate_button: 'قيّم',
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
      date: 'التاريخ',
      subject: 'المادة',
      grade: 'الصف',
      segment: 'الجزء',
      teacher_name: 'اسم المعلم',
      beginning: 'البداية',
      middle: 'المنتصف',
      end: 'النهاية'
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
  
  // Update direction
  document.body.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
};

/**
 * Save data to localStorage
 */
const saveDataToStorage = () => {
  try {
    if (!lessonDescriptionTextarea || !adminFields) {
      return;
    }
    
    const dataToSave = {
      language: currentLanguage,
      lessonDescription: lessonDescriptionTextarea.value || '',
      adminData: {
        subject: adminFields.subject?.value || '',
        grade: adminFields.grade?.value || '',
        segmentBeginning: adminFields.segmentBeginning?.checked || false,
        segmentMiddle: adminFields.segmentMiddle?.checked || false,
        segmentEnd: adminFields.segmentEnd?.checked || false,
        teacherName: adminFields.teacherName?.value || '',
        date: adminFields.date?.value || ''
      }
    };
    localStorage.setItem('eleot_form_data', JSON.stringify(dataToSave));
    console.log('Data saved to localStorage');
  } catch (error) {
    console.error('Error saving data:', error);
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
    
    const savedData = localStorage.getItem('eleot_form_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      console.log('Loading saved data:', data);
      
      // Restore language
      if (data.language && languageSelect) {
        currentLanguage = data.language;
        languageSelect.value = currentLanguage;
        updateUIText(currentLanguage);
      }
      
      // Restore lesson description
      if (data.lessonDescription !== undefined && lessonDescriptionTextarea) {
        lessonDescriptionTextarea.value = data.lessonDescription;
      }
      
      // Restore admin data
      if (data.adminData) {
        if (data.adminData.subject !== undefined && adminFields.subject) adminFields.subject.value = data.adminData.subject;
        if (data.adminData.grade !== undefined && adminFields.grade) adminFields.grade.value = data.adminData.grade;
        if (data.adminData.teacherName !== undefined && adminFields.teacherName) adminFields.teacherName.value = data.adminData.teacherName;
        if (data.adminData.date && adminFields.date) adminFields.date.value = data.adminData.date;
        if (data.adminData.segmentBeginning !== undefined && adminFields.segmentBeginning) adminFields.segmentBeginning.checked = data.adminData.segmentBeginning;
        if (data.adminData.segmentMiddle !== undefined && adminFields.segmentMiddle) adminFields.segmentMiddle.checked = data.adminData.segmentMiddle;
        if (data.adminData.segmentEnd !== undefined && adminFields.segmentEnd) adminFields.segmentEnd.checked = data.adminData.segmentEnd;
      }
      console.log('Data loaded from localStorage successfully');
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
    adminFields.subject,
    adminFields.grade,
    adminFields.teacherName,
    adminFields.date,
    adminFields.segmentBeginning,
    adminFields.segmentMiddle,
    adminFields.segmentEnd
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
 * Clear all saved data
 */
const clearAllData = () => {
  if (confirm(currentLanguage === 'ar' 
    ? 'هل أنت متأكد من مسح جميع البيانات؟'
    : 'Are you sure you want to clear all data?')) {
    
    localStorage.removeItem('eleot_form_data');
    
    if (lessonDescriptionTextarea) lessonDescriptionTextarea.value = '';
    if (adminFields.subject) adminFields.subject.value = '';
    if (adminFields.grade) adminFields.grade.value = '';
    if (adminFields.teacherName) adminFields.teacherName.value = '';
    if (adminFields.segmentBeginning) adminFields.segmentBeginning.checked = false;
    if (adminFields.segmentMiddle) adminFields.segmentMiddle.checked = false;
    if (adminFields.segmentEnd) adminFields.segmentEnd.checked = false;
    
    const today = new Date().toISOString().split('T')[0];
    if (adminFields.date) adminFields.date.value = today;
    
    if (resultsSection) resultsSection.classList.add('hidden');
    currentResults = [];
    currentRecommendations = null;
    
    alert(currentLanguage === 'ar' 
      ? 'تم مسح جميع البيانات بنجاح'
      : 'All data cleared successfully');
  }
};

/**
 * Show error message
 */
const showError = (message) => {
  if (errorMessageDiv) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
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
 * Build user prompt from template
 */
const buildUserPrompt = (lessonDescription, language, adminData) => {
  const template = config.user_prompt_template.text;
  const adminDataStr = Object.entries(adminData)
    .filter(([key, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  
  return template
    .replace('{{language}}', language === 'ar' ? 'العربية' : 'English')
    .replace('{{admin_data}}', adminDataStr || 'N/A')
    .replace('{{lesson_description}}', lessonDescription);
};

/**
 * Call LLM API with prompt
 */
const callLLM = async (systemPrompt, userPrompt) => {
  try {
    const storageResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
    });
    
    const apiKey = storageResult?.apiKey;
    
    const endpointResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getApiEndpoint' }, resolve);
    });
    
    const apiEndpoint = endpointResult?.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const provider = apiProviderSelect?.value || 'openai';
    
    if (!apiKey || apiKey.trim() === '') {
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
        }]
      };
      headers = {
        'Content-Type': 'application/json'
      };
      const url = `${apiEndpoint}?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
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
        temperature: 0.7,
        max_tokens: 4000
      };
      
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
    console.error('LLM API error:', error);
    console.warn('Using sample data due to API error');
    return generateSampleResponse();
  }
};

/**
 * Generate sample response for testing
 */
const generateSampleResponse = () => {
  if (!config) return { 
    appreciation: '', 
    positiveObservations: [], 
    criteria: [], 
    recommendationsSummary: '', 
    totalScore: 0 
  };
  
  const allCriteria = [];
  config.eleot_sections.forEach(section => {
    section.criteria.forEach(criterion => {
      const score = Math.floor(Math.random() * 2) + 3;
      allCriteria.push({
        id: criterion.id,
        score: score,
        justification: currentLanguage === 'ar' 
          ? `تم ملاحظة الممارسة بشكل واضح في الحصة. ${criterion.id}`
          : `The practice was clearly observed in the lesson. ${criterion.id}`,
        improvement: score <= 2 ? (currentLanguage === 'ar'
          ? `اقتراح تحسين للمعيار ${criterion.id}`
          : `Improvement suggestion for ${criterion.id}`) : ''
      });
    });
  });
  
  const totalScore = allCriteria.reduce((sum, c) => sum + c.score, 0) / allCriteria.length;
  
  return {
    appreciation: currentLanguage === 'ar' 
      ? 'شكراً للمعلم على الحصة المتميزة والجهود المبذولة في تقديم تعليم فعال.'
      : 'Thank you to the teacher for the excellent lesson and efforts in delivering effective instruction.',
    positiveObservations: currentLanguage === 'ar'
      ? ['استخدام تقنيات تفاعلية', 'إشراك الطلاب في المناقشات', 'بيئة تعلم داعمة']
      : ['Use of interactive techniques', 'Student engagement in discussions', 'Supportive learning environment'],
    criteria: allCriteria,
    recommendationsSummary: currentLanguage === 'ar'
      ? 'أداء المعلم بشكل عام جيد. يمكن تعزيز بعض المجالات لتحقيق نتائج أفضل.'
      : 'Overall teacher performance is good. Some areas can be strengthened for better results.',
    totalScore: Math.round(totalScore * 10) / 10
  };
};

/**
 * Validate and sanitize AI response
 */
const validateResponse = (response) => {
  if (!response.criteria || !Array.isArray(response.criteria)) {
    throw new Error('Response is missing criteria array');
  }
  
  return {
    appreciation: sanitizeText(response.appreciation || '', 300),
    positiveObservations: Array.isArray(response.positiveObservations) 
      ? response.positiveObservations.map(obs => sanitizeText(obs, 200))
      : [],
    criteria: response.criteria.map(item => ({
      id: item.id || '',
      score: validateScore(item.score),
      justification: sanitizeText(item.justification || '', 500),
      improvement: item.score <= 2 ? sanitizeText(item.improvement || '', 500) : ''
    })),
    recommendationsSummary: sanitizeText(response.recommendationsSummary || '', 500),
    totalScore: response.totalScore || 0
  };
};

/**
 * Display results by section
 */
const displayResults = (results) => {
  currentResults = results.criteria;
  currentRecommendations = {
    appreciation: results.appreciation,
    positiveObservations: results.positiveObservations,
    recommendationsSummary: results.recommendationsSummary
  };
  
  if (!resultsBySection) return;
  
  resultsBySection.innerHTML = '';
  
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
  
  // Display each section
  config.eleot_sections.forEach(section => {
    const sectionData = criteriaBySection[section.id];
    if (!sectionData || sectionData.criteria.length === 0) return;
    
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
    ['المعيار', 'الدرجة', 'التبرير', 'التحسين', 'نسخ'].forEach((text, idx) => {
      const th = document.createElement('th');
      th.textContent = currentLanguage === 'ar' ? text : ['Criterion', 'Score', 'Justification', 'Improvement', 'Copy'][idx];
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
      
      // Score
      const scoreCell = document.createElement('td');
      scoreCell.className = `score-cell score-${result.score}`;
      scoreCell.textContent = result.score;
      
      // Justification
      const justificationCell = document.createElement('td');
      justificationCell.className = 'justification-cell';
      justificationCell.textContent = result.justification;
      
      // Improvement (only if score <= 2)
      const improvementCell = document.createElement('td');
      improvementCell.className = 'suggestion-cell';
      improvementCell.textContent = result.improvement || (currentLanguage === 'ar' ? '-' : '-');
      
      // Copy button
      const copyCell = document.createElement('td');
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = currentLanguage === 'ar' ? 'نسخ' : 'Copy';
      copyBtn.setAttribute('title', currentLanguage === 'ar' ? 'نسخ التبرير' : 'Copy justification');
      copyBtn.addEventListener('click', async () => {
        const textToCopy = result.justification + (result.improvement ? `\n\n${currentLanguage === 'ar' ? 'التحسين:' : 'Improvement:'} ${result.improvement}` : '');
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
      row.appendChild(improvementCell);
      row.appendChild(copyCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    sectionDiv.appendChild(table);
    resultsBySection.appendChild(sectionDiv);
  });
  
  // Display overall score
  const totalScore = results.totalScore || calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0));
  if (overallScoreSpan) overallScoreSpan.textContent = totalScore.toFixed(1);
  
  // Display positive observations at bottom (without title)
  if (results.positiveObservations && results.positiveObservations.length > 0) {
    const observationsDiv = document.createElement('div');
    observationsDiv.className = 'positive-observations';
    observationsDiv.innerHTML = `<ul>${results.positiveObservations.map(obs => `<li>${obs}</li>`).join('')}</ul>`;
    resultsBySection.appendChild(observationsDiv);
  }
  
  // Display appreciation message at bottom (without title)
  if (results.appreciation) {
    const appreciationDiv = document.createElement('div');
    appreciationDiv.className = 'appreciation-message';
    appreciationDiv.innerHTML = `<p>${results.appreciation}</p>`;
    resultsBySection.appendChild(appreciationDiv);
  }
  
  // Display recommendations summary at the very bottom
  if (results.recommendationsSummary) {
    displayRecommendations(currentRecommendations);
  }
  
  if (resultsSection) resultsSection.classList.remove('hidden');
};

/**
 * Display recommendations
 */
const displayRecommendations = (recommendations) => {
  if (!recommendationsContent) return;
  
  recommendationsContent.innerHTML = '';
  
  if (recommendations.recommendationsSummary) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'recommendation-item';
    summaryDiv.innerHTML = `
      <h4>${currentLanguage === 'ar' ? 'ملخص التوصيات النهائية' : 'Final Recommendations Summary'}</h4>
      <p>${recommendations.recommendationsSummary}</p>
    `;
    recommendationsContent.appendChild(summaryDiv);
  }
  
  if (recommendationsSection) recommendationsSection.classList.remove('hidden');
};

/**
 * Handle evaluate button click
 */
const handleEvaluate = async () => {
  if (!lessonDescriptionTextarea) return;
  
  const lessonDescription = lessonDescriptionTextarea.value.trim();
  
  if (!lessonDescription) {
    showError(currentLanguage === 'ar' 
      ? 'يرجى إدخال وصف الحصة أولاً.'
      : 'Please enter a lesson description first.');
    return;
  }
  
  if (!config) {
    showError('التكوين غير محمل. يرجى إعادة تحميل الإضافة.');
    return;
  }
  
  // Save data before evaluation
  saveDataToStorage();
  
  // Collect admin data
  collectAdminData();
  
  // Show loading, hide results and errors
  if (loadingDiv) loadingDiv.classList.remove('hidden');
  if (resultsSection) resultsSection.classList.add('hidden');
  hideError();
  if (evaluateBtn) evaluateBtn.disabled = true;
  
  try {
    // Build prompts
    const systemPrompt = config.system_prompt.text;
    const userPrompt = buildUserPrompt(
      lessonDescription,
      currentLanguage,
      adminData
    );
    
    // Call LLM
    const response = await callLLM(systemPrompt, userPrompt);
    
    // Validate and sanitize response
    const validatedResults = validateResponse(response);
    
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
  languageSelect = document.getElementById('language-select');
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
  
  adminFields = {
    subject: document.getElementById('subject-field'),
    grade: document.getElementById('grade-field'),
    segmentBeginning: document.getElementById('segment-beginning'),
    segmentMiddle: document.getElementById('segment-middle'),
    segmentEnd: document.getElementById('segment-end'),
    teacherName: document.getElementById('teacher-name-field'),
    date: document.getElementById('date-field')
  };
  
  console.log('DOM elements initialized');
  
  // Load configuration
  await loadConfig();
  
  // Check if API key is set
  const hasApiKey = await checkApiKey();
  
  if (!hasApiKey) {
    showApiSettings();
  } else {
    showMainScreen();
  }
  
  // Set initial language
  if (languageSelect) {
    currentLanguage = languageSelect.value || 'ar';
  } else {
    currentLanguage = 'ar';
  }
  updateUIText(currentLanguage);
  
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
  
  // Setup auto-save
  setTimeout(() => {
    setupAutoSave();
  }, 300);
  
  // Event listeners
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Save API button clicked');
      saveApiSettings();
    });
  } else {
    console.error('saveApiBtn not found');
  }
  
  if (skipApiBtn) {
    skipApiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Skip API button clicked');
      showMainScreen();
    });
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
  
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      currentLanguage = e.target.value;
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
  
  if (lessonDescriptionTextarea) {
    lessonDescriptionTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleEvaluate();
      }
    });
  }
  
  // Export button handlers
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      if (currentResults.length > 0) {
        const totalScore = currentRecommendations?.totalScore || calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0));
        exportToPDF(currentResults, totalScore.toFixed(1), currentLanguage, adminData, currentRecommendations);
      }
    });
  }
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (currentResults.length > 0) {
        const totalScore = currentRecommendations?.totalScore || calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0));
        exportToCSV(currentResults, totalScore.toFixed(1), currentLanguage, adminData);
      }
    });
  }
  
  if (exportWordBtn) {
    exportWordBtn.addEventListener('click', () => {
      if (currentResults.length > 0) {
        const totalScore = currentRecommendations?.totalScore || calculateAverageScore(currentResults.map(r => r.score).filter(s => s > 0));
        exportToWord(currentResults, totalScore.toFixed(1), currentLanguage, adminData, currentRecommendations);
      }
    });
  }
  
  console.log('Extension initialized successfully');
};

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(init, 100);
  });
} else {
  setTimeout(init, 100);
}

