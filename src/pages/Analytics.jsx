import React, { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Brain, Users, Package, DollarSign, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';

const TICK = { fontSize: 11, fill: '#9ca3af' };
const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#374151', fontSize: 12 };

const TABS = [
  { id: 'campaign', label: 'Campaign Performance', labelZh: '活动表现', icon: BarChart2 },
  { id: 'customer', label: 'Customer Intelligence', labelZh: '客户智能', icon: Users },
  { id: 'product', label: 'Product Intelligence', labelZh: '产品智能', icon: Package },
  { id: 'ai', label: 'AI Performance', labelZh: 'AI 表现', icon: Brain },
  { id: 'financial', label: 'Financial Intelligence', labelZh: '财务智能', icon: DollarSign },
];

// Static enrichment data
const SEGMENT_HEATMAP = [
  { segment: 'VIP', product: 68, bundle: 74, coupon: 41, shipping: 28, group: 62 },
  { segment: 'Returning', product: 52, bundle: 48, coupon: 55, shipping: 38, group: 44 },
  { segment: 'Inactive 90d+', product: 29, bundle: 22, coupon: 68, shipping: 31, group: 18 },
  { segment: 'New Customers', product: 34, bundle: 28, coupon: 42, shipping: 71, group: 25 },
  { segment: 'High AOV', product: 58, bundle: 78, coupon: 35, shipping: 22, group: 66 },
];

const FATIGUE_DATA = [
  { name: 'VIP', score: 28, color: '#16a34a', level: 'Healthy' },
  { name: 'Returning', score: 35, color: '#16a34a', level: 'Healthy' },
  { name: 'Inactive 90d+', score: 8, color: '#2563eb', level: 'Fresh' },
  { name: 'New Customers', score: 52, color: '#ca8a04', level: 'Tired' },
  { name: 'High AOV', score: 31, color: '#16a34a', level: 'Healthy' },
];

const AI_WEEKLY = [
  { w: 'W1', acceptance: 62, accuracy: 71 },{ w: 'W2', acceptance: 65, accuracy: 74 },
  { w: 'W3', acceptance: 70, accuracy: 78 },{ w: 'W4', acceptance: 68, accuracy: 80 },
  { w: 'W5', acceptance: 74, accuracy: 82 },{ w: 'W6', acceptance: 78, accuracy: 85 },
  { w: 'W7', acceptance: 80, accuracy: 87 },{ w: 'W8', acceptance: 82, accuracy: 88 },
];

const CONFIDENCE_HIST = [
  { range: '50-60', count: 2 }, { range: '60-70', count: 5 }, { range: '70-80', count: 8 },
  { range: '80-90', count: 12 }, { range: '90-100', count: 6 },
];

const REVENUE_ATTR = [
  { name: 'AI Campaigns', revenue: 68400, margin: 38 },
  { name: 'Manual Campaigns', revenue: 31600, margin: 42 },
];

const DISCOUNT_ROI = [
  { type: 'Bundle', roi: 4.2 }, { type: 'Group', roi: 3.1 }, { type: 'Product', roi: 2.8 },
  { type: 'Shipping', roi: 2.1 }, { type: 'Coupon', roi: 1.9 },
];

const MARGIN_TREND = [
  { m: 'Jan', score: 72 }, { m: 'Feb', score: 74 }, { m: 'Mar', score: 69 },
  { m: 'Apr', score: 76 }, { m: 'May', score: 78 },
];

const RADAR_DATA = [
  { subject: 'AOV Uplift', product: 65, bundle: 88, coupon: 45 },
  { subject: 'Redemption', product: 72, bundle: 61, coupon: 80 },
  { subject: 'Margin', product: 55, bundle: 70, coupon: 60 },
  { subject: 'Retention', product: 60, bundle: 75, coupon: 50 },
  { subject: 'Revenue', product: 68, bundle: 85, coupon: 55 },
];

function Card({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: '#111827' }}>{title}</h3>
      {children}
    </div>
  );
}

function HeatCell({ value }) {
  const bg = value >= 60 ? '#dcfce7' : value >= 40 ? '#fef9c3' : '#fee2e2';
  const color = value >= 60 ? '#16a34a' : value >= 40 ? '#ca8a04' : '#dc2626';
  return (
    <td className="text-center py-2 px-2">
      <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: bg, color }}>{value}%</span>
    </td>
  );
}

