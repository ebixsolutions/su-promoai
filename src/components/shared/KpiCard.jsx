import React from 'react';
import { motion } from 'framer-motion';

export default function KpiCard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend, trendUp, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl p-5 ${className}`}
      style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>{title}</p>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg || '#eff6ff' }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor || '#2563eb' }} />
          </div>
        )}
      </div>
      <p className="text-[32px] font-bold leading-none mb-2" style={{ color: '#111827' }}>{value}</p>
      <div className="flex items-center gap-1.5">
        {trend && (
          <span className="text-xs font-semibold" style={{ color: trendUp ? '#16a34a' : '#dc2626' }}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
        {subtitle && <span className="text-xs" style={{ color: '#9ca3af' }}>{subtitle}</span>}
      </div>
    </motion.div>
  );
}