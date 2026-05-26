import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, XCircle, Save, BarChart2, Rocket, SendHorizonal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { detectConflicts } from '@/lib/conflictDetector.js';

const PROMO_TYPES = [
  { value: 'product_discount', label: 'Product Discount', icon: '🏷️' },
  { value: 'shipping_discount', label: 'Shipping Discount', icon: '🚚' },
  { value: 'bundle_discount', label: 'Bundle Discount', icon: '📦' },
  { value: 'coupon_discount', label: 'Coupon Discount', icon: '🎟️' },
  { value: 'customer_group_discount', label: 'Customer Group', icon: '👥' },
];

const SEGMENTS = ['All Customers', 'VIP', 'Inactive 90d+', 'New Customers', 'High AOV', 'Returning'];

function Label({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b7280' }}>{children}</p>;
}

function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function inputStyle(focus) {
  return {
    background: '#fff',
    border: `1px solid ${focus ? '#2563eb' : '#e5e7eb'}`,
    color: '#111827',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    boxShadow: focus ? '0 0 0 2px rgba(37,99,235,0.12)' : undefined,
  };
}

function GuardrailItem({ label, status }) {
  const config = {
    PASSED:  { Icon: CheckCircle2, bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'PASSED' },
    WARNING: { Icon: AlertTriangle, bg: '#fffbeb', color: '#ca8a04', border: '#fde68a', label: 'WARNING' },
    BLOCKED: { Icon: XCircle,       bg: '#fee2e2', color: '#dc2626', border: '#fecaca', label: 'BLOCKED' },
  };
  const c = config[status] || config.PASSED;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <span className="text-sm font-medium" style={{ color: '#374151' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <c.Icon className="w-4 h-4" style={{ color: c.color }} />
        <span className="text-xs font-bold" style={{ color: c.color }}>{c.label}</span>
      </div>
    </div>
  );
}

export default function PromotionBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [focused, setFocused] = useState('');

  const [form, setForm] = useState({
    name: '', promotion_type: 'product_discount', target_segment: 'All Customers',
    target_products: '',
    discount_type: 'pct', discount_value: '', budget_cap: '', min_margin_pct: '40',
    start_date: '', end_date: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
    select: (data) => data.filter(c => c.status === 'Active' || c.status === 'Scheduled'),
  });

  const disc = parseFloat(form.discount_value) || 0;
  const budget = parseFloat(form.budget_cap) || 0;

  // Run conflict detection
  const promoSkus = (form.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
  const liveConflicts = detectConflicts(
    { targetProducts: promoSkus, targetSegment: form.target_segment, startDate: form.start_date, endDate: form.end_date, budgetCap: budget },
    activeCampaigns
  );
  const hasHighConflict = liveConflicts.some(c => c.severity === 'High');

  const guardrails = {
    'Margin Floor': disc > 60 ? 'BLOCKED' : disc > 40 ? 'WARNING' : 'PASSED',
    'Stock Availability': 'PASSED',
    'Discount Cap': disc > 50 ? 'BLOCKED' : disc > 35 ? 'WARNING' : 'PASSED',
    'Budget Cap': budget > 0 && budget < 500 ? 'WARNING' : 'PASSED',
    'No Conflicting Campaigns': hasHighConflict ? 'BLOCKED' : liveConflicts.length > 0 ? 'WARNING' : 'PASSED',
  };

  const anyBlocked = Object.values(guardrails).some(v => v === 'BLOCKED');
  const eligibleMap = { VIP: 320, Returning: 1850, 'New Customers': 640, 'Inactive 90d+': 780, 'High AOV': 290, 'All Customers': 3880 };
  const eligible = eligibleMap[form.target_segment] || 3880;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['campaigns']); toast({ title: 'Campaign saved!' }); },
  });

  const handleSave = (status) => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (anyBlocked) { toast({ title: 'Fix BLOCKED guardrails first', variant: 'destructive' }); return; }
    createMutation.mutate({ ...form, status, discount_value: disc, budget_cap: budget || undefined, min_margin_pct: parseFloat(form.min_margin_pct) });
  };

  const handleSubmitForApproval = () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (anyBlocked) { toast({ title: 'Fix BLOCKED guardrails first', variant: 'destructive' }); return; }
    createMutation.mutate({ ...form, status: 'Pending Approval', discount_value: disc, budget_cap: budget || undefined, min_margin_pct: parseFloat(form.min_margin_pct) });
  };

  const iStyle = (key) => ({ ...inputStyle(focused === key), transition: 'border-color 0.15s, box-shadow 0.15s' });

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Form */}
        <div className="xl:col-span-2 space-y-4">
          {/* Name */}
          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Field label="Promotion Name">
              <input
                placeholder="e.g. Summer Clearance — Skincare Bundle"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                style={iStyle('name')}
              />
            </Field>
          </div>

          {/* Type */}
          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Label>Promotion Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-1">
              {PROMO_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('promotion_type', t.value)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg text-center transition-all"
                  style={form.promotion_type === t.value
                    ? { background: '#eff6ff', border: '2px solid #2563eb', color: '#1d4ed8' }
                    : { background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280' }
                  }
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Field label="Target Customer Segment">
              <select value={form.target_segment} onChange={e => set('target_segment', e.target.value)} style={{ ...iStyle('segment'), width: '100%' }}>
                {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Discount Value">
              <div className="flex gap-2">
                <input
                  type="number" min="0" max="100" placeholder="e.g. 20"
                  value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                  onFocus={() => setFocused('disc')} onBlur={() => setFocused('')}
                  style={{ ...iStyle('disc'), flex: 1 }}
                />
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                  {['pct', 'fixed'].map(t => (
                    <button key={t} onClick={() => set('discount_type', t)} className="px-3 text-xs font-bold transition-all"
                      style={{ background: form.discount_type === t ? '#111827' : '#fff', color: form.discount_type === t ? '#fff' : '#6b7280' }}>
                      {t === 'pct' ? '%' : '$'}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="Target Products (SKUs)">
              <input
                placeholder="e.g. SKN-001, SKN-003"
                value={form.target_products}
                onChange={e => set('target_products', e.target.value)}
                onFocus={() => setFocused('tp')} onBlur={() => setFocused('')}
                style={iStyle('tp')}
              />
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                onFocus={() => setFocused('sd')} onBlur={() => setFocused('')} style={iStyle('sd')} />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                onFocus={() => setFocused('ed')} onBlur={() => setFocused('')} style={iStyle('ed')} />
            </Field>
            <Field label="Budget Cap ($)">
              <input type="number" placeholder="e.g. 5000" value={form.budget_cap} onChange={e => set('budget_cap', e.target.value)}
                onFocus={() => setFocused('bc')} onBlur={() => setFocused('')} style={iStyle('bc')} />
            </Field>
            <Field label="Min Margin Threshold (%)">
              <input type="number" placeholder="e.g. 40" value={form.min_margin_pct} onChange={e => set('min_margin_pct', e.target.value)}
                onFocus={() => setFocused('mm')} onBlur={() => setFocused('')} style={iStyle('mm')} />
            </Field>
          </div>

          {/* Conflict alerts */}
          {liveConflicts.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: hasHighConflict ? '#fef2f2' : '#fffbeb', border: `1px solid ${hasHighConflict ? '#fecaca' : '#fde68a'}` }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: hasHighConflict ? '#dc2626' : '#d97706' }}>
                {hasHighConflict ? '⛔ High-severity conflicts detected' : '⚠️ Potential conflicts detected'}
              </p>
              {liveConflicts.map((cf, i) => (
                <p key={i} className="text-xs" style={{ color: '#6b7280' }}>• {cf.detail} ({cf.severity})</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleSave('Draft')} disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>
              <Save className="w-4 h-4" /> Save as Draft
            </button>
            <button onClick={handleSubmitForApproval} disabled={anyBlocked || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: anyBlocked ? '#f3f4f6' : '#fffbeb', border: `1px solid ${anyBlocked ? '#e5e7eb' : '#fde68a'}`, color: anyBlocked ? '#9ca3af' : '#d97706', cursor: anyBlocked ? 'not-allowed' : 'pointer' }}>
              <SendHorizonal className="w-4 h-4" /> Submit for Approval
            </button>
            <button onClick={() => handleSave('Active')} disabled={anyBlocked || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: anyBlocked ? '#9ca3af' : '#2563eb', cursor: anyBlocked ? 'not-allowed' : 'pointer' }}>
              <Rocket className="w-4 h-4" /> Deploy Directly
            </button>
          </div>
        </div>

        {/* Right: Guardrails */}
        <div className="space-y-4">
          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Live Guardrails</h3>
            <div className="space-y-2">
              {Object.entries(guardrails).map(([label, status]) => <GuardrailItem key={label} label={label} status={status} />)}
            </div>
          </div>

          <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Estimated Impact</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Revenue Uplift', value: disc > 0 ? `$${(disc * 180).toLocaleString()} – $${(disc * 420).toLocaleString()}` : '—', color: '#16a34a' },
                { label: 'Estimated Orders', value: disc > 0 ? Math.round(disc * 8.4).toString() : '—', color: '#111827' },
                { label: 'Discount Cost', value: disc > 0 ? `~$${Math.round(disc * 95).toLocaleString()}` : '—', color: '#ca8a04' },
                { label: 'Eligible Customers', value: eligible.toLocaleString(), color: '#2563eb' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}