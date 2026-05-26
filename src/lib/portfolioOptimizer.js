// Multi-Campaign Portfolio Intelligence

export function analyzePortfolio(activeCampaigns, products, segments) {
  const segmentExposure = {};
  const skuExposure = {};
  let totalDiscountBudget = 0;
  
  activeCampaigns.forEach(c => {
    // Track segment saturation
    const seg = c.target_segment || 'All Customers';
    segmentExposure[seg] = (segmentExposure[seg] || 0) + 1;
    
    // Track SKU overlap
    (c.target_products || '').split(',').filter(Boolean).forEach(sku => {
      skuExposure[sku.trim()] = (skuExposure[sku.trim()] || 0) + 1;
    });
    
    totalDiscountBudget += c.budget_cap || 0;
  });

  const oversaturatedSegments = Object.entries(segmentExposure).filter(([,count]) => count >= 3).map(([seg]) => seg);
  const oversaturatedSKUs = Object.entries(skuExposure).filter(([,count]) => count >= 2).map(([sku]) => sku);
  
  const portfolioScore = Math.max(0, 100 - oversaturatedSegments.length * 15 - oversaturatedSKUs.length * 10);
  
  return {
    portfolio_score: portfolioScore,
    total_active: activeCampaigns.length,
    segment_exposure: segmentExposure,
    sku_exposure: skuExposure,
    oversaturated_segments: oversaturatedSegments,
    oversaturated_skus: oversaturatedSKUs,
    total_discount_budget: totalDiscountBudget,
    risks: [
      ...oversaturatedSegments.map(s => ({ type: 'SEGMENT_SATURATION', severity: 'High', detail: `${s} targeted by ${segmentExposure[s]} active campaigns` })),
      ...oversaturatedSKUs.map(s => ({ type: 'SKU_CANNIBALIZATION', severity: 'Medium', detail: `SKU ${s} in ${skuExposure[s]} active campaigns` })),
    ],
    recommendation: portfolioScore >= 80 ? 'Portfolio is well-balanced' : portfolioScore >= 60 ? 'Minor saturation detected — review segment targeting' : 'High saturation risk — pause or consolidate campaigns'
  };
}

export function suggestPortfolioRebalancing(portfolioAnalysis, products, segments) {
  const suggestions = [];
  
  if (portfolioAnalysis.oversaturated_segments.length > 0) {
    const untouchedSegments = segments.filter(s => !portfolioAnalysis.segment_exposure[s.name]);
    if (untouchedSegments.length > 0) {
      suggestions.push({ 
        action: 'ROTATE_SEGMENT', 
        detail: `Consider targeting untouched segments (${untouchedSegments.slice(0,2).map(s=>s.name).join(', ')}) instead of ${portfolioAnalysis.oversaturated_segments[0]}` 
      });
    }
  }
  
  if (portfolioAnalysis.total_active > 8) {
    suggestions.push({ 
      action: 'REDUCE_CONCURRENT', 
      detail: 'More than 8 concurrent campaigns increases fatigue risk. Consider ending lowest-performing campaigns.' 
    });
  }
  
  if (portfolioAnalysis.oversaturated_skus.length > 0) {
    suggestions.push({ 
      action: 'CONSOLIDATE_SKUS', 
      detail: `SKU cannibalization detected: ${portfolioAnalysis.oversaturated_skus.slice(0,3).join(', ')}. Consolidate overlapping campaigns.` 
    });
  }
  
  return suggestions;
}