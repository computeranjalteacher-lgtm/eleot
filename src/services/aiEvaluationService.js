/**
 * Call Netlify Function for AI evaluation
 */
export const evaluateWithAI = async (data) => {
  const {
    lesson_description,
    teacher_name,
    subject,
    grade,
    segment,
    visit_date,
    lang = 'ar',
  } = data;

  if (!lesson_description || !teacher_name || !subject) {
    throw new Error('الحقول المطلوبة: وصف الدرس، اسم المعلم، المادة');
  }

  try {
    const response = await fetch('/.netlify/functions/ai-evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lesson_description,
        teacher_name,
        subject,
        grade: grade || '',
        segment: segment || '',
        visit_date: visit_date || '',
        lang,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('AI Evaluation error:', error);
    throw error;
  }
};

