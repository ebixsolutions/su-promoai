/**
 * AI Memory System — seeds and reads learned patterns from the AIMemory entity.
 */
import { base44 } from '@/api/base44Client';

export const MEMORY_SEEDS = [
  {
    memory_type: 'segment_response',
    key: 'VIP',
    value: JSON.stringify({
      segment: 'VIP',
      best_promotion_type: 'bundle_discount',
      avg_redemption_rate: 0.68,
      best_discount_range: '15-20%',
      best_timing: 'weekend',
      sample_size: 4,
    }),
    confidence: 88,
    sample_size: 4,
    last_updated: '2026-04-01',
    trend: 'improving',
  },
  {
    memory_type: 'segment_response',
    key: 'Returning',
    value: JSON.stringify({
      segment: 'Returning',
      best_promotion_type: 'product_discount',
      avg_redemption_rate: 0.42,
      best_discount_range: '10-15%',
      best_timing: 'weekday',
      sample_size: 6,
    }),
    confidence: 76,
    sample_size: 6,
    last_updated: '2026-04-10',
    trend: 'stable',
  },
  {
    memory_type: 'segment_response',
    key: 'Inactive',
    value: JSON.stringify({
      segment: 'Inactive',
      best_promotion_type: 'coupon_discount',
      avg_redemption_rate: 0.19,
      best_discount_range: '20-25%',
      best_timing: 'month_start',
      sample_size: 3,
    }),
    confidence: 62,
    sample_size: 3,
    last_updated: '2026-03-15',
    trend: 'stable',
  },
  {
    memory_type: 'segment_response',
    key: 'New',
    value: JSON.stringify({
      segment: 'New',
      best_promotion_type: 'shipping_discount',
      avg_redemption_rate: 0.31,
      best_discount_range: 'Free Shipping',
      best_timing: 'any',
      sample_size: 5,
    }),
    confidence: 71,
    sample_size: 5,
    last_updated: '2026-04-20',
    trend: 'improving',
  },
  {
    memory_type: 'promotion_type_performance',
    key: 'bundle_discount',
    value: JSON.stringify({
      type: 'bundle_discount',
      avg_revenue_uplift: 0.34,
      avg_margin_impact: -0.08,
      avg_confidence_accuracy: 0.88,
      sample_size: 6,
      rank: 1,
    }),
    confidence: 88,
    sample_size: 6,
    last_updated: '2026-04-25',
    trend: 'improving',
  },
  {
    memory_type: 'promotion_type_performance',
    key: 'product_discount',
    value: JSON.stringify({
      type: 'product_discount',
      avg_revenue_uplift: 0.18,
      avg_margin_impact: -0.11,
      avg_confidence_accuracy: 0.82,
      sample_size: 9,
      rank: 2,
    }),
    confidence: 85,
    sample_size: 9,
    last_updated: '2026-04-25',
    trend: 'stable',
  },
  {
    memory_type: 'promotion_type_performance',
    key: 'coupon_discount',
    value: JSON.stringify({
      type: 'coupon_discount',
      avg_revenue_uplift: 0.12,
      avg_margin_impact: -0.14,
      avg_confidence_accuracy: 0.74,
      sample_size: 5,
      rank: 3,
    }),
    confidence: 74,
    sample_size: 5,
    last_updated: '2026-03-30',
    trend: 'stable',
  },
  {
    memory_type: 'promotion_type_performance',
    key: 'shipping_discount',
    value: JSON.stringify({
      type: 'shipping_discount',
      avg_revenue_uplift: 0.08,
      avg_margin_impact: -0.05,
      avg_confidence_accuracy: 0.79,
      sample_size: 4,
      rank: 4,
    }),
    confidence: 79,
    sample_size: 4,
    last_updated: '2026-04-01',
    trend: 'declining',
  },
  {
    memory_type: 'timing_pattern',
    key: 'global_timing',
    value: JSON.stringify({
      weekend_multiplier: 2.3,
      month_start_multiplier: 1.4,
      best_duration_days: 7,
      worst_duration_days: 3,
      best_launch_day: 'Friday',
      sample_size: 8,
    }),
    confidence: 83,
    sample_size: 8,
    last_updated: '2026-04-28',
    trend: 'stable',
  },
  {
    memory_type: 'merchant_preference',
    key: 'merchant_profile',
    value: JSON.stringify({
      preferred_discount_type: 'percentage',
      max_acceptable_margin_impact: 0.12,
      preferred_segments: ['VIP', 'Returning'],
      risk_tolerance: 'medium',
      avg_campaign_duration: 7,
      preferred_min_confidence: 75,
    }),
    confidence: 90,
    sample_size: 12,
    last_updated: '2026-05-01',
    trend: 'stable',
  },
  {
    memory_type: 'failed_recommendation',
    key: 'overly_deep_discount_inactive',
    value: JSON.stringify({
      recommendation: '30% discount on all products for Inactive segment',
      reason_rejected: 'Margin impact exceeded 15% threshold',
      lesson: 'Inactive segments respond to moderate discounts (20-25%); deeper cuts erode margin without proportional lift',
      outcome: 'Campaign rejected at approval stage',
    }),
    confidence: 95,
    sample_size: 2,
    last_updated: '2026-03-10',
    trend: 'stable',
  },
  {
    memory_type: 'failed_recommendation',
    key: 'short_duration_promo',
    value: JSON.stringify({
      recommendation: '3-day flash sale on Skincare for New customers',
      reason_rejected: 'Low redemption rate (8%) — insufficient time for customer discovery',
      lesson: 'Minimum 5-day duration needed for new customer segments; flash sales work better for existing high-engagement segments',
      outcome: 'Ran for 3 days, 8% redemption vs 31% predicted',
    }),
    confidence: 88,
    sample_size: 1,
    last_updated: '2026-02-20',
    trend: 'stable',
  },
];

