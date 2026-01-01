import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { language, toggleLanguage, isRTL } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/observation', label_ar: 'التقييم', label_en: 'Evaluation' },
    { path: '/visits', label_ar: 'الزيارات', label_en: 'Visits' },
    { path: '/reports', label_ar: 'التقارير', label_en: 'Reports' },
    { path: '/settings', label_ar: 'الإعدادات', label_en: 'Settings' },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-primary">
                {isRTL ? 'مدارس الأنجال' : 'Al-Anjal Schools'}
              </h1>
              <p className="text-xs text-gray-600">
                {isRTL ? 'أداة المراقبة الذكية ELEOT' : 'ELEOT Smart Observation Tool'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRTL ? item.label_ar : item.label_en}
                </Link>
              );
            })}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              {language === 'ar' ? 'EN' : 'AR'}
            </button>

            {/* Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                {isRTL ? 'تسجيل خروج' : 'Logout'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


