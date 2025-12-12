import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService';
import { saveObservation } from '../services/observationService';
import { evaluateObservation } from '../services/aiService';
import { exportToPDF, exportToWord, copyAllText } from '../utils/exportUtils';
import { ELEOT_ENVIRONMENTS } from '../config/eleotConfig';
import { LogOut, Save, FileText, Download, Copy, CheckCircle2 } from 'lucide-react';
import EvaluationResults from '../components/EvaluationResults';

const ObservationPage = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  const [selectedEnvironments, setSelectedEnvironments] = useState([]);
  const [observationText, setObservationText] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [saved, setSaved] = useState(false);
  const [language, setLanguage] = useState('en');

  const handleEnvironmentToggle = (envId) => {
    setSelectedEnvironments(prev =>
      prev.includes(envId)
        ? prev.filter(id => id !== envId)
        : [...prev, envId]
    );
  };

  const handleEvaluate = async () => {
    if (!observationText.trim()) {
      alert('Please enter observation notes');
      return;
    }
    if (selectedEnvironments.length === 0) {
      alert('Please select at least one environment to evaluate');
      return;
    }

    setLoading(true);
    setSaved(false);
    try {
      const detectedLang = /[\u0600-\u06FF]/.test(observationText) ? 'ar' : 'en';
      setLanguage(detectedLang);
      
      const result = await evaluateObservation(observationText, selectedEnvironments);
      setEvaluation(result);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Error evaluating observation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!evaluation || !teacherName.trim()) {
      alert('Please complete the evaluation and enter teacher name');
      return;
    }

    try {
      const observationData = {
        date,
        teacherName,
        environments: selectedEnvironments,
        observationText,
        evaluation: {
          results: evaluation.results,
          totalScore: evaluation.totalScore,
          recommendations: evaluation.recommendations,
          language: evaluation.language
        }
      };

      await saveObservation(user.uid, observationData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving observation. Please try again.');
    }
  };

  const handleExportPDF = () => {
    if (!evaluation) return;
    const observation = { date, teacherName, environments: selectedEnvironments };
    exportToPDF(observation, evaluation);
  };

  const handleExportWord = () => {
    if (!evaluation) return;
    const observation = { date, teacherName, environments: selectedEnvironments };
    exportToWord(observation, evaluation);
  };

  const handleCopyAll = () => {
    if (!evaluation) return;
    const observation = { date, teacherName, environments: selectedEnvironments };
    copyAllText(observation, evaluation);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary-700">
                {isRTL ? 'أداة المراقبة الذكية (ELEOT)' : 'Smart Observation Tool (ELEOT)'}
              </h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/visits')}
                className="btn-secondary"
              >
                {isRTL ? 'زياراتي' : 'My Visits'}
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isRTL ? 'تسجيل الخروج' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                {isRTL ? 'معلومات المراقبة' : 'Observation Information'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'التاريخ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'اسم المعلم' : 'Teacher Name'}
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="input-field"
                    placeholder={isRTL ? 'أدخل اسم المعلم' : 'Enter teacher name'}
                  />
                </div>
              </div>
            </div>

            {/* Environment Selection */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                {isRTL ? 'اختر البيئات المطلوب تقييمها' : 'Select Environments to Evaluate'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(ELEOT_ENVIRONMENTS).map(env => (
                  <label
                    key={env.id}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEnvironments.includes(env.id)}
                      onChange={() => handleEnvironmentToggle(env.id)}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="font-medium">{env.id}. {isRTL ? env.label_ar : env.label_en}</div>
                      <div className="text-xs text-gray-500">
                        {env.criteria.length} {isRTL ? 'معيار' : 'criteria'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Observation Text */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                {isRTL ? 'ملاحظات المراقبة' : 'Observation Notes'}
              </h2>
              <textarea
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                className="input-field min-h-[300px] resize-y"
                placeholder={isRTL ? 'الصق أو اكتب ملاحظات المراقبة هنا...' : 'Paste or type observation notes here...'}
              />
              <button
                onClick={handleEvaluate}
                disabled={loading || !observationText.trim() || selectedEnvironments.length === 0}
                className="mt-4 btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isRTL ? 'جارٍ التقييم...' : 'Evaluating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {isRTL ? 'قيّم' : 'Evaluate'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-1">
            {evaluation && (
              <div className="card sticky top-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {isRTL ? 'النتائج' : 'Results'}
                  </h2>
                  <div className="text-2xl font-bold text-primary-600">
                    {evaluation.totalScore}/4
                  </div>
                </div>

                <EvaluationResults evaluation={evaluation} />

                <div className="mt-6 space-y-2">
                  <button
                    onClick={handleSave}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        {isRTL ? 'تم الحفظ' : 'Saved!'}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {isRTL ? 'حفظ المراقبة' : 'Save Observation'}
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleExportPDF}
                      className="btn-secondary flex items-center justify-center gap-1 text-sm py-2"
                      title="Export PDF"
                    >
                      <FileText className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={handleExportWord}
                      className="btn-secondary flex items-center justify-center gap-1 text-sm py-2"
                      title="Export Word"
                    >
                      <Download className="w-4 h-4" />
                      Word
                    </button>
                    <button
                      onClick={handleCopyAll}
                      className="btn-secondary flex items-center justify-center gap-1 text-sm py-2"
                      title="Copy All"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ObservationPage;

