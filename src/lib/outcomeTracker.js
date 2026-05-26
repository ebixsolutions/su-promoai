/**
 * Outcome Tracker — evaluates campaign results and feeds AI Memory.
 */
import { base44 } from '@/api/base44Client';
import { updateAIMemory } from './memoryUpdater';

export async function evaluateCampaignOutcome(campaign) {
  const predicted = campaign.predicted_revenue || 0;
  const actual = campaign.revenue_actual || 0;

  const accuracyScore = predicted > 0
    ? Math.max(0, Math.round(100 - Math.abs((predicted - actual) / predicted * 100)))
    : null;

  const quality = accuracyScore == null ? 'Poor'
    : accuracyScore >= 90 ? 'Excellent'
    : accuracyScore >= 75 ? 'Good'
    : accuracyScore >= 60 ? 'Fair' : 'Poor';

  // Check if FeedbackLoop record already exists for this campaign
  const existing = await base44.entities.FeedbackLoop.filter({ campaign_id: campaign.id });
  if (existing.length === 0) {
    await base44.entities.FeedbackLoop.create({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      predicted_revenue: predicted,
      actual_revenue: actual,
      predicted_orders: campaign.predicted_orders || null,
      actual_orders: campaign.orders_actual || null,
      predicted_margin_impact: campaign.predicted_margin_impact || null,
      actual_margin_impact: campaign.margin_impact_pct || null,
      predicted_redemptions: campaign.predicted_redemptions || null,
      actual_redemptions: campaign.redemptions || null,
      accuracy_score: accuracyScore,
      recommendation_quality: quality,
      confidence_score: campaign.confidence_score || null,
      review_date: new Date().toISOString().split('T')[0],
    });
  }

  // Update AI Memory
  await updateAIMemory(campaign, accuracyScore, quality);

  return { accuracyScore, quality };
}