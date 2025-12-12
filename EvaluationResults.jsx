import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const EvaluationResults = ({ evaluation }) => {
  const [copiedId, setCopiedId] = useState(null);
  const isRTL = evaluation.language === 'ar';

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Group results by environment
  const groupedResults = evaluation.results.reduce((acc, result) => {
    if (!acc[result.environmentId]) {
      acc[result.environmentId] = {
        environmentLabel: result.environmentLabel,
        criteria: []
      };
    }
    acc[result.environmentId].criteria.push(result);
    return acc;
  }, {});

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {Object.entries(groupedResults).map(([envId, envData]) => (
        <div key={envId} className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-primary-700 mb-3">
            {envId}. {envData.environmentLabel}
          </h3>
          <div className="space-y-3">
            {envData.criteria.map((result) => {
              const criterionLabel = isRTL ? result.criterion.label_ar : result.criterion.label_en;
              const scoreColor = {
                4: 'bg-green-100 text-green-800',
                3: 'bg-blue-100 text-blue-800',
                2: 'bg-yellow-100 text-yellow-800',
                1: 'bg-red-100 text-red-800'
              }[result.score] || 'bg-gray-100 text-gray-800';

              return (
                <div key={result.criterion.id} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {result.criterion.id}: {criterionLabel}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-bold ${scoreColor}`}>
                      {result.score}/4
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {result.justification}
                  </div>
                  <button
                    onClick={() => handleCopy(result.justification, result.criterion.id)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    {copiedId === result.criterion.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        {isRTL ? 'تم النسخ' : 'Copied'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        {isRTL ? 'نسخ' : 'Copy'}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Recommendations */}
      {evaluation.recommendations && (
        <div 
          className="border-2 border-green-500 rounded-lg p-4 bg-green-50 mt-4"
          dangerouslySetInnerHTML={{ __html: evaluation.recommendations }}
        />
      )}
    </div>
  );
};

export default EvaluationResults;

