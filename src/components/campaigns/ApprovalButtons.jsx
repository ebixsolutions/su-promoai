import React, { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { CheckCircle, XCircle, Rocket, Loader2 } from 'lucide-react';

export default function ApprovalButtons({ campaign, onAction, onDeploy, isLoading }) {
  const { lang } = useLang() || { lang: 'en' };
  const zh = lang === 'zh';
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onAction(campaign, 'Draft', rejectReason.trim());
    setShowReject(false);
    setRejectReason('');
  };

  if (campaign.status === 'Draft') {
    return (
      <button
        onClick={() => onAction(campaign, 'Pending Approval', null)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
        style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
        {zh ? '提交审批' : 'Submit for Approval'}
      </button>
    );
  }

  if (campaign.status === 'Pending Approval') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onAction(campaign, 'Approved')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {zh ? '批准' : 'Approve'}
          </button>
          <button
            onClick={() => setShowReject(v => !v)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            <XCircle className="w-3.5 h-3.5" /> {zh ? '拒绝' : 'Reject'}
          </button>
        </div>
        {showReject && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReject()}
              placeholder={zh ? '拒绝原因...' : 'Reason for rejection...'}
              className="flex-1 px-2.5 py-1.5 rounded text-xs"
              style={{ background: '#fff', border: '1px solid #fecaca', color: '#111827', outline: 'none' }}
            />
            <button
              onClick={handleReject}
              className="px-2.5 py-1.5 rounded text-xs font-bold"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              {zh ? '确认' : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (campaign.status === 'Approved') {
    const handleDeploy = () => {
      if (onDeploy) onDeploy(campaign);
      else onAction(campaign, 'Active');
    };
    return (
      <button
        onClick={handleDeploy}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
        style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
        {zh ? '🚀 立即部署' : '🚀 Deploy Now'}
      </button>
    );
  }

  return null;
}