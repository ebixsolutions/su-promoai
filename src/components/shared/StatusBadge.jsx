import React from 'react';
import { useLang } from '@/lib/LanguageContext';

const statusLabelsZh = {
  Active: '活跃', Draft: '草稿', Scheduled: '已计划', Paused: '已暂停', Ended: '已结束',
  Low: '低', Medium: '中', High: '高',
  pending: '待定', accepted: '已接受', rejected: '已拒绝', deployed: '已部署',
  'Pending Approval': '待审批', Approved: '已批准',
};

const statusStyles = {
  Active:   { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Draft:    { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  Scheduled:{ bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  Paused:   { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
  Ended:    { bg: '#f3f4f6', color: '#9ca3af', border: '#e5e7eb' },
  Low:      { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Medium:   { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
  High:     { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  pending:  { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  accepted: { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  rejected: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  deployed: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
};

export default function StatusBadge({ status, className = '' }) {
  const { lang } = useLang() || { lang: 'en' };
  const s = statusStyles[status] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  const label = lang === 'zh' ? (statusLabelsZh[status] || status) : status;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}