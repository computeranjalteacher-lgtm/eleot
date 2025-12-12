import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService';
import { getUserObservations, getObservationById } from '../services/observationService';
import { exportToPDF, exportToWord, copyAllText } from '../utils/exportUtils';
import { LogOut, FileText, Download, Copy, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ComparisonView from '../components/ComparisonView';

const VisitsPage = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitA, setSelectedVisitA] = useState(null);
  const [selectedVisitB, setSelectedVisitB] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadObservations();
  }, []);

  const loadObservations = async () => {
    try {
      setLoading(true);
      const data = await getUserObservations(user.uid);
      setObservations(data);
      if (data.length > 0 && data[0].evaluation) {
        setLanguage(data[0].evaluation.language || 'en');
      }
    } catch (error) {
      console.error('Error loading observations:', error);
      alert('Error loading observations');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleExport = async (observation, type) => {
    if (!observation.evaluation) return;
    
    const obsData = {
      date: observation.date,
      teacherName: observation.teacherName,
      environments: observation.environments
    };

    if (type === 'pdf') {
      exportToPDF(obsData, observation.evaluation);
    } else if (type === 'word') {
      exportToWord(obsData, observation.evaluation);
    } else if (type === 'copy') {
      copyAllText(obsData, observation.evaluation);
    }
  };

  const handleCompare = () => {
    if (!selectedVisitA || !selectedVisitB) {
      alert('Please select two visits to compare');
      return;
    }
    setShowComparison(true);
  };

  const isRTL = language === 'ar';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (showComparison && selectedVisitA && selectedVisitB) {
    return (
      <ComparisonView
        visitA={selectedVisitA}
        visitB={selectedVisitB}
        onBack={() => setShowComparison(false)}
        language={language}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/observation')}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {isRTL ? 'رجوع' : 'Back'}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-primary-700">
                  {isRTL ? 'زياراتي' : 'My Visits'}
                </h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isRTL ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Section */}
        {observations.length >= 2 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {isRTL ? 'مقارنة الزيارات' : 'Compare Visits'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'الزيارة الأولى' : 'Visit A'}
                </label>
                <select
                  value={selectedVisitA || ''}
                  onChange={(e) => setSelectedVisitA(e.target.value)}
                  className="input-field"
                >
                  <option value="">{isRTL ? 'اختر زيارة' : 'Select visit'}</option>
                  {observations.map(obs => (
                    <option key={obs.id} value={obs.id}>
                      {obs.date} - {obs.teacherName} ({obs.evaluation?.totalScore || 0}/4)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'الزيارة الثانية' : 'Visit B'}
                </label>
                <select
                  value={selectedVisitB || ''}
                  onChange={(e) => setSelectedVisitB(e.target.value)}
                  className="input-field"
                >
                  <option value="">{isRTL ? 'اختر زيارة' : 'Select visit'}</option>
                  {observations.map(obs => (
                    <option key={obs.id} value={obs.id}>
                      {obs.date} - {obs.teacherName} ({obs.evaluation?.totalScore || 0}/4)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCompare}
              disabled={!selectedVisitA || !selectedVisitB}
              className="btn-primary"
            >
              {isRTL ? 'مقارنة' : 'Compare'}
            </button>
          </div>
        )}

        {/* Observations List */}
        <div className="space-y-4">
          {observations.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">
                {isRTL ? 'لا توجد زيارات محفوظة' : 'No saved visits'}
              </p>
              <button
                onClick={() => navigate('/observation')}
                className="btn-primary"
              >
                {isRTL ? 'إنشاء زيارة جديدة' : 'Create New Visit'}
              </button>
            </div>
          ) : (
            observations.map(observation => (
              <div key={observation.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {observation.teacherName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {observation.date} • {observation.environments.join(', ')}
                    </p>
                    {observation.evaluation && (
                      <p className="text-lg font-bold text-primary-600 mt-2">
                        {isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:'} {observation.evaluation.totalScore}/4
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {observation.evaluation && (
                      <>
                        <button
                          onClick={() => handleExport(observation, 'pdf')}
                          className="btn-secondary flex items-center gap-1 text-sm"
                          title="Export PDF"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                        <button
                          onClick={() => handleExport(observation, 'word')}
                          className="btn-secondary flex items-center gap-1 text-sm"
                          title="Export Word"
                        >
                          <Download className="w-4 h-4" />
                          Word
                        </button>
                        <button
                          onClick={() => handleExport(observation, 'copy')}
                          className="btn-secondary flex items-center gap-1 text-sm"
                          title="Copy All"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default VisitsPage;

