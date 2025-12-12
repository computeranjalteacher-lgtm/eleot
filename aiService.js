import { ELEOT_ENVIRONMENTS, JUSTIFICATION_TEMPLATES } from '../config/eleotConfig';

// Detect language from text
const detectLanguage = (text) => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
};

/**
 * Calculate deterministic score (1-4) based on observation text and criterion
 * Simplified version - returns scores based on keyword matching
 * 
 * Scoring Logic:
 * - 4 = Strong positive evidence (excellent, highly engaged, فعال جداً, متميز)
 * - 3 = Moderate positive evidence (good, engaged, active, جيد, تفاعل, نشط)
 * - 2 = Neutral or limited evidence (some students, limited, ضعيف, محدود)
 * - 1 = Strong negative evidence (poor, no engagement, غير متفاعل, ضعف شديد)
 * 
 * @param {string} text - Observation text to evaluate
 * @param {Object} criterion - Criterion object with label_ar and label_en
 * @param {string} language - Language code ('ar' or 'en')
 * @returns {number} Integer score from 1 to 4
 */
const calculateScore = (text, criterion, language) => {
  // Normalize text
  const normalizedText = (text || '').trim().toLowerCase();
  
  // #region agent log
  console.log('[DEBUG] calculateScore called:', {
    location: 'aiService.js:calculateScore',
    textLength: normalizedText.length,
    textPreview: normalizedText.substring(0, 50),
    language: language,
    criterionId: criterion.id
  });
  // #endregion

  // Define keywords for each score level
  const keywords = {
    ar: {
      score4: ['متميز', 'ممتاز', 'فعال جداً', 'نشط جداً', 'بكفاءة عالية', 'بنجاح', 'رائع', 'مثالي', 'استثنائي'],
      score3: ['جيد', 'تفاعل', 'نشط', 'مشارك', 'متجاوب', 'تعاوني', 'مناسب', 'إيجابي'],
      score2: ['بعض', 'محدود', 'قليل', 'جزئي', 'ناقص', 'أحياناً', 'بسيط'],
      score1: ['ضعيف', 'لا', 'غير', 'غائب', 'مفقود', 'فشل', 'رفض', 'تجاهل', 'ضعف شديد', 'غير متفاعل', 'سلبي']
    },
    en: {
      score4: ['excellent', 'outstanding', 'highly', 'strongly', 'effectively', 'successfully', 'remarkable', 'exceptional'],
      score3: ['good', 'engaged', 'active', 'participating', 'involved', 'responsive', 'cooperative', 'appropriate'],
      score2: ['some', 'limited', 'few', 'partial', 'incomplete', 'occasional', 'minimal', 'basic'],
      score1: ['poor', 'no', 'not', 'none', 'lacking', 'absent', 'failed', 'ignored', 'very weak', 'disengaged', 'inactive']
    }
  };
  
  // Get keywords for current language
  const langKeywords = keywords[language] || keywords.en;
  
  // Count matches for each score level
  const countMatches = (keywordList) => {
    let count = 0;
    keywordList.forEach(keyword => {
      // Simple substring match for both Arabic and English
      if (normalizedText.includes(keyword.toLowerCase())) {
        count++;
      }
    });
    return count;
  };
  
  const score4Count = countMatches(langKeywords.score4);
  const score3Count = countMatches(langKeywords.score3);
  const score2Count = countMatches(langKeywords.score2);
  const score1Count = countMatches(langKeywords.score1);
  
  // #region agent log
  console.log('[DEBUG] Score counts:', {
    score1: score1Count,
    score2: score2Count,
    score3: score3Count,
    score4: score4Count
  });
  // #endregion
  
  // Simple scoring logic
  let finalScore = 2; // Default neutral score
  
  // Priority 1: Negative evidence (score 1)
  if (score1Count >= 2) {
    finalScore = 1;
  } else if (score1Count >= 1 && score4Count === 0 && score3Count === 0) {
    finalScore = 1;
  }
  // Priority 2: Strong positive evidence (score 4)
  else if (score4Count >= 2) {
    finalScore = 4;
  } else if (score4Count >= 1 && score1Count === 0) {
    finalScore = 4;
  }
  // Priority 3: Moderate positive evidence (score 3)
  else if (score3Count >= 2 && score1Count === 0) {
    finalScore = 3;
  } else if (score3Count >= 1 && score1Count === 0) {
    finalScore = 3;
  }
  // Priority 4: Limited evidence (score 2)
  else if (score2Count >= 1) {
    finalScore = 2;
  }
  // Default: score 2 (neutral)
  
  // #region agent log
  console.log('[DEBUG] Final score:', {
    finalScore: finalScore,
    reasoning: score1Count >= 2 ? 'strong negative' :
               score1Count >= 1 && score4Count === 0 && score3Count === 0 ? 'negative' :
               score4Count >= 2 ? 'strong positive multiple' :
               score4Count >= 1 && score1Count === 0 ? 'strong positive' :
               score3Count >= 2 && score1Count === 0 ? 'moderate positive multiple' :
               score3Count >= 1 && score1Count === 0 ? 'moderate positive' :
               score2Count >= 1 ? 'limited evidence' : 'default'
  });
  // #endregion
  
  // Ensure score is between 1 and 4
  return Math.max(1, Math.min(4, finalScore));
};

