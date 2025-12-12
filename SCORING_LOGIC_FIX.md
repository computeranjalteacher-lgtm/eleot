# CRITICAL FIX: SCORING LOGIC FAILURE ON NEGATIVE INPUT

## Problem Analysis

### Current Issue
When users answer "No" to clarification questions, the LLM does not reduce the observation score accordingly. This violates the ELEOT 2.0 logic requirements.

### Root Causes

1. **Weak Clarification Integration:** Clarification answers are appended as simple bullet points (`- key: value`), which don't create strong enough semantic signals for the LLM.

2. **Missing Strict Rules in System Prompt:** The current System Prompt lacks explicit mandatory rules (R.1 and R.2) that enforce score reduction based on "No" answers.

3. **Ambiguous Narrative Updates:** The LLM receives the original narrative plus weak clarification text, instead of a reinforced narrative that explicitly states what was NOT observed.

---

## Solution Overview

### Two-Part Fix

1. **Code Enhancement:** Update `buildUserPrompt()` to convert "No" answers into explicit, definitive statements that are integrated into the narrative.

2. **System Prompt Reinforcement:** Add strict conditional scoring rules (R.1 and R.2) that mandate score 1 (Not Observed) when key elements are explicitly absent.

---

## SECTION 1: Updated Code Logic

### Current Implementation (Lines 969-976)

```javascript
// Add clarification answers if available
let clarificationText = '';
if (Object.keys(clarificationAnswers).length > 0) {
  clarificationText = '\n\n**Additional Clarification Information:**\n';
  Object.entries(clarificationAnswers).forEach(([key, value]) => {
    clarificationText += `- ${key}: ${value}\n`;
  });
}
```

**Problem:** Generic key-value pairs don't create strong semantic signals.

### Enhanced Implementation

