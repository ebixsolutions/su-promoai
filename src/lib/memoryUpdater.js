/**
 * AI Memory Auto-Update Engine.
 * After every campaign ends, update AIMemory with learned patterns.
 */
import { base44 } from '@/api/base44Client';

export async function updateAIMemory(campaign, accuracyScore, quality) {
  const today = new Date().toISOString().split('T')[0];
  const trend = accuracyScore == null ? 'stable'
    : accuracyScore >= 80 ? 'improving'
    : accuracyScore >= 60 ? 'stable' : 'declining';

  // --- 1. Segment Response Memory ---
  const segmentKey = campaign.target_segment;
  if (segmentKey) {
    const existing = await base44.entities.AIMemory.filter({ key: segmentKey, memory_type: 'segment_response' });
    if (existing.length > 0) {
      const rec = existing[0];
      const current = safeParseJSON(rec.value, {});
      const newSampleSize = (rec.sample_size || 1) + 1;
      const redemptionRate = campaign.redemptions > 0 && campaign.orders_actual > 0
        ? campaign.redemptions / Math.max(1, campaign.orders_actual)
        : current.avg_redemption_rate || 0.3;
      const updatedRedemptionRate = current.avg_redemption_rate
        ? ((current.avg_redemption_rate * (newSampleSize - 1)) + redemptionRate) / newSampleSize
        : redemptionRate;

      await base44.entities.AIMemory.update(rec.id, {
        sample_size: newSampleSize,
        confidence: Math.min(95, (rec.confidence || 70) + 2),
        last_updated: today,
        trend,
        value: JSON.stringify({ ...current, avg_redemption_rate: updatedRedemptionRate, sample_size: newSampleSize }),
      });
    }
  }

  // --- 2. Promotion Type Performance Memory ---
  const typeKey = campaign.promotion_type;
  if (typeKey) {
    const typeMemory = await base44.entities.AIMemory.filter({ key: typeKey, memory_type: 'promotion_type_performance' });
    if (typeMemory.length > 0) {
      const rec = typeMemory[0];
      const current = safeParseJSON(rec.value, {});
      const newSampleSize = (rec.sample_size || 1) + 1;
      const revenueUplift = campaign.predicted_revenue > 0
        ? ((campaign.revenue_actual || 0) - campaign.predicted_revenue) / campaign.predicted_revenue
        : 0;
      const updatedUplift = current.avg_revenue_uplift != null
        ? ((current.avg_revenue_uplift * (newSampleSize - 1)) + revenueUplift) / newSampleSize
        : revenueUplift;
      const updatedAccuracy = current.avg_confidence_accuracy != null && accuracyScore != null
        ? ((current.avg_confidence_accuracy * (newSampleSize - 1)) + (accuracyScore / 100)) / newSampleSize
        : current.avg_confidence_accuracy || 0.8;

      await base44.entities.AIMemory.update(rec.id, {
        sample_size: newSampleSize,
        last_updated: today,
        trend,
        value: JSON.stringify({
          ...current,
          avg_revenue_uplift: updatedUplift,
          avg_confidence_accuracy: updatedAccuracy,
          sample_size: newSampleSize,
        }),
      });
    }
  }
}

export async function recordMerchantPreference(action, context) {
  try {
    const prefMemory = await base44.entities.AIMemory.filter({ key: 'merchant_profile', memory_type: 'merchant_preference' });
    if (prefMemory.length === 0) return;

    const rec = prefMemory[0];
    const current = safeParseJSON(rec.value, {});
    let updates = { ...current };

    if (action === 'approved_recommendation') {
      const seg = context.segment;
      if (seg && !updates.preferred_segments?.includes(seg)) {
        updates.preferred_segments = [...(updates.preferred_segments || []), seg];
      }
      updates.approval_count = (updates.approval_count || 0) + 1;
    }

    if (action === 'rejected_recommendation') {
      updates.rejection_count = (updates.rejection_count || 0) + 1;
      updates.last_rejection_reason = context.reason || '';
    }

    await base44.entities.AIMemory.update(rec.id, {
      value: JSON.stringify(updates),
      last_updated: new Date().toISOString().split('T')[0],
      sample_size: (rec.sample_size || 1) + 1,
    });
  } catch { /* silent */ }
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}