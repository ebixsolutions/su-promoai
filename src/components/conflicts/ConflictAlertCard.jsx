import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function ConflictAlertCard({ conflicts }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
          <p className="text-xs font-bold" style={{ color: '#16a34a' }}>No Conflicts Detected</p>
        </div>
        <p className="text-[10px]" style={{ color: '#6b7280' }}>All live campaigns are running without overlap.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
          <p className="text-xs font-bold" style={{ color: '#dc2626' }}>🔴 {conflicts.length} Active Conflict{conflicts.length > 1 ? 's' : ''}</p>
        </div>
        <Link to="/campaigns">
          <button className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#dc2626' }}>
            Resolve All <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
      <div className="divide-y" style={{ divideColor: '#f3f4f6' }}>
        {conflicts.slice(0, 4).map((cf, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{
                background: cf.severity === 'High' ? '#fee2e2' : cf.severity === 'Medium' ? '#fffbeb' : '#f3f4f6',
                color: cf.severity === 'High' ? '#dc2626' : cf.severity === 'Medium' ? '#ca8a04' : '#6b7280',
              }}>
                {cf.severity}
              </span>
              <p className="text-xs truncate" style={{ color: '#374151' }}>{cf.detail}</p>
            </div>
            <Link to="/campaigns" className="flex-shrink-0 ml-2">
              <span className="text-[10px] font-semibold" style={{ color: '#2563eb' }}>Fix</span>
            </Link>
          </div>
        ))}
        {conflicts.length > 4 && (
          <div className="px-4 py-2 text-center">
            <Link to="/campaigns" className="text-xs font-semibold" style={{ color: '#9ca3af' }}>
              +{conflicts.length - 4} more conflicts →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}