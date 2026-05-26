/**
 * Prediction Calibration Engine.
 * Uses FeedbackLoop history to adjust future predictions.
 */

export function calibratePrediction(basePrediction, feedbackHistory) {
  const valid = feedbackHistory.filter(f =>
    f.accuracy_score != null && f.predicted_revenue > 0 && f.actual_revenue != null
  );

  if (valid.length === 0) {
    return {
      calibrated_base: basePrediction,
      calibrated_pessimistic: Math.round(basePrediction * 0.75),
      calibrated_optimistic: Math.round(basePrediction * 1.35),
      calibration_confidence: 40,
      calibration_factor: 1,
      based_on_campaigns: 0,
      avg_historical_accuracy: null,
    };
  }

  const avgActualVsPredicted = valid.reduce((sum, f) => {
    return sum + (f.actual_revenue / Math.max(f.predicted_revenue, 1));
  }, 0) / valid.length;

  const avgAccuracy = Math.round(valid.reduce((sum, f) => sum + f.accuracy_score, 0) / valid.length);
  const calibrationFactor = avgActualVsPredicted;
  const calibrationConfidence = Math.min(95, 50 + valid.length * 8);

  return {
    calibrated_base: Math.round(basePrediction * calibrationFactor),
    calibrated_pessimistic: Math.round(basePrediction * calibrationFactor * 0.75),
    calibrated_optimistic: Math.round(basePrediction * calibrationFactor * 1.35),
    calibration_confidence: calibrationConfidence,
    calibration_factor: Math.round(calibrationFactor * 100) / 100,
    based_on_campaigns: valid.length,
    avg_historical_accuracy: avgAccuracy,
  };
}