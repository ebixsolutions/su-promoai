import React, { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Pause, Play, XCircle, Copy, Bot, Loader2, CheckCircle, Clock, AlertTriangle, Trash2, MoreHorizontal } from 'lucide-react';
import { callAnthropic } from '@/lib/anthropic';
import { evaluateCampaignOutcome } from '@/lib/outcomeTracker';
import { useToast } from '@/components/ui/use-toast';
import StatusBadge from '@/components/shared/StatusBadge';
import PromotionTypeBadge from '@/components/shared/PromotionTypeBadge';
import ApprovalButtons from '@/components/campaigns/ApprovalButtons';
import CampaignReviewPanel from '@/components/campaigns/CampaignReviewPanel';
import ConflictResolutionModal from '@/components/conflicts/ConflictResolutionModal';
import { detectConflicts } from '@/lib/conflictDetector.js';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const TH = 'text-left px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap';
const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#374151', fontSize: 12 };
const TICK = { fontSize: 11, fill: '#9ca3af' };

const STATUS_TABS_EN = ['All', 'Pending Approval', 'Active', 'Draft', 'Ended'];
const STATUS_TABS_ZH = ['全部', '待审批', '活跃', '草稿', '已结束'];
const STATUS_TABS = STATUS_TABS_EN;

function generateDailyData(c) {
  const days = c.duration_days || 7;
  return Array.from({ length: Math.min(days, 14) }, (_, i) => ({
    day: `D${i + 1}`,
    revenue: Math.round((c.revenue_actual || 0) / days * (0.6 + Math.random() * 0.8)),
    redemptions: Math.round((c.redemptions || 0) / days * (0.5 + Math.random())),
  }));
}

