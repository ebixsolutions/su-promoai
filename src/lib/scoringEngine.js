/**
 * Deterministic multi-dimensional scoring engine.
 * Produces fully scored context passed to Claude.
 */

const SEGMENT_LTV = { vip: 95, returning: 70, new: 50, inactive: 40, highaov: 85 };

function getSegmentLTV(name = '') {
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(SEGMENT_LTV)) {
    if (n.includes(k)) return v;
  }
  return 55;
}

function scoreProduct(product, goal = '', storeAvgMargin = 50) {
  const goalLower = goal.toLowerCase();
  const weeksOfStock = product.sales_velocity > 0
    ? Math.round(product.stock_qty / product.sales_velocity)
    : 999;

  // 1. Inventory Pressure (weeks of supply)
  let inventoryPressureScore;
  if (weeksOfStock > 26) inventoryPressureScore = Math.min(100, 80 + Math.round((weeksOfStock - 26) / 4));
  else if (weeksOfStock >= 13) inventoryPressureScore = Math.round(40 + ((weeksOfStock - 13) / 13) * 39);
  else inventoryPressureScore = Math.round((weeksOfStock / 13) * 39);

  // 2. Margin Safety (distance above 30% floor)
  const marginSafetyScore = Math.min(100, Math.max(0, Math.round(
    ((product.margin_pct || 0) - 30) / (70 - 30) * 100
  )));

  // 3. Sales Velocity (inverse — slow movers score higher for clearance)
  const salesVelocityScore = Math.min(100, Math.max(0, Math.round(
    100 - (product.sales_velocity || 0) * 4
  )));

  // 4. Stockout Risk
  const stockoutRiskScore = weeksOfStock < 4 ? Math.min(100, 90 + Math.round((4 - weeksOfStock) * 2.5)) : 0;

  // 5. Bundle Affinity (same-category products score higher together)
  const bundleAffinityScore = product.category ? 60 : 40;

  // 6. Price Elasticity (higher price → % discount better; lower → fixed better)
  const priceElasticityScore = Math.min(100, Math.round((product.price || 0) / 2));

  // Goal-based relevance
  let relevanceScore = 50;
  if (goalLower.includes('inventory') || goalLower.includes('clear') || goalLower.includes('slow')) {
    relevanceScore = product.is_slow_moving ? 95 : 30;
  } else if (goalLower.includes('aov') || goalLower.includes('order value') || goalLower.includes('bundle')) {
    relevanceScore = product.price > 60 ? 85 : 45;
  } else if (goalLower.includes('revenue') || goalLower.includes('weekend') || goalLower.includes('boost')) {
    relevanceScore = product.is_slow_moving ? 40 : 80;
  }

  const compositeScore = Math.round(
    inventoryPressureScore * 0.3 +
    marginSafetyScore * 0.25 +
    salesVelocityScore * 0.2 +
    priceElasticityScore * 0.15 +
    bundleAffinityScore * 0.1
  );

  return {
    ...product,
    weeksOfStock,
    scores: {
      inventoryPressure: inventoryPressureScore,
      marginSafety: marginSafetyScore,
      salesVelocity: salesVelocityScore,
      stockoutRisk: stockoutRiskScore,
      bundleAffinity: bundleAffinityScore,
      priceElasticity: priceElasticityScore,
    },
    compositeScore,
    relevanceScore,
  };
}