// Generate justification using template
const generateJustification = (score, criterion, language) => {
  const template = JUSTIFICATION_TEMPLATES[language][score];
  const indicatorText = language === 'ar' ? criterion.label_ar : criterion.label_en;
  return template.replace('{indicator_text}', indicatorText);
};

// Generate recommendations
const generateRecommendations = (results, language) => {
  const scores = results.map(r => r.score);
  const hasLowScores = scores.some(s => s <= 2);
  const highScoreCriteria = results.filter(r => r.score >= 3);
  const lowScoreCriteria = results.filter(r => r.score <= 2);

  let recommendations = language === 'ar'
    ? '<h3 style="color:green;">التوصيات</h3>'
    : '<h3 style="color:green;">Recommendations</h3>';

  // Appreciation
  recommendations += language === 'ar'
    ? '<p>شكراً للمعلم على الحصة والجهود المبذولة في تقديم تعليم فعال.</p>'
    : '<p>Thank you to the teacher for the lesson and efforts in delivering effective instruction.</p>';

  // Strengths
  if (highScoreCriteria.length > 0) {
    const strengths = highScoreCriteria.slice(0, 3).map(c => language === 'ar' ? c.criterion.label_ar : c.criterion.label_en);
    recommendations += language === 'ar'
      ? `<p><strong>نقاط القوة:</strong> ${strengths.join('، ')}</p>`
      : `<p><strong>Strengths:</strong> ${strengths.join(', ')}</p>`;
  }

  // Development suggestions
  if (hasLowScores && lowScoreCriteria.length > 0) {
    const suggestions = lowScoreCriteria.map(c => language === 'ar' ? c.criterion.label_ar : c.criterion.label_en);
    recommendations += language === 'ar'
      ? `<p><strong>فرص التطوير:</strong> ${suggestions.join('؛ ')}</p>`
      : `<p><strong>Development Opportunities:</strong> ${suggestions.join('; ')}</p>`;
  }

  return recommendations;
};

// Main evaluation function
export const evaluateObservation = async (observationText, selectedEnvironments) => {
  const language = detectLanguage(observationText);
  const results = [];

  selectedEnvironments.forEach(envId => {
    const environment = ELEOT_ENVIRONMENTS[envId];
    if (!environment) return;

    environment.criteria.forEach(criterion => {
      const score = calculateScore(observationText, criterion, language);
      const justification = generateJustification(score, criterion, language);

      results.push({
        environmentId: envId,
        environmentLabel: language === 'ar' ? environment.label_ar : environment.label_en,
        criterion,
        score,
        justification
      });
    });
  });

  // Calculate total score - accurate average of all criteria, rounded to one decimal
  const totalScore = results.length > 0
    ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / results.length) * 10) / 10
    : 0;

  const recommendations = generateRecommendations(results, language);

  return {
    results,
    totalScore,
    recommendations,
    language
  };
};