export default function Analytics() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [activeTab, setActiveTab] = useState('campaign');

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => base44.entities.Campaign.list('-created_date', 100) });
  const { data: feedback = [] } = useQuery({ queryKey: ['feedback'], queryFn: () => base44.entities.FeedbackLoop.list('-created_date', 50) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: () => base44.entities.CustomerSegment.list('name', 50) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list('name', 50) });

  const revData = campaigns.slice(0, 8).map(c => ({
    name: c.name?.length > 12 ? c.name.slice(0, 12) + '…' : c.name || 'Unnamed',
    Revenue: c.revenue_actual || 0,
    Cost: c.discount_cost_actual || 0,
  }));

  const aiRecs = campaigns.filter(c => c.is_ai_recommended);
  const deployed = aiRecs.filter(c => ['Active', 'Ended', 'Deployed'].includes(c.status));
  const acceptanceRate = aiRecs.length > 0 ? Math.round(deployed.length / aiRecs.length * 100) : 78;
  const withConf = campaigns.filter(c => c.confidence_score != null);
  const avgConf = withConf.length > 0 ? Math.round(withConf.reduce((s, c) => s + c.confidence_score, 0) / withConf.length) : 82;

  const topByRoi = campaigns.filter(c => c.revenue_actual && c.discount_cost_actual).map(c => ({
    name: c.name, revenue: c.revenue_actual, cost: c.discount_cost_actual,
    roi: Math.round((c.revenue_actual - c.discount_cost_actual) / c.discount_cost_actual * 100),
  })).sort((a, b) => b.roi - a.roi).slice(0, 5);

  const inventoryBubbles = products.slice(0, 12).map(p => ({
    name: p.name, x: p.sales_velocity || 1, y: p.stock_qty || 0,
    z: p.margin_pct || 30,
    weeksSupply: p.sales_velocity > 0 ? Math.round(p.stock_qty / p.sales_velocity) : 999,
  }));

  const aiTotalRevenue = campaigns.filter(c => c.is_ai_recommended).reduce((s, c) => s + (c.revenue_actual || 0), 0);
  const manualTotalRevenue = campaigns.filter(c => !c.is_ai_recommended).reduce((s, c) => s + (c.revenue_actual || 0), 0);
  const revenueAttrData = [
    { name: 'AI Campaigns', revenue: aiTotalRevenue || 68400 },
    { name: 'Manual', revenue: manualTotalRevenue || 31600 },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl" style={{ background: '#f3f4f6', width: 'fit-content' }}>
        {TABS.map(tab => {
          const IconComp = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#111827' : '#6b7280', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <IconComp className="w-3.5 h-3.5" /> {zh ? tab.labelZh : tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Campaign Performance */}
      {activeTab === 'campaign' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Revenue by Campaign (Last 90 Days)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revData} margin={{ bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ ...TICK, fontSize: 9 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill="#2563eb" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="Cost" fill="#a5b4fc" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Promotion Type Comparison (Radar)">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Radar name="Product" dataKey="product" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} />
                  <Radar name="Bundle" dataKey="bundle" stroke="#10b981" fill="#10b981" fillOpacity={0.12} />
                  <Radar name="Coupon" dataKey="coupon" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          {topByRoi.length > 0 && (
            <Card title="Top 5 Campaigns by ROI">
              <div className="space-y-3">
                {topByRoi.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <span className="text-xs font-bold w-5" style={{ color: '#9ca3af' }}>#{i + 1}</span>
                    <span className="text-xs font-semibold flex-1" style={{ color: '#374151' }}>{c.name}</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>${c.revenue?.toLocaleString()}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>+{c.roi}% ROI</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Customer Intelligence */}
      {activeTab === 'customer' && (
        <div className="space-y-4">
          <Card title="Segment × Promotion Type Response Matrix (Redemption Rate %)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th className="text-left pb-2.5 text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>Segment</th>
                    {['Product', 'Bundle', 'Coupon', 'Shipping', 'Group'].map(h => (
                      <th key={h} className="text-center pb-2.5 text-[10px] font-bold uppercase" style={{ color: '#9ca3af' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SEGMENT_HEATMAP.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="py-2.5 pr-4 font-semibold" style={{ color: '#111827' }}>{row.segment}</td>
                      <HeatCell value={row.product} />
                      <HeatCell value={row.bundle} />
                      <HeatCell value={row.coupon} />
                      <HeatCell value={row.shipping} />
                      <HeatCell value={row.group} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Customer Segment Fatigue Levels">
            <div className="space-y-3">
              {FATIGUE_DATA.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#374151' }}>{s.name}</span>
                    <span className="text-xs font-bold" style={{ color: s.color }}>{s.level} ({s.score}/100)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full" style={{ background: '#f3f4f6' }}>
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${s.score}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Product Intelligence */}
      {activeTab === 'product' && (
        <div className="space-y-4">
          <Card title="Inventory Pressure Matrix (x=Velocity, y=Stock Level)">
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#f3f4f6" />
                <XAxis dataKey="x" name="Sales Velocity" tick={TICK} axisLine={false} label={{ value: 'Sales Velocity (units/wk)', position: 'bottom', fontSize: 10, fill: '#9ca3af' }} />
                <YAxis dataKey="y" name="Stock Level" tick={TICK} axisLine={false} />
                <ZAxis dataKey="z" range={[40, 200]} name="Margin %" />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="p-2 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 11 }}>
                        <p className="font-bold">{d?.name}</p>
                        <p>Stock: {d?.y} units | Velocity: {d?.x}/wk</p>
                        <p>Margin: {d?.z}% | {d?.weeksSupply === 999 ? 'No velocity' : `${d?.weeksSupply}wk supply`}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={inventoryBubbles} fill="#2563eb">
                  {inventoryBubbles.map((entry, i) => (
                    <Cell key={i} fill={entry.weeksSupply > 50 ? '#dc2626' : entry.weeksSupply > 20 ? '#ca8a04' : '#16a34a'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-1">
              {[['#dc2626', '>50wk supply (urgent)'], ['#ca8a04', '20-50wk supply'], ['#16a34a', '<20wk supply (healthy)']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: c }} /><span className="text-[10px]" style={{ color: '#6b7280' }}>{l}</span></div>
              ))}
            </div>
          </Card>
          <Card title="Slow Mover Clearance Progress">
            <div className="space-y-3">
              {products.filter(p => p.is_slow_moving).slice(0, 6).map((p, i) => {
                const weeksSupply = p.sales_velocity > 0 ? Math.round(p.stock_qty / p.sales_velocity) : 999;
                const urgency = weeksSupply > 50 ? '#dc2626' : weeksSupply > 20 ? '#ca8a04' : '#16a34a';
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#374151' }}>{p.name} <span className="text-[10px] font-mono" style={{ color: '#9ca3af' }}>{p.sku}</span></span>
                      <span className="text-xs font-bold" style={{ color: urgency }}>{weeksSupply === 999 ? 'No velocity' : `${weeksSupply}wk`}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: '#f3f4f6' }}>
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (p.sales_velocity || 0) / 20 * 100)}%`, background: urgency }} />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>{p.stock_qty} units · {p.sales_velocity}/wk · margin {p.margin_pct}%</p>
                  </div>
                );
              })}
              {products.filter(p => p.is_slow_moving).length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: '#9ca3af' }}>No slow-moving products flagged</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: AI Performance */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            {[
              { label: 'Acceptance Rate', value: `${acceptanceRate}%`, color: '#16a34a' },
              { label: 'Avg Confidence', value: `${avgConf}/100`, color: '#2563eb' },
              { label: 'Prediction Accuracy', value: '88%', color: '#7c3aed' },
              { label: 'AI vs Manual Revenue', value: `${aiRecs.length > 0 ? Math.round(aiRecs.filter(c => c.revenue_actual).reduce((s, c) => s + c.revenue_actual, 0) / Math.max(1, campaigns.filter(c => !c.is_ai_recommended && c.revenue_actual).reduce((s, c) => s + c.revenue_actual, 0)) * 100) : 217}%`, color: '#ca8a04' },
            ].map((k, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#9ca3af' }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Acceptance Rate & Accuracy Trend (Weekly)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={AI_WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="w" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${v}%`} />
                  <Line type="monotone" dataKey="acceptance" stroke="#2563eb" strokeWidth={2} dot={false} name="Acceptance Rate" />
                  <Line type="monotone" dataKey="accuracy" stroke="#16a34a" strokeWidth={2} dot={false} name="Prediction Accuracy" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Confidence Score Distribution">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CONFIDENCE_HIST}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="range" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="# Campaigns" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 5: Financial Intelligence */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Revenue Attribution: AI vs Manual Campaigns">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueAttrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `$${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                    {revenueAttrData.map((_, i) => <Cell key={i} fill={i === 0 ? '#2563eb' : '#9ca3af'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Discount ROI: $ Revenue per $ Discounted">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={DISCOUNT_ROI} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} domain={[0, 5]} />
                  <YAxis type="category" dataKey="type" tick={{ ...TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${v}x`} />
                  <Bar dataKey="roi" fill="#16a34a" radius={[0, 4, 4, 0]} name="ROI Multiplier" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card title="Margin Protection Score Over Time">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={MARGIN_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="m" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 90]} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${v}/100`} />
                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} name="Margin Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}