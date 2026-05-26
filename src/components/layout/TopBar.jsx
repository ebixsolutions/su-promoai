import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import { useRole } from '@/lib/roleContext';
import { ChevronDown } from 'lucide-react';

const pageLabels = {
  '/':          { en: 'Dashboard',            zh: '仪表板',    subEn: 'Promotion intelligence overview and active campaign summary',       subZh: '促销智能概览和活动摘要' },
  '/advisor':   { en: 'AI Promotion Advisor', zh: 'AI 顾问',   subEn: 'Let AI analyze your data and recommend the best promotions',        subZh: '让 AI 分析数据并推荐最佳促销方案' },
  '/campaigns': { en: 'Campaign Monitor',     zh: '活动监控',  subEn: 'Track performance and manage all active and historical campaigns',  subZh: '跟踪绩效并管理所有活动' },
  '/builder':   { en: 'Promotion Builder',    zh: '活动创建',  subEn: 'Manually configure promotions with live guardrail validation',      subZh: '手动配置促销活动并实时验证护栏' },
  '/analytics': { en: 'Analytics & Insights', zh: '分析',      subEn: 'Deep-dive into promotion performance and customer behavior',        subZh: '深入分析促销绩效和客户行为' },
  '/audit':        { en: 'Audit Log',            zh: '审计日志',    subEn: 'Complete history of all promotion actions and system changes',           subZh: '所有促销操作和系统变更的完整历史' },
  '/intelligence': { en: 'AI Intelligence',     zh: 'AI 智能中心', subEn: 'AI memory, prediction accuracy, and recommendation intelligence',         subZh: 'AI 记忆、预测精度和推荐智能' },
  '/conflicts':    { en: 'Conflict Center',      zh: '冲突中心',    subEn: 'Detect and resolve all active campaign conflicts in one place',            subZh: '在一处检测并解决所有活动冲突' },
  '/policy':       { en: 'Policy Rules',         zh: '政策规则',    subEn: 'Configure governance rules that govern all AI recommendations',             subZh: '配置管理所有AI推荐的规则' },
};

const ROLE_COLORS = { Admin: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' }, Manager: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }, Analyst: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' } };

export default function TopBar() {
  const location = useLocation();
  const { lang, setLang } = useLang();
  const { role, setRole, roles } = useRole();
  const [roleOpen, setRoleOpen] = useState(false);
  const page = pageLabels[location.pathname] || { en: 'Promo AI', zh: 'Promo AI', subEn: '', subZh: '' };
  const title = lang === 'zh' ? page.zh : page.en;
  const subtitle = lang === 'zh' ? page.subZh : page.subEn;
  const rc = ROLE_COLORS[role] || ROLE_COLORS.Analyst;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: 64,
      background: '#f5f6f8',
      borderBottom: '1px solid #e5e7eb',
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ color: '#111827', fontSize: 18, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0 0' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Role badge + switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setRoleOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: `1px solid ${rc.border}`, background: rc.bg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: rc.color }}
          >
            {role}
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>
          {roleOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setRoleOpen(false)} />
              <div style={{ position: 'absolute', right: 0, top: 36, zIndex: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, minWidth: 130, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {roles.map(r => {
                  const c = ROLE_COLORS[r];
                  return (
                    <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: role === r ? c.bg : 'transparent', color: role === r ? c.color : '#374151' }}>
                      {r} {role === r && '✓'}
                    </button>
                  );
                })}
                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0', padding: '4px 12px 0' }}>
                  <p style={{ fontSize: 10, color: '#9ca3af' }}>Demo: switch roles to test permissions</p>
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#e5e7eb', borderRadius: 999, padding: 3, gap: 2 }}>
        {[{ key: 'en', label: 'EN' }, { key: 'zh', label: '中文' }].map(l => (
          <button
            key={l.key}
            onClick={() => setLang(l.key)}
            style={{
              padding: '4px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: lang === l.key ? '#111827' : 'transparent',
              color: lang === l.key ? '#ffffff' : '#6b7280',
            }}
          >
            {l.label}
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}