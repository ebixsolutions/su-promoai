import React, { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTION_STYLES = {
  Created:      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  Deployed:     { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Paused:       { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
  Resumed:      { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
  Cancelled:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  'Draft Saved':{ bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  Simulated:    { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};

const ACTIONS = ['All', 'Created', 'Deployed', 'Paused', 'Resumed', 'Cancelled', 'Draft Saved', 'Simulated'];
const ACTIONS_ZH = { All: '全部', Created: '已创建', Deployed: '已部署', Paused: '已暂停', Resumed: '已恢复', Cancelled: '已取消', 'Draft Saved': '草稿已保存', Simulated: '已模拟' };

export default function AuditLog() {
  const { lang } = useLang();
  const zh = lang === 'zh';
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.campaign_name?.toLowerCase().includes(search.toLowerCase()) || l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
          <input
            placeholder={zh ? '搜索活动或用户...' : 'Search campaigns or users...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm w-64"
            style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827', outline: 'none' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: '#9ca3af' }} />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
          >
            {ACTIONS.map(a => <option key={a} value={a}>{zh ? (ACTIONS_ZH[a] || a) : a}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {(zh ? ['时间戳', '用户', '操作', '活动', '详情'] : ['TIMESTAMP', 'USER', 'ACTION', 'CAMPAIGN', 'DETAILS']).map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>{zh ? '未找到审计记录。' : 'No audit entries found.'}</td></tr>
            ) : filtered.map((log, i) => {
              const s = ACTION_STYLES[log.action] || ACTION_STYLES['Draft Saved'];
              return (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: '#6b7280' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: '#374151' }}>{log.user_name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111827' }}>{log.campaign_name || '—'}</td>
                  <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: '#6b7280' }}>{log.details || '—'}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}