```javascript
/**
 * Build clarification text with explicit negative statements
 * Compliance: B.3, E.4 - Enforces score reduction on "No" answers
 */
const buildClarificationText = (clarificationAnswers, language) => {
  if (!clarificationAnswers || Object.keys(clarificationAnswers).length === 0) {
    return '';
  }
  
  let clarificationText = language === 'ar' 
    ? '\n\n**معلومات توضيحية مؤكدة من المشرف:**\n\n' 
    : '\n\n**Confirmed Clarification Information from Observer:**\n\n';
  
  // Map of question keys to explicit statements
  const statementTemplates = {
    // Environment A
    'A1_differentiated': {
      yes_ar: 'المشرف أكد: تم توفير أنشطة تعلم متمايزة للطلاب حسب احتياجاتهم.',
      yes_en: 'Observer confirmed: Differentiated learning activities were provided to meet student needs.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يتم توفير أنشطة تعلم متمايزة. جميع الطلاب كانوا يقومون بنفس المهام بنفس الطريقة. (المعيار A1 = غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: NO differentiated learning activities were provided. All students were doing the same tasks in the same way. (Criterion A1 = Not Observed)',
      unclear_ar: 'المشرف: التمايز في الأنشطة غير واضح من الملاحظة.',
      unclear_en: 'Observer: Differentiation in activities was unclear from observation.'
    },
    'A2_equal_access': {
      yes_ar: 'المشرف أكد: جميع الطلاب لديهم وصول متساوٍ للموارد والتكنولوجيا.',
      yes_en: 'Observer confirmed: All students had equal access to resources and technology.',
      no_ar: '⛔ المشرف أكد: بعض الطلاب لم يكن لديهم وصول متساوٍ للموارد أو التكنولوجيا. (المعيار A2 = غير ملاحظ أو ضعيف)',
      no_en: '⛔ Observer confirmed: Some students did NOT have equal access to resources or technology. (Criterion A2 = Not Observed or Weak)',
      unclear_ar: 'المشرف: الوصول المتساوٍ للموارد غير واضح.',
      unclear_en: 'Observer: Equal access to resources was unclear.'
    },
    
    // Environment B
    'B2_challenging': {
      yes_ar: 'المشرف أكد: الأنشطة كانت صعبة ومحفزة للتفكير.',
      yes_en: 'Observer confirmed: Activities were challenging and intellectually stimulating.',
      no_ar: '⛔ المشرف أكد: الأنشطة كانت سهلة جداً ولا تشكل تحدياً للطلاب. (المعيار B2 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Activities were too easy and did NOT challenge students. (Criterion B2 = Not Observed)',
      unclear_ar: 'المشرف: مستوى التحدي في الأنشطة غير واضح.',
      unclear_en: 'Observer: Challenge level of activities was unclear.'
    },
    'B3_rubrics': {
      yes_ar: 'المشرف أكد: تم توضيح معايير واضحة للعمل الجيد (rubrics/criteria).',
      yes_en: 'Observer confirmed: Clear criteria/rubrics for quality work were provided.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يتم توضيح أي معايير أو rubrics للطلاب. لم يعرف الطلاب ما هو العمل الجيد. (المعيار B3 = درجة 1 إلزامية - غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: NO criteria or rubrics were provided to students. Students did NOT know what constitutes quality work. (Criterion B3 = MANDATORY SCORE 1 - Not Observed)',
      unclear_ar: 'المشرف: وضوح المعايير غير مؤكد.',
      unclear_en: 'Observer: Clarity of criteria was uncertain.'
    },
    'B4_higher_order': {
      yes_ar: 'المشرف أكد: الطلاب شاركوا في مهام تتطلب تفكير عالي المستوى (تحليل، تقييم، تركيب).',
      yes_en: 'Observer confirmed: Students engaged in higher-order thinking tasks (analysis, evaluation, synthesis).',
      no_ar: '⛔ المشرف أكد: المهام كانت محصورة في الحفظ والتذكر فقط، بدون تفكير عالي المستوى. (المعيار B4 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Tasks were limited to memorization/recall only, with NO higher-order thinking. (Criterion B4 = Not Observed)',
      unclear_ar: 'المشرف: مستوى التفكير المطلوب غير واضح.',
      unclear_en: 'Observer: Level of thinking required was unclear.'
    },
    
    // Environment C
    'C3_teacher_support': {
      yes_ar: 'المشرف أكد: المعلم قدم دعماً واضحاً للطلاب (توجيه، توضيح، مساعدة فردية).',
      yes_en: 'Observer confirmed: Teacher provided clear support (guidance, clarification, individual help).',
      no_ar: '⛔ المشرف أكد: لم يقدم المعلم أي دعم أو توضيح للطلاب. (المعيار C3 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Teacher did NOT provide any support or clarification to students. (Criterion C3 = Not Observed)',
      unclear_ar: 'المشرف: مستوى الدعم المقدم غير واضح.',
      unclear_en: 'Observer: Level of support provided was unclear.'
    },
    'C4_peer_support': {
      yes_ar: 'المشرف أكد: الطلاب دعموا بعضهم البعض (تعاون، مساعدة).',
      yes_en: 'Observer confirmed: Students supported each other (collaboration, peer help).',
      no_ar: '⛔ المشرف أكد: لم يحدث أي دعم بين الأقران. كل طالب كان يعمل بمفرده. (المعيار C4 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO peer support occurred. Each student worked in isolation. (Criterion C4 = Not Observed)',
      unclear_ar: 'المشرف: التعاون بين الأقران غير واضح.',
      unclear_en: 'Observer: Peer collaboration was unclear.'
    },
    
    // Environment D
    'D1_discussions': {
      yes_ar: 'المشرف أكد: حدثت مناقشات وحوارات بين الطلاب والمعلم.',
      yes_en: 'Observer confirmed: Discussions and dialogues between students and teacher occurred.',
      no_ar: '⛔ المشرف أكد: لم تحدث أي مناقشات. المعلم كان يتحدث فقط والطلاب يستمعون. (المعيار D1 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO discussions occurred. Teacher lectured and students only listened. (Criterion D1 = Not Observed)',
      unclear_ar: 'المشرف: وجود المناقشات غير واضح.',
      unclear_en: 'Observer: Presence of discussions was unclear.'
    },
    'D2_real_life': {
      yes_ar: 'المشرف أكد: ربط الطلاب المحتوى بتجارب الحياة الحقيقية.',
      yes_en: 'Observer confirmed: Students connected content to real-life experiences.',
      no_ar: '⛔ المشرف أكد: لم يتم ربط المحتوى بالحياة الحقيقية. المحتوى كان نظرياً ومجرداً. (المعيار D2 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Content was NOT connected to real life. Content remained theoretical and abstract. (Criterion D2 = Not Observed)',
      unclear_ar: 'المشرف: الربط بالحياة الحقيقية غير واضح.',
      unclear_en: 'Observer: Connection to real life was unclear.'
    },
    'D4_collaboration': {
      yes_ar: 'المشرف أكد: تعاون الطلاب مع أقرانهم في المشاريع/الأنشطة.',
      yes_en: 'Observer confirmed: Students collaborated with peers on projects/activities.',
      no_ar: '⛔ المشرف أكد: لم يحدث أي تعاون. كل طالب عمل بشكل فردي. (المعيار D4 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO collaboration occurred. Each student worked individually. (Criterion D4 = Not Observed)',
      unclear_ar: 'المشرف: التعاون غير واضح.',
      unclear_en: 'Observer: Collaboration was unclear.'
    },
    
    // Environment E
    'E2_feedback': {
      yes_ar: 'المشرف أكد: تلقى الطلاب تغذية راجعة واضحة من المعلم أو الأقران.',
      yes_en: 'Observer confirmed: Students received clear feedback from teacher or peers.',
      no_ar: '⛔ المشرف أكد: لم يتلق الطلاب أي تغذية راجعة على عملهم. (المعيار E2 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students did NOT receive any feedback on their work. (Criterion E2 = Not Observed)',
      unclear_ar: 'المشرف: التغذية الراجعة غير واضحة.',
      unclear_en: 'Observer: Feedback was unclear.'
    },
    'E3_self_assessment': {
      yes_ar: 'المشرف أكد: قيّم الطلاب أنفسهم أو استخدموا أدوات للتقييم الذاتي.',
      yes_en: 'Observer confirmed: Students self-assessed or used tools for self-evaluation.',
      no_ar: '⛔ المشرف أكد: لم يحدث أي تقييم ذاتي. الطلاب لم يراجعوا عملهم. (المعيار E3 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: NO self-assessment occurred. Students did not review their work. (Criterion E3 = Not Observed)',
      unclear_ar: 'المشرف: التقييم الذاتي غير واضح.',
      unclear_en: 'Observer: Self-assessment was unclear.'
    },
    'E4_assessment_understanding': {
      yes_ar: 'المشرف أكد: فهم الطلاب كيف سيتم تقييمهم.',
      yes_en: 'Observer confirmed: Students understood how they would be assessed.',
      no_ar: '⛔ المشرف أكد بشكل قاطع: لم يفهم الطلاب كيف سيتم تقييمهم. لم يتم توضيح معايير التقييم. (المعيار E4 = درجة 1 إلزامية - غير ملاحظ)',
      no_en: '⛔ Observer definitively confirmed: Students did NOT understand how they would be assessed. Assessment criteria were NOT explained. (Criterion E4 = MANDATORY SCORE 1 - Not Observed)',
      unclear_ar: 'المشرف: فهم الطلاب لمعايير التقييم غير مؤكد.',
      unclear_en: 'Observer: Student understanding of assessment criteria was uncertain.'
    },
    
    // Environment F
    'F1_clear_expectations': {
      yes_ar: 'المشرف أكد: كانت توقعات السلوك واضحة للطلاب.',
      yes_en: 'Observer confirmed: Behavioral expectations were clear to students.',
      no_ar: '⛔ المشرف أكد: توقعات السلوك لم تكن واضحة. حدثت فوضى أو سلوكيات غير مناسبة. (المعيار F1 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Behavioral expectations were NOT clear. Chaos or inappropriate behaviors occurred. (Criterion F1 = Not Observed)',
      unclear_ar: 'المشرف: وضوح توقعات السلوك غير مؤكد.',
      unclear_en: 'Observer: Clarity of behavioral expectations was uncertain.'
    },
    'F2_respectful_interactions': {
      yes_ar: 'المشرف أكد: تعامل الطلاب مع بعضهم بأدب واحترام.',
      yes_en: 'Observer confirmed: Students interacted respectfully with each other.',
      no_ar: '⛔ المشرف أكد: حدثت تفاعلات غير محترمة أو فوضوية بين الطلاب. (المعيار F2 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Disrespectful or chaotic interactions occurred between students. (Criterion F2 = Not Observed)',
      unclear_ar: 'المشرف: التفاعلات بين الطلاب غير واضحة.',
      unclear_en: 'Observer: Student interactions were unclear.'
    },
    'F3_transitions': {
      yes_ar: 'المشرف أكد: كانت الانتقالات بين الأنشطة سلسة وفعالة.',
      yes_en: 'Observer confirmed: Transitions between activities were smooth and efficient.',
      no_ar: '⛔ المشرف أكد: كانت الانتقالات فوضوية وأضاعت الوقت. (المعيار F3 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Transitions were chaotic and wasted time. (Criterion F3 = Not Observed)',
      unclear_ar: 'المشرف: جودة الانتقالات غير واضحة.',
      unclear_en: 'Observer: Quality of transitions was unclear.'
    },
    'F4_time_use': {
      yes_ar: 'المشرف أكد: استخدم الطلاب الوقت بشكل هادف وفعال.',
      yes_en: 'Observer confirmed: Students used time purposefully and effectively.',
      no_ar: '⛔ المشرف أكد: أضاع الطلاب الوقت. لم يكن الوقت مستخدماً بفعالية. (المعيار F4 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students wasted time. Time was NOT used effectively. (Criterion F4 = Not Observed)',
      unclear_ar: 'المشرف: استخدام الوقت غير واضح.',
      unclear_en: 'Observer: Time use was unclear.'
    },
    
    // Environment G
    'G1_digital_info': {
      yes_ar: 'المشرف أكد: استخدم الطلاب أدوات رقمية لجمع/استخدام المعلومات.',
      yes_en: 'Observer confirmed: Students used digital tools to gather/use information.',
      no_ar: '⛔ المشرف أكد: لم يستخدم الطلاب أي أدوات رقمية. الحصة كانت تقليدية بالكامل. (المعيار G1 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students did NOT use any digital tools. Lesson was entirely traditional. (Criterion G1 = Not Observed)',
      unclear_ar: 'المشرف: استخدام الأدوات الرقمية غير واضح.',
      unclear_en: 'Observer: Use of digital tools was unclear.'
    },
    'G2_digital_solving': {
      yes_ar: 'المشرف أكد: استخدم الطلاب أدوات رقمية لحل المشكلات/إنشاء محتوى.',
      yes_en: 'Observer confirmed: Students used digital tools for problem-solving/content creation.',
      no_ar: '⛔ المشرف أكد: لم يستخدم الطلاب أدوات رقمية لحل المشكلات أو إنشاء محتوى. (المعيار G2 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students did NOT use digital tools for problem-solving or content creation. (Criterion G2 = Not Observed)',
      unclear_ar: 'المشرف: استخدام الأدوات الرقمية لحل المشكلات غير واضح.',
      unclear_en: 'Observer: Use of digital tools for problem-solving was unclear.'
    },
    'G3_digital_communication': {
      yes_ar: 'المشرف أكد: استخدم الطلاب أدوات رقمية للتواصل/التعاون.',
      yes_en: 'Observer confirmed: Students used digital tools for communication/collaboration.',
      no_ar: '⛔ المشرف أكد: لم يستخدم الطلاب أي أدوات رقمية للتواصل. (المعيار G3 = غير ملاحظ)',
      no_en: '⛔ Observer confirmed: Students did NOT use any digital tools for communication. (Criterion G3 = Not Observed)',
      unclear_ar: 'المشرف: التواصل الرقمي غير واضح.',
      unclear_en: 'Observer: Digital communication was unclear.'
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
  
  return clarificationText;
};
```

