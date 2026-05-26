// Unified Commerce Feature Store - Centralized feature computation engine

export function computeCustomerFeatures(segment, campaigns, feedbackHistory) {
  const targetingCampaigns = campaigns.filter(c => c.target_segment === segment.name && ['Active','Live','Deployed'].includes(c.status));
  const segmentFeedback = feedbackHistory.filter(f => f.campaign_name && targetingCampaigns.some(c => c.name === f.campaign_name));
  const avgAccuracy = segmentFeedback.length > 0 ? segmentFeedback.reduce((s,f) => s + f.accuracy_score, 0) / segmentFeedback.length : 70;
  
  return {
    segment_name: segment.name,
    size: segment.size,
    avg_order_value: segment.avg_order_value,
    churn_risk_score: segment.churn_risk === 'High' ? 85 : segment.churn_risk === 'Medium' ? 55 : 20,
    promotion_fatigue: Math.min(100, targetingCampaigns.length * 25 + Math.max(0, 30 - (segment.last_promo_days_ago || 30))),
    reactivation_probability: segment.churn_risk === 'High' ? 0.35 : segment.churn_risk === 'Medium' ? 0.55 : 0.72,
    historical_response_rate: segmentFeedback.length > 0 ? avgAccuracy / 100 : 0.45,
    ltv_score: Math.min(100, (segment.avg_order_value / 200) * 100),
    last_targeted_days: segment.last_promo_days_ago || 90,
    active_campaign_count: targetingCampaigns.length
  };
}

export function computeProductFeatures(product, activeCampaigns) {
  const weeksSupply = Math.round((product.stock_qty || 0) / Math.max(product.sales_velocity || 1, 1));
  const targetedBy = activeCampaigns.filter(c => (c.target_products || '').split(',').map(s => s.trim()).includes(product.sku));
  
  return {
    sku: product.sku,
    name: product.name,
    weeks_supply: weeksSupply,
    inventory_pressure: weeksSupply > 52 ? 95 : weeksSupply > 26 ? 70 : weeksSupply > 13 ? 40 : 15,
    margin_safety: Math.max(0, ((product.margin_pct || 40) - 30) / 40 * 100),
    sales_velocity_score: Math.max(0, 100 - (product.sales_velocity || 5) * 8),
    stockout_risk: weeksSupply < 4 ? 95 : weeksSupply < 8 ? 60 : 10,
    bundle_affinity: product.category ? 65 : 40,
    price_elasticity: product.price > 80 ? 75 : product.price > 40 ? 55 : 35,
    is_slow_moving: product.is_slow_moving || weeksSupply > 26,
    is_protected: product.is_protected || false,
    active_campaign_count: targetedBy.length,
    cannibalization_risk: targetedBy.length > 1 ? 80 : targetedBy.length === 1 ? 40 : 10
  };
}

export function computePromotionFeatures(campaign, feedbackHistory) {
  const similarCampaigns = feedbackHistory.filter(f => f.campaign_name);
  const avgROI = similarCampaigns.length > 0 
    ? similarCampaigns.reduce((s,f) => s + ((f.actual_revenue || 0) - (f.predicted_revenue || 1)) / Math.max(f.predicted_revenue || 1, 1), 0) / similarCampaigns.length
    : 0.1;
  
  return {
    type: campaign.promotion_type,
    historical_roi: avgROI,
    avg_accuracy: similarCampaigns.length > 0 ? similarCampaigns.reduce((s,f) => s + f.accuracy_score, 0) / similarCampaigns.length : 75,
    sample_size: similarCampaigns.length,
    confidence_level: Math.min(95, 40 + similarCampaigns.length * 8)
  };
}

export function buildFeatureVector(products, segments, campaigns, feedbackHistory, goal) {
  const activeCampaigns = campaigns.filter(c => ['Active','Live','Deployed'].includes(c.status));
  const productFeatures = products.slice(0,12).map(p => computeProductFeatures(p, activeCampaigns));
  const segmentFeatures = segments.map(s => computeCustomerFeatures(s, campaigns, feedbackHistory));
  
  const topUrgentProducts = [...productFeatures].sort((a,b) => b.inventory_pressure - a.inventory_pressure).slice(0,5);
  
  const topSegments = [...segmentFeatures].sort((a,b) => {
    if (goal === 'Reactivate Inactive Customers') return b.churn_risk_score - a.churn_risk_score;
    if (goal === 'Increase Average Order Value') return b.ltv_score - a.ltv_score;
    return b.historical_response_rate - a.historical_response_rate;
  }).slice(0,3);
  
  return { 
    productFeatures, 
    segmentFeatures, 
    topUrgentProducts, 
    topSegments, 
    totalActiveConflicts: activeCampaigns.length 
  };
}