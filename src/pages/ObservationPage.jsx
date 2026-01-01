import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveVisit } from '../services/visitsService';
import { evaluateWithAI } from '../services/aiEvaluationService';

const ObservationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [teacherNameAr, setTeacherNameAr] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeKey, setGradeKey] = useState('');
  const [segment, setSegment] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonDescription, setLessonDescription] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [environmentScores, setEnvironmentScores] = useState([
    { envCode: 'A', avgScore: '', justification: '' },
    { envCode: 'B', avgScore: '', justification: '' },
    { envCode: 'C', avgScore: '', justification: '' },
    { envCode: 'D', avgScore: '', justification: '' },
    { envCode: 'E', avgScore: '', justification: '' },
    { envCode: 'F', avgScore: '', justification: '' },
    { envCode: 'G', avgScore: '', justification: '' },
  ]);
  
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState('');
  const [aiResults, setAiResults] = useState(null);

  const gradeOptions = [
    { value: 'KG1', label: 'KG1' },
    { value: 'KG2', label: 'KG2' },
    { value: 'G1', label: 'G1' },
    { value: 'G2', label: 'G2' },
    { value: 'G3', label: 'G3' },
    { value: 'G4', label: 'G4' },
    { value: 'G5', label: 'G5' },
    { value: 'G6', label: 'G6' },
  ];

  const segmentOptions = [
    { value: 'Beginning', label: 'بداية' },
    { value: 'Middle', label: 'وسط' },
    { value: 'End', label: 'نهاية' },
  ];

  const envLabels = {
    A: 'بيئة التعلم العادلة',
    B: 'بيئة التوقعات العالية',
    C: 'بيئة التعلم الداعمة',
    D: 'بيئة التعلم النشط',
    E: 'بيئة متابعة التقدم والملاحظات',
    F: 'بيئة التعلم المدارة جيداً',
    G: 'بيئة التعلم الرقمي',
  };

  const handleEnvScoreChange = (index, field, value) => {
    const updated = [...environmentScores];
    updated[index][field] = value;
    setEnvironmentScores(updated);
  };

  const handleEvaluateWithAI = async () => {
    if (!lessonDescription.trim()) {
      setMessage('الرجاء إدخال وصف الدرس أولاً');
      return;
    }

    if (!teacherNameAr.trim()) {
      setMessage('الرجاء إدخال اسم المعلم أولاً');
      return;
    }

    if (!subject.trim()) {
      setMessage('الرجاء إدخال المادة أولاً');
      return;
    }

    setEvaluating(true);
    setMessage('');
    setAiResults(null);

    try {
      const result = await evaluateWithAI({
        lesson_description: lessonDescription,
        teacher_name: teacherNameAr,
        subject: subject,
        grade: gradeKey,
        segment: segment,
        visit_date: visitDate,
        lang: 'ar',
      });

      setAiResults(result);

      // Fill environment scores from AI results
      if (result.environments && Array.isArray(result.environments)) {
        const updatedScores = [...environmentScores];
        
        result.environments.forEach((env) => {
          const index = updatedScores.findIndex(e => e.envCode === env.env_code);
          if (index !== -1) {
            updatedScores[index] = {
              ...updatedScores[index],
              avgScore: env.env_score?.toString() || '',
              justification: env.justification_ar || env.evidence_ar || '',
            };
          }
        });

        setEnvironmentScores(updatedScores);
      }

      // Set overall score if available
      if (result.environments && result.environments.length > 0) {
        const avgScore = result.environments.reduce((sum, env) => {
          return sum + (parseFloat(env.env_score) || 0);
        }, 0) / result.environments.length;
        setOverallScore(avgScore.toFixed(2));
      }

      setMessage('تم التقييم بنجاح! يمكنك مراجعة النتائج وتعديلها قبل الحفظ.');
    } catch (error) {
      console.error('AI Evaluation error:', error);
      setMessage(`خطأ في التقييم: ${error.message || 'حدث خطأ أثناء التقييم'}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!teacherNameAr.trim()) {
      setMessage('الرجاء إدخال اسم المعلم');
      return;
    }

    if (!visitDate) {
      setMessage('الرجاء إدخال تاريخ الزيارة');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      // Prepare visit data
      const visitData = {
        teacherNameAr: teacherNameAr.trim(),
        subject: subject || null,
        gradeKey: gradeKey || null,
        segment: segment || null,
        visitDate,
        lessonDescription: lessonDescription || null,
        overallScore: overallScore ? parseFloat(overallScore) : null,
      };

      // Prepare environment scores (only include non-empty ones)
      const envScores = environmentScores
        .filter(env => env.avgScore || env.justification)
        .map(env => ({
          envCode: env.envCode,
          avgScore: env.avgScore ? parseFloat(env.avgScore) : null,
          justification: env.justification || null,
          recommendationsHtml: null,
        }));

      await saveVisit(visitData, envScores);
      
      setMessage('تم حفظ الزيارة بنجاح!');
      setTimeout(() => {
        navigate('/visits');
      }, 1500);
    } catch (error) {
      console.error('Error saving visit:', error);
      setMessage(`خطأ في حفظ الزيارة: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">التقييم</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Teacher Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم المعلم <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={teacherNameAr}
            onChange={(e) => setTeacherNameAr(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Visit Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تاريخ الزيارة <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Subject and Grade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المادة
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الصف
            </label>
            <select
              value={gradeKey}
              onChange={(e) => setGradeKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر الصف</option>
              {gradeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الجزء
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">اختر الجزء</option>
            {segmentOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Lesson Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            وصف الدرس <span className="text-red-500">*</span>
          </label>
          <textarea
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="أدخل وصفاً مفصلاً للدرس والأنشطة والتفاعلات التي لاحظتها..."
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={handleEvaluateWithAI}
              disabled={evaluating || !lessonDescription.trim() || !teacherNameAr.trim() || !subject.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {evaluating ? 'جاري التقييم بالذكاء الاصطناعي...' : 'قيّم باستخدام الذكاء الاصطناعي'}
            </button>
          </div>
        </div>

        {/* Overall Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            النتيجة الإجمالية (0-4)
          </label>
          <input
            type="number"
            min="0"
            max="4"
            step="0.01"
            value={overallScore}
            onChange={(e) => setOverallScore(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Environment Scores */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            درجات البيئات (اختياري)
          </label>
          <div className="space-y-4">
            {environmentScores.map((env, index) => (
              <div key={env.envCode} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  بيئة {env.envCode}: {envLabels[env.envCode]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      المتوسط (0-4)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={env.avgScore}
                      onChange={(e) => handleEnvScoreChange(index, 'avgScore', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      التبرير
                    </label>
                    <textarea
                      value={env.justification}
                      onChange={(e) => handleEnvScoreChange(index, 'justification', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Results Summary */}
        {aiResults && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">نتائج التقييم بالذكاء الاصطناعي</h3>
            {aiResults.overall_recommendations_ar && (
              <div className="mb-3">
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {aiResults.overall_recommendations_ar}
                </p>
              </div>
            )}
            <div className="text-xs text-blue-600">
              المزود: {aiResults.provider || 'N/A'} | النموذج: {aiResults.model || 'N/A'}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('نجاح') || message.includes('success')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الزيارة'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/visits')}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default ObservationPage;
