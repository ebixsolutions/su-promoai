/**
 * Promotion Fatigue Tracker
 * Calculates fatigue levels per customer segment based on active campaigns and promo history.
 */

/**
 * @param {Array} segments - CustomerSegment records
 * @param {Array} campaigns - all Campaign records
 * @returns {Array} segments enriched with fatigue data
 */
export function calculateSegmentFatigue(segments, campaigns) {
  const activeCampaigns = campaigns.filter(c =>
    c.status === 'Active' || c.status === 'Scheduled'
  );

  return segments.map(segment => {
    const targetingCampaigns = activeCampaigns.filter(c =>
      c.target_segment === segment.name || c.target_segment === 'All Customers'
    );

    const activeCampaignCount = targetingCampaigns.length;
    const daysSinceLastPromo = segment.last_promo_days_ago || 90;

    // Base fatigue from days since last promo (more days = less fatigued)
    const recencyFatigue = Math.max(0, 100 - Math.round((daysSinceLastPromo / 30) * 40));

    // Active campaigns targeting this segment add fatigue
    const campaignFatigue = Math.min(60, activeCampaignCount * 20);

    // Frequency-based fatigue
    const freqFatigue = Math.min(40, Math.round((segment.frequency_per_month || 1) * 5));

    const fatigueScore = Math.min(100, Math.round(
      recencyFatigue * 0.5 + campaignFatigue * 0.35 + freqFatigue * 0.15
    ));

    let fatigueLevel, fatigueColor, recommendedRestDays;
    if (fatigueScore >= 70) {
      fatigueLevel = 'Exhausted';
      fatigueColor = '#dc2626';
      recommendedRestDays = 21;
    } else if (fatigueScore >= 40) {
      fatigueLevel = 'Tired';
      fatigueColor = '#ca8a04';
      recommendedRestDays = 10;
    } else if (fatigueScore >= 20) {
      fatigueLevel = 'Moderate';
      fatigueColor = '#d97706';
      recommendedRestDays = 3;
    } else {
      fatigueLevel = 'Fresh';
      fatigueColor = '#16a34a';
      recommendedRestDays = 0;
    }

    return {
      ...segment,
      fatigueScore,
      fatigueLevel,
      fatigueColor,
      recommendedRestDays,
      activeCampaignCount,
    };
  });
}

export function getSegmentFatigue(segmentName, segments, campaigns) {
  const results = calculateSegmentFatigue(segments, campaigns);
  return results.find(s => s.name === segmentName) || { fatigueScore: 0, fatigueLevel: 'Fresh', fatigueColor: '#16a34a', recommendedRestDays: 0 };
}

export function getAtRiskSegments(fatigueData) {
  return fatigueData.filter(s => s.fatigueScore >= 70);
}

export function formatFatigueForPrompt(fatigueData) {
  return fatigueData.map(s =>
    `${s.name}: fatigue=${s.fatigueScore}/100 (${s.fatigueLevel}), active campaigns targeting=${s.activeCampaignCount}, days since promo=${s.last_promo_days_ago || 'unknown'}`
  ).join('\n');
}