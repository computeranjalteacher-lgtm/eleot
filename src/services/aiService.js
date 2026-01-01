import { ELEOT_SECTIONS, getAllCriteria } from '../config/eleotConfig.js';

/**
 * Generate deterministic score based on text content
 * This is a simplified deterministic function - replace with actual AI API call
 */
const generateDeterministicScore = (text, criterionId) => {
  // Simple hash-based deterministic scoring
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, criterionId.charCodeAt(0));
  
  // Map hash to score 1-4 (deterministic)
  return (Math.abs(hash) % 4) + 1;
};

/**
 * Generate justification based on score and criterion
 */
export const generateJustification = (score, criterion, language) => {
  const indicatorText = language === 'ar' ? criterion.label_ar : criterion.label_en;
  
  if (language === 'ar') {
    switch (score) {
      case 4:
        return `ظهر بشكل واضح أن ${indicatorText}`;
      case 3:
        return `ظهر أن بعض ${indicatorText}`;
      case 2:
        return `ظهر أن عدداً من ${indicatorText} لا يحقق المعايير المطلوبة`;
      case 1:
        return `ظهر أن ${indicatorText} لا توجد ممارسة مرتبطة بهذا المعيار`;
      default:
        return '';
    }
  } else {
    switch (score) {
      case 4:
        return `It was clearly observed that ${indicatorText}`;
      case 3:
        return `It was observed that some ${indicatorText}`;
      case 2:
        return `It was observed that several ${indicatorText} do not meet the required standards`;
      case 1:
        return `It was observed that no evidence was found related to ${indicatorText}`;
      default:
        return '';
    }
  }
};

/**
 * Detect language from text
 */
export const detectLanguage = (text) => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
};

/**
 * Evaluate observation text and return scores for selected criteria
 */
export const evaluateObservation = async (observationText, selectedCriteriaIds, language = null) => {
  const detectedLang = language || detectLanguage(observationText);
  const allCriteria = getAllCriteria();
  
  // Filter selected criteria
  const selectedCriteria = allCriteria.filter(c => selectedCriteriaIds.includes(c.id));
  
  // Generate scores and justifications
  const results = selectedCriteria.map(criterion => {
    const score = generateDeterministicScore(observationText, criterion.id);
    const justification = generateJustification(score, criterion, detectedLang);
    
    return {
      id: criterion.id,
      sectionId: criterion.sectionId,
      score,
      justification,
      criterion
    };
  });
  
  // Calculate average score
  const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  // Generate recommendations
  const lowScores = results.filter(r => r.score <= 2);
  const highScores = results.filter(r => r.score >= 3);
  
  let recommendations = '';
  if (detectedLang === 'ar') {
    recommendations = '<h3 style="color:green;">التوصيات</h3>';
    recommendations += '<p>شكراً للمعلم على الحصة والجهود المبذولة.</p>';
    
    if (highScores.length > 0) {
      recommendations += '<p><strong>الجوانب الإيجابية:</strong> ';
      recommendations += highScores.map(r => r.criterion.label_ar).slice(0, 3).join('، ') + '</p>';
    }
    
    if (lowScores.length > 0) {
      recommendations += '<p><strong>فرص التطوير:</strong> ';
      recommendations += lowScores.map(r => `تعزيز ${r.criterion.label_ar}`).join('، ') + '</p>';
    }
  } else {
    recommendations = '<h3 style="color:green;">Recommendations</h3>';
    recommendations += '<p>Thank you to the teacher for the lesson and efforts made.</p>';
    
    if (highScores.length > 0) {
      recommendations += '<p><strong>Positive Aspects:</strong> ';
      recommendations += highScores.map(r => r.criterion.label_en).slice(0, 3).join(', ') + '</p>';
    }
    
    if (lowScores.length > 0) {
      recommendations += '<p><strong>Development Opportunities:</strong> ';
      recommendations += lowScores.map(r => `Enhance ${r.criterion.label_en}`).join(', ') + '</p>';
    }
  }
  
  return {
    criteria: results,
    totalScore: Math.round(totalScore * 10) / 10,
    recommendations,
    language: detectedLang,
    date: new Date().toISOString()
  };
};

/**
 * Call actual AI API (placeholder - replace with real API call)
 */
export const callAIAPI = async (observationText, selectedCriteriaIds, language) => {
  // TODO: Replace with actual AI API call
  // For now, use deterministic evaluation
  return await evaluateObservation(observationText, selectedCriteriaIds, language);
};



