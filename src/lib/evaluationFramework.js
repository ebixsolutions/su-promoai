// Recommendation Evaluation Framework - Measures recommendation quality across 3 dimensions

export function evaluatePredictionQuality(feedbackHistory) {
  if (feedbackHistory.length === 0) return { score: 0, grade: 'No Data', details: {} };
  
  const revenueAccuracies = feedbackHistory.filter(f => f.predicted_revenue > 0 && f.actual_revenue > 0)
    .map(f => 100 - Math.abs((f.predicted_revenue - f.actual_revenue) / f.predicted_revenue * 100));
  
  const orderAccuracies = feedbackHistory.filter(f => f.predicted_orders > 0 && f.actual_orders > 0)
    .map(f => 100 - Math.abs((f.predicted_orders - f.actual_orders) / f.predicted_orders * 100));
  
  const avgRevAcc = revenueAccuracies.length > 0 ? revenueAccuracies.reduce((a,b)=>a+b,0)/revenueAccuracies.length : 0;
  const avgOrdAcc = orderAccuracies.length > 0 ? orderAccuracies.reduce((a,b)=>a+b,0)/orderAccuracies.length : 0;
  const overall = (avgRevAcc * 0.6 + avgOrdAcc * 0.4);
  
  return {
    score: Math.round(overall),
    grade: overall >= 90 ? 'Excellent' : overall >= 75 ? 'Good' : overall >= 60 ? 'Fair' : 'Poor',
    revenue_accuracy: Math.round(avgRevAcc),
    order_accuracy: Math.round(avgOrdAcc),
    sample_size: feedbackHistory.length,
    trend: feedbackHistory.length >= 3 ? (feedbackHistory.slice(-3).reduce((s,f)=>s+f.accuracy_score,0)/3 > overall ? 'improving' : 'declining') : 'insufficient_data'
  };
}

export function evaluateRecommendationQuality(aiRecommendationLogs) {
  if (aiRecommendationLogs.length === 0) return { acceptance_rate: 0, deployment_rate: 0, total: 0 };
  
  const accepted = aiRecommendationLogs.filter(r => r.was_accepted).length;
  const deployed = aiRecommendationLogs.filter(r => r.was_deployed).length;
  const rejected = aiRecommendationLogs.filter(r => r.was_rejected).length;
  
  return {
    total: aiRecommendationLogs.length,
    acceptance_rate: Math.round(accepted / aiRecommendationLogs.length * 100),
    deployment_rate: Math.round(deployed / aiRecommendationLogs.length * 100),
    rejection_rate: Math.round(rejected / aiRecommendationLogs.length * 100),
    grade: (accepted/aiRecommendationLogs.length) >= 0.7 ? 'Excellent' : (accepted/aiRecommendationLogs.length) >= 0.5 ? 'Good' : 'Needs Improvement'
  };
}

export function generateEvaluationReport(feedbackHistory, aiRecommendationLogs, campaigns) {
  return {
    prediction_quality: evaluatePredictionQuality(feedbackHistory),
    recommendation_quality: evaluateRecommendationQuality(aiRecommendationLogs),
    system_health: {
      active_campaigns: campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status)).length,
      ended_with_data: feedbackHistory.length,
      learning_velocity: feedbackHistory.length >= 5 ? 'High' : feedbackHistory.length >= 2 ? 'Medium' : 'Low',
      confidence_calibration: feedbackHistory.length >= 3 ? 'Active' : 'Warming Up'
    },
    generated_at: new Date().toISOString()
  };
}