/**
 * Confidence Adjuster — dynamically adjusts AI confidence scores
 * based on historical AI memory and feedback history.
 */

export function adjustConfidence(rawConfidence, promotionType, targetSegment, aiMemoryRecords, feedbackHistory) {
  let adjusted = rawConfidence;

  // Adjustment 1: Promotion type historical accuracy
  const typeMemory = aiMemoryRecords.find(m =>
    m.key === promotionType && m.memory_type === 'promotion_type_performance'
  );
  if (typeMemory) {
    try {
      const perf = JSON.parse(typeMemory.value);
      const multiplier = perf.avg_confidence_accuracy || 1;
      adjusted *= multiplier;
    } catch { /* skip */ }
  }

  // Adjustment 2: Segment redemption history
  const segmentMemory = aiMemoryRecords.find(m =>
    m.key === targetSegment && m.memory_type === 'segment_response'
  );
  if (segmentMemory) {
    try {
      const seg = JSON.parse(segmentMemory.value);
      if (seg.avg_redemption_rate < 0.2) adjusted -= 10;
      else if (seg.avg_redemption_rate > 0.5) adjusted += 5;
    } catch { /* skip */ }
  }

  // Adjustment 3: Sample size confidence
  const relevant = feedbackHistory.filter(f => f.accuracy_score != null);
  if (relevant.length < 3) adjusted -= 8;
  else if (relevant.length >= 10) adjusted += 5;

  return Math.min(97, Math.max(30, Math.round(adjusted)));
}