### Integration into `buildUserPrompt`

Replace lines 969-976 with:

```javascript
// V3 FIX: Build explicit clarification text with definitive statements
const clarificationText = buildClarificationText(clarificationAnswers, language);
```

---

## SECTION 2: Updated System Prompt

### Enhanced System Prompt with Strict Rules

Add the following section after "CORE DIRECTIVES" in the System Prompt:

```text
### STRICT CONDITIONAL SCORING RULES (CRITICAL)

**Rule R.1 (Mandatory Score 1 - Not Observed):**
If the final narrative (including confirmed clarification information) explicitly states that ANY of the following key elements are MISSING or NOT OBSERVED, you MUST assign a score of **1 (Not Observed)** to the corresponding criterion, regardless of any initial assessment:

- **B.3 (Rubrics/Criteria):** If the narrative states "NO criteria/rubrics were provided" or "students did NOT know what constitutes quality work"
- **E.4 (Assessment Understanding):** If the narrative states "students did NOT understand how they would be assessed" or "assessment criteria were NOT explained"
- **A.1 (Differentiation):** If the narrative states "NO differentiated activities were provided" or "all students did the same tasks"
- **D.1 (Discussions):** If the narrative states "NO discussions occurred" or "teacher only lectured"
- **D.4 (Collaboration):** If the narrative states "NO collaboration occurred" or "students worked individually only"
- **G.1/G.2/G.3 (Digital Learning):** If the narrative states "NO digital tools were used" or "lesson was entirely traditional"

**Rule R.2 (Override Initial Score):**
The final score is based ONLY on the **complete, final narrative** (original observation + confirmed clarification information). If the clarification section contains a definitive statement marked with ⛔ (e.g., "⛔ Observer definitively confirmed: NO rubrics were provided"), this OVERRIDES any ambiguous evidence from the initial observation. You MUST score based on what was DEFINITIVELY CONFIRMED, not on what was initially unclear.

**Rule R.3 (Text Analysis Quality):**
Analysis must be rooted in the ELEOT 2.0 Ratings Guide. Focus on the four weighted factors:
1. **Routine/Systemic:** How frequently/consistently was the behavior observed?
2. **Quality:** How well was it executed?
3. **Quantity:** How many students were involved?
4. **Frequency:** How often did it occur during the observation?

Justifications must be direct, logical inferences from the evidence in the final narrative. If the narrative explicitly states an element was NOT observed (especially in clarification statements), the score MUST be 1.
```

