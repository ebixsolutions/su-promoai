import React from 'react';
import { Rocket, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

function ScenarioCol({ label, data, highlight }) {
  const borderColor = highlight ? '#2563eb' : '#e5e7eb';
  const bgColor = highlight ? '#eff6ff' : '#f9fafb';
  return (
    <div className="flex-1 rounded-lg p-3 text-center" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: highlight ? '#2563eb' : '#9ca3af' }}>{label}</p>
      <p className="text-sm font-bold mb-1" style={{ color: '#111827' }}>${(data?.revenue_uplift || 0).toLocaleString()}</p>
      <p className="text-[10px]" style={{ color: '#6b7280' }}>{data?.orders || 0} orders</p>
      <p className="text-[10px]" style={{ color: data?.margin_impact < 0 ? '#dc2626' : '#16a34a' }}>
        {data?.margin_impact > 0 ? '+' : ''}{data?.margin_impact || 0}% margin
      </p>
      <p className="text-[10px]" style={{ color: '#9ca3af' }}>{data?.redemptions || 0} redeem.</p>
    </div>
  );
}

export default function SimulationCardV2({ rec, onDeploy, onSaveDraft }) {
  const sim = rec.simulation || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', maxWidth: 420 }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <p className="text-xs font-bold" style={{ color: '#111827' }}>Simulation: {rec.title}</p>
        {sim.confidence_interval && (
          <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>Range: {sim.confidence_interval}</p>
        )}
      </div>

      <div className="p-4">
        {/* 3-scenario grid */}
        <div className="flex gap-2 mb-4">
          <ScenarioCol label="Pessimistic" data={sim.pessimistic} />
          <ScenarioCol label="Base Case" data={sim.base} highlight />
          <ScenarioCol label="Optimistic" data={sim.optimistic} />
        </div>

        {/* Risk details */}
        <div className="space-y-1.5 mb-4">
          {sim.inventory_depletion && (
            <div className="flex items-start gap-2 text-[10px]" style={{ color: '#374151' }}>
              <span className="font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>Inventory:</span> {sim.inventory_depletion}
            </div>
          )}
          {sim.customer_reach && (
            <div className="flex items-start gap-2 text-[10px]" style={{ color: '#374151' }}>
              <span className="font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>Reach:</span> {sim.customer_reach}
            </div>
          )}
          {sim.promotion_fatigue_risk && (
            <div className="flex items-start gap-2 text-[10px]" style={{ color: '#374151' }}>
              <span className="font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>Fatigue:</span> {sim.promotion_fatigue_risk}
            </div>
          )}
          {sim.cannibalization_risk && (
            <div className="flex items-start gap-2 text-[10px]" style={{ color: '#374151' }}>
              <span className="font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>Cannibalization:</span> {sim.cannibalization_risk}
            </div>
          )}
          {sim.recommended_adjustments && (
            <div className="px-2 py-1.5 rounded text-[10px]" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              💡 {sim.recommended_adjustments}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            onClick={onDeploy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#2563eb', color: '#fff' }}
          >
            <Rocket className="w-3.5 h-3.5" /> Submit for Approval
          </button>
        </div>
      </div>
    </motion.div>
  );
}