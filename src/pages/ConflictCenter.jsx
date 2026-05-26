import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { detectConflicts } from '@/lib/conflictDetector';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConflictFixModal from '@/components/conflicts/ConflictFixModal';
import { useToast } from '@/components/ui/use-toast';

const SEV_STYLE = {
  High:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  Medium: { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
  Low:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
};

export default function ConflictCenter() {
  const [fixingConflict, setFixingConflict] = useState(null);
  const [resolvedKeys, setResolvedKeys] = useState([]);
  const { toast } = useToast();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date', 100),
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.status === 'Scheduled');

  const allConflicts = [];
  activeCampaigns.forEach(camp => {
    const others = activeCampaigns.filter(o => o.id !== camp.id);
    const skus = (camp.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
    const conflicts = detectConflicts(
      { targetProducts: skus, targetSegment: camp.target_segment, startDate: camp.start_date, endDate: camp.end_date, discountValue: camp.discount_value || 0 },
      others
    );
    conflicts.forEach(cf => {
      const key = `${cf.id}-${camp.id}`;
      if (!allConflicts.find(x => x._key === key)) {
        allConflicts.push({ ...cf, _key: key, source: camp.name, sourceCampaignId: camp.id });
      }
    });
  });

  const visible = allConflicts.filter(cf => !resolvedKeys.includes(cf._key));
  const high = visible.filter(c => c.severity === 'High').length;
  const medium = visible.filter(c => c.severity === 'Medium').length;
  const low = visible.filter(c => c.severity === 'Low').length;

  return (
    <div>
      {fixingConflict && (
        <ConflictFixModal
          conflict={fixingConflict}
          onClose={() => setFixingConflict(null)}
          onResolved={(cf) => {
            setResolvedKeys(prev => [...prev, cf._key]);
            setFixingConflict(null);
          }}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'High Severity', count: high, ...SEV_STYLE.High },
          { label: 'Medium Severity', count: medium, ...SEV_STYLE.Medium },
          { label: 'Low Severity', count: low, ...SEV_STYLE.Low },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="text-sm font-bold" style={{ color: '#111827' }}>
            All Active Conflicts {visible.length > 0 ? `(${visible.length})` : ''}
          </h2>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle className="w-10 h-10" style={{ color: '#16a34a' }} />
            <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>No active conflicts detected</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>All campaigns are running without overlaps</p>
          </div>
        ) : (
          <div>
            {visible.map((cf, i) => {
              const s = SEV_STYLE[cf.severity] || SEV_STYLE.Low;
              return (
                <motion.div key={cf._key}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 px-5 py-4"
                  style={{ borderBottom: i < visible.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                        {cf.severity}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: '#374151' }}>{cf.type}</span>
                      <span className="text-xs" style={{ color: '#9ca3af' }}>• {cf.source}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#6b7280' }}>{cf.detail}</p>
                    {cf.conflictingCampaign && (
                      <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>
                        Conflicts with: <strong>{cf.conflictingCampaign.name}</strong> ({cf.conflictingCampaign.status})
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setFixingConflict(cf)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >Fix →</button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}