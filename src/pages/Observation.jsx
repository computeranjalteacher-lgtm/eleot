import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ELEOT_SECTIONS, getAllCriteria } from '../config/eleotConfig.js';
import { evaluateObservation } from '../services/aiService.js';
import { saveVisit } from '../services/supabaseService.js';
import { exportToPDF, exportToWord, copyAllText } from '../utils/exportUtils.js';

const Observation = () => {
  const { user } = useAuth();
  const { isRTL, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [observationText, setObservationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);

  const handleSectionToggle = (sectionId) => {
    if (selectedSections.includes(sectionId)) {
      setSelectedSections(selectedSections.filter(id => id !== sectionId));
      const section = ELEOT_SECTIONS.find(s => s.id === sectionId);
      setSelectedCriteria(selectedCriteria.filter(id => 
        !section.criteria.some(c => c.id === id)
      ));
    } else {
      setSelectedSections([...selectedSections, sectionId]);
      const section = ELEOT_SECTIONS.find(s => s.id === sectionId);
      setSelectedCriteria([...selectedCriteria, ...section.criteria.map(c => c.id)]);
    }
  };

  const handleCriterionToggle = (criterionId) => {
    if (selectedCriteria.includes(criterionId)) {
      setSelectedCriteria(selectedCriteria.filter(id => id !== criterionId));
    } else {
      setSelectedCriteria([...selectedCriteria, criterionId]);
    }
  };

  const handleEvaluate = async () => {
    if (!observationText.trim()) {
      alert(isRTL ? 'يرجى إدخال ملاحظات الحصة' : 'Please enter observation notes');
      return;
    }

    if (selectedCriteria.length === 0) {
      alert(isRTL ? 'يرجى اختيار معيار واحد على الأقل' : 'Please select at least one criterion');
      return;
    }

    setLoading(true);
    try {
      const evaluation = await evaluateObservation(observationText, selectedCriteria, language);
      setResults(evaluation);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert(isRTL ? 'خطأ في التقييم' : 'Evaluation error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!results || !user) return;

    setSaving(true);
    try {
      const visitData = {
        teacherName,
        observationText,
        selectedCriteria: selectedCriteria,
        selectedSections: selectedSections,
        results: {
          criteria: results.criteria,
          totalScore: results.totalScore,
          recommendations: results.recommendations,
          language: results.language
        },
      };

      await saveVisit(user.id, visitData);
      alert(isRTL ? 'تم حفظ الزيارة بنجاح' : 'Visit saved successfully');
      navigate('/visits');
    } catch (error) {
      console.error('Error saving visit:', error);
      alert(isRTL ? 'خطأ في حفظ الزيارة' : 'Error saving visit');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (!results) return;
    const observationData = {
      teacherName,
      date: new Date().toISOString(),
      criteria: results.criteria,
      recommendations: results.recommendations
    };
    exportToPDF(observationData, language);
  };

  const handleExportWord = () => {
    if (!results) return;
    const observationData = {
      teacherName,
      date: new Date().toISOString(),
      criteria: results.criteria,
      recommendations: results.recommendations
    };
    exportToWord(observationData, language);
  };

  const handleCopyAll = async () => {
    if (!results) return;
    const observationData = {
      teacherName,
      date: new Date().toISOString(),
      criteria: results.criteria,
      recommendations: results.recommendations
    };
    const success = await copyAllText(observationData, language);
    if (success) {
      alert(isRTL ? 'تم النسخ' : 'Copied to clipboard');
    }
  };

  const copyJustification = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(isRTL ? 'تم النسخ' : 'Copied');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {isRTL ? 'صفحة التقييم' : 'Evaluation Page'}
        </h1>
        <button
          onClick={() => navigate('/visits')}
          className="btn-secondary"
        >
          {isRTL ? 'الزيارات' : 'Visits'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              {isRTL ? 'اختر البيئات' : 'Select Environments'}
            </h2>
            
            <div className="space-y-4">
              {ELEOT_SECTIONS.map(section => (
                <div key={section.id} className="border rounded-lg p-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={() => handleSectionToggle(section.id)}
                      className="mr-2 ml-2"
                    />
                    <span className="font-medium">
                      {section.id}. {isRTL ? section.label_ar : section.label_en}
                    </span>
                  </label>
                  
                  {selectedSections.includes(section.id) && (
                    <div className="mt-2 mr-6 space-y-2">
                      {section.criteria.map(criterion => (
                        <label key={criterion.id} className="flex items-start cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCriteria.includes(criterion.id)}
                            onChange={() => handleCriterionToggle(criterion.id)}
                            className="mt-1 mr-2 ml-2"
                          />
                          <span>
                            {criterion.id}: {isRTL ? criterion.label_ar : criterion.label_en}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <label className="block mb-2 font-semibold">
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

          <div className="card">
            <label className="block mb-2 font-semibold">
              {isRTL ? 'اللغة' : 'Language'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Right Column: Observation Text and Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <label className="block mb-2 font-semibold">
              {isRTL ? 'ملاحظات الحصة' : 'Lesson Observation Notes'}
            </label>
            <textarea
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              className="input-field min-h-[300px]"
              placeholder={isRTL ? 'أدخل ملاحظاتك عن الحصة هنا...' : 'Enter your observation notes here...'}
            />
            
            <button
              onClick={handleEvaluate}
              disabled={loading || !observationText.trim() || selectedCriteria.length === 0}
              className="btn-primary mt-4 w-full"
            >
              {loading ? (isRTL ? 'جارٍ التقييم...' : 'Evaluating...') : (isRTL ? 'قيّم' : 'Evaluate')}
            </button>
          </div>

          {results && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {isRTL ? 'النتائج' : 'Results'}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="btn-secondary text-sm"
                  >
                    {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                  </button>
                  <button onClick={handleExportPDF} className="btn-secondary text-sm">
                    PDF
                  </button>
                  <button onClick={handleExportWord} className="btn-secondary text-sm">
                    Word
                  </button>
                  <button onClick={handleCopyAll} className="btn-secondary text-sm">
                    {isRTL ? 'نسخ الكل' : 'Copy All'}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-lg font-semibold">
                  {isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:'} {results.totalScore.toFixed(1)}/4
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="border p-2 text-right">{isRTL ? 'المعيار' : 'Criterion'}</th>
                      <th className="border p-2">{isRTL ? 'الدرجة' : 'Score'}</th>
                      <th className="border p-2">{isRTL ? 'التبرير' : 'Justification'}</th>
                      <th className="border p-2">{isRTL ? 'نسخ' : 'Copy'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.criteria.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="border p-2">
                          <div className="font-medium">{item.id}</div>
                          <div className="text-sm text-gray-600">
                            {language === 'ar' ? item.criterion.label_ar : item.criterion.label_en}
                          </div>
                        </td>
                        <td className="border p-2 text-center">
                          <span className={`font-bold text-lg ${
                            item.score === 4 ? 'text-green-600' :
                            item.score === 3 ? 'text-blue-600' :
                            item.score === 2 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.score}
                          </span>
                        </td>
                        <td className="border p-2 text-sm">{item.justification}</td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={() => copyJustification(item.justification)}
                            className="text-primary hover:text-blue-600 text-sm"
                          >
                            {isRTL ? 'نسخ' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.recommendations && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div 
                    dangerouslySetInnerHTML={{ __html: results.recommendations }}
                    className="prose max-w-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Observation;