export async function seedAIMemoryIfEmpty() {
  try {
    const existing = await base44.entities.AIMemory.list('key', 5);
    if (existing.length > 0) return;
    await base44.entities.AIMemory.bulkCreate(MEMORY_SEEDS);
  } catch {
    // silent — non-critical
  }
}

export async function loadAIMemory() {
  try {
    const records = await base44.entities.AIMemory.list('memory_type', 50);
    const memory = {
      segmentResponse: {},
      promotionTypePerformance: {},
      timingPattern: null,
      merchantPreference: null,
      failedRecommendations: [],
    };
    records.forEach(r => {
      const val = (() => { try { return JSON.parse(r.value); } catch { return {}; } })();
      if (r.memory_type === 'segment_response') memory.segmentResponse[r.key] = { ...val, confidence: r.confidence, trend: r.trend };
      else if (r.memory_type === 'promotion_type_performance') memory.promotionTypePerformance[r.key] = { ...val, confidence: r.confidence, trend: r.trend };
      else if (r.memory_type === 'timing_pattern') memory.timingPattern = { ...val, confidence: r.confidence };
      else if (r.memory_type === 'merchant_preference') memory.merchantPreference = { ...val, confidence: r.confidence };
      else if (r.memory_type === 'failed_recommendation') memory.failedRecommendations.push({ ...val, confidence: r.confidence });
    });
    return memory;
  } catch {
    return null;
  }
}

export function formatMemoryForPrompt(memory) {
  if (!memory) return 'No memory available yet.';
  const lines = [];
  if (memory.timingPattern) {
    lines.push(`Timing: Weekend campaigns ${memory.timingPattern.weekend_multiplier}x better, best duration ${memory.timingPattern.best_duration_days} days`);
  }
  if (memory.merchantPreference) {
    lines.push(`Merchant prefers: ${memory.merchantPreference.preferred_segments?.join(', ')} segments, max margin impact ${(memory.merchantPreference.max_acceptable_margin_impact * 100).toFixed(0)}%`);
  }
  Object.entries(memory.segmentResponse).forEach(([seg, data]) => {
    lines.push(`${seg} segment: best promo type=${data.best_promotion_type}, avg redemption=${(data.avg_redemption_rate * 100).toFixed(0)}%`);
  });
  Object.entries(memory.promotionTypePerformance).forEach(([type, data]) => {
    lines.push(`${type}: +${(data.avg_revenue_uplift * 100).toFixed(0)}% revenue, -${(data.avg_margin_impact * 100).toFixed(0)}% margin`);
  });
  return lines.join('\n');
}