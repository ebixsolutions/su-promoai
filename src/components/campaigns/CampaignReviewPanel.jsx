import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function CampaignReviewPanel({ campaign }) {
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const predicted_revenue = campaign.predicted_revenue || 0;
  const actual_revenue = campaign.revenue_actual || 0;
  const predicted_orders = campaign.predicted_orders || 0;
  const actual_orders = campaign.orders_actual || 0;
  const predicted_margin = campaign.predicted_margin_impact || 0;
  const actual_margin = campaign.margin_impact_pct || 0;
  const predicted_redemptions = campaign.predicted_redemptions || 0;
  const actual_redemptions = campaign.redemptions || 0;

  // Accuracy score: avg of individual metric accuracies
  const metricAccuracy = (pred, actual) => {
    if (!pred || !actual) return null;
    return Math.max(0, Math.min(100, Math.round(100 - Math.abs((actual - pred) / pred) * 100)));
  };

  const scores = [
    metricAccuracy(predicted_revenue, actual_revenue),
    metricAccuracy(predicted_orders, actual_orders),
    metricAccuracy(predicted_redemptions, actual_redemptions),
  ].filter(s => s !== null);

  const accuracy_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const recommendation_quality = accuracy_score >= 85 ? 'Excellent' : accuracy_score >= 70 ? 'Good' : accuracy_score >= 50 ? 'Fair' : 'Poor';

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.FeedbackLoop.create({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      predicted_revenue,
      actual_revenue,
      predicted_orders,
      actual_orders,
      predicted_margin_impact: predicted_margin,
      actual_margin_impact: actual_margin,
      predicted_redemptions,
      actual_redemptions,
      accuracy_score,
      recommendation_quality,
      confidence_score: campaign.confidence_score,
      review_date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries(['feedback']);
    },
  });

  const rows = [
    { label: 'Revenue',     predicted: `$${predicted_revenue.toLocaleString()}`,     actual: `$${actual_revenue.toLocaleString()}`,     acc: metricAccuracy(predicted_revenue, actual_revenue) },
    { label: 'Orders',      predicted: predicted_orders || '—',                        actual: actual_orders || '—',                        acc: metricAccuracy(predicted_orders, actual_orders) },
    { label: 'Redemptions', predicted: predicted_redemptions || '—',                  actual: actual_redemptions || '—',                  acc: metricAccuracy(predicted_redemptions, actual_redemptions) },
    { label: 'Margin %',    predicted: predicted_margin ? `${predicted_margin}%` : '—', actual: actual_margin ? `${actual_margin}%` : '—', acc: null },
  ];

  const qualityColor = { Excellent: '#16a34a', Good: '#2563eb', Fair: '#ca8a04', Poor: '#dc2626' }[recommendation_quality];

  return (
    <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#374151' }}>Post-Campaign Review</p>
        {accuracy_score != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: qualityColor }}>{recommendation_quality}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#f3f4f6', color: '#374151' }}>{accuracy_score}% accurate</span>
          </div>
        )}
      </div>
      <div className="p-4" style={{ background: '#fff' }}>
        <table className="w-full text-xs mb-4">
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <th className="text-left pb-2 font-bold" style={{ color: '#9ca3af' }}>Metric</th>
              <th className="text-right pb-2 font-bold" style={{ color: '#9ca3af' }}>Predicted</th>
              <th className="text-right pb-2 font-bold" style={{ color: '#9ca3af' }}>Actual</th>
              <th className="text-right pb-2 font-bold" style={{ color: '#9ca3af' }}>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td className="py-1.5 font-medium" style={{ color: '#374151' }}>{r.label}</td>
                <td className="py-1.5 text-right" style={{ color: '#6b7280' }}>{r.predicted}</td>
                <td className="py-1.5 text-right font-semibold" style={{ color: '#111827' }}>{r.actual}</td>
                <td className="py-1.5 text-right font-bold" style={{ color: r.acc >= 80 ? '#16a34a' : r.acc >= 60 ? '#ca8a04' : r.acc != null ? '#dc2626' : '#9ca3af' }}>
                  {r.acc != null ? `${r.acc}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {saved ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#16a34a' }}>
            <CheckCircle className="w-3.5 h-3.5" /> Saved to learning loop
          </div>
        ) : (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save to AI Learning Loop
          </button>
        )}
      </div>
    </div>
  );
}