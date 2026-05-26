import React, { useState } from 'react';
// RecommendationCardV2 — shows dynamically calibrated confidence + calibration source
import { ChevronDown, ChevronUp, BarChart2, Rocket, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_COLORS = { Low: '#16a34a', Medium: '#ca8a04', High: '#dc2626' };
const UPLIFT_COLORS = { Low: '#ca8a04', Medium: '#2563eb', High: '#16a34a' };

export default function RecommendationCardV2({ rec, index, onSimulate, onDeploy }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = rec.confidence_score >= 75 ? '#16a34a' : rec.confidence_score >= 50 ? '#ca8a04' : '#dc2626';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl mb-3 overflow-hidden"
      style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#eff6ff', color: '#2563eb' }}>#{index + 1}</span>
            <p className="text-sm font-bold" style={{ color: '#111827' }}>{rec.title}</p>
          </div>
          {rec.confidence_score != null && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
                <div className="h-1.5 rounded-full" style={{ width: `${rec.confidence_score}%`, background: confidenceColor }} />
              </div>
              <span className="text-xs font-bold" style={{ color: confidenceColor }}>{rec.confidence_score}%</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
            {rec.promotion_type?.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            {rec.discount} · {rec.duration}
          </span>
          {rec.risk_level && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: RISK_COLORS[rec.risk_level], background: `${RISK_COLORS[rec.risk_level]}15`, border: `1px solid ${RISK_COLORS[rec.risk_level]}40` }}>
              {rec.risk_level} Risk
            </span>
          )}
          {rec.revenue_uplift && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: UPLIFT_COLORS[rec.revenue_uplift], background: `${UPLIFT_COLORS[rec.revenue_uplift]}15`, border: `1px solid ${UPLIFT_COLORS[rec.revenue_uplift]}40` }}>
              {rec.revenue_uplift} Uplift
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { label: 'Rev. Uplift', value: rec.projectedUplift ? `$${rec.projectedUplift.toLocaleString()}` : '—' },
            { label: 'Est. Orders', value: rec.estimatedOrders || '—' },
            { label: 'Margin', value: rec.marginImpact ? `${rec.marginImpact}%` : '—' },
          ].map(k => (
            <div key={k.label} className="text-center p-2 rounded-lg" style={{ background: '#f9fafb' }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>{k.label}</p>
              <p className="text-xs font-bold" style={{ color: '#111827' }}>{k.value}</p>
            </div>
          ))}
        </div>
        {rec.calibration?.based_on_campaigns > 0 && (
          <p className="text-[9px] mb-2 px-2 py-1 rounded" style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #ede9fe' }}>
            📊 Revenue calibrated from {rec.calibration.based_on_campaigns} historical campaigns · {rec.calibration.avg_historical_accuracy}% avg accuracy
          </p>
        )}

        {/* Expandable reasoning */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold mb-2"
          style={{ color: '#7c3aed' }}
        >
          <Info className="w-3 h-3" />
          {expanded ? 'Hide' : 'Why this?'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {rec.reasoning?.length > 0 && (
                <div className="mb-2">
                  {rec.reasoning.map((r, i) => (
                    <p key={i} className="text-[10px] mb-1 flex gap-1.5" style={{ color: '#374151' }}>
                      <span style={{ color: '#7c3aed' }}>•</span>{r}
                    </p>
                  ))}
                </div>
              )}
              {rec.risk_explanation && (
                <p className="text-[10px] px-2 py-1.5 rounded mb-2" style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                  Risk: {rec.risk_explanation}
                </p>
              )}
              {rec.data_sources?.length > 0 && (
                <div className="mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Data Sources</p>
                  {rec.data_sources.map((d, i) => (
                    <p key={i} className="text-[10px]" style={{ color: '#6b7280' }}>· {d}</p>
                  ))}
                </div>
              )}
              {rec.guardrails?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {rec.guardrails.map((g, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>✓ {g}</span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onSimulate(rec)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Simulate
          </button>
          <button
            onClick={() => onDeploy(rec)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#2563eb', color: '#fff' }}
          >
            <Rocket className="w-3.5 h-3.5" /> Submit for Approval
          </button>
        </div>
      </div>
    </motion.div>
  );
}