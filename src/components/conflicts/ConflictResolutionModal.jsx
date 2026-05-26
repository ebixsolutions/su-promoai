import React, { useState } from 'react';
import { AlertTriangle, X, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_COLORS = {
  'SKU Overlap':     { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  'Audience Overlap':{ bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  'Budget Collision':{ bg: '#fffbeb', color: '#ca8a04', border: '#fde68a' },
  'Schedule Overlap':{ bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Discount Stack':  { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
};
const SEV_COLORS = {
  High:   { bg: '#fee2e2', color: '#dc2626' },
  Medium: { bg: '#fffbeb', color: '#ca8a04' },
  Low:    { bg: '#f3f4f6', color: '#6b7280' },
};

function ConflictCard({ conflict, resolution, onResolve }) {
  const tc = TYPE_COLORS[conflict.type] || TYPE_COLORS['Schedule Overlap'];
  const sc = SEV_COLORS[conflict.severity] || SEV_COLORS.Low;
  const isResolved = !!resolution;

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${isResolved ? '#bbf7d0' : tc.border}`, background: isResolved ? '#f0fdf4' : '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: isResolved ? '#dcfce7' : tc.bg, borderBottom: `1px solid ${isResolved ? '#bbf7d0' : tc.border}` }}>
        <div className="flex items-center gap-2">
          {isResolved
            ? <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
            : <AlertTriangle className="w-4 h-4" style={{ color: tc.color }} />}
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: isResolved ? '#bbf7d0' : tc.bg, color: isResolved ? '#16a34a' : tc.color, border: `1px solid ${isResolved ? '#86efac' : tc.border}` }}>
            {conflict.type}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
            {conflict.severity}
          </span>
        </div>
        {isResolved && <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>✓ Resolved</span>}
      </div>
      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm mb-3" style={{ color: '#374151' }}>{conflict.detail}</p>
        {!isResolved && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Resolution Options</p>
            {conflict.resolutions.map(r => (
              <button
                key={r.id}
                onClick={() => onResolve(conflict.id, r)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between group transition-all"
                style={{
                  background: r.isOverride ? '#fff7ed' : '#f9fafb',
                  border: `1px solid ${r.isOverride ? '#fed7aa' : '#e5e7eb'}`,
                  color: r.isOverride ? '#ea580c' : '#374151',
                }}
              >
                <span>{r.label}</span>
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
        {isResolved && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              {resolution.isOverride ? '⚠️ Overridden' : `✓ ${resolution.label}`}
            </span>
            <button onClick={() => onResolve(conflict.id, null)} className="text-[10px] underline" style={{ color: '#9ca3af' }}>Undo</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConflictResolutionModal({ conflicts, onResolveAll, onSaveDraft, onCancel, isLoading }) {
  const [resolutions, setResolutions] = useState({}); // conflictId → resolution

  const handleResolve = (conflictId, resolution) => {
    setResolutions(prev => {
      if (resolution === null) {
        const next = { ...prev };
        delete next[conflictId];
        return next;
      }
      return { ...prev, [conflictId]: resolution };
    });
  };

  const highConflicts = conflicts.filter(c => c.severity === 'High');
  const allHighResolved = highConflicts.every(c => resolutions[c.id]);
  const anyOverride = Object.values(resolutions).some(r => r.isOverride);

  const handleDeployClick = () => {
    onResolveAll(resolutions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>⚠️ Promotion Conflicts Detected</h2>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found — resolve before deploying
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center transition-all" style={{ background: '#f3f4f6' }}>
            <X className="w-4 h-4" style={{ color: '#6b7280' }} />
          </button>
        </div>

        {/* Conflicts list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {conflicts.map(conflict => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              resolution={resolutions[conflict.id] || null}
              onResolve={handleResolve}
            />
          ))}
          {anyOverride && (
            <div className="px-4 py-3 rounded-lg mt-2" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <p className="text-xs font-semibold" style={{ color: '#ea580c' }}>
                ⚠️ You have chosen to override {Object.values(resolutions).filter(r => r.isOverride).length} conflict(s). These will be logged to the audit trail.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>
              Cancel
            </button>
            <button onClick={onSaveDraft} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}>
              Save as Draft
            </button>
          </div>
          <div className="flex items-center gap-2">
            {highConflicts.length > 0 && !allHighResolved && (
              <p className="text-xs" style={{ color: '#dc2626' }}>
                Resolve {highConflicts.filter(c => !resolutions[c.id]).length} High conflict(s) first
              </p>
            )}
            <button
              onClick={handleDeployClick}
              disabled={!allHighResolved || isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
              style={{ background: allHighResolved ? '#2563eb' : '#9ca3af', cursor: allHighResolved ? 'pointer' : 'not-allowed' }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Resolve All & Deploy
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}