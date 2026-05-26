import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, TrendingUp, Zap, AlertTriangle, Sparkles, XCircle, Activity, Shield, Package, BarChart3, Eye, RefreshCw, CheckCircle, Clock, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion } from 'framer-motion';
import { generateEvaluationReport } from '@/lib/evaluationFramework';
import { analyzePortfolio, suggestPortfolioRebalancing } from '@/lib/portfolioOptimizer';
import { detectTriggers, getTriggerColor } from '@/lib/triggerDetector';
import { runAllAgents, getAgentStatusColor } from '@/lib/monitoringAgents';
import { buildFeatureVector } from '@/lib/featureStore';
import { getVersionLabel, CURRENT_VERSIONS } from '@/lib/recommendationVersioning';

const TICK = { fontSize: 11, fill: '#9ca3af' };
const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e5e7eb', borderRadius: 8, fontSize: 12 };

function SectionCard({ title, iconComp: IconComp, iconColor = '#2563eb', children, noPad = false, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden mb-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
        <div className="flex items-center gap-2.5">
          {IconComp && <IconComp className="w-4 h-4" style={{ color: iconColor }} />}
          <h2 className="text-sm font-bold" style={{ color: '#111827' }}>{title}</h2>
        </div>
        {action}
      </div>
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </motion.div>
  );
}

