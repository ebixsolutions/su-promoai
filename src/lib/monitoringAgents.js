// Autonomous Monitoring Agents - 5 specialized agents with focused monitoring responsibilities

export const agents = {
  marginProtection: {
    name: 'Margin Protection Agent',
    icon: '🛡️',
    run: (campaigns, products) => {
      const alerts = [];
      campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status)).forEach(c => {
        if ((c.margin_impact_pct || 0) < -10) {
          alerts.push({ 
            severity: 'High', 
            message: `${c.name} is eroding margin by ${c.margin_impact_pct}%`, 
            action: 'Reduce discount or add minimum order threshold' 
          });
        }
      });
      return { 
        agent: 'Margin Protection', 
        alerts, 
        status: alerts.length === 0 ? 'healthy' : 'warning',
        icon: '🛡️'
      };
    }
  },
  fatigueAgent: {
    name: 'Customer Fatigue Agent',
    icon: '😴',
    run: (campaigns, segments) => {
      const alerts = [];
      const active = campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status));
      segments.forEach(s => {
        const count = active.filter(c => c.target_segment === s.name || c.target_segment === 'All Customers').length;
        if (count >= 3) {
          alerts.push({ 
            severity: 'High', 
            message: `${s.name} segment targeted by ${count} active campaigns`, 
            action: 'Rotate to untargeted segment' 
          });
        } else if (count >= 2) {
          alerts.push({ 
            severity: 'Medium', 
            message: `${s.name} in ${count} campaigns`, 
            action: 'Monitor fatigue levels' 
          });
        }
      });
      return { 
        agent: 'Customer Fatigue', 
        alerts, 
        status: alerts.length === 0 ? 'healthy' : alerts.some(a=>a.severity==='High') ? 'critical' : 'warning',
        icon: '😴'
      };
    }
  },
  inventoryAgent: {
    name: 'Inventory Clearance Agent',
    icon: '📦',
    run: (products, campaigns) => {
      const alerts = [];
      const active = campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status));
      products.filter(p => {
        const weeks = Math.round((p.stock_qty||0)/Math.max(p.sales_velocity||1,1));
        return weeks > 52 && !active.some(c=>(c.target_products||'').split(',').map(s=>s.trim()).includes(p.sku));
      }).forEach(p => {
        const weeks = Math.round((p.stock_qty||0)/Math.max(p.sales_velocity||1,1));
        alerts.push({ 
          severity: weeks > 100 ? 'Critical' : 'High', 
          message: `${p.name}: ${weeks}wk supply, no active promotion`, 
          action: 'Launch clearance campaign immediately' 
        });
      });
      return { 
        agent: 'Inventory Clearance', 
        alerts, 
        status: alerts.length === 0 ? 'healthy' : alerts.some(a=>a.severity==='Critical') ? 'critical' : 'warning',
        icon: '📦'
      };
    }
  },
  conversionAgent: {
    name: 'Conversion Optimization Agent',
    icon: '📈',
    run: (campaigns) => {
      const alerts = [];
      campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status) && c.performance_score).forEach(c => {
        if (c.performance_score < 50) {
          alerts.push({ 
            severity: 'Medium', 
            message: `${c.name} performing at ${c.performance_score}/100`, 
            action: 'Increase discount by 5% or expand target segment' 
          });
        }
      });
      return { 
        agent: 'Conversion Optimization', 
        alerts, 
        status: alerts.length === 0 ? 'healthy' : 'warning',
        icon: '📈'
      };
    }
  },
  anomalyAgent: {
    name: 'Anomaly Detection Agent',
    icon: '🔍',
    run: (campaigns, feedbackHistory) => {
      const alerts = [];
      
      // Detect campaigns that are far from prediction
      feedbackHistory.filter(f => f.accuracy_score && f.accuracy_score < 50).forEach(f => {
        alerts.push({ 
          severity: 'Medium', 
          message: `${f.campaign_name}: prediction accuracy only ${f.accuracy_score}%`, 
          action: 'Review prediction model — calibration needed' 
        });
      });
      
      // Detect duplicate campaign types
      const types = campaigns.filter(c=>['Active','Live','Deployed'].includes(c.status)).map(c=>c.promotion_type);
      const dupes = types.filter((t,i)=>types.indexOf(t)!==i);
      if ([...new Set(dupes)].length > 0) {
        alerts.push({ 
          severity: 'Low', 
          message: `Multiple active ${[...new Set(dupes)].join(', ')} campaigns detected`, 
          action: 'Consider consolidating similar promotion types' 
        });
      }
      
      return { 
        agent: 'Anomaly Detection', 
        alerts, 
        status: alerts.length === 0 ? 'healthy' : 'warning',
        icon: '🔍'
      };
    }
  }
};

export function runAllAgents(products, campaigns, segments, feedbackHistory) {
  return [
    agents.marginProtection.run(campaigns, products),
    agents.fatigueAgent.run(campaigns, segments),
    agents.inventoryAgent.run(products, campaigns),
    agents.conversionAgent.run(campaigns),
    agents.anomalyAgent.run(campaigns, feedbackHistory)
  ];
}

export function getAgentStatusColor(status) {
  switch(status) {
    case 'healthy': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
    case 'warning': return { bg: '#fef9c3', border: '#fef08a', text: '#ca8a04' };
    case 'critical': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    default: return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
  }
}