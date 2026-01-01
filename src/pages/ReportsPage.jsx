import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTeachers } from '../services/visitsService';
import { getTeacherReport, getTeacherById } from '../services/reportsService';
import { exportTeacherReportToPDF, exportTeacherReportToWord, exportTeacherReportToCSV } from '../utils/exportTeacherReport';

const ReportsPage = () => {
  const { user } = useAuth();
  
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  const envLabels = {
    A: 'بيئة التعلم العادلة',
    B: 'بيئة التوقعات العالية',
    C: 'بيئة التعلم الداعمة',
    D: 'بيئة التعلم النشط',
    E: 'بيئة متابعة التقدم والملاحظات',
    F: 'بيئة التعلم المدارة جيداً',
    G: 'بيئة التعلم الرقمي',
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeachers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTeachers = async () => {
    try {
      const data = await getTeachers(searchTerm);
      setTeachers(data);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTeacherId) {
      alert('الرجاء اختيار معلم');
      return;
    }

    setLoading(true);
    try {
      const teacher = await getTeacherById(selectedTeacherId);
      setSelectedTeacher(teacher);
      
      const reportData = await getTeacherReport(selectedTeacherId);
      setReport(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('خطأ في إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedTeacher || !report) return;

    setExporting(true);
    try {
      if (format === 'pdf') {
        await exportTeacherReportToPDF(selectedTeacher, report);
      } else if (format === 'word') {
        exportTeacherReportToWord(selectedTeacher, report);
      } else if (format === 'csv') {
        exportTeacherReportToCSV(selectedTeacher, report);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('خطأ في تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">التقارير</h1>
      </div>

      {/* Teacher Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">اختر المعلم</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن معلم..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر المعلم</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading || !selectedTeacherId}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
        </button>
      </div>

      {/* Report Results */}
      {report && selectedTeacher && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-3xl font-bold text-blue-600">{selectedTeacher.name_ar}</div>
              <div className="text-sm text-gray-600 mt-1">المعلم</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-3xl font-bold text-green-600">{report.totalVisits}</div>
              <div className="text-sm text-gray-600 mt-1">إجمالي الزيارات</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-3xl font-bold text-purple-600">{report.best3Visits.length}</div>
              <div className="text-sm text-gray-600 mt-1">أفضل 3 زيارات</div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex gap-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                تصدير PDF
              </button>
              <button
                onClick={() => handleExport('word')}
                disabled={exporting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                تصدير Word
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                تصدير CSV
              </button>
            </div>
          </div>

          {/* Average Per Environment */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">متوسط الدرجات (أفضل 3 زيارات)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      البيئة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المتوسط
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(envCode => {
                    const avg = report.avgPerEnvironment[envCode];
                    return (
                      <tr key={envCode}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          بيئة {envCode}: {envLabels[envCode]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {avg !== null && avg !== undefined ? `${avg.toFixed(2)} / 4.0` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Improvement Comparison */}
          {report.improvement && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">مقارنة التحسن</h2>
              <div className="mb-4">
                <p className="text-lg">
                  <strong>التغيير في النتيجة الإجمالية:</strong>{' '}
                  <span className={report.improvement.deltaOverall >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {report.improvement.deltaOverall >= 0 ? '+' : ''}
                    {report.improvement.deltaOverall.toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        البيئة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        أول زيارة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        آخر زيارة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التغيير
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(envCode => {
                      const firstScore = report.improvement.firstVisit.envScores?.find(s => s.env_code === envCode)?.avg_score;
                      const lastScore = report.improvement.lastVisit.envScores?.find(s => s.env_code === envCode)?.avg_score;
                      const delta = report.improvement.deltaPerEnv[envCode];
                      const isWeak = report.improvement.weakEnvironments?.includes(envCode);
                      
                      return (
                        <tr key={envCode}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            بيئة {envCode}: {envLabels[envCode]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {firstScore || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lastScore || '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            delta !== null && delta !== undefined
                              ? delta >= 0 ? 'text-green-600' : 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {delta !== null && delta !== undefined 
                              ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${isWeak ? 'text-red-600' : 'text-green-600'}`}>
                              {isWeak ? 'ضعيف' : 'جيد'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {report.improvement.weakEnvironments.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>البيئات الضعيفة:</strong> {report.improvement.weakEnvironments.map(env => `بيئة ${env}`).join('، ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Best 3 Visits */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">أفضل 3 زيارات</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النتيجة الإجمالية
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.best3Visits.map((visit, index) => (
                    <tr key={visit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(visit.visit_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {visit.overall_score || '-'} / 4.0
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
