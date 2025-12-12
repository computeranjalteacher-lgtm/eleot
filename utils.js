/**
 * Utility functions for ELEOT extension
 * Compliance: F.1 (Accessibility) - Provides reusable helper functions
 */

/**
 * Sanitize text input to prevent XSS
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} - Sanitized text
 */
const sanitizeText = (text, maxLength = 1000) => {
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

/**
 * Validate score is between 1 and 4
 * @param {number} score - Score to validate
 * @returns {boolean} - True if valid
 */
const validateScore = (score) => {
  const num = parseInt(score, 10);
  return !isNaN(num) && num >= 1 && num <= 4;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - True if successful
 */
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Show tooltip message
 * @param {HTMLElement} element - Element to show tooltip on
 * @param {string} message - Tooltip message
 */
const showTooltip = (element, message) => {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = message;
  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = '#333';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '5px 10px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '10000';
  tooltip.style.pointerEvents = 'none';
  
  const rect = element.getBoundingClientRect();
  tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top = rect.top - 30 + 'px';
  
  document.body.appendChild(tooltip);
  
  setTimeout(() => {
    document.body.removeChild(tooltip);
  }, 2000);
};

/**
 * Export results to CSV
 * @param {Array<Object>} results - Array of result objects
 * @param {string} overallScore - Overall average score
 * @param {string} language - Selected language
 * @param {Object} adminData - Administrative data
 */
const exportToCSV = (results, overallScore, language, adminData = {}, config = null) => {
  try {
    // FIX: Validate inputs before processing
    if (!results || !Array.isArray(results)) {
      throw new Error('Results array is required and must be an array');
    }
    
    if (results.length === 0) {
      throw new Error('No evaluation results to export');
    }
    
    // Helper function to get element label from config
    const getElementLabel = (criterionId) => {
      if (!config || !config.eleot_sections) return criterionId;
      
      for (const section of config.eleot_sections) {
        if (section.criteria) {
          const criterion = section.criteria.find(c => c.id === criterionId);
          if (criterion) {
            return language === 'ar' ? criterion.label_ar : criterion.label_en;
          }
        }
      }
      return criterionId;
    };
    
    // Get header image path for CSV (as file path reference)
    // Use header.png for exports (not Logo.png)
    let headerImagePath = 'images/header.png';
    
    // Credits text - based on language
    const creditsText = language === 'ar'
      ? 'حقوق التصميم: قسم الحاسب بمدارس الأنجال- مشرف القسم/ هشام يسن يسري'
      : 'Design Rights: Computer Department at Al-Anjal Schools – Department Supervisor: Hesham Yassin Yousri';
    
    // FIX: Add BOM for UTF-8 compatibility (especially for Arabic)
    const BOM = '\uFEFF';
    const headers = ['element_id', 'element_label', 'score', 'justification', 'suggestion', 'language', 'overall_score', 'header_image_path'];
    const rows = [BOM + headers.join(',')]; // Add BOM at the start
    
    // Add header image path and credits as metadata rows
    rows.push(`"header_image_path","${headerImagePath.replace(/"/g, '""')}"`);
    rows.push(`"credits","${creditsText.replace(/"/g, '""')}"`);
    rows.push(''); // Empty row separator
    
    results.forEach(result => {
      // FIX: Validate result object
      if (!result || typeof result !== 'object') {
        console.warn('Skipping invalid result in CSV export');
        return;
      }
      
      // Get element label from config
      const elementLabel = getElementLabel(result.id);
      
      const row = [
        result.id || '',
        `"${(elementLabel || result.id || '').replace(/"/g, '""')}"`,
        result.score || 0,
        `"${(result.justification || '').replace(/"/g, '""')}"`,
        `"${(result.suggestion || result.improvement || '').replace(/"/g, '""')}"`,
        language || 'en',
        overallScore || '0',
        `"${headerImagePath.replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    });
    
    // Add credits row at the end
    rows.push(`"credits","${creditsText.replace(/"/g, '""')}"`);
    
    const csvContent = rows.join('\n');
    // FIX: Ensure UTF-8 encoding with BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `eleot_evaluation_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export error:', error);
    alert(`Failed to export CSV: ${error.message || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Export results to PDF using jsPDF
 * @param {Array<Object>} results - Array of result objects
 * @param {string} overallScore - Overall average score
 * @param {string} language - Selected language
 * @param {Object} adminData - Administrative data
 * @param {Object} recommendations - Recommendations object
 */
const exportToPDF = (results, overallScore, language, adminData = {}, recommendations = null) => {
  try {
    // FIX: Validate inputs before processing
    if (!results || !Array.isArray(results)) {
      throw new Error('Results array is required and must be an array');
    }
    
    if (results.length === 0) {
      throw new Error('No evaluation results to export');
    }
    
    // Check if jsPDF is loaded - try multiple ways
    let jsPDF;
    if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
      jsPDF = window.jspdf.jsPDF;
    } else if (typeof window.jsPDF !== 'undefined') {
      jsPDF = window.jsPDF;
    } else {
      throw new Error('jsPDF library is not loaded. Please refresh the page and try again.');
    }
    const doc = new jsPDF();
    
    // Determine language for labels
    const isArabic = language === 'ar';
    const titleText = isArabic ? 'تقرير تقييم ELEOT' : 'ELEOT AI Evaluation Report';
    const teacherLabel = isArabic ? 'المعلم:' : 'Teacher:';
    const subjectLabel = isArabic ? 'المادة:' : 'Subject:';
    const gradeLabel = isArabic ? 'الصف:' : 'Grade:';
    const segmentLabel = isArabic ? 'الجزء:' : 'Segment:';
    const dateLabel = isArabic ? 'التاريخ:' : 'Date:';
    const supervisorLabel = isArabic ? 'المشرف:' : 'Supervisor:';
    const overallScoreLabel = isArabic ? 'النتيجة الإجمالية:' : 'Overall Score:';
    const scoreLabel = isArabic ? 'الدرجة:' : 'Score:';
    const justificationLabel = isArabic ? 'التبرير:' : 'Justification:';
    const suggestionLabel = isArabic ? 'الاقتراح:' : 'Suggestion:';
    const recommendationsLabel = isArabic ? 'التوصيات' : 'Recommendations';
    
    // Add title
    doc.setFontSize(18);
    doc.text(titleText, 14, 20);
    
    // Add administrative data
    let yPos = 30;
    doc.setFontSize(10);
    if (adminData && adminData.teacherName) doc.text(`${teacherLabel} ${adminData.teacherName}`, 14, yPos);
    yPos += 6;
    if (adminData && adminData.subject) doc.text(`${subjectLabel} ${adminData.subject}`, 14, yPos);
    yPos += 6;
    if (adminData && adminData.grade) doc.text(`${gradeLabel} ${adminData.grade}`, 14, yPos);
    yPos += 6;
    if (adminData && adminData.segment) doc.text(`${segmentLabel} ${adminData.segment}`, 14, yPos);
    yPos += 6;
    if (adminData && adminData.date) doc.text(`${dateLabel} ${adminData.date}`, 14, yPos);
    yPos += 6;
    if (adminData && adminData.supervisorName) doc.text(`${supervisorLabel} ${adminData.supervisorName}`, 14, yPos);
    yPos += 10;
    
    // Add overall score
    doc.setFontSize(14);
    doc.text(`${overallScoreLabel} ${overallScore || '0.0'} / 4`, 14, yPos);
    yPos += 10;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 8;
    
    // FIX: Add each element result with null checks
    results.forEach((result, index) => {
      // Validate result object
      if (!result || typeof result !== 'object') {
        console.warn(`Skipping invalid result at index ${index}`);
        return;
      }
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const criterionText = `${result.id || 'N/A'}: ${result.label || (isArabic ? 'بدون تسمية' : 'No label')}`;
      doc.text(criterionText, 14, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const scoreText = `${scoreLabel} ${result.score || 0}/4`;
      doc.text(scoreText, 14, yPos);
      yPos += lineHeight;
      
      // FIX: Clean justification text (remove HTML entities)
      const justification = result.justification || '';
      const cleanJustification = typeof decodeHtmlEntities === 'function' 
        ? decodeHtmlEntities(justification).replace(/<[^>]*>/g, '')
        : justification.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]*>/g, '');
      const justificationText = `${justificationLabel} ${cleanJustification || (isArabic ? 'لا يوجد' : 'None')}`;
      doc.text(justificationText.substring(0, 80), 14, yPos);
      yPos += lineHeight * 2;
      
      // FIX: Clean suggestion text
      const suggestion = result.suggestion || result.improvement || '';
      const cleanSuggestion = typeof decodeHtmlEntities === 'function' 
        ? decodeHtmlEntities(suggestion).replace(/<[^>]*>/g, '')
        : suggestion.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]*>/g, '');
      const suggestionText = `${suggestionLabel} ${cleanSuggestion || (isArabic ? 'لا يوجد' : 'None')}`;
      doc.text(suggestionText.substring(0, 80), 14, yPos);
      yPos += lineHeight * 3;
    });
    
    // FIX: Add recommendations if available with null checks
    if (recommendations && typeof recommendations === 'object' && recommendations.recommendations) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(recommendationsLabel, 14, yPos);
      yPos += lineHeight * 2;
      
      // Extract text from HTML recommendations
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = recommendations.recommendations || '';
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // FIX: Validate lines array before forEach
      if (textContent) {
        // Split text into lines and add to PDF
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const lines = textContent.split('\n').filter(line => line && line.trim());
        if (lines && Array.isArray(lines)) {
          lines.forEach(line => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        const trimmedLine = line.trim();
            if (trimmedLine) {
              doc.text(trimmedLine.substring(0, 80), 14, yPos);
              yPos += lineHeight;
            }
          });
        }
      }
    }
    
    // Save the PDF
    doc.save(`eleot_evaluation_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    // FIX: Better error message with details
    const errorMessage = error.message || 'Unknown error';
    alert(`Failed to export PDF: ${errorMessage}. Please ensure jsPDF is loaded and try again.`);
  }
};

/**
 * Export results to Word document (HTML format)
 * @param {Array<Object>} results - Array of result objects
 * @param {string} overallScore - Overall average score
 * @param {string} language - Selected language
 * @param {Object} adminData - Administrative data
 * @param {Object} recommendations - Recommendations object
 */
const exportToWord = async (results, overallScore, language, adminData = {}, recommendations = null, config = null) => {
  try {
    // FIX: Validate inputs before processing
    if (!results || !Array.isArray(results)) {
      throw new Error('Results array is required and must be an array');
    }
    
    if (results.length === 0) {
      throw new Error('No evaluation results to export');
    }
    
    const isArabic = language === 'ar';
    const titleText = isArabic ? 'تقرير تقييم ELEOT' : 'ELEOT AI Evaluation Report';
    const teacherLabel = isArabic ? 'المعلم:' : 'Teacher:';
    const subjectLabel = isArabic ? 'المادة:' : 'Subject:';
    const gradeLabel = isArabic ? 'الصف:' : 'Grade:';
    const segmentLabel = isArabic ? 'الجزء:' : 'Segment:';
    const dateLabel = isArabic ? 'التاريخ:' : 'Date:';
    const supervisorLabel = isArabic ? 'المشرف:' : 'Supervisor:';
    const overallScoreLabel = isArabic ? 'النتيجة الإجمالية:' : 'Overall Score:';
    const elementLabel = isArabic ? 'العنصر' : 'Element';
    const scoreLabel = isArabic ? 'الدرجة' : 'Score';
    const justificationLabel = isArabic ? 'التبرير' : 'Justification';
    const suggestionLabel = isArabic ? 'الاقتراح' : 'Suggestion';
    
    // Helper function to get element label from config
    const getElementLabel = (criterionId) => {
      if (!config || !config.eleot_sections) return criterionId;
      for (const section of config.eleot_sections) {
        if (section.criteria) {
          const criterion = section.criteria.find(c => c.id === criterionId);
          if (criterion) {
            return language === 'ar' ? criterion.label_ar : criterion.label_en;
          }
        }
      }
      return criterionId;
    };
    
    // FIX: Clean text before inserting into HTML
    const cleanTextForHTML = (text) => {
      if (!text || typeof text !== 'string') return '';
      // Decode HTML entities if function is available
      let cleaned = typeof decodeHtmlEntities === 'function' 
        ? decodeHtmlEntities(text) 
        : text.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      // Escape HTML for safety
      return cleaned
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    
    // Convert HTML recommendations to formatted text
    // FIX: Ensure all elements (strengths, improvements, weaknesses) are included
    // Use innerHTML directly to preserve all structure exactly as generated
    const formatRecommendationsForExport = (htmlRecommendations) => {
      if (!htmlRecommendations || typeof htmlRecommendations !== 'string') return '';
      
      // FIX: Simply return the HTML as-is to preserve all structure
      // The HTML from formatRecommendations is already well-formed
      // No need to parse and reconstruct - just return it directly
      return htmlRecommendations;
    };
    
    // Get header image as base64 data URI for Word export
    // Use header.png for exports (not Logo.png)
    // This ensures the image is embedded in the HTML file and works when opened in Word
    let headerImageDataUri = '';
    try {
      const imageUrl = 'images/header.png';
      // Fetch the image and convert to base64
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        headerImageDataUri = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn('Could not load header image:', error);
      // Fallback: use relative path
      headerImageDataUri = 'images/header.png';
    }
    
    // Credits text - based on language
    const creditsText = isArabic 
      ? 'حقوق التصميم: قسم الحاسب بمدارس الأنجال- مشرف القسم/ هشام يسن يسري'
      : 'Design Rights: Computer Department at Al-Anjal Schools – Department Supervisor: Hesham Yassin Yousri';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titleText}</title>
      <style>
        body { font-family: ${isArabic ? 'Arial, Tahoma, sans-serif' : 'Arial, sans-serif'}; margin: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
        .header-img { 
          width: 16cm; 
          height: auto; 
          max-height: 2.5cm; 
          display: block; 
          margin: 0 auto 10px auto; 
          object-fit: contain; 
          page-break-inside: avoid;
        }
        h1 { color: #2196F3; text-align: center; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; }
        th { background-color: #2196F3; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .overall-score { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .recommendations { margin-top: 30px; }
        .recommendations h3 { color: green; }
        .credits { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #ddd; 
          text-align: center; 
          font-size: 11px; 
          color: #666; 
          font-style: italic; 
        }
      </style>
    </head>
    <body>
      ${headerImageDataUri ? `<img src="${headerImageDataUri}" alt="Header" class="header-img" onerror="this.style.display='none'; console.error('Failed to load header image');" />` : ''}
      <h1>${titleText}</h1>
      <div style="margin: 20px 0;">
        ${adminData.teacherName ? `<p><strong>${teacherLabel}</strong> ${cleanTextForHTML(adminData.teacherName)}</p>` : ''}
        ${adminData.subject ? `<p><strong>${subjectLabel}</strong> ${cleanTextForHTML(adminData.subject)}</p>` : ''}
        ${adminData.grade ? `<p><strong>${gradeLabel}</strong> ${cleanTextForHTML(adminData.grade)}</p>` : ''}
        ${adminData.segment ? `<p><strong>${segmentLabel}</strong> ${cleanTextForHTML(adminData.segment)}</p>` : ''}
        ${adminData.date ? `<p><strong>${dateLabel}</strong> ${cleanTextForHTML(adminData.date)}</p>` : ''}
        ${adminData.supervisorName ? `<p><strong>${supervisorLabel}</strong> ${cleanTextForHTML(adminData.supervisorName)}</p>` : ''}
      </div>
      <div class="overall-score">${overallScoreLabel} ${overallScore || '0.0'} / 4</div>
      <table>
        <thead>
          <tr>
            <th>${elementLabel}</th>
            <th>${scoreLabel}</th>
            <th>${justificationLabel}</th>
            <th>${suggestionLabel}</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(result => {
            // FIX: Validate result object
            if (!result || typeof result !== 'object') {
              return '';
            }
            const elementLabelText = getElementLabel(result.id);
            return `
            <tr>
              <td>${result.id || ''}: ${cleanTextForHTML(elementLabelText || '')}</td>
              <td>${result.score || 0}/4</td>
              <td>${cleanTextForHTML(result.justification || '')}</td>
              <td>${cleanTextForHTML(result.suggestion || result.improvement || '')}</td>
            </tr>
          `;
          }).filter(row => row.trim() !== '').join('')}
        </tbody>
      </table>
      ${recommendations && recommendations.recommendations ? `
      <div class="recommendations" style="margin-top: 30px;">
        ${formatRecommendationsForExport(recommendations.recommendations)}
      </div>
      ` : ''}
      <div class="credits">
        ${creditsText}
      </div>
    </body>
    </html>
  `;
  
    // FIX: Add BOM for UTF-8 compatibility (especially for Arabic)
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `eleot_evaluation_${new Date().toISOString().split('T')[0]}.doc`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Word export error:', error);
    alert(`Failed to export Word document: ${error.message || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Calculate average score from array of scores
 * @param {Array<number>} scores - Array of score values
 * @returns {number} - Average score rounded to 1 decimal place
 */
const calculateAverageScore = (scores) => {
  if (!scores || scores.length === 0) return 0;
  const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s) && s > 0);
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;
  return Math.round(average * 10) / 10;
};

/**
 * Decode HTML entities to plain text
 * @param {string} text - Text with HTML entities
 * @returns {string} - Plain text without HTML entities
 */
const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Clean text by removing HTML entities and formatting issues
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return '';
  // First decode HTML entities
  let cleaned = decodeHtmlEntities(text);
  // Remove any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

/**
 * Validate that all expected elements are present in results
 * @param {Array<Object>} configElements - Elements from config
 * @param {Array<Object>} results - Results from AI
 * @returns {Array<string>} - Array of missing element IDs
 */
const validateAllElementsPresent = (configElements, results) => {
  const resultIds = new Set(results.map(r => r.id));
  const missing = configElements.filter(elem => !resultIds.has(elem.id));
  return missing.map(elem => elem.id);
};
