import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getVisit, deleteVisit } from '../services/supabaseService';
import { exportToPDF } from '../utils/exportUtils';
import { ELEOT_SECTIONS } from '../config/eleotConfig';

const VisitView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isRTL, language } = useLanguage();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  const loadVisit = async () => {
    try {
      const data = await getVisit(id);
      setVisit(data);
    } catch (error) {
      console.error('Error loading visit:', error);
      alert(isRTL ? 'خطأ في تحميل الزيارة' : 'Error loading visit');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الزيارة؟' : 'Are you sure you want to delete this visit?')) {
      return;
    }
    try {
      await deleteVisit(id);
      navigate('/visits');
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert(isRTL ? 'خطأ في حذف الزيارة' : 'Error deleting visit');
    }
  };

  const handleExportPDF = () => {
    if (!visit || !visit.results) return;
    const observationData = {
      teacherName: visit.teacher_name,
      date: visit.created_at,
      criteria: visit.results.criteria || [],
      recommendations: visit.results.recommendations,
    };
    exportToPDF(observationData, visit.results.language || language);
  };

  const copyJustification = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(isRTL ? 'تم النسخ' : 'Copied');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-lg">
          {isRTL ? 'الزيارة غير موجودة' : 'Visit not found'}
        </p>
        <button onClick={() => navigate('/visits')} className="btn-primary mt-4">
          {isRTL ? 'العودة للزيارات' : 'Back to Visits'}
        </button>
      </div>
    );
  }

  const visitLanguage = visit.results?.language || language;
  const results = visit.results || {};

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}
        </h1>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-secondary">
            PDF
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
            {isRTL ? 'حذف' : 'Delete'}
          </button>
          <button onClick={() => navigate('/visits')} className="btn-secondary">
            {isRTL ? 'العودة' : 'Back'}
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {isRTL ? 'معلومات الزيارة' : 'Visit Information'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {isRTL ? 'اسم المعلم:' : 'Teacher Name:'}
            </p>
            <p className="font-medium">{visit.teacher_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              {isRTL ? 'التاريخ:' : 'Date:'}
            </p>
            <p className="font-medium">{formatDate(visit.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {isRTL ? 'ملاحظات الحصة' : 'Observation Notes'}
        </h2>
        <p className="text-gray-700 whitespace-pre-wrap">{visit.observation_text}</p>
      </div>

      {results.criteria && results.criteria.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isRTL ? 'النتائج' : 'Results'}
            </h2>
            {results.totalScore && (
              <span className="text-lg font-semibold text-primary">
                {isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:'} {results.totalScore.toFixed(1)}/4
              </span>
            )}
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
                {results.criteria.map((item, idx) => {
                  const criterion = item.criterion || {};
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="border p-2">
                        <div className="font-medium">{item.id}</div>
                        <div className="text-sm text-gray-600">
                          {visitLanguage === 'ar' ? criterion.label_ar : criterion.label_en}
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
                  );
                })}
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
  );
};

export default VisitView;


