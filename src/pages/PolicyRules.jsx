import React, { useState } from 'react';
import { loadPolicyRules, savePolicyRules, checkPolicies } from '@/lib/policyEngine';
import { ShieldCheck, ShieldX, ShieldAlert, Play, Save } from 'lucide-react';
import { useRole } from '@/lib/roleContext';
import { motion } from 'framer-motion';

const SEV_STYLE = {
  blocking: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', label: 'Blocking' },
  warning: { bg: '#fffbeb', color: '#ca8a04', border: '#fde68a', label: 'Warning' },
};

const TEST_PROMO = {
  margin_after: 35,
  discount_value: 20,
  estimated_cost: 3000,
  budget_cap: 5000,
  estimated_cost_vs_budget: 0.6,
  segment_fatigue_score: 45,
  has_protected_sku: false,
  conflict_count: 0,
  all_stock_above_50: true,
};

export default function PolicyRules() {
  const [rules, setRules] = useState(() => loadPolicyRules());
  const [testResults, setTestResults] = useState(null);
  const [saved, setSaved] = useState(false);
  const { can } = useRole();
  const isAdmin = can('approve');

  const updateThreshold = (id, val) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, threshold: parseFloat(val) || val } : r));
  };

  const toggleRule = (id) => {
    if (!isAdmin) return;
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleSave = () => {
    savePolicyRules(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = () => {
    const { results } = checkPolicies(TEST_PROMO, rules);
    setTestResults(results);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs" style={{ color: '#6b7280' }}>Configure business rules that govern all AI recommendations and campaign deployments.</p>
        <div className="flex gap-2">
          <button onClick={handleTest}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            <Play className="w-3.5 h-3.5" /> Test Policy
          </button>
          {isAdmin && (
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: saved ? '#dcfce7' : '#1a1a1a', color: saved ? '#16a34a' : '#fff' }}>
              <Save className="w-3.5 h-3.5" /> {saved ? 'Saved!' : 'Save Rules'}
            </button>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-bold mb-3" style={{ color: '#374151' }}>Test Results — Sample Promotion (20% discount, $3k cost, 35% post-margin)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {testResults.filter(r => !r.skipped).map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: r.passed ? '#f0fdf4' : r.rule.severity === 'blocking' ? '#fef2f2' : '#fffbeb', border: `1px solid ${r.passed ? '#bbf7d0' : r.rule.severity === 'blocking' ? '#fecaca' : '#fde68a'}` }}>
                <span style={{ color: r.passed ? '#16a34a' : r.rule.severity === 'blocking' ? '#dc2626' : '#ca8a04', fontSize: 14 }}>
                  {r.passed ? '✓' : r.rule.severity === 'blocking' ? '✗' : '⚠'}
                </span>
                <div>
                  <p className="text-[10px] font-bold" style={{ color: '#374151' }}>{r.rule.name}</p>
                  {!r.passed && <p className="text-[9px]" style={{ color: '#9ca3af' }}>{r.rule.message}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rules Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div className="grid grid-cols-12 gap-3">
            {['ID', 'Rule Name', 'Condition', 'Threshold', 'Severity', 'Status'].map(h => (
              <div key={h} className={`text-[10px] font-bold uppercase tracking-wide ${h === 'Rule Name' ? 'col-span-3' : h === 'Condition' ? 'col-span-3' : h === 'Threshold' ? 'col-span-2' : 'col-span-1'}`} style={{ color: '#9ca3af' }}>{h}</div>
            ))}
          </div>
        </div>
        <div>
          {rules.map((rule, i) => {
            const sev = SEV_STYLE[rule.severity];
            return (
              <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="px-5 py-4 grid grid-cols-12 gap-3 items-center"
                style={{ borderBottom: i < rules.length - 1 ? '1px solid #f3f4f6' : 'none', opacity: rule.enabled ? 1 : 0.5 }}>
                <div className="col-span-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: '#f3f4f6', color: '#6b7280' }}>{rule.id}</span>
                </div>
                <div className="col-span-3">
                  <p className="text-xs font-semibold" style={{ color: '#111827' }}>{rule.name}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs" style={{ color: '#6b7280' }}>{rule.message}</p>
                </div>
                <div className="col-span-2">
                  {isAdmin ? (
                    <input
                      type={typeof rule.threshold === 'boolean' ? 'text' : 'number'}
                      value={rule.threshold === true ? 'true' : rule.threshold === false ? 'false' : rule.threshold}
                      onChange={e => updateThreshold(rule.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}
                    />
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: '#374151' }}>{String(rule.threshold)}</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>{sev.label}</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    disabled={!isAdmin}
                    className="relative w-10 h-5 rounded-full transition-all"
                    style={{ background: rule.enabled ? '#16a34a' : '#d1d5db', cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                    title={!isAdmin ? 'Requires Admin role' : ''}
                  >
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                      style={{ left: rule.enabled ? '22px' : '2px' }} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {!isAdmin && (
        <p className="text-xs mt-3 text-center" style={{ color: '#9ca3af' }}>⚠ Admin role required to modify policy rules</p>
      )}
    </div>
  );
}