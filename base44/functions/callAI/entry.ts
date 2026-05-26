import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, messages, model: requestedModel, systemPrompt } = await req.json();

    // MODEL ROUTING — default to Haiku (3x cheaper), callers opt into Sonnet explicitly
    const model = requestedModel || 'claude-haiku-4-5-20251001';

    const msgs = messages ?? [{ role: 'user', content: prompt }];

    const requestBody = {
      model,
      max_tokens: 800,
      messages: msgs,
    };

    // Add system prompt with prompt caching if provided
    if (systemPrompt) {
      requestBody.system = [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', response.status, err);
      return Response.json({ error: err, status: response.status }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ text: data.content[0].text });
  } catch (error) {
    console.error('callAI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});