function scoreSegment(segment, goal = '', storeAvgAOV = 75) {
  const goalLower = goal.toLowerCase();

  // 1. Fatigue Score (longer gap = lower fatigue = better target)
  const fatigueScore = segment.last_promo_days_ago != null
    ? Math.min(100, Math.round((segment.last_promo_days_ago / 90) * 100))
    : 50;

  // 2. Reactivation Score
  const reactivationScore = segment.churn_risk === 'High' ? 90
    : segment.churn_risk === 'Medium' ? 60 : 30;

  // 3. AOV Lift Potential
  const aovLiftPotential = storeAvgAOV > 0
    ? Math.min(100, Math.max(-50, Math.round((segment.avg_order_value / storeAvgAOV - 1) * 100)))
    : 0;

  // 4. Response Rate Score (proxy from frequency)
  const responseRateScore = Math.min(100, Math.round((segment.frequency_per_month || 1) * 20));

  // 5. Lifetime Value Score
  const lifetimeValueScore = getSegmentLTV(segment.name);

  // Goal-based relevance
  let relevanceScore = 50;
  if (goalLower.includes('reactivat') || goalLower.includes('inactive') || goalLower.includes('dormant') || goalLower.includes('win-back')) {
    relevanceScore = segment.churn_risk === 'High' ? 95 : 40;
  } else if (goalLower.includes('aov') || goalLower.includes('order value')) {
    relevanceScore = (segment.avg_order_value || 0) > 100 ? 90 : 50;
  } else if (goalLower.includes('vip') || goalLower.includes('loyal')) {
    relevanceScore = segment.name?.toLowerCase().includes('vip') ? 95 : 40;
  } else if (goalLower.includes('new')) {
    relevanceScore = segment.name?.toLowerCase().includes('new') ? 90 : 40;
  } else if (goalLower.includes('bundle') || goalLower.includes('aov') || goalLower.includes('boost')) {
    relevanceScore = lifetimeValueScore > 70 ? 85 : 55;
  }

  const compositeScore = Math.round(
    fatigueScore * 0.25 +
    reactivationScore * 0.2 +
    Math.max(0, aovLiftPotential) * 0.2 +
    responseRateScore * 0.15 +
    lifetimeValueScore * 0.2
  );

  return {
    ...segment,
    scores: {
      fatigue: fatigueScore,
      reactivation: reactivationScore,
      aovLiftPotential,
      responseRate: responseRateScore,
      lifetimeValue: lifetimeValueScore,
    },
    compositeScore,
    relevanceScore,
  };
}

/**
 * Main scoring function called before the LLM.
 */
export function runScoringEngine(products, segments, campaigns, goal = '') {
  const storeAverageMargin = products.length
    ? Math.round(products.reduce((s, p) => s + (p.margin_pct || 0), 0) / products.length)
    : 60;

  const storeAverageAOV = segments.length
    ? Math.round(segments.reduce((s, seg) => s + (seg.avg_order_value || 0), 0) / segments.length)
    : 75;

  const scoredProducts = products
    .map(p => scoreProduct(p, goal, storeAverageMargin))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const scoredSegments = segments
    .map(s => scoreSegment(s, goal, storeAverageAOV))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.status === 'Scheduled');

  // Conflict detection
  const conflictingCampaigns = activeCampaigns.map(c => {
    const skus = (c.target_products || '').split(',').map(s => s.trim()).filter(Boolean);
    const topSkus = scoredProducts.slice(0, 3).map(p => p.sku);
    const hasSkuConflict = skus.some(sku => topSkus.includes(sku));
    const hasSegmentConflict = scoredSegments[0] && c.target_segment === scoredSegments[0].name;
    if (hasSkuConflict) return { ...c, conflict_type: 'SKU overlap' };
    if (hasSegmentConflict) return { ...c, conflict_type: 'Audience overlap' };
    return null;
  }).filter(Boolean);

  const totalBudgetUsed = activeCampaigns.reduce((s, c) => s + (c.budget_cap || 0), 0);
  const budgetRemaining = Math.max(0, 5000 - totalBudgetUsed);

  // Campaign-level composite scores
  const topProductScore = scoredProducts[0]?.compositeScore || 0;
  const topSegmentScore = scoredSegments[0]?.compositeScore || 0;
  const overallConfidenceScore = Math.round(topProductScore * 0.5 + topSegmentScore * 0.5);

  const riskScore = Math.min(100, Math.round(
    conflictingCampaigns.length * 20 +
    (100 - (scoredProducts[0]?.scores.marginSafety || 50)) * 0.3
  ));

  const expectedROIScore = Math.round(
    (scoredProducts[0]?.scores.inventoryPressure || 50) * 0.3 +
    (scoredSegments[0]?.scores.fatigue || 50) * 0.2 +
    (scoredProducts[0]?.scores.marginSafety || 50) * 0.3 +
    Math.max(0, scoredSegments[0]?.scores.aovLiftPotential || 0) * 0.2
  );

  return {
    topCandidateProducts: scoredProducts.slice(0, 5),
    topCandidateSegments: scoredSegments.slice(0, 4),
    allScoredProducts: scoredProducts,
    allScoredSegments: scoredSegments,
    conflictingCampaigns,
    storeAverageMargin,
    storeAverageAOV,
    budgetRemaining,
    activeCampaignCount: activeCampaigns.length,
    overallConfidenceScore,
    riskScore,
    expectedROIScore,
  };
}

// Keep backward compat alias
export const scorePromotionCandidates = runScoringEngine;