### Full Updated System Prompt (English)

```text
### ROLE & PERSONA

You are an expert Educational Supervisor and Instructional Leader specialized in Gifted Education. Your tone is professional, formal, objective, and constructive. You are evaluating a lesson based on the ELEOT observation tool.

### CORE DIRECTIVES

1. **INPUT INTEGRITY:** You will receive a narrative description of a lesson observation. You must analyze it objectively and assign scores based STRICTLY on the evidence provided.

2. **LANGUAGE STRICTNESS:**
   - If the narrative is in Arabic, the ENTIRE output must be in Arabic.
   - If the narrative is in English, the ENTIRE output must be in English.
   - Never mix languages.

### STRICT CONDITIONAL SCORING RULES (CRITICAL)

**Rule R.1 (Mandatory Score 1 - Not Observed):**
If the final narrative (including confirmed clarification information) explicitly states that ANY of the following key elements are MISSING or NOT OBSERVED, you MUST assign a score of **1 (Not Observed)** to the corresponding criterion, regardless of any initial assessment:

- **B.3 (Rubrics/Criteria):** If the narrative states "NO criteria/rubrics were provided" or "students did NOT know what constitutes quality work"
- **E.4 (Assessment Understanding):** If the narrative states "students did NOT understand how they would be assessed" or "assessment criteria were NOT explained"
- **A.1 (Differentiation):** If the narrative states "NO differentiated activities were provided" or "all students did the same tasks"
- **D.1 (Discussions):** If the narrative states "NO discussions occurred" or "teacher only lectured"
- **D.4 (Collaboration):** If the narrative states "NO collaboration occurred" or "students worked individually only"
- **G.1/G.2/G.3 (Digital Learning):** If the narrative states "NO digital tools were used" or "lesson was entirely traditional"

**Rule R.2 (Override Initial Score):**
The final score is based ONLY on the **complete, final narrative** (original observation + confirmed clarification information). If the clarification section contains a definitive statement marked with ⛔ (e.g., "⛔ Observer definitively confirmed: NO rubrics were provided"), this OVERRIDES any ambiguous evidence from the initial observation. You MUST score based on what was DEFINITIVELY CONFIRMED, not on what was initially unclear.

**Rule R.3 (Text Analysis Quality):**
Analysis must be rooted in the ELEOT 2.0 Ratings Guide. Focus on the four weighted factors:
1. **Routine/Systemic:** How frequently/consistently was the behavior observed?
2. **Quality:** How well was it executed?
3. **Quantity:** How many students were involved?
4. **Frequency:** How often did it occur during the observation?

Justifications must be direct, logical inferences from the evidence in the final narrative. If the narrative explicitly states an element was NOT observed (especially in clarification statements), the score MUST be 1.

### SCORING SCALE

- **4 (Very Evident):** Clear, strong, frequent evidence across most/all students
- **3 (Evident):** Clear evidence for some students, or moderate evidence for most
- **2 (Somewhat Evident):** Weak/infrequent evidence, or only a few students
- **1 (Not Observed):** No evidence, explicitly absent, or definitively confirmed as missing

### OUTPUT REQUIREMENTS

Your output must be valid JSON with the following structure:
- "recommendations": Merged recommendations section (only if scores 1 or 2 exist)
- "criteria": Array of objects with id, score, justification, improvement
- "totalScore": Average of all scores

**CRITICAL:** If a clarification statement explicitly confirms an element is NOT observed (especially B.3 or E.4), you MUST assign score 1 to that criterion.
```

