import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-opus-4-5';

// Rate-limit par user_id : max N appels par fenêtre de WINDOW_MS ms
const RATE_LIMIT_MAX = 20;
const WINDOW_MS = 60_000;

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authentification Supabase — récupère user_id depuis le JWT
  const authHeader = req.headers.get('Authorization');
  let userId = 'anonymous';
  if (authHeader) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user?.id) userId = user.id;
    } catch {
      // log only — pas de blocage si auth échoue
      console.warn('ai-proxy: auth resolution failed, using anonymous');
    }
  }

  if (isRateLimited(userId)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anthropicBody = {
    ...body,
    model: ANTHROPIC_MODEL,
    max_tokens: (body.max_tokens as number | undefined) ?? 1024,
  };
  delete anthropicBody.timeout_ms;

  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(anthropicBody),
    // Timeout géré par le caller (timeout_ms dans le body est informatif)
  });

  const responseData = await anthropicResponse.json() as Record<string, unknown>;

  // Log des tokens pour observabilité (ADR-025)
  const usage = responseData.usage as Record<string, number> | undefined;
  if (usage) {
    console.log(JSON.stringify({
      event: 'ai_proxy_call',
      user_id: userId,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    }));
  }

  return new Response(JSON.stringify(responseData), {
    status: anthropicResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
