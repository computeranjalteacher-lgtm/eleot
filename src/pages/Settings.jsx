import { useLanguage } from '../contexts/LanguageContext';

const Settings = () => {
  const { isRTL, language, setLanguage } = useLanguage();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold text-primary mb-6">
        {isRTL ? 'الإعدادات' : 'Settings'}
      </h1>
      
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          {isRTL ? 'إعدادات اللغة' : 'Language Settings'}
        </h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block mb-2 font-medium">
              {isRTL ? 'اختر اللغة:' : 'Select Language:'}
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;