---

## Implementation Steps

### Step 1: Add Helper Function

Add the `buildClarificationText()` function before `buildUserPrompt()` in `popup.js` (around line 962):

```javascript
/**
 * Build clarification text with explicit negative statements
 * Compliance: B.3, E.4 - Enforces score reduction on "No" answers
 */
const buildClarificationText = (clarificationAnswers, language) => {
  // ... full function code from Section 1 above
};
```

### Step 2: Update `buildUserPrompt()`

Replace lines 969-976:

```javascript
// V3 FIX: Build explicit clarification text with definitive statements
const clarificationText = buildClarificationText(clarificationAnswers, language);
```

### Step 3: Update System Prompt

Update `config/eleot_ai_config.json`:

1. Locate the `system_prompt.text` field
2. Insert the new "STRICT CONDITIONAL SCORING RULES" section after "CORE DIRECTIVES"
3. Ensure the full updated System Prompt from Section 2 is used

---

## Testing Scenarios

### Test Case 1: B.3 Rubrics (Critical)

**Input Narrative:**
```
"المعلم شرح الدرس بوضوح. الطلاب استمعوا باهتمام."
```

**Clarification Question:** "هل تم توضيح معايير واضحة للعمل الجيد؟"

**User Answer:** "لا، لم يتم توضيح (No, not clarified)"

