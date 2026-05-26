import React, { useState } from 'react';
import { XCircle, X } from 'lucide-react';

export default function RejectModal({ campaignName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="rounded-xl p-6 w-full max-w-sm shadow-xl" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold" style={{ color: '#111827' }}>Reject Campaign</p>
          <button onClick={onCancel}><X className="w-4 h-4" style={{ color: '#9ca3af' }} /></button>
        </div>
        <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
          Provide a reason for rejecting <span className="font-semibold" style={{ color: '#374151' }}>"{campaignName}"</span>:
        </p>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Discount too high, margin at risk..."
          className="w-full px-3 py-2 rounded-lg text-sm resize-none mb-4"
          style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827', outline: 'none' }}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: '#f3f4f6', color: '#374151' }}>Cancel</button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: reason.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: reason.trim() ? 'pointer' : 'not-allowed' }}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject Campaign
          </button>
        </div>
      </div>
    </div>
  );
}