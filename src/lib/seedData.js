import { base44 } from '@/api/base44Client';

// Deduplicate products by SKU (keep first occurrence = most recently sorted)
export function deduplicateProducts(products) {
  return products.reduce((acc, p) => {
    if (!acc.find(x => x.sku === p.sku)) acc.push(p);
    return acc;
  }, []);
}

export async function seedDataIfEmpty() {
  try {
    const [products, segments] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.CustomerSegment.list(),
    ]);

    if (products.length === 0) {
      const productData = [
        { name: 'Hydrating Serum', sku: 'SKN-001', price: 89, cost: 28, margin_pct: 68, stock_qty: 420, sales_velocity: 38, category: 'Skincare', is_slow_moving: false, is_protected: false },
        { name: 'Vitamin C Brightening Mask', sku: 'SKN-003', price: 52, cost: 18, margin_pct: 65, stock_qty: 680, sales_velocity: 8, category: 'Skincare', is_slow_moving: true, is_protected: false },
        { name: 'Collagen Peptide Powder', sku: 'SUP-001', price: 65, cost: 24, margin_pct: 63, stock_qty: 540, sales_velocity: 9, category: 'Supplements', is_slow_moving: true, is_protected: false },
        { name: 'Magnesium Sleep Complex', sku: 'WEL-001', price: 48, cost: 16, margin_pct: 67, stock_qty: 890, sales_velocity: 7, category: 'Wellness', is_slow_moving: true, is_protected: false },
        { name: 'Aromatherapy Essential Oil Set', sku: 'WEL-002', price: 85, cost: 25, margin_pct: 70, stock_qty: 95, sales_velocity: 18, category: 'Wellness', is_slow_moving: false, is_protected: false },
        { name: 'Omega-3 Fish Oil', sku: 'SUP-002', price: 42, cost: 14, margin_pct: 67, stock_qty: 310, sales_velocity: 22, category: 'Supplements', is_slow_moving: false, is_protected: false },
        { name: 'Retinol Night Cream', sku: 'SKN-002', price: 78, cost: 26, margin_pct: 67, stock_qty: 180, sales_velocity: 15, category: 'Skincare', is_slow_moving: false, is_protected: false },
        { name: 'Probiotics Daily Blend', sku: 'SUP-003', price: 55, cost: 19, margin_pct: 65, stock_qty: 720, sales_velocity: 6, category: 'Supplements', is_slow_moving: true, is_protected: false },
        { name: 'Bamboo Diffuser Set', sku: 'WEL-003', price: 68, cost: 22, margin_pct: 68, stock_qty: 140, sales_velocity: 11, category: 'Wellness', is_slow_moving: false, is_protected: false },
        { name: 'Green Tea Extract Capsules', sku: 'SUP-004', price: 38, cost: 12, margin_pct: 68, stock_qty: 460, sales_velocity: 10, category: 'Supplements', is_slow_moving: false, is_protected: true },
      ];
      const toCreate = productData.filter(prod => !products.find(p => p.sku === prod.sku));
      if (toCreate.length > 0) await base44.entities.Product.bulkCreate(toCreate);
    }

    if (segments.length === 0) {
      const segmentData = [
        { name: 'VIP', size: 320, description: 'High-value loyal customers', avg_order_value: 148, last_promo_days_ago: 8, recency_days: 12, frequency_per_month: 3.2, churn_risk: 'Low' },
        { name: 'Returning', size: 1850, description: 'Regular repeat customers', avg_order_value: 72, last_promo_days_ago: 14, recency_days: 25, frequency_per_month: 1.4, churn_risk: 'Low' },
        { name: 'New Customers', size: 640, description: 'First-time purchasers (last 30d)', avg_order_value: 58, last_promo_days_ago: 3, recency_days: 8, frequency_per_month: 0.8, churn_risk: 'Medium' },
        { name: 'Inactive 90d+', size: 780, description: 'At-risk dormant customers', avg_order_value: 65, last_promo_days_ago: 95, recency_days: 120, frequency_per_month: 0.1, churn_risk: 'High' },
        { name: 'High AOV', size: 290, description: 'Big-basket shoppers', avg_order_value: 195, last_promo_days_ago: 12, recency_days: 18, frequency_per_month: 2.1, churn_risk: 'Low' },
      ];
      const toCreate = segmentData.filter(seg => !segments.find(s => s.name === seg.name));
      if (toCreate.length > 0) await base44.entities.CustomerSegment.bulkCreate(toCreate);
    }
  } catch (e) {
    console.warn('seedDataIfEmpty error:', e);
  }
}