**Expected Clarification Text:**
```
⛔ المشرف أكد بشكل قاطع: لم يتم توضيح أي معايير أو rubrics للطلاب. لم يعرف الطلاب ما هو العمل الجيد. (المعيار B3 = درجة 1 إلزامية - غير ملاحظ)
```

**Expected Score:** B.3 = 1 (Not Observed)

### Test Case 2: E.4 Assessment Understanding (Critical)

**Input Narrative:**
```
"Students worked on worksheets. Teacher walked around the class."
```

**Clarification Question:** "Did students understand how they would be assessed?"

**User Answer:** "No, did not understand"

**Expected Clarification Text:**
```
⛔ Observer definitively confirmed: Students did NOT understand how they would be assessed. Assessment criteria were NOT explained. (Criterion E4 = MANDATORY SCORE 1 - Not Observed)
```

**Expected Score:** E.4 = 1 (Not Observed)

### Test Case 3: A.1 Differentiation

**Input Narrative:**
```
"المعلم أعطى الطلاب مهمة واحدة."
```

**Clarification Question:** "هل تم توفير أنشطة متمايزة؟"

**User Answer:** "لا (No)"

**Expected Score:** A.1 = 1 (Not Observed)

---

## Expected Results

### Before Fix
- User answers "No" → LLM still assigns score 3 or 4 (based on ambiguous initial narrative)
- No explicit enforcement of score reduction
- Weak semantic signals from clarification answers

### After Fix
- User answers "No" → Explicit statement: "⛔ Observer confirmed: NOT observed"
- System Prompt Rule R.1 mandates score 1
- LLM receives strong semantic signal: "MANDATORY SCORE 1"
- Score reduction is enforced correctly

---

## Compliance with ELEOT 2.0

This fix ensures strict compliance with:
- **B.3 (Criteria/Standards):** Mandatory score 1 if rubrics/criteria are absent
- **E.4 (Assessment Understanding):** Mandatory score 1 if students don't understand assessment
- **A.1 (Differentiation):** Proper scoring when differentiation is absent
- **All Criteria:** Correct scoring based on definitive observer confirmation

The enhanced logic creates a deterministic, rule-based scoring system that properly integrates clarification answers and enforces ELEOT 2.0 requirements.






