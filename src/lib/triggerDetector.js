// Real-Time Trigger Detection Engine

export function detectTriggers(products, campaigns, segments, feedbackHistory) {
  const triggers = [];
  const activeCampaigns = campaigns.filter(c => ['Active','Live','Deployed'].includes(c.status));

  // Inventory spike detection
  products.forEach(p => {
    const weeks = Math.round((p.stock_qty || 0) / Math.max(p.sales_velocity || 1, 1));
    
    if (weeks > 100) {
      triggers.push({ 
        type: 'CRITICAL_OVERSTOCK', 
        severity: 'Critical', 
        product: p.name, 
        detail: `${weeks}wk supply — immediate clearance needed`, 
        action: 'Create urgency promotion' 
      });
    } else if (weeks > 52 && !activeCampaigns.some(c => (c.target_products||'').split(',').map(s=>s.trim()).includes(p.sku))) {
      triggers.push({ 
        type: 'OVERSTOCK_UNADDRESSED', 
        severity: 'High', 
        product: p.name, 
        detail: `${weeks}wk supply with no active promotion`, 
        action: 'Launch clearance campaign' 
      });
    }
    
    if (weeks < 3 && !p.is_protected) {
      triggers.push({ 
        type: 'STOCKOUT_RISK', 
        severity: 'High', 
        product: p.name, 
        detail: `Only ${weeks}wk supply remaining`, 
        action: 'Exclude from promotions, reorder now' 
      });
    }
  });

  // Customer fatigue detection
  segments.forEach(s => {
    const targeting = activeCampaigns.filter(c => c.target_segment === s.name || c.target_segment === 'All Customers').length;
    if (targeting >= 3) {
      triggers.push({ 
        type: 'SEGMENT_FATIGUE', 
        severity: 'Medium', 
        segment: s.name, 
        detail: `${targeting} active campaigns targeting this segment`, 
        action: 'Pause lowest-performing campaign targeting this segment' 
      });
    }
  });

  // Underperforming campaign detection  
  activeCampaigns.forEach(c => {
    if (c.performance_score && c.performance_score < 40) {
      triggers.push({ 
        type: 'LOW_PERFORMANCE', 
        severity: 'Medium', 
        campaign: c.name, 
        detail: `Performance score ${c.performance_score}/100`, 
        action: 'Review discount value or extend duration' 
      });
    }
  });

  // Learning opportunity
  if (feedbackHistory.length < 3) {
    triggers.push({ 
      type: 'LEARNING_INSUFFICIENT', 
      severity: 'Low', 
      detail: 'Less than 3 completed campaigns — AI predictions are less accurate', 
      action: 'Complete more campaigns to improve AI accuracy' 
    });
  }

  // Sort by severity
  const order = { Critical:0, High:1, Medium:2, Low:3 };
  return triggers.sort((a,b) => order[a.severity] - order[b.severity]);
}

export function getTriggerColor(severity) {
  switch(severity) {
    case 'Critical': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    case 'High': return { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' };
    case 'Medium': return { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' };
    case 'Low': return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
    default: return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
  }
}