/**
 * SINGLE AI CALL PATH FOR THE ENTIRE APP
 *
 * All AI calls route through this file:
 *   pages/AIAdvisor              → callAnthropicSonnet() — quality recommendations, system prompt cached
 *   pages/CampaignMonitor        → callAnthropic()       — Haiku, short diagnosis (max_tokens: 400)
 *   pages/Dashboard              → callAnthropic()       — Haiku, daily insights feed
 *   components/intelligence/
 *     NextBestActions            → callAnthropic()       — Haiku, next best actions
 *
 * Chain: callAnthropic / callAnthropicSonnet → callAI (functions/callAI) → Anthropic API
 *
 * Cost routing:
 *   callAnthropic      → claude-haiku-4-5-20251001  (default, 3x cheaper)
 *   callAnthropicSonnet → claude-sonnet-4-5         (complex tasks, with system prompt caching)
 */
import { callAI } from "@/functions/callAI";

// Simple / short tasks — Haiku by default
export async function callAnthropic(content, history = []) {
  const messages = [...history, { role: 'user', content }];
  const response = await callAI({ messages, model: 'claude-haiku-4-5-20251001' });
  if (response.data?.error) throw new Error(response.data.error);
  return response.data?.text || response.text;
}

// Complex tasks — Sonnet with optional cached system prompt
export async function callAnthropicSonnet(content, systemPrompt = null, history = []) {
  const messages = [...history, { role: 'user', content }];
  const payload = { messages, model: 'claude-sonnet-4-5' };
  if (systemPrompt) payload.systemPrompt = systemPrompt;
  const response = await callAI(payload);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data?.text || response.text;
}