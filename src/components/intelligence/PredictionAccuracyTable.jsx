import React from 'react';

export default function PredictionAccuracyTable({ campaigns }) {
  const ended = campaigns.filter(c =>
    c.status === 'Ended' && c.predicted_revenue != null && c.revenue_actual != null && c.revenue_actual > 0
  );

  if (ended.length === 0) {
    return <p className="text-xs py-4 text-center" style={{ color: '#9ca3af' }}>No ended campaigns with prediction data yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Campaign', 'Predicted Revenue', 'Actual Revenue', 'Variance', 'Accuracy', 'Quality'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider" style={{ color: '#6b7280', fontSize: 10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ended.map((c, i) => {
            const accuracy = Math.max(0, Math.min(100,
              100 - Math.abs((c.predicted_revenue - c.revenue_actual) / c.predicted_revenue * 100)
            ));
            const variance = ((c.revenue_actual - c.predicted_revenue) / c.predicted_revenue * 100).toFixed(1);
            const quality = accuracy >= 85 ? 'Excellent' : accuracy >= 70 ? 'Good' : accuracy >= 55 ? 'Fair' : 'Poor';
            const qualityColor = { Excellent: '#16a34a', Good: '#2563eb', Fair: '#ca8a04', Poor: '#dc2626' }[quality];

            return (
              <tr key={c.id} style={{ borderBottom: i < ended.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: '#111827' }}>{c.name}</td>
                <td className="px-3 py-2.5" style={{ color: '#6b7280' }}>${c.predicted_revenue?.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-semibold" style={{ color: '#111827' }}>${c.revenue_actual?.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-semibold" style={{ color: parseFloat(variance) >= 0 ? '#16a34a' : '#dc2626' }}>
                  {parseFloat(variance) >= 0 ? '+' : ''}{variance}%
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 rounded-full" style={{ background: '#e5e7eb' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${accuracy}%`, background: qualityColor }} />
                    </div>
                    <span className="font-bold" style={{ color: qualityColor }}>{Math.round(accuracy)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{
                    background: qualityColor + '20', color: qualityColor, border: `1px solid ${qualityColor}40`
                  }}>{quality}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}