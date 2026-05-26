import React, { useState } from 'react';
import { Loader2, Bot, ChevronRight, Sparkles } from 'lucide-react';
import { callAnthropic } from '@/lib/anthropic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function NextBestActions({ scoringCtx, aiMemory, fatigueData }) {
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (action) => base44.entities.Campaign.create({
      name: action.title,
      status: 'Pending Approval',
      promotion_type: action.promotion_type,
      target_segment: action.target_segment,
      discount_type: 'pct',
      discount_value: action.discount_value,
      is_ai_recommended: true,
      confidence_score: action.confidence,
      ai_reasoning: action.reasoning?.join('; '),
      predicted_revenue: action.expected_revenue,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      toast({ title: 'Campaign created and queued for approval' });
    },
  });

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Generate 3 next best campaign actions from this data:
Products: ${scoringCtx?.topCandidateProducts?.slice(0, 3).map(p => `${p.name}(${p.sku}):rel=${p.relevanceScore},inv=${p.scores?.inventoryPressure}`).join(', ')}
Segments: ${scoringCtx?.topCandidateSegments?.slice(0, 3).map(s => `${s.name}:rel=${s.relevanceScore}`).join(', ')}
Margin: ${scoringCtx?.storeAverageMargin}% | AOV: $${scoringCtx?.storeAverageAOV} | Budget: $${scoringCtx?.budgetRemaining}

Return ONLY JSON: { "actions": [ { "title": string, "promotion_type": "product_discount"|"bundle_discount"|"shipping_discount"|"coupon_discount"|"customer_group_discount", "target_segment": string, "discount_value": number, "confidence": number, "why_now": string, "expected_revenue": number, "reasoning": [string, string, string] } ] }`;

      const text = await callAnthropic(prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setActions(parsed.actions || []);
      }
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!actions && !loading && (
        <button onClick={generate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
          <Sparkles className="w-4 h-4" /> Generate Next Best Actions
        </button>
      )}
      {loading && (
        <div className="flex items-center gap-2 py-4" style={{ color: '#6b7280' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">AI analyzing scoring engine data...</span>
        </div>
      )}
      {actions && actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((action, i) => (
            <div key={i} className="rounded-lg p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>AI</span>
                    <h4 className="text-sm font-bold" style={{ color: '#111827' }}>{action.title}</h4>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#6b7280' }}>{action.why_now}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                      Confidence: {action.confidence}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                      Est. Revenue: ${action.expected_revenue?.toLocaleString()}
                    </span>
                  </div>
                  {action.reasoning?.length > 0 && (
                    <ul className="space-y-0.5">
                      {action.reasoning.map((r, ri) => (
                        <li key={ri} className="text-[10px] flex gap-1.5" style={{ color: '#374151' }}>
                          <span style={{ color: '#2563eb' }}>•</span>{r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                onClick={() => createMutation.mutate(action)}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold mt-2 transition-all"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                Create Campaign
              </button>
            </div>
          ))}
        </div>
      )}
      {actions && actions.length === 0 && (
        <p className="text-sm" style={{ color: '#9ca3af' }}>No actions generated. Try again.</p>
      )}
    </div>
  );
}