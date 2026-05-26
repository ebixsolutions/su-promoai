export const DEFAULT_POLICY_RULES = [
  { id: 'P001', name: 'Min Margin Floor', field: 'margin_after', op: 'gte', threshold: 30, severity: 'blocking', message: 'Promotion would breach 30% margin floor', enabled: true },
  { id: 'P002', name: 'Max Discount Cap', field: 'discount_value', op: 'lte', threshold: 40, severity: 'blocking', message: 'Discount exceeds 40% maximum cap', enabled: true },
  { id: 'P003', name: 'Budget Cap', field: 'estimated_cost_vs_budget', op: 'lte', threshold: 1, severity: 'blocking', message: 'Estimated cost exceeds budget cap', enabled: true },
  { id: 'P004', name: 'Segment Fatigue', field: 'segment_fatigue_score', op: 'lt', threshold: 80, severity: 'warning', message: 'Target segment may be over-promoted', enabled: true },
  { id: 'P005', name: 'Protected SKUs', field: 'has_protected_sku', op: 'eq', threshold: false, severity: 'blocking', message: 'Cannot discount protected SKUs', enabled: true },
  { id: 'P006', name: 'Campaign Overlap', field: 'conflict_count', op: 'eq', threshold: 0, severity: 'warning', message: 'Overlaps with existing campaign', enabled: true },
  { id: 'P007', name: 'Stock Minimum', field: 'all_stock_above_50', op: 'eq', threshold: true, severity: 'warning', message: 'Some products have low stock (<50 units)', enabled: true },
];

const STORAGE_KEY = 'promo_ai_policy_rules';

export function loadPolicyRules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_POLICY_RULES;
}

export function savePolicyRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/**
 * Run policy checks against a promotion config object.
 * promo: { margin_after, discount_value, estimated_cost, budget_cap, segment_fatigue_score, has_protected_sku, conflict_count, all_stock_above_50 }
 * Returns: { passed: bool, results: [{ rule, passed, severity }] }
 */
export function checkPolicies(promo, rules = null) {
  const activeRules = (rules || loadPolicyRules()).filter(r => r.enabled);
  const results = activeRules.map(rule => {
    const val = promo[rule.field];
    if (val === undefined || val === null) return { rule, passed: true, skipped: true };

    let passed = false;
    if (rule.op === 'gte') passed = val >= rule.threshold;
    else if (rule.op === 'lte') passed = val <= rule.threshold;
    else if (rule.op === 'lt') passed = val < rule.threshold;
    else if (rule.op === 'gt') passed = val > rule.threshold;
    else if (rule.op === 'eq') passed = val === rule.threshold;

    return { rule, passed, skipped: false };
  });

  const blocking = results.filter(r => !r.passed && !r.skipped && r.rule.severity === 'blocking');
  return { passed: blocking.length === 0, results };
}

/**
 * Build a promo object from a recommendation + products for policy checking.
 */
export function buildPromoForPolicy(rec, products = [], activeCampaigns = [], segmentFatigueScore = 50) {
  const targetSkus = (rec.target_products || rec.target || '').split(',').map(s => s.trim()).filter(Boolean);
  const targetProds = products.filter(p => targetSkus.includes(p.sku));
  const discountVal = rec.discount_value || parseFloat(rec.discount) || 0;
  const estimatedCost = rec.discountCost || rec.predicted_revenue * 0.15 || 0;
  const budgetCap = rec.budget_cap || 5000;
  const baseMargin = targetProds.length > 0
    ? targetProds.reduce((s, p) => s + (p.margin_pct || 40), 0) / targetProds.length
    : 40;

  return {
    margin_after: baseMargin - discountVal * 0.5,
    discount_value: discountVal,
    estimated_cost: estimatedCost,
    budget_cap: budgetCap,
    estimated_cost_vs_budget: budgetCap > 0 ? estimatedCost / budgetCap : 0,
    segment_fatigue_score: segmentFatigueScore,
    has_protected_sku: targetProds.some(p => p.is_protected),
    conflict_count: activeCampaigns.filter(c =>
      (c.target_segment === rec.target_segment || c.target_segment === rec.target) &&
      (c.status === 'Active' || c.status === 'Scheduled')
    ).length,
    all_stock_above_50: targetProds.length === 0 || targetProds.every(p => (p.stock_qty || 0) > 50),
  };
}