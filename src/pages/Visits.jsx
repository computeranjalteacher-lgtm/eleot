import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserVisits, deleteVisit, searchVisits } from '../services/supabaseService';

const Visits = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVisits();
  }, [user]);

  const loadVisits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserVisits(user.id);
      setVisits(data);
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user) return;
    if (!searchTerm.trim()) {
      loadVisits();
      return;
    }
    setLoading(true);
    try {
      const data = await searchVisits(user.id, searchTerm);
      setVisits(data);
    } catch (error) {
      console.error('Error searching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (visitId) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الزيارة؟' : 'Are you sure you want to delete this visit?')) {
      return;
    }
    try {
      await deleteVisit(visitId);
      await loadVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert(isRTL ? 'خطأ في حذف الزيارة' : 'Error deleting visit');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {isRTL ? 'الزيارات' : 'Visits'}
        </h1>
        <button
          onClick={() => navigate('/observation')}
          className="btn-primary"
        >
          {isRTL ? 'زيارة جديدة' : 'New Visit'}
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={isRTL ? 'ابحث عن زيارة...' : 'Search visits...'}
            className="input-field flex-1"
          />
          <button onClick={handleSearch} className="btn-primary">
            {isRTL ? 'بحث' : 'Search'}
          </button>
        </div>
      </div>

      {/* Visits List */}
      {visits.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">
            {isRTL ? 'لا توجد زيارات محفوظة' : 'No visits saved'}
          </p>
          <button
            onClick={() => navigate('/observation')}
            className="btn-primary mt-4"
          >
            {isRTL ? 'ابدأ زيارة جديدة' : 'Start New Visit'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {visits.map((visit) => (
            <div key={visit.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    {visit.teacher_name || (isRTL ? 'بدون اسم' : 'Unnamed')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDate(visit.created_at)}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {visit.observation_text?.substring(0, 200)}...
                  </p>
                  {visit.results && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-primary">
                        {isRTL ? 'النتيجة الإجمالية:' : 'Overall Score:'}{' '}
                        {visit.results.totalScore?.toFixed(1) || 'N/A'}/4
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/visits/${visit.id}`)}
                    className="btn-secondary text-sm"
                  >
                    {isRTL ? 'عرض' : 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(visit.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isRTL ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Visits;


