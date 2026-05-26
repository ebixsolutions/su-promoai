import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}