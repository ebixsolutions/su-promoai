import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, DollarSign, Activity, Bot, Lightbulb, AlertTriangle, Clock, ArrowRight, Loader2, Brain } from 'lucide-react';
import KpiCard from '@/components/shared/KpiCard';
import StatusBadge from '@/components/shared/StatusBadge';
import PromotionTypeBadge from '@/components/shared/PromotionTypeBadge';
import { motion } from 'framer-motion';
import { callAnthropic } from '@/lib/anthropic';
import { detectConflicts } from '@/lib/conflictDetector.js';
import { seedDataIfEmpty } from '@/lib/seedData.js';
import ConflictFixModal from '@/components/conflicts/ConflictFixModal';
import { analyzePortfolio } from '@/lib/portfolioOptimizer';
import { detectTriggers } from '@/lib/triggerDetector';
import { runAllAgents } from '@/lib/monitoringAgents';
import { generateEvaluationReport } from '@/lib/evaluationFramework';

const INSIGHT_TYPE_MAP = {
  warning:     { icon: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  opportunity: { icon: '📈', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  insight:     { icon: '💡', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  timing:      { icon: '🕐', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
};

const INSIGHTS_CACHE_KEY = 'ai_insights_cache';

const shouldRefreshInsights = () => {
  try {
    const cached = localStorage.getItem(INSIGHTS_CACHE_KEY);
    if (!cached) return true;
    const { timestamp, insights } = JSON.parse(cached);
    if (!insights || insights.length === 0) return true;
    const lastFetch = new Date(timestamp);
    const now = new Date();
    const todayAt8 = new Date(now);
    todayAt8.setHours(8, 0, 0, 0);
    if (now >= todayAt8 && lastFetch < todayAt8) return true;
    if (lastFetch.toDateString() !== now.toDateString()) return true;
    return false;
  } catch { return true; }
};

const saveInsightsToCache = (insights) => {
  try { localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify({ timestamp: new Date().toISOString(), insights })); } catch {}
};

const loadInsightsFromCache = () => {
  try {
    const cached = localStorage.getItem(INSIGHTS_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached).insights || null;
  } catch { return null; }
};

const formatLastUpdated = (date) => {
  if (!date) return null;
  const now = new Date();
  const d = new Date(date);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`;
};

const FALLBACK_CONFIDENCE = 82;
const FALLBACK_CONFIDENCE_COUNT = 8;
const FALLBACK_LEARNING = 88;
const FALLBACK_LEARNING_COUNT = 3;

function SectionCard({ title, iconComp: IconComp, iconColor = '#2563eb', children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden mb-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
        {IconComp && <IconComp className="w-4 h-4" style={{ color: iconColor }} />}
        <h2 className="text-sm font-bold" style={{ color: '#111827' }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function IntelligenceBadge({ label, value, max, color, suffix }) {
  const pct = typeof value === 'string' ? 50 : Math.round((value / max) * 100);
  return (
    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9ca3af' }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-lg font-bold" style={{ color }}>{typeof value === 'string' ? value : value}</p>
        {suffix && <span className="text-[10px]" style={{ color: '#6b7280' }}>{suffix}</span>}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full w-full" style={{ background: '#e5e7eb' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsLastUpdated, setInsightsLastUpdated] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState('idle'); // 'idle' | 'loading' | 'done'
  const [fixingConflict, setFixingConflict] = useState(null);
  const [resolvedConflictDetails, setResolvedConflictDetails] = useState([]);
  const [avgConfidence, setAvgConfidence] = useState(FALLBACK_CONFIDENCE);
  const [confidenceCount, setConfidenceCount] = useState(FALLBACK_CONFIDENCE_COUNT);
  const [learningScore, setLearningScore] = useState(FALLBACK_LEARNING);
  const [learningCount, setLearningCount] = useState(FALLBACK_LEARNING_COUNT);
  const seeded = React.useRef(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 50),
  });

  const { data: rawProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('name', 50),
  });
  const products = rawProducts.reduce((acc, p) => { if (!acc.find(x => x.sku === p.sku)) acc.push(p); return acc; }, []);

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.FeedbackLoop.list('-created_date', 20),
  });
  
  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: () => base44.entities.CustomerSegment.list('name', 20),
  });
  
  const { data: aiLogItems = [] } = useQuery({
    queryKey: ['ai-logs'],
    queryFn: () => base44.entities.AIRecommendationLog.list('-created_date', 100),
  });

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      seedDataIfEmpty();
    }
  }, []);

  // Card 1: AI Confidence Avg — from campaigns with confidence_score
  useEffect(() => {
    if (campaigns.length === 0) return;
    const withConf = campaigns.filter(c => c.confidence_score != null && c.is_ai_recommended);
    if (withConf.length > 0) {
      const avg = Math.round(withConf.reduce((s, c) => s + c.confidence_score, 0) / withConf.length);
      setAvgConfidence(avg);
      setConfidenceCount(withConf.length);
    }
  }, [campaigns]);

  // Card 4: Learning Score — from FeedbackLoop accuracy_score
  useEffect(() => {
    const withScore = feedback.filter(f => f.accuracy_score != null);
    if (withScore.length > 0) {
      const avg = Math.round(withScore.reduce((s, f) => s + f.accuracy_score, 0) / withScore.length);
      setLearningScore(avg);
      setLearningCount(withScore.length);
    }
  }, [feedback]);

  const fetchInsights = async (manual = false) => {
    if (products.length === 0 && campaigns.length === 0) return;
    if (manual) setRefreshStatus('loading');
    else setInsightsLoading(true);
    try {
      const weeksSupply = (p) => Math.round((p.stock_qty || 0) / Math.max(p.sales_velocity || 1, 1));
      const topProducts = products
        .map(p => ({ ...p, ws: weeksSupply(p) }))
        .sort((a, b) => b.ws - a.ws)
        .slice(0, 5);
      const segments = await base44.entities.CustomerSegment.list().catch(() => []);
      const prompt = `Store data:
PRODUCTS: ${topProducts.map(p => `${p.name}(${p.sku}):${p.stock_qty}u,${p.ws}wk,${p.margin_pct}%mgn${p.is_slow_moving ? ',SLOW' : ''}`).join('; ')}
ACTIVE: ${campaigns.filter(c => c.status === 'Active').map(c => c.name).join(', ') || 'none'}
SEGMENTS: ${segments.slice(0, 5).map(s => `${s.name}:${s.size},AOV$${s.avg_order_value},churn=${s.churn_risk}`).join('; ')}

Return ONLY a JSON array of exactly 4 objects: [{"type":"warning|opportunity|insight|timing","text":"1-2 sentence insight"}]`;

      const text = await callAnthropic(prompt);
      const match = text.match(/\[[\s\S]*\]/);
      const parsed = match ? JSON.parse(match[0]) : [];
      if (parsed.length > 0) {
        const mapped = parsed.map(item => ({ type: item.type, text: item.text }));
        setInsights(mapped);
        saveInsightsToCache(mapped);
        setInsightsLastUpdated(new Date());
      }
    } catch {
      const fallback = [
        { type: 'warning',     text: '4 products have high inventory aging — recommend clearance campaign' },
        { type: 'opportunity', text: "Returning customers haven't been targeted in 14 days — ideal for re-engagement" },
        { type: 'insight',     text: 'Bundle discounts outperforming product discounts by 34% this month' },
        { type: 'timing',      text: 'VIP segment shows 68% redemption rate — ideal for next high-value push' },
      ];
      setInsights(fallback);
    } finally {
      setInsightsLoading(false);
      if (manual) {
        setRefreshStatus('done');
        setTimeout(() => setRefreshStatus('idle'), 2000);
      }
    }
  };

  // On mount: load from cache or fetch
  const didInitInsights = React.useRef(false);
  useEffect(() => {
    if (didInitInsights.current) return;
    if (products.length === 0 && campaigns.length === 0) return;
    didInitInsights.current = true;
    const cached = loadInsightsFromCache();
    if (cached && !shouldRefreshInsights()) {
      setInsights(cached);
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(INSIGHTS_CACHE_KEY));
        setInsightsLastUpdated(new Date(timestamp));
      } catch {}
    } else {
      fetchInsights();
    }
  }, [products, campaigns]);

  const active = campaigns.filter(c => c.status === 'Active').length;
  const revenue = campaigns.reduce((s, c) => s + (c.revenue_actual || 0), 0);
  const discountSpend = campaigns.reduce((s, c) => s + (c.discount_cost_actual || 0), 0);
  const scored = campaigns.filter(c => c.performance_score);
  const avgScore = scored.length ? Math.round(scored.reduce((s, c) => s + c.performance_score, 0) / scored.length) : 0;
  const recent = campaigns.slice(0, 6);

  // Pending approvals
  const pendingApprovals = campaigns.filter(c => c.status === 'Pending Approval');



  // Card 3: Only High/Medium conflicts between Active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.status === 'Scheduled');
  const allDetectedConflicts = [];
  activeCampaigns.forEach((camp) => {
    const others = activeCampaigns.filter(o => o.id !== camp.id);
    const skus = (camp.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
    const conflicts = detectConflicts(
      { targetProducts: skus, targetSegment: camp.target_segment, startDate: camp.start_date, endDate: camp.end_date, budgetCap: 0 },
      others
    );
    conflicts
      .filter(cf => cf.severity === 'High' || cf.severity === 'Medium')
      .forEach(cf => {
        const key = `${cf.detail}-${camp.id}`;
        if (!allDetectedConflicts.find(x => x._key === key)) {
          allDetectedConflicts.push({ ...cf, _key: key, source: camp.name, sourceCampaignId: camp.id });
        }
      });
  });
  const criticalConflicts = allDetectedConflicts.filter(cf => !resolvedConflictDetails.includes(cf._key));
  
  // Intelligence Summary computations
  const portfolioAnalysis = analyzePortfolio(activeCampaigns, products, segments);
  const triggers = detectTriggers(products, campaigns, segments, feedback);
  const agentResults = runAllAgents(products, campaigns, segments, feedback);
  const evalReport = generateEvaluationReport(feedback, aiLogItems, campaigns);
  const healthyAgents = agentResults.filter(a => a.status === 'healthy').length;
  const criticalTriggers = triggers.filter(t => t.severity === 'Critical' || t.severity === 'High').length;

  return (
    <div>
      {fixingConflict && (
        <ConflictFixModal
          conflict={fixingConflict}
          onClose={() => setFixingConflict(null)}
          onResolved={(cf) => setResolvedConflictDetails(prev => [...prev, cf._key])}
        />
      )}

      {/* Alert banners */}
      {pendingApprovals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: '#d97706' }} />
            <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
              {zh ? `${pendingApprovals.length} 个活动待审批` : `${pendingApprovals.length} campaign${pendingApprovals.length > 1 ? 's' : ''} pending approval`}
            </span>
          </div>
          <Link to="/campaigns" className="text-xs font-bold flex items-center gap-1" style={{ color: '#d97706' }}>
            Review <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      )}


      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title={zh ? '活跃活动' : 'Active Campaigns'} value={active} icon={Activity}
          trend={pendingApprovals.length > 0 ? `${pendingApprovals.length} ${zh ? '待审批' : 'pending'}` : null} trendUp={false}
          subtitle={pendingApprovals.length === 0 ? (zh ? '运行中' : 'running now') : undefined} />
        <KpiCard title={zh ? '本月营收' : 'Revenue This Month'} value={`$${revenue.toLocaleString()}`} icon={TrendingUp} trend="+18.4%" trendUp subtitle={zh ? '较上月' : 'vs last month'} />
        <KpiCard title={zh ? '折扣支出' : 'Discount Spend'} value={`$${discountSpend.toLocaleString()}`} icon={DollarSign} subtitle={zh ? '本月' : 'this month'} />
        <KpiCard title={zh ? '平均表现' : 'Avg Performance'} value={avgScore || '—'} icon={BarChart3} subtitle={zh ? '满分 100' : 'out of 100'} />
      </div>

      {/* Smart insight row — 4 data cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

        {/* Card 1: AI Confidence Avg */}
        <div className="rounded-lg p-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#2563eb' }}>{zh ? 'AI 平均置信度' : 'AI Confidence Avg'}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold" style={{ color: avgConfidence >= 75 ? '#16a34a' : avgConfidence >= 50 ? '#ca8a04' : '#dc2626' }}>{avgConfidence}</p>
            <span className="text-xs" style={{ color: '#6b7280' }}>/100</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full w-full" style={{ background: '#dbeafe' }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${avgConfidence}%`, background: avgConfidence >= 75 ? '#16a34a' : avgConfidence >= 50 ? '#ca8a04' : '#dc2626' }} />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: '#6b7280' }}>{zh ? `共 ${confidenceCount} 个 AI 活动` : `across ${confidenceCount} AI campaigns`}</p>
        </div>

        {/* Card 2: Pending Approvals */}
        <Link to="/campaigns" className="block rounded-lg p-4 transition-all"
          style={{
            background: pendingApprovals.length > 0 ? '#fffbeb' : '#f9fafb',
            border: `1px solid ${pendingApprovals.length > 0 ? '#fde68a' : '#e5e7eb'}`,
            cursor: pendingApprovals.length > 0 ? 'pointer' : 'default',
          }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>{zh ? '待审批' : 'Pending Approvals'}</p>
          <p className="text-2xl font-bold" style={{ color: pendingApprovals.length > 0 ? '#d97706' : '#16a34a' }}>{pendingApprovals.length}</p>
          <p className="text-[10px] mt-1" style={{ color: pendingApprovals.length > 0 ? '#92400e' : '#16a34a' }}>
            {pendingApprovals.length > 0 ? (zh ? '等待审核' : 'awaiting review') : (zh ? '全部通过' : 'All clear')}
          </p>
        </Link>

        {/* Card 3: Active Conflicts (High/Medium only) */}
        <div className="rounded-lg p-4" style={{ background: criticalConflicts.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${criticalConflicts.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: criticalConflicts.length > 0 ? '#dc2626' : '#16a34a' }}>{zh ? '活跃冲突' : 'Active Conflicts'}</p>
            {criticalConflicts.length > 3 && (
              <Link to="/campaigns" className="text-[10px] font-semibold" style={{ color: '#dc2626' }}>{zh ? '全部解决 →' : 'Resolve All →'}</Link>
            )}
          </div>
          {criticalConflicts.length === 0 ? (
            <p className="text-sm font-semibold mt-1" style={{ color: '#16a34a' }}>{zh ? '✅ 无严重冲突' : '✅ No Critical Conflicts'}</p>
          ) : (
            <>
              <p className="text-2xl font-bold mb-2" style={{ color: '#dc2626' }}>{criticalConflicts.length}</p>
              <div className="space-y-1.5">
                {criticalConflicts.slice(0, 3).map((cf, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: cf.severity === 'High' ? '#fee2e2' : '#fef9c3', color: cf.severity === 'High' ? '#dc2626' : '#ca8a04' }}>{cf.severity}</span>
                    <span className="text-[10px] flex-1 truncate" style={{ color: '#6b7280' }}>{cf.detail || cf.type}</span>
                    <button
                      onClick={() => setFixingConflict(cf)}
                      className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors"
                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                    >Fix →</button>
                  </div>
                ))}
                {criticalConflicts.length > 3 && (
                  <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>{zh ? `+${criticalConflicts.length - 3} 更多，查看活动监控` : `+${criticalConflicts.length - 3} more on Campaign Monitor`}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Card 4: Learning Score */}
        <div className="rounded-lg p-4" style={{ background: '#faf5ff', border: '1px solid #ddd6fe' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7c3aed' }}>{zh ? '学习评分' : 'Learning Score'}</p>
          <p className="text-2xl font-bold" style={{ color: learningScore >= 80 ? '#16a34a' : learningScore >= 60 ? '#ca8a04' : '#dc2626' }}>{learningScore}%</p>
          <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{zh ? `预测准确率（${learningCount} 个活动）` : `prediction accuracy (${learningCount} campaigns)`}</p>
        </div>

      </div>

      {/* Intelligence Summary Section */}
      <SectionCard title={zh ? '情报状态' : 'Intelligence Status'} iconComp={Brain} iconColor="#7c3aed">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <IntelligenceBadge label={zh ? '组合评分' : 'Portfolio Score'} value={portfolioAnalysis.portfolio_score} max={100} color={portfolioAnalysis.portfolio_score >= 80 ? '#16a34a' : portfolioAnalysis.portfolio_score >= 60 ? '#ca8a04' : '#dc2626'} />
          <IntelligenceBadge label={zh ? '活跃触发器' : 'Active Triggers'} value={criticalTriggers} max={5} color={criticalTriggers === 0 ? '#16a34a' : criticalTriggers <= 2 ? '#ca8a04' : '#dc2626'} suffix={criticalTriggers > 0 ? `(${triggers.length})` : ''} />
          <IntelligenceBadge label={zh ? '代理健康' : 'Agent Health'} value={`${healthyAgents}/5`} max={5} color={healthyAgents === 5 ? '#16a34a' : healthyAgents >= 3 ? '#ca8a04' : '#dc2626'} />
          <IntelligenceBadge label={zh ? '评估评分' : 'Evaluation Score'} value={evalReport.prediction_quality.score} max={100} color={evalReport.prediction_quality.score >= 75 ? '#16a34a' : '#ca8a04'} />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Campaigns */}
        <div className="xl:col-span-2 rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="text-sm font-bold" style={{ color: '#111827' }}>{zh ? '最近活动' : 'Recent Campaigns'}</h3>
            <Link to="/campaigns" className="flex items-center gap-1 text-xs font-medium" style={{ color: '#2563eb' }}>
              {zh ? '查看全部' : 'View all'} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {(zh ? ['名称', '类型', '状态', '营收', '评分'] : ['NAME', 'TYPE', 'STATUS', 'REVENUE', 'SCORE']).map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: '#9ca3af' }}>{zh ? '暂无活动' : 'No campaigns yet'}</td></tr>
                ) : recent.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="transition-colors cursor-default"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: '#111827' }}>{c.name}</span>
                        {c.is_ai_recommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>AI</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3"><PromotionTypeBadge type={c.promotion_type} /></td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111827' }}>{c.revenue_actual ? `$${c.revenue_actual.toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3">
                      {c.performance_score ? (
                        <span className="text-sm font-bold" style={{ color: c.performance_score >= 75 ? '#16a34a' : c.performance_score >= 50 ? '#ca8a04' : '#dc2626' }}>
                          {c.performance_score}
                        </span>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights Feed */}
        <div className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 mb-0.5">
              <Lightbulb className="w-4 h-4" style={{ color: '#2563eb' }} />
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>{zh ? 'AI 洞察' : 'AI Insights Feed'}</h3>
            </div>
            <p className="text-[10px]" style={{ color: '#9ca3af' }}>
              🕗 Updated daily at 8:00 AM{insightsLastUpdated ? ` · Last updated: ${formatLastUpdated(insightsLastUpdated)}` : ''}
            </p>
          </div>
          <div className="p-4 space-y-3">
            {insightsLoading ? (
              <div className="flex items-center justify-center py-6 gap-2" style={{ color: '#9ca3af' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{zh ? '正在分析店铺数据...' : 'Analyzing store data...'}</span>
              </div>
            ) : insights.map((item, i) => {
              const s = INSIGHT_TYPE_MAP[item.type] || INSIGHT_TYPE_MAP.insight;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className="p-3 rounded-lg flex items-start gap-2.5 transition-all"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `3px solid ${s.color}` }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                  <span className="text-sm flex-shrink-0 mt-0.5">{s.icon}</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{item.text}</p>
                </motion.div>
              );
            })}
            <button
              onClick={() => fetchInsights(true)}
              disabled={refreshStatus === 'loading'}
              className="w-full mt-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: refreshStatus === 'done' ? '#f0fdf4' : '#eff6ff', color: refreshStatus === 'done' ? '#16a34a' : '#2563eb', border: `1px solid ${refreshStatus === 'done' ? '#bbf7d0' : '#bfdbfe'}` }}
            >
              {refreshStatus === 'loading' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {zh ? '生成洞察中...' : 'Generating insights...'}</>
              ) : refreshStatus === 'done' ? (
                '✅ Updated!'
              ) : (
                <><Bot className="w-3.5 h-3.5" /> {zh ? '获取 AI 推荐' : 'Get AI Recommendations'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}