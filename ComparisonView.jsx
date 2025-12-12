import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ComparisonView = ({ visitA, visitB, onBack, language }) => {
  const isRTL = language === 'ar';

  // Get scores for each criterion
  const getScore = (visit, criterionId) => {
    if (!visit.evaluation || !visit.evaluation.results) return null;
    const result = visit.evaluation.results.find(r => r.criterion.id === criterionId);
    return result ? result.score : null;
  };

  // Get all unique criteria from both visits
  const getAllCriteria = () => {
    const criteriaSet = new Set();
    if (visitA.evaluation?.results) {
      visitA.evaluation.results.forEach(r => {
        criteriaSet.add(JSON.stringify({ id: r.criterion.id, label: isRTL ? r.criterion.label_ar : r.criterion.label_en }));
      });
    }
    if (visitB.evaluation?.results) {
      visitB.evaluation.results.forEach(r => {
        criteriaSet.add(JSON.stringify({ id: r.criterion.id, label: isRTL ? r.criterion.label_ar : r.criterion.label_en }));
      });
    }
    return Array.from(criteriaSet).map(str => JSON.parse(str));
  };

  const allCriteria = getAllCriteria();
  const scoreA = visitA.evaluation?.totalScore || 0;
  const scoreB = visitB.evaluation?.totalScore || 0;
  const scoreDiff = scoreB - scoreA;

  const getTrendIcon = (scoreA, scoreB) => {
    if (scoreB > scoreA) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (scoreB < scoreA) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getScoreColor = (score) => {
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-blue-600';
    if (score >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {isRTL ? 'رجوع' : 'Back'}
            </button>
            <h1 className="text-2xl font-bold text-primary-700">
              {isRTL ? 'مقارنة الزيارات' : 'Visit Comparison'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {isRTL ? 'الزيارة الأولى' : 'Visit A'}
            </h3>
            <p className="text-2xl font-bold text-primary-600">{scoreA.toFixed(1)}/4</p>
            <p className="text-sm text-gray-600 mt-1">
              {visitA.date} - {visitA.teacherName}
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {isRTL ? 'الزيارة الثانية' : 'Visit B'}
            </h3>
            <p className="text-2xl font-bold text-primary-600">{scoreB.toFixed(1)}/4</p>
            <p className="text-sm text-gray-600 mt-1">
              {visitB.date} - {visitB.teacherName}
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {isRTL ? 'الفرق' : 'Difference'}
            </h3>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getScoreColor(scoreDiff + 3)}`}>
                {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}
              </p>
              {getTrendIcon(scoreA, scoreB)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {scoreDiff > 0 
                ? (isRTL ? 'تحسن' : 'Improved')
                : scoreDiff < 0
                ? (isRTL ? 'تراجع' : 'Declined')
                : (isRTL ? 'بدون تغيير' : 'No change')
              }
            </p>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {isRTL ? 'مقارنة تفصيلية' : 'Detailed Comparison'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">
                    {isRTL ? 'المعيار' : 'Criterion'}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    {isRTL ? 'الزيارة الأولى' : 'Visit A'}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    {isRTL ? 'الزيارة الثانية' : 'Visit B'}
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    {isRTL ? 'التغيير' : 'Change'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allCriteria.map((criterion, index) => {
                  const scoreA_val = getScore(visitA, criterion.id);
                  const scoreB_val = getScore(visitB, criterion.id);
                  const diff = scoreB_val !== null && scoreA_val !== null ? scoreB_val - scoreA_val : null;

                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{criterion.id}</div>
                        <div className="text-sm text-gray-600">{criterion.label}</div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {scoreA_val !== null ? (
                          <span className={`font-bold ${getScoreColor(scoreA_val)}`}>
                            {scoreA_val}/4
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {scoreB_val !== null ? (
                          <span className={`font-bold ${getScoreColor(scoreB_val)}`}>
                            {scoreB_val}/4
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {diff !== null ? (
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(scoreA_val, scoreB_val)}
                            <span className={`font-semibold ${getScoreColor(diff + 3)}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'توصيات الزيارة الأولى' : 'Visit A Recommendations'}
            </h3>
            {visitA.evaluation?.recommendations ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: visitA.evaluation.recommendations }}
              />
            ) : (
              <p className="text-gray-500">{isRTL ? 'لا توجد توصيات' : 'No recommendations'}</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'توصيات الزيارة الثانية' : 'Visit B Recommendations'}
            </h3>
            {visitB.evaluation?.recommendations ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: visitB.evaluation.recommendations }}
              />
            ) : (
              <p className="text-gray-500">{isRTL ? 'لا توجد توصيات' : 'No recommendations'}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComparisonView;

