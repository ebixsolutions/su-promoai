import React, { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

const SKU_ACTIONS = [
  { id: 'remove_skus', label: 'Remove overlapping SKUs from campaign' },
  { id: 'pause_other', label: 'Pause the conflicting campaign' },
  { id: 'reschedule', label: 'Reschedule to start after conflict ends' },
  { id: 'override', label: 'Override — Accept Risk', isOverride: true },
];

const SEGMENT_ACTIONS = [
  { id: 'exclude_customers', label: 'Exclude already-targeted customers' },
  { id: 'change_segment', label: 'Change target segment' },
  { id: 'override', label: 'Override — Accept Risk', isOverride: true },
];

export default function ConflictFixModal({ conflict, onClose, onResolved }) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSkuConflict = conflict.type === 'SKU Overlap' || conflict.severity === 'High';
  const actions = isSkuConflict ? SKU_ACTIONS : SEGMENT_ACTIONS;

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const camp = conflict.conflictingCampaign;

      if (action.id === 'pause_other' && camp) {
        await base44.entities.Campaign.update(camp.id, { status: 'Paused' });
      } else if (action.id === 'reschedule' && camp?.end_date) {
        // Move source campaign start to day after conflicting campaign ends
        const newStart = new Date(camp.end_date);
        newStart.setDate(newStart.getDate() + 1);
        const iso = newStart.toISOString().split('T')[0];
        if (conflict.sourceCampaignId) {
          await base44.entities.Campaign.update(conflict.sourceCampaignId, { start_date: iso });
        }
      } else if (action.id === 'remove_skus' && conflict.sourceCampaignId && conflict.overlappingSkus?.length) {
        const sourceCamp = await base44.entities.Campaign.get(conflict.sourceCampaignId);
        if (sourceCamp) {
          const existing = (sourceCamp.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
          const cleaned = existing.filter(s => !conflict.overlappingSkus.includes(s)).join(',');
          await base44.entities.Campaign.update(conflict.sourceCampaignId, { target_products: cleaned });
        }
      }

      // Log to audit
      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        action: action.isOverride ? 'Draft Saved' : 'Deployed',
        campaign_name: conflict.source || 'Unknown',
        details: `Conflict [${conflict.type}] resolved: "${action.label}"${action.isOverride ? ' (OVERRIDE)' : ''}`,
      });

      queryClient.invalidateQueries(['campaigns']);
      setResolved(true);
      toast({ title: 'Conflict resolved successfully' });
      setTimeout(() => {
        onResolved(conflict);
        onClose();
      }, 900);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-xl shadow-xl w-full max-w-md" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{
              background: conflict.severity === 'High' ? '#fee2e2' : '#fef9c3',
              color: conflict.severity === 'High' ? '#dc2626' : '#ca8a04',
            }}>{conflict.severity}</span>
            <h2 className="text-sm font-bold" style={{ color: '#111827' }}>Resolve Conflict</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" style={{ color: '#9ca3af' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="mb-4 p-3 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#dc2626' }}>{conflict.type}</p>
            <p className="text-sm" style={{ color: '#374151' }}>{conflict.detail || conflict.description}</p>
            {conflict.source && (
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Campaign: <strong>{conflict.source}</strong></p>
            )}
            {conflict.conflictingCampaign && (
              <p className="text-xs" style={{ color: '#6b7280' }}>Conflicts with: <strong>{conflict.conflictingCampaign.name}</strong></p>
            )}
          </div>

          {resolved ? (
            <div className="flex items-center justify-center gap-2 py-4" style={{ color: '#16a34a' }}>
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Resolved!</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>Choose Resolution</p>
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-left transition-all"
                  style={{
                    background: action.isOverride ? '#fffbeb' : '#f9fafb',
                    border: `1px solid ${action.isOverride ? '#fde68a' : '#e5e7eb'}`,
                    color: action.isOverride ? '#92400e' : '#374151',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = action.isOverride ? '#fef3c7' : '#f0f7ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = action.isOverride ? '#fffbeb' : '#f9fafb'; }}
                >
                  <span>{action.label}</span>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#9ca3af' }} /> : <span style={{ color: '#9ca3af' }}>→</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!resolved && (
          <div className="px-5 pb-4">
            <button onClick={onClose} className="w-full py-2 rounded-lg text-xs font-semibold" style={{ background: '#f3f4f6', color: '#6b7280' }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}