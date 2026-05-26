import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { callAnthropicSonnet } from '@/lib/anthropic';
import { buildFeatureVector } from '@/lib/featureStore';

const AI_SYSTEM_PROMPT = `You are an AI Promotion Decision Engine for an e-commerce platform. You analyze product inventory, customer data, and business goals to recommend optimal promotions. Always be specific, data-driven, and actionable. Focus on inventory pressure, margin protection, and customer segment fit.`;
import { Send, Bot, User, Sparkles, AlertTriangle } from 'lucide-react';

const GOALS = [
  { emoji: '🚀', label: 'Boost Weekend Sales' },
  { emoji: '📦', label: 'Clear Slow-Moving Inventory' },
  { emoji: '🔄', label: 'Reactivate Inactive Customers' },
  { emoji: '💰', label: 'Increase Average Order Value' },
  { emoji: '🎯', label: 'Custom Goal' },
];

export default function AIAdvisor() {
  const [messages, setMessages] = useState([{
    role: 'ai',
    content: "Hello! I'm your AI Promotion Advisor. I analyze your product inventory, customer data, and run a deterministic scoring engine before generating recommendations.\n\nWhat's your goal today?"
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [segments, setSegments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState('boost revenue');
  const bottomRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list().then(setProducts).catch(() => {}),
      base44.entities.CustomerSegment.list().then(setSegments).catch(() => {}),
      base44.entities.Campaign.list().then(setCampaigns).catch(() => {}),
      base44.entities.FeedbackLoop.list().then(setFeedbackHistory).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildPrompt = (userMsg) => {
    const activeCampaigns = campaigns.filter(c => ['Active','Live','Deployed'].includes(c.status));
    const featureVector = buildFeatureVector(products, segments, campaigns, feedbackHistory, selectedGoal);
    
    const structuredContext = `
FEATURE STORE ANALYSIS:
Top Urgent Products (by inventory pressure):
${featureVector.topUrgentProducts.map(p => `- ${p.name} (${p.sku}): pressure=${p.inventory_pressure}/100, ${p.weeks_supply}wk supply, margin_safety=${p.margin_safety}/100`).join('\n')}

Top Target Segments (for goal: ${selectedGoal}):
${featureVector.topSegments.map(s => `- ${s.segment_name}: fatigue=${s.promotion_fatigue}/100, response_rate=${Math.round(s.historical_response_rate*100)}%, ltv=${s.ltv_score}/100`).join('\n')}

Portfolio Health: ${featureVector.totalActiveConflicts} active campaigns running

User question: ${userMsg}

Be specific with product names, SKUs, and numbers. Be direct and actionable. Reference the feature scores above.`;

    return structuredContext;
  };

  const callWithRetry = async (prompt) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await callAnthropicSonnet(prompt, AI_SYSTEM_PROMPT);
      } catch (err) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw err;
      }
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const reply = await callWithRetry(buildPrompt(userMsg));
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
    } catch (err) {
      console.error('AI error:', err);
      const status = err?.response?.status || err?.status;
      if (status === 429) {
        setMessages(prev => [...prev, { role: 'ai', content: '⏳ AI is rate limited. Please wait a few seconds and try again.', isError: true }]);
      } else if (status === 404) {
        setMessages(prev => [...prev, { role: 'ai', content: '⚙️ AI function not found. Please contact support.', isError: true }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Error: ' + (err?.message || 'Unknown error'), isError: true }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const activeCampaigns = campaigns.filter(c => ['Active','Live','Deployed'].includes(c.status));
  const featureVector = buildFeatureVector(products, segments, campaigns, feedbackHistory, selectedGoal);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>AI Promotion Advisor</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Let AI analyze your data and recommend the best promotions</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 12 }}>
              {msg.role === 'ai' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="#2563eb" />
                </div>
              )}
              <div style={{
                maxWidth: '70%', padding: '12px 16px', borderRadius: 12,
                background: msg.role === 'user' ? '#2563eb' : msg.isError ? '#fef2f2' : msg.isInfo ? '#fffbeb' : '#fff',
                color: msg.role === 'user' ? '#fff' : msg.isError ? '#dc2626' : msg.isInfo ? '#92400e' : '#111827',
                border: msg.role === 'ai' ? '1px solid #e5e7eb' : 'none',
                fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={16} color="#fff" />
                </div>
              )}
            </div>
          ))}

          {/* Goal buttons after first message */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 44 }}>
              {GOALS.map(g => (
                <button key={g.label} onClick={() => { setSelectedGoal(g.label); sendMessage(g.label); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} color="#2563eb" />
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                Analyzing your store data...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask a follow-up: 'why this?', 'what if 20% discount?', 'try a different segment'..."
            disabled={loading}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            style={{ padding: '10px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={16} /> Send
          </button>
        </div>
      </div>

      {/* Context panel */}
      <div style={{ width: 260, borderLeft: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto', padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Context Panel</div>

        {activeCampaigns.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} /> {activeCampaigns.length} ACTIVE CAMPAIGNS
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Conflicts auto-detected during recommendation</div>
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Top Urgent Products</div>
        {featureVector.topUrgentProducts.map(p => (
          <div key={p.sku} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{p.weeks_supply}wk supply</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: p.inventory_pressure >= 80 ? '#dc2626' : '#ca8a04' }}>Pressure: {p.inventory_pressure}/100</div>
          </div>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '16px 0 8px' }}>Top Target Segments</div>
        {featureVector.topSegments.map(s => (
          <div key={s.segment_name} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{s.segment_name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>AOV ${s.avg_order_value} · LTV {s.ltv_score}/100</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.promotion_fatigue >= 70 ? '#dc2626' : '#16a34a' }}>Fatigue: {s.promotion_fatigue}/100</div>
          </div>
        ))}
      </div>
    </div>
  );
}