function Tab({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
      style={{ background: active ? '#1a1a1a' : 'transparent', color: active ? '#fff' : '#6b7280' }}>
      {label}
      {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#2563eb', color: '#fff' }}>{badge}</span>}
    </button>
  );
}

function safeJSON(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function Intelligence() {
  const [activeTab, setActiveTab] = useState('evaluation');
  const [agentResults, setAgentResults] = useState([]);
  const [runningAgents, setRunningAgents] = useState(false);

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => base44.entities.Campaign.list('-created_date', 100) });
  const { data: rawProducts = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list('name', 50) });
  const products = rawProducts.reduce((acc, p) => { if (!acc.find(x => x.sku === p.sku)) acc.push(p); return acc; }, []);
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.CustomerSegment.list('name', 20) });
  const { data: feedbackItems = [] } = useQuery({ queryKey: ['feedback'], queryFn: () => base44.entities.FeedbackLoop.list('-review_date', 50) });
  const { data: aiLogItems = [] } = useQuery({ queryKey: ['ai-logs'], queryFn: () => base44.entities.AIRecommendationLog.list('-created_date', 100) });
  const { data: aiMemoryRecords = [] } = useQuery({ queryKey: ['ai-memory'], queryFn: () => base44.entities.AIMemory.list('memory_type', 50) });

  // Compute intelligence modules
  const evalReport = generateEvaluationReport(feedbackItems, aiLogItems, campaigns);
  const activeCampaigns = campaigns.filter(c => ['Active','Live','Deployed'].includes(c.status));
  const portfolioAnalysis = analyzePortfolio(activeCampaigns, products, segments);
  const portfolioSuggestions = suggestPortfolioRebalancing(portfolioAnalysis, products, segments);
  const triggers = detectTriggers(products, campaigns, segments, feedbackItems);
  const featureVector = buildFeatureVector(products, segments, campaigns, feedbackItems, 'boost revenue');

  const handleRunAgents = () => {
    setRunningAgents(true);
    setTimeout(() => {
      const results = runAllAgents(products, campaigns, segments, feedbackItems);
      setAgentResults(results);
      setRunningAgents(false);
    }, 500);
  };

  useEffect(() => {
    handleRunAgents();
  }, [products, campaigns, segments, feedbackItems]);

  // Evaluation metrics
  const predQuality = evalReport.prediction_quality;
  const recQuality = evalReport.recommendation_quality;

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 mb-5 rounded-xl" style={{ background: '#f3f4f6', width: 'fit-content' }}>
        <Tab label="Evaluation Dashboard" active={activeTab === 'evaluation'} onClick={() => setActiveTab('evaluation')} badge={predQuality.grade !== 'No Data' ? predQuality.grade[0] : null} />
        <Tab label="Portfolio Intelligence" active={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} badge={portfolioAnalysis.total_active} />
        <Tab label="Trigger Detection" active={activeTab === 'triggers'} onClick={() => setActiveTab('triggers')} badge={triggers.length > 0 ? triggers.length : null} />
        <Tab label="Monitoring Agents" active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} badge={agentResults.filter(a=>a.status==='healthy').length} />
        <Tab label="Version History" active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} />
      </div>

      {/* TAB 1: EVALUATION DASHBOARD */}
      {activeTab === 'evaluation' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4" style={{ background: predQuality.score >= 75 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${predQuality.score >= 75 ? '#bbf7d0' : '#fde68a'}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: predQuality.score >= 75 ? '#16a34a' : '#ca8a04' }}>Prediction Quality</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold" style={{ color: predQuality.score >= 85 ? '#16a34a' : predQuality.score >= 60 ? '#ca8a04' : '#dc2626' }}>{predQuality.score}</p>
                <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>/100</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Grade: <strong>{predQuality.grade}</strong></p>
              {predQuality.trend !== 'insufficient_data' && (
                <p className="text-[10px]" style={{ color: predQuality.trend === 'improving' ? '#16a34a' : '#dc2626' }}>
                  Trend: {predQuality.trend === 'improving' ? '📈 Improving' : '📉 Declining'}
                </p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-xl p-4" style={{ background: recQuality.acceptance_rate >= 70 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${recQuality.acceptance_rate >= 70 ? '#bbf7d0' : '#fde68a'}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#7c3aed' }}>Recommendation Quality</p>
              <p className="text-2xl font-bold" style={{ color: '#7c3aed' }}>{recQuality.acceptance_rate}%</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Acceptance Rate</p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Deployment: {recQuality.deployment_rate}%</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl p-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#2563eb' }}>Learning Velocity</p>
              <p className="text-2xl font-bold" style={{ color: '#2563eb' }}>{evalReport.system_health.learning_velocity}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{evalReport.system_health.ended_with_data} campaigns analyzed</p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>{evalReport.system_health.active_campaigns} active</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-xl p-4" style={{ background: '#faf5ff', border: '1px solid #ddd6fe' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#7c3aed' }}>Confidence Calibration</p>
              <p className="text-2xl font-bold" style={{ color: '#7c3aed' }}>{evalReport.system_health.confidence_calibration}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>AI model status</p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>v{CURRENT_VERSIONS.prediction_model}</p>
            </motion.div>
          </div>

          <SectionCard title="Detailed Metrics" iconComp={TrendingUp} iconColor="#16a34a">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-bold mb-3" style={{ color: '#374151' }}>Revenue vs Order Accuracy</p>
                <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Revenue Accuracy</p>
                      <p className="text-xl font-bold" style={{ color: predQuality.revenue_accuracy >= 80 ? '#16a34a' : '#ca8a04' }}>{predQuality.revenue_accuracy || 0}%</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>Sample: {predQuality.sample_size}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Order Accuracy</p>
                      <p className="text-xl font-bold" style={{ color: predQuality.order_accuracy >= 80 ? '#16a34a' : '#ca8a04' }}>{predQuality.order_accuracy || 0}%</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>Sample: {predQuality.sample_size}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-3" style={{ color: '#374151' }}>System Health Summary</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Active Campaigns</span>
                    <span className="text-sm font-bold" style={{ color: '#111827' }}>{evalReport.system_health.active_campaigns}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Ended with Data</span>
                    <span className="text-sm font-bold" style={{ color: '#111827' }}>{evalReport.system_health.ended_with_data}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Generated At</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>{new Date(evalReport.generated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 2: PORTFOLIO INTELLIGENCE */}
      {activeTab === 'portfolio' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-5 lg:col-span-2" style={{ background: portfolioAnalysis.portfolio_score >= 80 ? '#f0fdf4' : portfolioAnalysis.portfolio_score >= 60 ? '#fffbeb' : '#fef2f2', border: `1px solid ${portfolioAnalysis.portfolio_score >= 80 ? '#bbf7d0' : portfolioAnalysis.portfolio_score >= 60 ? '#fde68a' : '#fecaca'}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: portfolioAnalysis.portfolio_score >= 80 ? '#16a34a' : portfolioAnalysis.portfolio_score >= 60 ? '#ca8a04' : '#dc2626' }}>Portfolio Score</p>
                  <p className="text-4xl font-bold mt-1" style={{ color: portfolioAnalysis.portfolio_score >= 80 ? '#16a34a' : portfolioAnalysis.portfolio_score >= 60 ? '#ca8a04' : '#dc2626' }}>{portfolioAnalysis.portfolio_score}</p>
                </div>
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { metric: 'Diversification', value: Math.max(0, 100 - portfolioAnalysis.oversaturated_segments.length * 20) },
                      { metric: 'SKU Focus', value: Math.max(0, 100 - portfolioAnalysis.oversaturated_skus.length * 25) },
                      { metric: 'Budget Efficiency', value: portfolioAnalysis.total_active > 0 ? Math.min(100, Math.round(100 - (portfolioAnalysis.total_discount_budget / portfolioAnalysis.total_active / 100))) : 50 },
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>{portfolioAnalysis.recommendation}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-bold mb-3" style={{ color: '#374151' }}>Exposure Summary</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Total Active</p>
                  <p className="text-2xl font-bold" style={{ color: '#111827' }}>{portfolioAnalysis.total_active}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Oversaturated Segments</p>
                  <p className="text-xl font-bold" style={{ color: portfolioAnalysis.oversaturated_segments.length > 0 ? '#dc2626' : '#16a34a' }}>{portfolioAnalysis.oversaturated_segments.length}</p>
                  {portfolioAnalysis.oversaturated_segments.length > 0 && (
                    <p className="text-[10px]" style={{ color: '#6b7280' }}>{portfolioAnalysis.oversaturated_segments.slice(0,2).join(', ')}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Oversaturated SKUs</p>
                  <p className="text-xl font-bold" style={{ color: portfolioAnalysis.oversaturated_skus.length > 0 ? '#dc2626' : '#16a34a' }}>{portfolioAnalysis.oversaturated_skus.length}</p>
                  {portfolioAnalysis.oversaturated_skus.length > 0 && (
                    <p className="text-[10px]" style={{ color: '#6b7280' }}>{portfolioAnalysis.oversaturated_skus.slice(0,2).join(', ')}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {portfolioSuggestions.length > 0 && (
            <SectionCard title="Rebalancing Suggestions" iconComp={RefreshCw} iconColor="#2563eb">
              <div className="space-y-2">
                {portfolioSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <Target className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2563eb' }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#1e40af' }}>{s.action.replace('_', ' ')}</p>
                      <p className="text-xs" style={{ color: '#374151' }}>{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {portfolioAnalysis.risks.length > 0 && (
            <SectionCard title="Portfolio Risks" iconComp={AlertTriangle} iconColor="#dc2626">
              <div className="space-y-2">
                {portfolioAnalysis.risks.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: r.severity === 'High' ? '#fef2f2' : '#fff7ed', border: `1px solid ${r.severity === 'High' ? '#fecaca' : '#fed7aa'}` }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: r.severity === 'High' ? '#dc2626' : '#ea580c' }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: r.severity === 'High' ? '#dc2626' : '#ea580c' }}>{r.type}</p>
                      <p className="text-xs" style={{ color: '#374151' }}>{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* TAB 3: TRIGGER DETECTION */}
      {activeTab === 'triggers' && (
        <div>
          {triggers.length === 0 ? (
            <SectionCard title="No Active Triggers" iconComp={CheckCircle} iconColor="#16a34a">
              <p className="text-sm" style={{ color: '#6b7280' }}>All systems normal. No immediate actions required.</p>
            </SectionCard>
          ) : (
            <div className="space-y-3">
              {triggers.map((t, i) => {
                const colors = getTriggerColor(t.severity);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.text}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: colors.border, color: colors.text }}>{t.severity}</span>
                          <span className="text-xs font-bold" style={{ color: colors.text }}>{t.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{t.detail}</p>
                        {t.product && <p className="text-xs" style={{ color: '#6b7280' }}>Product: {t.product}</p>}
                        {t.segment && <p className="text-xs" style={{ color: '#6b7280' }}>Segment: {t.segment}</p>}
                        {t.campaign && <p className="text-xs" style={{ color: '#6b7280' }}>Campaign: {t.campaign}</p>}
                      </div>
                      <div className="flex-shrink-0">
                        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#9ca3af' }}>Recommended Action</p>
                        <p className="text-xs font-semibold" style={{ color: '#374151' }}>{t.action}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MONITORING AGENTS */}
      {activeTab === 'agents' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm" style={{ color: '#6b7280' }}>5 autonomous agents monitoring your campaigns</p>
            <button onClick={handleRunAgents} disabled={runningAgents}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#2563eb', color: '#fff', opacity: runningAgents ? 0.7 : 1 }}>
              {runningAgents ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {runningAgents ? 'Running...' : 'Run All Agents'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {agentResults.map((agent, i) => {
              const colors = getAgentStatusColor(agent.status);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{agent.icon}</span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#111827' }}>{agent.name}</p>
                        <p className="text-[10px]" style={{ color: colors.text }}>{agent.status === 'healthy' ? '✓ All Clear' : `${agent.alerts.length} alert${agent.alerts.length > 1 ? 's' : ''}`}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: colors.border, color: colors.text }}>{agent.status}</span>
                  </div>
                  {agent.alerts.length > 0 && (
                    <div className="space-y-1.5">
                      {agent.alerts.slice(0, 2).map((a, j) => (
                        <div key={j} className="text-[10px] p-2 rounded" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                          <p className="font-semibold" style={{ color: a.severity === 'High' || a.severity === 'Critical' ? '#dc2626' : '#ca8a04' }}>{a.message}</p>
                        </div>
                      ))}
                      {agent.alerts.length > 2 && (
                        <p className="text-[10px]" style={{ color: '#9ca3af' }}>+{agent.alerts.length - 2} more alerts</p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {agentResults.some(a => a.alerts.length > 0) && (
            <SectionCard title="All Active Alerts" iconComp={AlertTriangle} iconColor="#dc2626">
              <div className="space-y-2">
                {agentResults.flatMap(a => a.alerts.map(alert => ({ ...alert, agent: a.agent }))).map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: alert.severity === 'Critical' || alert.severity === 'High' ? '#fef2f2' : '#fffbeb', border: `1px solid ${alert.severity === 'Critical' || alert.severity === 'High' ? '#fecaca' : '#fde68a'}` }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: alert.severity === 'Critical' || alert.severity === 'High' ? '#dc2626' : '#ca8a04' }} />
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: '#111827' }}>{alert.agent}: {alert.message}</p>
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Action: {alert.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* TAB 5: VERSION HISTORY */}
      {activeTab === 'versions' && (
        <div>
          <SectionCard title="Recommendation Version History" iconComp={Clock} iconColor="#7c3aed">
            {aiLogItems.length === 0 ? (
              <p className="text-sm" style={{ color: '#6b7280' }}>No recommendation logs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {['Date', 'Goal', 'Confidence', 'Scoring Engine', 'Prediction Model', 'Status'].map(h => (
                        <th key={h} className="pb-2 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiLogItems.slice(0, 20).map((log, i) => {
                      const version = log.version_metadata ? getVersionLabel(log.version_metadata) : 'v1.0';
                      const status = log.was_deployed ? 'Deployed' : log.was_accepted ? 'Accepted' : log.was_rejected ? 'Rejected' : 'Pending';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td className="py-2" style={{ color: '#6b7280' }}>{log.created_date ? new Date(log.created_date).toLocaleDateString() : '—'}</td>
                          <td className="py-2 font-semibold" style={{ color: '#111827' }}>{log.goal}</td>
                          <td className="py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: (log.confidence_score || 70) >= 80 ? '#f0fdf4' : '#fffbeb', color: (log.confidence_score || 70) >= 80 ? '#16a34a' : '#ca8a04' }}>
                              {log.confidence_score || '—'}
                            </span>
                          </td>
                          <td className="py-2" style={{ color: '#6b7280' }}>{version}</td>
                          <td className="py-2" style={{ color: '#6b7280' }}>{log.version_metadata?.prediction_model_version || 'unknown'}</td>
                          <td className="py-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{
                              background: status === 'Deployed' ? '#f0fdf4' : status === 'Accepted' ? '#eff6ff' : status === 'Rejected' ? '#fef2f2' : '#f9fafb',
                              color: status === 'Deployed' ? '#16a34a' : status === 'Accepted' ? '#2563eb' : status === 'Rejected' ? '#dc2626' : '#6b7280'
                            }}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color: '#9ca3af' }}>Current System Versions</p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(CURRENT_VERSIONS).map(([key, version]) => (
                  <div key={key}>
                    <p className="text-[10px]" style={{ color: '#6b7280' }}>{key.replace('_', ' ')}</p>
                    <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>v{version}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}