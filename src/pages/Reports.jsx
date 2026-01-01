import { useLanguage } from '../contexts/LanguageContext';

const Reports = () => {
  const { isRTL } = useLanguage();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold text-primary mb-6">
        {isRTL ? 'التقارير' : 'Reports'}
      </h1>
      <div className="card">
        <p className="text-gray-600">
          {isRTL 
            ? 'صفحة التقارير قيد التطوير. ستكون متاحة قريباً.' 
            : 'Reports page is under development. Coming soon.'}
        </p>
      </div>
    </div>
  );
};

export default Reports;


