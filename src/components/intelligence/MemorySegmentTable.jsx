import React from 'react';

const TREND_ICON = { improving: '↑', stable: '→', declining: '↓' };
const TREND_COLOR = { improving: '#16a34a', stable: '#6b7280', declining: '#dc2626' };

export default function MemorySegmentTable({ segmentMemory }) {
  const rows = Object.entries(segmentMemory);
  if (rows.length === 0) return <p className="text-xs" style={{ color: '#9ca3af' }}>No segment memory yet.</p>;

  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Segment', 'Best Promo Type', 'Avg Redemption', 'Best Discount', 'Best Timing', 'Confidence', 'Trend'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-wider" style={{ color: '#6b7280', fontSize: 10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([seg, data], i) => (
            <tr key={seg} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td className="px-3 py-2.5 font-semibold" style={{ color: '#111827' }}>{seg}</td>
              <td className="px-3 py-2.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                  {(data.best_promotion_type || '').replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-3 py-2.5 font-bold" style={{ color: data.avg_redemption_rate >= 0.5 ? '#16a34a' : '#ca8a04' }}>
                {data.avg_redemption_rate ? `${(data.avg_redemption_rate * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="px-3 py-2.5" style={{ color: '#374151' }}>{data.best_discount_range || '—'}</td>
              <td className="px-3 py-2.5 capitalize" style={{ color: '#374151' }}>{data.best_timing || '—'}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 rounded-full" style={{ background: '#e5e7eb' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${data.confidence || 0}%`, background: '#2563eb' }} />
                  </div>
                  <span className="font-bold" style={{ color: '#374151' }}>{data.confidence || 0}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 font-bold" style={{ color: TREND_COLOR[data.trend] || '#6b7280' }}>
                {TREND_ICON[data.trend] || '→'} {data.trend || 'stable'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}