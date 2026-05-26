/**
 * Predictive Recommendation Engine
 * Estimates campaign outcomes before running, using historical analogs + AI memory.
 */

function findSimilarCampaigns(campaign, historicalCampaigns) {
  return historicalCampaigns
    .filter(c => c.status === 'Ended' && c.revenue_actual > 0)
    .filter(c =>
      c.promotion_type === campaign.promotion_type ||
      c.target_segment === campaign.target_segment
    )
    .slice(0, 3);
}

function getTimingMultiplier(startDate, timingMemory) {
  if (!startDate || !timingMemory) return 1.0;
  const day = new Date(startDate).getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;
  const date = new Date(startDate).getDate();
  const isMonthStart = date <= 5;
  if (isWeekend) return timingMemory.weekend_multiplier || 1.5;
  if (isMonthStart) return timingMemory.month_start_multiplier || 1.2;
  return 1.0;
}

function getSegmentResponseRate(segmentName, segmentMemory) {
  if (!segmentName || !segmentMemory) return 0.3;
  const mem = segmentMemory[segmentName];
  return mem?.avg_redemption_rate || 0.3;
}

/**
 * @param {Object} campaign - proposed campaign config
 * @param {Array} historicalCampaigns - ended campaigns with actuals
 * @param {Object|null} aiMemory - loaded AI memory
 * @returns {Object} prediction object
 */
export function predictCampaignOutcome(campaign, historicalCampaigns, aiMemory) {
  const analogCampaigns = findSimilarCampaigns(campaign, historicalCampaigns);

  // Base revenue from analogs or fallback estimate
  let baseRevenue;
  if (analogCampaigns.length > 0) {
    baseRevenue = Math.round(
      analogCampaigns.reduce((s, c) => s + (c.revenue_actual || 0), 0) / analogCampaigns.length
    );
  } else {
    // Estimate from discount value and segment size
    const segmentSize = 500; // default
    const avgOrderValue = 85;
    const discountPct = (campaign.discount_value || 10) / 100;
    const responseRate = aiMemory ? getSegmentResponseRate(campaign.target_segment, aiMemory.segmentResponse) : 0.3;
    baseRevenue = Math.round(segmentSize * responseRate * avgOrderValue * (1 + discountPct * 0.5));
  }

  const timingMultiplier = getTimingMultiplier(
    campaign.start_date,
    aiMemory?.timingPattern
  );

  const segmentResponseRate = getSegmentResponseRate(
    campaign.target_segment,
    aiMemory?.segmentResponse
  );

  const baseRevAdj = Math.round(baseRevenue * timingMultiplier);
  const baseOrders = Math.round(baseRevAdj / 85);

  const typePerf = aiMemory?.promotionTypePerformance?.[campaign.promotion_type];
  const marginImpact = typePerf ? -(typePerf.avg_margin_impact * 100).toFixed(1) : -8;

  const keyAssumptions = [
    `Based on ${analogCampaigns.length > 0 ? analogCampaigns.map(c => c.name).join(', ') : 'category averages'}`,
    `Timing multiplier: ${timingMultiplier.toFixed(1)}x (${timingMultiplier > 1.2 ? 'favorable' : 'neutral'} launch window)`,
    `${campaign.target_segment || 'Target'} segment response rate: ${(segmentResponseRate * 100).toFixed(0)}%`,
  ];

  const riskFactors = [];
  if (segmentResponseRate < 0.25) riskFactors.push('Low historical segment response rate');
  if (timingMultiplier < 1.0) riskFactors.push('Sub-optimal launch timing');
  if ((campaign.discount_value || 0) > 20) riskFactors.push('High discount may attract deal-seekers with low LTV');

  return {
    pessimistic: {
      revenue: Math.round(baseRevAdj * 0.7),
      orders: Math.round(baseOrders * 0.7),
      marginImpact: marginImpact * 1.3,
      redemptions: Math.round(baseOrders * 0.7 * segmentResponseRate),
    },
    base: {
      revenue: baseRevAdj,
      orders: baseOrders,
      marginImpact,
      redemptions: Math.round(baseOrders * segmentResponseRate),
    },
    optimistic: {
      revenue: Math.round(baseRevAdj * 1.4),
      orders: Math.round(baseOrders * 1.4),
      marginImpact: marginImpact * 0.8,
      redemptions: Math.round(baseOrders * 1.4 * segmentResponseRate),
    },
    confidenceInterval: '±18%',
    analogCampaigns: analogCampaigns.map(c => c.name),
    keyAssumptions,
    riskFactors,
    timingMultiplier,
    segmentResponseRate,
  };
}