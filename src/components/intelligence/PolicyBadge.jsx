import React, { useState } from 'react';
import { checkPolicies, buildPromoForPolicy } from '@/lib/policyEngine';
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from 'lucide-react';

export default function PolicyBadge({ rec, products = [], activeCampaigns = [], segmentFatigueScore = 50 }) {
  const [expanded, setExpanded] = useState(false);
  const promo = buildPromoForPolicy(rec, products, activeCampaigns, segmentFatigueScore);
  const { passed, results } = checkPolicies(promo);

  const warnings = results.filter(r => !r.passed && !r.skipped && r.rule.severity === 'warning');
  const blockings = results.filter(r => !r.passed && !r.skipped && r.rule.severity === 'blocking');
  const passedCount = results.filter(r => r.passed || r.skipped).length;

  const overallColor = blockings.length > 0 ? '#dc2626' : warnings.length > 0 ? '#ca8a04' : '#16a34a';
  const OverallIcon = blockings.length > 0 ? ShieldX : warnings.length > 0 ? ShieldAlert : ShieldCheck;
  const label = blockings.length > 0 ? `${blockings.length} Blocking` : warnings.length > 0 ? `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}` : 'All Clear';

  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: `1px solid ${overallColor}30`, background: `${overallColor}08` }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <OverallIcon className="w-3.5 h-3.5" style={{ color: overallColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: overallColor }}>Policy: {label}</span>
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>{passedCount}/{results.length} passed</span>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3" style={{ color: '#9ca3af' }} /> : <ChevronDown className="w-3 h-3" style={{ color: '#9ca3af' }} />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {results.filter(r => !r.skipped).map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs" style={{ color: r.passed ? '#16a34a' : r.rule.severity === 'blocking' ? '#dc2626' : '#ca8a04' }}>
                {r.passed ? '✓' : r.rule.severity === 'blocking' ? '✗' : '⚠'}
              </span>
              <span className="text-[10px]" style={{ color: r.passed ? '#6b7280' : '#374151' }}>
                {r.rule.name}{!r.passed && `: ${r.rule.message}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}