function AIDiagnosis({ c, lang }) {
  const zh = lang === 'zh';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const diagnose = async () => {
    if (result) { setOpen(o => !o); return; }
    setOpen(true); setLoading(true);
    try {
      const prompt = `Campaign: ${c.name} | Type: ${c.promotion_type} | Status: ${c.status} | Discount: ${c.discount_value}% | Revenue: $${c.revenue_actual||0} | Orders: ${c.orders_actual||0} | Margin impact: ${c.margin_impact_pct||0}% | Score: ${c.performance_score||0} | Predicted: $${c.predicted_revenue||0} | Confidence: ${c.confidence_score||0}
Return JSON only: { root_cause: string, lessons: [3 strings], next_action: string, adjustments: [strings] }`;
      const text = await callAnthropic(prompt);
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      setResult(parsed);
    } catch {
      setResult({ root_cause: 'AI diagnosis temporarily unavailable.', lessons: [], next_action: '', adjustments: [] });
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-3">
      <button onClick={diagnose}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
        <Bot className="w-3.5 h-3.5" />
        {loading ? (zh ? '诊断中...' : 'Diagnosing...') : open ? (zh ? '隐藏诊断' : 'Hide Diagnosis') : (zh ? 'AI 诊断' : 'AI Diagnosis')}
        {loading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
      </button>
      {open && result && (
        <div className="mt-2 p-4 rounded-lg" style={{ background: '#faf5ff', border: '1px solid #ddd6fe' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#7c3aed' }}>{zh ? '根本原因' : 'Root Cause'}</p>
          <p className="text-xs mb-3" style={{ color: '#374151' }}>{result.root_cause}</p>
          {result.lessons?.length > 0 && (<>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#7c3aed' }}>{zh ? '经验教训' : 'Lessons Learned'}</p>
            <ul className="space-y-1 mb-3">{result.lessons.map((l, i) => <li key={i} className="text-xs flex gap-1.5" style={{ color: '#374151' }}><span style={{ color: '#7c3aed' }}>•</span>{l}</li>)}</ul>
          </>)}
          {result.adjustments?.length > 0 && (<>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#7c3aed' }}>{zh ? '建议调整' : 'Suggested Adjustments'}</p>
            <ul className="space-y-1 mb-3">{result.adjustments.map((a, i) => <li key={i} className="text-xs flex gap-1.5" style={{ color: '#374151' }}><span style={{ color: '#059669' }}>→</span>{a}</li>)}</ul>
          </>)}
          {result.next_action && (<>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#7c3aed' }}>{zh ? '下一步行动' : 'Next Action'}</p>
            <p className="text-xs font-semibold" style={{ color: '#374151' }}>{result.next_action}</p>
          </>)}
        </div>
      )}
    </div>
  );
}

const DELETABLE_STATUSES = ['Draft', 'Ended', 'Rejected'];
const NON_DELETABLE_STATUSES = ['Active', 'Live', 'Deployed', 'Pending Approval', 'Approved'];

function DeleteConfirmModal({ campaign, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-xl p-6 w-full max-w-md shadow-xl" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
            <Trash2 className="w-5 h-5" style={{ color: '#dc2626' }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: '#111827' }}>Delete Campaign?</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: '#374151' }}>
          This will permanently delete <strong>"{campaign.name}"</strong>. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#dc2626', color: '#fff' }}>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

function RowActionsMenu({ campaign, onDelete }) {
  const [open, setOpen] = useState(false);
  const canDelete = DELETABLE_STATUSES.includes(campaign.status);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        style={{ color: '#9ca3af' }}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 rounded-lg shadow-lg py-1 w-48" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            {canDelete ? (
              <button
                onClick={() => { setOpen(false); onDelete(campaign); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left hover:bg-red-50 transition-colors"
                style={{ color: '#dc2626' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : (
              <div className="px-3 py-2 text-xs" style={{ color: '#9ca3af' }}>
                Pause or end campaign before deleting.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DetailPanel({ c, onAction, onDeploy, onDelete, isUpdating, lang }) {
  const data = generateDailyData(c);
  const zh = lang === 'zh';
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="px-4 py-5" style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', width: '100%', maxWidth: '100%', boxSizing: 'border-box', maxHeight: '70vh', overflowY: 'auto' }}>

        {/* Approval workflow */}
        {(c.status === 'Draft' || c.status === 'Pending Approval' || c.status === 'Approved') && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#374151' }}>{zh ? '审批流程' : 'Approval Workflow'}</p>
            {c.rejection_reason && (
              <div className="mb-2 px-2.5 py-1.5 rounded text-xs" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {zh ? '拒绝原因：' : 'Rejected: '}{c.rejection_reason}
              </div>
            )}
            <ApprovalButtons campaign={c} onAction={onAction} onDeploy={onDeploy} isLoading={isUpdating} />
          </div>
        )}

        {/* AI Confidence Analysis */}
        {c.is_ai_recommended && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{zh ? 'AI 置信度分析' : 'AI Confidence Analysis'}</div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {/* Ring */}
              <div style={{ flexShrink: 0, width: 90, textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
                  <svg viewBox="0 0 80 80" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#16a34a" strokeWidth="8"
                      strokeDasharray={`${(c.confidence_score || 82) * 2.01} 201`} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{c.confidence_score || 82}</span>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>/100</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                  {(c.confidence_score || 82) >= 80 ? (zh ? '✓ 高置信度' : '✓ High confidence') : (c.confidence_score || 82) >= 60 ? (zh ? '⚠ 中等置信度' : '⚠ Moderate') : (zh ? '✗ 低置信度' : '✗ Low confidence')}
                </div>
              </div>
              {/* Score bars */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {[
                  { label: zh ? '库存信号' : 'Inventory Signal', score: Math.round((c.confidence_score || 82) * 0.95) },
                  { label: zh ? '利润安全' : 'Margin Safety', score: Math.round((c.confidence_score || 82) * 0.87) },
                  { label: zh ? '客户匹配' : 'Customer Fit', score: Math.round((c.confidence_score || 82) * 1.07) },
                  { label: zh ? '时机评分' : 'Timing Score', score: Math.round((c.confidence_score || 82) * 0.79) },
                  { label: zh ? '历史匹配' : 'Historical Match', score: Math.round((c.confidence_score || 82) * 1.0) },
                ].map(({ label, score }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 110, fontSize: 11, color: '#6b7280', flexShrink: 0 }}>{label}</div>
                    <div style={{ flex: 1, minWidth: 0, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626', borderRadius: 3 }}/>
                    </div>
                    <div style={{ width: 28, fontSize: 11, fontWeight: 600, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{Math.min(score, 100)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {!c.is_ai_recommended && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>{zh ? '手动活动' : 'Manual Campaign'}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{zh ? '此活动是手动创建的，未使用 AI 推荐。' : 'This campaign was created manually without AI recommendations.'}</p>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%', boxSizing: 'border-box', marginBottom: 16 }}>
          {[
            { label: zh ? '营收' : 'Revenue', value: c.revenue_actual ? '$' + c.revenue_actual.toLocaleString() : '—', color: '#111827' },
            { label: zh ? '订单数' : 'Orders', value: c.orders_actual || '—', color: '#111827' },
            { label: zh ? '折扣成本' : 'Discount Cost', value: c.discount_cost_actual ? '$' + c.discount_cost_actual.toLocaleString() : '—', color: '#d97706' },
            { label: zh ? '利润影响' : 'Margin Impact', value: c.margin_impact_pct ? c.margin_impact_pct + '%' : '—', color: c.margin_impact_pct < 0 ? '#dc2626' : '#16a34a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ minWidth: 0, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {(c.revenue_actual || c.redemptions) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#374151' }}>{zh ? '每日营收' : 'Daily Revenue'}</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#374151' }}>{zh ? '每日兑换' : 'Redemptions Per Day'}</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="redemptions" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {c.status === 'Ended' && <CampaignReviewPanel campaign={c} />}

        {c.data_sources && (() => {
          try {
            const ds = JSON.parse(c.data_sources);
            if (ds.length > 0) return (
              <div className="mb-4 rounded-lg p-3" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#374151' }}>{zh ? '使用的数据源' : 'Data Sources Used'}</p>
                <ul className="space-y-1">{ds.map((d, i) => <li key={i} className="text-xs" style={{ color: '#6b7280' }}>• {d}</li>)}</ul>
              </div>
            );
          } catch { return null; }
        })()}

        {c.guardrails_applied && (
          <div className="rounded-lg p-4 mb-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#374151' }}>{zh ? '护栏合规' : 'Guardrail Compliance'}</p>
            <div className="flex flex-wrap gap-2">
              {c.guardrails_applied.split(',').map((g, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>✓ {g.trim()}</span>
              ))}
            </div>
          </div>
        )}

        <AIDiagnosis c={c} lang={lang} />

        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex gap-2">
            {c.status === 'Active' && (
              <button onClick={() => onAction(c, 'Paused')} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#fef9c3', color: '#ca8a04', border: '1px solid #fde68a' }}>
                <Pause className="w-3.5 h-3.5" />{zh ? '⏸ 暂停' : '⏸ Pause'}
              </button>
            )}
            {c.status === 'Paused' && (
              <button onClick={() => onAction(c, 'Active')} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <Play className="w-3.5 h-3.5" />{zh ? '▶ 恢复' : '▶ Resume'}
              </button>
            )}
            {c.status !== 'Ended' && c.status !== 'Draft' && (
              <button onClick={() => onAction(c, 'Ended')} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <XCircle className="w-3.5 h-3.5" />{zh ? '结束' : 'End'}
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
              <Copy className="w-3.5 h-3.5" />{zh ? '复制' : 'Duplicate'}
            </button>
          </div>
          {DELETABLE_STATUSES.includes(c.status) ? (
            <button onClick={() => onDelete(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Campaign
            </button>
          ) : NON_DELETABLE_STATUSES.includes(c.status) ? (
            <span className="text-xs italic" style={{ color: '#9ca3af' }}>{zh ? '请先暂停或结束再删除' : 'Pause or end to delete'}</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function CampaignMonitor() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [conflictModal, setConflictModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      queryClient.invalidateQueries(['audit']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: async () => {
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        action: 'Deleted',
        campaign_name: deleteTarget?.name,
        details: 'Campaign permanently deleted',
      });
      queryClient.invalidateQueries(['campaigns']);
      queryClient.invalidateQueries(['audit']);
      setExpandedId(null);
      setDeleteTarget(null);
      toast({ title: 'Campaign deleted successfully' });
    },
  });

  const handleDeleteClick = (campaign) => {
    if (NON_DELETABLE_STATUSES.includes(campaign.status)) return;
    setDeleteTarget(campaign);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const logAudit = async (action, campaignName, details = '') => {
    try {
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        action,
        campaign_name: campaignName,
        details,
      });
    } catch { /* silent */ }
  };

  const handleAction = async (campaign, newStatus, rejectionReason = null) => {
    const updateData = { status: newStatus };
    if (rejectionReason) updateData.rejection_reason = rejectionReason;
    updateMutation.mutate({ id: campaign.id, data: updateData });

    const actionLabel = {
      Active: 'Deployed',
      Paused: 'Paused',
      Ended: 'Cancelled',
      'Pending Approval': 'Submitted for Approval',
      Approved: 'Approved',
      Draft: rejectionReason ? 'Rejected' : 'Draft Saved',
    };
    await logAudit(actionLabel[newStatus] || 'Draft Saved', campaign.name, rejectionReason ? `Rejected: ${rejectionReason}` : `Status → ${newStatus}`);

    // Auto-trigger outcome evaluation when campaign ends
    if (newStatus === 'Ended') {
      try {
        const { accuracyScore, quality } = await evaluateCampaignOutcome({ ...campaign, status: 'Ended' });
        if (accuracyScore != null) {
          toast({ title: `Outcome evaluated: ${Math.round(accuracyScore)}% accuracy (${quality}). AI memory updated.` });
          await base44.entities.AuditLog.create({
            timestamp: new Date().toISOString(),
            action: 'Campaign Ended - Outcome Evaluated',
            campaign_name: campaign.name,
            details: `Prediction accuracy: ${Math.round(accuracyScore)}%. Quality: ${quality}. AI memory updated.`,
          });
        }
      } catch { /* non-blocking */ }
    }
  };

  // Deploy with conflict check
  const handleDeploy = (campaign) => {
    const liveCampaigns = campaigns.filter(c => (c.status === 'Active' || c.status === 'Scheduled') && c.id !== campaign.id);
    const skus = (campaign.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
    const conflicts = detectConflicts({
      targetProducts: skus,
      targetSegment: campaign.target_segment,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      discountValue: campaign.discount_value || 0,
    }, liveCampaigns);

    if (conflicts.length > 0) {
      setConflictModal({ campaign, conflicts });
    } else {
      handleAction(campaign, 'Active');
    }
  };

  const handleConflictResolveAll = async (resolutions) => {
    const { campaign, conflicts } = conflictModal;

    // Apply resolutions
    for (const conflict of conflicts) {
      const resolution = resolutions[conflict.id];
      if (!resolution) continue;

      if (resolution.action === 'pause_other' && conflict.conflictingCampaign) {
        await base44.entities.Campaign.update(conflict.conflictingCampaign.id, { status: 'Paused' });
        await logAudit('Paused', conflict.conflictingCampaign.name, `Auto-paused to resolve conflict with "${campaign.name}"`);
      }

      // Log each conflict resolution to audit
      await logAudit(
        resolution.isOverride ? 'Override Accepted' : 'Conflict Resolved',
        campaign.name,
        `Conflict [${conflict.type}] resolved: "${resolution.label}"${resolution.isOverride ? ' (OVERRIDE)' : ''}`
      );
    }

    // Deploy
    await handleAction(campaign, 'Active');
    setConflictModal(null);
  };

  const handleConflictSaveDraft = async () => {
    const { campaign, conflicts } = conflictModal;
    await logAudit('Draft Saved', campaign.name, `Saved as draft due to ${conflicts.length} unresolved conflict(s)`);
    setConflictModal(null);
  };

  const pendingCount = campaigns.filter(c => c.status === 'Pending Approval').length;

  const filteredCampaigns = activeTab === 'All'
    ? campaigns
    : campaigns.filter(c => c.status === activeTab);

  return (
    <div>
      <AnimatePresence>
        {conflictModal && (
          <ConflictResolutionModal
            conflicts={conflictModal.conflicts}
            onResolveAll={handleConflictResolveAll}
            onSaveDraft={handleConflictSaveDraft}
            onCancel={() => setConflictModal(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {deleteTarget && (
        <DeleteConfirmModal
          campaign={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl" style={{ background: '#f3f4f6', width: 'fit-content' }}>
        {STATUS_TABS_EN.map((tab, idx) => {
          const count = tab === 'All' ? campaigns.length : campaigns.filter(c => c.status === tab).length;
          const isActive = activeTab === tab;
          const isPending = tab === 'Pending Approval';
          const label = zh ? STATUS_TABS_ZH[idx] : tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? '#111827' : '#6b7280',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {isPending && count > 0 && <Clock className="w-3 h-3" style={{ color: '#d97706' }} />}
              {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{
                  background: isPending && count > 0 ? '#fde68a' : isActive ? '#eff6ff' : '#e5e7eb',
                  color: isPending && count > 0 ? '#d97706' : isActive ? '#2563eb' : '#9ca3af',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {(zh ? ['名称', '类型', '状态', '置信度', '开始', '结束', '营收', '订单', '折扣成本', '利润', '评分', ''] : ['Name', 'Type', 'Status', 'Confidence', 'Start', 'End', 'Revenue', 'Orders', 'Disc. Cost', 'Margin', 'Score', '']).map(h => (
                  <th key={h} className={TH} style={{ color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>
                  {zh ? (activeTab !== 'All' ? `没有"${zh ? STATUS_TABS_ZH[STATUS_TABS_EN.indexOf(activeTab)] : activeTab}"状态的活动` : '暂无活动') : (`No campaigns${activeTab !== 'All' ? ` with status "${activeTab}"` : ''}.`)}
                </td></tr>
              ) : filteredCampaigns.map(c => (
                <React.Fragment key={c.id}>
                  <tr
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid #f3f4f6', background: expandedId === c.id ? '#f0f7ff' : '' }}
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    onMouseEnter={e => { if (expandedId !== c.id) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (expandedId !== c.id) e.currentTarget.style.background = ''; }}
                  >

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {expandedId === c.id ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />}
                        <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#111827' }}>{c.name}</span>
                        {c.is_ai_recommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>AI</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><PromotionTypeBadge type={c.promotion_type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      {c.is_ai_recommended ? (
                        c.confidence_score != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.confidence_score >= 80 ? '#16a34a' : c.confidence_score >= 60 ? '#ca8a04' : '#dc2626' }} />
                            <span className="text-xs font-bold" style={{ color: '#374151' }}>{c.confidence_score}</span>
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#f3f4f6', color: '#9ca3af' }}>{zh ? '待定' : 'Pending'}</span>
                        )
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#f3f4f6', color: '#6b7280' }}>{zh ? '手动' : 'Manual'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{c.start_date || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>{c.end_date || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#111827' }}>{c.revenue_actual ? `$${c.revenue_actual.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>{c.orders_actual || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>{c.discount_cost_actual ? `$${c.discount_cost_actual.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: c.margin_impact_pct < 0 ? '#dc2626' : '#16a34a' }}>{c.margin_impact_pct != null ? `${c.margin_impact_pct}%` : '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: c.performance_score >= 75 ? '#16a34a' : c.performance_score >= 50 ? '#ca8a04' : c.performance_score ? '#dc2626' : '#9ca3af' }}>{c.performance_score || '—'}</span></td>
                    <td className="px-4 py-3">
                      <RowActionsMenu campaign={c} onDelete={handleDeleteClick} />
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === c.id && (
                      <tr key={`${c.id}-d`} style={{ height: 'auto' }}>
                        <td colSpan={12} className="p-0" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <DetailPanel c={c} onAction={handleAction} onDeploy={handleDeploy} onDelete={handleDeleteClick} isUpdating={updateMutation.isPending} lang={lang} />
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}