import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLayout } from '@/lib/LayoutContext';
import { useLang } from '@/lib/LanguageContext';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const SECTIONS = [
  {
    key: 'overview',
    labelEn: 'OVERVIEW',
    labelZh: '总览',
    items: [
      { path: '/', icon: '📊', navEn: 'Dashboard', navZh: '仪表板' },
    ],
  },
  {
    key: 'ai_engine',
    labelEn: 'AI ENGINE',
    labelZh: 'AI 引擎',
    items: [
      { path: '/advisor', icon: '🤖', navEn: 'AI Advisor', navZh: 'AI 顾问' },
    ],
  },
  {
    key: 'campaigns',
    labelEn: 'CAMPAIGNS',
    labelZh: '活动',
    items: [
      { path: '/campaigns', icon: '📡', navEn: 'Campaign Monitor', navZh: '活动监控' },
      { path: '/builder', icon: '🛠', navEn: 'Promotion Builder', navZh: '活动创建' },
    ],
  },
  {
    key: 'intelligence',
    labelEn: 'INTELLIGENCE',
    labelZh: '智能分析',
    items: [
      { path: '/analytics', icon: '📈', navEn: 'Analytics', navZh: '分析' },
      { path: '/intelligence', icon: '🧠', navEn: 'AI Intelligence', navZh: 'AI 智能中心' },
      { path: '/audit', icon: '📋', navEn: 'Audit Log', navZh: '审计日志' },
      { path: '/conflicts', icon: '⚡', navEn: 'Conflict Center', navZh: '冲突中心' },
      { path: '/policy', icon: '📜', navEn: 'Policy Rules', navZh: '政策规则' },
    ],
  },
];

function NavItem({ item, isActive, sidebarCollapsed, lang }) {
  const label = lang === 'zh' ? item.navZh : item.navEn;
  return (
    <Link
      to={item.path}
      title={sidebarCollapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        gap: '8px',
        padding: sidebarCollapsed ? '8px' : '7px 10px',
        borderRadius: '8px',
        fontSize: '12.5px',
        fontWeight: isActive ? 500 : 400,
        textDecoration: 'none',
        background: isActive ? '#1a1a1a' : 'transparent',
        color: isActive ? '#ffffff' : '#555',
        transition: 'all 0.12s',
        marginBottom: '1px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#f0efe9'; e.currentTarget.style.color = '#1a1a1a'; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; } }}
    >
      <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
      {!sidebarCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useLayout();
  const { lang } = useLang();
  const collapsed = !sidebarOpen;
  const w = collapsed ? '52px' : '220px';
  const [sectionsCollapsed, setSectionsCollapsed] = useState({});
  const toggleSection = (key) =>
    setSectionsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside style={{
      width: w,
      flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e8e6e0',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        background: '#1a1a1a',
        padding: '7px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0,
        gap: 6,
      }}>
        {!collapsed && <span style={{ color: '#ccc', fontSize: '11px', whiteSpace: 'nowrap' }}>PROMO AI</span>}
        <button
          onClick={toggleSidebar}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px', padding: '3px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ccc', flexShrink: 0 }}
        >
          {collapsed ? <ChevronRight style={{ width: 13, height: 13 }} /> : <ChevronLeft style={{ width: 13, height: 13 }} />}
        </button>
      </div>

      {/* Logo */}
      <div style={{ padding: collapsed ? '10px' : '14px', borderBottom: '1px solid #e8e6e0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: collapsed ? 32 : 36, height: collapsed ? 32 : 36, background: '#1a1a1a', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2 }}>PROMO AI</div>
            <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.3 }}>Promotion Intelligence</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '8px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {SECTIONS.map((section, si) => {
          const isSectionCollapsed = sectionsCollapsed[section.key];
          const sectionLabel = lang === 'zh' ? section.labelZh : section.labelEn;
          return (
            <div key={section.key}>
              {collapsed ? (
                si > 0 && <div style={{ height: 1, background: '#f0efe9', margin: '5px 0' }} />
              ) : (
                <div
                  onClick={() => toggleSection(section.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '10px', fontWeight: 600, color: '#aaa',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    padding: '12px 9px 4px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#666'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; }}
                >
                  <span>{sectionLabel}</span>
                  <span style={{ fontSize: '9px' }}>{isSectionCollapsed ? '▶' : '▼'}</span>
                </div>
              )}
              {!isSectionCollapsed && (
                <div>
                  {section.items.map(item => (
                    <NavItem
                      key={item.path + item.navEn}
                      item={item}
                      isActive={location.pathname === item.path}
                      sidebarCollapsed={collapsed}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}