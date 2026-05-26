import React from 'react';

const TYPE_LABELS = {
  bundle_discount: 'Bundle Discount',
  product_discount: 'Product Discount',
  coupon_discount: 'Coupon Discount',
  shipping_discount: 'Shipping Discount',
  customer_group_discount: 'Customer Group',
};

const TREND_ICON = { improving: '↑', stable: '→', declining: '↓' };
const TREND_COLOR = { improving: '#16a34a', stable: '#6b7280', declining: '#dc2626' };

export default function PromoTypeRanking({ promoTypeMemory }) {
  const sorted = Object.entries(promoTypeMemory)
    .sort((a, b) => (b[1].rank || 99) - (a[1].rank || 99) || b[1].avg_revenue_uplift - a[1].avg_revenue_uplift);

  return (
    <div className="space-y-2">
      {sorted.map(([type, data], i) => (
        <div key={type} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: i === 0 ? '#fef9c3' : '#f3f4f6', color: i === 0 ? '#ca8a04' : '#6b7280' }}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: '#111827' }}>{TYPE_LABELS[type] || type}</p>
            <p className="text-[10px]" style={{ color: '#9ca3af' }}>{data.sample_size} campaigns</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold" style={{ color: '#16a34a' }}>+{(data.avg_revenue_uplift * 100).toFixed(0)}% AOV</p>
            <p className="text-[10px]" style={{ color: '#dc2626' }}>-{(data.avg_margin_impact * 100).toFixed(0)}% margin</p>
          </div>
          <span className="text-sm font-bold flex-shrink-0" style={{ color: TREND_COLOR[data.trend] }}>
            {TREND_ICON[data.trend]}
          </span>
        </div>
      ))}
    </div>
  );
}