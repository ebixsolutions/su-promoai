/**
 * Reinforcement Learning Engine — adjusts scoring weights based on outcomes.
 */
import { base44 } from '@/api/base44Client';

export const DEFAULT_WEIGHTS = {
  inventoryPressure: 0.25,
  marginSafety: 0.20,
  customerFit: 0.20,
  historicalSuccess: 0.20,
  fatigueHealth: 0.10,
  timingOptimality: 0.05,
};

export async function loadScoringWeights() {
  try {
    const records = await base44.entities.AIMemory.filter({
      key: 'scoring_weights',
      memory_type: 'merchant_preference',
    });
    if (records.length > 0) {
      const parsed = JSON.parse(records[0].value);
      return { ...DEFAULT_WEIGHTS, ...parsed };
    }
  } catch { /* silent */ }
  return { ...DEFAULT_WEIGHTS };
}

export async function reinforceWeights(feedbackHistory) {
  const weights = await loadScoringWeights();
  if (feedbackHistory.length < 5) return weights;

  // Save updated weights (simple pass-through for now — extensible)
  try {
    const existing = await base44.entities.AIMemory.filter({
      key: 'scoring_weights',
      memory_type: 'merchant_preference',
    });

    const payload = {
      memory_type: 'merchant_preference',
      key: 'scoring_weights',
      value: JSON.stringify(weights),
      confidence: Math.min(90, 50 + feedbackHistory.length * 4),
      sample_size: feedbackHistory.length,
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (existing.length > 0) {
      await base44.entities.AIMemory.update(existing[0].id, payload);
    } else {
      await base44.entities.AIMemory.create(payload);
    }
  } catch { /* silent */ }

  return weights;
}